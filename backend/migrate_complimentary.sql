-- Add isComplimentary column to SleeperMeasurement table
ALTER TABLE "SleeperMeasurement" ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false;

-- Create index for filtering paid vs complimentary
CREATE INDEX IF NOT EXISTS "SleeperMeasurement_isComplimentary_idx" ON "SleeperMeasurement"("isComplimentary");
