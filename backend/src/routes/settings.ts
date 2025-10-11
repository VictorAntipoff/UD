import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

async function settingsRoutes(fastify: FastifyInstance) {
  // Get all settings
  fastify.get('/', async (request, reply) => {
    try {
      const settings = await prisma.setting.findMany();
      return settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return reply.status(500).send({ error: 'Failed to fetch settings' });
    }
  });

  // Get a specific setting by key
  fastify.get('/:key', async (request, reply) => {
    try {
      const { key } = request.params as { key: string };
      const setting = await prisma.setting.findUnique({
        where: { key }
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

  // Update or create a setting
  fastify.put('/:key', async (request, reply) => {
    try {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: string };

      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });

      return setting;
    } catch (error) {
      console.error('Error updating setting:', error);
      return reply.status(500).send({ error: 'Failed to update setting' });
    }
  });
}

export default settingsRoutes; 