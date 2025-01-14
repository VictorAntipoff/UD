import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySetup() {
  try {
    console.log('Verifying database setup...');

    // Check users table
    const users = await prisma.user.findMany();
    console.log('\nUsers in database:', users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      isActive: u.isActive
    })));

    // Check admin user specifically
    const admin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (admin) {
      console.log('\nAdmin user exists:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive
      });
    } else {
      console.log('\nWarning: Admin user not found!');
    }

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySetup().catch(console.error); 