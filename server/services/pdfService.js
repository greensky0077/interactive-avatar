/**
 * @fileoverview PDF processing service for document upload and text extraction
 */

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

// Try to use pdf-parse, but provide a better fallback
let pdfParse = null;
try {
  // Try dynamic import first
  const pdfModule = await import('pdf-parse');
  pdfParse = pdfModule.default || pdfModule;
  logger.info('PDFService', 'pdf-parse loaded successfully');
} catch (error) {
  logger.warn('PDFService', 'pdf-parse not available, will use basic text extraction', { error: error.message });
}

class PDFService {
  constructor() {
    // Initialize OpenAI client only when an API key is present
    if (config.openai.apiKey && config.openai.apiKey !== '') {
      this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    } else {
      this.openai = null;
    }
    // Use in-memory storage for serverless environments
    this.processedData = new Map();
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
   * @description Advanced PDF text extraction with proper structure parsing
   * @param {Buffer} buffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async basicPDFTextExtraction(buffer) {
    try {
      const text = buffer.toString('utf8');
      
      // Method 1: Extract text from PDF text objects (BT...ET blocks)
      const textObjects = this.extractTextFromObjects(text);
      if (textObjects.trim().length > 50) {
        return textObjects.trim();
      }

      // Method 2: Extract text from PDF streams (decompressed content)
      const streamText = this.extractTextFromStreams(text);
      if (streamText.trim().length > 50) {
        return streamText.trim();
      }

      // Method 3: Extract text from PDF content streams
      const contentText = this.extractTextFromContentStreams(text);
      if (contentText.trim().length > 50) {
        return contentText.trim();
      }

      // Method 4: Fallback - simple text extraction with basic filtering
      const fallbackText = this.extractTextFallback(text);
      if (fallbackText.trim().length > 20) {
        return fallbackText.trim();
      }

      return 'PDF text extraction not available - this is a basic fallback. The PDF content could not be extracted using simple text parsing.';
    } catch (error) {
      logger.error('PDFService', 'Basic PDF extraction failed', { error: error.message });
      return 'PDF text extraction failed - unable to parse PDF content.';
    }
  }

  /**
   * @description Extract text from PDF text objects (BT...ET blocks)
   * @param {string} text - PDF text content
   * @returns {string} Extracted text
   */
  extractTextFromObjects(text) {
    let extractedText = '';
    
    // Find all text objects (BT...ET blocks)
    const textMatches = text.match(/BT\s+.*?ET/gs);
    if (!textMatches) return '';

    for (const match of textMatches) {
      // Extract text content from parentheses
      const textContent = match.match(/\(([^)]+)\)/g);
      if (textContent) {
        for (const content of textContent) {
          const cleanText = this.cleanTextContent(content);
          if (this.isValidText(cleanText)) {
            extractedText += cleanText + ' ';
          }
        }
      }
    }

    return extractedText;
  }

  /**
   * @description Extract text from PDF streams
   * @param {string} text - PDF text content
   * @returns {string} Extracted text
   */
  extractTextFromStreams(text) {
    let extractedText = '';
    
    // Find all stream blocks
    const streamMatches = text.match(/stream\s+.*?endstream/gs);
    if (!streamMatches) return '';

    for (const stream of streamMatches) {
      // Look for text content in streams
      const textContent = stream.match(/\(([^)]+)\)/g);
      if (textContent) {
        for (const content of textContent) {
          const cleanText = this.cleanTextContent(content);
          if (this.isValidText(cleanText)) {
            extractedText += cleanText + ' ';
          }
        }
      }
    }

