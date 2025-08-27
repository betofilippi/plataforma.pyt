// =====================================================================
// SISTEMA DE ROW-LEVEL SECURITY E AUDIT TRAIL COMPLETO
// RLS automático + Audit trail + Compliance + Security monitoring
// =====================================================================

import { Pool } from 'pg';

export interface SecurityPolicy {
  name: string;
  table: string;
  schema: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  roles: string[];
  using?: string; // Condição USING
  with_check?: string; // Condição WITH CHECK
  description?: string;
  enabled: boolean;
}

export interface AuditConfig {
  schema: string;
  table: string;
  track_operations: ('INSERT' | 'UPDATE' | 'DELETE')[];
  track_columns?: string[]; // Se não especificado, audita todas
  exclude_columns?: string[]; // Colunas a excluir da auditoria
  retention_days: number;
  compress_after_days?: number;
  anonymize_columns?: string[]; // Colunas para anonimizar em auditoria
}

export interface AuditEntry {
  audit_id: string;
  table_schema: string;
  table_name: string;
  record_id: string;
  operation: 'I' | 'U' | 'D';
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_columns: string[];
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  application_name?: string;
  transaction_id?: string;
  created_at: Date;
}

export interface SecurityMetrics {
  total_policies: number;
  active_policies: number;
  policy_violations: number;
  audit_entries_today: number;
  audit_entries_total: number;
  suspicious_activity: SecurityAlert[];
}

export interface SecurityAlert {
  id: string;
  type: 'multiple_failed_access' | 'bulk_data_access' | 'unusual_pattern' | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  table_name: string;
  description: string;
  metadata: Record<string, any>;
  created_at: Date;
  resolved_at?: Date;
}

export interface ComplianceReport {
  period_start: Date;
  period_end: Date;
  total_data_access: number;
  privileged_access_count: number;
  data_modification_count: number;
  failed_access_attempts: number;
  gdpr_requests: number;
  compliance_violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  type: 'unauthorized_access' | 'data_retention' | 'consent_violation' | 'export_violation';
  description: string;
  user_id?: string;
  table_name: string;
  severity: 'minor' | 'major' | 'critical';
  created_at: Date;
}

export class SecurityManager {
  private pool: Pool;
  private auditSchema = 'plataforma_audit';
  private securitySchema = 'plataforma_security';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Inicializar sistema de segurança
   */
  async initialize(): Promise<void> {
    console.log('🔐 Inicializando sistema de segurança...');
    
    await this.createSecuritySchemas();
    await this.createAuditTables();
    await this.createSecurityTables();
    await this.createSecurityFunctions();
    
    console.log('✅ Sistema de segurança inicializado');
  }

