# @plataforma/module-loader

A comprehensive Dynamic Module Loader system for plataforma.app with React components, lifecycle hooks, caching, and inter-module communication.

## Features

- 🚀 **Dynamic Module Loading** - Load modules on-demand with React Suspense
- 🛡️ **Error Boundaries** - Robust error handling and recovery strategies
- 💾 **Smart Caching** - In-memory cache with localStorage persistence and version checking
- 🔄 **Hot Module Replacement** - Development-time module updates
- 📡 **Inter-Module Communication** - Event bus and shared state management
- ⚡ **Performance Monitoring** - Load time tracking and optimization
- 🎯 **TypeScript First** - Full TypeScript support with comprehensive types
- 🎨 **Beautiful Loading States** - Customizable loading fallbacks and skeletons

## Installation

```bash
npm install @plataforma/module-loader
```

## Quick Start

### Basic Setup

```tsx
import React from 'react';
import { ModuleProvider, DynamicModuleLoader } from '@plataforma/module-loader';

function App() {
  return (
    <ModuleProvider>
      <DynamicModuleLoader
        moduleName="my-module"
        moduleUrl="https://cdn.example.com/my-module/index.js"
        fallback={<div>Loading module...</div>}
      />
    </ModuleProvider>
  );
}
```

### With Custom Configuration

```tsx
import React from 'react';
import { ModuleProvider, DynamicModuleLoader } from '@plataforma/module-loader';

const config = {
  cache: {
    maxSize: 50,
    defaultTtl: 60 * 60 * 1000, // 1 hour
    enablePersistence: true,
    enableVersionCheck: true
  },
  communication: {
    enableEventReplay: true,
    maxEventHistory: 500,
    debug: true
  },
  timeout: 15000,
  retries: 2,
  enableHMR: true
};

function App() {
  return (
    <ModuleProvider config={config}>
      <DynamicModuleLoader
        moduleName="advanced-module"
        moduleUrl="https://cdn.example.com/advanced-module/index.js"
        onLoad={() => console.log('Module loading started')}
        onReady={(module) => console.log('Module ready:', module)}
        onError={(error) => console.error('Module error:', error)}
        errorFallback={({ error, retry }) => (
          <div>
            <p>Failed to load module: {error.message}</p>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      />
    </ModuleProvider>
  );
}
```

## Components

### ModuleProvider

The main provider component that sets up the module loading context.

```tsx
<ModuleProvider config={optionalConfig}>
  {/* Your app components */}
</ModuleProvider>
```

### DynamicModuleLoader

The main component for loading modules dynamically.

```tsx
<DynamicModuleLoader
  moduleName="my-module"
  moduleUrl="https://example.com/module.js"
  fallback={<Loading />}
  errorFallback={ErrorComponent}
  onLoad={() => console.log('Loading')}
  onReady={(module) => console.log('Ready', module)}
  onError={(error) => console.error('Error', error)}
  moduleProps={{ customProp: 'value' }}
  lazy={true}
  preload={false}
  timeout={30000}
  retries={3}
>
  {(module, loading, error) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    return <module.default />;
  }}
</DynamicModuleLoader>
```

### LoadingFallback

Beautiful loading states with various animations.

```tsx
import { LoadingFallback } from '@plataforma/module-loader';

<LoadingFallback
  moduleName="my-module"
  message="Loading module..."
  animation="spinner" // or "progress", "skeleton", "pulse"
  size="medium" // or "small", "large"
  theme="auto" // or "light", "dark"
/>
```

### ModuleErrorBoundary

Error boundary specifically designed for module errors.

```tsx
import { ModuleErrorBoundary } from '@plataforma/module-loader';

<ModuleErrorBoundary
  moduleName="my-module"
  fallback={CustomErrorComponent}
  onError={(error) => console.error(error)}
  autoRetry={true}
  maxRetries={3}
  retryDelay={2000}
>
  <SomeComponent />
</ModuleErrorBoundary>
```

## Hooks

### useModuleLoader

Main hook for module loading operations.

