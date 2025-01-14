import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function testConnection() {
  try {
    console.log('Testing connection...');
    await prisma.$connect();
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log('Connected to database:', result);
    
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 