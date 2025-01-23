const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'udesign_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: 5432,
  });

  try {
    await pool.query('BEGIN');

    // Drop existing tables if they exist
    await pool.query(`
      DROP TABLE IF EXISTS 
        notification_recipients,
        notifications,
        system_logs,
        price_calculations,
        supplier_prices,
        suppliers,
        drying_spot_checks,
        humidity_specifications,
        drying_batches,
        wood_slicing_jobs,
        sleepers,
        active_sessions,
        role_permissions,
        permissions,
        roles,
        approval_workflows,
        approval_requirements,
        users
      CASCADE;
    `);

    // Read and execute schema.sql
    const schemaSQL = await fs.readFile(
      path.join(__dirname, '../src/db/schema.sql'),
      'utf8'
    );
    await pool.query(schemaSQL);

    // Generate hashed password for admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Read and execute init.sql with replaced password
    let initSQL = await fs.readFile(
      path.join(__dirname, '../src/db/init.sql'),
      'utf8'
    );
    initSQL = initSQL.replace('$2b$10$YourHashedPasswordHere', hashedPassword);
    await pool.query(initSQL);

    await pool.query('COMMIT');
    console.log('Database setup completed successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase(); 