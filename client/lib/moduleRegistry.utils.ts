/**
 * Module Registry Utilities
 * Funções utilitárias para o sistema de módulos
 */

import type { 
  ModuleConfig, 
  LoadedModule, 
  ModuleFilter, 
  ModuleSearchResult,
  ModuleDependency,
  ModuleCategory,
  ModuleStatus
} from './types/module-types';

/**
 * Valida se um módulo tem todas as propriedades obrigatórias
 */
export function validateModuleConfig(config: Partial<ModuleConfig>): config is ModuleConfig {
  const required = ['id', 'name', 'icon', 'component'];
  
  for (const field of required) {
    if (!config[field as keyof ModuleConfig]) {
      console.error(`Module validation failed: Missing required field "${field}"`, config);
      return false;
    }
  }
  
  // Validar ID (sem espaços, caracteres especiais)
  if (!/^[a-z0-9_]+$/.test(config.id!)) {
    console.error(`Module validation failed: Invalid ID format "${config.id}". Use only lowercase, numbers and underscore.`);
    return false;
  }
  
  return true;
}

/**
 * Gera um ID único para módulo baseado no nome
 */
export function generateModuleId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Substitui espaços por underscore
    .replace(/_{2,}/g, '_') // Remove underscores duplos
    .replace(/^_|_$/g, ''); // Remove underscores do início/fim
}

/**
 * Filtra módulos baseado em critérios
 */
export function filterModules(
  modules: ModuleConfig[], 
  filter: ModuleFilter
): ModuleConfig[] {
  let filtered = [...modules];
  
  // Filtro por categoria
  if (filter.category) {
    filtered = filtered.filter(m => m.category === filter.category);
  }
  
  // Filtro por tags
  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter(m => 
      m.tags && filter.tags!.some(tag => m.tags!.includes(tag))
    );
  }
  
  // Filtro por busca textual
  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    filtered = filtered.filter(m => 
      m.name.toLowerCase().includes(searchLower) ||
      m.description?.toLowerCase().includes(searchLower) ||
      m.id.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtro por autor
  if (filter.author) {
    filtered = filtered.filter(m => 
      m.metadata?.author?.toLowerCase() === filter.author!.toLowerCase()
    );
  }
  
  return filtered;
}

/**
 * Busca paginada de módulos
 */
export function searchModules(
  modules: ModuleConfig[],
  filter: ModuleFilter,
  page: number = 1,
  pageSize: number = 20
): ModuleSearchResult {
  const filtered = filterModules(modules, filter);
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    modules: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    hasMore: end < filtered.length
  };
}

/**
 * Resolve dependências de um módulo
 */
export function resolveDependencies(
  moduleId: string,
  allModules: ModuleConfig[],
  resolved: string[] = [],
  unresolved: string[] = []
): string[] {
  unresolved.push(moduleId);
  
  const module = allModules.find(m => m.id === moduleId);
  if (!module || !module.dependencies) {
    resolved.push(moduleId);
    unresolved.splice(unresolved.indexOf(moduleId), 1);
    return resolved;
  }
  
  for (const dep of module.dependencies) {
    if (!resolved.includes(dep.id)) {
      if (unresolved.includes(dep.id)) {
        throw new Error(`Circular dependency detected: ${dep.id} -> ${moduleId}`);
      }
      
      resolveDependencies(dep.id, allModules, resolved, unresolved);
    }
  }
  
  resolved.push(moduleId);
  unresolved.splice(unresolved.indexOf(moduleId), 1);
  
  return resolved;
}

/**
 * Detecta dependências circulares
 */
export function detectCircularDependencies(modules: ModuleConfig[]): string[][] {
  const circularDeps: string[][] = [];
  
  for (const module of modules) {
    try {
      resolveDependencies(module.id, modules);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Circular dependency')) {
        const match = error.message.match(/Circular dependency detected: (.+) -> (.+)/);
        if (match) {
          circularDeps.push([match[1], match[2]]);
        }
      }
    }
  }
  
  return circularDeps;
}

/**
 * Ordena módulos por prioridade de carregamento
 */
export function sortModulesByPriority(modules: ModuleConfig[]): ModuleConfig[] {
  const priorityOrder: ModuleCategory[] = [
    'core',
    'business', 
    'administrative',
    'support',
    'integration',
    'external'
  ];
  
  return [...modules].sort((a, b) => {
    // Primeiro por categoria
    const categoryA = priorityOrder.indexOf(a.category || 'external');
    const categoryB = priorityOrder.indexOf(b.category || 'external');
    
    if (categoryA !== categoryB) {
      return categoryA - categoryB;
    }
    
    // Depois por nome
    return a.name.localeCompare(b.name);
  });
}

/**
 * Calcula estatísticas de performance de módulos
 */
export function calculateModulePerformance(modules: LoadedModule[]) {
  const loadedModules = modules.filter(m => m.status === 'loaded');
  
  if (loadedModules.length === 0) {
    return {
      averageLoadTime: 0,
      totalMemoryUsage: 0,
      cacheHitRate: 0,
      slowestModule: null,
      fastestModule: null
    };
  }
  
  const loadTimes = loadedModules.map(m => m.loadTime || 0);
  const memoryUsages = loadedModules.map(m => m.memoryUsage || 0);
  const cachedCount = modules.filter(m => m.cached).length;
  
  return {
    averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
    totalMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0),
    cacheHitRate: cachedCount / modules.length,
    slowestModule: loadedModules.find(m => m.loadTime === Math.max(...loadTimes)),
    fastestModule: loadedModules.find(m => m.loadTime === Math.min(...loadTimes))
  };
}

