import { Pool, PoolConfig } from 'pg';
import Redis from 'redis';

// ===== CONFIGURAÇÃO POSTGRESQL =====
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'planilha_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL para produção
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Pool de conexões PostgreSQL
export const db = new Pool(dbConfig);

// ===== CONFIGURAÇÃO REDIS (OPCIONAL) =====
let redis: ReturnType<typeof Redis.createClient> | null = null;

const redisEnabled = process.env.DISABLE_REDIS !== 'true';

if (redisEnabled) {
  try {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      db: 0, // database number
      socket: {
        connectTimeout: 2000,
      }
    };

    // Cliente Redis (opcional)
    redis = Redis.createClient(redisConfig);

    // Handle Redis connection errors gracefully
    redis.on('error', (error) => {
      console.warn('⚠️ Redis connection error:', error.message);
      // Don't set redis to null here as it might reconnect
    });

    redis.on('connect', () => {
      console.log('✅ Redis cache connected');
    });

    redis.on('disconnect', () => {
      console.log('🔌 Redis cache disconnected');
    });

  } catch (error) {
    console.warn('⚠️ Failed to create Redis client, running without cache:', error);
    redis = null;
  }
} else {
  console.log('🚫 Redis cache disabled via DISABLE_REDIS environment variable');
}

export { redis };

// ===== INICIALIZAÇÃO =====
export async function initializeDatabase() {
  let postgresConnected = false;
  let redisConnected = false;
  
  try {
    console.log('🔗 Conectando ao PostgreSQL...');
    
    // Testar conexão PostgreSQL
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL conectado:', result.rows[0].now);
    postgresConnected = true;
    
    // Conectar Redis se disponível
    if (redis) {
      try {
        console.log('🔗 Conectando ao Redis...');
        
        if (!redis.isOpen) {
          await redis.connect();
        }
        
        console.log('✅ Redis conectado');
        redisConnected = true;
      } catch (redisError) {
        console.warn('⚠️ Redis connection failed, continuing without cache:', redisError);
      }
    } else {
      console.log('ℹ️ Redis não configurado - continuando apenas com PostgreSQL');
    }
    
    if (postgresConnected && redisConnected) {
      return 'full'; // Both connected
    } else if (postgresConnected) {
      return 'partial'; // PostgreSQL ok, Redis failed or disabled
    } else {
      throw new Error('PostgreSQL connection failed');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar bancos de dados:', error);
    
    if (!postgresConnected) {
      throw error; // PostgreSQL is required
    }
    
    return 'partial';
  }
}

// ===== UTILITÁRIOS =====

// In-memory cache fallback
const memoryCache = new Map<string, { value: string; expiry: number }>();

// Clean up expired memory cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Cache helper com fallback
export async function getFromCache(key: string): Promise<string | null> {
  try {
    if (redis && redis.isReady) {
      return await redis.get(key);
    }
  } catch (error) {
    console.warn('Redis cache miss:', error.message);
  }
  
  // Fallback to memory cache
  const entry = memoryCache.get(key);
  if (entry && entry.expiry > Date.now()) {
    return entry.value;
  }
  
  if (entry && entry.expiry <= Date.now()) {
    memoryCache.delete(key); // Clean up expired entry
  }
  
  return null;
}

export async function setCache(key: string, value: string, ttl: number = 300): Promise<void> {
  try {
    if (redis && redis.isReady) {
      await redis.setEx(key, ttl, value);
      return;
    }
  } catch (error) {
    console.warn('Redis cache set failed:', error.message);
  }
  
  // Fallback to memory cache
  const expiry = Date.now() + (ttl * 1000);
  memoryCache.set(key, { value, expiry });
  
  // Limit memory cache size to prevent memory leaks
  if (memoryCache.size > 1000) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    if (redis && redis.isReady) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return;
    }
  } catch (error) {
    console.warn('Redis cache delete failed:', error.message);
  }
  
  // Fallback to memory cache - simple pattern matching
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}

// Cleanup ao encerrar
process.on('beforeExit', async () => {
  console.log('🔄 Fechando conexões de banco...');
  await db.end();
  if (redis && redis.isReady) {
    await redis.disconnect();
  }
  // Clear memory cache
  memoryCache.clear();
});

export default { db, redis, initializeDatabase };
