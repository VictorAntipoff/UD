import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('Resetting Supabase database...');

    // Drop existing tables if they exist
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;
    
    console.log('Schema reset complete');

    // Push new schema
    console.log('Pushing new schema...');
    await prisma.$executeRaw`
      GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
    `;

  } catch (error) {
    console.error('Reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase().catch(console.error); 