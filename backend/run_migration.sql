-- CreateTable
CREATE TABLE IF NOT EXISTS "TransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "woodTypeId" TEXT NOT NULL,
    "thickness" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "woodStatus" "WoodStatus" NOT NULL DEFAULT 'NOT_DRIED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

-- Migrate existing Transfer data to TransferItem (only if Transfer table has old columns)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Transfer' AND column_name = 'woodTypeId'
    ) THEN
        INSERT INTO "TransferItem" ("id", "transferId", "woodTypeId", "thickness", "quantity", "woodStatus", "remarks", "createdAt", "updatedAt")
        SELECT
            gen_random_uuid(),
            "id" as "transferId",
            "woodTypeId",
            "thickness",
            "quantity",
            "woodStatus",
            NULL as "remarks",
            "createdAt",
            "updatedAt"
        FROM "Transfer"
        WHERE "woodTypeId" IS NOT NULL;

        -- Drop old columns
        ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "woodTypeId";
        ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "thickness";
        ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "quantity";
        ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "woodStatus";
        ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "reference";
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransferItem_transferId_idx" ON "TransferItem"("transferId");
CREATE INDEX IF NOT EXISTS "TransferItem_woodTypeId_idx" ON "TransferItem"("woodTypeId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TransferItem_transferId_fkey'
    ) THEN
        ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" 
        FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TransferItem_woodTypeId_fkey'
    ) THEN
        ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_woodTypeId_fkey" 
        FOREIGN KEY ("woodTypeId") REFERENCES "WoodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
