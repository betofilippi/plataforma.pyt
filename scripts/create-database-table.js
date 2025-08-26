import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração da conexão
const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createDatabaseTable() {
  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'database', 'create-sample-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executando SQL para criar tabela no schema database...');
    
    // Executar o SQL
    await pool.query(sql);
    
    console.log('✅ Tabela database.database_connections criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM database.database_connections
    `);
    
    console.log(`📊 Registros na tabela: ${checkResult.rows[0].count}`);
    
    // Listar os registros inseridos
    const dataResult = await pool.query(`
      SELECT connection_name, database_type, environment, is_active 
      FROM database.database_connections
      ORDER BY created_at DESC
    `);
    
    console.log('\n📋 Conexões criadas:');
    dataResult.rows.forEach(row => {
      console.log(`  - ${row.connection_name} (${row.database_type}) - ${row.environment} - ${row.is_active ? 'Ativa' : 'Inativa'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.detail) {
      console.error('   Detalhes:', error.detail);
    }
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão fechada');
  }
}

// Executar
createDatabaseTable();