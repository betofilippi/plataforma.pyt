import type { PluginManifest } from '../types';
import { PluginLoadError } from '../types';

/**
 * Plugin Loader
 * Handles dynamic loading of plugins from various sources including
 * remote URLs, local filesystem, and npm packages.
 */
export class PluginLoader {
  private loadCache = new Map<string, LoadedPlugin>();
  private loadPromises = new Map<string, Promise<LoadedPlugin>>();

  constructor(private readonly options: PluginLoaderOptions) {}

  /**
   * Load a plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<LoadedPlugin> {
    // Check cache first
    const cached = this.loadCache.get(pluginId);
    if (cached && !this.options.disableCache) {
      return cached;
    }

    // Check if already loading
    const existingPromise = this.loadPromises.get(pluginId);
    if (existingPromise) {
      return await existingPromise;
    }

    // Create new load promise
    const loadPromise = this.doLoadPlugin(pluginId);
    this.loadPromises.set(pluginId, loadPromise);

    try {
      const result = await loadPromise;
      
      // Cache the result
      if (!this.options.disableCache) {
        this.loadCache.set(pluginId, result);
      }
      
      return result;
      
    } finally {
      this.loadPromises.delete(pluginId);
    }
  }

  /**
   * Preload multiple plugins
   */
  async preloadPlugins(pluginIds: string[]): Promise<void> {
    const loadPromises = pluginIds.map(id => 
      this.loadPlugin(id).catch(error => {
        console.warn(`Failed to preload plugin '${id}':`, error);
        return null;
      })
    );
    
    await Promise.all(loadPromises);
  }

  /**
   * Clear plugin from cache
   */
  clearCache(pluginId?: string): void {
    if (pluginId) {
      this.loadCache.delete(pluginId);
    } else {
      this.loadCache.clear();
    }
  }

  /**
   * Check if plugin is in cache
   */
  isCached(pluginId: string): boolean {
    return this.loadCache.has(pluginId);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return {
      size: this.loadCache.size,
      entries: Array.from(this.loadCache.keys()),
      memoryUsage: this.estimateCacheMemoryUsage()
    };
  }

  // Private Methods

