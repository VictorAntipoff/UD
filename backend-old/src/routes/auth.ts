// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';
import { authenticateToken } from '../middleware/auth';
import { AppRouter } from '../types/routes';

const router: AppRouter = Router();

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
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Verify password
    const validPassword = await compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return success
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
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

// Add this route to test API connectivity
router.get('/ping', (_req, res) => {
  res.json({ 
    message: 'Auth API is working',
    timestamp: new Date().toISOString()
  });
});

export default router; 