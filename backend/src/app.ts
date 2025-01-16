import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import morgan from 'morgan';

config();

const app: Express = express();

const allowedOrigins = [
  'http://localhost:3020',
  'http://localhost:3010',
  'https://ud-frontend-production.vercel.app',
  'https://ud-frontend-staging.vercel.app',
  'https://ud-backend-production.up.railway.app'
];

// Configure CORS
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Parse JSON bodies first
app.use(express.json());

// Request logging after body parsing
app.use(morgan(':method :url :status :response-time ms'));
app.use((req: Request, res: Response, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
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