import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';

config();

const app: Express = express();

// Enable pre-flight requests for all routes
app.options('*', cors());

// CORS middleware configuration
app.use(cors({
  origin: true, // Allow all origins temporarily for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parse JSON bodies
app.use(express.json());

// Add CORS headers to all responses
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Database configuration
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    },
  },
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Test database endpoint
app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    // Test user count
    const userCount = await prisma.user.count();
    
    // Test getting admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@udesign.com'
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    // Test settings
    const settings = await prisma.setting.findMany();

    res.json({
      status: 'ok',
      data: {
        userCount,
        adminUser,
        settingsCount: settings.length
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error',
      error: error
    });
  }
});

export default app;