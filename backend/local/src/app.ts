import * as express from 'express';
import { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import { prisma } from './lib/prisma';
import { config } from 'dotenv';
import { calculateUptime } from './utils/uptime';

config();

const app: Express = express.default();

// Store server start time at the top level
const SERVER_START_TIME = Date.now();

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3020',
      'http://localhost:5173',
      'https://ud-frontend-snowy.vercel.app',
      'https://ud-frontend.vercel.app'
    ];

    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Types
type HealthStatus = 'ok' | 'degraded' | 'error';
type DatabaseStatus = 'checking' | 'connected' | 'disconnected';

interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
  env: string | undefined;
  database: DatabaseStatus;
  dbError?: string;
  uptime: string;
  responseTime: number;
}

// Health check endpoint
app.get(['/health', '/api/health'], async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // First check if database client is initialized
    if (!prisma) {
      return res.status(500).json({
        status: 'error',
        message: 'Database client not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const healthCheck = {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown',
      uptime: calculateUptime(SERVER_START_TIME),
      database: 'checking' as const,
      responseTime: 0
    };

    try {
      // Test database connection with timeout
      const dbCheckPromise = prisma.$queryRaw`SELECT 1 as connected`;
      const result = await Promise.race([
        dbCheckPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        )
      ]);

      if (Array.isArray(result) && result[0]?.connected === 1) {
        healthCheck.database = 'connected' as const;
      } else {
        throw new Error('Invalid database response');
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.status = 'error';
      healthCheck.database = 'disconnected';
    }

    // Calculate response time
    healthCheck.responseTime = Date.now() - startTime;

    // Set proper headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    
    // Ensure we send a proper JSON response
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

// Favicon routes
app.get(['/favicon.ico', '/favicon_grey.ico'], (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/favicon_grey.ico'), (err: NodeJS.ErrnoException | null) => {
    if (err) {
      console.error('Error serving favicon:', err);
      res.status(404).send('Favicon not found');
    }
  });
});

// 404 handlers
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint does not exist'
  });
});

app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Error handler
interface CustomError extends Error {
  code?: string;
  path?: string;
}

app.use((err: CustomError, _req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  
  if (res.headersSent) return next(err);
  
  if (err.code === 'ENOENT') {
    console.error('File not found:', err.path);
    res.status(404).send('File not found');
    return;
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;