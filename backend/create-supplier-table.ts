import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSupplierTable() {
  try {
    console.log('🔄 Creating Supplier table...\n');

    // Create Supplier table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Supplier" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL UNIQUE,
        "code" TEXT UNIQUE,
        "contactPerson" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "website" TEXT,
        "notes" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Supplier table created\n');

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Supplier_name_idx" ON "Supplier"("name")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Supplier_isActive_idx" ON "Supplier"("isActive")`;
    console.log('✅ Indexes created\n');

    // Add supplierId column to Asset table
    console.log('Adding supplierId column to Asset table...');
    await prisma.$executeRaw`ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "supplierId" TEXT`;
    console.log('✅ supplierId column added\n');

    // Create index for supplierId
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Asset_supplierId_idx" ON "Asset"("supplierId")`;

    // Add foreign key constraint
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Asset" ADD CONSTRAINT "Asset_supplierId_fkey"
        FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id")
        ON DELETE SET NULL ON UPDATE CASCADE
      `;
      console.log('✅ Foreign key constraint added\n');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⏭️  Foreign key already exists\n');
      } else {
        throw error;
      }
    }

    console.log('✅ Supplier table setup completed!\n');

    // Verify
    console.log('🔍 Verifying...');
    const tableCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Supplier')`;
    const columnCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Asset' AND column_name = 'supplierId')`;

    console.log(`   Supplier table: ${tableCheck[0].exists ? '✅' : '❌'}`);
    console.log(`   Asset.supplierId: ${columnCheck[0].exists ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSupplierTable();