```tsx
import { useModuleLoader } from '@plataforma/module-loader';

function MyComponent() {
  const { loadModule, unloadModule, isLoaded, listModules } = useModuleLoader();
  
  const handleLoad = async () => {
    try {
      const module = await loadModule('my-module', 'https://example.com/module.js');
      console.log('Module loaded:', module);
    } catch (error) {
      console.error('Failed to load module:', error);
    }
  };
  
  return (
    <div>
      <button onClick={handleLoad}>Load Module</button>
      <p>Loaded modules: {listModules().join(', ')}</p>
    </div>
  );
}
```

### useModuleState

Hook for managing individual module state.

```tsx
import { useModuleState } from '@plataforma/module-loader';

function ModuleComponent() {
  const { module, loading, error, state, reload, unload } = useModuleState(
    'my-module',
    'https://example.com/module.js'
  );
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!module) return <div>Module not loaded</div>;
  
  return (
    <div>
      <h3>Module State: {state}</h3>
      <module.default />
      <button onClick={reload}>Reload</button>
      <button onClick={unload}>Unload</button>
    </div>
  );
}
```

### useCommunication

Hook for inter-module communication.

```tsx
import { useCommunication } from '@plataforma/module-loader';

function CommunicatingComponent() {
  const { emit, on, getSharedState, setSharedState } = useCommunication('my-module');
  
  useEffect(() => {
    // Listen for events
    const unsubscribe = on('user:action', (event) => {
      console.log('Received event:', event);
    });
    
    return unsubscribe;
  }, [on]);
  
  const handleEmit = () => {
    emit('user:action', { action: 'button-click', timestamp: Date.now() });
  };
  
  const handleSetState = () => {
    setSharedState('user:preferences', { theme: 'dark' }, true); // persistent
  };
  
  return (
    <div>
      <button onClick={handleEmit}>Send Event</button>
      <button onClick={handleSetState}>Set Shared State</button>
      <p>Current theme: {getSharedState('user:preferences')?.theme}</p>
    </div>
  );
}
```

### useModuleLifecycle

Hook for handling module lifecycle events.

```tsx
import { useModuleLifecycle } from '@plataforma/module-loader';

function LifecycleComponent() {
  useModuleLifecycle('my-module', {
    onModuleLoad: (moduleName) => console.log(`${moduleName} loading`),
    onModuleReady: (moduleName, module) => console.log(`${moduleName} ready`),
    onModuleError: (moduleName, error) => console.error(`${moduleName} error:`, error),
    onModuleUnload: (moduleName) => console.log(`${moduleName} unloaded`),
    onModuleUpdate: (moduleName, oldModule, newModule) => {
      console.log(`${moduleName} updated from version ${oldModule.version} to ${newModule.version}`);
    }
  });
  
  return <div>Lifecycle events are being monitored</div>;
}
```

## Advanced Usage

### Module Preloading

```tsx
import { ModulePreloader } from '@plataforma/module-loader';

<ModulePreloader
  modules={[
    { name: 'module1', url: 'https://example.com/module1.js' },
    { name: 'module2', url: 'https://example.com/module2.js' }
  ]}
  onPreloadComplete={(modules) => console.log('Preloaded:', modules)}
  onPreloadError={(error, moduleName) => console.error(`Failed to preload ${moduleName}:`, error)}
/>
```

### Error Recovery Strategies

```tsx
import { RecoverableErrorBoundary } from '@plataforma/module-loader';

<RecoverableErrorBoundary
  moduleName="my-module"
  recoveryStrategies={['retry', 'fallback', 'skip']}
  fallbackModule={<FallbackComponent />}
  maxRetries={3}
  retryDelay={2000}
  onError={(error) => console.error(error)}
>
  <DynamicModuleLoader moduleName="my-module" />
</RecoverableErrorBoundary>
```

### Custom Cache Configuration

```tsx
import { createModuleCache } from '@plataforma/module-loader/cache';

const customCache = createModuleCache({
  maxSize: 25,
  defaultTtl: 30 * 60 * 1000, // 30 minutes
  enablePersistence: true,
  storagePrefix: 'my-app-modules',
  enableVersionCheck: true,
  enablePreloading: true
});

// Use with context or manually
const entry = customCache.get('my-module');
customCache.set('my-module', {
  name: 'my-module',
  version: '1.0.0',
  module: moduleInstance,
  timestamp: Date.now()
});
```

### Custom Communication Bus

