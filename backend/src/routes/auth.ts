// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Debug all registered routes
console.log('Registering auth routes...');
router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log('Route registered:', r.route.method, r.route.path);
  }
});

// Middleware for logging
router.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`Auth Route: ${req.method} ${req.path}`);
  next();
});

// Debug logging middleware
router.use((req: Request, _res: Response, next: NextFunction) => {
  console.log('Auth request:', {
    path: req.path,
    method: req.method,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', {
      body: req.body,
      headers: req.headers
    });

    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return user data and token
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Me route
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    console.error('Error in /me endpoint:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Test endpoint to verify route registration
router.get('/test', (_req, res) => {
  res.json({ message: 'Auth routes working' });
});

export default router; 