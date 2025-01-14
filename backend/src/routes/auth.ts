// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Helper function to verify password
async function verifyPassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
  try {
    const [hashedPassword, salt] = storedPassword.split('.');
    const buf = await scryptAsync(suppliedPassword, salt, 64) as Buffer;
    return buf.toString('hex') === hashedPassword;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// === Login Endpoint ===
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Login attempt:', {
      body: req.body,
      headers: req.headers
    });

    const { username, email, password } = req.body;
    const loginIdentifier = email || username;

    if (!loginIdentifier || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ 
        error: 'Missing credentials',
        received: { identifier: !!loginIdentifier, password: !!password }
      });
    }

    // Try to find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier }
        ]
      }
    });

    console.log('User lookup result:', {
      found: !!user,
      identifier: loginIdentifier
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const isValid = await verifyPassword(user.password, password);
    console.log('Password valid:', isValid);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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