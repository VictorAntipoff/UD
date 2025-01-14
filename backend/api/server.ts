import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../src/routes/auth';

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3010',
  credentials: true
}));

app.use(express.json());

app.get('/api', (_, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

export default app; 