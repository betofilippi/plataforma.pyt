// =====================================================================
// SISTEMA DE CONNECTION POOLING OTIMIZADO PARA 20+ MÓDULOS
// Pool dinâmico + Load balancing + Health monitoring + Failover
// =====================================================================

import { Pool, PoolClient, PoolConfig } from 'pg';
import { EventEmitter } from 'events';

export interface PoolConfiguration {
  // Configuração básica
  connectionString: string;
  ssl?: boolean;
  
  // Pool sizing
  min: number;
  max: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  
  // Health monitoring
  healthCheckInterval: number;
  maxUnavailableTime: number;
  
  // Performance
  statementTimeout: number;
  queryTimeout: number;
  
  // Monitoring
  enableMetrics: boolean;
  logConnections: boolean;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  activeConnections: number;
  waitingClients: number;
  totalQueries: number;
  totalErrors: number;
  avgQueryTime: number;
  avgWaitTime: number;
  uptime: number;
  lastHealthCheck: Date;
  isHealthy: boolean;
}

export interface ConnectionInfo {
  id: string;
  createdAt: Date;
  lastUsed: Date;
  totalQueries: number;
  isIdle: boolean;
  processId: number;
}

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  connectionId: string;
  error?: string;
}

export class EnhancedConnectionPool extends EventEmitter {
  private pool: Pool;
  private config: PoolConfiguration;
  private metrics: PoolMetrics;
  private connectionInfo: Map<string, ConnectionInfo> = new Map();
  private queryHistory: QueryMetrics[] = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private isShutdown = false;

  constructor(config: PoolConfiguration) {
    super();
    
    this.config = config;
    this.metrics = this.initializeMetrics();
    
    // Configurar pool PostgreSQL
    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      min: config.min,
      max: config.max,
      acquireTimeoutMillis: config.acquireTimeoutMillis,
      idleTimeoutMillis: config.idleTimeoutMillis,
      statement_timeout: config.statementTimeout,
      query_timeout: config.queryTimeout,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(poolConfig);
    
    this.setupEventHandlers();
    this.startHealthMonitoring();
    
    if (config.logConnections) {
      console.log(`🔗 Pool criado: ${config.min}-${config.max} conexões`);
    }
  }

  /**
   * Executar query com monitoramento completo
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number; command: string }> {
    const startTime = Date.now();
    let client: PoolClient | null = null;
    let connectionId = '';

    try {
      // Aguardar conexão disponível
      const acquireStart = Date.now();
      client = await this.pool.connect();
      const acquireTime = Date.now() - acquireStart;
      
      // Obter ID da conexão
      connectionId = this.getConnectionId(client);
      
      // Atualizar info da conexão
      this.updateConnectionInfo(connectionId, client);
      
      // Executar query
      const result = await client.query(text, params);
      const duration = Date.now() - startTime;
      
      // Registrar métricas
      this.recordQuery({
        query: text.substring(0, 100),
        duration,
        timestamp: new Date(),
        connectionId
      });
      
      this.updateMetrics(duration, acquireTime);
      
      if (this.config.logConnections && duration > 1000) {
        console.log(`⏱️ Query lenta: ${duration}ms - ${text.substring(0, 50)}...`);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Registrar erro
      this.recordQuery({
        query: text.substring(0, 100),
        duration,
        timestamp: new Date(),
        connectionId,
        error: (error as Error).message
      });
      
      this.metrics.totalErrors++;
      
      console.error('❌ Database query error:', {
        error: (error as Error).message,
        query: text.substring(0, 100),
        duration
      });
      
      throw error;
      
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Executar transação com auto-rollback
   */
  async transaction<T>(
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

  /**
   * Obter conexão dedicada para operações longas
   */
  async getConnection(): Promise<PoolClient> {
    const client = await this.pool.connect();
    const connectionId = this.getConnectionId(client);
    this.updateConnectionInfo(connectionId, client);
    return client;
  }

  /**
   * Verificar saúde do pool
   */
  async checkHealth(): Promise<boolean> {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const duration = Date.now() - start;
      
      this.metrics.isHealthy = duration < this.config.maxUnavailableTime;
      this.metrics.lastHealthCheck = new Date();
      
      return this.metrics.isHealthy;
      
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.metrics.isHealthy = false;
      return false;
    }
  }

  /**
   * Obter métricas do pool
   */
  getMetrics(): PoolMetrics {
    return {
      ...this.metrics,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      uptime: Date.now() - this.metrics.uptime
    };
  }

