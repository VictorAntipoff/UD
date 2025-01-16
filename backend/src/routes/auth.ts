// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Auth route - Login request received:', { 
      username, 
      passwordLength: password?.length,
      headers: req.headers,
      body: req.body 
    });

    // Find user
    const user = await prisma.user.findFirst({
      where: { username }
    });

    if (!user) {
      console.log(`Auth route - User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`Auth route - User found: ${user.id}, verifying password...`);
    const isValid = await compare(password, user.password);
    console.log('Password verification result:', { isValid });

    if (!isValid) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
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
    return res.status(500).json({ 
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 