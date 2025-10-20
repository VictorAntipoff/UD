import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { PrismaClient } from '@prisma/client';
import { calculateUptime } from './utils/uptime.js';
import { HealthCheckResponse, HealthStatus } from './types/health.js';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import healthRoutes from './routes/health.js';
import { prisma } from './lib/prisma.js';

// Load environment variables
const env = config();
expand(env);

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Initialize Fastify app
const app = Fastify({
  logger: true
});

const PORT = Number(process.env.PORT) || 3010;
const SERVER_START_TIME = Date.now();

// Initialize Prisma
const prismaClient = new PrismaClient({
  log: ['warn', 'error']
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register CORS
const setupServer = async () => {
  await app.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins = [
        'http://localhost:3020',
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.FRONTEND_URL,
        process.env.PRODUCTION_FRONTEND_URL // Add specific production URL
      ].filter(Boolean);

      // SECURITY: Allow no origin for health checks, monitoring, and development tools
      // Health check endpoints (/api/health) don't need CORS as they contain no sensitive data
      if (!origin) {
        return cb(null, true);
      }

      // SECURITY: Only allow SPECIFIC Vercel/Railway URLs, not all subdomains
      // Specify your exact domain in .env as PRODUCTION_FRONTEND_URL
      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true
  });

  // Root route
  app.get('/', async (request, reply) => {
    // Check API status
    let apiStatus = 'online';
    let statusColor = '#10b981';
    try {
      await prismaClient.$queryRaw`SELECT 1`;
    } catch (error) {
      apiStatus = 'offline';
      statusColor = '#ef4444';
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" href="/favicon_grey.ico">
        <title>UDesign API</title>
        <style>
          :root {
            --glass-bg: rgba(255, 255, 255, 0.9);
            --glass-border: rgba(0, 0, 0, 0.1);
            --glass-shadow: rgba(0, 0, 0, 0.05);
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            background: #f8fafc;
            color: #1f2937;
            padding: 2rem;
            display: flex;
            justify-content: center;
          }

          .glass {
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 0.75rem;
            box-shadow: 0 4px 6px var(--glass-shadow);
          }

          .container {
            width: 50%;
            min-width: 600px;
            margin: 0 auto;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1rem;
          }

          .logo {
            height: 32px;
            width: auto;
          }

          .status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 2rem;
            background: #f1f5f9;
            font-size: 0.875rem;
            color: #475569;
          }

          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${statusColor};
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }

          .card {
            padding: 1rem;
            transition: transform 0.2s;
          }

          .card:hover {
            transform: translateY(-2px);
          }

          .card-label {
            font-size: 0.75rem;
            color: #64748b;
            margin-bottom: 0.25rem;
          }

          .card-value {
            font-size: 1rem;
            font-weight: 500;
            color: #334155;
          }

          .endpoints {
            padding: 1rem;
          }

          .endpoints h2 {
            margin-bottom: 1rem;
            font-size: 1rem;
            color: #334155;
          }

          .endpoint-list {
            display: grid;
            gap: 0.5rem;
          }

          .endpoint {
            display: flex;
            align-items: center;
            padding: 0.5rem;
            border-radius: 0.5rem;
            background: #f8fafc;
            transition: background 0.2s;
          }

          .endpoint:hover {
            background: #f1f5f9;
          }

          .method {
            font-size: 0.75rem;
            font-weight: 500;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            margin-right: 0.75rem;
            min-width: 45px;
            text-align: center;
          }

          .get { background: #dbeafe; color: #1d4ed8; }
          .post { background: #dcfce7; color: #15803d; }

          .path {
            font-family: 'Monaco', monospace;
            font-size: 0.75rem;
            color: #475569;
          }

          .footer {
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.75rem;
            color: #64748b;
          }

          @media (max-width: 640px) {
            body { padding: 1rem; }
            .container { 
              width: 100%;
              min-width: auto;
            }
            .header { 
              flex-direction: column; 
              gap: 1rem; 
            }
            .grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header class="header glass">
            <img src="/logo.png" alt="UDesign" class="logo" />
            <div class="status">
              <div class="status-dot"></div>
              API ${apiStatus}
            </div>
          </header>

          <div class="grid">
            <div class="card glass">
              <div class="card-label">Server Port</div>
              <div class="card-value">${PORT}</div>
            </div>
            <div class="card glass">
              <div class="card-label">Environment</div>
              <div class="card-value">${process.env.NODE_ENV || 'development'}</div>
            </div>
            <div class="card glass">
              <div class="card-label">Uptime</div>
              <div class="card-value">${calculateUptime(SERVER_START_TIME)}</div>
            </div>
          </div>

          <div class="endpoints glass">
            <h2>API Endpoints</h2>
            <div class="endpoint-list">
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/health</span>
              </div>
              <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/auth/login</span>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/auth/me</span>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/users</span>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/projects</span>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/settings</span>
              </div>
            </div>
          </div>

          <footer class="footer">
            <p>UDesign API v1.0.0 • ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </footer>
        </div>
      </body>
      </html>
    `;

    reply.type('text/html').send(html);
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
        await prismaClient.$queryRaw`SELECT 1 as connected`;
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
  const usersRoutes = (await import('./routes/users.js')).default;
  const managementRoutes = (await import('./routes/management.js')).default;
  const settingsRoutes = (await import('./routes/settings.js')).default;
  const electricityRoutes = (await import('./routes/electricity.js')).default;
  const assetRoutes = (await import('./routes/assets.js')).default;
  const transferRoutes = (await import('./routes/transfers.js')).default;
  const websiteRoutes = (await import('./routes/website.js')).default;
  const notificationRoutes = (await import('./routes/notifications.js')).default;

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(factoryRoutes, { prefix: '/api/factory' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(managementRoutes, { prefix: '/api/management' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(electricityRoutes, { prefix: '/api/electricity' });
  await app.register(assetRoutes, { prefix: '/api/assets' });
  await app.register(transferRoutes, { prefix: '/api/transfers' });
  await app.register(websiteRoutes, { prefix: '/api/website' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });

  // Register static file serving
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/',
    decorateReply: false,
    setHeaders: (res, path) => {
      if (path.endsWith('favicon_grey.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  });

  // Register health routes
  await app.register(healthRoutes, { prefix: '/api' });
};

// Start server
const startServer = async () => {
  try {
    await prismaClient.$connect();
    console.log('✅ Database connected');

    await setupServer();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prismaClient.$disconnect();
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
  await app.close();
  await prismaClient.$disconnect();
  process.exit(0);
});

export default app;
