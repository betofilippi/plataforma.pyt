/**
 * Dynamic Module Loader - Main component for loading modules with Suspense
 */

import React, { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';
import { LoadingFallback } from './LoadingFallback';
import { useModuleContext } from './ModuleProvider';
import type { 
  DynamicModuleLoaderProps, 
  ModuleLifecycleState 
} from '../types';

/**
 * Module wrapper component that handles the actual loading
 */
function ModuleWrapper({
  moduleName,
  moduleUrl,
  moduleProps = {},
  onLoad,
  onReady,
  onError,
  onUnload,
  children,
  timeout,
  retries,
  preload = false
}: DynamicModuleLoaderProps) {
  const { registry, lifecycleHandlers, communication } = useModuleContext();
  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(!preload);
  const [error, setError] = useState<Error | null>(null);
  const [moduleState, setModuleState] = useState<ModuleLifecycleState>('unloaded');

  // Handle module loading
  const loadModule = useCallback(async () => {
    if (preload && module) {
      return module; // Already preloaded
    }

    try {
      setLoading(true);
      setError(null);
      setModuleState('loading');
      
      // Call lifecycle handler
      await lifecycleHandlers.onModuleLoad?.(moduleName);
      onLoad?.();

      // Register module if URL is provided
      if (moduleUrl && !registry.getModule(moduleName)) {
        await registry.register(moduleName, moduleUrl);
      }

      // Load the module
      const loadedModule = await registry.load(moduleName);
      
      setModule(loadedModule);
      setModuleState('loaded');
      
      // Call lifecycle handlers
      await lifecycleHandlers.onModuleReady?.(moduleName, loadedModule);
      onReady?.(loadedModule);

      return loadedModule;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setModuleState('error');
      
      // Call lifecycle handlers
      await lifecycleHandlers.onModuleError?.(moduleName, error);
      onError?.(error);
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    moduleName,
    moduleUrl,
    registry,
    lifecycleHandlers,
    onLoad,
    onReady,
    onError,
    preload,
    module
  ]);

  // Handle module unloading
  const unloadModule = useCallback(async () => {
    if (!module) return;

    try {
      setModuleState('unloading');
      
      // Call lifecycle handler
      await lifecycleHandlers.onModuleUnload?.(moduleName);
      onUnload?.();

      // Unload from registry
      await registry.unload(moduleName);
      
      setModule(null);
      setModuleState('unloaded');
    } catch (err) {
      console.error(`Failed to unload module "${moduleName}":`, err);
    }
  }, [module, moduleName, registry, lifecycleHandlers, onUnload]);

  // Load module on mount or when dependencies change
  useEffect(() => {
    if (!preload || !module) {
      loadModule().catch(console.error);
    }

    return () => {
      // Cleanup on unmount
      if (moduleState === 'loaded' || moduleState === 'loading') {
        unloadModule().catch(console.error);
      }
    };
  }, [moduleName, moduleUrl]);

  // Listen for module state changes from communication system
  useEffect(() => {
    const unsubscribe = communication.on('module:state-change', (event) => {
      if (event.payload.moduleName === moduleName) {
        setModuleState(event.payload.newState);
      }
    });

    return unsubscribe;
  }, [moduleName, communication]);

  // Render children with module data
  if (children && typeof children === 'function') {
    return <>{children(module, loading, error)}</>;
  }

  // If no module loaded yet and not loading, return loading state
  if (!module && loading) {
    return null; // Will be handled by Suspense
  }

  // If error occurred, throw it to be caught by error boundary
  if (error) {
    throw error;
  }

  // If no module and not loading, something went wrong
  if (!module && !loading) {
    throw new Error(`Module "${moduleName}" failed to load`);
  }

  // Render the loaded module
  try {
    const ModuleComponent = module.default || module;
    
    if (typeof ModuleComponent === 'function') {
      return <ModuleComponent {...moduleProps} />;
    } else if (React.isValidElement(ModuleComponent)) {
      return ModuleComponent;
    } else {
      throw new Error(`Module "${moduleName}" does not export a valid React component`);
    }
  } catch (err) {
    throw new Error(`Failed to render module "${moduleName}": ${err}`);
  }
}

/**
 * Dynamic Module Loader component
 */
export function DynamicModuleLoader({
  moduleName,
  moduleUrl,
  fallback,
  errorFallback,
  onLoad,
  onReady,
  onError,
  onUnload,
  moduleProps = {},
  children,
  lazy = true,
  preload = false,
  timeout = 30000,
  retries = 3
}: DynamicModuleLoaderProps) {
  // Memoize the loading fallback
  const loadingFallback = useMemo(() => {
    if (fallback) {
      return fallback;
    }
    
    return (
      <LoadingFallback
        moduleName={moduleName}
        message="Loading module..."
        animation="spinner"
        size="medium"
        theme="auto"
      />
    );
  }, [fallback, moduleName]);

  // Memoize error fallback
  const moduleErrorFallback = useMemo(() => {
    return errorFallback || (({ error, retry }) => (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-4">Failed to load module: {error.message}</p>
        <button 
          onClick={retry}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    ));
  }, [errorFallback]);

  // If lazy loading is disabled, render immediately
  if (!lazy) {
    return (
      <ModuleErrorBoundary
        moduleName={moduleName}
        fallback={moduleErrorFallback}
        onError={onError}
        autoRetry={false}
        maxRetries={retries}
      >
        <ModuleWrapper
          moduleName={moduleName}
          moduleUrl={moduleUrl}
          moduleProps={moduleProps}
          onLoad={onLoad}
          onReady={onReady}
          onError={onError}
          onUnload={onUnload}
          children={children}
          timeout={timeout}
          retries={retries}
          preload={preload}
        />
      </ModuleErrorBoundary>
    );
  }

  // Lazy loading with Suspense
  const LazyModule = useMemo(() => {
    return React.lazy(async () => {
      // Create a component that wraps the module loading logic
      const Component = () => (
        <ModuleWrapper
          moduleName={moduleName}
          moduleUrl={moduleUrl}
          moduleProps={moduleProps}
          onLoad={onLoad}
          onReady={onReady}
          onError={onError}
          onUnload={onUnload}
          children={children}
          timeout={timeout}
          retries={retries}
          preload={preload}
        />
      );

      return Promise.resolve({ default: Component });
    });
  }, [
    moduleName,
    moduleUrl,
    moduleProps,
    onLoad,
    onReady,
    onError,
    onUnload,
    children,
    timeout,
    retries,
    preload
  ]);

  return (
    <ModuleErrorBoundary
      moduleName={moduleName}
      fallback={moduleErrorFallback}
      onError={onError}
      autoRetry={false}
      maxRetries={retries}
    >
      <Suspense fallback={loadingFallback}>
        <LazyModule />
      </Suspense>
    </ModuleErrorBoundary>
  );
}

/**
 * Preloader component for modules
 */
export function ModulePreloader({ 
  modules,
  onPreloadComplete,
  onPreloadError 
}: {
  modules: Array<{ name: string; url: string }>;
  onPreloadComplete?: (modules: string[]) => void;
  onPreloadError?: (error: Error, moduleName: string) => void;
}) {
  const { registry } = useModuleContext();
  const [preloadedModules, setPreloadedModules] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, Error>>({});

  useEffect(() => {
    const preloadModules = async () => {
      const results = await Promise.allSettled(
        modules.map(async ({ name, url }) => {
          try {
            await registry.register(name, url);
            await registry.load(name);
            return name;
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setErrors(prev => ({ ...prev, [name]: err }));
            onPreloadError?.(err, name);
            throw err;
          }
        })
      );

      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<string>).value);

      setPreloadedModules(successful);
      onPreloadComplete?.(successful);
    };

    preloadModules();
  }, [modules, registry, onPreloadComplete, onPreloadError]);

  // This component doesn't render anything
  return null;
}

