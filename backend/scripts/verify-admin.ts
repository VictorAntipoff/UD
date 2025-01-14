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

async function verifyAdmin() {
  try {
    // Check if admin exists
    let admin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (!admin) {
      // Create admin if doesn't exist
      const hashedPassword = await hashPassword('admin123');
      admin = await prisma.user.create({
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
      console.log('Admin user created:', admin);
    } else {
      console.log('Admin user exists:', admin);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin(); 