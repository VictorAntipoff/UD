-- CreateTable
CREATE TABLE "TransferItem" (
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

-- Migrate existing Transfer data to TransferItem
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

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "woodTypeId",
DROP COLUMN "thickness",
DROP COLUMN "quantity",
DROP COLUMN "woodStatus",
DROP COLUMN "reference";

-- CreateIndex
CREATE INDEX "TransferItem_transferId_idx" ON "TransferItem"("transferId");

-- CreateIndex
CREATE INDEX "TransferItem_woodTypeId_idx" ON "TransferItem"("woodTypeId");

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_woodTypeId_fkey" FOREIGN KEY ("woodTypeId") REFERENCES "WoodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
