-- Enable RLS on the table
ALTER TABLE "public"."wood_receipt_items" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."wood_receipt_items";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "public"."wood_receipt_items";
DROP POLICY IF EXISTS "Enable update for authenticated users" ON "public"."wood_receipt_items";
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON "public"."wood_receipt_items";

-- Create INSERT policy
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."wood_receipt_items"
FOR INSERT TO authenticated
WITH CHECK (true);

-- Create SELECT policy
CREATE POLICY "Enable read access for authenticated users" 
ON "public"."wood_receipt_items"
FOR SELECT TO authenticated
USING (true);

-- Create UPDATE policy
CREATE POLICY "Enable update for authenticated users" 
ON "public"."wood_receipt_items"
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Create DELETE policy
CREATE POLICY "Enable delete for authenticated users" 
ON "public"."wood_receipt_items"
FOR DELETE TO authenticated
USING (true);

-- Grant all privileges to authenticated users
GRANT ALL ON "public"."wood_receipt_items" TO authenticated; 