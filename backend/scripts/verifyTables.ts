import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function verifyTables() {
  try {
    console.log('Checking tables...');
    
    const result = await prisma.$queryRawUnsafe(
      'SELECT tablename FROM pg_tables WHERE schemaname = $1',
      'public'
    );
    
    console.log('Available tables:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTables(); 