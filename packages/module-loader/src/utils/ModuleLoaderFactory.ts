/**
 * Module loader factory - Creates integrated module loader with cache and communication
 */

import { getGlobalLoader } from '@plataforma/vite-plugin-module-federation';
import { createModuleCache } from '../cache';
import { createModuleCommunication } from '../communication';
import type { 
  ModuleLoaderFactory, 
  ModuleLoaderConfig, 
  ModuleLoaderContext,
  ModuleLifecycleState,
  ModuleLifecycleEvents
} from '../types';

/**
 * Create a complete module loader system
 */
export const createModuleLoader: ModuleLoaderFactory = (config = {}) => {
  // Get or create module registry
  const registry = getGlobalLoader();
  
  // Create cache and communication
  const cache = createModuleCache(config.cache);
  const communication = createModuleCommunication(config.communication);

  // Set up lifecycle handlers
  const lifecycleHandlers: ModuleLifecycleEvents = {
    onModuleLoad: async (moduleName: string) => {
      console.log(`[ModuleLoader] Loading module: ${moduleName}`);
      communication.emit('module:state-change', {
        moduleName,
        oldState: 'unloaded' as ModuleLifecycleState,
        newState: 'loading' as ModuleLifecycleState
      }, 'system');
    },

    onModuleReady: async (moduleName: string, module: any) => {
      console.log(`[ModuleLoader] Module ready: ${moduleName}`);
      
      // Cache the module
      cache.set(moduleName, {
        name: moduleName,
        version: module.version || '1.0.0',
        module,
        timestamp: Date.now(),
        metadata: {
          loadedAt: new Date().toISOString()
        }
      });

      // Register module for communication
      communication.registerModule?.(moduleName);

      // Emit ready event
      communication.emit('module:ready', { moduleName, module }, 'system');
      communication.emit('module:state-change', {
        moduleName,
        oldState: 'loading' as ModuleLifecycleState,
        newState: 'loaded' as ModuleLifecycleState
      }, 'system');
    },

    onModuleError: async (moduleName: string, error: Error) => {
      console.error(`[ModuleLoader] Module error: ${moduleName}`, error);
      
      // Emit error event
      communication.emit('module:error', { moduleName, error }, 'system');
      communication.emit('module:state-change', {
        moduleName,
        oldState: 'loading' as ModuleLifecycleState,
        newState: 'error' as ModuleLifecycleState
      }, 'system');
    },

    onModuleUnload: async (moduleName: string) => {
      console.log(`[ModuleLoader] Unloading module: ${moduleName}`);
      
      // Remove from cache
      cache.delete(moduleName);
      
      // Unregister from communication
      communication.unregisterModule?.(moduleName);

      // Emit unload event
      communication.emit('module:state-change', {
        moduleName,
        oldState: 'loaded' as ModuleLifecycleState,
        newState: 'unloaded' as ModuleLifecycleState
      }, 'system');
    },

    onModuleUpdate: async (moduleName: string, oldModule: any, newModule: any) => {
      console.log(`[ModuleLoader] Module updated: ${moduleName}`);
      
      // Update cache
      const existingEntry = cache.get(moduleName);
      if (existingEntry) {
        cache.set(moduleName, {
          ...existingEntry,
          module: newModule,
          timestamp: Date.now(),
          metadata: {
            ...existingEntry.metadata,
            updatedAt: new Date().toISOString(),
            updateCount: (existingEntry.metadata?.updateCount || 0) + 1
          }
        });
      }

      // Emit update event
      communication.emit('module:update', { 
        moduleName, 
        oldModule, 
        newModule 
      }, 'system');
    }
  };

  // Create context
  const context: ModuleLoaderContext = {
    registry,
    cache,
    communication,
    config: {
      cache: {
        maxSize: 100,
        defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
        enablePersistence: true,
        enableVersionCheck: true,
        ...config.cache
      },
      communication: {
        enablePersistence: true,
        maxEventHistory: 1000,
        enableEventReplay: true,
        debug: false,
        ...config.communication
      },
      timeout: 30000,
      retries: 3,
      enableHMR: true,
      ...config
    },
    state: {},
    lifecycleHandlers
  };

  // Set up HMR support if enabled
  if (config.enableHMR !== false && typeof window !== 'undefined') {
    setupHMRSupport(context);
  }

  // Set up error recovery
  setupErrorRecovery(context);

  // Set up performance monitoring
  setupPerformanceMonitoring(context);

  return {
    registry,
    cache,
    communication,
    context
  };
};

/**
 * Set up Hot Module Replacement support
 */
function setupHMRSupport(context: ModuleLoaderContext) {
  const { registry, communication, lifecycleHandlers } = context;

  // Listen for HMR updates
  if (typeof (import.meta as any).hot !== 'undefined') {
    (import.meta as any).hot.on('module-update', async (data: any) => {
      const { moduleName, url } = data;
      
      try {
        console.log(`[HMR] Updating module: ${moduleName}`);
        
        // Get old module
        const oldModule = registry.getModule(moduleName)?.module;
        
        // Unload current module
        await registry.unload(moduleName);
        
        // Re-register and load
        await registry.register(moduleName, url);
        const newModule = await registry.load(moduleName);
        
        // Trigger update lifecycle
        await lifecycleHandlers.onModuleUpdate?.(moduleName, oldModule, newModule);
        
      } catch (error) {
        console.error(`[HMR] Failed to update module ${moduleName}:`, error);
        communication.emit('hmr:error', { moduleName, error }, 'system');
      }
    });
  }

  // Set up WebSocket HMR if in development
  if (context.config.dev?.verbose) {
    setupWebSocketHMR(context);
  }
}

