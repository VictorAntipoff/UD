import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { auth } from '../middleware/auth';

export const adminRouter = Router();
const prisma = new PrismaClient();

// Middleware to check admin role
const checkAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ 
      message: 'Access denied. Admin role required.',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

adminRouter.get('/users', auth, checkAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}); 