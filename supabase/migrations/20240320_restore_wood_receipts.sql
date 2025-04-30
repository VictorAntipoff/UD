-- First, get some wood type IDs to reference
WITH wood_type_ids AS (
  SELECT id FROM wood_types LIMIT 3
)
-- Insert wood receipts with correct schema
INSERT INTO wood_receipts (
  id,
  wood_type_id,
  supplier,
  receipt_date,
  total_amount,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  (SELECT id FROM wood_type_ids OFFSET floor(random() * 3) LIMIT 1),
  supplier,
  current_date - (random() * 30)::integer,
  (random() * 10000 + 1000)::numeric(10,2),
  current_timestamp,
  current_timestamp
FROM (
  VALUES 
    ('Supplier A'),
    ('Supplier B'),
    ('Supplier C'),
    ('Supplier D'),
    ('Supplier E')
) AS t(supplier)
ON CONFLICT (id) DO NOTHING;

-- Insert wood receipt items for each receipt
INSERT INTO wood_receipt_items (
  id,
  receipt_id,
  wood_type_id,
  quantity,
  unit_price,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  r.id,
  r.wood_type_id,
  (random() * 100 + 10)::numeric(10,2),
  (random() * 100 + 50)::numeric(10,2),
  r.created_at,
  r.created_at
FROM wood_receipts r
ON CONFLICT (id) DO NOTHING;

-- Create wood slicing operations with lot numbers for each receipt
INSERT INTO wood_slicing_operations (
  id,
  wood_type_id,
  lot_number,
  serial_number,
  status,
  start_time,
  end_time,
  plank_sizes,
  sleeper_sizes,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  r.wood_type_id,
  'LOT-' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY r.created_at) AS TEXT), 3, '0'),
  'SN-' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY r.created_at) AS TEXT), 5, '0'),
  'draft'::text,
  r.created_at,
  r.created_at + interval '2 days',
  jsonb_build_object(
    'length', 240,
    'width', 20,
    'thickness', 2.5,
    'unit', 'cm'
  ),
  jsonb_build_object(
    'length', 200,
    'width', 15,
    'thickness', 2.0,
    'unit', 'cm'
  ),
  r.created_at,
  r.created_at
FROM wood_receipts r
ON CONFLICT (id) DO NOTHING; 