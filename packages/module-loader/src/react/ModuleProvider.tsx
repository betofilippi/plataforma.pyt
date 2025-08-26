/**
 * Module Provider - Context provider for module state and configuration
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getGlobalLoader } from '@plataforma/vite-plugin-module-federation';
import { createModuleCache } from '../cache';
import { createModuleCommunication } from '../communication';
import type {
  ModuleProviderProps,
  ModuleLoaderConfig,
  ModuleLoaderContext,
  ModuleLifecycleState,
  ModuleLifecycleEvents,
  ModuleRegistry,
  ModuleCache,
  ModuleCommunication
} from '../types';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ModuleLoaderConfig = {
  cache: {
    maxSize: 100,
    defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
    enablePersistence: true,
    enableVersionCheck: true
  },
  communication: {
    enablePersistence: true,
    maxEventHistory: 1000,
    enableEventReplay: true
  },
  timeout: 30000,
  retries: 3,
  enableHMR: true
};

/**
 * Module context
 */
const ModuleContext = createContext<ModuleLoaderContext | null>(null);

/**
 * Module Provider component
 */
export function ModuleProvider({ config = {}, children }: ModuleProviderProps) {
  const [context, setContext] = useState<ModuleLoaderContext | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleLifecycleState>>({});

  // Initialize context
  useEffect(() => {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    
    // Get or create registry
    const registry = getGlobalLoader();
    
    // Create cache and communication
    const cache = createModuleCache(mergedConfig.cache);
    const communication = createModuleCommunication(mergedConfig.communication);

    // Set up lifecycle handlers
    const lifecycleHandlers: ModuleLifecycleEvents = {
      onModuleLoad: (moduleName) => {
        setModuleStates(prev => ({ ...prev, [moduleName]: 'loading' }));
        communication.emit('module:state-change', { 
          moduleName, 
          oldState: 'unloaded', 
          newState: 'loading' 
        }, 'system');
      },
      
      onModuleReady: (moduleName, module) => {
        setModuleStates(prev => ({ ...prev, [moduleName]: 'loaded' }));
        communication.emit('module:ready', { moduleName, module }, 'system');
        communication.emit('module:state-change', { 
          moduleName, 
          oldState: 'loading', 
          newState: 'loaded' 
        }, 'system');
      },
      
      onModuleError: (moduleName, error) => {
        setModuleStates(prev => ({ ...prev, [moduleName]: 'error' }));
        communication.emit('module:error', { moduleName, error }, 'system');
        communication.emit('module:state-change', { 
          moduleName, 
          oldState: 'loading', 
          newState: 'error' 
        }, 'system');
      },
      
      onModuleUnload: (moduleName) => {
        setModuleStates(prev => ({ ...prev, [moduleName]: 'unloaded' }));
        communication.emit('module:state-change', { 
          moduleName, 
          oldState: 'loaded', 
          newState: 'unloaded' 
        }, 'system');
      }
    };

    const moduleContext: ModuleLoaderContext = {
      registry,
      cache,
      communication,
      config: mergedConfig,
      state: moduleStates,
      lifecycleHandlers
    };

    setContext(moduleContext);

    // Clean up cache periodically
    const cleanupInterval = setInterval(() => {
      cache.cleanup?.();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [config]);

  // Update context when module states change
  useEffect(() => {
    if (context) {
      setContext(prev => prev ? { ...prev, state: moduleStates } : null);
    }
  }, [moduleStates, context]);

  if (!context) {
    return <div>Initializing module system...</div>;
  }

  return (
    <ModuleContext.Provider value={context}>
      {children}
    </ModuleContext.Provider>
  );
}

/**
 * Hook to use module context
 */
export function useModuleContext(): ModuleLoaderContext {
  const context = useContext(ModuleContext);
  
  if (!context) {
    throw new Error('useModuleContext must be used within a ModuleProvider');
  }
  
  return context;
}

/**
 * Hook to access module registry
 */
export function useModuleRegistry(): ModuleRegistry {
  const { registry } = useModuleContext();
  return registry;
}

/**
 * Hook to access module cache
 */
export function useModuleCache(): ModuleCache {
  const { cache } = useModuleContext();
  return cache;
}

/**
 * Hook to access module communication
 */
export function useModuleCommunication(): ModuleCommunication {
  const { communication } = useModuleContext();
  return communication;
}