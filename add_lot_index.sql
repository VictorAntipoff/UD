-- Add index for lotNumber to improve traceability queries
CREATE INDEX IF NOT EXISTS "WoodReceipt_lotNumber_idx" ON "public"."WoodReceipt"("lotNumber");