/**
 * Module registry status component
 */
export function ModuleRegistryStatus() {
  const { registry, cache, communication } = useModuleContext();
  const [modules, setModules] = useState(registry.listModules());
  const [cacheStats, setCacheStats] = useState(cache.getStats?.() || null);
  const [commStats, setCommStats] = useState(communication.getStats?.() || null);

  useEffect(() => {
    // Update module list periodically
    const interval = setInterval(() => {
      setModules(registry.listModules());
      setCacheStats(cache.getStats?.() || null);
      setCommStats(communication.getStats?.() || null);
    }, 5000);

    return () => clearInterval(interval);
  }, [registry, cache, communication]);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Module Registry Status</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Module Registry */}
        <div>
          <h4 className="font-medium mb-2">Loaded Modules ({modules.length})</h4>
          <ul className="space-y-1 text-sm">
            {modules.map(module => (
              <li key={module.name} className="flex justify-between">
                <span>{module.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  module.status === 'loaded' ? 'bg-green-200 text-green-800' :
                  module.status === 'error' ? 'bg-red-200 text-red-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {module.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cache Stats */}
        {cacheStats && (
          <div>
            <h4 className="font-medium mb-2">Cache Stats</h4>
            <div className="text-sm space-y-1">
              <div>Size: {cacheStats.size}/{cacheStats.maxSize}</div>
              <div>Hit Ratio: {(cacheStats.hitRatio * 100).toFixed(1)}%</div>
            </div>
          </div>
        )}

        {/* Communication Stats */}
        {commStats && (
          <div>
            <h4 className="font-medium mb-2">Communication</h4>
            <div className="text-sm space-y-1">
              <div>Modules: {commStats.registeredModules.length}</div>
              <div>Events: {commStats.eventHistory.total}</div>
              <div>Shared State: {commStats.sharedState.total}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}