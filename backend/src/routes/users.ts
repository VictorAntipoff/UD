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
          permissions: true,
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

  // SECURITY: Create user (Admin only)
  fastify.post('/', async (request, reply) => {
    try {
      const createData = request.body as any;

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can create users'
        });
      }

      // Validate required fields
      if (!createData.email || !createData.password) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: createData.email }
      });

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(createData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: createData.email,
          password: hashedPassword,
          firstName: createData.firstName || null,
          lastName: createData.lastName || null,
          role: createData.role || 'USER',
          isActive: createData.isActive !== undefined ? createData.isActive : true,
          permissions: createData.permissions || null
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User created successfully',
        user
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return reply.status(500).send({ error: 'Failed to create user' });
    }
  });

  // SECURITY: Update user (Admin only)
  fastify.put('/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const updateData = request.body as any;

      console.log('PUT /users/:userId called');
      console.log('User ID:', userId);
      console.log('Update data:', JSON.stringify(updateData, null, 2));

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can update users'
        });
      }

      // Prepare update data
      const data: any = {};
      if (updateData.email) data.email = updateData.email;
      if (updateData.firstName !== undefined) data.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) data.lastName = updateData.lastName;
      if (updateData.role) data.role = updateData.role;
      if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
      if (updateData.permissions) data.permissions = updateData.permissions;

      console.log('Prepared data for update:', JSON.stringify(data, null, 2));

      // Update password if provided
      if (updateData.password) {
        const bcrypt = await import('bcryptjs');
        data.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('User updated successfully:', JSON.stringify(user, null, 2));

      return {
        success: true,
        message: 'User updated successfully',
        user
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return reply.status(500).send({ error: 'Failed to update user' });
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