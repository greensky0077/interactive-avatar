import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import personaRouter from './routes/personaRoutes.js';
import chatRouter from './routes/chatRouter.js';
import pdfRouter from './routes/pdfRoutes.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.use('/persona', personaRouter);
app.use('/openai', chatRouter);
app.use('/pdf', pdfRouter);

// Serve React frontend static files when running on platforms like Vercel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.resolve(__dirname, '../react-avatar-app/dist');

app.use(express.static(frontendDist));

// SPA fallback: send index.html for unmatched non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/persona') || req.path.startsWith('/openai') || req.path.startsWith('/pdf')) {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

export default app;


