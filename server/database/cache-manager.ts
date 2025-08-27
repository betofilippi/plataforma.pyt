// =====================================================================
// SISTEMA DE CACHE AVANÇADO COM REDIS PARA 20+ MÓDULOS
// Multi-level caching + Invalidation strategies + Performance monitoring
// =====================================================================

import { createClient, RedisClientType } from 'redis';
import { Pool } from 'pg';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

export interface CacheConfig {
  redis_url: string;
  default_ttl: number;
  max_memory_policy: 'allkeys-lru' | 'allkeys-lfu' | 'volatile-lru' | 'volatile-lfu';
  key_prefix: string;
  compression_threshold: number; // Bytes
  enable_notifications: boolean;
  cluster_mode: boolean;
}

export interface CacheStrategy {
  module_name: string;
  table_name?: string;
  ttl: number;
  invalidation_strategy: 'time' | 'write' | 'manual' | 'hybrid';
  cache_level: 'memory' | 'redis' | 'both';
  compression: boolean;
  tags: string[];
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  created_at: Date;
  last_accessed: Date;
  access_count: number;
  module_name: string;
  tags: string[];
  size_bytes: number;
  compressed: boolean;
}

export interface CacheMetrics {
  total_keys: number;
  memory_usage_mb: number;
  hit_rate: number;
  miss_rate: number;
  eviction_count: number;
  total_hits: number;
  total_misses: number;
  avg_response_time: number;
  keys_by_module: Record<string, number>;
  top_accessed_keys: string[];
}

export interface InvalidationEvent {
  type: 'key' | 'pattern' | 'tag' | 'module';
  target: string;
  module_name?: string;
  timestamp: Date;
  reason: string;
}

export class CacheManager extends EventEmitter {
  private redis: RedisClientType;
  private pool: Pool;
  private config: CacheConfig;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private strategies: Map<string, CacheStrategy> = new Map();
  private metrics: CacheMetrics;
  private isConnected = false;

  constructor(config: CacheConfig, pool: Pool) {
    super();
    
    this.config = config;
    this.pool = pool;
    this.metrics = this.initializeMetrics();
    
    // Configurar cliente Redis
    this.redis = createClient({
      url: config.redis_url,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    }) as RedisClientType;
    
    this.setupEventHandlers();
  }

  /**
   * Inicializar sistema de cache
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando sistema de cache...');
    
    try {
      // Conectar ao Redis
      await this.redis.connect();
      this.isConnected = true;
      
      // Configurar Redis
      await this.configureRedis();
      
      // Carregar estratégias de cache
      await this.loadCacheStrategies();
      
      // Iniciar monitoramento
      this.startMetricsCollection();
      
      console.log('✅ Sistema de cache inicializado');
      
    } catch (error) {
      console.error('❌ Falha ao inicializar cache:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Registrar estratégia de cache para módulo
   */
  async registerCacheStrategy(strategy: CacheStrategy): Promise<void> {
    const strategyKey = this.getStrategyKey(strategy.module_name, strategy.table_name);
    
    this.strategies.set(strategyKey, strategy);
    
    // Salvar no banco para persistência
    await this.pool.query(`
      INSERT INTO plataforma_cache_strategies (
        module_name, table_name, ttl, invalidation_strategy, 
        cache_level, compression, tags, strategy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (module_name, COALESCE(table_name, ''))
      DO UPDATE SET
        ttl = EXCLUDED.ttl,
        invalidation_strategy = EXCLUDED.invalidation_strategy,
        cache_level = EXCLUDED.cache_level,
        compression = EXCLUDED.compression,
        tags = EXCLUDED.tags,
        strategy = EXCLUDED.strategy,
        updated_at = NOW()
    `, [
      strategy.module_name,
      strategy.table_name,
      strategy.ttl,
      strategy.invalidation_strategy,
      strategy.cache_level,
      strategy.compression,
      JSON.stringify(strategy.tags),
      JSON.stringify(strategy)
    ]);
    
    console.log(`📋 Estratégia de cache registrada: ${strategyKey}`);
  }

