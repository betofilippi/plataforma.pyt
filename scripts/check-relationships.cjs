const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkRelationships() {
  try {
    // Query para buscar todas as foreign keys
    const result = await pool.query(`
      SELECT 
        tc.table_schema AS from_schema,
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_schema AS to_schema,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema IN ('public', 'plataforma_core', 'produtos_app', 'estoques_app')
      ORDER BY tc.table_schema, tc.table_name;
    `);
    
    console.log('🔗 Foreign Keys encontradas:\n');
    console.log('From Schema | From Table | From Column | To Schema | To Table | To Column');
    console.log('------------|------------|-------------|-----------|----------|----------');
    
    result.rows.forEach(row => {
      console.log(`${row.from_schema} | ${row.from_table} | ${row.from_column} | ${row.to_schema} | ${row.to_table} | ${row.to_column}`);
    });
    
    console.log(`\n✅ Total de relacionamentos: ${result.rows.length}`);
    
    // Agrupar por schema
    const bySchema = {};
    result.rows.forEach(row => {
      if (!bySchema[row.from_schema]) {
        bySchema[row.from_schema] = 0;
      }
      bySchema[row.from_schema]++;
    });
    
    console.log('\n📊 Relacionamentos por schema:');
    Object.entries(bySchema).forEach(([schema, count]) => {
      console.log(`  ${schema}: ${count} FKs`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkRelationships();