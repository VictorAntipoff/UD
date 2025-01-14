import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdmin() {
  try {
    console.log('Starting admin user creation...');

    // Delete existing admin if exists
    console.log('Removing existing admin...');
    await prisma.user.deleteMany({
      where: { username: 'admin' }
    });

    // Create new admin user
    console.log('Creating new admin user...');
    const hashedPassword = await hashPassword('admin123');
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@udesign.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('Admin user created successfully:', {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin().catch(console.error); 