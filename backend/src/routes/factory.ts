import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';

export const factoryRouter: Router = Router();
const prisma = new PrismaClient();

factoryRouter.post('/wood-slicer', auth, async (req: Request, res: Response) => {
  try {
    const { thickness, quantity, woodType } = req.body;
    const job = await prisma.woodSlicingJob.create({
      data: {
        thickness,
        quantity,
        woodType,
        userId: req.user!.id
      }
    });
    res.json(job);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}); 