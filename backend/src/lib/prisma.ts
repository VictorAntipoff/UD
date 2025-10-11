import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  errorFormat: 'pretty',
  // Increase connection pool timeout to handle slow Neon database
  // @ts-ignore
  __internal: {
    engine: {
      connection_limit: 10,
      pool_timeout: 30
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;

  // Debug logging
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    
    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
  });
}

// Add connection testing function
export async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Successfully connected to database');
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return false;
  }
}

export async function disconnect() {
  await prisma.$disconnect();
}

export { prisma };
