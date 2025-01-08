import { Request } from 'express';
import { PrismaClient } from '@prisma/client';

/**
 * Extends Express Request type to include user property
 * Used for authenticated routes where the user object is attached to the request
 */
export interface AuthRequest extends Request {
  user?: PrismaClient['user']['payload'];
} 