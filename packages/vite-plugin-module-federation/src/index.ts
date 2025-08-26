/**
 * Vite Module Federation Plugin for plataforma.app
 * Enables dynamic loading of remote modules with hot reloading
 */

import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite';
import { resolve, join } from 'pathe';
import MagicString from 'magic-string';
import { createManifestGenerator, createManifestServer, generateRemoteEntry, createDevManifest } from './manifest.js';
import { 
  DEFAULT_SHARED_DEPS, 
  PLATAFORMA_SHARED_DEPS, 
  mergeSharedDependencies, 
  generateSharedDepsScript 
} from './shared-deps.js';
import { getGlobalLoader } from './module-loader.js';
import type { 
  ModuleFederationOptions, 
  SharedDependencies, 
  ExposedModules,
  RemoteModules,
  ModuleManifest 
} from './types.js';

export * from './types.js';
export { 
  createModuleLoader, 
  getGlobalLoader, 
  loadModule, 
  createModuleErrorBoundary,
  ModuleLoader as InternalModuleLoader 
} from './module-loader.js';
export * from './shared-deps.js';
export * from './manifest.js';

/**
 * Vite Module Federation Plugin
 */
export function moduleFederation(options: ModuleFederationOptions): Plugin {
  let config: ResolvedConfig;
  let server: ViteDevServer;
  let manifestGenerator: ReturnType<typeof createManifestGenerator>;
  let manifestServer: ReturnType<typeof createManifestServer>;
  
  // Merge default shared dependencies with user options
  const sharedDeps = mergeSharedDependencies(
    DEFAULT_SHARED_DEPS,
    PLATAFORMA_SHARED_DEPS,
    options.shared
  );
  
  const plugin: Plugin = {
    name: 'vite-plugin-module-federation',
    
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      
      // Create manifest generator
      manifestGenerator = createManifestGenerator({
        name: options.name,
        version: undefined, // Will be resolved from package.json
        exposes: options.exposes || {},
        shared: sharedDeps
      });
      
      // Create manifest server for development
      manifestServer = createManifestServer();
    },
    
    configureServer(devServer) {
      server = devServer;
      
      // Add middleware for serving manifests
      server.middlewares.use('/manifest.json', manifestServer.middleware());
      server.middlewares.use('/__module-federation__', manifestServer.middleware());
      
      // Add middleware for serving remote entries
      server.middlewares.use('/remote-entry.js', (req, res, next) => {
        if (options.exposes) {
          const manifest = createDevManifest({
            name: options.name,
            port: server.config.server.port || 3030,
            exposes: options.exposes,
            shared: sharedDeps
          });
          
          const remoteEntry = generateRemoteEntry(manifest);
          res.setHeader('Content-Type', 'application/javascript');
          res.end(remoteEntry);
        } else {
          next();
        }
      });
      
      // Setup HMR for module federation
      server.ws.on('plataforma:register-module', (data) => {
        const loader = getGlobalLoader();
        loader.register(data.name, data.url).catch(console.error);
      });
      
      server.ws.on('plataforma:unload-module', (data) => {
        const loader = getGlobalLoader();
        loader.unload(data.name).catch(console.error);
      });
    },
    
    buildStart() {
      // Initialize module loader
      const loader = getGlobalLoader();
      
      // Register remotes if specified
      if (options.remotes) {
        Object.entries(options.remotes).forEach(([name, config]) => {
          const url = typeof config === 'string' ? config : config.url;
          loader.register(name, url).catch(console.error);
        });
      }
    },
    
    resolveId(id, importer) {
      // Handle remote module imports
      if (id.startsWith('@remote/')) {
        const moduleName = id.replace('@remote/', '');
        return `\0virtual:remote-${moduleName}`;
      }
      
      // Handle shared dependency imports
      if (sharedDeps[id]) {
        return `\0virtual:shared-${id}`;
      }
      
      return null;
    },
    
    load(id) {
      // Handle virtual remote modules
      if (id.startsWith('\0virtual:remote-')) {
        const moduleName = id.replace('\0virtual:remote-', '');
        
        return `
import { getGlobalLoader } from '@plataforma/vite-plugin-module-federation';

const loader = getGlobalLoader();
const module = await loader.load('${moduleName}');

export default module;
export * from module;
`;
      }
      
      // Handle virtual shared dependencies
      if (id.startsWith('\0virtual:shared-')) {
        const depName = id.replace('\0virtual:shared-', '');
        
        return `
// Shared dependency: ${depName}
import { createSharedDependencyResolver } from '@plataforma/vite-plugin-module-federation';

const sharedDeps = ${JSON.stringify(sharedDeps)};
const resolver = createSharedDependencyResolver(sharedDeps);
const dependency = resolver.resolve('${depName}');

export default dependency;
export * from dependency;
`;
      }
      
      return null;
    },
    
    transform(code, id) {
      // Transform imports to use shared dependencies
      if (!id.includes('node_modules') && (id.endsWith('.ts') || id.endsWith('.tsx') || id.endsWith('.js') || id.endsWith('.jsx'))) {
        const s = new MagicString(code);
        let hasChanges = false;
        
        // Transform shared dependency imports
        for (const depName of Object.keys(sharedDeps)) {
          const regex = new RegExp(`import\\s+([^'"]+)\\s+from\\s+['"]${depName}['"]`, 'g');
          const replacement = `import $1 from '\0virtual:shared-${depName}'`;
          
          if (regex.test(code)) {
            s.replace(regex, replacement);
            hasChanges = true;
          }
        }
        
        if (hasChanges) {
          return {
            code: s.toString(),
            map: s.generateMap({ hires: true })
          };
        }
      }
      
      return null;
    },
    
    generateBundle(options, bundle) {
      // Generate manifest for build
      if (config.command === 'build') {
        const manifest = manifestGenerator.generate({
          outDir: config.build.outDir,
          entry: './index.js',
          packageJsonPath: resolve(config.root, 'package.json')
        });
        
        // Write manifest file
        manifestGenerator.write(manifest, config.build.outDir);
        
        // Generate remote entry if exposing modules
        if (manifest.exposes && Object.keys(manifest.exposes).length > 0) {
          const remoteEntryCode = generateRemoteEntry(manifest);
          
          this.emitFile({
            type: 'asset',
            fileName: 'remote-entry.js',
            source: remoteEntryCode
          });
        }
        
        // Generate shared dependencies script
        const sharedScript = generateSharedDepsScript(sharedDeps);
        
        this.emitFile({
          type: 'asset',
          fileName: 'shared-deps.js',
          source: sharedScript
        });
      }
    },
    
    // Handle HMR updates
    handleHotUpdate(ctx) {
      if (options.exposes) {
        // Check if any exposed module was updated
        const exposedPaths = Object.values(options.exposes).map(path => 
          resolve(config.root, path)
        );
        
        if (exposedPaths.some(path => ctx.file.startsWith(path))) {
          // Notify about module update
          server.ws.send('plataforma:module-update', {
            moduleName: options.name
          });
        }
      }
      
      return ctx.modules;
    }
  };
  
  return plugin;
}

/**
 * Create Module Federation configuration for plataforma.app
 */
export function createPlataformaModuleFederation(options: {
  name: string;
  exposes?: ExposedModules;
  remotes?: RemoteModules;
  shared?: SharedDependencies;
}): ModuleFederationOptions {
  return {
    name: options.name,
    exposes: options.exposes,
    remotes: options.remotes,
    shared: mergeSharedDependencies(
      DEFAULT_SHARED_DEPS,
      PLATAFORMA_SHARED_DEPS,
      options.shared
    ),
    library: {
      type: 'esm'
    },
    dev: {
      hmr: true
    }
  };
}

/**
 * Helper to define remote module imports
 */
export function defineRemotes<T extends Record<string, string>>(remotes: T): T {
  return remotes;
}

/**
 * Helper to define exposed modules
 */
export function defineExposes<T extends Record<string, string>>(exposes: T): T {
  return exposes;
}

/**
 * Runtime API for loading modules
 */
export const runtime = {
  /**
   * Load a remote module
   */
  async loadModule(name: string, url?: string): Promise<any> {
    const loader = getGlobalLoader();
    
    if (url && !loader.getModule(name)) {
      await loader.register(name, url);
    }
    
    return loader.load(name);
  },
  
  /**
   * Get module registry
   */
  getRegistry() {
    return getGlobalLoader();
  },
  
  /**
   * Check if module is loaded
   */
  isLoaded(name: string): boolean {
    return getGlobalLoader().isLoaded(name);
  },
  
  /**
   * List all registered modules
   */
  listModules() {
    return getGlobalLoader().listModules();
  }
};

// Default export
export default moduleFederation;