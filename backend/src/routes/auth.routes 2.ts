import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient({
  log: ['query', 'error']
});

router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt for:', username);

    // Input validation
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true
      }
    });

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    console.log('User found:', {
      id: user.id,
      username: user.username,
      passwordLength: user.password.length
    });

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password verification:', { isValid: isValidPassword });

    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ 
        message: 'Server configuration error' 
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
      }
    );

    // Send response
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({ 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;