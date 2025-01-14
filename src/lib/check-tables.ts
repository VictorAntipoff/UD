import { supabase } from './supabase'

interface TableInfo {
  name: string;
  columns: string[];
  constraints: string[];
}

async function checkTables(): Promise<void> {
  try {
    console.log('Checking database tables...');

    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      throw error;
    }

    const tableInfo: TableInfo[] = [];

    for (const table of tables) {
      const { data: columns, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', table.table_name)
        .eq('table_schema', 'public');

      if (columnError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnError);
        continue;
      }

      const { data: constraints, error: constraintError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', table.table_name)
        .eq('table_schema', 'public');

      if (constraintError) {
        console.error(`Error fetching constraints for ${table.table_name}:`, constraintError);
        continue;
      }

      tableInfo.push({
        name: table.table_name,
        columns: columns.map(c => `${c.column_name} (${c.data_type})`),
        constraints: constraints.map(c => `${c.constraint_name} (${c.constraint_type})`)
      });
    }

    console.log('Database tables:', JSON.stringify(tableInfo, null, 2));

  } catch (error) {
    console.error('Table check failed:', error);
  }
}

checkTables().catch(console.error); 