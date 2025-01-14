import { PrismaClient } from '@prisma/client';
import { scrypt } from 'crypto';
import { promisify } from 'util';

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

async function verifyPassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
  const [hashedPassword, salt] = storedPassword.split('.');
  const buf = await scryptAsync(suppliedPassword, salt, 64) as Buffer;
  return buf.toString('hex') === hashedPassword;
}

async function testLogin() {
  try {
    console.log('Testing login...');

    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (!user) {
      console.error('Admin user not found!');
      return;
    }

    console.log('Found user:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });

    const isValid = await verifyPassword(user.password, 'admin123');
    console.log('Password valid:', isValid);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin().catch(console.error); 