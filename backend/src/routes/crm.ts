import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export default async function crmRoutes(fastify: FastifyInstance) {
  // Subscribe to newsletter (public endpoint - no auth required)
  fastify.post('/api/crm/newsletter/subscribe', async (request, reply) => {
    try {
      const { email } = request.body as { email: string };

      if (!email || !email.includes('@')) {
        return reply.code(400).send({ error: 'Valid email is required' });
      }

      // Check if already subscribed
      const existing = await prisma.newsletterSubscriber.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existing) {
        if (existing.status === 'unsubscribed') {
          // Resubscribe
          const updated = await prisma.newsletterSubscriber.update({
            where: { email: email.toLowerCase() },
            data: {
              status: 'active',
              subscribedAt: new Date(),
              unsubscribedAt: null,
            },
          });
          return reply.send({ message: 'Successfully resubscribed!', subscriber: updated });
        }
        return reply.send({ message: 'You are already subscribed!', subscriber: existing });
      }

      // Create new subscriber
      const subscriber = await prisma.newsletterSubscriber.create({
        data: {
          email: email.toLowerCase(),
          source: 'coming-soon',
          status: 'active',
        },
      });

      return reply.send({ message: 'Successfully subscribed!', subscriber });
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      return reply.code(500).send({ error: 'Failed to subscribe to newsletter' });
    }
  });

  // Get all newsletter subscribers (requires auth)
  fastify.get('/api/crm/newsletter/subscribers', async (request, reply) => {
    try {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        orderBy: { subscribedAt: 'desc' },
      });

      const stats = {
        total: subscribers.length,
        active: subscribers.filter((s) => s.status === 'active').length,
        unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
      };

      return reply.send({ subscribers, stats });
    } catch (error: any) {
      console.error('Error fetching subscribers:', error);
      return reply.code(500).send({ error: 'Failed to fetch subscribers' });
    }
  });

  // Unsubscribe (can be public with email param or authenticated)
  fastify.post('/api/crm/newsletter/unsubscribe', async (request, reply) => {
    try {
      const { email } = request.body as { email: string };

      if (!email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      const subscriber = await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase() },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date(),
        },
      });

      return reply.send({ message: 'Successfully unsubscribed', subscriber });
    } catch (error: any) {
      console.error('Unsubscribe error:', error);
      return reply.code(404).send({ error: 'Email not found' });
    }
  });

  // Delete subscriber (admin only)
  fastify.delete('/api/crm/newsletter/subscribers/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.newsletterSubscriber.delete({
        where: { id },
      });

      return reply.send({ message: 'Subscriber deleted successfully' });
    } catch (error: any) {
      console.error('Delete subscriber error:', error);
      return reply.code(500).send({ error: 'Failed to delete subscriber' });
    }
  });
}
