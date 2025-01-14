import prisma from './prisma';

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('Database URL:', process.env.DATABASE_URL);

    // Test basic connection
    const result = await prisma.$queryRaw`SELECT version(), current_database()`;
    console.log('\nDatabase info:', result);

    // Check if we're using Supabase
    const hostInfo = await prisma.$queryRaw`
      SELECT inet_server_addr() as server_ip, 
             inet_server_port() as server_port,
             current_setting('server_version') as version
    `;
    console.log('\nHost info:', hostInfo);

    // List all schemas
    const schemas = await prisma.$queryRaw`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
    `;
    console.log('\nAvailable schemas:', schemas);

    // List all tables in public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('\nPublic schema tables:', tables);

    // Check Supabase extensions
    const extensions = await prisma.$queryRaw`
      SELECT extname, extversion 
      FROM pg_extension
      ORDER BY extname
    `;
    console.log('\nInstalled extensions:', extensions);

    console.log('\nConnection test completed successfully!');
    return true;

  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSupabaseConnection().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default testSupabaseConnection; 