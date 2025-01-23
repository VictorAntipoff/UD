"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
if (process.env.NODE_ENV !== 'production') {
    (0, dotenv_1.config)();
}
console.log('Environment Check:', {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: ((_a = process.env.SUPABASE_URL) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...',
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET
});
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_json_1 = __importDefault(require("./swagger.json"));
const app = (0, express_1.default)();
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://ud-frontend-snowy.vercel.app']
        : ['http://localhost:3020'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get('/favicon.ico', (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public/favicon_grey.ico'));
});
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_json_1.default));
app.use('/api/auth', auth_routes_1.default);
app.use((req, _res, next) => {
    console.log('Request:', {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers
    });
    next();
});
app.get('/api/health', (_req, res) => {
    try {
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            env: process.env.NODE_ENV || 'unknown'
        };
        debug('Health check response', healthData);
        res.json(healthData);
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).send('Error generating server information');
    }
});
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
app.use((err, req, res, next) => {
    console.error('Server Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json(Object.assign({ error: err.name || 'Internal Server Error', message: err.message || 'Something went wrong' }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
});
function formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    if (days > 0)
        return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0)
        return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0)
        return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}
const debug = (msg, obj = {}) => {
    console.log(`[DEBUG] ${msg}`);
    if (Object.keys(obj).length > 0) {
        console.log(JSON.stringify(obj, null, 2));
    }
};
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3010;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
exports.default = app;
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});
//# sourceMappingURL=server.js.map