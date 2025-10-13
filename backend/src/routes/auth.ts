// === Authentication Routes ===
// File: src/routes/auth.ts
// Description: Handles all authentication-related API endpoints

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { compare } from 'bcrypt';

const prisma = new PrismaClient();

interface LoginBody {
  email: string;
  password: string;
}

async function authRoutes(fastify: FastifyInstance) {
  // Secure logging - only log non-sensitive data
  fastify.addHook('onRequest', async (request) => {
    console.log('Auth request:', {
      url: request.url,
      method: request.method
      // SECURITY: DO NOT log body or headers - contains passwords and tokens!
    });
  });

  // Login route
  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    try {
      const { email, password } = request.body;

      // Validate input
      if (!email || !password) {
        return reply.status(400).send({
          error: 'Email and password are required'
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return reply.status(401).send({
          error: 'Invalid credentials'
        });
      }

      // SECURITY: Check if account is locked
      if (user.accountLockedAt) {
        return reply.status(403).send({
          error: 'Account locked',
          message: 'Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
        });
      }

      // Verify password
      const validPassword = await compare(password, user.password);

      if (!validPassword) {
        // SECURITY: Increment failed login attempts
        const failedAttempts = user.failedLoginAttempts + 1;
        const shouldLock = failedAttempts >= 5;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lastFailedLoginAt: new Date(),
            accountLockedAt: shouldLock ? new Date() : null
          }
        });

        if (shouldLock) {
          return reply.status(403).send({
            error: 'Account locked',
            message: 'Your account has been locked due to too many failed login attempts. Please contact an administrator to unlock your account.'
          });
        }

        return reply.status(401).send({
          error: 'Invalid credentials',
          message: `Invalid email or password. ${5 - failedAttempts} attempts remaining before account lockout.`
        });
      }

      // SECURITY: Reset failed attempts on successful login
      if (user.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lastFailedLoginAt: null
          }
        });
      }

      // Generate token
      // SECURITY: Fail if JWT_SECRET is not configured
      if (!process.env.JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET environment variable is not set!');
        return reply.status(500).send({
          error: 'Server configuration error'
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return success
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return reply.status(500).send({
        error: 'Internal server error'
      });
    }
  });

  // Me route - with JWT verification
  fastify.get('/me', async (request, reply) => {
    try {
      // Get token from Authorization header
      const authHeader = request.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (!token) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      // Verify and decode token
      let decoded: any;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!);
      } catch (err) {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      const userId = decoded.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
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
        return reply.status(404).send({ error: 'User not found' });
      }

      return { user };
    } catch (error) {
      console.error('Error in /me endpoint:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Test endpoint
  fastify.get('/test', async () => {
    return { message: 'Auth routes working' };
  });

  // Ping endpoint
  fastify.get('/ping', async () => {
    return { 
      message: 'Auth API is working',
      timestamp: new Date().toISOString()
    };
  });
}

export default authRoutes; 