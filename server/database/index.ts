// =====================================================================
// SISTEMA COMPLETO DE DATABASE PARA 20+ MÓDULOS - PONTO DE ENTRADA
// Integração de todos os componentes: Migrations + Isolation + Pool + 
// Cache + Security + Backup + Partitioning + Unified API
// =====================================================================

import { Pool } from 'pg';
import { createClient } from 'redis';

// Importar todos os sistemas
import { MigrationSystem, createMigrationSystem } from './migration-system';
import { ModuleIsolationManager, createModuleIsolationManager } from './module-isolation';
import { EnhancedConnectionPool, MultiPoolManager, createMultiPoolManager, DEFAULT_POOL_CONFIG } from './connection-pool';
import { CacheManager, createCacheManager, DEFAULT_CACHE_CONFIG } from './cache-manager';
import { SecurityManager, createSecurityManager } from './security-manager';
import { BackupManager, createBackupManager } from './backup-manager';
import { PartitionManager, createPartitionManager } from './partition-manager';
import { UnifiedDatabase, createUnifiedDatabase } from './unified-api';

export interface PlatformaDatabaseConfig {
  // Database connection
  connectionString: string;
  ssl?: boolean;
  
  // Pool configuration
  poolConfig?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    idleTimeoutMillis?: number;
  };
  
  // Redis configuration
  redisConfig?: {
    url?: string;
    enabled?: boolean;
  };
  
  // Feature flags
  features?: {
    migrations?: boolean;
    isolation?: boolean;
    caching?: boolean;
    security?: boolean;
    backup?: boolean;
    partitioning?: boolean;
  };
  
  // Environment
  environment?: 'development' | 'staging' | 'production';
}

export interface PlatformaDatabaseSystem {
  // Core components
  pool: MultiPoolManager;
  database: UnifiedDatabase;
  
  // Feature systems
  migrations?: MigrationSystem;
  isolation?: ModuleIsolationManager;
  cache?: CacheManager;
  security?: SecurityManager;
  backup?: BackupManager;
  partition?: PartitionManager;
  
  // Methods
  initialize(): Promise<void>;
  createModule(moduleName: string): Promise<ModuleDatabase>;
  getModuleDatabase(moduleName: string): ModuleDatabase | null;
  shutdown(): Promise<void>;
  
  // Health check
  healthCheck(): Promise<DatabaseHealthStatus>;
}

export interface ModuleDatabase {
  moduleName: string;
  schema: string;
  database: UnifiedDatabase;
  
  // Convenience methods for module-specific operations
  select<T>(table: string, options?: any): Promise<T[]>;
  selectOne<T>(table: string, options?: any): Promise<T | null>;
  insert<T>(table: string, data: any, options?: any): Promise<T[]>;
  update<T>(table: string, data: any, options: any): Promise<T[]>;
  delete<T>(table: string, options: any): Promise<T[]>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  
  // Module-specific methods
  runMigrations(): Promise<void>;
  createTable(tableName: string, columns: any[], options?: any): Promise<void>;
  backup(): Promise<void>;
  
  // Cache methods
  clearCache(): Promise<void>;
  invalidateCache(pattern: string): Promise<void>;
}

export interface DatabaseHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy' | 'disabled';
    migrations: 'up-to-date' | 'pending' | 'failed';
  };
  metrics: {
    activeConnections: number;
    totalConnections: number;
    cacheHitRate?: number;
    lastBackup?: Date;
  };
  lastChecked: Date;
}

// ==================== MAIN PLATFORM DATABASE SYSTEM ====================

class PlatformaDatabaseSystemImpl implements PlatformaDatabaseSystem {
  public pool: MultiPoolManager;
  public database: UnifiedDatabase;
  public migrations?: MigrationSystem;
  public isolation?: ModuleIsolationManager;
  public cache?: CacheManager;
  public security?: SecurityManager;
  public backup?: BackupManager;
  public partition?: PartitionManager;

  private config: PlatformaDatabaseConfig;
  private moduledatabases = new Map<string, ModuleDatabase>();
  private initialized = false;

  constructor(config: PlatformaDatabaseConfig) {
    this.config = config;
    
    // Inicializar pool manager
    const poolConfig = {
      ...DEFAULT_POOL_CONFIG,
      connectionString: config.connectionString,
      ssl: config.ssl,
      ...config.poolConfig
    };
    
    this.pool = createMultiPoolManager(poolConfig);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ Database system already initialized');
      return;
    }

    console.log('🚀 Inicializando Plataforma Database System...');
    
