/**
 * Module manifest generation and management system
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import type { ModuleManifest, ExposedModules, SharedDependencies } from './types.js';

/**
 * Generate module manifest
 */
export function generateManifest(options: {
  name: string;
  version: string;
  entry: string;
  exposes: ExposedModules;
  shared: SharedDependencies;
  outDir: string;
  packageJsonPath?: string;
}): ModuleManifest {
  const { name, version, entry, exposes, shared, packageJsonPath } = options;
  
  // Load package.json for metadata if available
  let packageMetadata: any = {};
  if (packageJsonPath && existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      packageMetadata = {
        description: packageJson.description,
        author: packageJson.author,
        homepage: packageJson.homepage,
        repository: packageJson.repository,
        keywords: packageJson.keywords
      };
    } catch (error) {
      console.warn(`Failed to read package.json: ${error}`);
    }
  }
  
  const manifest: ModuleManifest = {
    name,
    version,
    entry,
    exposes,
    shared,
    metadata: packageMetadata,
    build: {
      timestamp: Date.now(),
      hash: generateBuildHash(),
      viteVersion: getViteVersion(),
      pluginVersion: getPluginVersion()
    }
  };
  
  return manifest;
}

/**
 * Write manifest to file
 */
export function writeManifest(manifest: ModuleManifest, outputPath: string): void {
  try {
    const manifestJson = JSON.stringify(manifest, null, 2);
    writeFileSync(outputPath, manifestJson, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write manifest to ${outputPath}: ${error}`);
  }
}

/**
 * Load manifest from file
 */
export function loadManifest(manifestPath: string): ModuleManifest {
  try {
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }
    
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Validate manifest structure
    validateManifest(manifest);
    
    return manifest;
  } catch (error) {
    throw new Error(`Failed to load manifest from ${manifestPath}: ${error}`);
  }
}

/**
 * Validate manifest structure
 */
export function validateManifest(manifest: any): asserts manifest is ModuleManifest {
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('Manifest must be an object');
  }
  
  const required = ['name', 'version', 'entry'];
  for (const field of required) {
    if (!manifest[field]) {
      throw new Error(`Manifest missing required field: ${field}`);
    }
  }
  
  if (typeof manifest.name !== 'string') {
    throw new Error('Manifest name must be a string');
  }
  
  if (typeof manifest.version !== 'string') {
    throw new Error('Manifest version must be a string');
  }
  
  if (typeof manifest.entry !== 'string') {
    throw new Error('Manifest entry must be a string');
  }
  
  if (manifest.exposes && typeof manifest.exposes !== 'object') {
    throw new Error('Manifest exposes must be an object');
  }
  
  if (manifest.shared && typeof manifest.shared !== 'object') {
    throw new Error('Manifest shared must be an object');
  }
}

/**
 * Generate build hash for manifest
 */
export function generateBuildHash(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  return (timestamp + random).substring(0, 12);
}

/**
 * Get Vite version
 */
export function getViteVersion(): string {
  try {
    // Try to read from node_modules
    const vitePath = resolve(process.cwd(), 'node_modules/vite/package.json');
    if (existsSync(vitePath)) {
      const vitePackage = JSON.parse(readFileSync(vitePath, 'utf-8'));
      return vitePackage.version;
    }
  } catch (error) {
    // Ignore errors
  }
  
  return 'unknown';
}

/**
 * Get plugin version
 */
export function getPluginVersion(): string {
  try {
    // Try to read from our package.json
    const pluginPath = resolve(__dirname, '../package.json');
    if (existsSync(pluginPath)) {
      const pluginPackage = JSON.parse(readFileSync(pluginPath, 'utf-8'));
      return pluginPackage.version;
    }
  } catch (error) {
    // Ignore errors
  }
  
  return '1.0.0';
}

/**
 * Create manifest generator for Vite plugin
 */
export function createManifestGenerator(options: {
  name: string;
  version?: string;
  exposes: ExposedModules;
  shared: SharedDependencies;
}) {
  return {
    /**
     * Generate manifest for build
     */
    generate(buildOptions: {
      outDir: string;
      entry: string;
      packageJsonPath?: string;
    }): ModuleManifest {
      const version = options.version || this.getVersionFromPackageJson(buildOptions.packageJsonPath) || '1.0.0';
      
      return generateManifest({
        name: options.name,
        version,
        entry: buildOptions.entry,
        exposes: options.exposes,
        shared: options.shared,
        outDir: buildOptions.outDir,
        packageJsonPath: buildOptions.packageJsonPath
      });
    },
    
    /**
     * Get version from package.json
     */
    getVersionFromPackageJson(packageJsonPath?: string): string | null {
      const path = packageJsonPath || resolve(process.cwd(), 'package.json');
      
      try {
        if (existsSync(path)) {
          const packageJson = JSON.parse(readFileSync(path, 'utf-8'));
          return packageJson.version;
        }
      } catch (error) {
        console.warn(`Failed to read version from ${path}:`, error);
      }
      
      return null;
    },
    
    /**
     * Write manifest to output directory
     */
    write(manifest: ModuleManifest, outDir: string): void {
      const manifestPath = resolve(outDir, 'manifest.json');
      writeManifest(manifest, manifestPath);
    }
  };
}

/**
 * Create manifest server for development
 */
export function createManifestServer() {
  const manifests = new Map<string, ModuleManifest>();
  
  return {
    /**
     * Register a manifest
     */
    register(name: string, manifest: ModuleManifest): void {
      manifests.set(name, manifest);
    },
    
    /**
     * Get a manifest
     */
    get(name: string): ModuleManifest | undefined {
      return manifests.get(name);
    },
    
    /**
     * List all manifests
     */
    list(): ModuleManifest[] {
      return Array.from(manifests.values());
    },
    
    /**
     * Update a manifest
     */
    update(name: string, updates: Partial<ModuleManifest>): void {
      const existing = manifests.get(name);
      if (existing) {
        manifests.set(name, { ...existing, ...updates });
      }
    },
    
    /**
     * Remove a manifest
     */
    remove(name: string): void {
      manifests.delete(name);
    },
    
    /**
     * Create Express middleware for serving manifests
     */
    middleware() {
      return (req: any, res: any, next: any) => {
        if (req.path === '/manifest.json' || req.path.endsWith('/manifest.json')) {
          // Extract module name from URL
          const segments = req.path.split('/');
          const moduleName = segments[segments.length - 2] || 'main';
          
          const manifest = this.get(moduleName);
          if (manifest) {
            res.json(manifest);
          } else {
            res.status(404).json({ error: 'Manifest not found' });
          }
        } else {
          next();
        }
      };
    }
  };
}

/**
 * Resolve exposed modules paths
 */
export function resolveExposedModules(
  exposes: ExposedModules,
  baseDir: string
): ExposedModules {
  const resolved: ExposedModules = {};
  
  for (const [key, value] of Object.entries(exposes)) {
    resolved[key] = resolve(baseDir, value);
  }
  
  return resolved;
}

/**
 * Generate remote entry code
 */
export function generateRemoteEntry(manifest: ModuleManifest): string {
  const { name, exposes } = manifest;
  
  const exposesCode = Object.entries(exposes)
    .map(([key, path]) => {
      return `"${key}": () => import("${path}")`;
    })
    .join(',\n    ');
  
  return `
// Generated remote entry for ${name}
const moduleMap = {
  ${exposesCode}
};

const get = (module) => {
  if (!moduleMap[module]) {
    throw new Error(\`Module "\${module}" is not exposed by ${name}\`);
  }
  return moduleMap[module]();
};

const init = (shareScope) => {
  // Initialize shared dependencies
  if (typeof window !== 'undefined' && window.__PLATAFORMA_SHARED__) {
    // Register shared dependencies
    Object.keys(shareScope).forEach(key => {
      window.__PLATAFORMA_SHARED__.register(key, shareScope[key]);
    });
  }
};

// Export remote entry
export { get, init };

// For global access
if (typeof window !== 'undefined') {
  const globalName = '${name.replace(/[@/-]/g, '_')}';
  window[globalName] = { get, init };
}
`;
}

/**
 * Create development manifest
 */
export function createDevManifest(options: {
  name: string;
  port: number;
  exposes: ExposedModules;
  shared: SharedDependencies;
}): ModuleManifest {
  const { name, port, exposes, shared } = options;
  const baseUrl = `http://localhost:${port}`;
  
  return {
    name,
    version: '0.0.0-dev',
    entry: `${baseUrl}/remote-entry.js`,
    exposes,
    shared,
    metadata: {
      description: `Development build of ${name}`,
      author: 'plataforma.app'
    },
    build: {
      timestamp: Date.now(),
      hash: 'dev',
      viteVersion: getViteVersion(),
      pluginVersion: getPluginVersion()
    }
  };
}