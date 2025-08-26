/**
 * Rate Limit Monitor - Monitora e exibe status de rate limiting
 */

import { getCacheStatus } from './api-utils';

interface RateLimitStatus {
  endpoint: string;
  requests: number;
  remaining: number;
  resetTime: number;
  cacheHits: number;
  cacheSize: number;
}

// Monitoramento global
let rateLimitStats = new Map<string, { requests: number; cacheHits: number; errors: number }>();

/**
 * Registrar requisição
 */
export function trackRequest(endpoint: string, fromCache: boolean = false, error: boolean = false): void {
  const current = rateLimitStats.get(endpoint) || { requests: 0, cacheHits: 0, errors: 0 };
  
  if (error) {
    current.errors++;
  } else if (fromCache) {
    current.cacheHits++;
  } else {
    current.requests++;
  }
  
  rateLimitStats.set(endpoint, current);
}

/**
 * Obter estatísticas
 */
export function getRateLimitStats(): any {
  const cacheStatus = getCacheStatus();
  
  return {
    requests: Array.from(rateLimitStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      ...stats,
      efficiency: stats.cacheHits / (stats.requests + stats.cacheHits) * 100
    })),
    cache: cacheStatus,
    summary: {
      totalRequests: Array.from(rateLimitStats.values()).reduce((sum, stats) => sum + stats.requests, 0),
      totalCacheHits: Array.from(rateLimitStats.values()).reduce((sum, stats) => sum + stats.cacheHits, 0),
      totalErrors: Array.from(rateLimitStats.values()).reduce((sum, stats) => sum + stats.errors, 0),
      cacheEfficiency: Array.from(rateLimitStats.values()).reduce((sum, stats) => sum + stats.cacheHits, 0) / 
                      Array.from(rateLimitStats.values()).reduce((sum, stats) => sum + stats.requests + stats.cacheHits, 1) * 100
    }
  };
}

/**
 * Limpar estatísticas
 */
export function clearStats(): void {
  rateLimitStats.clear();
  console.log('📊 Estatísticas de rate limiting limpas');
}

/**
 * Exibir relatório no console
 */
export function printRateLimitReport(): void {
  const stats = getRateLimitStats();
  
  console.group('📊 Relatório de Rate Limiting');
  console.log('Resumo:', stats.summary);
  console.log('Cache Efficiency:', `${stats.summary.cacheEfficiency.toFixed(1)}%`);
  console.log('Cache Status:', stats.cache);
  console.groupCollapsed('Detalhes por Endpoint:');
  stats.requests.forEach((req: any) => {
    console.log(`${req.endpoint}: ${req.requests} req, ${req.cacheHits} cache (${req.efficiency.toFixed(1)}%), ${req.errors} erros`);
  });
  console.groupEnd();
  console.groupEnd();
}

/**
 * Monitor automático a cada 30 segundos
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    const stats = getRateLimitStats();
    if (stats.summary.totalRequests + stats.summary.totalCacheHits > 0) {
      console.log(`🚀 Cache Efficiency: ${stats.summary.cacheEfficiency.toFixed(1)}% | Requests: ${stats.summary.totalRequests} | Cache Hits: ${stats.summary.totalCacheHits} | Errors: ${stats.summary.totalErrors}`);
    }
  }, 30000);
  
  // Comando global para debug
  (window as any).rateLimitReport = printRateLimitReport;
  (window as any).clearRateLimitStats = clearStats;
}