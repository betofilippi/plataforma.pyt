// =====================================================================
// SISTEMA DE ISOLAMENTO DE DADOS POR MÓDULO
// Schemas dinâmicos + Row-Level Security + Multi-tenancy
// =====================================================================

import { Pool } from 'pg';
import { createHash } from 'crypto';

export interface ModuleIsolationConfig {
  module_name: string;
  schema_name: string;
  tenant_column: string;
  enable_rls: boolean;
  enable_audit: boolean;
  retention_days?: number;
  partition_strategy?: 'none' | 'date' | 'tenant' | 'hash';
}

export interface TenantContext {
  tenant_id: string;
  user_id: string;
  organization_id: string;
  roles: string[];
  permissions: string[];
}

export interface TablePolicy {
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  using?: string;
  with_check?: string;
  roles?: string[];
}

export class ModuleIsolationManager {
  private pool: Pool;
  private registryTable = 'plataforma_module_isolation';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Inicializar sistema de isolamento
   */
  async initialize(): Promise<void> {
    console.log('🔒 Inicializando sistema de isolamento por módulo...');
    
    await this.createIsolationRegistry();
    await this.createTenantFunctions();
    await this.createAuditSystem();
    
    console.log('✅ Sistema de isolamento inicializado');
  }

  /**
   * Registrar configuração de isolamento para módulo
   */
  async registerModule(config: ModuleIsolationConfig): Promise<void> {
    console.log(`🏗️ Registrando isolamento para módulo: ${config.module_name}`);
    
    // Criar schema se não existir
    await this.createModuleSchema(config.schema_name);
    
    // Registrar configuração
    await this.pool.query(`
      INSERT INTO ${this.registryTable} (
        module_name, schema_name, tenant_column, enable_rls, 
        enable_audit, retention_days, partition_strategy, config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (module_name) 
      DO UPDATE SET
        schema_name = EXCLUDED.schema_name,
        tenant_column = EXCLUDED.tenant_column,
        enable_rls = EXCLUDED.enable_rls,
        enable_audit = EXCLUDED.enable_audit,
        retention_days = EXCLUDED.retention_days,
        partition_strategy = EXCLUDED.partition_strategy,
        config = EXCLUDED.config,
        updated_at = NOW()
    `, [
      config.module_name,
      config.schema_name,
      config.tenant_column,
      config.enable_rls,
      config.enable_audit,
      config.retention_days,
      config.partition_strategy,
      JSON.stringify(config)
    ]);

    console.log(`✅ Módulo registrado: ${config.module_name} -> ${config.schema_name}`);
  }

  /**
   * Criar schema isolado para módulo
   */
  async createModuleSchema(schemaName: string): Promise<void> {
    await this.pool.query(`
      -- Criar schema
      CREATE SCHEMA IF NOT EXISTS ${schemaName};
      
      -- Configurar permissões básicas
      GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
      GRANT CREATE ON SCHEMA ${schemaName} TO service_role;
      
      -- Permissões padrão para objetos futuros
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
        
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
        
      ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName}
        GRANT EXECUTE ON FUNCTIONS TO authenticated;
    `);

    console.log(`📁 Schema criado: ${schemaName}`);
  }