```tsx
import { createModuleCommunication } from '@plataforma/module-loader/communication';

const communication = createModuleCommunication({
  enablePersistence: true,
  maxEventHistory: 2000,
  enableEventReplay: true,
  debug: true
});

// Register module
communication.registerModule('my-module');

// Emit events
communication.emit('custom:event', { data: 'value' }, 'my-module');

// Listen for events
const unsubscribe = communication.on('custom:event', (event) => {
  console.log('Received:', event.payload);
});

// Shared state
communication.setSharedState('app:config', { version: '1.0' }, 'my-module', true);
const config = communication.getSharedState('app:config');
```

## TypeScript Support

The package includes comprehensive TypeScript definitions:

```tsx
import type { 
  ModuleLoaderConfig,
  ModuleLifecycleEvents,
  DynamicModuleLoaderProps,
  ModuleEvent,
  SharedStateEntry
} from '@plataforma/module-loader';

// Custom typed events
interface MyModuleEvents {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string; reason: string };
  'data:update': { entityId: string; changes: Record<string, any> };
}

const { emit, on } = useTypedCommunication<MyModuleEvents>('my-module');

// Type-safe event emission
emit('user:login', { userId: '123', timestamp: Date.now() });

// Type-safe event listening
on('user:login', (event) => {
  // event.payload is automatically typed as { userId: string; timestamp: number }
  console.log(`User ${event.payload.userId} logged in at ${event.payload.timestamp}`);
});
```

## Performance Monitoring

The module loader includes built-in performance monitoring:

```tsx
import { useModuleLifecycleStats } from '@plataforma/module-loader';

function PerformanceMonitor() {
  const { stats, getModuleStats, resetStats } = useModuleLifecycleStats();
  
  return (
    <div>
      <h3>Performance Stats</h3>
      <p>Total Loads: {stats.totalLoads}</p>
      <p>Total Errors: {stats.totalErrors}</p>
      <p>Average Load Time: {stats.averageLoadTime.toFixed(2)}ms</p>
      
      <h4>Module Details</h4>
      {Array.from(stats.moduleStats.entries()).map(([name, moduleStats]) => (
        <div key={name}>
          <strong>{name}:</strong> 
          {moduleStats.loads} loads, 
          {moduleStats.errors} errors, 
          avg: {(moduleStats.totalLoadTime / moduleStats.loads).toFixed(2)}ms
        </div>
      ))}
      
      <button onClick={resetStats}>Reset Stats</button>
    </div>
  );
}
```

## Development Features

### Hot Module Replacement

HMR is automatically enabled in development mode:

```tsx
// HMR will automatically reload modules when they change
<DynamicModuleLoader 
  moduleName="dev-module" 
  moduleUrl="http://localhost:3001/module.js"
/>
```

### Debug Mode

Enable debug mode for detailed logging:

```tsx
<ModuleProvider 
  config={{
    communication: { debug: true },
    dev: { verbose: true }
  }}
>
  <App />
</ModuleProvider>
```

### Module Registry Status

Monitor the module registry in development:

```tsx
import { ModuleRegistryStatus } from '@plataforma/module-loader';

<ModuleRegistryStatus />
```

## Integration with Module Federation

This package is designed to work seamlessly with the existing Module Federation plugin:

```tsx
// The module loader automatically integrates with the global registry
import { getGlobalLoader } from '@plataforma/vite-plugin-module-federation';
import { createModuleLoader } from '@plataforma/module-loader';

// Creates an enhanced loader that uses the federation registry
const loader = createModuleLoader({
  cache: { enablePersistence: true },
  communication: { enableEventReplay: true }
});

// Or use the global instance
import { getGlobalModuleLoader } from '@plataforma/module-loader';
const globalLoader = getGlobalModuleLoader();
```

## API Reference

For detailed API documentation, see the TypeScript definitions included with the package. The main types are:

- `ModuleLoaderConfig` - Configuration for the module loader
- `DynamicModuleLoaderProps` - Props for the main loader component  
- `ModuleLifecycleEvents` - Lifecycle event handlers
- `ModuleEvent<T>` - Event structure for communication
- `UseModuleLoaderResult` - Return type for useModuleLoader hook
- `ModuleCacheEntry` - Cache entry structure
- `SharedStateEntry<T>` - Shared state entry structure

## License

MIT - See LICENSE file for details