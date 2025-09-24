/**
 * @fileoverview RAG routes for PDF processing and knowledge base operations
 */

import express from 'express';
import { 
  uploadPDF, 
  searchPDF, 
  askPDF, 
  listPDFs, 
  healthCheck,
  uploadMiddleware 
} from '../controllers/ragController.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Health check endpoint
router.get('/test', healthCheck);

// Upload PDF with RAG processing
router.post('/upload', (req, res, next) => {
  try {
    uploadMiddleware(req, res, function(err) {
      if (err) {
        logger.error('RAGRoutes', 'Upload middleware error', { error: err.message });
        const status = err.message && err.message.toLowerCase().includes('pdf') ? 400 : 500;
        return res.status(status).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      return uploadPDF(req, res, next);
    });
  } catch (error) {
    logger.error('RAGRoutes', 'Upload route error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Upload route initialization failed',
      error: error.message
    });
  }
});

// Search PDF knowledge base
router.post('/search', searchPDF);

// Ask question using RAG
router.post('/ask', askPDF);

// List processed PDFs
router.get('/list', listPDFs);

export default router;
