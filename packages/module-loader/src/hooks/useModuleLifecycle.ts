/**
 * Module lifecycle hook - Hook for handling module lifecycle events
 */

import { useEffect, useCallback, useRef } from 'react';
import { useModuleContext } from '../react/ModuleProvider';
import type { ModuleLifecycleEvents } from '../types';

/**
 * Hook for module lifecycle management
 */
export function useModuleLifecycle(
  moduleName: string,
  handlers: Partial<ModuleLifecycleEvents> = {}
) {
  const { communication } = useModuleContext();
  const handlersRef = useRef(handlers);
  
  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Register for lifecycle events
  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Module load events
    if (handlersRef.current.onModuleLoad) {
      const unsubscribe = communication.on('module:state-change', async (event) => {
        if (event.payload.moduleName === moduleName && 
            event.payload.newState === 'loading') {
          await handlersRef.current.onModuleLoad?.(moduleName);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module ready events
    if (handlersRef.current.onModuleReady) {
      const unsubscribe = communication.on('module:ready', async (event) => {
        if (event.payload.moduleName === moduleName) {
          await handlersRef.current.onModuleReady?.(moduleName, event.payload.module);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module error events
    if (handlersRef.current.onModuleError) {
      const unsubscribe = communication.on('module:error', async (event) => {
        if (event.payload.moduleName === moduleName) {
          await handlersRef.current.onModuleError?.(moduleName, event.payload.error);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module unload events
    if (handlersRef.current.onModuleUnload) {
      const unsubscribe = communication.on('module:state-change', async (event) => {
        if (event.payload.moduleName === moduleName && 
            event.payload.newState === 'unloaded') {
          await handlersRef.current.onModuleUnload?.(moduleName);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module update events
    if (handlersRef.current.onModuleUpdate) {
      const unsubscribe = communication.on('module:update', async (event) => {
        if (event.payload.moduleName === moduleName) {
          await handlersRef.current.onModuleUpdate?.(
            moduleName, 
            event.payload.oldModule, 
            event.payload.newModule
          );
        }
      });
      unsubscribes.push(unsubscribe);
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [moduleName, communication]);

  // Manual trigger functions
  const triggerLoad = useCallback(() => {
    communication.emit('module:state-change', {
      moduleName,
      oldState: 'unloaded',
      newState: 'loading'
    }, 'user');
  }, [moduleName, communication]);

  const triggerReady = useCallback((module: any) => {
    communication.emit('module:ready', {
      moduleName,
      module
    }, 'user');
  }, [moduleName, communication]);

  const triggerError = useCallback((error: Error) => {
    communication.emit('module:error', {
      moduleName,
      error
    }, 'user');
  }, [moduleName, communication]);

  const triggerUnload = useCallback(() => {
    communication.emit('module:state-change', {
      moduleName,
      oldState: 'loaded',
      newState: 'unloaded'
    }, 'user');
  }, [moduleName, communication]);

  const triggerUpdate = useCallback((oldModule: any, newModule: any) => {
    communication.emit('module:update', {
      moduleName,
      oldModule,
      newModule
    }, 'user');
  }, [moduleName, communication]);

  return {
    triggerLoad,
    triggerReady,
    triggerError,
    triggerUnload,
    triggerUpdate
  };
}

/**
 * Hook for global lifecycle events (all modules)
 */
export function useGlobalModuleLifecycle(handlers: Partial<ModuleLifecycleEvents> = {}) {
  const { communication } = useModuleContext();
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    // Module load events
    if (handlersRef.current.onModuleLoad) {
      const unsubscribe = communication.on('module:state-change', async (event) => {
        if (event.payload.newState === 'loading') {
          await handlersRef.current.onModuleLoad?.(event.payload.moduleName);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module ready events
    if (handlersRef.current.onModuleReady) {
      const unsubscribe = communication.on('module:ready', async (event) => {
        await handlersRef.current.onModuleReady?.(
          event.payload.moduleName, 
          event.payload.module
        );
      });
      unsubscribes.push(unsubscribe);
    }

    // Module error events
    if (handlersRef.current.onModuleError) {
      const unsubscribe = communication.on('module:error', async (event) => {
        await handlersRef.current.onModuleError?.(
          event.payload.moduleName, 
          event.payload.error
        );
      });
      unsubscribes.push(unsubscribe);
    }

    // Module unload events
    if (handlersRef.current.onModuleUnload) {
      const unsubscribe = communication.on('module:state-change', async (event) => {
        if (event.payload.newState === 'unloaded') {
          await handlersRef.current.onModuleUnload?.(event.payload.moduleName);
        }
      });
      unsubscribes.push(unsubscribe);
    }

    // Module update events
    if (handlersRef.current.onModuleUpdate) {
      const unsubscribe = communication.on('module:update', async (event) => {
        await handlersRef.current.onModuleUpdate?.(
          event.payload.moduleName,
          event.payload.oldModule,
          event.payload.newModule
        );
      });
      unsubscribes.push(unsubscribe);
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [communication]);
}

/**
 * Hook for module lifecycle statistics
 */
export function useModuleLifecycleStats() {
  const { communication } = useModuleContext();
  const [stats, setStats] = React.useState({
    totalLoads: 0,
    totalErrors: 0,
    totalUnloads: 0,
    totalUpdates: 0,
    averageLoadTime: 0,
    moduleStats: new Map<string, {
      loads: number;
      errors: number;
      unloads: number;
      updates: number;
      lastLoadTime?: number;
      totalLoadTime: number;
    }>()
  });

  useEffect(() => {
    const loadTimes = new Map<string, number>();
    
    const unsubscribes = [
      // Track load starts
      communication.on('module:state-change', (event) => {
        if (event.payload.newState === 'loading') {
          loadTimes.set(event.payload.moduleName, Date.now());
        }
      }),

      // Track successful loads
      communication.on('module:ready', (event) => {
        const startTime = loadTimes.get(event.payload.moduleName);
        const loadTime = startTime ? Date.now() - startTime : 0;
        
        setStats(prevStats => {
          const moduleStats = new Map(prevStats.moduleStats);
          const current = moduleStats.get(event.payload.moduleName) || {
            loads: 0,
            errors: 0,
            unloads: 0,
            updates: 0,
            totalLoadTime: 0
          };
          
          current.loads++;
          current.lastLoadTime = loadTime;
          current.totalLoadTime += loadTime;
          
          moduleStats.set(event.payload.moduleName, current);
          
          return {
            ...prevStats,
            totalLoads: prevStats.totalLoads + 1,
            moduleStats,
            averageLoadTime: Array.from(moduleStats.values())
              .reduce((sum, stats) => sum + (stats.totalLoadTime / stats.loads), 0) / moduleStats.size
          };
        });
        
        loadTimes.delete(event.payload.moduleName);
      }),

      // Track errors
      communication.on('module:error', (event) => {
        setStats(prevStats => {
          const moduleStats = new Map(prevStats.moduleStats);
          const current = moduleStats.get(event.payload.moduleName) || {
            loads: 0,
            errors: 0,
            unloads: 0,
            updates: 0,
            totalLoadTime: 0
          };
          
          current.errors++;
          moduleStats.set(event.payload.moduleName, current);
          
          return {
            ...prevStats,
            totalErrors: prevStats.totalErrors + 1,
            moduleStats
          };
        });
        
        loadTimes.delete(event.payload.moduleName);
      }),

      // Track unloads
      communication.on('module:state-change', (event) => {
        if (event.payload.newState === 'unloaded') {
          setStats(prevStats => {
            const moduleStats = new Map(prevStats.moduleStats);
            const current = moduleStats.get(event.payload.moduleName) || {
              loads: 0,
              errors: 0,
              unloads: 0,
              updates: 0,
              totalLoadTime: 0
            };
            
            current.unloads++;
            moduleStats.set(event.payload.moduleName, current);
            
            return {
              ...prevStats,
              totalUnloads: prevStats.totalUnloads + 1,
              moduleStats
            };
          });
        }
      }),

      // Track updates
      communication.on('module:update', (event) => {
        setStats(prevStats => {
          const moduleStats = new Map(prevStats.moduleStats);
          const current = moduleStats.get(event.payload.moduleName) || {
            loads: 0,
            errors: 0,
            unloads: 0,
            updates: 0,
            totalLoadTime: 0
          };
          
          current.updates++;
          moduleStats.set(event.payload.moduleName, current);
          
          return {
            ...prevStats,
            totalUpdates: prevStats.totalUpdates + 1,
            moduleStats
          };
        });
      })
    ];

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [communication]);

  const getModuleStats = useCallback((moduleName: string) => {
    return stats.moduleStats.get(moduleName) || {
      loads: 0,
      errors: 0,
      unloads: 0,
      updates: 0,
      totalLoadTime: 0
    };
  }, [stats.moduleStats]);

  const resetStats = useCallback(() => {
    setStats({
      totalLoads: 0,
      totalErrors: 0,
      totalUnloads: 0,
      totalUpdates: 0,
      averageLoadTime: 0,
      moduleStats: new Map()
    });
  }, []);

  return {
    stats,
    getModuleStats,
    resetStats
  };
}