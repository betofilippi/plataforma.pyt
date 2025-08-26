import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupSupabaseAccess() {
  try {
    console.log('🔧 Setting up Supabase SDK access...');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'disable-rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute SQL
    await pool.query(sql);
    
    console.log('✅ RLS disabled for all tables');
    console.log('✅ Permissions granted to anon and authenticated roles');
    console.log('✅ Table list function created');
    
    // Test the function
    const result = await pool.query('SELECT * FROM public.get_table_list()');
    console.log(`📊 Found ${result.rows.length} tables in public schema`);
    
    console.log('\n✨ Supabase SDK is now ready to use!');
    console.log('You can now access all tables directly from the frontend.');
    
  } catch (error) {
    console.error('❌ Error setting up Supabase access:', error.message);
  } finally {
    await pool.end();
  }
}

setupSupabaseAccess();