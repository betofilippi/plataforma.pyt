/**
 * Script simplificado - apenas criar estruturas necessárias
 */

const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres';

async function setupSimple() {
  console.log('🚀 Configurando Sistema TEXT (modo simples)...\n');
  
  try {
    const { Client } = require('pg');
    
    console.log('📡 Conectando ao Supabase...');
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // Criar schema se não existir
    console.log('📁 Criando schema plataforma_core...');
    await client.query('CREATE SCHEMA IF NOT EXISTS plataforma_core;');
    console.log('✅ Schema criado');
    
    // Criar tabela de metadados
    console.log('🏷️ Criando tabela de metadados...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.column_metadata (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        schema_name TEXT NOT NULL DEFAULT 'public',
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        type_hint TEXT NOT NULL DEFAULT 'text',
        format_options TEXT,
        validation_rules TEXT,
        editor_type TEXT,
        confidence DECIMAL DEFAULT 1.0,
        is_auto_detected BOOLEAN DEFAULT false,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP::text,
        created_by TEXT,
        updated_by TEXT,
        UNIQUE(schema_name, table_name, column_name)
      );
    `);
    console.log('✅ Tabela column_metadata criada');
    
    // Criar tabela vendas de exemplo
    console.log('📋 Criando tabela vendas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendas (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        produto TEXT,
        categoria TEXT,
        preco TEXT,
        quantidade TEXT,
        total TEXT,
        cliente_nome TEXT,
        cliente_cpf TEXT,
        cliente_email TEXT,
        cliente_telefone TEXT,
        vendedor TEXT,
        data_venda TEXT,
        status TEXT,
        pago TEXT,
        observacoes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP::text
      );
    `);
    console.log('✅ Tabela vendas criada');
    
    // Inserir alguns dados de exemplo
    console.log('📊 Inserindo dados de exemplo...');
    await client.query(`
      INSERT INTO vendas (produto, categoria, preco, quantidade, total, cliente_nome, cliente_cpf, cliente_email, vendedor, data_venda, status, pago)
      VALUES 
        ('Notebook Gamer', 'eletronicos', '4299.90', '1', '4299.90', 'João Silva', '12345678901', 'joao@email.com', 'Maria', '2024-01-15', 'aprovado', 'true'),
        ('Mouse Gamer', 'eletronicos', '129.90', '2', '259.80', 'Ana Costa', '98765432100', 'ana@gmail.com', 'Carlos', '2024-01-16', 'pendente', 'false'),
        ('Cadeira Gamer', 'casa', '899.99', '1', '899.99', 'Pedro Santos', '45678912300', 'pedro@hotmail.com', 'Julia', '2024-01-17', 'entregue', 'true')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Dados inseridos');
    
    // Configurar metadados básicos
    console.log('🏷️ Configurando type hints...');
    await client.query(`
      INSERT INTO plataforma_core.column_metadata (schema_name, table_name, column_name, type_hint, format_options, editor_type)
      VALUES 
        ('public', 'vendas', 'preco', 'currency', '{"currency": "BRL", "decimals": 2, "prefix": "R$ "}', 'currency-input'),
        ('public', 'vendas', 'quantidade', 'number', '{"decimals": 0}', 'number-input'),
        ('public', 'vendas', 'total', 'currency', '{"currency": "BRL", "decimals": 2, "prefix": "R$ "}', 'currency-input'),
        ('public', 'vendas', 'cliente_cpf', 'cpf', '{"mask": "999.999.999-99"}', 'masked-input'),
        ('public', 'vendas', 'cliente_email', 'email', '{}', 'email-input'),
        ('public', 'vendas', 'data_venda', 'date', '{"format": "DD/MM/YYYY"}', 'date-picker'),
        ('public', 'vendas', 'status', 'select', '{"options": [{"value": "pendente", "label": "Pendente", "color": "yellow"}, {"value": "aprovado", "label": "Aprovado", "color": "green"}, {"value": "entregue", "label": "Entregue", "color": "blue"}]}', 'select'),
        ('public', 'vendas', 'pago', 'boolean', '{"trueLabel": "Sim", "falseLabel": "Não"}', 'switch')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Type hints configurados');
    
    // Verificar
    const count = await client.query('SELECT COUNT(*) FROM vendas');
    console.log(`\n✅ SUCESSO! ${count.rows[0].count} registros na tabela vendas`);
    console.log('\n🌐 Acesse http://localhost:3035 e teste o sistema!');
    
    await client.end();
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  }
}

setupSimple();