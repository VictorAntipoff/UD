import { supabase } from './supabase'

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic query using raw SQL
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .single();

    if (error) {
      console.log('Users table not found, checking schema...');
      
      // Check available tables
      const { data: tables, error: tablesError } = await supabase
        .from('pg_tables')
        .select('schemaname, tablename')
        .eq('schemaname', 'public');

      if (tablesError) {
        throw tablesError;
      }

      console.log('Available tables in public schema:', tables);
    } else {
      console.log('Users table exists with count:', data.count);
    }

    console.log('Connection successful!');

  } catch (error) {
    console.error('Connection test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
  } finally {
    // Close connection
    await supabase.auth.signOut();
  }
}

// Run test
console.log('Starting Supabase connection test...');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Key type:', process.env.SUPABASE_KEY?.startsWith('eyJ') ? 'JWT Token' : 'Invalid');

testConnection().catch(console.error); 