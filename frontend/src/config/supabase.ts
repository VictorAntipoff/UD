import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase client...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'wood-slicer-app' },
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Add better timeout and retry settings
  settings: {
    networkRetries: 3,
    persistSession: true,
    autoRefreshToken: true,
    timeout: 20000, // 20 seconds timeout
  }
});

// Add this error handler
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Handle sign out
    console.log('User signed out');
  } else if (event === 'SIGNED_IN') {
    // Handle sign in
    console.log('User signed in');
  }
});

// Add connection status check
let isConnected = false;

export const checkConnection = async (): Promise<boolean> => {
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('wood_types')
      .select('count', { count: 'exact', head: true })
      .timeout(5000); // 5 second timeout for health check

    const elapsed = Date.now() - start;
    console.log(`Connection check took ${elapsed}ms`);

    if (error) {
      console.error('Connection check failed:', error);
      isConnected = false;
      return false;
    }

    isConnected = true;
    return true;
  } catch (error) {
    console.error('Connection check failed:', error);
    isConnected = false;
    return false;
  }
};

// Export connection status
export const getConnectionStatus = () => isConnected;

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