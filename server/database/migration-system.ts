// =====================================================================
// SISTEMA DE MIGRATIONS AUTOMÁTICO MULTI-MÓDULO
// Suporte para 20+ módulos com versionamento e rollback
// =====================================================================

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface Migration {
  id: string;
  module_name: string;
  version: string;
  filename: string;
  checksum: string;
  up_sql: string;
  down_sql: string;
  dependencies?: string[];
  created_at: Date;
  applied_at?: Date;
  applied_by?: string;
  rollback_at?: Date;
  rollback_by?: string;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  error_message?: string;
}

export interface ModuleSchema {
  module_name: string;
  schema_name: string;
  version: string;
  tables: SchemaTable[];
  permissions: SchemaPermission[];
  functions: SchemaFunction[];
  triggers: SchemaTrigger[];
}

export interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
  indexes: SchemaIndex[];
  constraints: SchemaConstraint[];
  partitioning?: PartitioningConfig;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  references?: { table: string; column: string };
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface SchemaConstraint {
  name: string;
  type: 'primary_key' | 'foreign_key' | 'unique' | 'check';
  definition: string;
}

export interface PartitioningConfig {
  type: 'range' | 'list' | 'hash';
  column: string;
  partitions: PartitionDefinition[];
}

export interface PartitionDefinition {
  name: string;
  condition: string;
}

export interface SchemaPermission {
  role: string;
  table: string;
  permissions: string[];
}

export interface SchemaFunction {
  name: string;
  definition: string;
  returns: string;
  language: string;
}

export interface SchemaTrigger {
  name: string;
  table: string;
  timing: 'before' | 'after' | 'instead_of';
  events: string[];
  function: string;
}

export class MigrationSystem {
  private pool: Pool;
  private migrationsTable = 'plataforma_migrations';
  private schemasTable = 'plataforma_schemas';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Inicializar sistema de migrations
   */
  async initialize(): Promise<void> {
    console.log('🔧 Inicializando sistema de migrations...');
    
    await this.createMigrationTables();
    await this.createSchemaRegistry();
    
    console.log('✅ Sistema de migrations inicializado');
  }

  /**
   * Criar tabelas de controle de migrations
   */
  private async createMigrationTables(): Promise<void> {
    const sql = `
      -- Tabela de controle de migrations
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_name VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        up_sql TEXT NOT NULL,
        down_sql TEXT,
        dependencies JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'rolled_back')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        applied_at TIMESTAMPTZ,
        applied_by VARCHAR(100),
        rollback_at TIMESTAMPTZ,
        rollback_by VARCHAR(100),
        error_message TEXT,
        execution_time_ms INTEGER,
        
        UNIQUE(module_name, version),
        UNIQUE(module_name, filename)
      );

      CREATE INDEX IF NOT EXISTS idx_migrations_module ON ${this.migrationsTable}(module_name);
      CREATE INDEX IF NOT EXISTS idx_migrations_status ON ${this.migrationsTable}(status);
      CREATE INDEX IF NOT EXISTS idx_migrations_version ON ${this.migrationsTable}(module_name, version);
    `;

    await this.pool.query(sql);
  }

  /**
   * Criar registry de schemas por módulo
   */
  private async createSchemaRegistry(): Promise<void> {
    const sql = `
      -- Registry de schemas por módulo
      CREATE TABLE IF NOT EXISTS ${this.schemasTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_name VARCHAR(100) NOT NULL,
        schema_name VARCHAR(100) NOT NULL,
        version VARCHAR(50) NOT NULL,
        definition JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        
        UNIQUE(module_name, schema_name)
      );

      CREATE INDEX IF NOT EXISTS idx_schemas_module ON ${this.schemasTable}(module_name);
      CREATE INDEX IF NOT EXISTS idx_schemas_active ON ${this.schemasTable}(is_active) WHERE is_active = true;
    `;

    await this.pool.query(sql);
  }

  /**
   * Descobrir migrations de um módulo
   */
  async discoverModuleMigrations(moduleName: string, migrationsPath: string): Promise<Migration[]> {
    const migrations: Migration[] = [];
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extrair metadados do arquivo
      const metadata = this.extractMigrationMetadata(content);
      const { upSql, downSql } = this.splitMigrationContent(content);
      
      migrations.push({
        id: this.generateMigrationId(moduleName, filename),
        module_name: moduleName,
        version: metadata.version || this.extractVersionFromFilename(filename),
        filename,
        checksum: this.calculateChecksum(content),
        up_sql: upSql,
        down_sql: downSql,
        dependencies: metadata.dependencies,
        created_at: new Date(),
        status: 'pending'
      });
    }

