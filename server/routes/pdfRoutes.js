/**
 * @fileoverview PDF processing routes
 */

import express from 'express';
import { uploadPDF, searchPDF, listPDFs, uploadMiddleware, askPDF } from '../controllers/pdfController.js';

const router = express.Router();

// Upload PDF file
router.post('/upload', uploadMiddleware, uploadPDF);

// Search PDF content
router.post('/search', searchPDF);

// List uploaded PDFs
router.get('/list', listPDFs);

// RAG: Ask with PDF context
router.post('/ask', askPDF);

export default router;
