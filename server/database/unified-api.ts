// =====================================================================
// API UNIFICADA DE DATABASE COM QUERY BUILDER TYPE-SAFE
// Query builder + Type safety + Performance + Multi-module support
// =====================================================================

import { Pool, PoolClient } from 'pg';
import { CacheManager } from './cache-manager';
import { SecurityManager } from './security-manager';
import { MigrationSystem } from './migration-system';
import { ModuleIsolationManager } from './module-isolation';

// ==================== TYPES & INTERFACES ====================

export interface DatabaseConfig {
  pool: Pool;
  cache?: CacheManager;
  security?: SecurityManager;
  migrations?: MigrationSystem;
  isolation?: ModuleIsolationManager;
}

export interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  useTransaction?: boolean;
  timeout?: number;
  moduleName?: string;
  tenantId?: string;
  userId?: string;
}

export interface SelectOptions<T = any> extends QueryOptions {
  select?: (keyof T)[];
  where?: WhereCondition<T>;
  orderBy?: OrderByClause<T>[];
  limit?: number;
  offset?: number;
  groupBy?: (keyof T)[];
  having?: WhereCondition<T>;
}

export interface InsertOptions<T = any> extends QueryOptions {
  onConflict?: 'ignore' | 'update' | { columns: (keyof T)[]; action: 'ignore' | 'update' };
  returning?: (keyof T)[];
}

export interface UpdateOptions<T = any> extends QueryOptions {
  where: WhereCondition<T>;
  returning?: (keyof T)[];
}

export interface DeleteOptions<T = any> extends QueryOptions {
  where: WhereCondition<T>;
  returning?: (keyof T)[];
}

export type WhereCondition<T> = {
  [K in keyof T]?: T[K] | WhereOperator<T[K]> | WhereCondition<T[K]>[];
} | {
  $and?: WhereCondition<T>[];
  $or?: WhereCondition<T>[];
  $not?: WhereCondition<T>;
};

export interface WhereOperator<T> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $nin?: T[];
  $like?: string;
  $ilike?: string;
  $regex?: string;
  $exists?: boolean;
  $null?: boolean;
}

export interface OrderByClause<T> {
  column: keyof T;
  direction: 'ASC' | 'DESC';
  nulls?: 'FIRST' | 'LAST';
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: any[];
}

export interface Transaction {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  select<T = any>(table: string, options?: SelectOptions<T>): Promise<T[]>;
  selectOne<T = any>(table: string, options?: SelectOptions<T>): Promise<T | null>;
  insert<T = any>(table: string, data: Partial<T> | Partial<T>[], options?: InsertOptions<T>): Promise<T[]>;
  update<T = any>(table: string, data: Partial<T>, options: UpdateOptions<T>): Promise<T[]>;
  delete<T = any>(table: string, options: DeleteOptions<T>): Promise<T[]>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ==================== MAIN DATABASE CLASS ====================

export class UnifiedDatabase {
  private pool: Pool;
  private cache?: CacheManager;
  private security?: SecurityManager;
  private migrations?: MigrationSystem;
  private isolation?: ModuleIsolationManager;

  constructor(config: DatabaseConfig) {
    this.pool = config.pool;
    this.cache = config.cache;
    this.security = config.security;
    this.migrations = config.migrations;
    this.isolation = config.isolation;
  }

  /**
   * Executar query SQL direta
   */
  async query<T = any>(
    text: string, 
    params?: any[], 
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    
    const cacheKey = options.cache ? this.generateQueryCacheKey(text, params) : null;
    
    // Tentar cache primeiro
    if (cacheKey && this.cache) {
      const cached = await this.cache.get<QueryResult<T>>(cacheKey, options.moduleName);
      if (cached) {
        return cached;
      }
    }
    
    // Executar query
    const startTime = Date.now();
    let result: QueryResult<T>;
    
    if (options.useTransaction) {
      result = await this.executeInTransaction(async (client) => {
        return await client.query<T>(text, params);
      });
    } else {
      result = await this.pool.query<T>(text, params);
    }
    
    const duration = Date.now() - startTime;
    
    // Cachear resultado se configurado
    if (cacheKey && this.cache && result.rowCount > 0) {
      await this.cache.set(
        cacheKey, 
        result, 
        options.cacheTTL, 
        options.moduleName,
        [`query:${options.moduleName || 'default'}`]
      );
    }
    
    // Log para queries lentas
    if (duration > 1000) {
      console.warn(`⏱️ Slow query (${duration}ms): ${text.substring(0, 100)}...`);
    }
    
    return result;
  }

