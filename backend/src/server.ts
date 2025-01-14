import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import prisma from './lib/prisma';
import { authenticateToken, requireRole } from './middleware/auth';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import jobRoutes from './routes/jobs';
import settingRoutes from './routes/settings';
import projectRoutes from './routes/projects';

const app = express();
const port = process.env.PORT || 3020;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3010',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});

// Root route with logo and status
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UDesign API</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #ffffff;
            }
            .container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            .logo {
                max-width: 200px;
                height: auto;
            }
            .status {
                color: #4CAF50;
                font-size: 14px;
                font-family: -apple-system, system-ui, sans-serif;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .status-dot {
                width: 8px;
                height: 8px;
                background: #4CAF50;
                border-radius: 50%;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img src="/logo.png" alt="UDesign Logo" class="logo">
            <div class="status">
                <div class="status-dot"></div>
                API is running
            </div>
        </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, requireRole(['ADMIN']), userRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/jobs', authenticateToken, jobRoutes);
app.use('/api/settings', authenticateToken, settingRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    body: req.body
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3010'}`);
  console.log(`API Documentation: http://localhost:${port}`);
});

// Handle shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default app;