import testSupabaseConnection from '../src/lib/supabase-test';

// ... rest of your setup code ...

// Add this before database initialization
console.log('\nVerifying Supabase connection...');
await testSupabaseConnection();

// ... continue with initialization ... 