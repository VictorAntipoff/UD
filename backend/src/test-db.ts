import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'error', 'warn']
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL);
    
    // Test connection
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log('Connected to database:', result);

    // Count users
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);

    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .then((success) => {
    if (!success) process.exit(1);
    process.exit(0);
  }); 