/**
 * Gera relatório de status dos módulos
 */
export function generateModuleStatusReport(modules: LoadedModule[]) {
  const statusCounts: Record<ModuleStatus, number> = {
    loading: 0,
    loaded: 0,
    error: 0,
    unloaded: 0,
    installing: 0,
    updating: 0
  };
  
  const errors: Array<{ moduleId: string; error: string }> = [];
  const warnings: Array<{ moduleId: string; warning: string }> = [];
  
  modules.forEach(module => {
    statusCounts[module.status]++;
    
    if (module.error) {
      errors.push({
        moduleId: module.id,
        error: module.error.message
      });
    }
    
    if (module.warnings && module.warnings.length > 0) {
      module.warnings.forEach(warning => {
        warnings.push({
          moduleId: module.id,
          warning
        });
      });
    }
  });
  
  return {
    timestamp: new Date().toISOString(),
    totalModules: modules.length,
    statusCounts,
    errors,
    warnings,
    performance: calculateModulePerformance(modules)
  };
}

/**
 * Converte path relativo para absoluto do módulo
 */
export function resolveModulePath(componentPath: string): string {
  // Se já é absoluto, retornar como está
  if (componentPath.startsWith('/') || componentPath.startsWith('http')) {
    return componentPath;
  }
  
  // Adicionar prefix baseado no ambiente
  const base = process.env.NODE_ENV === 'development' 
    ? '/src' 
    : '';
    
  return `${base}/${componentPath}`;
}

/**
 * Cria cache key para um módulo
 */
export function createModuleCacheKey(
  moduleId: string, 
  version?: string,
  config?: Partial<ModuleConfig>
): string {
  const parts = [
    'module',
    moduleId,
    version || '1.0.0',
    process.env.NODE_ENV,
  ];
  
  if (config) {
    parts.push(JSON.stringify(config).slice(0, 50));
  }
  
  return parts.join(':');
}

/**
 * Limpa cache expirado
 */
export function cleanupExpiredCache(
  cache: Map<string, any>,
  expirationTime: number = 1000 * 60 * 30 // 30 minutos
) {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  cache.forEach((value, key) => {
    if (value.timestamp && (now - value.timestamp) > expirationTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cache.delete(key));
  
  return keysToDelete.length;
}

/**
 * Verifica compatibilidade de versão de módulo
 */
export function checkModuleCompatibility(
  requiredVersion: string,
  availableVersion: string
): boolean {
  // Implementação simples - pode ser melhorada com semver
  const parseVersion = (v: string) => {
    return v.split('.').map(n => parseInt(n, 10));
  };
  
  const required = parseVersion(requiredVersion);
  const available = parseVersion(availableVersion);
  
  // Major version deve ser igual, minor/patch podem ser maiores
  return (
    available[0] === required[0] &&
    (available[1] > required[1] || 
     (available[1] === required[1] && available[2] >= required[2]))
  );
}

/**
 * Cria componente de fallback dinâmico
 */
export function createDynamicFallback(
  moduleId: string,
  config?: ModuleConfig,
  error?: Error
) {
  return function DynamicFallback() {
    const iconMap: Record<string, string> = {
      'loading': '⏳',
      'error': '⚠️',
      'notfound': '📦',
      'default': '🔧'
    };
    
    const type = error ? 'error' : 'loading';
    const icon = iconMap[type] || iconMap.default;
    const title = error ? 'Erro no Módulo' : 'Carregando Módulo';
    const description = error 
      ? error.message 
      : `Carregando ${config?.name || moduleId}...`;
    
    return React.createElement('div', {
      className: 'flex items-center justify-center h-64 text-center',
      children: React.createElement('div', {
        className: error ? 'text-red-400' : 'text-gray-400',
        children: [
          React.createElement('div', {
            key: 'icon',
            className: 'text-4xl mb-4',
            children: icon
          }),
          React.createElement('h3', {
            key: 'title',
            className: 'text-lg font-medium mb-2',
            children: title
          }),
          React.createElement('p', {
            key: 'desc',
            className: 'text-sm',
            children: description
          }),
          config && React.createElement('p', {
            key: 'id',
            className: 'text-xs text-gray-500 mt-1',
            children: `ID: ${moduleId}`
          })
        ]
      })
    });
  };
}

/**
 * Debug helpers para desenvolvimento
 */
export const debugHelpers = {
  logModuleRegistry: (registry: any) => {
    console.group('🔍 Module Registry Debug');
    console.log('Total modules:', registry.getAllModules().length);
    console.log('Loaded modules:', registry.getLoadedModules().length);
    console.log('Stats:', registry.getStats());
    console.groupEnd();
  },
  
  logModuleLoad: (moduleId: string, startTime: number) => {
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Module "${moduleId}" loaded in ${loadTime}ms`);
  },
  
  logModuleError: (moduleId: string, error: Error) => {
    console.group(`❌ Module Error: ${moduleId}`);
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }
};

export default {
  validateModuleConfig,
  generateModuleId,
  filterModules,
  searchModules,
  resolveDependencies,
  detectCircularDependencies,
  sortModulesByPriority,
  calculateModulePerformance,
  generateModuleStatusReport,
  resolveModulePath,
  createModuleCacheKey,
  cleanupExpiredCache,
  checkModuleCompatibility,
  createDynamicFallback,
  debugHelpers
};