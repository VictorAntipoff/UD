// === Database Seed File ===
// File: prisma/seed.ts
// Description: Initializes database with default data

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// === Default User Data ===
const userData: Prisma.UserCreateInput = {
  username: 'admin',
  email: 'admin@udesign.com',
  password: hashedPassword,
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  status: 'active'
};

// === Seed Function ===
async function main() {
  try {
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: userData
    });

    console.log('Seed completed:', { admin });
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });