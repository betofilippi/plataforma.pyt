# @plataforma/vite-plugin-module-federation

Vite plugin for Module Federation in plataforma.app OS. Enables dynamic loading of remote modules with hot reloading support.

## Features

- 🔥 **Hot Module Replacement** - Full HMR support for remote modules
- 📦 **Shared Dependencies** - Intelligent dependency sharing between modules  
- 🚀 **Dynamic Loading** - Load modules at runtime with error boundaries
- 🔧 **Development Server** - Built-in dev server with manifest serving
- 📊 **Module Manifest** - Automatic manifest generation and validation
- ⚡ **Optimized Builds** - Efficient bundling with code splitting

## Installation

```bash
npm install @plataforma/vite-plugin-module-federation
```

## Usage

### Basic Configuration

```typescript
import { defineConfig } from 'vite';
import { moduleFederation, createPlataformaModuleFederation } from '@plataforma/vite-plugin-module-federation';

export default defineConfig({
  plugins: [
    moduleFederation(
      createPlataformaModuleFederation({
        name: 'my-module',
        exposes: {
          './Component': './src/Component.tsx',
          './utils': './src/utils.ts'
        },
        remotes: {
          'other-module': 'http://localhost:3001/remote-entry.js'
        }
      })
    )
  ]
});
```

### Host Application

```typescript
import { defineConfig } from 'vite';
import { moduleFederation, createPlataformaModuleFederation } from '@plataforma/vite-plugin-module-federation';

export default defineConfig({
  plugins: [
    moduleFederation(
      createPlataformaModuleFederation({
        name: 'host-app',
        remotes: {
          'auth-module': 'http://localhost:3001/remote-entry.js',
          'dashboard-module': 'http://localhost:3002/remote-entry.js'
        }
      })
    )
  ]
});
```

### Remote Module

```typescript
import { defineConfig } from 'vite';
import { moduleFederation, createPlataformaModuleFederation } from '@plataforma/vite-plugin-module-federation';

export default defineConfig({
  plugins: [
    moduleFederation(
      createPlataformaModuleFederation({
        name: 'auth-module',
        exposes: {
          './AuthProvider': './src/AuthProvider.tsx',
          './LoginForm': './src/LoginForm.tsx',
          './useAuth': './src/hooks/useAuth.ts'
        }
      })
    )
  ]
});
```

## Runtime API

### Loading Remote Modules

```typescript
import { runtime } from '@plataforma/vite-plugin-module-federation';

// Load a remote module
const AuthModule = await runtime.loadModule('auth-module');
const { LoginForm } = AuthModule;

// Check if module is loaded
if (runtime.isLoaded('auth-module')) {
  // Module is available
}

// List all modules
const modules = runtime.listModules();
console.log(modules);
```

### Using Remote Components

```typescript
import React, { Suspense, lazy } from 'react';

// Lazy load remote component
const RemoteComponent = lazy(() => import('@remote/auth-module/LoginForm'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading...</div>}>
        <RemoteComponent />
      </Suspense>
    </div>
  );
}
```

## Configuration Options

### ModuleFederationOptions

```typescript
interface ModuleFederationOptions {
  name: string;
  shared?: SharedDependencies;
  remotes?: RemoteModules;
  exposes?: ExposedModules;
  library?: LibraryOptions;
  dev?: DevServerOptions;
}
```

### Shared Dependencies

```typescript
const config = createPlataformaModuleFederation({
  name: 'my-module',
  shared: {
    'react': {
      singleton: true,
      requiredVersion: '^18.0.0',
      eager: true
    },
    'lodash': {
      singleton: false,
      requiredVersion: '^4.0.0'
    }
  }
});
```

### Default Shared Dependencies

The plugin automatically shares these dependencies:

- `react` - Singleton, eager loading
- `react-dom` - Singleton, eager loading  
- `react-router-dom` - Singleton
- `@tanstack/react-query` - Singleton
- `@supabase/supabase-js` - Singleton
- All `@plataforma/*` packages - Singleton, eager loading

## Development

### Hot Module Replacement

The plugin includes full HMR support:

```typescript
// In your component
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Module will be hot-reloaded
  });
}
```

### Development Server

The plugin adds these endpoints:

- `/manifest.json` - Module manifest
- `/remote-entry.js` - Remote entry point
- `/__module-federation__` - Federation API

## Build Output

When building, the plugin generates:

- `manifest.json` - Module manifest with metadata
- `remote-entry.js` - Remote entry point for consumers
- `shared-deps.js` - Shared dependencies runtime

## Error Handling

```typescript
import { runtime } from '@plataforma/vite-plugin-module-federation';

try {
  const module = await runtime.loadModule('remote-module');
} catch (error) {
  if (error.name === 'RemoteLoadError') {
    console.error('Failed to load remote module:', error.message);
  }
}
```

## Best Practices

1. **Keep shared dependencies minimal** - Only share what's truly common
2. **Use version constraints** - Prevent version conflicts
3. **Implement error boundaries** - Handle module load failures gracefully
4. **Cache modules appropriately** - Use singleton for global state
5. **Monitor bundle sizes** - Avoid loading heavy dependencies multiple times

## TypeScript Support

The plugin includes full TypeScript support:

```typescript
declare module '@remote/*' {
  const component: any;
  export default component;
}
```

## License

MIT