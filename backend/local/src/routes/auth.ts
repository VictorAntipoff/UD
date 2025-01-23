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
  // Debug logging
  fastify.addHook('onRequest', async (request) => {
    console.log('Auth request:', {
      url: request.url,
      method: request.method,
      body: request.body,
      headers: request.headers
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

      // Verify password
      const validPassword = await compare(password, user.password);
      if (!validPassword) {
        return reply.status(401).send({ 
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

  // Me route
  fastify.get('/me', async (request, reply) => {
    try {
      const userId = (request as any).user?.id;
      if (!userId) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

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