  /**
   * Configurar RLS para tabela de módulo
   */
  async configureTableRLS(
    schemaName: string, 
    tableName: string,
    tenantColumn: string = 'organization_id',
    policies: TablePolicy[] = []
  ): Promise<void> {
    
    console.log(`🔐 Configurando RLS: ${schemaName}.${tableName}`);
    
    // Habilitar RLS na tabela
    await this.pool.query(`ALTER TABLE ${schemaName}.${tableName} ENABLE ROW LEVEL SECURITY`);
    
    // Política padrão para SELECT
    const defaultSelectPolicy: TablePolicy = {
      name: `${tableName}_tenant_select`,
      operation: 'SELECT',
      using: `${tenantColumn} = current_setting('app.current_tenant_id', true)::uuid`,
      roles: ['authenticated']
    };
    
    // Política padrão para INSERT
    const defaultInsertPolicy: TablePolicy = {
      name: `${tableName}_tenant_insert`,
      operation: 'INSERT',
      with_check: `${tenantColumn} = current_setting('app.current_tenant_id', true)::uuid`,
      roles: ['authenticated']
    };
    
    // Política padrão para UPDATE
    const defaultUpdatePolicy: TablePolicy = {
      name: `${tableName}_tenant_update`,
      operation: 'UPDATE',
      using: `${tenantColumn} = current_setting('app.current_tenant_id', true)::uuid`,
      with_check: `${tenantColumn} = current_setting('app.current_tenant_id', true)::uuid`,
      roles: ['authenticated']
    };
    
    // Política padrão para DELETE
    const defaultDeletePolicy: TablePolicy = {
      name: `${tableName}_tenant_delete`,
      operation: 'DELETE',
      using: `${tenantColumn} = current_setting('app.current_tenant_id', true)::uuid`,
      roles: ['authenticated']
    };
    
    const allPolicies = [...policies, defaultSelectPolicy, defaultInsertPolicy, defaultUpdatePolicy, defaultDeletePolicy];
    
    // Criar políticas
    for (const policy of allPolicies) {
      await this.createTablePolicy(schemaName, tableName, policy);
    }
    
    console.log(`✅ RLS configurado: ${schemaName}.${tableName} (${allPolicies.length} políticas)`);
  }

  /**
   * Criar política RLS para tabela
   */
  private async createTablePolicy(schemaName: string, tableName: string, policy: TablePolicy): Promise<void> {
    // Dropar política existente se houver
    try {
      await this.pool.query(`DROP POLICY IF EXISTS ${policy.name} ON ${schemaName}.${tableName}`);
    } catch (error) {
      // Ignorar erro se política não existir
    }
    
    let policySQL = `CREATE POLICY ${policy.name} ON ${schemaName}.${tableName}`;
    
    if (policy.roles && policy.roles.length > 0) {
      policySQL += ` FOR ${policy.operation} TO ${policy.roles.join(', ')}`;
    } else {
      policySQL += ` FOR ${policy.operation}`;
    }
    
    if (policy.using) {
      policySQL += ` USING (${policy.using})`;
    }
    
    if (policy.with_check) {
      policySQL += ` WITH CHECK (${policy.with_check})`;
    }
    
    await this.pool.query(policySQL);
  }

  /**
   * Configurar contexto de tenant para sessão
   */
  async setTenantContext(context: TenantContext): Promise<void> {
    await this.pool.query(`
      SELECT set_config('app.current_tenant_id', $1, true),
             set_config('app.current_user_id', $2, true),
             set_config('app.current_organization_id', $3, true),
             set_config('app.current_roles', $4, true),
             set_config('app.current_permissions', $5, true)
    `, [
      context.tenant_id,
      context.user_id,
      context.organization_id,
      JSON.stringify(context.roles),
      JSON.stringify(context.permissions)
    ]);
  }

  /**
   * Criar tabela com isolamento automático
   */
  async createIsolatedTable(
    moduleName: string,
    tableName: string,
    columns: string,
    options: {
      tenantColumn?: string;
      enableRLS?: boolean;
      enableAudit?: boolean;
      partitioning?: 'none' | 'date' | 'tenant' | 'hash';
    } = {}
  ): Promise<void> {
    
    const config = await this.getModuleConfig(moduleName);
    if (!config) {
      throw new Error(`Module ${moduleName} not registered for isolation`);
    }
    
    const schemaName = config.schema_name;
    const tenantColumn = options.tenantColumn || config.tenant_column;
    
    console.log(`🏗️ Criando tabela isolada: ${schemaName}.${tableName}`);
    
    // Adicionar colunas de controle
    const controlColumns = `
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ${tenantColumn} UUID NOT NULL REFERENCES plataforma_rbac.organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES plataforma_rbac.users(id) ON DELETE SET NULL
    `;
    
    let tableSQL = `
      CREATE TABLE ${schemaName}.${tableName} (
        ${controlColumns},
        ${columns}
      )
    `;
    
    // Configurar particionamento se especificado
    if (options.partitioning && options.partitioning !== 'none') {
      tableSQL += this.getPartitioningClause(options.partitioning, tenantColumn);
    }
    
    await this.pool.query(tableSQL);
    
    // Criar índices padrão
    await this.pool.query(`
      CREATE INDEX idx_${tableName}_tenant ON ${schemaName}.${tableName}(${tenantColumn});
      CREATE INDEX idx_${tableName}_created_at ON ${schemaName}.${tableName}(created_at);
    `);
    
    // Configurar RLS se habilitado
    if (options.enableRLS ?? config.enable_rls) {
      await this.configureTableRLS(schemaName, tableName, tenantColumn);
    }
    
    // Configurar auditoria se habilitado
    if (options.enableAudit ?? config.enable_audit) {
      await this.configureTableAudit(schemaName, tableName);
    }
    
    // Criar trigger para updated_at
    await this.createUpdatedAtTrigger(schemaName, tableName);
    
    console.log(`✅ Tabela isolada criada: ${schemaName}.${tableName}`);
  }

