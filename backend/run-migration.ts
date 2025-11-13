import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('🔄 Running asset location migration...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'add-asset-locations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and filter out comments and empty lines
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;

        // Log what was executed (first 80 chars)
        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`✅ ${preview}...`);
      } catch (error: any) {
        // If it's "already exists" error, that's fine
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          skipCount++;
          console.log(`⏭️  Skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`   Executed: ${successCount} statements`);
    console.log(`   Skipped: ${skipCount} statements (already existed)`);

    // Verify the tables were created
    console.log('\n🔍 Verifying tables...');

    const locationCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AssetLocation'
      );
    `;
    console.log(`   AssetLocation: ${locationCheck[0].exists ? '✅ Created' : '❌ Missing'}`);

    const transferCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AssetTransfer'
      );
    `;
    console.log(`   AssetTransfer: ${transferCheck[0].exists ? '✅ Created' : '❌ Missing'}`);

    const historyCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'AssetTransferHistory'
      );
    `;
    console.log(`   AssetTransferHistory: ${historyCheck[0].exists ? '✅ Created' : '❌ Missing'}`);

    // Check if locationId column was added
    const columnCheck: any = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'locationId'
      );
    `;
    console.log(`   Asset.locationId column: ${columnCheck[0].exists ? '✅ Added' : '❌ Missing'}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
