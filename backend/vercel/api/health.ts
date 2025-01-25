import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test database connection
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      result
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
} 