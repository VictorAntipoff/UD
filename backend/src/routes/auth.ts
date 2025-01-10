// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// === Login Endpoint ===
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt received:', { username });

    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', validPassword ? 'yes' : 'no');

    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    console.log('Login successful, sending response');

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// === User Profile Endpoint ===
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        role: true
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

export default router; 