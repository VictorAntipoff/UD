// === Authentication Middleware ===
// File: src/middleware/auth.ts
// Description: JWT authentication middleware for protecting API routes

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  role: string;
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('SECURITY ERROR: JWT_SECRET not configured!');
      return reply.status(500).send({
        error: 'Server configuration error'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;

      // Attach user info to request
      request.user = decoded;

    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return reply.status(401).send({
          error: 'Token expired',
          message: 'Please log in again'
        });
      }

      if (err instanceof jwt.JsonWebTokenError) {
        return reply.status(401).send({
          error: 'Invalid token',
          message: 'Authentication failed'
        });
      }

      throw err; // Re-throw unexpected errors
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return reply.status(500).send({
      error: 'Internal server error'
    });
  }
}

// Optional: Role-based authorization middleware
export function requireRole(...allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }
  };
}
