import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

async function testConnection() {
  try {
    // Test connection
    console.log('Testing connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected');

    // Check users table
    const users = await prisma.user.findMany();
    console.log('Users in database:', users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      hasPassword: !!u.password
    })));

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection(); 