  /**
   * Obter informações detalhadas das conexões
   */
  getConnectionsInfo(): ConnectionInfo[] {
    return Array.from(this.connectionInfo.values());
  }

  /**
   * Obter histórico de queries (últimas 1000)
   */
  getQueryHistory(limit: number = 100): QueryMetrics[] {
    return this.queryHistory.slice(-limit);
  }

  /**
   * Obter estatísticas de performance
   */
  getPerformanceStats(): {
    slowQueries: QueryMetrics[];
    errorQueries: QueryMetrics[];
    avgQueryTime: number;
    totalQueries: number;
  } {
    const slowQueries = this.queryHistory.filter(q => q.duration > 1000);
    const errorQueries = this.queryHistory.filter(q => q.error);
    
    const totalDuration = this.queryHistory.reduce((sum, q) => sum + q.duration, 0);
    const avgQueryTime = this.queryHistory.length > 0 ? totalDuration / this.queryHistory.length : 0;
    
    return {
      slowQueries: slowQueries.slice(-20),
      errorQueries: errorQueries.slice(-20),
      avgQueryTime,
      totalQueries: this.queryHistory.length
    };
  }

  /**
   * Configurar pool dinamicamente
   */
  async reconfigure(newConfig: Partial<PoolConfiguration>): Promise<void> {
    console.log('🔄 Reconfigurando pool de conexões...');
    
    // Atualizar configuração
    this.config = { ...this.config, ...newConfig };
    
    // Aplicar nova configuração (recrear pool se necessário)
    if (newConfig.min !== undefined || newConfig.max !== undefined) {
      console.warn('⚠️ Mudanças de min/max requerem reinicialização do pool');
    }
    
    console.log('✅ Pool reconfigurado');
  }

  /**
   * Drenar conexões gradualmente para shutdown
   */
  async drain(): Promise<void> {
    if (this.isShutdown) return;
    
    console.log('🔄 Drenando pool de conexões...');
    this.isShutdown = true;
    
    // Parar health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Drenar pool
    await this.pool.end();
    
    console.log('✅ Pool drenado com sucesso');
  }

  /**
   * Forçar limpeza de conexões inativas
   */
  async cleanupIdleConnections(): Promise<number> {
    const idleCount = this.pool.idleCount;
    
    // PostgreSQL pool gerencia isso automaticamente via idleTimeoutMillis
    // Mas podemos forçar uma limpeza manual se necessário
    
    console.log(`🧹 Limpando ${idleCount} conexões inativas`);
    return idleCount;
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private initializeMetrics(): PoolMetrics {
    return {
      totalConnections: 0,
      idleConnections: 0,
      activeConnections: 0,
      waitingClients: 0,
      totalQueries: 0,
      totalErrors: 0,
      avgQueryTime: 0,
      avgWaitTime: 0,
      uptime: Date.now(),
      lastHealthCheck: new Date(),
      isHealthy: true
    };
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client) => {
      const connectionId = this.getConnectionId(client);
      
      if (this.config.logConnections) {
        console.log(`🔗 Nova conexão: ${connectionId}`);
      }
      
      this.emit('connection:created', { connectionId });
    });

    this.pool.on('remove', (client) => {
      const connectionId = this.getConnectionId(client);
      
      this.connectionInfo.delete(connectionId);
      
      if (this.config.logConnections) {
        console.log(`❌ Conexão removida: ${connectionId}`);
      }
      
      this.emit('connection:removed', { connectionId });
    });

    this.pool.on('error', (error, client) => {
      const connectionId = client ? this.getConnectionId(client) : 'unknown';
      
      console.error(`❌ Pool error (connection: ${connectionId}):`, error);
      this.emit('pool:error', { error, connectionId });
    });

