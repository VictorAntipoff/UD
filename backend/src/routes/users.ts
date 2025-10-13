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
}

export default usersRoutes; 