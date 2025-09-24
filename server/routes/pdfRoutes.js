/**
 * @fileoverview PDF processing routes
 */

import express from 'express';
import { uploadPDF, searchPDF, listPDFs, uploadMiddleware, askPDF } from '../controllers/pdfController.js';

const router = express.Router();

// Upload PDF file with explicit multer error handling
router.post('/upload', (req, res, next) => {
  uploadMiddleware(req, res, function(err) {
    if (err) {
      const status = err.message && err.message.toLowerCase().includes('pdf') ? 400 : 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    return uploadPDF(req, res, next);
  });
});

// Search PDF content
router.post('/search', searchPDF);

// List uploaded PDFs
router.get('/list', listPDFs);

// RAG: Ask with PDF context
router.post('/ask', askPDF);

export default router;
