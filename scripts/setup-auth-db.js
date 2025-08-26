#!/usr/bin/env node

/**
 * Setup Authentication Database Schema
 * This script initializes the authentication tables and data
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function setupAuthSchema() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Read the auth schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'auth-schema.sql');
    const authSchema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing auth schema...');
    await pool.query(authSchema);
    
    console.log('✅ Auth schema setup completed!');
    
    // Verify the setup by checking if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'plataforma_core' 
      AND table_name IN ('users', 'refresh_tokens', 'login_attempts', 'password_reset_tokens', 'user_sessions')
      ORDER BY table_name
    `);
    
    console.log(`✅ Created ${tables.rows.length} authentication tables:`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check if admin user exists
    const adminCheck = await pool.query(`
      SELECT email, name, role 
      FROM plataforma_core.users 
      WHERE email = 'admin@plataforma.app'
    `);
    
    if (adminCheck.rows.length > 0) {
      console.log('👤 Admin user found:', adminCheck.rows[0]);
    } else {
      console.log('⚠️  No admin user found. First login will create one.');
    }
    
  } catch (error) {
    console.error('❌ Error setting up auth schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed');
  }
}

// Check if multi-schema exists first
async function setupMultiSchema() {
  try {
    console.log('🔗 Setting up multi-schema first...');
    
    const multiSchemaPath = path.join(__dirname, '..', 'database', 'multi-schema.sql');
    const multiSchema = fs.readFileSync(multiSchemaPath, 'utf8');
    
    await pool.query(multiSchema);
    console.log('✅ Multi-schema setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up multi-schema:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting database setup for plataforma.app authentication...\n');
  
  try {
    // First ensure we have the core schema
    await setupMultiSchema();
    
    // Then setup auth-specific tables
    await setupAuthSchema();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy .env.example to .env and configure your JWT secrets');
    console.log('2. Start the server: npm run dev');
    console.log('3. Visit http://localhost:5173/login to test authentication');
    console.log('4. Use admin@plataforma.app with any password for first login');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// ES module check for running as main - simplified
main();

export { setupAuthSchema, setupMultiSchema };