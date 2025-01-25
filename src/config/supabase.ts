import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const checkHealth = async () => {
  const healthCheck = await supabase
    .from('health')
    .select('*')
    .single();

  if (healthCheck.error) throw healthCheck.error;
  return healthCheck.data;
};

export const signIn = async (email: string, password: string) => {
  const authCheck = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authCheck.error) throw authCheck.error;
  return authCheck.data;
}; 