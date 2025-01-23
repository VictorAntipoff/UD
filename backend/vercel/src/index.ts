import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { calculateUptime } from './utils/uptime.js';
import { HealthCheckResponse, HealthStatus } from './types/health.js';

// Load environment variables
config();

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['warn', 'error']
});

// Create Fastify instance
const app = Fastify({
  logger: true
});

const SERVER_START_TIME = Date.now();

// Setup server
const setupServer = async () => {
  // Register CORS
  await app.register(cors, {
    origin: [
      'http://localhost:3020',
      'http://localhost:5173',
      'https://ud-frontend-snowy.vercel.app'
    ].filter(Boolean),
    credentials: true
  });

  // Health check endpoint
  app.get('/health', async (request, reply) => {
    try {
      const healthCheck: HealthCheckResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'unknown',
        uptime: calculateUptime(SERVER_START_TIME),
        database: 'checking'
      };

      try {
        await prisma.$queryRaw`SELECT 1 as connected`;
        healthCheck.database = 'connected';
      } catch (error) {
        console.error('Database health check failed:', error);
        healthCheck.database = 'disconnected';
        healthCheck.status = 'error';
      }

      return healthCheck;
    } catch (error) {
      return reply.status(500).send({
        status: 'error' as HealthStatus,
        message: 'Health check failed'
      });
    }
  });

  // Register routes
  const authRoutes = (await import('./routes/auth.js')).default;
  const projectRoutes = (await import('./routes/projects.js')).default;
  const factoryRoutes = (await import('./routes/factory.js')).default;

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(factoryRoutes, { prefix: '/api/factory' });

  return app;
};

// For Vercel serverless deployment
export default async (req: any, res: any) => {
  try {
    if (!app.ready) {
      await setupServer();
    }
    
    // Handle the request
    await app.ready();
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  const startServer = async () => {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      
      await setupServer();
      await app.listen({ port: Number(process.env.PORT) || 3010 });
      console.log(`🚀 Server running on port ${process.env.PORT || 3010}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      await prisma.$disconnect();
      process.exit(1);
    }
  };

  startServer().catch((error) => {
    console.error('❌ Startup error:', error);
    process.exit(1);
  });
}

// Handle cleanup
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
});