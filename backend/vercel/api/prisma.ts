import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  console.log('Initializing PrismaClient with DATABASE_URL:', 
    process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')
  );
  
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
};

// Keep a single instance of Prisma Client in development
const prisma = global.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Verify database connection
async function verifyConnection() {
  try {
    console.log('Attempting database connection...');
    await prisma.$connect();
    console.log('Database connection established');

    console.log('Testing database query...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('Database info:', result);
    
    return true;
  } catch (error) {
    console.error('Database connection error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });
    return false;
  } finally {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }
}

// Initialize connection
verifyConnection().catch(console.error);

export { verifyConnection };
export default prisma; 