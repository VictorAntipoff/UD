import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    console.log('Database URL:', process.env.DATABASE_URL);

    // Try to query the database
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('Existing tables:', tables);

    // Check Prisma schema
    const models = await prisma.$queryRaw`
      SELECT * FROM "_prisma_migrations"
    `.catch(() => null);

    console.log('Prisma migrations:', models || 'No migrations found');

  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error); 