/**
 * Script para configurar o Sistema TEXT + Type Hints
 * 
 * Executa os scripts SQL necessários no Supabase
 */

const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const DATABASE_URL = 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres';

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

async function setupTextSystem() {
  console.log('🚀 Configurando Sistema TEXT + Type Hints...\n');
  
  try {
    // Import pg
    const { Client } = await import('pg');
    
    // Conectar ao banco
    console.log('📡 Conectando ao Supabase...');
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');
    
    // =====================================================
    // PASSO 1: Limpeza Completa
    // =====================================================
    
    console.log('🧹 PASSO 1: Limpando banco de dados...');
    
    const cleanupSQL = fs.readFileSync(
      path.join(__dirname, '../database/cleanup-all.sql'), 
      'utf8'
    );
    
    await client.query(cleanupSQL);
    console.log('   ✅ Banco limpo e schema plataforma_core criado');
    
    // =====================================================
    // PASSO 2: Criar Tabela Exemplo
    // =====================================================
    
    console.log('\n📋 PASSO 2: Criando tabela exemplo...');
    
    const exemploSQL = fs.readFileSync(
      path.join(__dirname, '../database/exemplo-vendas.sql'), 
      'utf8'
    );
    
    await client.query(exemploSQL);
    console.log('   ✅ Tabela "vendas" criada com todos os campos TEXT');
    
    // =====================================================
    // PASSO 3: Inserir Dados de Exemplo
    // =====================================================
    
    console.log('\n📊 PASSO 3: Inserindo dados de exemplo...');
    
    const dadosSQL = fs.readFileSync(
      path.join(__dirname, '../database/dados-exemplo.sql'), 
      'utf8'
    );
    
    await client.query(dadosSQL);
    console.log('   ✅ Dados realistas inseridos com type hints configurados');
    
    // =====================================================
    // PASSO 4: Verificações
    // =====================================================
    
    console.log('\n🔍 PASSO 4: Verificando configuração...');
    
    // Verificar tabelas criadas
    const tablesResult = await client.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname IN ('public', 'plataforma_core')
      ORDER BY schemaname, tablename
    `);
    
    console.log('   📋 Tabelas criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`      - ${row.schemaname}.${row.tablename}`);
    });
    
    // Verificar dados na tabela vendas
    const vendasResult = await client.query('SELECT COUNT(*) as count FROM vendas');
    console.log(`   📊 Registros na tabela vendas: ${vendasResult.rows[0].count}`);
    
    // Verificar metadados
    const metadataResult = await client.query(`
      SELECT COUNT(*) as count, COUNT(DISTINCT table_name) as tables 
      FROM plataforma_core.column_metadata
    `);
    console.log(`   🏷️  Type hints configurados: ${metadataResult.rows[0].count} colunas em ${metadataResult.rows[0].tables} tabelas`);
    
    // =====================================================
    // CONCLUSÃO
    // =====================================================
    
    console.log('\n🎉 SISTEMA CONFIGURADO COM SUCESSO!');
    console.log('\n📋 RESUMO:');
    console.log('   ✅ Banco limpo e reorganizado');
    console.log('   ✅ Schema plataforma_core criado');
    console.log('   ✅ Tabela "vendas" com campos TEXT criada');
    console.log('   ✅ Dados realistas inseridos');
    console.log('   ✅ Type hints configurados automaticamente');
    console.log('\n🌐 PRÓXIMO PASSO:');
    console.log('   Acesse http://localhost:3035 e teste o novo sistema!');
    console.log('   - Entre no módulo "Base de Dados"');
    console.log('   - Abra a tabela "vendas"');
    console.log('   - Veja os diferentes tipos formatados automaticamente');
    
    await client.end();
    
  } catch (error) {
    console.error('\n❌ ERRO ao configurar sistema:', error.message);
    console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verificar se o Supabase está acessível');
    console.error('   2. Verificar credenciais do banco');
    console.error('   3. Verificar sintaxe dos arquivos SQL');
    process.exit(1);
  }
}

// =====================================================
// EXECUTAR SCRIPT
// =====================================================

if (require.main === module) {
  setupTextSystem().catch(console.error);
}

module.exports = { setupTextSystem };