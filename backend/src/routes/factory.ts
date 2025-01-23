import { Router, Request, Response } from 'express';
import { prisma } from '../app';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/jobs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const job = await prisma.job.create({
      data: {
        ...req.body,
        userId: req.user?.id || ''
      }
    });
    return res.json(job);
  } catch (error) {
    return res.status(500).json({ error: 'Error creating job' });
  }
});

router.get('/calculations', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const calculations = await prisma.woodCalculation.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        woodType: true
      }
    });
    
    return res.json(calculations);
  } catch (error) {
    console.error('Error fetching calculations:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 