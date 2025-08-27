/**
 * useModule Hook
 * Hook React para usar o Module Registry de forma fácil e reativa
 * 
 * Funcionalidades:
 * - Carregamento automático de módulos
 * - Estado reativo do carregamento
 * - Suspense integration
 * - Error boundaries
 * - Cache automático
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { moduleRegistry, type LoadedModule, type ModuleConfig } from './moduleRegistry';

export interface UseModuleOptions {
  autoLoad?: boolean;
  suspense?: boolean;
  retryOnError?: boolean;
  retryDelay?: number;
  maxRetries?: number;
}

export interface UseModuleReturn {
  module: LoadedModule | null;
  component: React.ComponentType<any> | null;
  isLoading: boolean;
  isLoaded: boolean;
  isError: boolean;
  error: Error | null;
  config: ModuleConfig | null;
  loadModule: () => Promise<void>;
  reloadModule: () => Promise<void>;
  unloadModule: () => void;
}

/**
 * Hook principal para usar módulos
 */
export function useModule(moduleId: string, options: UseModuleOptions = {}): UseModuleReturn {
  const {
    autoLoad = true,
    suspense = false,
    retryOnError = true,
    retryDelay = 2000,
    maxRetries = 3
  } = options;

  const [module, setModule] = useState<LoadedModule | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Memoizar configuração do módulo
  const config = useMemo(() => {
    const configs = moduleRegistry.getAllModules();
    return configs.find(c => c.id === moduleId) || null;
  }, [moduleId]);

  // Função para carregar módulo
  const loadModule = useCallback(async () => {
    try {
      const loadedModule = await moduleRegistry.loadModule(moduleId);
      setModule(loadedModule);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error(`Failed to load module ${moduleId}:`, error);
      
      // Retry logic
      if (retryOnError && retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadModule();
        }, retryDelay);
      }
    }
  }, [moduleId, retryOnError, retryCount, maxRetries, retryDelay]);

  // Função para recarregar módulo (force reload)
  const reloadModule = useCallback(async () => {
    setModule(null);
    const loadedModule = await moduleRegistry.loadModule(moduleId, true);
    setModule(loadedModule);
  }, [moduleId]);

  // Função para descarregar módulo
  const unloadModule = useCallback(() => {
    moduleRegistry.unloadModule(moduleId);
    setModule(null);
  }, [moduleId]);

  // Auto-load no mount
  useEffect(() => {
    if (!config) {
      console.warn(`Module config not found: ${moduleId}`);
      return;
    }

    if (autoLoad) {
      // Verificar se já está carregado
      const existingModule = moduleRegistry.getModule(moduleId);
      if (existingModule) {
        setModule(existingModule);
      } else {
        loadModule();
      }
    }
  }, [moduleId, config, autoLoad, loadModule]);

  // Computed values
  const isLoading = module?.status === 'loading' || (!module && autoLoad);
  const isLoaded = module?.status === 'loaded';
  const isError = module?.status === 'error';
  const error = module?.error || null;
  const component = isLoaded ? module?.component || null : null;

  // Suspense integration
  if (suspense && isLoading) {
    throw loadModule(); // Promise para Suspense
  }

  return {
    module,
    component,
    isLoading,
    isLoaded,
    isError,
    error,
    config,
    loadModule,
    reloadModule,
    unloadModule
  };
}

/**
 * Hook para usar múltiplos módulos
 */
export function useModules(moduleIds: string[], options: UseModuleOptions = {}) {
  const [modules, setModules] = useState<Record<string, LoadedModule | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loadModules = useCallback(async () => {
    const newModules: Record<string, LoadedModule | null> = {};
    const newLoading: Record<string, boolean> = {};

    // Inicializar states
    moduleIds.forEach(id => {
      newLoading[id] = true;
    });
    setLoading(newLoading);

    // Carregar todos os módulos em paralelo
    const promises = moduleIds.map(async (moduleId) => {
      try {
        const module = await moduleRegistry.loadModule(moduleId);
        newModules[moduleId] = module;
        newLoading[moduleId] = false;
      } catch (error) {
        console.error(`Failed to load module ${moduleId}:`, error);
        newModules[moduleId] = null;
        newLoading[moduleId] = false;
      }
    });

    await Promise.all(promises);
    
    setModules(newModules);
    setLoading(newLoading);
  }, [moduleIds]);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadModules();
    }
  }, [loadModules, options.autoLoad]);

  return {
    modules,
    loading,
    loadModules,
    isAllLoaded: Object.values(loading).every(l => !l),
    hasErrors: Object.values(modules).some(m => m?.status === 'error')
  };
}

/**
 * Hook para listar módulos por categoria
 */
export function useModulesByCategory(category: string) {
  const [modules, setModules] = useState<ModuleConfig[]>([]);

  useEffect(() => {
    const categoryModules = moduleRegistry.getModulesByCategory(category);
    setModules(categoryModules);
  }, [category]);

  return modules;
}

/**
 * Hook para obter estatísticas do registry
 */
export function useModuleRegistry() {
  const [stats, setStats] = useState(moduleRegistry.getStats());

  const refreshStats = useCallback(() => {
    setStats(moduleRegistry.getStats());
  }, []);

  useEffect(() => {
    refreshStats();
    
    // Atualizar stats periodicamente em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(refreshStats, 1000);
      return () => clearInterval(interval);
    }
  }, [refreshStats]);

  return {
    stats,
    refreshStats,
    registerModule: moduleRegistry.registerModule.bind(moduleRegistry),
    unregisterModule: moduleRegistry.unregisterModule.bind(moduleRegistry),
    clearCache: moduleRegistry.clearCache.bind(moduleRegistry),
    getAllModules: moduleRegistry.getAllModules.bind(moduleRegistry),
    getLoadedModules: moduleRegistry.getLoadedModules.bind(moduleRegistry)
  };
}

/**
 * Hook para detectar mudanças em módulos (hot reload)
 */
export function useModuleHotReload(moduleId: string, callback?: () => void) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && import.meta.hot) {
      const handleHotReload = () => {
        console.log(`🔥 Hot reload detected for module: ${moduleId}`);
        callback?.();
      };

      import.meta.hot.on('module-updated', handleHotReload);
      
      return () => {
        import.meta.hot?.off('module-updated', handleHotReload);
      };
    }
  }, [moduleId, callback]);
}

/**
 * Hook para lazy loading com Suspense
 */
export function useLazyModule(moduleId: string) {
  const { component, isLoading, error } = useModule(moduleId, { 
    suspense: true,
    autoLoad: true 
  });

  if (error) {
    throw error; // Para Error Boundary
  }

  return component;
}

/**
 * Higher-Order Component para carregar módulos
 */
export function withModule<P extends object>(
  moduleId: string, 
  options: UseModuleOptions = {}
) {
  return function ModuleWrapper(WrappedComponent: React.ComponentType<P>) {
    return function WithModuleComponent(props: P) {
      const moduleData = useModule(moduleId, options);
      
      return (
        <WrappedComponent 
          {...props} 
          moduleData={moduleData}
        />
      );
    };
  };
}

// Export hooks
export default useModule;