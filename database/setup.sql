-- Create helper function to list tables
CREATE OR REPLACE FUNCTION get_tables(schema_name text)
RETURNS TABLE (table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = schema_name
  AND t.table_type = 'BASE TABLE';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_tables(text) TO postgres;
GRANT EXECUTE ON FUNCTION get_tables(text) TO anon;
GRANT EXECUTE ON FUNCTION get_tables(text) TO authenticated; 