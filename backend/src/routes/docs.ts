import { Router } from 'express';

const router = Router();
const startTime = Date.now();
const getUptime = () => Math.floor((Date.now() - startTime) / 1000);

router.get('/', (req, res) => {
  const endpoints = [
    { method: 'GET', path: '/api/health' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'GET', path: '/api/users' },
    { method: 'GET', path: '/api/projects' },
    { method: 'GET', path: '/api/jobs' },
    { method: 'GET', path: '/api/settings' }
  ];

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>UDesign API</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8f9fa;
          color: #333;
          line-height: 1.6;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          max-width: 600px;
          width: 90%;
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin: 20px;
        }
        .logo-container {
          text-align: center;
          margin-bottom: 32px;
        }
        .logo {
          max-width: 150px;
          height: auto;
        }
        .status-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
        }
        .status {
          display: flex;
          align-items: center;
          color: #2ecc71;
          font-weight: 500;
          font-size: 1.1em;
          margin-bottom: 16px;
        }
        .status::before {
          content: "";
          display: inline-block;
          width: 8px;
          height: 8px;
          background: #2ecc71;
          border-radius: 50%;
          margin-right: 8px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 8px;
        }
        .info-item {
          text-align: center;
        }
        .info-label {
          color: #6c757d;
          font-size: 0.85em;
          margin-bottom: 4px;
        }
        .info-value {
          font-weight: 600;
          color: #343a40;
          font-size: 0.95em;
        }
        .section-title {
          font-size: 1.2em;
          color: #343a40;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e9ecef;
        }
        .endpoints-grid {
          display: grid;
          gap: 8px;
        }
        .endpoint {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
        }
        .method {
          font-family: monospace;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          min-width: 60px;
          text-align: center;
          margin-right: 12px;
        }
        .get { background: #e3f2fd; color: #1976d2; }
        .post { background: #e8f5e9; color: #388e3c; }
        .path {
          font-family: monospace;
          color: #444;
          font-size: 13px;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #dee2e6;
          color: #6c757d;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-container">
          <img src="/logo.png" alt="UDesign Logo" class="logo">
        </div>

        <div class="status-card">
          <div class="status">API is running</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Port</div>
              <div class="info-value">${process.env.PORT || 3010}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Environment</div>
              <div class="info-value">${process.env.NODE_ENV || 'development'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Uptime</div>
              <div class="info-value">${getUptime()}s</div>
            </div>
          </div>
        </div>

        <h2 class="section-title">Available Endpoints</h2>
        <div class="endpoints-grid">
          ${endpoints.map(endpoint => `
            <div class="endpoint">
              <span class="method ${endpoint.method.toLowerCase()}">${endpoint.method}</span>
              <span class="path">${endpoint.path}</span>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          UDesign API v1.0.0 • ${new Date().toLocaleDateString()}
        </div>
      </div>
    </body>
    </html>
  `);
});

export default router; 