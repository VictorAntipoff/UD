import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Create Fastify instance
const app = Fastify({
  logger: true,
  trustProxy: true
});

// Basic setup
const setup = async () => {
  // CORS
  await app.register(cors, {
    origin: ['https://ud-frontend-snowy.vercel.app'],
    credentials: true
  });

  // Health check
  app.get('/api/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      throw new Error('Database connection failed');
    }
  });

  return app;
};

// Vercel handler
export default async function handler(req: any, res: any) {
  try {
    // Initialize if needed
    if (!app.ready) {
      await setup();
    }

    // Handle the request
    await app.ready();
    app.server.emit('request', req, res);
  } catch (error) {
    // Error handling
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  } finally {
    // Cleanup
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('Prisma disconnect error:', e);
    }
  }
}

// Error handler
app.setErrorHandler((error, request, reply) => {
  reply.status(500).send({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});