    try {
      // 1. Inicializar pool principal
      const mainPool = this.pool.getDefaultPool();
      await mainPool.checkHealth();
      
      // 2. Inicializar Redis se habilitado
      if (this.config.features?.caching !== false && this.config.redisConfig?.enabled !== false) {
        try {
          this.cache = createCacheManager({
            ...DEFAULT_CACHE_CONFIG,
            redis_url: this.config.redisConfig?.url || DEFAULT_CACHE_CONFIG.redis_url
          }, mainPool.pool);
          
          await this.cache.initialize();
          console.log('✅ Cache system initialized');
        } catch (error) {
          console.warn('⚠️ Cache system failed to initialize, continuing without cache:', error);
          this.cache = undefined;
        }
      }

      // 3. Inicializar Migration System
      if (this.config.features?.migrations !== false) {
        this.migrations = createMigrationSystem(mainPool.pool);
        await this.migrations.initialize();
        console.log('✅ Migration system initialized');
      }

      // 4. Inicializar Module Isolation
      if (this.config.features?.isolation !== false) {
        this.isolation = createModuleIsolationManager(mainPool.pool);
        await this.isolation.initialize();
        console.log('✅ Module isolation system initialized');
      }

      // 5. Inicializar Security System
      if (this.config.features?.security !== false) {
        this.security = createSecurityManager(mainPool.pool);
        await this.security.initialize();
        console.log('✅ Security system initialized');
      }

      // 6. Inicializar Backup System
      if (this.config.features?.backup !== false) {
        this.backup = createBackupManager(mainPool.pool);
        await this.backup.initialize();
        console.log('✅ Backup system initialized');
      }

      // 7. Inicializar Partition System
      if (this.config.features?.partitioning !== false) {
        this.partition = createPartitionManager(mainPool.pool);
        await this.partition.initialize();
        console.log('✅ Partition system initialized');
      }

      // 8. Inicializar Unified Database API
      this.database = createUnifiedDatabase({
        pool: mainPool.pool,
        cache: this.cache,
        security: this.security,
        migrations: this.migrations,
        isolation: this.isolation
      });

      console.log('✅ Unified Database API initialized');

      // 9. Executar migrations pendentes se em desenvolvimento
      if (this.config.environment === 'development' && this.migrations) {
        try {
          await this.migrations.runAllMigrations();
        } catch (error) {
          console.warn('⚠️ Some migrations failed:', error);
        }
      }

      this.initialized = true;
      console.log('🎉 Plataforma Database System fully initialized');

    } catch (error) {
      console.error('❌ Failed to initialize database system:', error);
      throw error;
    }
  }

  async createModule(moduleName: string): Promise<ModuleDatabase> {
    if (!this.initialized) {
      throw new Error('Database system not initialized');
    }

    if (this.moduleDatabase.has(moduleName)) {
      throw new Error(`Module ${moduleName} already exists`);
    }

    console.log(`🔧 Creating module database: ${moduleName}`);

    try {
      // 1. Criar pool dedicado para o módulo
      const modulePool = this.pool.createModulePool(moduleName, {
        // Configuração específica do módulo se necessário
      });

      // 2. Criar schema isolado
      let schemaName = `module_${moduleName}`;
      if (this.isolation) {
        schemaName = await this.isolation.createModuleSchema(moduleName);
      }

      // 3. Criar database instance para o módulo
      const moduleDb = new ModuleDatabaseImpl(
        moduleName,
        schemaName,
        createUnifiedDatabase({
          pool: modulePool.pool,
          cache: this.cache,
          security: this.security,
          migrations: this.migrations,
          isolation: this.isolation
        }),
        this
      );

      this.moduleDatabase.set(moduleName, moduleDb);

      console.log(`✅ Module database created: ${moduleName} -> ${schemaName}`);

      return moduleDb;

    } catch (error) {
      console.error(`❌ Failed to create module ${moduleName}:`, error);
      throw error;
    }
  }

  getModuleDatabase(moduleName: string): ModuleDatabase | null {
    return this.moduleDatabase.get(moduleName) || null;
  }

  async healthCheck(): Promise<DatabaseHealthStatus> {
    const status: DatabaseHealthStatus = {
      overall: 'healthy',
      components: {
        database: 'healthy',
        redis: 'disabled',
        migrations: 'up-to-date'
      },
      metrics: {
        activeConnections: 0,
        totalConnections: 0
      },
      lastChecked: new Date()
    };

    try {
      // Check database
      const mainPool = this.pool.getDefaultPool();
      const isHealthy = await mainPool.checkHealth();
      status.components.database = isHealthy ? 'healthy' : 'unhealthy';
      
      const metrics = mainPool.getMetrics();
      status.metrics.activeConnections = metrics.activeConnections;
      status.metrics.totalConnections = metrics.totalConnections;

      // Check Redis
      if (this.cache) {
        try {
          const cacheMetrics = await this.cache.getMetrics();
          status.components.redis = 'healthy';
          status.metrics.cacheHitRate = cacheMetrics.hit_rate;
        } catch (error) {
          status.components.redis = 'unhealthy';
        }
      }

      // Check migrations status
      if (this.migrations) {
        // Implementar verificação de migrations pendentes
      }

      // Determine overall status
      if (status.components.database === 'unhealthy') {
        status.overall = 'unhealthy';
      } else if (status.components.redis === 'unhealthy') {
        status.overall = 'degraded';
      }

    } catch (error) {
      console.error('❌ Health check failed:', error);
      status.overall = 'unhealthy';
      status.components.database = 'unhealthy';
    }

    return status;
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down database system...');

    try {
      // 1. Disconnectar cache
      if (this.cache) {
        await this.cache.disconnect();
      }

      // 2. Drenar todos os pools
      await this.pool.drainAll();

      // 3. Limpar módulos
      this.moduleDatabase.clear();

      this.initialized = false;
      console.log('✅ Database system shutdown complete');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      throw error;
    }
  }
}

