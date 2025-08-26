/**
 * Module loader hook - Main hook for loading and managing modules
 */

import { useCallback } from 'react';
import { useModuleContext } from '../react/ModuleProvider';
import type { UseModuleLoaderResult } from '../types';

/**
 * Hook for module loading operations
 */
export function useModuleLoader(): UseModuleLoaderResult {
  const { registry, cache, communication, lifecycleHandlers } = useModuleContext();

  const loadModule = useCallback(async (name: string, url?: string) => {
    try {
      // Call lifecycle handler
      await lifecycleHandlers.onModuleLoad?.(name);

      // Register module if URL provided
      if (url && !registry.getModule(name)) {
        await registry.register(name, url);
      }

      // Load the module
      const module = await registry.load(name);

      // Call ready handler
      await lifecycleHandlers.onModuleReady?.(name, module);

      return module;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await lifecycleHandlers.onModuleError?.(name, err);
      throw err;
    }
  }, [registry, lifecycleHandlers]);

  const unloadModule = useCallback(async (name: string) => {
    try {
      await lifecycleHandlers.onModuleUnload?.(name);
      await registry.unload(name);
      cache.delete(name);
    } catch (error) {
      console.error(`Failed to unload module "${name}":`, error);
      throw error;
    }
  }, [registry, cache, lifecycleHandlers]);

  const isLoaded = useCallback((name: string) => {
    return registry.isLoaded(name);
  }, [registry]);

  const getModuleState = useCallback((name: string) => {
    const moduleInfo = registry.getModule(name);
    if (!moduleInfo) return 'unloaded';
    
    switch (moduleInfo.status) {
      case 'loading':
        return 'loading';
      case 'loaded':
        return 'loaded';
      case 'error':
        return 'error';
      default:
        return 'unloaded';
    }
  }, [registry]);

  const listModules = useCallback(() => {
    return registry.listModules().map(module => module.name);
  }, [registry]);

  return {
    loadModule,
    unloadModule,
    isLoaded,
    getModuleState,
    listModules,
    registry,
    cache,
    communication
  };
}