  /**
   * Obter valor do cache
   */
  async get<T = any>(key: string, moduleName?: string): Promise<T | null> {
    const startTime = Date.now();
    
    try {
      const strategy = moduleName ? this.getModuleStrategy(moduleName) : null;
      let value: T | null = null;
      
      // Tentar cache em memória primeiro se configurado
      if (strategy?.cache_level === 'both' || strategy?.cache_level === 'memory') {
        value = this.getFromMemoryCache<T>(key);
        if (value !== null) {
          this.recordCacheHit(key, 'memory', Date.now() - startTime);
          return value;
        }
      }
      
      // Tentar Redis se disponível
      if (this.isConnected && (strategy?.cache_level === 'both' || strategy?.cache_level === 'redis' || !strategy)) {
        const cacheKey = this.buildCacheKey(key, moduleName);
        const cached = await this.redis.get(cacheKey);
        
        if (cached) {
          value = this.deserializeValue<T>(cached, strategy?.compression || false);
          
          // Armazenar em cache de memória se configurado
          if (strategy?.cache_level === 'both') {
            this.setMemoryCache(key, value, strategy.ttl, moduleName || 'unknown', strategy.tags);
          }
          
          this.recordCacheHit(key, 'redis', Date.now() - startTime);
          return value;
        }
      }
      
      this.recordCacheMiss(key, Date.now() - startTime);
      return null;
      
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      this.recordCacheMiss(key, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Armazenar valor no cache
   */
  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    moduleName?: string,
    tags?: string[]
  ): Promise<void> {
    
    try {
      const strategy = moduleName ? this.getModuleStrategy(moduleName) : null;
      const finalTtl = ttl || strategy?.ttl || this.config.default_ttl;
      const finalTags = tags || strategy?.tags || [];
      const useCompression = strategy?.compression || false;
      
      // Armazenar em cache de memória se configurado
      if (strategy?.cache_level === 'both' || strategy?.cache_level === 'memory') {
        this.setMemoryCache(key, value, finalTtl, moduleName || 'unknown', finalTags);
      }
      
      // Armazenar no Redis se disponível
      if (this.isConnected && (strategy?.cache_level === 'both' || strategy?.cache_level === 'redis' || !strategy)) {
        const cacheKey = this.buildCacheKey(key, moduleName);
        const serializedValue = this.serializeValue(value, useCompression);
        
        await this.redis.setEx(cacheKey, finalTtl, serializedValue);
        
        // Adicionar tags se especificadas
        if (finalTags.length > 0) {
          await this.addTagsToKey(cacheKey, finalTags);
        }
      }
      
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Cache com fallback para query de banco
   */
  async cacheQuery<T = any>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number;
      moduleName?: string;
      tags?: string[];
      refresh?: boolean;
    } = {}
  ): Promise<T> {
    
    // Se refresh for true, pular cache
    if (!options.refresh) {
      const cached = await this.get<T>(key, options.moduleName);
      if (cached !== null) {
        return cached;
      }
    }
    
    // Executar query
    const startTime = Date.now();
    const result = await queryFn();
    const queryTime = Date.now() - startTime;
    
    // Armazenar no cache
    await this.set(key, result, options.ttl, options.moduleName, options.tags);
    
    console.log(`💾 Query cached: ${key} (${queryTime}ms)`);
    
    return result;
  }

  /**
   * Invalidar cache por chave
   */
  async invalidate(key: string, moduleName?: string): Promise<void> {
    try {
      // Remover do cache de memória
      this.memoryCache.delete(key);
      
      // Remover do Redis
      if (this.isConnected) {
        const cacheKey = this.buildCacheKey(key, moduleName);
        await this.redis.del(cacheKey);
      }
      
      this.emit('cache:invalidated', {
        type: 'key',
        target: key,
        module_name: moduleName,
        timestamp: new Date(),
        reason: 'manual'
      } as InvalidationEvent);
      
    } catch (error) {
      console.error(`❌ Cache invalidation error for key ${key}:`, error);
    }
  }

  /**
   * Invalidar cache por padrão
   */
  async invalidatePattern(pattern: string, moduleName?: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      const searchPattern = this.buildCacheKey(pattern, moduleName);
      
      // Remover do cache de memória
      for (const [key] of this.memoryCache) {
        if (this.matchesPattern(key, pattern)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
      
      // Remover do Redis
      if (this.isConnected) {
        const keys = await this.redis.keys(searchPattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          deletedCount += keys.length;
        }
      }
      
      this.emit('cache:invalidated', {
        type: 'pattern',
        target: pattern,
        module_name: moduleName,
        timestamp: new Date(),
        reason: 'pattern_match'
      } as InvalidationEvent);
      
      console.log(`🗑️ Cache invalidated by pattern: ${pattern} (${deletedCount} keys)`);
      
    } catch (error) {
      console.error(`❌ Pattern invalidation error for ${pattern}:`, error);
    }
    
    return deletedCount;
  }

  /**
   * Invalidar cache por tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      const tagKey = `${this.config.key_prefix}:tags:${tag}`;
      
      if (this.isConnected) {
        // Obter todas as chaves com esta tag
        const keys = await this.redis.sMembers(tagKey);
        
        if (keys.length > 0) {
          // Remover chaves
          await this.redis.del(keys);
          
          // Remover o conjunto de tags
          await this.redis.del(tagKey);
          
          deletedCount = keys.length;
        }
      }
      
      // Remover do cache de memória por tag
      for (const [key, entry] of this.memoryCache) {
        if (entry.tags.includes(tag)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }
      
      this.emit('cache:invalidated', {
        type: 'tag',
        target: tag,
        timestamp: new Date(),
        reason: 'tag_invalidation'
      } as InvalidationEvent);
      
      console.log(`🏷️ Cache invalidated by tag: ${tag} (${deletedCount} keys)`);
      
    } catch (error) {
      console.error(`❌ Tag invalidation error for ${tag}:`, error);
    }
    
    return deletedCount;
  }

  /**
   * Invalidar todo o cache de um módulo
   */
  async invalidateModule(moduleName: string): Promise<number> {
    return this.invalidatePattern(`${moduleName}:*`, moduleName);
  }

  /**
   * Obter métricas do cache
   */
  async getMetrics(): Promise<CacheMetrics> {
    if (!this.isConnected) {
      return this.metrics;
    }
    
    try {
      // Obter informações do Redis
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      const stats = await this.redis.info('stats');
      
      // Parse das informações
      const memoryUsed = this.parseInfoValue(info, 'used_memory') / (1024 * 1024); // MB
      const keyCount = this.parseKeyspaceInfo(keyspace);
      const hits = this.parseInfoValue(stats, 'keyspace_hits');
      const misses = this.parseInfoValue(stats, 'keyspace_misses');
      const evictions = this.parseInfoValue(stats, 'evicted_keys');
      
      // Calcular hit rate
      const totalRequests = hits + misses;
      const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;
      
      this.metrics = {
        ...this.metrics,
        total_keys: keyCount,
        memory_usage_mb: memoryUsed,
        hit_rate: hitRate,
        miss_rate: 100 - hitRate,
        eviction_count: evictions,
        total_hits: hits,
        total_misses: misses
      };
      
    } catch (error) {
      console.error('❌ Error fetching cache metrics:', error);
    }
    
    return this.metrics;
  }

  /**
   * Limpar todo o cache
   */
  async clear(): Promise<void> {
    try {
      // Limpar cache de memória
      this.memoryCache.clear();
      
      // Limpar Redis
      if (this.isConnected) {
        await this.redis.flushDb();
      }
      
      console.log('🧹 Cache limpo completamente');
      
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Desconectar e limpar recursos
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.redis.disconnect();
        this.isConnected = false;
      }
      
      this.memoryCache.clear();
      
      console.log('👋 Cache disconnected');
      
    } catch (error) {
      console.error('❌ Error disconnecting cache:', error);
    }
  }

  // ==================== MÉTODOS PRIVADOS ====================

  private initializeMetrics(): CacheMetrics {
    return {
      total_keys: 0,
      memory_usage_mb: 0,
      hit_rate: 0,
      miss_rate: 0,
      eviction_count: 0,
      total_hits: 0,
      total_misses: 0,
      avg_response_time: 0,
      keys_by_module: {},
      top_accessed_keys: []
    };
  }

  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis conectado');
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis error:', error);
      this.isConnected = false;
    });

