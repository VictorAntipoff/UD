import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json';
import { config } from 'dotenv';

config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3020', 'https://ud-frontend-snowy.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve favicon
app.get('/favicon.ico', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/favicon_grey.ico'));
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes first
app.use('/api/auth', authRoutes);

// Simplified health check
app.get('/api/health', (_req, res) => {
  try {
    const healthData = { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown'
    };
    
    debug('Health check response', healthData);
    res.json(healthData);
  } catch (error: any) {
    debug('Health check error', { 
      message: error.message,
      type: error.constructor.name
    });
    
    res.status(500).json({ 
      status: 'error',
      message: error.message
    });
  }
});

// Landing page
app.get('/', async (_req, res) => {
  try {
    const serverInfo = {
      port: process.env.PORT || '3010',
      environment: process.env.NODE_ENV || 'development',
      uptime: formatUptime(process.uptime())
    };

    const indexHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UDesign API</title>
        <link rel="icon" href="/favicon.ico" />
        <style>
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes slideIn {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            position: relative;
            overflow: hidden;
            color: #1a1a1a;
            line-height: 1.6;
          }

          @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(-10px, 10px); }
            100% { transform: translate(0, 0); }
          }
          
          @keyframes float2 {
            0% { transform: translate(0, 0); }
            50% { transform: translate(10px, -10px); }
            100% { transform: translate(0, 0); }
          }

          .background-circle-1 {
            position: absolute;
            top: -100px;
            right: -100px;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: rgba(204, 0, 0, 0.05);
            animation: float 6s ease-in-out infinite;
            z-index: 0;
          }

          .background-circle-2 {
            position: absolute;
            bottom: -150px;
            left: -150px;
            width: 400px;
            height: 400px;
            border-radius: 50%;
            background: rgba(204, 0, 0, 0.05);
            animation: float2 8s ease-in-out infinite;
            z-index: 0;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
            animation: fadeIn 0.6s ease-out;
            position: relative;
            z-index: 1;
          }

          .header {
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
          }

          .logo {
            width: 140px;
            height: auto;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            background: #e6ffe6;
            color: #006600;
            font-weight: 500;
            font-size: 0.8rem;
            margin-right: 0.5rem;
          }

          .status-badge::before {
            content: '';
            width: 8px;
            height: 8px;
            background: #00cc00;
            border-radius: 50%;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .info-card {
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.2s ease;
            animation: fadeIn 0.6s ease-out backwards;
          }

          .info-card:hover {
            transform: translateY(-2px);
          }

          .info-card h3 {
            margin: 0;
            color: #666;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .info-value {
            font-size: 1.2rem;
            font-weight: 600;
            color: #cc0000;
            margin-top: 0.5rem;
          }

          .endpoints {
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          }

          .endpoint {
            padding: 0.6rem;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            gap: 1rem;
            animation: slideIn 0.3s ease-out backwards;
            font-size: 0.8rem;
          }

          .endpoint:hover {
            background: #f8f9fa;
          }

          .method {
            padding: 0.3rem 0.8rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            min-width: 50px;
            text-align: center;
          }

          .get { background: #e3f2fd; color: #0d47a1; }
          .post { background: #e8f5e9; color: #1b5e20; }

          .docs-link {
            display: inline-block;
            margin-top: 2rem;
            padding: 0.8rem 1.5rem;
            background: #cc0000;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          .docs-link:hover {
            background: #990000;
            transform: translateY(-1px);
          }
        </style>
      </head>
      <body>
        <div class="background-circle-1"></div>
        <div class="background-circle-2"></div>
        <div class="container">
          <header class="header">
            <div style="flex: 1">
              <img src="/logo.png" alt="UDesign Logo" class="logo">
            </div>
            <div style="flex-shrink: 0">
              <div class="status-badge">System Online</div>
            </div>
          </header>

          <div class="grid">
            <div class="info-card" style="animation-delay: 0.1s">
              <h3>Server Port</h3>
              <div class="info-value">${serverInfo.port}</div>
            </div>
            <div class="info-card" style="animation-delay: 0.2s">
              <h3>Environment</h3>
              <div class="info-value">${serverInfo.environment}</div>
            </div>
            <div class="info-card" style="animation-delay: 0.3s">
              <h3>Uptime</h3>
              <div class="info-value">${serverInfo.uptime}</div>
            </div>
          </div>

          <div class="endpoints">
            <h2 style="margin-top: 0">API Endpoints</h2>
            <div class="endpoint" style="animation-delay: 0.4s">
              <span class="method get">GET</span> /api/health
            </div>
            <div class="endpoint" style="animation-delay: 0.5s">
              <span class="method post">POST</span> /api/auth/login
            </div>
            <div class="endpoint" style="animation-delay: 0.6s">
              <span class="method get">GET</span> /api/users
            </div>
            <div class="endpoint" style="animation-delay: 0.7s">
              <span class="method get">GET</span> /api/projects
            </div>
            <div class="endpoint" style="animation-delay: 0.8s">
              <span class="method get">GET</span> /api/jobs
            </div>
            <div class="endpoint" style="animation-delay: 0.9s">
              <span class="method get">GET</span> /api/settings
            </div>
          </div>

          <div style="text-align: center">
            <a href="/api-docs" class="docs-link">View API Documentation →</a>
          </div>
        </div>
      </body>
      </html>
    `;

    res.send(indexHtml);
  } catch (error) {
    res.status(500).send('Error generating server information');
  }
});

// Static files after routes
app.use(express.static(path.join(__dirname, '../public')));

// Helper function to format uptime
function formatUptime(uptime: number): string {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Simplify debug function
const debug = (msg: string, obj: any = {}) => {
  console.log(`[DEBUG] ${msg}`);
  if (Object.keys(obj).length > 0) {
    console.log(JSON.stringify(obj, null, 2));
  }
};

// Add this to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
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