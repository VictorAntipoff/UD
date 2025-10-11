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

-- First, ensure the wood_receipts module exists
INSERT INTO modules (id, name, description)
VALUES (
    '0fa85621-e6da-4f59-a9b0-baba2167323f',
    'wood_receipts',
    'Wood Receipts Management Module'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Then, grant permissions to the admin user
INSERT INTO user_module_permissions (id, user_id, module_id, has_access)
VALUES (
    gen_random_uuid(),
    'aef0267f-e093-4340-90fa-0a799861f3b3',  -- Your admin user ID
    '0fa85621-e6da-4f59-a9b0-baba2167323f',  -- wood_receipts module ID
    true
)
ON CONFLICT (user_id, module_id) DO UPDATE
SET has_access = true;

-- Verify the permissions
SELECT ump.*, m.name as module_name
FROM user_module_permissions ump
JOIN modules m ON m.id = ump.module_id
WHERE ump.user_id = 'aef0267f-e093-4340-90fa-0a799861f3b3'; 