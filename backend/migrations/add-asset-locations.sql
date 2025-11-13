-- Migration: Add Asset Locations and Transfers
-- This script creates new tables WITHOUT modifying existing data

-- 1. Create AssetLocation table
CREATE TABLE IF NOT EXISTS "AssetLocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "code" TEXT NOT NULL UNIQUE,
  "type" TEXT NOT NULL,
  "address" TEXT,
  "description" TEXT,
  "contactPerson" TEXT,
  "contactPhone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for AssetLocation
CREATE INDEX IF NOT EXISTS "AssetLocation_name_idx" ON "AssetLocation"("name");
CREATE INDEX IF NOT EXISTS "AssetLocation_code_idx" ON "AssetLocation"("code");
CREATE INDEX IF NOT EXISTS "AssetLocation_type_idx" ON "AssetLocation"("type");
CREATE INDEX IF NOT EXISTS "AssetLocation_isActive_idx" ON "AssetLocation"("isActive");

-- 2. Create AssetTransfer table
CREATE TABLE IF NOT EXISTS "AssetTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetTransfer_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssetTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "AssetLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AssetTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "AssetLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create indexes for AssetTransfer
CREATE INDEX IF NOT EXISTS "AssetTransfer_assetId_idx" ON "AssetTransfer"("assetId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_fromLocationId_idx" ON "AssetTransfer"("fromLocationId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_toLocationId_idx" ON "AssetTransfer"("toLocationId");
CREATE INDEX IF NOT EXISTS "AssetTransfer_status_idx" ON "AssetTransfer"("status");
CREATE INDEX IF NOT EXISTS "AssetTransfer_transferDate_idx" ON "AssetTransfer"("transferDate");
CREATE INDEX IF NOT EXISTS "AssetTransfer_transferNumber_idx" ON "AssetTransfer"("transferNumber");

-- 3. Create AssetTransferHistory table
CREATE TABLE IF NOT EXISTS "AssetTransferHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transferId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "performedById" TEXT NOT NULL,
  "performedByName" TEXT NOT NULL,
  "notes" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetTransferHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "AssetTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for AssetTransferHistory
CREATE INDEX IF NOT EXISTS "AssetTransferHistory_transferId_idx" ON "AssetTransferHistory"("transferId");
CREATE INDEX IF NOT EXISTS "AssetTransferHistory_timestamp_idx" ON "AssetTransferHistory"("timestamp");

-- 4. Add locationId column to Asset table (nullable, so existing data is safe)
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "locationId" TEXT;

-- Create index for locationId
CREATE INDEX IF NOT EXISTS "Asset_locationId_idx" ON "Asset"("locationId");

-- Add foreign key constraint for locationId (if column was just created)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Asset_locationId_fkey'
  ) THEN
    ALTER TABLE "Asset" ADD CONSTRAINT "Asset_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "AssetLocation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Migration completed successfully
