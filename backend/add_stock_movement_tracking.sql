-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('RECEIPT_SYNC', 'TRANSFER_OUT', 'TRANSFER_IN', 'DRYING_START', 'DRYING_END', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('RECEIPT', 'TRANSFER', 'DRYING_PROCESS', 'STOCK_ADJUSTMENT');

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseId" TEXT NOT NULL,
    "woodTypeId" TEXT NOT NULL,
    "thickness" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "fromStatus" "WoodStatus",
    "toStatus" "WoodStatus",
    "referenceType" "ReferenceType" NOT NULL,
    "referenceId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "details" TEXT,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_warehouseId_woodTypeId_thickness_idx" ON "stock_movements"("warehouseId", "woodTypeId", "thickness");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_referenceId_idx" ON "stock_movements"("referenceId");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_woodTypeId_fkey" FOREIGN KEY ("woodTypeId") REFERENCES "WoodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

