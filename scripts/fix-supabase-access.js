import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixSupabaseAccess() {
  try {
    console.log('🔧 Fixing Supabase access...\n');
    
    // Get all tables
    const tables = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    console.log(`Found ${tables.rows.length} tables in public schema`);
    
    // Disable RLS on all tables
    for (const table of tables.rows) {
      const tableName = table.tablename;
      try {
        await pool.query(`ALTER TABLE public.${tableName} DISABLE ROW LEVEL SECURITY`);
        console.log(`✅ Disabled RLS on ${tableName}`);
      } catch (err) {
        console.log(`⚠️ Could not disable RLS on ${tableName}: ${err.message}`);
      }
    }
    
    // Grant permissions to anon and authenticated
    console.log('\n📝 Granting permissions to anon and authenticated roles...');
    
    await pool.query(`
      GRANT USAGE ON SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
    `);
    
    console.log('✅ Permissions granted!');
    
    // Create or replace the table list function
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.get_table_list()
      RETURNS TABLE(
        tablename text,
        schemaname text,
        n_live_tup bigint
      ) 
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT 
          t.table_name::text as tablename,
          t.table_schema::text as schemaname,
          COALESCE(s.n_live_tup, 0) as n_live_tup
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema 
          AND s.relname = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name;
      $$;
      
      GRANT EXECUTE ON FUNCTION public.get_table_list() TO anon, authenticated;
    `);
    
    console.log('✅ Table list function created!');
    
    // Test the function
    const result = await pool.query('SELECT * FROM public.get_table_list()');
    console.log(`\n📊 Available tables:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename} (${row.n_live_tup} rows)`);
    });
    
    console.log('\n✨ Supabase SDK access fixed! You can now use it from the frontend.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixSupabaseAccess();