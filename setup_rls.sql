-- Enable RLS on the table if not already enabled
ALTER TABLE wood_receipts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy and function if they exist
DROP POLICY IF EXISTS "Users can delete their own pending receipts" ON wood_receipts;
DROP FUNCTION IF EXISTS delete_wood_receipt;

-- Create function to handle wood receipt deletion
CREATE OR REPLACE FUNCTION delete_wood_receipt(receipt_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- This ensures the function runs with the privileges of the creator
AS $$
DECLARE
    has_permission boolean;
    receipt_status text;
BEGIN
    -- Check if user has permission
    SELECT EXISTS (
        SELECT 1
        FROM user_module_permissions
        WHERE user_id = auth.uid()
        AND module_id = (SELECT id FROM modules WHERE name = 'wood_receipts')
        AND has_access = true
    ) INTO has_permission;

    IF NOT has_permission THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    -- Get receipt status
    SELECT status INTO receipt_status
    FROM wood_receipts
    WHERE id = receipt_id;

    IF receipt_status IS NULL THEN
        RAISE EXCEPTION 'Receipt not found';
    END IF;

    IF receipt_status != 'PENDING' THEN
        RAISE EXCEPTION 'Only pending receipts can be deleted';
    END IF;

    -- Delete the receipt
    DELETE FROM wood_receipts WHERE id = receipt_id;
    
    RETURN FOUND;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION delete_wood_receipt TO authenticated;

-- Create a simple RLS policy that always returns false for direct deletion
CREATE POLICY "Prevent direct deletion" ON wood_receipts
    FOR DELETE
    USING (false); 