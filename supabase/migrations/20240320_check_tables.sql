-- Get all tables and their columns
SELECT 
    t.table_name,
    array_agg(
        c.column_name || ' ' || 
        c.data_type || 
        CASE 
            WHEN c.character_maximum_length IS NOT NULL 
            THEN '(' || c.character_maximum_length || ')'
            ELSE ''
        END || 
        CASE 
            WHEN c.is_nullable = 'NO' THEN ' NOT NULL'
            ELSE ''
        END
    ) as columns
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
GROUP BY 
    t.table_name
ORDER BY 
    t.table_name; 