import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import { config } from 'dotenv';
import os from 'os';

config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3020',
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve favicon
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/favicon_grey.ico'));
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Landing page
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    systemUptime: os.uptime(),
    memory: {
      free: os.freemem(),
      total: os.totalmem()
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Only start the server if we're not in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3010;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;