    this.redis.on('disconnect', () => {
      console.log('🔌 Redis desconectado');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Redis reconectando...');
    });
  }

  private async configureRedis(): Promise<void> {
    try {
      // Configurar política de memória
      await this.redis.configSet('maxmemory-policy', this.config.max_memory_policy);
      
      // Habilitar notificações se configurado
      if (this.config.enable_notifications) {
        await this.redis.configSet('notify-keyspace-events', 'Ex');
      }
      
      console.log('⚙️ Redis configurado');
      
    } catch (error) {
      console.error('❌ Error configuring Redis:', error);
    }
  }

  private async loadCacheStrategies(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT * FROM plataforma_cache_strategies WHERE enabled = true
      `);
      
      for (const row of result.rows) {
        const strategy: CacheStrategy = {
          module_name: row.module_name,
          table_name: row.table_name,
          ttl: row.ttl,
          invalidation_strategy: row.invalidation_strategy,
          cache_level: row.cache_level,
          compression: row.compression,
          tags: row.tags || []
        };
        
        const strategyKey = this.getStrategyKey(strategy.module_name, strategy.table_name);
        this.strategies.set(strategyKey, strategy);
      }
      
      console.log(`📋 ${this.strategies.size} estratégias de cache carregadas`);
      
    } catch (error) {
      console.error('❌ Error loading cache strategies:', error);
    }
  }

  private startMetricsCollection(): void {
    // Coletar métricas a cada 30 segundos
    setInterval(() => {
      this.collectMetrics();
    }, 30000);
  }

  private async collectMetrics(): Promise<void> {
    try {
      await this.getMetrics();
      
      // Emitir evento de métricas para monitoramento
      this.emit('metrics:collected', this.metrics);
      
    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  private getStrategyKey(moduleName: string, tableName?: string): string {
    return tableName ? `${moduleName}:${tableName}` : moduleName;
  }

  private getModuleStrategy(moduleName: string, tableName?: string): CacheStrategy | null {
    const specificKey = this.getStrategyKey(moduleName, tableName);
    const generalKey = moduleName;
    
    return this.strategies.get(specificKey) || this.strategies.get(generalKey) || null;
  }

  private buildCacheKey(key: string, moduleName?: string): string {
    const parts = [this.config.key_prefix];
    
    if (moduleName) {
      parts.push(moduleName);
    }
    
    parts.push(key);
    
    return parts.join(':');
  }

  private getFromMemoryCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Verificar TTL
    const now = new Date();
    const expired = now.getTime() - entry.created_at.getTime() > entry.ttl * 1000;
    
    if (expired) {
      this.memoryCache.delete(key);
      return null;
    }
    
    // Atualizar estatísticas de acesso
    entry.last_accessed = now;
    entry.access_count++;
    
    return entry.value as T;
  }

  private setMemoryCache(
    key: string, 
    value: any, 
    ttl: number, 
    moduleName: string, 
    tags: string[]
  ): void {
    const entry: CacheEntry = {
      key,
      value,
      ttl,
      created_at: new Date(),
      last_accessed: new Date(),
      access_count: 1,
      module_name: moduleName,
      tags,
      size_bytes: JSON.stringify(value).length,
      compressed: false
    };
    
    this.memoryCache.set(key, entry);
    
    // Limpar cache de memória se muito grande (manter últimos 10000)
    if (this.memoryCache.size > 10000) {
      const oldest = Array.from(this.memoryCache.keys())[0];
      this.memoryCache.delete(oldest);
    }
  }

  private serializeValue(value: any, useCompression: boolean): string {
    const json = JSON.stringify(value);
    
    if (useCompression && json.length > this.config.compression_threshold) {
      // Implementar compressão se necessário
      // Por ora, retornar JSON normal
      return json;
    }
    
    return json;
  }

  private deserializeValue<T>(cached: string, compressed: boolean): T {
    if (compressed) {
      // Implementar descompressão se necessário
    }
    
    return JSON.parse(cached) as T;
  }

  private async addTagsToKey(cacheKey: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `${this.config.key_prefix}:tags:${tag}`;
      await this.redis.sAdd(tagKey, cacheKey);
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Implementar matching de padrão simples
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  private recordCacheHit(key: string, source: 'memory' | 'redis', responseTime: number): void {
    this.metrics.total_hits++;
    this.metrics.avg_response_time = (this.metrics.avg_response_time + responseTime) / 2;
  }

  private recordCacheMiss(key: string, responseTime: number): void {
    this.metrics.total_misses++;
    this.metrics.avg_response_time = (this.metrics.avg_response_time + responseTime) / 2;
  }

  private parseInfoValue(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1]) : 0;
  }

  private parseKeyspaceInfo(keyspace: string): number {
    const match = keyspace.match(/keys=(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
}

/**
 * Configuração padrão otimizada
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  redis_url: process.env.REDIS_URL || 'redis://localhost:6379',
  default_ttl: 3600, // 1 hora
  max_memory_policy: 'allkeys-lru',
  key_prefix: 'plataforma',
  compression_threshold: 1024, // 1KB
  enable_notifications: true,
  cluster_mode: false
};

/**
 * Factory function
 */
export function createCacheManager(config: Partial<CacheConfig>, pool: Pool): CacheManager {
  const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
  return new CacheManager(finalConfig, pool);
}