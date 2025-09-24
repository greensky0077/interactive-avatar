/**
 * @fileoverview RAG controller for PDF processing and knowledge base operations
 */

import multer from 'multer';
import { ragService } from '../services/ragService.js';
import { logger } from '../utils/logger.js';

// Configure multer for memory storage
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
 * @description Upload and process PDF for RAG
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file provided'
      });
    }

    logger.info('RAGController', 'PDF upload started', {
      filename: req.file.originalname,
      size: req.file.size
    });

    // Process PDF with RAG service
    const result = await ragService.processPDF(req.file.originalname, req.file.buffer);

    logger.info('RAGController', 'PDF processed successfully', {
      filename: result.filename,
      chunksCount: result.chunksCount
    });

    res.json({
      success: true,
      message: 'PDF processed and added to knowledge base',
      data: {
        filename: result.filename,
        chunksCount: result.chunksCount,
        textLength: result.textLength
      }
    });
  } catch (error) {
    logger.error('RAGController', 'PDF upload failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'PDF processing failed',
      error: error.message
    });
  }
};

/**
 * @description Search PDF knowledge base
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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

    logger.info('RAGController', 'PDF search started', { query, filename });

    // Search for relevant chunks
    const results = await ragService.searchChunks(query, filename, 5);

    logger.info('RAGController', 'PDF search completed', {
      query,
      filename,
      resultsCount: results.length
    });

    res.json({
      success: true,
      message: 'Search completed',
      data: {
        results,
        totalResults: results.length,
        query,
        filename
      }
    });
  } catch (error) {
    logger.error('RAGController', 'PDF search failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'PDF search failed',
      error: error.message
    });
  }
};

/**
 * @description Ask question using RAG
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const askPDF = async (req, res) => {
  try {
    const { query, filename } = req.body;

    if (!query || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Query and filename are required'
      });
    }

    logger.info('RAGController', 'PDF ask started', { query, filename });

    // Process RAG query
    const result = await ragService.processRAGQuery(query, filename);

    logger.info('RAGController', 'PDF ask completed', {
      query,
      filename,
      confidence: result.confidence
    });

    res.json({
      success: true,
      message: 'Question answered using RAG',
      data: {
        answer: result.answer,
        references: result.references,
        confidence: result.confidence,
        query,
        filename
      }
    });
  } catch (error) {
    logger.error('RAGController', 'PDF ask failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'PDF ask failed',
      error: error.message
    });
  }
};

/**
 * @description List processed PDFs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listPDFs = async (req, res) => {
  try {
    logger.info('RAGController', 'Listing processed PDFs');

    const pdfs = ragService.listProcessedPDFs();

    res.json({
      success: true,
      message: 'PDFs retrieved successfully',
      data: {
        pdfs,
        totalCount: pdfs.length
      }
    });
  } catch (error) {
    logger.error('RAGController', 'List PDFs failed', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to list PDFs',
      error: error.message
    });
  }
};

/**
 * @description Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const healthCheck = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'RAG service is working',
      timestamp: new Date().toISOString(),
      service: 'RAG PDF Processing'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'RAG service health check failed',
      error: error.message
    });
  }
};
