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
    
    // Delete existing data (optional, for clean slate)
    await prisma.woodCalculation.deleteMany({});
    await prisma.woodType.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    console.log('Creating admin user...');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('Admin created:', { id: admin.id, email: admin.email });

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    console.log('Creating regular user...');
    const user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        password: userPassword,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
      },
    });
    console.log('User created:', { id: user.id, email: user.email });

    // Create wood types
    console.log('Creating wood types...');
    const woodTypes = await Promise.all([
      prisma.woodType.create({
        data: {
          name: 'Oak',
          description: 'Strong and durable hardwood',
          density: 0.75,
          grade: 'A',
          origin: 'North America'
        }
      }),
      prisma.woodType.create({
        data: {
          name: 'Pine',
          description: 'Lightweight softwood',
          density: 0.50,
          grade: 'B',
          origin: 'Northern Europe'
        }
      }),
      prisma.woodType.create({
        data: {
          name: 'Mahogany',
          description: 'Premium tropical hardwood',
          density: 0.85,
          grade: 'A+',
          origin: 'Central America'
        }
      }),
      prisma.woodType.create({
        data: {
          name: 'Cedar',
          description: 'Aromatic weather-resistant wood',
          density: 0.45,
          grade: 'B+',
          origin: 'Canada'
        }
      }),
      prisma.woodType.create({
        data: {
          name: 'Teak',
          description: 'Marine-grade hardwood',
          density: 0.95,
          grade: 'A+',
          origin: 'Myanmar'
        }
      })
    ]);
    console.log(`Created ${woodTypes.length} wood types`);

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();