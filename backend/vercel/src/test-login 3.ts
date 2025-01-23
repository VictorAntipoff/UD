import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  // Try to find user by email
  const user = await prisma.user.findUnique({
    where: {
      email: 'admin@example.com'
    }
  });
  
  console.log('Found user:', user);
  
  if (user) {
    // Test password comparison
    const isValidPassword = await bcrypt.compare('admin123', user.password);
    console.log('Password valid:', isValidPassword);
  }
}

testLogin()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 