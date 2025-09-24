import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

export default app;