    return migrations;
  }

  /**
   * Registrar migrations de um módulo
   */
  async registerModuleMigrations(migrations: Migration[]): Promise<void> {
    for (const migration of migrations) {
      const existingMigration = await this.getMigration(migration.module_name, migration.version);
      
      if (existingMigration) {
        // Verificar se o checksum mudou
        if (existingMigration.checksum !== migration.checksum) {
          console.warn(`⚠️ Migration ${migration.module_name}:${migration.version} foi alterada!`);
          if (existingMigration.status === 'applied') {
            throw new Error(`Cannot modify applied migration: ${migration.module_name}:${migration.version}`);
          }
        }
        continue;
      }

      // Registrar nova migration
      await this.pool.query(`
        INSERT INTO ${this.migrationsTable} (
          id, module_name, version, filename, checksum, up_sql, down_sql, dependencies
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        migration.id,
        migration.module_name,
        migration.version,
        migration.filename,
        migration.checksum,
        migration.up_sql,
        migration.down_sql,
        JSON.stringify(migration.dependencies || [])
      ]);

      console.log(`📝 Migration registrada: ${migration.module_name}:${migration.version}`);
    }
  }

  /**
   * Executar migrations pendentes de um módulo
   */
  async runModuleMigrations(moduleName: string, targetVersion?: string): Promise<number> {
    console.log(`🚀 Executando migrations para módulo: ${moduleName}`);
    
    const pendingMigrations = await this.getPendingMigrations(moduleName);
    let appliedCount = 0;

    // Filtrar até versão alvo se especificada
    const migrationsToRun = targetVersion 
      ? pendingMigrations.filter(m => m.version <= targetVersion)
      : pendingMigrations;

    // Resolver dependências
    const sortedMigrations = await this.resolveDependencies(migrationsToRun);

    for (const migration of sortedMigrations) {
      try {
        console.log(`🔄 Aplicando migration: ${migration.module_name}:${migration.version}`);
        
        const startTime = Date.now();
        
        // Executar em transação
        await this.pool.query('BEGIN');
        
        try {
          // Executar SQL da migration
          await this.pool.query(migration.up_sql);
          
          // Marcar como aplicada
          const executionTime = Date.now() - startTime;
          await this.pool.query(`
            UPDATE ${this.migrationsTable} 
            SET status = 'applied', applied_at = NOW(), execution_time_ms = $1
            WHERE id = $2
          `, [executionTime, migration.id]);
          
          await this.pool.query('COMMIT');
          
          console.log(`✅ Migration aplicada: ${migration.module_name}:${migration.version} (${executionTime}ms)`);
          appliedCount++;
          
        } catch (error) {
          await this.pool.query('ROLLBACK');
          throw error;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao aplicar migration ${migration.module_name}:${migration.version}:`, error);
        
        // Marcar como falhada
        await this.pool.query(`
          UPDATE ${this.migrationsTable} 
          SET status = 'failed', error_message = $1
          WHERE id = $2
        `, [(error as Error).message, migration.id]);
        
        throw error;
      }
    }

    console.log(`✅ ${appliedCount} migrations aplicadas para ${moduleName}`);
    return appliedCount;
  }

  /**
   * Fazer rollback de uma migration específica
   */
  async rollbackMigration(moduleName: string, version: string, userId?: string): Promise<void> {
    console.log(`↩️ Fazendo rollback: ${moduleName}:${version}`);
    
    const migration = await this.getMigration(moduleName, version);
    if (!migration || migration.status !== 'applied') {
      throw new Error(`Migration ${moduleName}:${version} not found or not applied`);
    }

    if (!migration.down_sql) {
      throw new Error(`No rollback SQL available for ${moduleName}:${version}`);
    }

    try {
      await this.pool.query('BEGIN');
      
      // Executar SQL de rollback
      await this.pool.query(migration.down_sql);
      
      // Marcar como rolled back
      await this.pool.query(`
        UPDATE ${this.migrationsTable} 
        SET status = 'rolled_back', rollback_at = NOW(), rollback_by = $1
        WHERE id = $2
      `, [userId, migration.id]);
      
      await this.pool.query('COMMIT');
      
      console.log(`✅ Rollback concluído: ${moduleName}:${version}`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Erro no rollback ${moduleName}:${version}:`, error);
      throw error;
    }
  }

  /**
   * Obter status das migrations de um módulo
   */
  async getModuleStatus(moduleName: string): Promise<Migration[]> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.migrationsTable}
      WHERE module_name = $1
      ORDER BY version ASC
    `, [moduleName]);

    return result.rows.map(row => ({
      ...row,
      dependencies: Array.isArray(row.dependencies) ? row.dependencies : []
    }));
  }

  /**
   * Criar schema isolado para módulo
   */
  async createModuleSchema(moduleName: string): Promise<string> {
    const schemaName = `module_${moduleName}`;
    
    console.log(`🏗️ Criando schema para módulo: ${schemaName}`);
    
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Configurar permissões padrão
    await this.pool.query(`
      -- Permissões para usuários do módulo
      GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
      GRANT CREATE ON SCHEMA ${schemaName} TO authenticated;
      
      -- Permissões para tabelas futuras
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
      
      -- Permissões para sequences futuras  
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
    `);
    
    console.log(`✅ Schema criado: ${schemaName}`);
    return schemaName;
  }

  /**
   * Registrar definição de schema
   */
  async registerModuleSchema(schema: ModuleSchema): Promise<void> {
    await this.pool.query(`
      INSERT INTO ${this.schemasTable} (module_name, schema_name, version, definition)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (module_name, schema_name)
      DO UPDATE SET
        version = EXCLUDED.version,
        definition = EXCLUDED.definition,
        updated_at = NOW()
    `, [
      schema.module_name,
      schema.schema_name,
      schema.version,
      JSON.stringify(schema)
    ]);

    console.log(`📋 Schema registrado: ${schema.module_name} -> ${schema.schema_name}`);
  }

  /**
   * Executar migrations de todos os módulos
   */
  async runAllMigrations(): Promise<void> {
    console.log('🚀 Executando migrations de todos os módulos...');
    
    // Descobrir todos os módulos com migrations
    const modules = await this.discoverAllModules();
    
    for (const moduleName of modules) {
      try {
        await this.runModuleMigrations(moduleName);
      } catch (error) {
        console.error(`❌ Falha nas migrations do módulo ${moduleName}:`, error);
        // Continuar com outros módulos
      }
    }
    
    console.log('✅ Migrations de todos os módulos concluídas');
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async getMigration(moduleName: string, version: string): Promise<Migration | null> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.migrationsTable}
      WHERE module_name = $1 AND version = $2
    `, [moduleName, version]);

    return result.rows[0] || null;
  }

  private async getPendingMigrations(moduleName: string): Promise<Migration[]> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.migrationsTable}
      WHERE module_name = $1 AND status = 'pending'
      ORDER BY version ASC
    `, [moduleName]);

    return result.rows.map(row => ({
      ...row,
      dependencies: Array.isArray(row.dependencies) ? row.dependencies : []
    }));
  }

  private async resolveDependencies(migrations: Migration[]): Promise<Migration[]> {
    // Implementar algoritmo de resolução de dependências (topological sort)
    // Por enquanto, ordenar por versão
    return migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  private async discoverAllModules(): Promise<string[]> {
    // Descobrir módulos através dos diretórios de migration
    const modulesDir = path.join(process.cwd(), 'modules');
    
    if (!fs.existsSync(modulesDir)) {
      return [];
    }
    
    return fs.readdirSync(modulesDir)
      .filter(item => {
        const migrationPath = path.join(modulesDir, item, 'migrations');
        return fs.existsSync(migrationPath);
      });
  }

  private extractMigrationMetadata(content: string): any {
    const metadataMatch = content.match(/--\s*@metadata\s*({.*?})/s);
    return metadataMatch ? JSON.parse(metadataMatch[1]) : {};
  }

  private splitMigrationContent(content: string): { upSql: string; downSql: string } {
    const downMatch = content.match(/--\s*@down\s*(.*?)$/ms);
    
    if (downMatch) {
      const upSql = content.substring(0, downMatch.index).trim();
      const downSql = downMatch[1].trim();
      return { upSql, downSql };
    }
    
    return { upSql: content.trim(), downSql: '' };
  }

  private extractVersionFromFilename(filename: string): string {
    const match = filename.match(/(\d+(?:\.\d+)*)/);
    return match ? match[1] : '0.0.1';
  }

  private generateMigrationId(moduleName: string, filename: string): string {
    return createHash('sha256')
      .update(`${moduleName}:${filename}`)
      .digest('hex')
      .substring(0, 16);
  }

  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}

/**
 * Factory function para criar instância do sistema de migrations
 */
export function createMigrationSystem(pool: Pool): MigrationSystem {
  return new MigrationSystem(pool);
}