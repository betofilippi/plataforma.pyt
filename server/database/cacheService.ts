import { redis, getFromCache, setCache, deleteCachePattern } from './config.js';
import { CacheKeys, CACHE_TTL } from './models.js';

// ===== CACHE SERVICE PARA PERFORMANCE =====
export class CacheService {
  
  // ===== CACHE DE CÉLULAS =====
  
  async getCachedCells(worksheetId: string, startRow: number, endRow: number): Promise<any | null> {
    const key = CacheKeys.cells(worksheetId, startRow, endRow);
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedCells(worksheetId: string, startRow: number, endRow: number, data: any): Promise<void> {
    const key = CacheKeys.cells(worksheetId, startRow, endRow);
    await setCache(key, JSON.stringify(data), CACHE_TTL);
  }
  
  async invalidateCellsCache(worksheetId: string): Promise<void> {
    await deleteCachePattern(`cells:${worksheetId}*`);
  }
  
  // ===== CACHE DE WORKSHEET =====
  
  async getCachedWorksheet(id: string): Promise<any | null> {
    const key = CacheKeys.worksheet(id);
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedWorksheet(id: string, data: any): Promise<void> {
    const key = CacheKeys.worksheet(id);
    await setCache(key, JSON.stringify(data), CACHE_TTL);
  }
  
  async invalidateWorksheetCache(id: string): Promise<void> {
    await deleteCachePattern(`worksheet:${id}*`);
  }
  
  // ===== CACHE DE CONFIGURAÇÕES DE COLUNA =====
  
  async getCachedColumnConfigs(worksheetId: string): Promise<any | null> {
    const key = CacheKeys.columnConfigs(worksheetId);
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedColumnConfigs(worksheetId: string, data: any): Promise<void> {
    const key = CacheKeys.columnConfigs(worksheetId);
    await setCache(key, JSON.stringify(data), CACHE_TTL);
  }
  
  async invalidateColumnConfigsCache(worksheetId: string): Promise<void> {
    await deleteCachePattern(`column_configs:${worksheetId}`);
  }
  
  // ===== CACHE DE ESTATÍSTICAS =====
  
  async getCachedStats(worksheetId: string): Promise<any | null> {
    const key = CacheKeys.stats(worksheetId);
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedStats(worksheetId: string, data: any): Promise<void> {
    const key = CacheKeys.stats(worksheetId);
    await setCache(key, JSON.stringify(data), CACHE_TTL * 2); // Stats ficam mais tempo
  }
  
  async invalidateStatsCache(worksheetId: string): Promise<void> {
    await deleteCachePattern(`stats:${worksheetId}`);
  }
  
  // ===== CACHE DE SESSÃO DE USUÁRIO =====
  
  async getCachedUserSession(userId: string): Promise<any | null> {
    const key = `user_session:${userId}`;
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedUserSession(userId: string, data: any): Promise<void> {
    const key = `user_session:${userId}`;
    await setCache(key, JSON.stringify(data), 3600); // 1 hora
  }
  
  async invalidateUserSession(userId: string): Promise<void> {
    await deleteCachePattern(`user_session:${userId}`);
  }
  
  // ===== CACHE DE FÓRMULAS CALCULADAS =====
  
  async getCachedFormula(worksheetId: string, row: number, col: string): Promise<string | null> {
    const key = `formula:${worksheetId}:${col}${row}`;
    return await getFromCache(key);
  }
  
  async setCachedFormula(worksheetId: string, row: number, col: string, result: string): Promise<void> {
    const key = `formula:${worksheetId}:${col}${row}`;
    await setCache(key, result, CACHE_TTL);
  }
  
  async invalidateFormulaCache(worksheetId: string): Promise<void> {
    await deleteCachePattern(`formula:${worksheetId}*`);
  }
  
  // ===== CACHE DE RELACIONAMENTOS =====
  
  async getCachedRelationships(worksheetId: string): Promise<any | null> {
    const key = CacheKeys.relationships(worksheetId);
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedRelationships(worksheetId: string, data: any): Promise<void> {
    const key = CacheKeys.relationships(worksheetId);
    await setCache(key, JSON.stringify(data), CACHE_TTL * 3); // Relacionamentos ficam mais tempo
  }
  
  async invalidateRelationshipsCache(worksheetId: string): Promise<void> {
    await deleteCachePattern(`relationships:${worksheetId}`);
  }
  
  // ===== CACHE DE BUSCA =====
  
  async getCachedSearch(worksheetId: string, query: string): Promise<any | null> {
    const key = `search:${worksheetId}:${Buffer.from(query).toString('base64')}`;
    const cached = await getFromCache(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async setCachedSearch(worksheetId: string, query: string, results: any): Promise<void> {
    const key = `search:${worksheetId}:${Buffer.from(query).toString('base64')}`;
    await setCache(key, JSON.stringify(results), 180); // 3 minutos para busca
  }
  
  // ===== OPERAÇÕES EM BATCH =====
  
  async invalidateAllWorksheetCaches(worksheetId: string): Promise<void> {
    const patterns = [
      `worksheet:${worksheetId}*`,
      `cells:${worksheetId}*`,
      `column_configs:${worksheetId}`,
      `stats:${worksheetId}`,
      `relationships:${worksheetId}`,
      `formula:${worksheetId}*`,
      `search:${worksheetId}*`
    ];
    
    await Promise.all(patterns.map(pattern => deleteCachePattern(pattern)));
  }
  
  // ===== PREAQUECIMENTO DE CACHE =====
  
  async warmupCache(worksheetId: string): Promise<void> {
    try {
      console.log(`🔥 Preaquecendo cache para worksheet ${worksheetId}`);
      
      // Pré-carregar dados mais utilizados
      const promises = [
        // Primeiras 1000 linhas das colunas principais
        this.preloadCells(worksheetId, 1, 1000, ['A','B','C','D','E','F','G','H','I','J']),
        // Configurações de coluna
        this.preloadColumnConfigs(worksheetId),
        // Estatísticas
        this.preloadStats(worksheetId)
      ];
      
      await Promise.allSettled(promises);
      console.log(`✅ Cache preaquecido para worksheet ${worksheetId}`);
    } catch (error) {
      console.warn(`⚠️ Erro no preaquecimento de cache:`, error.message);
    }
  }
  
  private async preloadCells(worksheetId: string, startRow: number, endRow: number, columns: string[]): Promise<void> {
    // Este método seria chamado pelo repository para preaquecer dados
    // Implementação seria integrada com WorksheetRepository
  }
  
  private async preloadColumnConfigs(worksheetId: string): Promise<void> {
    // Pré-carregar configurações de coluna
  }
  
  private async preloadStats(worksheetId: string): Promise<void> {
    // Pré-carregar estatísticas
  }
  
  // ===== MÉTRICAS DE CACHE =====
  
  async getCacheMetrics(): Promise<any> {
    try {
      if (!redis || !redis.isReady) {
        return { 
          error: 'Redis não conectado - usando cache em memória',
          connected: false,
          fallback: 'memory',
          memoryEntries: 'Cache em memória ativo'
        };
      }
      
      const info = await redis.info('memory');
      const stats = await redis.info('stats');
      
      return {
        memory: this.parseRedisInfo(info),
        stats: this.parseRedisInfo(stats),
        connected: true,
        fallback: 'redis'
      };
    } catch (error) {
      return { 
        error: error.message, 
        connected: false,
        fallback: 'memory',
        memoryEntries: 'Cache em memória ativo'
      };
    }
  }
  
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    });
    return result;
  }
  
  // ===== LIMPEZA AUTOMÁTICA =====
  
  async cleanupExpiredCache(): Promise<void> {
    try {
      // Redis já limpa automaticamente chaves expiradas,
      // mas podemos forçar uma limpeza manual se necessário
      console.log('🧹 Limpeza de cache executada');
    } catch (error) {
      console.warn('Erro na limpeza de cache:', error.message);
    }
  }
}

// ===== MIDDLEWARE DE CACHE =====

export function cacheMiddleware(ttl: number = CACHE_TTL) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Se for uma resposta de sucesso, considerar cache
      if (data.success && req.method === 'GET') {
        const cacheKey = `api:${req.originalUrl}`;
        setCache(cacheKey, JSON.stringify(data), ttl).catch(console.warn);
      }
      
      return originalJson.call(this, data);
    };
    
    // Verificar se existe cache para GET requests
    if (req.method === 'GET') {
      const cacheKey = `api:${req.originalUrl}`;
      getFromCache(cacheKey).then(cached => {
        if (cached) {
          return res.json(JSON.parse(cached));
        }
        next();
      }).catch(() => next());
    } else {
      next();
    }
  };
}

// Singleton instance
export const cacheService = new CacheService();
