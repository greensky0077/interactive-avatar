/**
 * @fileoverview PDF processing routes
 */

import express from 'express';
import { uploadPDF, searchPDF, listPDFs, uploadMiddleware, askPDF } from '../controllers/pdfController.js';

const router = express.Router();

// Upload PDF file with explicit multer error handling
router.post('/upload', (req, res, next) => {
  try {
    uploadMiddleware(req, res, function(err) {
      if (err) {
        console.error('Multer error:', err);
        const status = err.message && err.message.toLowerCase().includes('pdf') ? 400 : 500;
        return res.status(status).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      return uploadPDF(req, res, next);
    });
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload route initialization failed',
      error: error.message
    });
  }
});

// Search PDF content
router.post('/search', searchPDF);

// List uploaded PDFs
router.get('/list', listPDFs);

// RAG: Ask with PDF context
router.post('/ask', askPDF);

// Test endpoint to verify PDF service is working
router.get('/test', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'PDF service is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'PDF service test failed',
      error: error.message
    });
  }
});

export default router;
