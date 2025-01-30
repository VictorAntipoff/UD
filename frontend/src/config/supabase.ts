import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL:', supabaseUrl);
  console.error('Supabase Anon Key:', supabaseAnonKey ? '[REDACTED]' : 'missing');
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'wood-calculator'
    }
  }
});

// Add debug logging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, {
    userId: session?.user?.id,
    email: session?.user?.email
  });
});

// Test connection and auth
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing connection...');
    
    // First check auth status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return false;
    }

    if (!session?.user) {
      console.error('No valid session');
      return false;
    }

    console.log('Session found:', session.user.id);

    // Try a basic health check query
    const { data, error: healthError } = await supabase
      .from('wood_types')
      .select('count', { count: 'exact', head: true });

    if (healthError) {
      console.error('Health check failed:', healthError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

export const checkTableExists = async (tableName: string) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true });
    
    return !error;
  } catch (error) {
    console.error(`Failed to check table ${tableName}:`, error);
    return false;
  }
};