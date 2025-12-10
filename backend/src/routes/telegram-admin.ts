import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

const telegramAdminRoutes: FastifyPluginAsync = async (fastify) => {
  // ==== TELEGRAM MESSAGES ====

  /**
   * GET /telegram-admin/messages
   * Get all telegram messages grouped by category
   */
  fastify.get('/messages', async (request, reply) => {
    try {
      const messages = await prisma.telegramMessage.findMany({
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      // Group by category
      const grouped = messages.reduce((acc: any, msg) => {
        if (!acc[msg.category]) {
          acc[msg.category] = [];
        }
        acc[msg.category].push(msg);
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      console.error('Error fetching telegram messages:', error);
      return reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });

  /**
   * GET /telegram-admin/messages/:id
   * Get single message by ID
   */
  fastify.get('/messages/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const message = await prisma.telegramMessage.findUnique({
        where: { id }
      });

      if (!message) {
        return reply.status(404).send({ error: 'Message not found' });
      }

      return message;
    } catch (error) {
      console.error('Error fetching message:', error);
      return reply.status(500).send({ error: 'Failed to fetch message' });
    }
  });

  /**
   * POST /telegram-admin/messages
   * Create new message
   */
  fastify.post('/messages', async (request, reply) => {
    try {
      const data = request.body as {
        key: string;
        name: string;
        content: string;
        buttons?: any;
        description?: string;
        category: string;
        isActive?: boolean;
      };

      // Check if key already exists
      const existing = await prisma.telegramMessage.findUnique({
        where: { key: data.key }
      });

      if (existing) {
        return reply.status(400).send({ error: 'Message key already exists' });
      }

      const message = await prisma.telegramMessage.create({
        data: {
          key: data.key,
          name: data.name,
          content: data.content,
          buttons: data.buttons || null,
          description: data.description,
          category: data.category,
          isActive: data.isActive ?? true,
          updatedBy: (request as any).user?.id || 'admin'
        }
      });

      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      return reply.status(500).send({ error: 'Failed to create message' });
    }
  });

  /**
   * PUT /telegram-admin/messages/:id
   * Update message
   */
  fastify.put('/messages/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as {
        name?: string;
        content?: string;
        buttons?: any;
        description?: string;
        category?: string;
        isActive?: boolean;
      };

      const message = await prisma.telegramMessage.update({
        where: { id },
        data: {
          ...data,
          updatedBy: (request as any).user?.id || 'admin'
        }
      });

      return message;
    } catch (error) {
      console.error('Error updating message:', error);
      return reply.status(500).send({ error: 'Failed to update message' });
    }
  });

  /**
   * DELETE /telegram-admin/messages/:id
   * Delete message
   */
  fastify.delete('/messages/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.telegramMessage.delete({
        where: { id }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return reply.status(500).send({ error: 'Failed to delete message' });
    }
  });

  // ==== TELEGRAM SETTINGS ====

  /**
   * GET /telegram-admin/settings
   * Get all telegram settings grouped by category
   */
  fastify.get('/settings', async (request, reply) => {
    try {
      const settings = await prisma.telegramSetting.findMany({
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      // Group by category
      const grouped = settings.reduce((acc: any, setting) => {
        if (!acc[setting.category]) {
          acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
      }, {});

      return grouped;
    } catch (error) {
      console.error('Error fetching telegram settings:', error);
      return reply.status(500).send({ error: 'Failed to fetch settings' });
    }
  });

  /**
   * GET /telegram-admin/settings/:id
   * Get single setting by ID
   */
  fastify.get('/settings/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const setting = await prisma.telegramSetting.findUnique({
        where: { id }
      });

      if (!setting) {
        return reply.status(404).send({ error: 'Setting not found' });
      }

      return setting;
    } catch (error) {
      console.error('Error fetching setting:', error);
      return reply.status(500).send({ error: 'Failed to fetch setting' });
    }
  });

  /**
   * PUT /telegram-admin/settings/:id
   * Update setting value
   */
  fastify.put('/settings/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { value } = request.body as { value: string };

      // Check if setting is editable
      const existing = await prisma.telegramSetting.findUnique({
        where: { id }
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Setting not found' });
      }

      if (!existing.isEditable) {
        return reply.status(403).send({ error: 'This setting is not editable' });
      }

      const setting = await prisma.telegramSetting.update({
        where: { id },
        data: {
          value,
          updatedBy: (request as any).user?.id || 'admin'
        }
      });

      return setting;
    } catch (error) {
      console.error('Error updating setting:', error);
      return reply.status(500).send({ error: 'Failed to update setting' });
    }
  });

  /**
   * GET /telegram-admin/stats
   * Get telegram bot statistics
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const totalMessages = await prisma.telegramMessage.count();
      const activeMessages = await prisma.telegramMessage.count({
        where: { isActive: true }
      });
      const totalSettings = await prisma.telegramSetting.count();

      // Get reading statistics
      const totalReadings = await prisma.dryingReading.count({
        where: { source: 'TELEGRAM_BOT' }
      });

      const readingsLast7Days = await prisma.dryingReading.count({
        where: {
          source: 'TELEGRAM_BOT',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      return {
        messages: {
          total: totalMessages,
          active: activeMessages,
          inactive: totalMessages - activeMessages
        },
        settings: {
          total: totalSettings
        },
        readings: {
          total: totalReadings,
          last7Days: readingsLast7Days
        }
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });
};

export default telegramAdminRoutes;
