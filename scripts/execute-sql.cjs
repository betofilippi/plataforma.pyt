const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function executeSQLFile(filePath) {
  try {
    // Ler o arquivo SQL
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log('🚀 Executando script SQL...');
    
    // Executar o SQL
    await pool.query(sql);
    
    console.log('✅ Script executado com sucesso!');
    
    // Verificar tabelas criadas
    const result = await pool.query(`
      SELECT 
        schemaname as schema,
        tablename as table_name,
        (SELECT COUNT(*) FROM pg_constraint 
         WHERE conrelid = (schemaname||'.'||tablename)::regclass 
         AND contype = 'f') as foreign_keys
      FROM pg_tables 
      WHERE schemaname IN ('public', 'plataforma_core', 'produtos_app', 'estoques_app')
      ORDER BY schemaname, tablename
    `);
    
    console.log('\n📊 Tabelas no banco:');
    console.log('Schema | Tabela | FKs');
    console.log('-------|--------|-----');
    result.rows.forEach(row => {
      console.log(`${row.schema} | ${row.table_name} | ${row.foreign_keys || 0}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar o script
const sqlFile = path.join(__dirname, '..', 'database', 'test-relationships.sql');
executeSQLFile(sqlFile);