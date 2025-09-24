/**
 * @fileoverview PDF upload and processing controller
 */

import multer from 'multer';
import path from 'path';
import { pdfService } from '../services/pdfService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';
import { heygenService } from '../services/heygenService.js';
import OpenAI from 'openai';

// Configure multer for file uploads
// Use in-memory storage for serverless compatibility; we will parse buffer directly
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

export const uploadMiddleware = upload.single('pdf');

/**
 * @description Upload and process PDF file
 */
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file uploaded'
      });
    }

    logger.info('PDFController', 'PDF upload started', { 
      filename: req.file.originalname,
      size: req.file.size 
    });

    // Extract text from PDF buffer
    const extractedText = await pdfService.extractTextFromPDF(req.file.buffer);
    
    // Process content for RAG
    const processedChunks = await pdfService.processPDFContent(extractedText);
    
    // Save processed data
    const dataPath = await pdfService.saveProcessedData(req.file.originalname, processedChunks);

    logger.info('PDFController', 'PDF processing completed', { 
      filename: req.file.originalname,
      chunks: processedChunks.length 
    });

    res.json({
      success: true,
      message: 'PDF uploaded and processed successfully',
      data: {
        filename: req.file.originalname,
        chunks: processedChunks.length,
        dataPath
      }
    });

  } catch (error) {
    logger.error('PDFController', 'PDF upload failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to process PDF',
      error: error.message
    });
  }
};

/**
 * @description Search PDF content using RAG
 */
export const searchPDF = async (req, res) => {
  try {
    const { query, filename } = req.body;

    if (!query || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Query and filename are required'
      });
    }

    logger.info('PDFController', 'PDF search started', { query, filename });

    // Load processed data
    const processedData = await pdfService.loadProcessedData(filename);
    
    if (!processedData) {
      return res.status(404).json({
        success: false,
        message: 'Processed PDF data not found. Please upload the PDF first.'
      });
    }

    // Search for relevant content
    const relevantChunks = await pdfService.searchPDFContent(query, processedData.chunks);

    logger.info('PDFController', 'PDF search completed', { 
      resultsFound: relevantChunks.length 
    });

    res.json({
      success: true,
      message: 'PDF search completed successfully',
      data: {
        query,
        results: relevantChunks,
        totalResults: relevantChunks.length
      }
    });

  } catch (error) {
    logger.error('PDFController', 'PDF search failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to search PDF content',
      error: error.message
    });
  }
};

/**
 * @description Get list of uploaded PDFs
 */
export const listPDFs = async (req, res) => {
  try {
    // Get PDFs from in-memory storage
    const memoryPDFs = Array.from(pdfService.processedData.keys()).map(filename => ({
      filename,
      uploadDate: new Date() // Use current time as we don't store upload time in memory
    }));

    // Also check filesystem for backward compatibility
    const fs = await import('fs');
    const uploadDir = pdfService.uploadDir;
    let fileSystemPDFs = [];
    
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      
      // Check for PDF files
      const pdfFiles = files
        .filter(file => file.endsWith('.pdf'))
        .map(file => ({
          filename: file,
          uploadDate: fs.statSync(path.join(uploadDir, file)).mtime
        }));
      
      // Check for JSON files (new format)
      const jsonFiles = files
        .filter(file => file.endsWith('.json') && !file.includes('_processed'))
        .map(file => ({
          filename: file.replace('.json', ''), // Remove .json extension
          uploadDate: fs.statSync(path.join(uploadDir, file)).mtime
        }));
      
      fileSystemPDFs = [...pdfFiles, ...jsonFiles];
    }

    // Combine and deduplicate
    const allPDFs = [...memoryPDFs, ...fileSystemPDFs];
    const uniquePDFs = allPDFs.filter((pdf, index, self) => 
      index === self.findIndex(p => p.filename === pdf.filename)
    );

    res.json({
      success: true,
      data: {
        pdfs: uniquePDFs
      }
    });

  } catch (error) {
    logger.error('PDFController', 'Failed to list PDFs', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to list PDFs',
      error: error.message
    });
  }
};

/**
 * @description Ask a question grounded on a specific PDF (RAG)
 * Body: { filename: string, query: string, speak?: boolean, session_id?: string, limit?: number }
 */
export const askPDF = async (req, res) => {
  try {
    const { filename, query, speak = false, session_id, limit = 3 } = req.body || {};

    if (!filename || !query) {
      return res.status(400).json({
        success: false,
        message: 'filename and query are required'
      });
    }

    logger.info('PDFController', 'RAG ask over PDF', { filename, query, speak: !!speak });

    // Load processed chunks
    const processed = await pdfService.loadProcessedData(filename);
    if (!processed || !Array.isArray(processed.chunks) || processed.chunks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Processed PDF data not found. Please upload the PDF first.'
      });
    }

    // Retrieve top relevant chunks
    const topChunks = await pdfService.searchPDFContent(query, processed.chunks, limit);

    // Compose context
    const contextText = topChunks.map(c => c.content).join('\n\n');

    // Generate answer
    let answer = '';
    try {
      if (!config.openai.apiKey || config.openai.apiKey === 'your_openai_api_key_here') {
        // Fallback: simple extractive style
        answer = contextText.slice(0, 900) || 'No relevant content found in the PDF.';
      } else {
        const openai = new OpenAI({ apiKey: config.openai.apiKey });
        const system = 'You are a helpful assistant. Answer strictly based on the provided PDF excerpts. If the answer is not in the excerpts, say you cannot find it in the document.';
        const user = `Question: ${query}\n\nPDF Excerpts:\n${contextText}`;
        const completion = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          max_tokens: 350,
          temperature: 0.2
        });
        answer = completion.choices?.[0]?.message?.content || '';
      }
    } catch (genErr) {
      logger.error('PDFController', 'RAG answer generation failed', { error: genErr.message });
      answer = contextText.slice(0, 900) || 'No relevant content found in the PDF.';
    }

    // Optionally speak via Heygen
    let speaking_duration = 0;
    if (speak && session_id && answer) {
      try {
        await heygenService.sendText(session_id, answer);
        const words = answer.trim().split(/\s+/).length;
        speaking_duration = Math.round(words * 0.5);
      } catch (speakErr) {
        logger.warn('PDFController', 'Failed to speak RAG answer', { error: speakErr.message });
      }
    }

    res.json({
      success: true,
      message: 'RAG answer generated successfully',
      data: {
        answer,
        references: topChunks,
        speaking_duration
      }
    });
  } catch (error) {
    logger.error('PDFController', 'RAG ask failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to answer using PDF',
      error: error.message
    });
  }
};
