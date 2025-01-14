import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  try {
    console.log('Testing database connection...');

    // Test connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Check users
    const users = await prisma.user.findMany();
    console.log('Users in database:', users);

    // Check settings
    const settings = await prisma.setting.findMany();
    console.log('Settings in database:', settings);

    // Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@udesign.com' }
    });
    console.log('Admin user:', admin);

  } catch (error) {
    console.error('Error verifying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 