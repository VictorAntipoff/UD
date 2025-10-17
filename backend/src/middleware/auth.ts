// === Authentication Middleware ===
// File: src/middleware/auth.ts
// Description: JWT authentication middleware for protecting API routes

import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

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

// Warehouse-specific authorization middleware
export async function requireWarehouseAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Authentication required'
    });
  }

  // ADMIN and WAREHOUSE_MANAGER have global warehouse access
  if (request.user.role === 'ADMIN' || request.user.role === 'WAREHOUSE_MANAGER') {
    return;
  }

  // For other roles, we'll validate warehouse assignment in the route handlers
  // This middleware just ensures they have a warehouse-related role
  const warehouseRoles = ['WAREHOUSE_STAFF', 'WAREHOUSE_MANAGER', 'VIEWER'];
  if (!warehouseRoles.includes(request.user.role) && request.user.role !== 'ADMIN') {
    return reply.status(403).send({
      error: 'Insufficient permissions',
      message: 'This action requires warehouse access'
    });
  }
}

// Check if user can manage warehouses (create/edit/delete)
export function requireWarehouseManagement() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required'
      });
    }

    const allowedRoles = ['ADMIN', 'WAREHOUSE_MANAGER'];
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: 'This action requires ADMIN or WAREHOUSE_MANAGER role'
      });
    }
  };
}

// Check if user can approve transfers
export function requireTransferApproval() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required'
      });
    }

    const allowedRoles = ['ADMIN', 'WAREHOUSE_MANAGER'];
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: 'This action requires ADMIN or WAREHOUSE_MANAGER role to approve transfers'
      });
    }
  };
}

// Check if user can adjust stock
export function requireStockAdjustment() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required'
      });
    }

    const allowedRoles = ['ADMIN', 'WAREHOUSE_MANAGER'];
    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        message: 'This action requires ADMIN or WAREHOUSE_MANAGER role to adjust stock'
      });
    }
  };
}

// Helper function: Check if user has access to a specific warehouse
export async function checkWarehouseAccess(userId: string, warehouseId: string, userRole: string): Promise<boolean> {
  // ADMIN has access to all warehouses
  if (userRole === 'ADMIN') {
    return true;
  }

  // Check if user is assigned to this warehouse
  const assignment = await prisma.warehouseUser.findFirst({
    where: {
      userId,
      warehouseId
    }
  });

  return !!assignment;
}

// Helper function: Check if user can create transfers from/to warehouses
export async function canCreateTransfer(userId: string, fromWarehouseId: string, toWarehouseId: string, userRole: string): Promise<{ allowed: boolean; reason?: string }> {
  // ADMIN can create transfers between any warehouses
  if (userRole === 'ADMIN') {
    return { allowed: true };
  }

  // WAREHOUSE_STAFF and WAREHOUSE_MANAGER need access to BOTH warehouses
  if (userRole === 'WAREHOUSE_STAFF' || userRole === 'WAREHOUSE_MANAGER') {
    const hasFromAccess = await checkWarehouseAccess(userId, fromWarehouseId, userRole);
    const hasToAccess = await checkWarehouseAccess(userId, toWarehouseId, userRole);

    if (!hasFromAccess) {
      return { allowed: false, reason: 'You do not have access to the source warehouse' };
    }

    if (!hasToAccess) {
      return { allowed: false, reason: 'You do not have access to the destination warehouse' };
    }

    return { allowed: true };
  }

  // Other roles cannot create transfers
  return { allowed: false, reason: 'Your role does not allow creating transfers' };
}

// Helper function: Check if user can approve transfers for a warehouse
export async function canApproveTransfer(userId: string, warehouseId: string, userRole: string): Promise<boolean> {
  // ADMIN can approve all transfers
  if (userRole === 'ADMIN') {
    return true;
  }

  // WAREHOUSE_MANAGER can approve if they have access to the warehouse
  if (userRole === 'WAREHOUSE_MANAGER') {
    return await checkWarehouseAccess(userId, warehouseId, userRole);
  }

  // Other roles cannot approve
  return false;
}
