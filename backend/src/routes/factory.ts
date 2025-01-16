import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.create({
      data: {
        ...req.body,
        userId: req.user?.userId
      }
    });
    return res.json(job);
  } catch (error) {
    return res.status(500).json({ error: 'Error creating job' });
  }
}); 