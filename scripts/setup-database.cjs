#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Configuração do banco
  const pool = new Pool({
    connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 Configurando banco de dados...');
    
    // Executar schema do plataforma core
    console.log('📊 Executando plataforma-core-schema.sql...');
    const coreSchemaPath = path.join(__dirname, '..', 'database', 'plataforma-core-schema.sql');
    const coreSchema = fs.readFileSync(coreSchemaPath, 'utf8');
    await pool.query(coreSchema);
    
    console.log('✅ Schema do plataforma core criado!');
    
    // Verificar se as tabelas foram criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'plataforma_core'
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas criadas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Verificar usuários
    const usersResult = await pool.query('SELECT email, name, role FROM plataforma_core.users');
    console.log('\n👥 Usuários no sistema:');
    usersResult.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.name}) - ${user.role}`);
    });
    
    // Verificar módulos
    const modulesResult = await pool.query('SELECT name, display_name, status FROM plataforma_core.modules');
    console.log('\n🧩 Módulos registrados:');
    modulesResult.rows.forEach(module => {
      console.log(`   - ${module.name} (${module.display_name}) - ${module.status}`);
    });
    
    console.log('\n🎉 Banco de dados configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };