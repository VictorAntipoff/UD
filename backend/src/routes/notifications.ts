import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

async function notificationRoutes(fastify: FastifyInstance) {
  // Protect all notification routes
  fastify.addHook('onRequest', authenticateToken);

  // Get all notifications for the current user
  fastify.get('/', async (request, reply) => {
    try {
      const user = (request as any).user;

      const notifications = await prisma.notification.findMany({
        where: {
          userId: user.userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50 // Limit to last 50 notifications
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // Get unread count
  fastify.get('/unread-count', async (request, reply) => {
    try {
      const user = (request as any).user;

      const count = await prisma.notification.count({
        where: {
          userId: user.userId,
          isRead: false
        }
      });

      return { count };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return reply.status(500).send({ error: 'Failed to fetch unread count' });
    }
  });

  // Mark notification as read
  fastify.patch('/:id/read', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      const notification = await prisma.notification.update({
        where: {
          id,
          userId: user.userId // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return reply.status(500).send({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  fastify.patch('/mark-all-read', async (request, reply) => {
    try {
      const user = (request as any).user;

      await prisma.notification.updateMany({
        where: {
          userId: user.userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return reply.status(500).send({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Delete notification
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;

      await prisma.notification.delete({
        where: {
          id,
          userId: user.userId // Ensure user can only delete their own notifications
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return reply.status(500).send({ error: 'Failed to delete notification' });
    }
  });

  // Create notification (internal use - for system to create notifications)
  fastify.post('/', async (request, reply) => {
    try {
      const user = (request as any).user;

      // Only admins can create notifications manually
      if (user.role !== 'ADMIN') {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      const data = request.body as any;

      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          linkUrl: data.linkUrl
        }
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return reply.status(500).send({ error: 'Failed to create notification' });
    }
  });
}

export default notificationRoutes;
