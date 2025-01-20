import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const app: Express = express();

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:3020',
  'https://ud-frontend-snowy.vercel.app',
  'https://ud-frontend-chi.vercel.app'
];

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

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  try {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed'
    });
  }
});

// Mount auth routes
app.use('/api/auth', authRoutes);

// Landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve favicon with original name
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/favicon_grey.ico'));
});

// Catch-all route for API 404s
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint does not exist'
  });
});

// Catch-all route for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;