  /**
   * Configurar RLS para tabela
   */
  async configureTableRLS(
    schema: string, 
    table: string,
    tenantColumn: string = 'organization_id',
    customPolicies: SecurityPolicy[] = []
  ): Promise<void> {
    
    console.log(`🔒 Configurando RLS: ${schema}.${table}`);
    
    // Habilitar RLS
    await this.pool.query(`ALTER TABLE ${schema}.${table} ENABLE ROW LEVEL SECURITY`);
    
    // Políticas padrão baseadas em tenant
    const defaultPolicies: SecurityPolicy[] = [
      {
        name: `${table}_tenant_select`,
        table,
        schema,
        operation: 'SELECT',
        roles: ['authenticated'],
        using: `${tenantColumn} = plataforma_core.current_tenant_id()`,
        description: 'Acesso de leitura por tenant',
        enabled: true
      },
      {
        name: `${table}_tenant_insert`,
        table,
        schema,
        operation: 'INSERT',
        roles: ['authenticated'],
        with_check: `${tenantColumn} = plataforma_core.current_tenant_id()`,
        description: 'Inserção restrita por tenant',
        enabled: true
      },
      {
        name: `${table}_tenant_update`,
        table,
        schema,
        operation: 'UPDATE',
        roles: ['authenticated'],
        using: `${tenantColumn} = plataforma_core.current_tenant_id()`,
        with_check: `${tenantColumn} = plataforma_core.current_tenant_id()`,
        description: 'Atualização restrita por tenant',
        enabled: true
      },
      {
        name: `${table}_tenant_delete`,
        table,
        schema,
        operation: 'DELETE',
        roles: ['authenticated'],
        using: `${tenantColumn} = plataforma_core.current_tenant_id()`,
        description: 'Exclusão restrita por tenant',
        enabled: true
      },
      // Política para service_role (bypass RLS para operações de sistema)
      {
        name: `${table}_service_all`,
        table,
        schema,
        operation: 'ALL',
        roles: ['service_role'],
        using: 'true',
        with_check: 'true',
        description: 'Acesso total para service role',
        enabled: true
      }
    ];
    
    const allPolicies = [...defaultPolicies, ...customPolicies];
    
    // Remover políticas existentes
    await this.dropTablePolicies(schema, table);
    
    // Criar novas políticas
    for (const policy of allPolicies) {
      await this.createSecurityPolicy(policy);
    }
    
    console.log(`✅ RLS configurado: ${schema}.${table} (${allPolicies.length} políticas)`);
  }

  /**
   * Criar política de segurança
   */
  async createSecurityPolicy(policy: SecurityPolicy): Promise<void> {
    if (!policy.enabled) return;
    
    let policySQL = `CREATE POLICY ${policy.name} ON ${policy.schema}.${policy.table}`;
    
    if (policy.operation !== 'ALL') {
      policySQL += ` FOR ${policy.operation}`;
    }
    
    if (policy.roles.length > 0) {
      policySQL += ` TO ${policy.roles.join(', ')}`;
    }
    
    if (policy.using) {
      policySQL += ` USING (${policy.using})`;
    }
    
    if (policy.with_check) {
      policySQL += ` WITH CHECK (${policy.with_check})`;
    }
    
    try {
      await this.pool.query(policySQL);
      
      // Registrar política no sistema
      await this.pool.query(`
        INSERT INTO ${this.securitySchema}.policies (
          name, table_schema, table_name, operation, roles, using_condition,
          with_check_condition, description, enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (name, table_schema, table_name) DO UPDATE SET
          operation = EXCLUDED.operation,
          roles = EXCLUDED.roles,
          using_condition = EXCLUDED.using_condition,
          with_check_condition = EXCLUDED.with_check_condition,
          description = EXCLUDED.description,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
      `, [
        policy.name,
        policy.schema,
        policy.table,
        policy.operation,
        JSON.stringify(policy.roles),
        policy.using,
        policy.with_check,
        policy.description,
        policy.enabled
      ]);
      
    } catch (error) {
      console.error(`❌ Erro ao criar política ${policy.name}:`, error);
      throw error;
    }
  }

  /**
   * Configurar auditoria para tabela
   */
  async configureTableAudit(config: AuditConfig): Promise<void> {
    console.log(`📋 Configurando auditoria: ${config.schema}.${config.table}`);
    
    const auditTableName = `${config.table}_audit`;
    
    // Criar tabela de auditoria se não existir
    await this.createAuditTable(config.schema, config.table, auditTableName);
    
    // Criar função de trigger
    await this.createAuditTriggerFunction(config);
    
    // Criar triggers para operações especificadas
    for (const operation of config.track_operations) {
      await this.createAuditTrigger(config, operation);
    }
    
    // Registrar configuração
    await this.pool.query(`
      INSERT INTO ${this.auditSchema}.configurations (
        schema_name, table_name, track_operations, track_columns,
        exclude_columns, retention_days, compress_after_days,
        anonymize_columns, config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (schema_name, table_name) DO UPDATE SET
        track_operations = EXCLUDED.track_operations,
        track_columns = EXCLUDED.track_columns,
        exclude_columns = EXCLUDED.exclude_columns,
        retention_days = EXCLUDED.retention_days,
        compress_after_days = EXCLUDED.compress_after_days,
        anonymize_columns = EXCLUDED.anonymize_columns,
        config = EXCLUDED.config,
        updated_at = NOW()
    `, [
      config.schema,
      config.table,
      JSON.stringify(config.track_operations),
      JSON.stringify(config.track_columns),
      JSON.stringify(config.exclude_columns),
      config.retention_days,
      config.compress_after_days,
      JSON.stringify(config.anonymize_columns),
      JSON.stringify(config)
    ]);
    
    console.log(`✅ Auditoria configurada: ${config.schema}.${config.table}`);
  }

