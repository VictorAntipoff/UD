import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import morgan from 'morgan';

config();

const app: Express = express();

// Initialize Prisma Client with error handling
let prisma: PrismaClient;
try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
  });
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  prisma = new PrismaClient();
}

// CORS configuration
const allowedOrigins = [
  'http://localhost:3020',
  'https://ud-frontend-snowy.vercel.app',
  'https://ud-frontend-chi.vercel.app',
  'https://ud-frontend-staging.vercel.app'
];

// Configure CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies first
app.use(express.json());

// Request logging after body parsing
app.use(morgan(':method :url :status :response-time ms'));
app.use((req: Request, _res: Response, next) => {
  console.log('Request:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
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

// Test database endpoint with better error handling
app.get('/api/test-db', async (_req: Request, res: Response) => {
  try {
    await prisma.$connect();
    
    const userCount = await prisma.user.count();
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@udesign.com' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    const settings = await prisma.setting.findMany();

    await prisma.$disconnect();

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
    await prisma.$disconnect();
    
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
});

// Global error handler - remove unused next parameter
app.use((err: any, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

export default app;