import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

// Store server start time
const SERVER_START_TIME = Date.now();

const app = express();

// Initialize Prisma Client globally
export const prisma = new PrismaClient();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3020',
    'http://localhost:5173', // Add Vite's default port
    'https://ud-frontend-snowy.vercel.app',
    'https://ud-frontend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 1. Middleware
app.use(cors(corsOptions));
app.use(express.json());

// 2. Static files
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  fallthrough: true
}));

// 3. Request logging
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});

// 4. Health check endpoint
app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    // Calculate uptime from start time
    const uptimeMs = Date.now() - SERVER_START_TIME;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    
    // Calculate days, hours, minutes
    const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
    const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);

    // Format uptime string
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    
    const formattedUptime = parts.join(' ');
    
    console.log('Uptime Calculation:', {
      uptimeMs,
      uptimeSeconds,
      days,
      hours,
      minutes,
      formattedUptime
    });
    
    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      currentTime: new Date().toISOString(),
      uptime: {
        days,
        hours,
        minutes,
        total_ms: uptimeMs,
        formatted: formattedUptime
      },
      env: process.env.NODE_ENV,
      database: 'connected'
    };

    res.json(response);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

// 5. API routes
app.use('/api/auth', authRoutes);

// 6. Favicon routes
app.get(['/favicon.ico', '/favicon_grey.ico'], (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/favicon_grey.ico'), (err) => {
    if (err) {
      console.error('Error serving favicon:', err);
      res.status(404).send('Favicon not found');
    }
  });
});

// 8. 404 handlers
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint does not exist'
  });
});

app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// 9. Error handler (single, consolidated handler)
const errorHandler = (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
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
};

app.use(errorHandler);

export default app;