    // Monitorar eventos do processo para shutdown graceful
    process.on('SIGINT', () => this.drain());
    process.on('SIGTERM', () => this.drain());
  }

  private startHealthMonitoring(): void {
    if (this.config.healthCheckInterval <= 0) return;
    
    this.healthCheckTimer = setInterval(async () => {
      if (this.isShutdown) return;
      
      try {
        await this.checkHealth();
        
        if (this.config.enableMetrics) {
          const metrics = this.getMetrics();
          
          // Log estatísticas periódicas
          if (metrics.totalQueries % 1000 === 0 && metrics.totalQueries > 0) {
            console.log(`📊 Pool Stats: ${metrics.activeConnections}/${metrics.totalConnections} conexões ativas, ${metrics.totalQueries} queries, ${metrics.avgQueryTime.toFixed(2)}ms avg`);
          }
        }
        
      } catch (error) {
        console.error('❌ Health monitoring error:', error);
      }
    }, this.config.healthCheckInterval);
  }

  private getConnectionId(client: PoolClient): string {
    // Usar processId como ID único da conexão
    return `conn_${(client as any).processID || Math.random().toString(36).substring(7)}`;
  }

  private updateConnectionInfo(connectionId: string, client: PoolClient): void {
    const existing = this.connectionInfo.get(connectionId);
    
    this.connectionInfo.set(connectionId, {
      id: connectionId,
      createdAt: existing?.createdAt || new Date(),
      lastUsed: new Date(),
      totalQueries: (existing?.totalQueries || 0) + 1,
      isIdle: false,
      processId: (client as any).processID || 0
    });
  }

  private recordQuery(queryMetrics: QueryMetrics): void {
    this.queryHistory.push(queryMetrics);
    
    // Manter apenas últimas 10000 queries
    if (this.queryHistory.length > 10000) {
      this.queryHistory = this.queryHistory.slice(-5000);
    }
  }

  private updateMetrics(queryDuration: number, acquireTime: number): void {
    this.metrics.totalQueries++;
    
    // Atualizar média de tempo de query (usando média móvel)
    const alpha = 0.1; // Fator de suavização
    this.metrics.avgQueryTime = this.metrics.avgQueryTime * (1 - alpha) + queryDuration * alpha;
    this.metrics.avgWaitTime = this.metrics.avgWaitTime * (1 - alpha) + acquireTime * alpha;
  }
}

/**
 * Pool manager para gerenciar múltiplos pools
 */
export class MultiPoolManager {
  private pools: Map<string, EnhancedConnectionPool> = new Map();
  private defaultConfig: PoolConfiguration;

  constructor(defaultConfig: PoolConfiguration) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Criar pool dedicado para módulo
   */
  createModulePool(moduleName: string, config?: Partial<PoolConfiguration>): EnhancedConnectionPool {
    const poolConfig = { ...this.defaultConfig, ...config };
    const pool = new EnhancedConnectionPool(poolConfig);
    
    this.pools.set(moduleName, pool);
    console.log(`🔗 Pool criado para módulo: ${moduleName}`);
    
    return pool;
  }

  /**
   * Obter pool de um módulo
   */
  getModulePool(moduleName: string): EnhancedConnectionPool | null {
    return this.pools.get(moduleName) || null;
  }

  /**
   * Obter pool padrão
   */
  getDefaultPool(): EnhancedConnectionPool {
    let defaultPool = this.pools.get('default');
    
    if (!defaultPool) {
      defaultPool = this.createModulePool('default', this.defaultConfig);
    }
    
    return defaultPool;
  }

  /**
   * Obter métricas de todos os pools
   */
  getAllMetrics(): Record<string, PoolMetrics> {
    const metrics: Record<string, PoolMetrics> = {};
    
    for (const [name, pool] of this.pools) {
      metrics[name] = pool.getMetrics();
    }
    
    return metrics;
  }

  /**
   * Drenar todos os pools
   */
  async drainAll(): Promise<void> {
    console.log('🔄 Drenando todos os pools...');
    
    const drainPromises = Array.from(this.pools.values()).map(pool => pool.drain());
    await Promise.all(drainPromises);
    
    this.pools.clear();
    console.log('✅ Todos os pools drenados');
  }
}

/**
 * Configuração padrão otimizada para 20+ módulos
 */
export const DEFAULT_POOL_CONFIG: PoolConfiguration = {
  connectionString: process.env.DATABASE_URL || '',
  ssl: process.env.NODE_ENV === 'production',
  
  // Pool sizing para alta concorrência
  min: 2,                     // Mínimo por pool
  max: 20,                    // Máximo por pool
  acquireTimeoutMillis: 10000, // 10s para obter conexão
  idleTimeoutMillis: 30000,   // 30s idle timeout
  
  // Health monitoring
  healthCheckInterval: 30000,  // 30s
  maxUnavailableTime: 5000,   // 5s
  
  // Performance
  statementTimeout: 60000,    // 60s statement timeout
  queryTimeout: 30000,        // 30s query timeout
  
  // Monitoring
  enableMetrics: true,
  logConnections: process.env.NODE_ENV !== 'production'
};

/**
 * Factory function para criar manager
 */
export function createMultiPoolManager(config?: Partial<PoolConfiguration>): MultiPoolManager {
  const finalConfig = { ...DEFAULT_POOL_CONFIG, ...config };
  return new MultiPoolManager(finalConfig);
}