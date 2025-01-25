import { VercelRequest, VercelResponse } from '@vercel/node';
import prisma, { verifyConnection } from '../prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log('Starting health check...');
    
    // Format uptime
    const uptime = process.uptime();
    const formatted = [
      Math.floor(uptime / 86400) + 'd',
      Math.floor((uptime % 86400) / 3600) + 'h',
      Math.floor((uptime % 3600) / 60) + 'm',
      Math.floor(uptime % 60) + 's'
    ].filter(str => !str.startsWith('0')).join(' ') || '0s';

    // Generate latency data
    const latencyHistory = Array.from({length: 30}, () => 
      Math.floor(Math.random() * 50) + 20
    );

    // Try database connection with timeout
    console.log('Checking database connection...');
    const startTime = Date.now();
    const isConnected = await verifyConnection();
    const endTime = Date.now();
    
    const dbLatency = `${endTime - startTime}ms`;
    console.log('Database check completed:', { isConnected, dbLatency });

    let dbInfo = null;
    if (isConnected) {
      try {
        const [info] = await prisma.$queryRaw`
          SELECT current_database() as db, 
                 current_user as user,
                 version() as version,
                 current_schema as schema
        `;
        dbInfo = info;
        console.log('Database info retrieved:', dbInfo);
      } catch (error) {
        console.error('Error getting database info:', error);
      }
    }

    const response = {
      status: isConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      region: process.env.VERCEL_REGION || 'fra1',
      database: {
        status: isConnected ? 'connected' : 'disconnected',
        latency: dbLatency,
        info: dbInfo
      },
      latencyHistory,
      uptime: {
        total: uptime,
        formatted
      }
    };

    console.log('Sending response:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Health check failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    
    return res.status(200).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      region: process.env.VERCEL_REGION || 'fra1',
      database: {
        status: 'disconnected',
        latency: '0ms',
        info: null,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
      },
      latencyHistory: Array(30).fill(0),
      uptime: {
        total: process.uptime(),
        formatted: '0s'
      }
    });
  }
} 