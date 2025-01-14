import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all jobs
router.get('/', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.woodSlicingJob.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });
    res.json(jobs);
  } catch (error) {
    console.error('Jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

export default router; 