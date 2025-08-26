/**
 * Module state hook - Hook for managing individual module state
 */

import { useState, useEffect, useCallback } from 'react';
import { useModuleContext } from '../react/ModuleProvider';
import type { UseModuleStateResult, ModuleLifecycleState } from '../types';

/**
 * Hook for managing individual module state
 */
export function useModuleState(moduleName: string, moduleUrl?: string): UseModuleStateResult {
  const { registry, communication, lifecycleHandlers } = useModuleContext();
  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [state, setState] = useState<ModuleLifecycleState>('unloaded');

  // Load module function
  const loadModule = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setState('loading');

      // Call lifecycle handler
      await lifecycleHandlers.onModuleLoad?.(moduleName);

      // Register if URL provided
      if (moduleUrl && !registry.getModule(moduleName)) {
        await registry.register(moduleName, moduleUrl);
      }

      // Load the module
      const loadedModule = await registry.load(moduleName);
      
      setModule(loadedModule);
      setState('loaded');
      
      // Call ready handler
      await lifecycleHandlers.onModuleReady?.(moduleName, loadedModule);

      return loadedModule;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setState('error');
      
      // Call error handler
      await lifecycleHandlers.onModuleError?.(moduleName, error);
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [moduleName, moduleUrl, registry, lifecycleHandlers]);

  // Reload module function
  const reload = useCallback(async () => {
    try {
      setState('updating');
      
      // Unload first if loaded
      if (module) {
        await registry.unload(moduleName);
        setModule(null);
      }

      // Reload
      await loadModule();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setState('error');
      throw error;
    }
  }, [moduleName, module, registry, loadModule]);

  // Unload module function
  const unload = useCallback(async () => {
    try {
      setState('unloading');
      
      // Call lifecycle handler
      await lifecycleHandlers.onModuleUnload?.(moduleName);
      
      // Unload from registry
      await registry.unload(moduleName);
      
      setModule(null);
      setError(null);
      setState('unloaded');
    } catch (err) {
      console.error(`Failed to unload module "${moduleName}":`, err);
      setState('error');
    }
  }, [moduleName, registry, lifecycleHandlers]);

  // Listen for state changes from communication system
  useEffect(() => {
    const unsubscribe = communication.on('module:state-change', (event) => {
      if (event.payload.moduleName === moduleName) {
        setState(event.payload.newState);
      }
    });

    return unsubscribe;
  }, [moduleName, communication]);

  // Listen for module ready events
  useEffect(() => {
    const unsubscribe = communication.on('module:ready', (event) => {
      if (event.payload.moduleName === moduleName) {
        setModule(event.payload.module);
        setState('loaded');
        setError(null);
      }
    });

    return unsubscribe;
  }, [moduleName, communication]);

  // Listen for module error events
  useEffect(() => {
    const unsubscribe = communication.on('module:error', (event) => {
      if (event.payload.moduleName === moduleName) {
        setError(event.payload.error);
        setState('error');
      }
    });

    return unsubscribe;
  }, [moduleName, communication]);

  // Auto-load module if URL provided and not loaded
  useEffect(() => {
    if (moduleUrl && !module && !loading && state === 'unloaded') {
      loadModule().catch(console.error);
    }
  }, [moduleUrl, module, loading, state, loadModule]);

  return {
    module,
    loading,
    error,
    state,
    reload,
    unload
  };
}