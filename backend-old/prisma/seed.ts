import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  log: ['error', 'warn']
});

async function main() {
  try {
    console.log('Starting seed...');
    
    // Delete existing users (optional, for clean slate)
    await prisma.user.deleteMany({});
    console.log('Cleared existing users');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    console.log('Creating admin user...');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('Admin created:', { id: admin.id, username: admin.username });

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    console.log('Creating regular user...');
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        username: 'user',
        password: userPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
      },
    });
    console.log('User created:', { id: user.id, username: user.username });

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();