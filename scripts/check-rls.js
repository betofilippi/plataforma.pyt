import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkRLS() {
  try {
    // Check RLS status
    const result = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('RLS Status for tables:');
    console.log('======================');
    result.rows.forEach(row => {
      console.log(`${row.tablename}: RLS is ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

    // Check if anon role has permissions
    const perms = await pool.query(`
      SELECT 
        grantee,
        table_name,
        privilege_type
      FROM information_schema.table_privileges
      WHERE grantee IN ('anon', 'authenticated')
      AND table_schema = 'public'
      AND table_name IN ('users', 'profiles', 'spreadsheets')
      ORDER BY grantee, table_name, privilege_type
    `);
    
    console.log('\nPermissions for anon/authenticated roles:');
    console.log('==========================================');
    perms.rows.forEach(row => {
      console.log(`${row.grantee} - ${row.table_name}: ${row.privilege_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRLS();