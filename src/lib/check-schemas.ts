import { supabase } from './supabase';

interface SchemaInfo {
  schema: string;
  owner: string;
  tables: string[];
}

async function checkSchemas(): Promise<void> {
  try {
    console.log('Checking database schemas...');

    const { data: schemas, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name, schema_owner');

    if (error) {
      throw error;
    }

    const schemaInfo: SchemaInfo[] = [];

    for (const schema of schemas) {
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', schema.schema_name);

      if (tableError) {
        console.error(`Error fetching tables for schema ${schema.schema_name}:`, tableError);
        continue;
      }

      schemaInfo.push({
        schema: schema.schema_name,
        owner: schema.schema_owner,
        tables: tables.map(t => t.table_name)
      });
    }

    console.log('Database schemas:', JSON.stringify(schemaInfo, null, 2));

  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkSchemas().catch(console.error);