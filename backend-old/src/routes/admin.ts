import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

export const adminRouter = Router();
const prisma = new PrismaClient();

// Middleware to check admin role
const checkAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Error checking admin status' });
  }
};

adminRouter.get('/users', authenticateToken, checkAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching users' });
  }
}); 