import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    // Query the database to see what columns exist in Asset table
    const result: any = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Asset'
      ORDER BY ordinal_position;
    `;

    console.log('\n📋 Current Asset table columns:\n');
    result.forEach((col: any) => {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

    // Check if AssetLocation table exists
    const locationCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AssetLocation'
      );
    `;

    console.log(`AssetLocation table exists: ${locationCheck[0].exists}\n`);

    // Check if AssetTransfer table exists
    const transferCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AssetTransfer'
      );
    `;

    console.log(`AssetTransfer table exists: ${transferCheck[0].exists}\n`);

  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
