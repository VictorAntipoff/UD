-- Add performance indexes to WoodReceipt table
CREATE INDEX IF NOT EXISTS "WoodReceipt_status_idx" ON "public"."WoodReceipt"("status");
CREATE INDEX IF NOT EXISTS "WoodReceipt_woodTypeId_idx" ON "public"."WoodReceipt"("woodTypeId");
CREATE INDEX IF NOT EXISTS "WoodReceipt_createdAt_idx" ON "public"."WoodReceipt"("createdAt");
