"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
exports.prisma = new client_1.PrismaClient();
const corsOptions = {
    origin: [
        'http://localhost:3020',
        'https://ud-frontend-snowy.vercel.app',
        'https://ud-frontend.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '../public'), {
    maxAge: '1d',
    fallthrough: true
}));
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.body,
        headers: req.headers
    });
    next();
});
app.get(['/health', '/api/health'], async (_req, res) => {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        const uptimeSeconds = Math.floor(process.uptime());
        const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
        const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
        const parts = [];
        if (days > 0)
            parts.push(`${days}d`);
        if (hours > 0 || days > 0)
            parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        const formattedUptime = parts.join(' ');
        const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            currentTime: new Date().toISOString(),
            uptime: {
                days,
                hours,
                minutes,
                total_ms: uptimeSeconds * 1000,
                formatted: formattedUptime
            },
            env: process.env.NODE_ENV,
            database: 'connected'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV,
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
        });
    }
});
app.use('/api/auth', auth_1.default);
app.get('/', async (_req, res) => {
    try {
        const serverInfo = {
            port: process.env.PORT || '3010',
            environment: process.env.NODE_ENV || 'development'
        };
        const indexHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UDesign API</title>
        <link rel="icon" href="/favicon_grey.ico" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .container {
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
          }
          .logo {
            display: block;
            margin: 0 auto 40px;
            max-width: 200px;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            background: #e8f5e9;
            color: #1b5e20;
            font-size: 14px;
            font-weight: 500;
            float: right;
          }
          .info-section {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .info-item {
            text-align: center;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .info-label {
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .info-value {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
          }
          .endpoints {
            background: white;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .endpoint {
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
          }
          .endpoint:last-child {
            border-bottom: none;
          }
          .method {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            min-width: 60px;
            text-align: center;
            margin-right: 12px;
          }
          .get { background: #e3f2fd; color: #0d47a1; }
          .post { background: #e8f5e9; color: #1b5e20; }
          .path { font-family: monospace; }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 40px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="/logo.png" alt="UDesign" class="logo">
          <div class="status">API Online</div>
          
          <div class="info-section">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Server Port</div>
                <div class="info-value">${serverInfo.port}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Environment</div>
                <div class="info-value">${serverInfo.environment}</div>
              </div>
            </div>
          </div>

          <div class="endpoints">
            <h2>API ENDPOINTS</h2>
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

          <div class="footer">
            UDesign API v1.0.0 • ${new Date().toLocaleDateString()}
          </div>
        </div>
      </body>
      </html>
    `;
        res.send(indexHtml);
    }
    catch (error) {
        console.error('Error generating landing page:', error);
        res.status(500).send('Error generating server information');
    }
});
app.get(['/favicon.ico', '/favicon_grey.ico'], (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/favicon_grey.ico'), (err) => {
        if (err) {
            console.error('Error serving favicon:', err);
            res.status(404).send('Favicon not found');
        }
    });
});
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
const errorHandler = (err, _req, res, next) => {
    console.error('Server error:', err);
    if (res.headersSent)
        return next(err);
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
exports.default = app;
//# sourceMappingURL=app.js.map