// ==================== MODULE DATABASE IMPLEMENTATION ====================

class ModuleDatabaseImpl implements ModuleDatabase {
  public moduleName: string;
  public schema: string;
  public database: UnifiedDatabase;
  
  private system: PlatformaDatabaseSystemImpl;

  constructor(
    moduleName: string,
    schema: string,
    database: UnifiedDatabase,
    system: PlatformaDatabaseSystemImpl
  ) {
    this.moduleName = moduleName;
    this.schema = schema;
    this.database = database;
    this.system = system;
  }

  async select<T>(table: string, options: any = {}): Promise<T[]> {
    return this.database.select<T>(`${this.schema}.${table}`, {
      ...options,
      moduleName: this.moduleName
    });
  }

  async selectOne<T>(table: string, options: any = {}): Promise<T | null> {
    return this.database.selectOne<T>(`${this.schema}.${table}`, {
      ...options,
      moduleName: this.moduleName
    });
  }

  async insert<T>(table: string, data: any, options: any = {}): Promise<T[]> {
    return this.database.insert<T>(`${this.schema}.${table}`, data, {
      ...options,
      moduleName: this.moduleName
    });
  }

  async update<T>(table: string, data: any, options: any): Promise<T[]> {
    return this.database.update<T>(`${this.schema}.${table}`, data, {
      ...options,
      moduleName: this.moduleName
    });
  }

  async delete<T>(table: string, options: any): Promise<T[]> {
    return this.database.delete<T>(`${this.schema}.${table}`, {
      ...options,
      moduleName: this.moduleName
    });
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.database.query<T>(sql, params, {
      moduleName: this.moduleName
    });
    return result.rows;
  }

  async runMigrations(): Promise<void> {
    if (this.system.migrations) {
      await this.system.migrations.runModuleMigrations(this.moduleName);
    }
  }

  async createTable(tableName: string, columns: any[], options: any = {}): Promise<void> {
    return this.database.createTable(
      this.moduleName,
      tableName,
      columns,
      options
    );
  }

  async backup(): Promise<void> {
    if (this.system.backup) {
      await this.system.backup.executeBackup(this.moduleName);
    }
  }

  async clearCache(): Promise<void> {
    if (this.system.cache) {
      await this.system.cache.invalidateModule(this.moduleName);
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (this.system.cache) {
      await this.system.cache.invalidatePattern(`${this.moduleName}:${pattern}`);
    }
  }
}

// ==================== FACTORY FUNCTION ====================

/**
 * Criar sistema completo de database da plataforma
 */
export function createPlatformaDatabaseSystem(
  config: PlatformaDatabaseConfig
): PlatformaDatabaseSystem {
  return new PlatformaDatabaseSystemImpl(config);
}

// ==================== DEFAULT CONFIGURATIONS ====================

export const DEVELOPMENT_CONFIG: PlatformaDatabaseConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/plataforma_dev',
  ssl: false,
  environment: 'development',
  poolConfig: {
    min: 2,
    max: 10
  },
  redisConfig: {
    url: 'redis://localhost:6379',
    enabled: true
  },
  features: {
    migrations: true,
    isolation: true,
    caching: true,
    security: true,
    backup: true,
    partitioning: false // Não usar partitioning em dev
  }
};

export const PRODUCTION_CONFIG: PlatformaDatabaseConfig = {
  connectionString: process.env.DATABASE_URL || '',
  ssl: true,
  environment: 'production',
  poolConfig: {
    min: 5,
    max: 50
  },
  redisConfig: {
    url: process.env.REDIS_URL || '',
    enabled: true
  },
  features: {
    migrations: true,
    isolation: true,
    caching: true,
    security: true,
    backup: true,
    partitioning: true
  }
};

// ==================== EXPORTS ====================

export {
  // Main types
  type PlatformaDatabaseConfig,
  type PlatformaDatabaseSystem,
  type ModuleDatabase,
  type DatabaseHealthStatus,
  
  // Individual systems
  MigrationSystem,
  ModuleIsolationManager,
  EnhancedConnectionPool,
  MultiPoolManager,
  CacheManager,
  SecurityManager,
  BackupManager,
  PartitionManager,
  UnifiedDatabase,
  
  // Factory functions
  createMigrationSystem,
  createModuleIsolationManager,
  createMultiPoolManager,
  createCacheManager,
  createSecurityManager,
  createBackupManager,
  createPartitionManager,
  createUnifiedDatabase
};