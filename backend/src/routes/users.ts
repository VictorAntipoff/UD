import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

async function usersRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all user routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  fastify.get('/', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          failedLoginAttempts: true,
          accountLockedAt: true,
          lastFailedLoginAt: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // SECURITY: Unlock user account (Admin only)
  fastify.post('/unlock/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can unlock user accounts'
        });
      }

      // Unlock the user account
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          accountLockedAt: null,
          lastFailedLoginAt: null
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          failedLoginAttempts: true,
          accountLockedAt: true
        }
      });

      return {
        success: true,
        message: 'Account unlocked successfully',
        user
      };
    } catch (error) {
      console.error('Error unlocking user account:', error);
      return reply.status(500).send({ error: 'Failed to unlock user account' });
    }
  });
}

export default usersRoutes; 