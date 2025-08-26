/**
 * Script para aplicar schema Realtime no Supabase
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function applyRealtimeSchema() {
  console.log('🚀 APLICANDO SCHEMA REALTIME');
  console.log('=====================================');
  
  try {
    // Conectar ao banco
    const client = await pool.connect();
    console.log('✅ Conectado ao Supabase PostgreSQL');

    // Ler o arquivo SQL
    const schemaPath = path.join(__dirname, '..', 'database', 'realtime-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Executando schema Realtime...');
    
    // Executar o schema
    await client.query(schemaSql);
    
    console.log('✅ Schema Realtime aplicado com sucesso!');
    
    // Verificar tabelas criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'plataforma_core' 
      AND table_name LIKE '%chat%' OR table_name LIKE '%presence%' OR table_name LIKE '%cursor%'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas Realtime criadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verificar funções criadas
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'plataforma_core' 
      AND (routine_name LIKE '%presence%' OR routine_name LIKE '%online%')
      ORDER BY routine_name
    `);
    
    console.log('\n⚙️ Funções Realtime criadas:');
    functionsResult.rows.forEach(row => {
      console.log(`   - ${row.routine_name}()`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro ao aplicar schema:', error.message);
    if (error.detail) {
      console.error('   Detalhes:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  applyRealtimeSchema()
    .then(() => {
      console.log('\n🎉 Schema Realtime aplicado com sucesso!');
      console.log('🔄 Agora você pode usar os recursos de chat e colaboração.');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na aplicação do schema:', error);
      process.exit(1);
    });
}

module.exports = { applyRealtimeSchema };