-- Insert wood types with correct schema
INSERT INTO wood_types (id, name, description, properties, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Oak', 'High-quality hardwood with excellent durability', 
   jsonb_build_object(
     'density', 0.75,
     'origin', 'Europe',
     'characteristics', jsonb_build_object(
       'durability', 'High',
       'workability', 'Moderate',
       'color', 'Light brown to dark brown'
     )
   ), current_timestamp, current_timestamp),
  (gen_random_uuid(), 'Pine', 'Softwood commonly used in construction', 
   jsonb_build_object(
     'density', 0.55,
     'origin', 'North America',
     'characteristics', jsonb_build_object(
       'durability', 'Medium',
       'workability', 'Easy',
       'color', 'Pale yellow to reddish-brown'
     )
   ), current_timestamp, current_timestamp),
  (gen_random_uuid(), 'Teak', 'Premium hardwood with natural weather resistance', 
   jsonb_build_object(
     'density', 0.65,
     'origin', 'Southeast Asia',
     'characteristics', jsonb_build_object(
       'durability', 'High',
       'workability', 'Moderate',
       'color', 'Golden brown'
     )
   ), current_timestamp, current_timestamp),
  (gen_random_uuid(), 'Mahogany', 'Premium hardwood with rich color', 
   jsonb_build_object(
     'density', 0.60,
     'origin', 'South America',
     'characteristics', jsonb_build_object(
       'durability', 'High',
       'workability', 'Easy',
       'color', 'Reddish-brown'
     )
   ), current_timestamp, current_timestamp),
  (gen_random_uuid(), 'Walnut', 'Premium dark hardwood', 
   jsonb_build_object(
     'density', 0.65,
     'origin', 'North America',
     'characteristics', jsonb_build_object(
       'durability', 'High',
       'workability', 'Moderate',
       'color', 'Dark brown'
     )
   ), current_timestamp, current_timestamp)
ON CONFLICT (id) DO NOTHING; 