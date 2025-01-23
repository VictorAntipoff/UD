import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'unknown',
      database: 'checking',
      responseTime: 0
    };

    try {
      await prisma.$connect();
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      
      if (Array.isArray(result) && result[0]?.connected === 1) {
        healthCheck.database = 'connected';
      } else {
        throw new Error('Database check failed');
      }
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.status = 'error';
      healthCheck.database = 'disconnected';
    } finally {
      await prisma.$disconnect();
    }

    healthCheck.responseTime = Date.now() - startTime;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).json(healthCheck);
  } catch (error) {
    console.error('Health check failed:', error);
    
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
} 