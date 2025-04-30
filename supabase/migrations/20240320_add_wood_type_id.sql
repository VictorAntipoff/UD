-- Check if the column exists first
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'wood_receipts' 
        AND column_name = 'wood_type_id'
    ) THEN
        -- Add wood_type_id column to wood_receipts table if it doesn't exist
        ALTER TABLE wood_receipts
        ADD COLUMN wood_type_id UUID REFERENCES wood_types(id);

        -- Update existing records with a default wood type if needed
        -- You may want to adjust this based on your data
        UPDATE wood_receipts
        SET wood_type_id = (
            SELECT id 
            FROM wood_types 
            LIMIT 1
        )
        WHERE wood_type_id IS NULL;

        -- Make wood_type_id NOT NULL for new entries
        ALTER TABLE wood_receipts
        ALTER COLUMN wood_type_id SET NOT NULL;

        -- Add an index for better query performance
        CREATE INDEX idx_wood_receipts_wood_type_id 
        ON wood_receipts(wood_type_id);
    END IF;
END $$; 