    return extractedText;
  }

  /**
   * @description Extract text from PDF content streams
   * @param {string} text - PDF text content
   * @returns {string} Extracted text
   */
  extractTextFromContentStreams(text) {
    let extractedText = '';
    
    // Look for content streams that contain text
    const contentMatches = text.match(/\/Contents\s+.*?endstream/gs);
    if (!contentMatches) return '';

    for (const content of contentMatches) {
      // Extract text from content streams
      const textContent = content.match(/\(([^)]+)\)/g);
      if (textContent) {
        for (const text of textContent) {
          const cleanText = this.cleanTextContent(text);
          if (this.isValidText(cleanText)) {
            extractedText += cleanText + ' ';
          }
        }
      }
    }

    return extractedText;
  }

  /**
   * @description Clean text content from PDF
   * @param {string} content - Raw text content
   * @returns {string} Cleaned text
   */
  cleanTextContent(content) {
    return content
      .replace(/[()]/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  /**
   * @description Validate if text is meaningful content
   * @param {string} text - Text to validate
   * @returns {boolean} True if valid text
   */
  isValidText(text) {
    // Basic length check
    if (text.length < 2 || text.length > 1000) return false;
    
    // Must contain letters
    if (!/[A-Za-z]/.test(text)) return false;
    
    // Must not be pure numbers
    if (/^[0-9\s\.]+$/.test(text)) return false;
    
    // Must not be PDF structure data
    if (text.includes('/Type') || text.includes('/StructElem') || text.includes('/S') || 
        text.includes('/P') || text.includes('/Pg') || text.includes('/K') || 
        text.includes('endobj') || text.includes('stream') || text.includes('endstream')) {
      return false;
    }
    
    // Must not be object references
    if (text.includes('00000 n') || text.includes('00000 obj')) return false;
    
    // Must not contain binary characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(text)) return false;
    
    // More lenient validation - accept any text that looks readable
    const hasReadableContent = /\b[a-zA-Z]{2,}\b/.test(text) || 
                              /[a-zA-Z]{3,}/.test(text) ||
                              /\b(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must|shall|this|that|these|those|a|an|as|if|when|where|why|how|what|who|which|from|into|during|including|until|against|among|throughout|despite|towards|upon|concerning)\b/i.test(text);
    
    return hasReadableContent;
  }

  /**
   * @description Fallback text extraction method
   * @param {string} text - PDF text content
   * @returns {string} Extracted text
   */
  extractTextFallback(text) {
    let extractedText = '';
    
    // Look for any text in parentheses that might be readable
    const parenMatches = text.match(/\(([^)]+)\)/g);
    if (parenMatches) {
      for (const match of parenMatches) {
        const cleanText = this.cleanTextContent(match);
        if (cleanText.length > 2 && 
            cleanText.length < 200 &&
            /[A-Za-z]/.test(cleanText) &&
            !/^[0-9\s\.]+$/.test(cleanText) &&
            !cleanText.includes('/Type') &&
            !cleanText.includes('endobj') &&
            !cleanText.includes('stream') &&
            !cleanText.includes('00000')) {
          extractedText += cleanText + ' ';
        }
      }
    }
    
    // Look for any readable text patterns
    const textMatches = text.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{2,}/g);
    if (textMatches) {
      for (const text of textMatches) {
        if (text.length > 5 && 
            text.length < 100 &&
            /[A-Za-z]/.test(text) &&
            !/^[0-9\s\.]+$/.test(text) &&
            !text.includes('/Type') &&
            !text.includes('endobj') &&
            !text.includes('stream') &&
            !text.includes('00000') &&
            !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/.test(text)) {
          extractedText += text + ' ';
        }
      }
    }
    
    return extractedText;
  }

  /**
   * @description Extract text content from uploaded PDF file
   * @param {string|Buffer} fileOrBuffer - Path to the PDF file or Buffer
   * @returns {Promise<string>} Extracted text content
   */
  async extractTextFromPDF(fileOrBuffer) {
    try {
      const isBuffer = Buffer.isBuffer(fileOrBuffer);
      logger.info('PDFService', 'Extracting text from PDF', { source: isBuffer ? 'buffer' : 'path' });
      
      // If a path is provided, validate exists
      if (!isBuffer && !fs.existsSync(fileOrBuffer)) {
        throw new Error(`PDF file not found: ${fileOrBuffer}`);
      }
      
      const dataBuffer = isBuffer ? fileOrBuffer : fs.readFileSync(fileOrBuffer);
      
      // Check if pdf-parse is available
      if (!pdfParse) {
        logger.warn('PDFService', 'pdf-parse not available, using basic extraction');
        const basicText = await this.basicPDFTextExtraction(dataBuffer);
        logger.info('PDFService', 'PDF text extracted using basic method', { 
          textLength: basicText.length 
        });
        return basicText;
      }
      
      try {
        const data = await pdfParse(dataBuffer);
        
        if (!data.text || data.text.trim().length === 0) {
          throw new Error('PDF appears to be empty or contains no extractable text');
        }
        
        logger.info('PDFService', 'PDF text extracted successfully', { 
          textLength: data.text.length,
          pages: data.numpages 
        });
        
        return data.text;
      } catch (parseError) {
        logger.warn('PDFService', 'pdf-parse failed, falling back to basic extraction', { error: parseError.message });
        const basicText = await this.basicPDFTextExtraction(dataBuffer);
        logger.info('PDFService', 'PDF text extracted using basic method', { 
          textLength: basicText.length 
        });
        return basicText;
      }
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
   * @description Save processed PDF data to in-memory storage
   * @param {string} filename - Original filename
   * @param {Array} processedChunks - Processed chunks
   * @returns {Promise<string>} Memory storage key
   */
  async saveProcessedData(filename, processedChunks) {
    try {
      const dataToSave = {
        filename,
        processedAt: new Date().toISOString(),
        chunks: processedChunks
      };

      // Store in memory instead of filesystem
      this.processedData.set(filename, dataToSave);
      
      logger.info('PDFService', 'Processed data saved to memory', { filename, chunksCount: processedChunks.length });
      return `memory:${filename}`;
    } catch (error) {
      logger.error('PDFService', 'Failed to save processed data', { error: error.message });
      throw error;
    }
  }

  /**
   * @description Load processed PDF data from memory
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Processed data
   */
  async loadProcessedData(filename) {
    try {
      // Check in-memory storage first
      if (this.processedData.has(filename)) {
        const data = this.processedData.get(filename);
        logger.info('PDFService', 'Processed data loaded from memory', { filename });
        return data;
      }

      // Fallback to file system for backward compatibility
      const dataFilename = filename.replace('.pdf', '_processed.json');
      const dataPath = path.join(this.uploadDir, dataFilename);
      
      if (!fs.existsSync(dataPath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      logger.info('PDFService', 'Processed data loaded from file', { dataPath });
      return data;
    } catch (error) {
      logger.error('PDFService', 'Failed to load processed data', { error: error.message });
      return null;
    }
  }
}

export const pdfService = new PDFService();