  /**
   * SELECT com type safety
   */
  async select<T = any>(
    table: string, 
    options: SelectOptions<T> = {}
  ): Promise<T[]> {
    
    const queryBuilder = new QueryBuilder<T>(table, this.pool.schema || 'public');
    const { sql, params } = queryBuilder.buildSelect(options);
    
    const result = await this.query<T>(sql, params, {
      ...options,
      cache: options.cache !== false // Cache habilitado por padrão para SELECTs
    });
    
    return result.rows;
  }

  /**
   * SELECT ONE com type safety
   */
  async selectOne<T = any>(
    table: string, 
    options: SelectOptions<T> = {}
  ): Promise<T | null> {
    
    const rows = await this.select<T>(table, { ...options, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * INSERT com type safety
   */
  async insert<T = any>(
    table: string, 
    data: Partial<T> | Partial<T>[], 
    options: InsertOptions<T> = {}
  ): Promise<T[]> {
    
    const queryBuilder = new QueryBuilder<T>(table, this.pool.schema || 'public');
    const { sql, params } = queryBuilder.buildInsert(data, options);
    
    const result = await this.query<T>(sql, params, {
      ...options,
      cache: false // Não cachear INSERTs
    });
    
    // Invalidar cache relacionado
    if (this.cache && options.moduleName) {
      await this.cache.invalidatePattern(`${options.moduleName}:*`);
    }
    
    return result.rows;
  }

  /**
   * UPDATE com type safety
   */
  async update<T = any>(
    table: string, 
    data: Partial<T>, 
    options: UpdateOptions<T>
  ): Promise<T[]> {
    
    const queryBuilder = new QueryBuilder<T>(table, this.pool.schema || 'public');
    const { sql, params } = queryBuilder.buildUpdate(data, options);
    
    const result = await this.query<T>(sql, params, {
      ...options,
      cache: false // Não cachear UPDATEs
    });
    
    // Invalidar cache relacionado
    if (this.cache && options.moduleName) {
      await this.cache.invalidatePattern(`${options.moduleName}:*`);
    }
    
    return result.rows;
  }

  /**
   * DELETE com type safety
   */
  async delete<T = any>(
    table: string, 
    options: DeleteOptions<T>
  ): Promise<T[]> {
    
    const queryBuilder = new QueryBuilder<T>(table, this.pool.schema || 'public');
    const { sql, params } = queryBuilder.buildDelete(options);
    
    const result = await this.query<T>(sql, params, {
      ...options,
      cache: false // Não cachear DELETEs
    });
    
    // Invalidar cache relacionado
    if (this.cache && options.moduleName) {
      await this.cache.invalidatePattern(`${options.moduleName}:*`);
    }
    
    return result.rows;
  }

  /**
   * Executar em transação
   */
  async transaction<T>(
    callback: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    
    return this.executeInTransaction(async (client) => {
      const transaction = new TransactionWrapper(client);
      return await callback(transaction);
    });
  }

  /**
   * Criar tabela com isolamento automático
   */
  async createTable<T = any>(
    moduleName: string,
    tableName: string,
    columns: TableColumn[],
    options: CreateTableOptions = {}
  ): Promise<void> {
    
    if (!this.isolation) {
      throw new Error('Module isolation manager not configured');
    }
    
    const columnsSQL = columns.map(col => this.buildColumnDefinition(col)).join(',\n  ');
    
    await this.isolation.createIsolatedTable(
      moduleName,
      tableName,
      columnsSQL,
      {
        tenantColumn: options.tenantColumn,
        enableRLS: options.enableRLS,
        enableAudit: options.enableAudit,
        partitioning: options.partitioning
      }
    );
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private async executeInTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private generateQueryCacheKey(sql: string, params?: any[]): string {
    const hash = require('crypto').createHash('md5');
    hash.update(sql);
    if (params) {
      hash.update(JSON.stringify(params));
    }
    return `query:${hash.digest('hex')}`;
  }

  private buildColumnDefinition(column: TableColumn): string {
    let def = `${column.name} ${column.type}`;
    
    if (column.nullable === false) {
      def += ' NOT NULL';
    }
    
    if (column.default !== undefined) {
      def += ` DEFAULT ${column.default}`;
    }
    
    if (column.primaryKey) {
      def += ' PRIMARY KEY';
    }
    
    if (column.unique) {
      def += ' UNIQUE';
    }
    
    if (column.references) {
      def += ` REFERENCES ${column.references.table}(${column.references.column})`;
      if (column.references.onDelete) {
        def += ` ON DELETE ${column.references.onDelete}`;
      }
    }
    
    return def;
  }
}

// ==================== QUERY BUILDER ====================

export class QueryBuilder<T = any> {
  private table: string;
  private schema: string;

  constructor(table: string, schema: string = 'public') {
    this.table = table;
    this.schema = schema;
  }

  buildSelect(options: SelectOptions<T>): { sql: string; params: any[] } {
    const parts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // SELECT clause
    if (options.select && options.select.length > 0) {
      const columns = options.select.map(col => this.escapeIdentifier(col as string)).join(', ');
      parts.push(`SELECT ${columns}`);
    } else {
      parts.push('SELECT *');
    }

    // FROM clause
    parts.push(`FROM ${this.getFullTableName()}`);

    // WHERE clause
    if (options.where) {
      const { clause, whereParams } = this.buildWhereClause(options.where, paramIndex);
      if (clause) {
        parts.push(`WHERE ${clause}`);
        params.push(...whereParams);
        paramIndex += whereParams.length;
      }
    }

    // GROUP BY clause
    if (options.groupBy && options.groupBy.length > 0) {
      const columns = options.groupBy.map(col => this.escapeIdentifier(col as string)).join(', ');
      parts.push(`GROUP BY ${columns}`);
    }

    // HAVING clause
    if (options.having) {
      const { clause, whereParams } = this.buildWhereClause(options.having, paramIndex);
      if (clause) {
        parts.push(`HAVING ${clause}`);
        params.push(...whereParams);
        paramIndex += whereParams.length;
      }
    }

    // ORDER BY clause
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map(order => {
        let clause = this.escapeIdentifier(order.column as string);
        clause += ` ${order.direction}`;
        if (order.nulls) {
          clause += ` NULLS ${order.nulls}`;
        }
        return clause;
      });
      parts.push(`ORDER BY ${orderClauses.join(', ')}`);
    }

    // LIMIT clause
    if (options.limit) {
      parts.push(`LIMIT $${paramIndex}`);
      params.push(options.limit);
      paramIndex++;
    }

    // OFFSET clause
    if (options.offset) {
      parts.push(`OFFSET $${paramIndex}`);
      params.push(options.offset);
      paramIndex++;
    }

    return { sql: parts.join(' '), params };
  }

  buildInsert(
    data: Partial<T> | Partial<T>[], 
    options: InsertOptions<T>
  ): { sql: string; params: any[] } {
    
    const records = Array.isArray(data) ? data : [data];
    if (records.length === 0) {
      throw new Error('No data provided for insert');
    }

    const columns = Object.keys(records[0]) as (keyof T)[];
    const parts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // INSERT clause
    const columnNames = columns.map(col => this.escapeIdentifier(col as string)).join(', ');
    parts.push(`INSERT INTO ${this.getFullTableName()} (${columnNames})`);

    // VALUES clause
    const valuesClauses = records.map(record => {
      const placeholders = columns.map(col => {
        params.push(record[col]);
        return `$${paramIndex++}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    parts.push(`VALUES ${valuesClauses.join(', ')}`);

    // ON CONFLICT clause
    if (options.onConflict) {
      if (options.onConflict === 'ignore') {
        parts.push('ON CONFLICT DO NOTHING');
      } else if (options.onConflict === 'update') {
        const updateSet = columns.map(col => 
          `${this.escapeIdentifier(col as string)} = EXCLUDED.${this.escapeIdentifier(col as string)}`
        ).join(', ');
        parts.push(`ON CONFLICT DO UPDATE SET ${updateSet}`);
      } else if (typeof options.onConflict === 'object') {
        const conflictColumns = options.onConflict.columns.map(col => 
          this.escapeIdentifier(col as string)
        ).join(', ');
        
        parts.push(`ON CONFLICT (${conflictColumns})`);
        
        if (options.onConflict.action === 'ignore') {
          parts.push('DO NOTHING');
        } else {
          const updateSet = columns.map(col => 
            `${this.escapeIdentifier(col as string)} = EXCLUDED.${this.escapeIdentifier(col as string)}`
          ).join(', ');
          parts.push(`DO UPDATE SET ${updateSet}`);
        }
      }
    }

    // RETURNING clause
    if (options.returning && options.returning.length > 0) {
      const returningColumns = options.returning.map(col => 
        this.escapeIdentifier(col as string)
      ).join(', ');
      parts.push(`RETURNING ${returningColumns}`);
    } else {
      parts.push('RETURNING *');
    }

    return { sql: parts.join(' '), params };
  }

  buildUpdate(
    data: Partial<T>, 
    options: UpdateOptions<T>
  ): { sql: string; params: any[] } {
    
    const parts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // UPDATE clause
    parts.push(`UPDATE ${this.getFullTableName()}`);

    // SET clause
    const setColumns = Object.keys(data).map(col => {
      params.push((data as any)[col]);
      return `${this.escapeIdentifier(col)} = $${paramIndex++}`;
    });

    if (setColumns.length === 0) {
      throw new Error('No data provided for update');
    }

    parts.push(`SET ${setColumns.join(', ')}`);

    // WHERE clause (required for updates)
    const { clause, whereParams } = this.buildWhereClause(options.where, paramIndex);
    if (!clause) {
      throw new Error('WHERE clause is required for UPDATE operations');
    }

    parts.push(`WHERE ${clause}`);
    params.push(...whereParams);
    paramIndex += whereParams.length;

    // RETURNING clause
    if (options.returning && options.returning.length > 0) {
      const returningColumns = options.returning.map(col => 
        this.escapeIdentifier(col as string)
      ).join(', ');
      parts.push(`RETURNING ${returningColumns}`);
    } else {
      parts.push('RETURNING *');
    }

    return { sql: parts.join(' '), params };
  }

  buildDelete(options: DeleteOptions<T>): { sql: string; params: any[] } {
    const parts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // DELETE clause
    parts.push(`DELETE FROM ${this.getFullTableName()}`);

    // WHERE clause (required for deletes)
    const { clause, whereParams } = this.buildWhereClause(options.where, paramIndex);
    if (!clause) {
      throw new Error('WHERE clause is required for DELETE operations');
    }

    parts.push(`WHERE ${clause}`);
    params.push(...whereParams);
    paramIndex += whereParams.length;

    // RETURNING clause
    if (options.returning && options.returning.length > 0) {
      const returningColumns = options.returning.map(col => 
        this.escapeIdentifier(col as string)
      ).join(', ');
      parts.push(`RETURNING ${returningColumns}`);
    }

    return { sql: parts.join(' '), params };
  }

  private buildWhereClause(
    condition: WhereCondition<T>, 
    startParamIndex: number
  ): { clause: string; whereParams: any[] } {
    
    const params: any[] = [];
    let paramIndex = startParamIndex;

    const buildCondition = (cond: any): string => {
      if (!cond) return '';

      // Handle logical operators
      if (cond.$and) {
        const clauses = cond.$and.map((c: any) => buildCondition(c)).filter(Boolean);
        return clauses.length > 0 ? `(${clauses.join(' AND ')})` : '';
      }

      if (cond.$or) {
        const clauses = cond.$or.map((c: any) => buildCondition(c)).filter(Boolean);
        return clauses.length > 0 ? `(${clauses.join(' OR ')})` : '';
      }

      if (cond.$not) {
        const clause = buildCondition(cond.$not);
        return clause ? `NOT (${clause})` : '';
      }

      // Handle field conditions
      const fieldClauses: string[] = [];

      for (const [field, value] of Object.entries(cond)) {
        if (field.startsWith('$')) continue; // Skip logical operators

        const columnName = this.escapeIdentifier(field);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Handle operators
          const operators = value as WhereOperator<any>;

          for (const [op, opValue] of Object.entries(operators)) {
            switch (op) {
              case '$eq':
                fieldClauses.push(`${columnName} = $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$ne':
                fieldClauses.push(`${columnName} != $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$gt':
                fieldClauses.push(`${columnName} > $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$gte':
                fieldClauses.push(`${columnName} >= $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$lt':
                fieldClauses.push(`${columnName} < $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$lte':
                fieldClauses.push(`${columnName} <= $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$in':
                if (Array.isArray(opValue) && opValue.length > 0) {
                  const placeholders = opValue.map(() => `$${paramIndex++}`);
                  fieldClauses.push(`${columnName} IN (${placeholders.join(', ')})`);
                  params.push(...opValue);
                }
                break;
              case '$nin':
                if (Array.isArray(opValue) && opValue.length > 0) {
                  const placeholders = opValue.map(() => `$${paramIndex++}`);
                  fieldClauses.push(`${columnName} NOT IN (${placeholders.join(', ')})`);
                  params.push(...opValue);
                }
                break;
              case '$like':
                fieldClauses.push(`${columnName} LIKE $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$ilike':
                fieldClauses.push(`${columnName} ILIKE $${paramIndex}`);
                params.push(opValue);
                paramIndex++;
                break;
              case '$null':
                fieldClauses.push(opValue ? `${columnName} IS NULL` : `${columnName} IS NOT NULL`);
                break;
              case '$exists':
                // This would need subquery support
                break;
            }
          }
        } else {
          // Simple equality
          fieldClauses.push(`${columnName} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      return fieldClauses.join(' AND ');
    };

    const clause = buildCondition(condition);
    return { clause, whereParams: params };
  }

  private getFullTableName(): string {
    return `${this.escapeIdentifier(this.schema)}.${this.escapeIdentifier(this.table)}`;
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

// ==================== TRANSACTION WRAPPER ====================

class TransactionWrapper implements Transaction {
  private client: PoolClient;

  constructor(client: PoolClient) {
    this.client = client;
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return await this.client.query<T>(text, params);
  }

  async select<T = any>(table: string, options: SelectOptions<T> = {}): Promise<T[]> {
    const queryBuilder = new QueryBuilder<T>(table);
    const { sql, params } = queryBuilder.buildSelect(options);
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async selectOne<T = any>(table: string, options: SelectOptions<T> = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...options, limit: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  async insert<T = any>(table: string, data: Partial<T> | Partial<T>[], options: InsertOptions<T> = {}): Promise<T[]> {
    const queryBuilder = new QueryBuilder<T>(table);
    const { sql, params } = queryBuilder.buildInsert(data, options);
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async update<T = any>(table: string, data: Partial<T>, options: UpdateOptions<T>): Promise<T[]> {
    const queryBuilder = new QueryBuilder<T>(table);
    const { sql, params } = queryBuilder.buildUpdate(data, options);
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async delete<T = any>(table: string, options: DeleteOptions<T>): Promise<T[]> {
    const queryBuilder = new QueryBuilder<T>(table);
    const { sql, params } = queryBuilder.buildDelete(options);
    const result = await this.client.query<T>(sql, params);
    return result.rows;
  }

  async commit(): Promise<void> {
    await this.client.query('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.client.query('ROLLBACK');
  }
}

// ==================== ADDITIONAL TYPES ====================

export interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  default?: any;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

export interface CreateTableOptions {
  tenantColumn?: string;
  enableRLS?: boolean;
  enableAudit?: boolean;
  partitioning?: 'none' | 'date' | 'tenant' | 'hash';
}

/**
 * Factory function para criar API unificada
 */
export function createUnifiedDatabase(config: DatabaseConfig): UnifiedDatabase {
  return new UnifiedDatabase(config);
}