  private async doLoadPlugin(pluginId: string): Promise<LoadedPlugin> {
    const startTime = Date.now();
    
    try {
      // Determine load strategy based on plugin ID format
      const loadStrategy = this.determineLoadStrategy(pluginId);
      
      // Load manifest and module based on strategy
      const { manifest, module } = await this.loadByStrategy(pluginId, loadStrategy);
      
      // Validate loaded content
      await this.validateLoadedPlugin(pluginId, manifest, module);
      
      const loadTime = Date.now() - startTime;
      
      return {
        pluginId,
        manifest,
        module,
        loadTime,
        loadedAt: new Date(),
        strategy: loadStrategy
      };
      
    } catch (error) {
      const loadTime = Date.now() - startTime;
      
      throw new PluginLoadError(
        `Failed to load plugin '${pluginId}': ${error instanceof Error ? error.message : String(error)}`,
        pluginId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private determineLoadStrategy(pluginId: string): LoadStrategy {
    // URL-based loading (http/https)
    if (pluginId.startsWith('http://') || pluginId.startsWith('https://')) {
      return LoadStrategy.URL;
    }
    
    // NPM package loading (@scope/package or package-name)
    if (pluginId.startsWith('@') || pluginId.includes('/')) {
      return LoadStrategy.NPM;
    }
    
    // File path loading (absolute or relative)
    if (pluginId.startsWith('/') || pluginId.startsWith('./') || pluginId.startsWith('../')) {
      return LoadStrategy.FILE;
    }
    
    // Registry loading (plugin registry)
    return LoadStrategy.REGISTRY;
  }

  private async loadByStrategy(
    pluginId: string, 
    strategy: LoadStrategy
  ): Promise<{ manifest: PluginManifest; module: any }> {
    
    switch (strategy) {
      case LoadStrategy.URL:
        return await this.loadFromURL(pluginId);
        
      case LoadStrategy.NPM:
        return await this.loadFromNPM(pluginId);
        
      case LoadStrategy.FILE:
        return await this.loadFromFile(pluginId);
        
      case LoadStrategy.REGISTRY:
        return await this.loadFromRegistry(pluginId);
        
      default:
        throw new Error(`Unsupported load strategy: ${strategy}`);
    }
  }

  private async loadFromURL(url: string): Promise<{ manifest: PluginManifest; module: any }> {
    const timeoutSignal = this.createTimeoutSignal();
    
    try {
      // Load manifest
      const manifestUrl = `${url}/manifest.json`;
      const manifestResponse = await fetch(manifestUrl, { signal: timeoutSignal });
      
      if (!manifestResponse.ok) {
        throw new Error(`Failed to load manifest: ${manifestResponse.status} ${manifestResponse.statusText}`);
      }
      
      const manifest: PluginManifest = await manifestResponse.json();
      
      // Load main module
      const moduleUrl = `${url}/${manifest.entryPoint || 'index.js'}`;
      const module = await this.loadModuleFromURL(moduleUrl, timeoutSignal);
      
      return { manifest, module };
      
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Load timeout after ${this.options.timeout}ms`);
      }
      throw error;
    }
  }

  private async loadFromNPM(packageName: string): Promise<{ manifest: PluginManifest; module: any }> {
    try {
      // In a browser environment, this would require a build-time transformation
      // or a runtime module federation system
      if (typeof require !== 'undefined') {
        // Node.js environment
        const packagePath = require.resolve(packageName);
        const packageJson = require(`${packageName}/package.json`);
        const module = require(packageName);
        
        // Convert package.json to plugin manifest format
        const manifest = this.convertPackageJsonToManifest(packageJson);
        
        return { manifest, module };
      } else {
        // Browser environment - use dynamic import with external resolution
        const moduleUrl = this.resolveNPMPackageURL(packageName);
        return await this.loadFromURL(moduleUrl);
      }
      
    } catch (error) {
      throw new Error(`Failed to load NPM package '${packageName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadFromFile(filePath: string): Promise<{ manifest: PluginManifest; module: any }> {
    try {
      // In browser environment, file loading requires server support
      if (typeof require !== 'undefined') {
        // Node.js environment
        const fs = require('fs').promises;
        const path = require('path');
        
        const manifestPath = path.resolve(filePath, 'manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest: PluginManifest = JSON.parse(manifestContent);
        
        const modulePath = path.resolve(filePath, manifest.entryPoint || 'index.js');
        const module = require(modulePath);
        
        return { manifest, module };
      } else {
        // Browser environment - convert to URL loading
        const baseUrl = new URL(filePath, window.location.href);
        return await this.loadFromURL(baseUrl.toString());
      }
      
    } catch (error) {
      throw new Error(`Failed to load from file '${filePath}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadFromRegistry(pluginId: string): Promise<{ manifest: PluginManifest; module: any }> {
    try {
      const registryUrl = this.options.registryUrl || this.options.baseUrl;
      if (!registryUrl) {
        throw new Error('No registry URL configured');
      }
      
      // Load from plugin registry
      const pluginUrl = `${registryUrl}/${pluginId}`;
      return await this.loadFromURL(pluginUrl);
      
    } catch (error) {
      throw new Error(`Failed to load from registry '${pluginId}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async loadModuleFromURL(url: string, signal?: AbortSignal): Promise<any> {
    // For ES modules
    if (url.endsWith('.js') || url.endsWith('.mjs')) {
      return await import(url);
    }
    
    // For UMD modules
    if (url.endsWith('.umd.js')) {
      return await this.loadUMDModule(url, signal);
    }
    
    // Default to dynamic import
    return await import(url);
  }

  private async loadUMDModule(url: string, signal?: AbortSignal): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.type = 'text/javascript';
      
      const cleanup = () => {
        document.head.removeChild(script);
        if (signal) {
          signal.removeEventListener('abort', onAbort);
        }
      };
      
      const onAbort = () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      };
      
      script.onload = () => {
        cleanup();
        // Extract module from global scope (UMD pattern)
        const moduleName = this.extractModuleNameFromURL(url);
        const module = (window as any)[moduleName];
        if (module) {
          resolve(module);
        } else {
          reject(new Error(`UMD module '${moduleName}' not found in global scope`));
        }
      };
      
      script.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load script: ${url}`));
      };
      
      if (signal) {
        signal.addEventListener('abort', onAbort);
        if (signal.aborted) {
          onAbort();
          return;
        }
      }
      
      document.head.appendChild(script);
    });
  }

  private async validateLoadedPlugin(
    pluginId: string,
    manifest: PluginManifest,
    module: any
  ): Promise<void> {
    // Validate manifest structure
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Invalid manifest: must be an object');
    }
    
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid manifest: missing required fields (id, name, version)');
    }
    
    // Validate module structure
    if (!module || typeof module !== 'object') {
      throw new Error('Invalid module: must be an object');
    }
    
    // Check for required plugin interface
    if (typeof module.default === 'function') {
      // ES module with default export
      module = module.default;
    }
    
    // Validate plugin interface
    if (typeof module.initialize !== 'function') {
      console.warn(`Plugin '${pluginId}' does not export an initialize function`);
    }
  }

  private convertPackageJsonToManifest(packageJson: any): PluginManifest {
    return {
      id: packageJson.name.replace(/[@\/]/g, '-'),
      name: packageJson.displayName || packageJson.name,
      version: packageJson.version,
      description: packageJson.description || '',
      author: {
        name: typeof packageJson.author === 'string' ? packageJson.author : packageJson.author?.name || 'Unknown',
        email: packageJson.author?.email,
        url: packageJson.author?.url
      },
      category: packageJson.pluginCategory || 'utility',
      securityLevel: packageJson.securityLevel || 'sandboxed',
      entryPoint: packageJson.main || 'index.js',
      dependencies: packageJson.dependencies,
      peerDependencies: packageJson.peerDependencies,
      permissions: packageJson.permissions || [],
      capabilities: packageJson.capabilities || [],
      keywords: packageJson.keywords || [],
      license: packageJson.license,
      repository: packageJson.repository?.url,
      homepage: packageJson.homepage
    };
  }

  private resolveNPMPackageURL(packageName: string): string {
    // Use a CDN like unpkg or jsdelivr for browser loading
    const cdnUrl = this.options.npmCDN || 'https://unpkg.com';
    return `${cdnUrl}/${packageName}@latest`;
  }

  private extractModuleNameFromURL(url: string): string {
    const filename = url.split('/').pop() || '';
    return filename.replace(/\.(umd\.)?js$/, '');
  }

  private createTimeoutSignal(): AbortSignal {
    if (this.options.timeout) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), this.options.timeout);
      return controller.signal;
    }
    
    // Return a no-op signal if no timeout
    return new AbortController().signal;
  }

  private estimateCacheMemoryUsage(): number {
    // Rough estimation of cache memory usage
    let totalSize = 0;
    for (const [key, value] of this.loadCache) {
      totalSize += key.length * 2; // String overhead
      totalSize += JSON.stringify(value.manifest).length * 2;
      totalSize += 1000; // Estimated module size overhead
    }
    return totalSize;
  }
}

// Types and Interfaces

export interface PluginLoaderOptions {
  baseUrl?: string;
  registryUrl?: string;
  npmCDN?: string;
  timeout?: number;
  disableCache?: boolean;
  maxCacheSize?: number;
}

export interface LoadedPlugin {
  pluginId: string;
  manifest: PluginManifest;
  module: any;
  loadTime: number;
  loadedAt: Date;
  strategy: LoadStrategy;
}

export enum LoadStrategy {
  URL = 'url',
  NPM = 'npm',
  FILE = 'file',
  REGISTRY = 'registry'
}

export interface CacheStats {
  size: number;
  entries: string[];
  memoryUsage: number;
}

// Temporary error class (would import from types in real implementation)
class PluginLoadError extends Error {
  constructor(
    message: string,
    public readonly pluginId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginLoadError';
  }
}