/**
 * Set up WebSocket HMR connection
 */
function setupWebSocketHMR(context: ModuleLoaderContext) {
  try {
    const ws = new WebSocket('ws://localhost:3030/__module_hmr__');
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'module-update') {
          const { moduleName, url } = message.data;
          
          // Trigger HMR update
          const oldModule = context.registry.getModule(moduleName)?.module;
          await context.registry.unload(moduleName);
          await context.registry.register(moduleName, url);
          const newModule = await context.registry.load(moduleName);
          
          await context.lifecycleHandlers.onModuleUpdate?.(
            moduleName, 
            oldModule, 
            newModule
          );
        }
      } catch (error) {
        console.warn('[HMR] Failed to process WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.warn('[HMR] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[HMR] WebSocket connection closed, attempting reconnection...');
      setTimeout(() => setupWebSocketHMR(context), 5000);
    };
    
  } catch (error) {
    console.warn('[HMR] Failed to setup WebSocket connection:', error);
  }
}

/**
 * Set up error recovery mechanisms
 */
function setupErrorRecovery(context: ModuleLoaderContext) {
  const { communication } = context;

  // Listen for module errors
  communication.on('module:error', async (event) => {
    const { moduleName, error } = event.payload;
    
    // Implement retry strategy
    const retryCount = (context.state[moduleName + '_retries'] || 0);
    const maxRetries = context.config.retries || 3;
    
    if (retryCount < maxRetries) {
      console.log(`[ErrorRecovery] Retrying module ${moduleName} (attempt ${retryCount + 1}/${maxRetries})`);
      
      context.state[moduleName + '_retries'] = retryCount + 1;
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      
      setTimeout(async () => {
        try {
          await context.registry.load(moduleName);
          // Reset retry count on success
          delete context.state[moduleName + '_retries'];
        } catch (retryError) {
          console.error(`[ErrorRecovery] Retry failed for ${moduleName}:`, retryError);
        }
      }, delay);
    } else {
      console.error(`[ErrorRecovery] Max retries exceeded for module ${moduleName}`);
      communication.emit('module:recovery-failed', { moduleName, error }, 'system');
    }
  });

  // Global error handler for unhandled module errors
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[ModuleLoader] Unhandled promise rejection:', event.reason);
      communication.emit('system:unhandled-error', { error: event.reason }, 'system');
    });
  }
}

/**
 * Set up performance monitoring
 */
function setupPerformanceMonitoring(context: ModuleLoaderContext) {
  const { communication } = context;
  
  if (!context.config.dev?.verbose) {
    return; // Only enable in verbose mode
  }

  const performanceData = new Map<string, {
    startTime: number;
    loadTime?: number;
    size?: number;
  }>();

  // Track load start times
  communication.on('module:state-change', (event) => {
    if (event.payload.newState === 'loading') {
      performanceData.set(event.payload.moduleName, {
        startTime: performance.now()
      });
    }
  });

  // Track load completion times
  communication.on('module:ready', (event) => {
    const { moduleName, module } = event.payload;
    const data = performanceData.get(moduleName);
    
    if (data) {
      const loadTime = performance.now() - data.startTime;
      data.loadTime = loadTime;
      
      // Estimate module size
      try {
        data.size = JSON.stringify(module).length;
      } catch {
        data.size = 0;
      }

      console.log(`[Performance] Module ${moduleName} loaded in ${loadTime.toFixed(2)}ms (size: ${data.size} bytes)`);
      
      // Emit performance metrics
      communication.emit('module:performance', {
        moduleName,
        loadTime,
        size: data.size
      }, 'system');
    }
  });

  // Periodic performance report
  if (typeof window !== 'undefined') {
    setInterval(() => {
      const modules = Array.from(performanceData.entries())
        .filter(([, data]) => data.loadTime)
        .map(([name, data]) => ({
          name,
          loadTime: data.loadTime!,
          size: data.size || 0
        }));

      if (modules.length > 0) {
        const avgLoadTime = modules.reduce((sum, m) => sum + m.loadTime, 0) / modules.length;
        const totalSize = modules.reduce((sum, m) => sum + m.size, 0);
        
        communication.emit('system:performance-report', {
          modules,
          averageLoadTime: avgLoadTime,
          totalSize,
          timestamp: Date.now()
        }, 'system');
      }
    }, 60000); // Every minute
  }
}

/**
 * Get global module loader instance
 */
let globalModuleLoader: ReturnType<ModuleLoaderFactory> | null = null;

export function getGlobalModuleLoader(config?: ModuleLoaderConfig) {
  if (!globalModuleLoader) {
    globalModuleLoader = createModuleLoader(config);
    
    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__PLATAFORMA_MODULE_LOADER_CONTEXT__ = globalModuleLoader.context;
    }
  }
  
  return globalModuleLoader;
}