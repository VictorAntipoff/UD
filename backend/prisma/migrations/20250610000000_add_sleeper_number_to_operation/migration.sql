-- AlterTable
ALTER TABLE "Operation" ADD COLUMN "sleeperNumber" INTEGER;

-- CreateIndex
CREATE INDEX "Operation_sleeperNumber_idx" ON "Operation"("sleeperNumber");
