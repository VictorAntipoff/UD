import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTables() {
  try {
    console.log('🔄 Creating asset location tables...\n');

    // 1. Create AssetLocation table
    console.log('Creating AssetLocation table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AssetLocation" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name" TEXT NOT NULL UNIQUE,
        "code" TEXT NOT NULL UNIQUE,
        "type" TEXT NOT NULL,
        "address" TEXT,
        "description" TEXT,
        "contactPerson" TEXT,
        "contactPhone" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ AssetLocation table created\n');

    // Create indexes for AssetLocation
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetLocation_name_idx" ON "AssetLocation"("name")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetLocation_code_idx" ON "AssetLocation"("code")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetLocation_type_idx" ON "AssetLocation"("type")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetLocation_isActive_idx" ON "AssetLocation"("isActive")`;

    // 2. Create AssetTransfer table
    console.log('Creating AssetTransfer table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AssetTransfer" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "transferNumber" TEXT NOT NULL UNIQUE,
        "assetId" TEXT NOT NULL,
        "fromLocationId" TEXT NOT NULL,
        "toLocationId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expectedArrival" TIMESTAMP(3),
        "actualArrival" TIMESTAMP(3),
        "reason" TEXT,
        "notes" TEXT,
        "requestedById" TEXT NOT NULL,
        "requestedByName" TEXT NOT NULL,
        "approvedById" TEXT,
        "approvedByName" TEXT,
        "approvedAt" TIMESTAMP(3),
        "completedById" TEXT,
        "completedByName" TEXT,
        "completedAt" TIMESTAMP(3),
        "conditionBefore" TEXT,
        "conditionAfter" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AssetTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "AssetLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "AssetTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "AssetLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `;
    console.log('✅ AssetTransfer table created\n');

    // Create indexes for AssetTransfer
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_assetId_idx" ON "AssetTransfer"("assetId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_fromLocationId_idx" ON "AssetTransfer"("fromLocationId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_toLocationId_idx" ON "AssetTransfer"("toLocationId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_status_idx" ON "AssetTransfer"("status")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_transferDate_idx" ON "AssetTransfer"("transferDate")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransfer_transferNumber_idx" ON "AssetTransfer"("transferNumber")`;

    // 3. Create AssetTransferHistory table
    console.log('Creating AssetTransferHistory table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "AssetTransferHistory" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "transferId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "performedById" TEXT NOT NULL,
        "performedByName" TEXT NOT NULL,
        "notes" TEXT,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AssetTransferHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "AssetTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;
    console.log('✅ AssetTransferHistory table created\n');

    // Create indexes for AssetTransferHistory
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransferHistory_transferId_idx" ON "AssetTransferHistory"("transferId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "AssetTransferHistory_timestamp_idx" ON "AssetTransferHistory"("timestamp")`;

    // 4. Add locationId column to Asset table
    console.log('Adding locationId column to Asset table...');
    await prisma.$executeRaw`ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "locationId" TEXT`;
    console.log('✅ locationId column added\n');

    // Create index for locationId
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Asset_locationId_idx" ON "Asset"("locationId")`;

    // Add foreign key constraint
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Asset" ADD CONSTRAINT "Asset_locationId_fkey"
        FOREIGN KEY ("locationId") REFERENCES "AssetLocation"("id")
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

    console.log('✅ All tables created successfully!\n');

    // Verify
    console.log('🔍 Verifying tables...');
    const locationCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AssetLocation')`;
    const transferCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AssetTransfer')`;
    const historyCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AssetTransferHistory')`;
    const columnCheck: any = await prisma.$queryRaw`SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'Asset' AND column_name = 'locationId')`;

    console.log(`   AssetLocation: ${locationCheck[0].exists ? '✅' : '❌'}`);
    console.log(`   AssetTransfer: ${transferCheck[0].exists ? '✅' : '❌'}`);
    console.log(`   AssetTransferHistory: ${historyCheck[0].exists ? '✅' : '❌'}`);
    console.log(`   Asset.locationId: ${columnCheck[0].exists ? '✅' : '❌'}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTables();
