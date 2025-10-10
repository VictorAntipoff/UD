import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Client with anonymous access
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Client with service role access (for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
