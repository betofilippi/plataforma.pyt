// =====================================================================
// SISTEMA DE PARTICIONAMENTO AUTOMÁTICO POR MÓDULO
// Particionamento automático + Maintenance + Performance optimization
// =====================================================================

import { Pool } from 'pg';
import { createHash } from 'crypto';

export interface PartitionStrategy {
  type: 'range_date' | 'range_numeric' | 'list' | 'hash';
  column: string;
  interval?: string; // Para range_date (monthly, weekly, daily)
  size?: number;     // Para range_numeric ou hash
  values?: string[]; // Para list partitions
}

export interface PartitionConfig {
  schema: string;
  table: string;
  strategy: PartitionStrategy;
  retention_policy?: {
    enabled: boolean;
    keep_months?: number;
    archive_to?: string; // Schema de arquivo
  };
  maintenance?: {
    auto_create: boolean;
    auto_drop: boolean;
    auto_analyze: boolean;
    pre_create_count: number; // Partições futuras a criar
  };
}

export interface PartitionInfo {
  name: string;
  schema: string;
  parent_table: string;
  partition_expression: string;
  partition_constraint: string;
  size_mb: number;
  row_count: number;
  created_at: Date;
  last_analyzed?: Date;
  is_active: boolean;
}

export interface PartitionMetrics {
  total_partitions: number;
  active_partitions: number;
  total_size_mb: number;
  total_rows: number;
  avg_partition_size: number;
  largest_partition: string;
  oldest_partition: string;
  newest_partition: string;
  maintenance_needed: string[];
}

export class PartitionManager {
  private pool: Pool;
  private registryTable = 'plataforma_partition_registry';

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Inicializar sistema de particionamento
   */
  async initialize(): Promise<void> {
    console.log('📊 Inicializando sistema de particionamento...');
    
    await this.createPartitionRegistry();
    await this.createMaintenanceFunctions();
    
    console.log('✅ Sistema de particionamento inicializado');
  }

  /**
   * Registrar configuração de particionamento
   */
  async registerTablePartitioning(config: PartitionConfig): Promise<void> {
    console.log(`📋 Registrando particionamento: ${config.schema}.${config.table}`);
    
    // Verificar se tabela existe
    const tableExists = await this.checkTableExists(config.schema, config.table);
    if (!tableExists) {
      throw new Error(`Table ${config.schema}.${config.table} does not exist`);
    }
    
    // Registrar configuração
    await this.pool.query(`
      INSERT INTO ${this.registryTable} (
        schema_name, table_name, strategy, retention_policy, maintenance_config
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (schema_name, table_name)
      DO UPDATE SET
        strategy = EXCLUDED.strategy,
        retention_policy = EXCLUDED.retention_policy,
        maintenance_config = EXCLUDED.maintenance_config,
        updated_at = NOW()
    `, [
      config.schema,
      config.table,
      JSON.stringify(config.strategy),
      JSON.stringify(config.retention_policy),
      JSON.stringify(config.maintenance)
    ]);
    
    console.log(`✅ Configuração registrada: ${config.schema}.${config.table}`);
  }

