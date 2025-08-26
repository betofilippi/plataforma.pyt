#!/usr/bin/env node

const { Pool } = require('pg');

async function fixPermissionsSchema() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔧 Corrigindo schema da tabela permissions...');
    
    // Adicionar colunas que estão faltando
    await pool.query(`
      ALTER TABLE plataforma_core.permissions 
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS module_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
    `);
    
    // Criar índices únicos necessários
    await pool.query(`
      DROP INDEX IF EXISTS idx_permissions_name;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_name ON plataforma_core.permissions(name);
    `);
    
    // Atualizar constraint para incluir name
    await pool.query(`
      ALTER TABLE plataforma_core.permissions 
      DROP CONSTRAINT IF EXISTS permissions_module_id_resource_action_key;
    `);
    
    await pool.query(`
      ALTER TABLE plataforma_core.permissions 
      ADD CONSTRAINT permissions_name_unique UNIQUE (name);
    `);
    
    // Criar tabela de roles se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 0,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Criar tabela de role_permissions se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plataforma_core.role_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID NOT NULL REFERENCES plataforma_core.roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES plataforma_core.permissions(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      );
    `);
    
    // Verificar estrutura final
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'plataforma_core'
      AND table_name = 'permissions'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Schema corrigido! Colunas da tabela permissions:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar se as tabelas relacionadas existem
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'plataforma_core'
      AND table_name IN ('roles', 'role_permissions')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tabelas relacionadas criadas:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n🎉 Correção do schema concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixPermissionsSchema().catch(console.error);
}

module.exports = { fixPermissionsSchema };