  /**
   * Configurar auditoria para tabela
   */
  private async configureTableAudit(schemaName: string, tableName: string): Promise<void> {
    // Criar tabela de auditoria se não existir
    const auditTableName = `${tableName}_audit`;
    
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.${auditTableName} (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_name VARCHAR(63) NOT NULL,
        record_id UUID NOT NULL,
        operation CHAR(1) NOT NULL CHECK (operation IN ('I','U','D')),
        old_values JSONB,
        new_values JSONB,
        changed_fields TEXT[],
        user_id UUID,
        session_id TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_${auditTableName}_record 
        ON ${schemaName}.${auditTableName}(record_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_${auditTableName}_operation 
        ON ${schemaName}.${auditTableName}(operation, created_at);
    `);
    
    // Criar função de auditoria
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${schemaName}.audit_${tableName}()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          INSERT INTO ${schemaName}.${auditTableName} (
            table_name, record_id, operation, old_values, user_id, session_id
          ) VALUES (
            TG_TABLE_NAME, OLD.id, 'D', to_jsonb(OLD),
            current_setting('app.current_user_id', true)::uuid,
            current_setting('app.current_session_id', true)
          );
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO ${schemaName}.${auditTableName} (
            table_name, record_id, operation, old_values, new_values,
            changed_fields, user_id, session_id
          ) VALUES (
            TG_TABLE_NAME, NEW.id, 'U', to_jsonb(OLD), to_jsonb(NEW),
            plataforma_core.get_changed_fields(to_jsonb(OLD), to_jsonb(NEW)),
            current_setting('app.current_user_id', true)::uuid,
            current_setting('app.current_session_id', true)
          );
          RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
          INSERT INTO ${schemaName}.${auditTableName} (
            table_name, record_id, operation, new_values, user_id, session_id
          ) VALUES (
            TG_TABLE_NAME, NEW.id, 'I', to_jsonb(NEW),
            current_setting('app.current_user_id', true)::uuid,
            current_setting('app.current_session_id', true)
          );
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER trigger_audit_${tableName}
        AFTER INSERT OR UPDATE OR DELETE ON ${schemaName}.${tableName}
        FOR EACH ROW EXECUTE FUNCTION ${schemaName}.audit_${tableName}();
    `);
  }

  /**
   * Criar trigger para updated_at
   */
  private async createUpdatedAtTrigger(schemaName: string, tableName: string): Promise<void> {
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${schemaName}.update_${tableName}_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        NEW.updated_by = current_setting('app.current_user_id', true)::uuid;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER trigger_${tableName}_updated_at
        BEFORE UPDATE ON ${schemaName}.${tableName}
        FOR EACH ROW EXECUTE FUNCTION ${schemaName}.update_${tableName}_updated_at();
    `);
  }

  /**
   * Obter configuração de módulo
   */
  private async getModuleConfig(moduleName: string): Promise<ModuleIsolationConfig | null> {
    const result = await this.pool.query(`
      SELECT * FROM ${this.registryTable} WHERE module_name = $1
    `, [moduleName]);
    
    return result.rows[0] || null;
  }

  /**
   * Limpar dados antigos baseado na retenção configurada
   */
  async cleanupExpiredData(): Promise<void> {
    console.log('🧹 Iniciando limpeza de dados expirados...');
    
    const modules = await this.pool.query(`
      SELECT module_name, schema_name, retention_days, config
      FROM ${this.registryTable}
      WHERE retention_days IS NOT NULL
    `);
    
    for (const module of modules.rows) {
      try {
        await this.cleanupModuleData(module.module_name, module.retention_days);
      } catch (error) {
        console.error(`❌ Erro na limpeza do módulo ${module.module_name}:`, error);
      }
    }
    
    console.log('✅ Limpeza de dados concluída');
  }

  /**
   * Limpar dados de um módulo específico
   */
  private async cleanupModuleData(moduleName: string, retentionDays: number): Promise<void> {
    const config = await this.getModuleConfig(moduleName);
    if (!config) return;
    
    // Obter todas as tabelas do schema do módulo
    const tables = await this.pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = $1
      AND tablename NOT LIKE '%_audit'
    `, [config.schema_name]);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let totalDeleted = 0;
    
    for (const table of tables.rows) {
      try {
        const result = await this.pool.query(`
          DELETE FROM ${config.schema_name}.${table.tablename}
          WHERE created_at < $1
        `, [cutoffDate]);
        
        const deletedCount = result.rowCount || 0;
        totalDeleted += deletedCount;
        
        if (deletedCount > 0) {
          console.log(`🗑️ Removidos ${deletedCount} registros antigos de ${config.schema_name}.${table.tablename}`);
        }
      } catch (error) {
        console.error(`❌ Erro na limpeza de ${config.schema_name}.${table.tablename}:`, error);
      }
    }
    
    if (totalDeleted > 0) {
      console.log(`✅ Módulo ${moduleName}: ${totalDeleted} registros removidos`);
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createIsolationRegistry(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.registryTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_name VARCHAR(100) NOT NULL UNIQUE,
        schema_name VARCHAR(100) NOT NULL,
        tenant_column VARCHAR(100) DEFAULT 'organization_id',
        enable_rls BOOLEAN DEFAULT true,
        enable_audit BOOLEAN DEFAULT true,
        retention_days INTEGER,
        partition_strategy VARCHAR(20) DEFAULT 'none',
        config JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_module_isolation_module 
        ON ${this.registryTable}(module_name);
    `);
  }

  private async createTenantFunctions(): Promise<void> {
    await this.pool.query(`
      -- Função para obter tenant atual
      CREATE OR REPLACE FUNCTION plataforma_core.current_tenant_id()
      RETURNS UUID AS $$
      BEGIN
        RETURN current_setting('app.current_tenant_id', true)::uuid;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Função para obter usuário atual
      CREATE OR REPLACE FUNCTION plataforma_core.current_user_id()
      RETURNS UUID AS $$
      BEGIN
        RETURN current_setting('app.current_user_id', true)::uuid;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Função para verificar se usuário tem acesso ao tenant
      CREATE OR REPLACE FUNCTION plataforma_core.has_tenant_access(tenant_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN tenant_id = plataforma_core.current_tenant_id();
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
  }

  private async createAuditSystem(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS plataforma_audit;
      
      -- Função para detectar campos alterados
      CREATE OR REPLACE FUNCTION plataforma_core.get_changed_fields(old_values JSONB, new_values JSONB)
      RETURNS TEXT[] AS $$
      DECLARE
        changed_fields TEXT[] := '{}';
        key TEXT;
      BEGIN
        FOR key IN SELECT jsonb_object_keys(new_values) LOOP
          IF old_values->key IS DISTINCT FROM new_values->key THEN
            changed_fields := array_append(changed_fields, key);
          END IF;
        END LOOP;
        RETURN changed_fields;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private getPartitioningClause(strategy: string, tenantColumn: string): string {
    switch (strategy) {
      case 'date':
        return ' PARTITION BY RANGE (created_at)';
      case 'tenant':
        return ` PARTITION BY HASH (${tenantColumn})`;
      case 'hash':
        return ' PARTITION BY HASH (id)';
      default:
        return '';
    }
  }
}

/**
 * Factory function para criar gerenciador de isolamento
 */
export function createModuleIsolationManager(pool: Pool): ModuleIsolationManager {
  return new ModuleIsolationManager(pool);
}