  /**
   * Obter entradas de auditoria
   */
  async getAuditEntries(
    schema: string,
    table: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      operation?: 'I' | 'U' | 'D';
      userId?: string;
      recordId?: string;
      limit?: number;
    } = {}
  ): Promise<AuditEntry[]> {
    
    let whereConditions = ['table_schema = $1', 'table_name = $2'];
    let params: any[] = [schema, table];
    let paramIndex = 3;
    
    if (options.startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(options.startDate);
      paramIndex++;
    }
    
    if (options.endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(options.endDate);
      paramIndex++;
    }
    
    if (options.operation) {
      whereConditions.push(`operation = $${paramIndex}`);
      params.push(options.operation);
      paramIndex++;
    }
    
    if (options.userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(options.userId);
      paramIndex++;
    }
    
    if (options.recordId) {
      whereConditions.push(`record_id = $${paramIndex}`);
      params.push(options.recordId);
      paramIndex++;
    }
    
    const query = `
      SELECT * FROM ${this.auditSchema}.entries
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${options.limit || 1000}
    `;
    
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Detectar atividade suspeita
   */
  async detectSuspiciousActivity(): Promise<SecurityAlert[]> {
    console.log('🕵️ Detectando atividade suspeita...');
    
    const alerts: SecurityAlert[] = [];
    
    // Detectar múltiplos acessos falhados
    const failedAccessQuery = `
      SELECT 
        user_id,
        table_name,
        COUNT(*) as failed_count,
        MAX(created_at) as last_attempt
      FROM ${this.securitySchema}.access_log
      WHERE success = false
        AND created_at > NOW() - INTERVAL '1 hour'
      GROUP BY user_id, table_name
      HAVING COUNT(*) > 5
    `;
    
    const failedAccess = await this.pool.query(failedAccessQuery);
    
    for (const row of failedAccess.rows) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'multiple_failed_access',
        severity: 'high',
        user_id: row.user_id,
        table_name: row.table_name,
        description: `User attempted to access ${row.table_name} ${row.failed_count} times without success`,
        metadata: {
          failed_count: row.failed_count,
          last_attempt: row.last_attempt
        },
        created_at: new Date()
      });
    }
    
    // Detectar acesso em massa a dados
    const bulkAccessQuery = `
      SELECT 
        user_id,
        table_name,
        COUNT(*) as access_count,
        MAX(created_at) as last_access
      FROM ${this.auditSchema}.entries
      WHERE operation = 'SELECT'
        AND created_at > NOW() - INTERVAL '10 minutes'
      GROUP BY user_id, table_name
      HAVING COUNT(*) > 1000
    `;
    
    const bulkAccess = await this.pool.query(bulkAccessQuery);
    
    for (const row of bulkAccess.rows) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'bulk_data_access',
        severity: 'medium',
        user_id: row.user_id,
        table_name: row.table_name,
        description: `User accessed ${row.table_name} ${row.access_count} times in 10 minutes`,
        metadata: {
          access_count: row.access_count,
          last_access: row.last_access
        },
        created_at: new Date()
      });
    }
    
    // Salvar alertas
    for (const alert of alerts) {
      await this.saveSecurityAlert(alert);
    }
    
    console.log(`🚨 ${alerts.length} alertas de segurança detectados`);
    
    return alerts;
  }

  /**
   * Gerar relatório de compliance
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    
    console.log(`📊 Gerando relatório de compliance: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    
    // Contadores gerais
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE operation = 'SELECT') as data_access,
        COUNT(*) FILTER (WHERE operation IN ('UPDATE', 'DELETE') AND user_id IN (
          SELECT user_id FROM plataforma_rbac.user_roles ur
          JOIN plataforma_rbac.roles r ON ur.role_id = r.id
          WHERE r.name IN ('admin', 'super_admin')
        )) as privileged_access,
        COUNT(*) FILTER (WHERE operation IN ('INSERT', 'UPDATE', 'DELETE')) as data_modifications
      FROM ${this.auditSchema}.entries
      WHERE created_at BETWEEN $1 AND $2
    `;
    
    const stats = await this.pool.query(statsQuery, [startDate, endDate]);
    const statsRow = stats.rows[0];
    
    // Tentativas de acesso falhadas
    const failedAttemptsQuery = `
      SELECT COUNT(*) as failed_attempts
      FROM ${this.securitySchema}.access_log
      WHERE success = false
        AND created_at BETWEEN $1 AND $2
    `;
    
    const failedAttempts = await this.pool.query(failedAttemptsQuery, [startDate, endDate]);
    
    // Violações de compliance (exemplo)
    const violations: ComplianceViolation[] = [];
    
    const report: ComplianceReport = {
      period_start: startDate,
      period_end: endDate,
      total_data_access: parseInt(statsRow.data_access) || 0,
      privileged_access_count: parseInt(statsRow.privileged_access) || 0,
      data_modification_count: parseInt(statsRow.data_modifications) || 0,
      failed_access_attempts: parseInt(failedAttempts.rows[0].failed_attempts) || 0,
      gdpr_requests: 0, // Implementar conforme necessário
      compliance_violations: violations
    };
    
    // Salvar relatório
    await this.pool.query(`
      INSERT INTO ${this.securitySchema}.compliance_reports (
        period_start, period_end, total_data_access, privileged_access_count,
        data_modification_count, failed_access_attempts, gdpr_requests, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      report.period_start,
      report.period_end,
      report.total_data_access,
      report.privileged_access_count,
      report.data_modification_count,
      report.failed_access_attempts,
      report.gdpr_requests,
      JSON.stringify(report)
    ]);
    
    console.log(`✅ Relatório de compliance gerado`);
    
    return report;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createSecuritySchemas(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${this.auditSchema};
      CREATE SCHEMA IF NOT EXISTS ${this.securitySchema};
      
      -- Permissões para schemas de segurança
      GRANT USAGE ON SCHEMA ${this.auditSchema} TO service_role;
      GRANT USAGE ON SCHEMA ${this.securitySchema} TO service_role;
    `);
  }

  private async createAuditTables(): Promise<void> {
    await this.pool.query(`
      -- Configurações de auditoria
      CREATE TABLE IF NOT EXISTS ${this.auditSchema}.configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schema_name VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        track_operations JSONB NOT NULL DEFAULT '["INSERT","UPDATE","DELETE"]',
        track_columns JSONB,
        exclude_columns JSONB DEFAULT '[]',
        retention_days INTEGER DEFAULT 2555, -- 7 anos
        compress_after_days INTEGER DEFAULT 90,
        anonymize_columns JSONB DEFAULT '[]',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(schema_name, table_name)
      );

      -- Entradas de auditoria
      CREATE TABLE IF NOT EXISTS ${this.auditSchema}.entries (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_schema VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id UUID NOT NULL,
        operation CHAR(1) NOT NULL CHECK (operation IN ('I','U','D')),
        old_values JSONB,
        new_values JSONB,
        changed_columns TEXT[] DEFAULT '{}',
        user_id UUID,
        session_id TEXT,
        ip_address INET,
        user_agent TEXT,
        application_name TEXT,
        transaction_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      ) PARTITION BY RANGE (created_at);

      -- Índices para auditoria
      CREATE INDEX IF NOT EXISTS idx_audit_entries_table 
        ON ${this.auditSchema}.entries(table_schema, table_name, created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_record 
        ON ${this.auditSchema}.entries(record_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_user 
        ON ${this.auditSchema}.entries(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_entries_operation 
        ON ${this.auditSchema}.entries(operation, created_at);

      -- Criar partições iniciais para auditoria (12 meses)
      ${this.generateAuditPartitions()}
    `);
  }

  private async createSecurityTables(): Promise<void> {
    await this.pool.query(`
      -- Políticas de segurança
      CREATE TABLE IF NOT EXISTS ${this.securitySchema}.policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        table_schema VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(10) NOT NULL,
        roles JSONB NOT NULL DEFAULT '[]',
        using_condition TEXT,
        with_check_condition TEXT,
        description TEXT,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(name, table_schema, table_name)
      );

      -- Log de acesso
      CREATE TABLE IF NOT EXISTS ${this.securitySchema}.access_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        table_name VARCHAR(100) NOT NULL,
        operation VARCHAR(10) NOT NULL,
        success BOOLEAN NOT NULL,
        error_message TEXT,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Alertas de segurança
      CREATE TABLE IF NOT EXISTS ${this.securitySchema}.alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        user_id UUID,
        table_name VARCHAR(100),
        description TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolved_by UUID
      );

      -- Relatórios de compliance
      CREATE TABLE IF NOT EXISTS ${this.securitySchema}.compliance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        total_data_access BIGINT DEFAULT 0,
        privileged_access_count BIGINT DEFAULT 0,
        data_modification_count BIGINT DEFAULT 0,
        failed_access_attempts BIGINT DEFAULT 0,
        gdpr_requests INTEGER DEFAULT 0,
        report_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Índices para segurança
      CREATE INDEX IF NOT EXISTS idx_access_log_user 
        ON ${this.securitySchema}.access_log(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_access_log_table 
        ON ${this.securitySchema}.access_log(table_name, created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity 
        ON ${this.securitySchema}.alerts(severity, created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_unresolved 
        ON ${this.securitySchema}.alerts(resolved_at) WHERE resolved_at IS NULL;
    `);
  }

  private async createSecurityFunctions(): Promise<void> {
    await this.pool.query(`
      -- Função para detectar campos alterados
      CREATE OR REPLACE FUNCTION ${this.auditSchema}.get_changed_fields(
        old_values JSONB, 
        new_values JSONB
      ) RETURNS TEXT[] AS $$
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

      -- Função para obter contexto da sessão
      CREATE OR REPLACE FUNCTION ${this.auditSchema}.get_session_context()
      RETURNS JSONB AS $$
      BEGIN
        RETURN jsonb_build_object(
          'user_id', current_setting('app.current_user_id', true),
          'session_id', current_setting('app.current_session_id', true),
          'ip_address', current_setting('app.current_ip_address', true),
          'user_agent', current_setting('app.current_user_agent', true),
          'application_name', current_setting('application_name', true)
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Função para limpeza de auditoria antiga
      CREATE OR REPLACE FUNCTION ${this.auditSchema}.cleanup_old_entries(
        p_retention_days INTEGER DEFAULT 2555
      ) RETURNS INTEGER AS $$
      DECLARE
        cleanup_count INTEGER;
      BEGIN
        DELETE FROM ${this.auditSchema}.entries
        WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        RETURN cleanup_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private generateAuditPartitions(): string {
    const partitions = [];
    const currentDate = new Date();
    
    // Criar partições para os próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      
      const partitionName = `entries_${year}_${month}`;
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, date.getMonth() + 1, 1).toISOString().split('T')[0];
      
      partitions.push(`
        CREATE TABLE IF NOT EXISTS ${this.auditSchema}.${partitionName}
        PARTITION OF ${this.auditSchema}.entries
        FOR VALUES FROM ('${startDate}') TO ('${endDate}');
      `);
    }
    
    return partitions.join('\n');
  }

  private async dropTablePolicies(schema: string, table: string): Promise<void> {
    // Obter políticas existentes
    const policies = await this.pool.query(`
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = $1 AND tablename = $2
    `, [schema, table]);
    
    // Dropar cada política
    for (const policy of policies.rows) {
      try {
        await this.pool.query(`DROP POLICY IF EXISTS ${policy.policyname} ON ${schema}.${table}`);
      } catch (error) {
        console.warn(`Warning: Could not drop policy ${policy.policyname}:`, error);
      }
    }
  }

  private async createAuditTable(schema: string, table: string, auditTableName: string): Promise<void> {
    // A tabela de auditoria principal já foi criada (particionada)
    // Apenas verificar se existe configuração específica
  }

  private async createAuditTriggerFunction(config: AuditConfig): Promise<void> {
    const functionName = `audit_${config.table}`;
    
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${config.schema}.${functionName}()
      RETURNS TRIGGER AS $$
      DECLARE
        context JSONB;
      BEGIN
        context := ${this.auditSchema}.get_session_context();
        
        IF TG_OP = 'DELETE' THEN
          INSERT INTO ${this.auditSchema}.entries (
            table_schema, table_name, record_id, operation, old_values,
            user_id, session_id, ip_address, user_agent, application_name
          ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, OLD.id, 'D', 
            to_jsonb(OLD),
            (context->>'user_id')::uuid,
            context->>'session_id',
            (context->>'ip_address')::inet,
            context->>'user_agent',
            context->>'application_name'
          );
          RETURN OLD;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO ${this.auditSchema}.entries (
            table_schema, table_name, record_id, operation, 
            old_values, new_values, changed_columns,
            user_id, session_id, ip_address, user_agent, application_name
          ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, 'U',
            to_jsonb(OLD), to_jsonb(NEW),
            ${this.auditSchema}.get_changed_fields(to_jsonb(OLD), to_jsonb(NEW)),
            (context->>'user_id')::uuid,
            context->>'session_id',
            (context->>'ip_address')::inet,
            context->>'user_agent',
            context->>'application_name'
          );
          RETURN NEW;
        ELSIF TG_OP = 'INSERT' THEN
          INSERT INTO ${this.auditSchema}.entries (
            table_schema, table_name, record_id, operation, new_values,
            user_id, session_id, ip_address, user_agent, application_name
          ) VALUES (
            TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.id, 'I',
            to_jsonb(NEW),
            (context->>'user_id')::uuid,
            context->>'session_id',
            (context->>'ip_address')::inet,
            context->>'user_agent',
            context->>'application_name'
          );
          RETURN NEW;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private async createAuditTrigger(config: AuditConfig, operation: string): Promise<void> {
    const triggerName = `trigger_audit_${config.table}_${operation.toLowerCase()}`;
    const functionName = `audit_${config.table}`;
    
    await this.pool.query(`
      CREATE TRIGGER ${triggerName}
        AFTER ${operation} ON ${config.schema}.${config.table}
        FOR EACH ROW EXECUTE FUNCTION ${config.schema}.${functionName}();
    `);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private async saveSecurityAlert(alert: SecurityAlert): Promise<void> {
    await this.pool.query(`
      INSERT INTO ${this.securitySchema}.alerts (
        id, type, severity, user_id, table_name, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      alert.id,
      alert.type,
      alert.severity,
      alert.user_id,
      alert.table_name,
      alert.description,
      JSON.stringify(alert.metadata)
    ]);
  }
}

/**
 * Factory function
 */
export function createSecurityManager(pool: Pool): SecurityManager {
  return new SecurityManager(pool);
}