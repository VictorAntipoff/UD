import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function testDb() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('Connected to database successfully');

    // Try to create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test@test.com',
        username: 'testuser',
        password: 'test123',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        isActive: true
      }
    });
    console.log('Test user created:', testUser);

    // Try to read the user back
    const users = await prisma.user.findMany();
    console.log('All users:', users);

  } catch (error) {
    console.error('Database test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDb(); 