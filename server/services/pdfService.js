/**
 * @fileoverview PDF processing service for document upload and text extraction
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

class PDFService {
  constructor() {
    // Initialize OpenAI client only when an API key is present
    if (config.openai.apiKey && config.openai.apiKey !== '') {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    } else {
      this.openai = null;
    }
    // Use writeable temp directory in serverless environments
    this.uploadDir = process.env.UPLOAD_DIR || path.join('/tmp', 'uploads');
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (err) {
      // Fallback to /tmp if custom path is not writeable
      try {
        this.uploadDir = path.join('/tmp', 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
          fs.mkdirSync(this.uploadDir, { recursive: true });
        }
      } catch (e) {
        // As a last resort, keep in-memory only; writes will fail explicitly later
      }
    }
  }

  /**
   * @description Extract text content from uploaded PDF file
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromPDF(filePath) {
    try {
      logger.info('PDFService', 'Extracting text from PDF', { filePath });
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${filePath}`);
      }
      
      // Use a more robust import strategy for pdf-parse
      let pdfParse;
      try {
        // Try dynamic import first
        const pdfModule = await import('pdf-parse');
        pdfParse = pdfModule.default || pdfModule;
      } catch (importError) {
        logger.warn('PDFService', 'Dynamic import failed, trying require', { error: importError.message });
        // Fallback to require for CommonJS compatibility
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfModule = require('pdf-parse');
        pdfParse = pdfModule.default || pdfModule;
      }
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF appears to be empty or contains no extractable text');
      }
      
      logger.info('PDFService', 'PDF text extracted successfully', { 
        textLength: data.text.length,
        pages: data.numpages 
      });
      
      return data.text;
    } catch (error) {
      logger.error('PDFService', 'PDF text extraction failed', { error: error.message });
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * @description Process and chunk PDF content for RAG
   * @param {string} text - Raw text from PDF
   * @returns {Promise<Array>} Chunked and processed content
   */
  async processPDFContent(text) {
    try {
      logger.info('PDFService', 'Processing PDF content for RAG');
      
      // Split text into chunks (approximately 1000 characters each)
      const chunkSize = 1000;
      const chunks = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        if (chunk.trim().length > 0) {
          chunks.push({
            id: `chunk_${i}`,
            content: chunk.trim(),
            index: Math.floor(i / chunkSize)
          });
        }
      }

      // Generate embeddings for each chunk using Gemini
      const processedChunks = await Promise.all(
        chunks.map(async (chunk, index) => {
          try {
            const embedding = await this.generateEmbedding(chunk.content);
            return {
              ...chunk,
              embedding,
              processed: true
            };
          } catch (error) {
            logger.warn('PDFService', 'Failed to generate embedding for chunk', { 
              chunkIndex: index, 
              error: error.message 
            });
            return {
              ...chunk,
              embedding: null,
              processed: false
            };
          }
        })
      );

      logger.info('PDFService', 'PDF content processed successfully', { 
        totalChunks: processedChunks.length,
        processedChunks: processedChunks.filter(c => c.processed).length
      });

      return processedChunks;
    } catch (error) {
      logger.error('PDFService', 'PDF content processing failed', { error: error.message });
      throw new Error(`Failed to process PDF content: ${error.message}`);
    }
  }

  /**
   * @description Generate embedding for text using Gemini
   * @param {string} text - Text to embed
   * @returns {Promise<Array>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      // Check if API key is configured
      if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
        logger.warn('PDFService', 'OpenAI API key not configured, returning mock embedding');
        // Return a mock embedding vector (OpenAI embeddings are 1536 dimensions)
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
      }
      
      if (!this.openai) {
        logger.warn('PDFService', 'OpenAI client not initialized, returning mock embedding');
        return new Array(1536).fill(0).map(() => Math.random() - 0.5);
      }

      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('PDFService', 'Embedding generation failed', { error: error.message });
      // Return a mock embedding on error
      logger.warn('PDFService', 'Using mock embedding due to API error');
      return new Array(1536).fill(0).map(() => Math.random() - 0.5);
    }
  }

  /**
   * @description Search for relevant content in processed PDF chunks
   * @param {string} query - Search query
   * @param {Array} chunks - Processed PDF chunks
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Relevant chunks
   */
  async searchPDFContent(query, chunks, limit = 3) {
    try {
      logger.info('PDFService', 'Searching PDF content', { query, totalChunks: chunks.length });
      
      if (!query || chunks.length === 0) {
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Calculate similarity scores (cosine similarity)
      const scoredChunks = chunks
        .filter(chunk => chunk.embedding && chunk.processed)
        .map(chunk => {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
          return {
            ...chunk,
            similarity
          };
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      logger.info('PDFService', 'PDF content search completed', { 
        resultsFound: scoredChunks.length 
      });

      return scoredChunks;
    } catch (error) {
      logger.error('PDFService', 'PDF content search failed', { error: error.message });
      throw new Error(`Failed to search PDF content: ${error.message}`);
    }
  }

  /**
   * @description Calculate cosine similarity between two vectors
   * @param {Array} vecA - First vector
   * @param {Array} vecB - Second vector
   * @returns {number} Similarity score
   */
  calculateCosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * @description Save processed PDF data to file
   * @param {string} filename - Original filename
   * @param {Array} processedChunks - Processed chunks
   * @returns {Promise<string>} Path to saved data file
   */
  async saveProcessedData(filename, processedChunks) {
    try {
      const dataFilename = filename.replace('.pdf', '_processed.json');
      const dataPath = path.join(this.uploadDir, dataFilename);
      
      const dataToSave = {
        filename,
        processedAt: new Date().toISOString(),
        chunks: processedChunks
      };

      fs.writeFileSync(dataPath, JSON.stringify(dataToSave, null, 2));
      
      logger.info('PDFService', 'Processed data saved', { dataPath });
      return dataPath;
    } catch (error) {
      logger.error('PDFService', 'Failed to save processed data', { error: error.message });
      throw error;
    }
  }

  /**
   * @description Load processed PDF data from file
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Processed data
   */
  async loadProcessedData(filename) {
    try {
      const dataFilename = filename.replace('.pdf', '_processed.json');
      const dataPath = path.join(this.uploadDir, dataFilename);
      
      if (!fs.existsSync(dataPath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      logger.info('PDFService', 'Processed data loaded', { dataPath });
      return data;
    } catch (error) {
      logger.error('PDFService', 'Failed to load processed data', { error: error.message });
      return null;
    }
  }
}

export const pdfService = new PDFService();