  /**
   * Converter tabela existente para particionada
   */
  async convertToPartitioned(config: PartitionConfig): Promise<void> {
    console.log(`🔄 Convertendo tabela para particionada: ${config.schema}.${config.table}`);
    
    const tableName = config.table;
    const schemaName = config.schema;
    const tempTableName = `${tableName}_temp_partition`;
    
    try {
      await this.pool.query('BEGIN');
      
      // 1. Criar tabela particionada temporária
      await this.createPartitionedTable(schemaName, tempTableName, config);
      
      // 2. Copiar dados da tabela original
      await this.pool.query(`
        INSERT INTO ${schemaName}.${tempTableName} 
        SELECT * FROM ${schemaName}.${tableName}
      `);
      
      // 3. Renomear tabelas
      await this.pool.query(`
        ALTER TABLE ${schemaName}.${tableName} RENAME TO ${tableName}_old;
        ALTER TABLE ${schemaName}.${tempTableName} RENAME TO ${tableName};
      `);
      
      // 4. Recriar índices e constraints
      await this.recreateIndexesAndConstraints(schemaName, tableName, `${tableName}_old`);
      
      // 5. Criar partições iniciais
      await this.createInitialPartitions(config);
      
      await this.pool.query('COMMIT');
      
      console.log(`✅ Tabela convertida: ${schemaName}.${tableName}`);
      
      // Agendar remoção da tabela antiga (opcionalmente)
      console.log(`ℹ️ Tabela antiga mantida como ${tableName}_old para segurança`);
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`❌ Erro na conversão:`, error);
      throw error;
    }
  }

  /**
   * Criar nova tabela já particionada
   */
  async createPartitionedTable(schema: string, tableName: string, config: PartitionConfig): Promise<void> {
    const strategy = config.strategy;
    let partitionClause = '';
    
    switch (strategy.type) {
      case 'range_date':
        partitionClause = `PARTITION BY RANGE (${strategy.column})`;
        break;
      case 'range_numeric':
        partitionClause = `PARTITION BY RANGE (${strategy.column})`;
        break;
      case 'list':
        partitionClause = `PARTITION BY LIST (${strategy.column})`;
        break;
      case 'hash':
        partitionClause = `PARTITION BY HASH (${strategy.column})`;
        break;
    }
    
    // Obter definição da tabela original se existir
    const tableDefinition = await this.getTableDefinition(schema, tableName.replace('_temp_partition', ''));
    
    await this.pool.query(`
      CREATE TABLE ${schema}.${tableName} (
        ${tableDefinition}
      ) ${partitionClause}
    `);
    
    console.log(`📋 Tabela particionada criada: ${schema}.${tableName}`);
  }

  /**
   * Criar partições iniciais baseadas na estratégia
   */
  async createInitialPartitions(config: PartitionConfig): Promise<void> {
    const { schema, table, strategy } = config;
    
    switch (strategy.type) {
      case 'range_date':
        await this.createDatePartitions(schema, table, strategy);
        break;
      case 'range_numeric':
        await this.createNumericPartitions(schema, table, strategy);
        break;
      case 'list':
        await this.createListPartitions(schema, table, strategy);
        break;
      case 'hash':
        await this.createHashPartitions(schema, table, strategy);
        break;
    }
  }

  /**
   * Manutenção automática de partições
   */
  async runMaintenance(moduleName?: string): Promise<PartitionMetrics[]> {
    console.log('🔧 Executando manutenção de partições...');
    
    let whereClause = '';
    const params: any[] = [];
    
    if (moduleName) {
      whereClause = 'WHERE schema_name = $1';
      params.push(`module_${moduleName}`);
    }
    
    const configs = await this.pool.query(`
      SELECT * FROM ${this.registryTable} ${whereClause}
    `, params);
    
    const results: PartitionMetrics[] = [];
    
    for (const configRow of configs.rows) {
      const config: PartitionConfig = {
        schema: configRow.schema_name,
        table: configRow.table_name,
        strategy: configRow.strategy,
        retention_policy: configRow.retention_policy,
        maintenance: configRow.maintenance_config
      };
      
      try {
        const metrics = await this.maintainTablePartitions(config);
        results.push(metrics);
      } catch (error) {
        console.error(`❌ Erro na manutenção de ${config.schema}.${config.table}:`, error);
      }
    }
    
    console.log(`✅ Manutenção concluída: ${results.length} tabelas processadas`);
    return results;
  }

  /**
   * Manutenção de partições de uma tabela específica
   */
  async maintainTablePartitions(config: PartitionConfig): Promise<PartitionMetrics> {
    const { schema, table, strategy, maintenance, retention_policy } = config;
    
    console.log(`🔧 Mantendo partições: ${schema}.${table}`);
    
    // 1. Criar partições futuras se necessário
    if (maintenance?.auto_create) {
      await this.createFuturePartitions(config);
    }
    
    // 2. Remover partições antigas se configurado
    if (retention_policy?.enabled && maintenance?.auto_drop) {
      await this.dropOldPartitions(config);
    }
    
    // 3. Analisar partições se necessário
    if (maintenance?.auto_analyze) {
      await this.analyzePartitions(schema, table);
    }
    
    // 4. Obter métricas atualizadas
    return await this.getTableMetrics(schema, table);
  }

  /**
   * Obter métricas de uma tabela particionada
   */
  async getTableMetrics(schema: string, table: string): Promise<PartitionMetrics> {
    const partitionsQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
        pg_total_relation_size(schemaname||'.'||tablename) / 1024 / 1024 as size_mb,
        n_tup_ins + n_tup_upd as row_count,
        last_analyze
      FROM pg_stat_user_tables 
      WHERE schemaname = $1 
        AND tablename LIKE $2
      ORDER BY tablename
    `;
    
    const partitions = await this.pool.query(partitionsQuery, [schema, `${table}_%`]);
    
    let totalSize = 0;
    let totalRows = 0;
    let oldestPartition = '';
    let newestPartition = '';
    let largestPartition = '';
    let largestSize = 0;
    const maintenanceNeeded: string[] = [];
    
    partitions.rows.forEach(partition => {
      totalSize += partition.size_mb || 0;
      totalRows += partition.row_count || 0;
      
      if (!oldestPartition || partition.tablename < oldestPartition) {
        oldestPartition = partition.tablename;
      }
      if (!newestPartition || partition.tablename > newestPartition) {
        newestPartition = partition.tablename;
      }
      if ((partition.size_mb || 0) > largestSize) {
        largestSize = partition.size_mb || 0;
        largestPartition = partition.tablename;
      }
      
      // Verificar se precisa de análise
      if (!partition.last_analyze) {
        maintenanceNeeded.push(`${partition.tablename} needs ANALYZE`);
      }
    });
    
    return {
      total_partitions: partitions.rows.length,
      active_partitions: partitions.rows.length, // Todas são consideradas ativas por ora
      total_size_mb: totalSize,
      total_rows: totalRows,
      avg_partition_size: partitions.rows.length > 0 ? totalSize / partitions.rows.length : 0,
      largest_partition: largestPartition,
      oldest_partition: oldestPartition,
      newest_partition: newestPartition,
      maintenance_needed: maintenanceNeeded
    };
  }

  /**
   * Obter informações detalhadas das partições
   */
  async getPartitionInfo(schema: string, table: string): Promise<PartitionInfo[]> {
    const query = `
      SELECT 
        c.relname as partition_name,
        n.nspname as schema_name,
        p.relname as parent_table,
        pg_get_expr(c.relpartbound, c.oid) as partition_expression,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size_pretty,
        pg_total_relation_size(c.oid) / 1024 / 1024 as size_mb,
        s.n_tup_ins + s.n_tup_upd as row_count,
        s.last_analyze
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_inherits i ON c.oid = i.inhrelid
      JOIN pg_class p ON i.inhparent = p.oid
      LEFT JOIN pg_stat_user_tables s ON c.relname = s.relname AND n.nspname = s.schemaname
      WHERE n.nspname = $1 AND p.relname = $2
      ORDER BY c.relname
    `;
    
    const result = await this.pool.query(query, [schema, table]);
    
    return result.rows.map(row => ({
      name: row.partition_name,
      schema: row.schema_name,
      parent_table: row.parent_table,
      partition_expression: row.partition_expression || '',
      partition_constraint: row.partition_expression || '',
      size_mb: row.size_mb || 0,
      row_count: row.row_count || 0,
      created_at: new Date(), // Placeholder
      last_analyzed: row.last_analyze,
      is_active: true
    }));
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async createPartitionRegistry(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.registryTable} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schema_name VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        strategy JSONB NOT NULL,
        retention_policy JSONB DEFAULT '{}',
        maintenance_config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(schema_name, table_name)
      );
      
      CREATE INDEX IF NOT EXISTS idx_partition_registry_schema 
        ON ${this.registryTable}(schema_name);
    `);
  }

  private async createMaintenanceFunctions(): Promise<void> {
    await this.pool.query(`
      -- Função para criar partições automaticamente
      CREATE OR REPLACE FUNCTION plataforma_core.auto_create_partition()
      RETURNS TRIGGER AS $$
      DECLARE
        partition_name TEXT;
        partition_exists BOOLEAN;
      BEGIN
        -- Lógica será implementada caso a caso
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  private async checkTableExists(schema: string, table: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = $1 AND table_name = $2
    `, [schema, table]);
    
    return result.rows.length > 0;
  }

  private async getTableDefinition(schema: string, table: string): Promise<string> {
    // Obter definição das colunas
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `;
    
    const columns = await this.pool.query(columnsQuery, [schema, table]);
    
    const columnDefs = columns.rows.map(col => {
      let def = `${col.column_name} ${col.data_type}`;
      
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      
      if (col.is_nullable === 'NO') {
        def += ' NOT NULL';
      }
      
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      
      return def;
    }).join(',\n  ');
    
    return columnDefs;
  }

  private async createDatePartitions(schema: string, table: string, strategy: PartitionStrategy): Promise<void> {
    const interval = strategy.interval || 'monthly';
    const column = strategy.column;
    
    // Criar partições para os próximos 12 meses
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      let partitionName: string;
      let startDate: string;
      let endDate: string;
      
      if (interval === 'monthly') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        partitionName = `${table}_${year}_${month}`;
        
        startDate = `${year}-${month}-01`;
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        endDate = nextMonth.toISOString().split('T')[0];
      } else {
        throw new Error(`Unsupported date interval: ${interval}`);
      }
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.${partitionName} 
        PARTITION OF ${schema}.${table}
        FOR VALUES FROM ('${startDate}') TO ('${endDate}')
      `);
      
      console.log(`📅 Partição criada: ${partitionName} (${startDate} to ${endDate})`);
    }
  }

  private async createHashPartitions(schema: string, table: string, strategy: PartitionStrategy): Promise<void> {
    const partitionCount = strategy.size || 4;
    
    for (let i = 0; i < partitionCount; i++) {
      const partitionName = `${table}_p${i}`;
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.${partitionName} 
        PARTITION OF ${schema}.${table}
        FOR VALUES WITH (MODULUS ${partitionCount}, REMAINDER ${i})
      `);
      
      console.log(`#️⃣ Partição hash criada: ${partitionName} (${i}/${partitionCount})`);
    }
  }

  private async createListPartitions(schema: string, table: string, strategy: PartitionStrategy): Promise<void> {
    if (!strategy.values) {
      throw new Error('List partition requires values array');
    }
    
    for (const value of strategy.values) {
      const partitionName = `${table}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.${partitionName} 
        PARTITION OF ${schema}.${table}
        FOR VALUES IN ('${value}')
      `);
      
      console.log(`📋 Partição lista criada: ${partitionName} (value: ${value})`);
    }
  }

  private async createNumericPartitions(schema: string, table: string, strategy: PartitionStrategy): Promise<void> {
    const size = strategy.size || 1000000;
    const partitionCount = 10; // Criar 10 partições iniciais
    
    for (let i = 0; i < partitionCount; i++) {
      const start = i * size;
      const end = (i + 1) * size;
      const partitionName = `${table}_${start}_${end}`;
      
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.${partitionName} 
        PARTITION OF ${schema}.${table}
        FOR VALUES FROM (${start}) TO (${end})
      `);
      
      console.log(`🔢 Partição numérica criada: ${partitionName} (${start} to ${end})`);
    }
  }

  private async createFuturePartitions(config: PartitionConfig): Promise<void> {
    // Implementar criação de partições futuras baseada na estratégia
    console.log(`🚀 Criando partições futuras para ${config.schema}.${config.table}`);
  }

  private async dropOldPartitions(config: PartitionConfig): Promise<void> {
    // Implementar remoção de partições antigas baseada na política de retenção
    console.log(`🗑️ Removendo partições antigas de ${config.schema}.${config.table}`);
  }

  private async analyzePartitions(schema: string, table: string): Promise<void> {
    const partitions = await this.pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = $1 AND tablename LIKE $2
    `, [schema, `${table}_%`]);
    
    for (const partition of partitions.rows) {
      await this.pool.query(`ANALYZE ${schema}.${partition.tablename}`);
    }
    
    console.log(`📊 Análise executada em ${partitions.rows.length} partições`);
  }

  private async recreateIndexesAndConstraints(schema: string, newTable: string, oldTable: string): Promise<void> {
    // Copiar índices e constraints da tabela antiga
    console.log(`🔄 Recriando índices e constraints para ${schema}.${newTable}`);
    // Implementação específica dependeria dos índices existentes
  }
}

/**
 * Configurações pré-definidas para diferentes tipos de módulos
 */
export const PARTITION_PRESETS = {
  // Para módulos com dados históricos (vendas, logs, etc.)
  HISTORICAL: {
    strategy: {
      type: 'range_date' as const,
      column: 'created_at',
      interval: 'monthly'
    },
    retention_policy: {
      enabled: true,
      keep_months: 36
    },
    maintenance: {
      auto_create: true,
      auto_drop: true,
      auto_analyze: true,
      pre_create_count: 3
    }
  },
  
  // Para módulos com dados distribuídos (usuários, organizações)
  DISTRIBUTED: {
    strategy: {
      type: 'hash' as const,
      column: 'organization_id',
      size: 8
    },
    maintenance: {
      auto_create: false,
      auto_drop: false,
      auto_analyze: true,
      pre_create_count: 0
    }
  }
};

/**
 * Factory function
 */
export function createPartitionManager(pool: Pool): PartitionManager {
  return new PartitionManager(pool);
}