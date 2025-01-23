import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { calculateUptime } from './utils/uptime';
import { HealthCheckResponse, HealthStatus } from './types/health';
import { AppRouter } from './types/routes';

// Load environment variables
config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3010;
const SERVER_START_TIME = Date.now();

// Initialize Prisma
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'minimal',
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Dynamic route imports
const routeModules: { [key: string]: AppRouter } = {
  auth: require('./routes/auth').default,
  projects: require('./routes/projects').default,
  factory: require('./routes/factory').default
};

// Health check endpoint
app.get(['/health', '/api/health'], async (_req: Request, res: Response) => {
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

    return res.json(healthCheck);
  } catch (error) {
    return res.status(500).json({
      status: 'error' as HealthStatus,
      message: 'Health check failed'
    });
  }
});

// Register routes
Object.entries(routeModules).forEach(([name, router]) => {
  app.use(`/api/${name}`, router);
});

// Start server
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Start the server
startServer().catch((error) => {
  console.error('❌ Startup error:', error);
  process.exit(1);
});

// Handle cleanup
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;