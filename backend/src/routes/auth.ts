// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Debug all registered routes
console.log('Registering auth routes...');
router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log('Route registered:', r.route.method, r.route.path);
  }
});

// Add logging for debugging
router.use((req, res, next) => {
  console.log('Auth route accessed:', req.method, req.path, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, hasPassword: !!password });

    const user = await prisma.user.findFirst({
      where: { username }
    });

    if (!user || !(await compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// ME endpoint
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('ME endpoint accessed, user:', req.user);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify route registration
router.get('/test', (_req, res) => {
  res.json({ message: 'Auth routes working' });
});

export default router; 