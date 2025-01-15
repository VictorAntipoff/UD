import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

async function main() {
  try {
    console.log('Starting database seed...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('Password hashed');

    // Create admin user
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: hashedPassword
      },
      create: {
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created:', admin.email);

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Test Project',
        description: 'A test project',
        ownerId: admin.id,
        isPublic: true,
      },
    });
    console.log('Test project created:', project.name);

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });