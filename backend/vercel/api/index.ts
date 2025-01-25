import { VercelRequest, VercelResponse } from '@vercel/node';
import { renderHTML } from './html';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle JSON request
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({
      status: 'healthy',
      message: 'UDesign System API',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        projects: '/api/projects',
        factory: '/api/factory'
      }
    });
  }

  // Render HTML response
  const html = renderHTML(`
    <header class="header">
        <div class="brand">
            <img src="/logo.png" alt="UDesign" />
        </div>
        <h1 class="title">System</h1>
        <div class="system-status">
            <span id="statusIndicator" class="status-indicator online"></span>
            <span id="statusText">All Systems Operational</span>
        </div>
    </header>

    <div class="grid">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">System Metrics</h2>
            </div>
            <div class="metrics">
                <div class="metric">
                    <span class="metric-label">Environment</span>
                    <span id="environment" class="metric-value">${process.env.NODE_ENV || 'development'}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Version</span>
                    <span id="version" class="metric-value">1.0.0</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Region</span>
                    <span id="region" class="metric-value">fra1</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span id="uptime" class="metric-value">-</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Database Latency</span>
                    <span id="latency" class="metric-value">-</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">API Endpoints</h2>
            </div>
            <div class="endpoints">
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
                    <span class="path">/api/projects</span>
                </div>
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <span class="path">/api/projects</span>
                </div>
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <span class="path">/api/factory</span>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Response Latency</h2>
            </div>
            <div class="metrics">
                <div class="metric">
                    <span class="metric-label">Average</span>
                    <span class="metric-value">47ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Peak</span>
                    <span class="metric-value">124ms</span>
                </div>
            </div>
            <div id="latencyChart" class="chart"></div>
        </div>
    </div>

    <footer>
        <p>
            UDesign System • Version 1.0.0 • 
            <a href="https://github.com/yourusername/ud-app" target="_blank">Documentation</a>
        </p>
    </footer>
  `);

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
} 