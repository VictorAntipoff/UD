-- Check the constraint definition for wood_slicing_operations status
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'wood_slicing_operations'
  AND con.conname = 'wood_slicing_operations_status_check'; 