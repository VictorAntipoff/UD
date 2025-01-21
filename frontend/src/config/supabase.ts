import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

console.log('Supabase URL:', supabaseUrl);
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const testSupabaseConnection = async () => {
  try {
    // First check auth status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth error:', authError);
      return false;
    }
    
    if (!session) {
      console.log('No active Supabase session');
      return false;
    }

    // Then try to access wood_types with auth headers
    const { data, error: dbError } = await supabase
      .from('wood_types')
      .select('*')
      .limit(1)
      .throwOnError();

    if (dbError) {
      console.error('Database error:', dbError);
      return false;
    }

    console.log('Supabase connection successful, wood_types:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
}; 