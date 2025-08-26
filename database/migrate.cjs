#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ===== SCRIPT DE MIGRAÇÃO DO BANCO =====

async function runMigration() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'planilha_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('🚀 Iniciando migração do banco...');
    
    // Ler o arquivo schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Executar o schema
    console.log('📄 Executando schema.sql...');
    await pool.query(schema);
    
    console.log('✅ Migração concluída com sucesso!');
    
    // Testar a conexão
    console.log('🔍 Testando conexão...');
    const result = await pool.query('SELECT COUNT(*) FROM worksheets');
    console.log(`📊 Tabela worksheets criada: ${result.rows[0].count} registros`);
    
    // Criar worksheet de exemplo
    console.log('📝 Criando worksheet de exemplo...');
    const worksheetResult = await pool.query(`
      INSERT INTO worksheets (name, description, settings)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      'Planilha de Exemplo',
      'Planilha criada automaticamente durante a migração',
      JSON.stringify({ autoSave: true, rowCount: 1000, columnCount: 10 })
    ]);
    
    const worksheetId = worksheetResult.rows[0].id;
    console.log(`📋 Worksheet criado com ID: ${worksheetId}`);
    
    // Inserir dados de exemplo
    console.log('💾 Inserindo dados de exemplo...');
    const sampleData = [
      { row: 1, col: 'A', value: 'Nome', data_type: 'text' },
      { row: 1, col: 'B', value: 'Idade', data_type: 'text' },
      { row: 1, col: 'C', value: 'Email', data_type: 'text' },
      { row: 1, col: 'D', value: 'Salário', data_type: 'text' },
      { row: 2, col: 'A', value: 'João Silva', data_type: 'text' },
      { row: 2, col: 'B', value: '28', data_type: 'number' },
      { row: 2, col: 'C', value: 'joao@empresa.com', data_type: 'text' },
      { row: 2, col: 'D', value: '5500', data_type: 'currency' },
      { row: 3, col: 'A', value: 'Maria Santos', data_type: 'text' },
      { row: 3, col: 'B', value: '32', data_type: 'number' },
      { row: 3, col: 'C', value: 'maria@empresa.com', data_type: 'text' },
      { row: 3, col: 'D', value: '6200', data_type: 'currency' }
    ];
    
    for (const cell of sampleData) {
      await pool.query(`
        INSERT INTO cells (worksheet_id, row_num, col_name, value, data_type, display_value)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        worksheetId, 
        cell.row, 
        cell.col, 
        cell.value, 
        cell.data_type,
        cell.value // display_value igual ao value por enquanto
      ]);
    }
    
    console.log(`✨ ${sampleData.length} células de exemplo inseridas`);
    
    // Configurações de coluna
    console.log('⚙️ Criando configurações de coluna...');
    const columnConfigs = [
      { col: 'A', name: 'Nome', data_type: 'text', width: 150 },
      { col: 'B', name: 'Idade', data_type: 'number', width: 80 },
      { col: 'C', name: 'Email', data_type: 'text', width: 200 },
      { col: 'D', name: 'Salário', data_type: 'currency', width: 120 }
    ];
    
    for (const config of columnConfigs) {
      await pool.query(`
        INSERT INTO column_configs (worksheet_id, col_name, name, data_type, width)
        VALUES ($1, $2, $3, $4, $5)
      `, [worksheetId, config.col, config.name, config.data_type, config.width]);
    }
    
    console.log(`🎛️ ${columnConfigs.length} configurações de coluna criadas`);
    
    // Verificar estatísticas
    const stats = await pool.query(`
      SELECT * FROM worksheet_stats WHERE id = $1
    `, [worksheetId]);
    
    if (stats.rows.length > 0) {
      const stat = stats.rows[0];
      console.log(`📈 Estatísticas do worksheet:`);
      console.log(`   - Total de células: ${stat.total_cells}`);
      console.log(`   - Total de linhas: ${stat.total_rows}`);
      console.log(`   - Total de colunas: ${stat.total_columns}`);
    }
    
    console.log('🎉 Migração completa!');
    console.log('');
    console.log('🔗 Para conectar sua aplicação:');
    console.log(`   - Worksheet ID: ${worksheetId}`);
    console.log(`   - Database: ${dbConfig.database}`);
    console.log(`   - Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Configure as variáveis de ambiente (.env)');
    console.log('   2. Inicie o Redis (opcional, para cache)');
    console.log('   3. Reinicie sua aplicação');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Verificar se o PostgreSQL está rodando
async function checkDatabase() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // conectar ao database padrão primeiro
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('🔍 Verificando PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL está rodando');
    
    // Verificar/criar database
    const dbName = process.env.DB_NAME || 'planilha_app';
    try {
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log(`📄 Database '${dbName}' criado`);
    } catch (error) {
      if (error.code === '42P04') {
        console.log(`📄 Database '${dbName}' já existe`);
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar PostgreSQL:', error.message);
    console.log('');
    console.log('💡 Certifique-se de que:');
    console.log('   1. PostgreSQL está instalado e rodando');
    console.log('   2. As credenciais estão corretas');
    console.log('   3. O usuário tem permissões para criar databases');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar migração
async function main() {
  console.log('🗄️ MIGRAÇÃO DO BANCO PLANILHA.APP');
  console.log('=====================================');
  
  await checkDatabase();
  await runMigration();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigration, checkDatabase };
