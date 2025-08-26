/**
 * Dynamic module loader with hot reloading support
 */

import type {
  ModuleRegistry,
  RemoteModuleInfo,
  ModuleManifest
} from './types.js';
import { RemoteLoadError, ModuleFederationError } from './types.js';

/**
 * Module loader implementation with caching and error handling
 */
export class ModuleLoader implements ModuleRegistry {
  private modules = new Map<string, RemoteModuleInfo>();
  private loadingPromises = new Map<string, Promise<any>>();
  private hmrCallbacks = new Map<string, Set<Function>>();
  
  constructor(private options: { timeout?: number; retries?: number } = {}) {
    this.options = {
      timeout: 30000,
      retries: 3,
      ...options
    };
    
    this.setupHMR();
  }

  /**
   * Register a new remote module
   */
  async register(name: string, url: string): Promise<void> {
    const moduleInfo: RemoteModuleInfo = {
      name,
      url,
      status: 'loading'
    };
    
    this.modules.set(name, moduleInfo);
    
    try {
      // Load manifest first
      const manifestUrl = this.resolveManifestUrl(url);
      const manifest = await this.loadManifest(manifestUrl);
      
      moduleInfo.manifest = manifest;
      moduleInfo.status = 'loaded';
    } catch (error) {
      moduleInfo.status = 'error';
      moduleInfo.error = error instanceof Error ? error.message : String(error);
      throw new RemoteLoadError(
        `Failed to register module "${name}": ${moduleInfo.error}`,
        name,
        url
      );
    }
  }

  /**
   * Load a remote module
   */
  async load(name: string): Promise<any> {
    // Check if already loading
    const existingPromise = this.loadingPromises.get(name);
    if (existingPromise) {
      return existingPromise;
    }
    
    const moduleInfo = this.modules.get(name);
    if (!moduleInfo) {
      throw new ModuleFederationError(`Module "${name}" is not registered`);
    }
    
    if (moduleInfo.status === 'error') {
      throw new RemoteLoadError(
        `Module "${name}" failed to load: ${moduleInfo.error}`,
        name,
        moduleInfo.url
      );
    }
    
    if (moduleInfo.module) {
      return moduleInfo.module;
    }
    
    // Start loading
    const loadingPromise = this.loadModuleWithRetry(moduleInfo);
    this.loadingPromises.set(name, loadingPromise);
    
    try {
      const module = await loadingPromise;
      moduleInfo.module = module;
      moduleInfo.status = 'loaded';
      this.loadingPromises.delete(name);
      return module;
    } catch (error) {
      moduleInfo.status = 'error';
      moduleInfo.error = error instanceof Error ? error.message : String(error);
      this.loadingPromises.delete(name);
      throw error;
    }
  }

  /**
   * Get module information
   */
  getModule(name: string): RemoteModuleInfo | undefined {
    return this.modules.get(name);
  }

  /**
   * List all registered modules
   */
  listModules(): RemoteModuleInfo[] {
    return Array.from(this.modules.values());
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(name: string): boolean {
    const moduleInfo = this.modules.get(name);
    return moduleInfo?.status === 'loaded' && !!moduleInfo.module;
  }

  /**
   * Unload a module
   */
  async unload(name: string): Promise<void> {
    const moduleInfo = this.modules.get(name);
    if (!moduleInfo) return;
    
    // Cancel loading if in progress
    this.loadingPromises.delete(name);
    
    // Clear module cache
    moduleInfo.module = undefined;
    moduleInfo.status = 'loading';
    
    // Trigger HMR callbacks
    const callbacks = this.hmrCallbacks.get(name);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.warn(`HMR callback error for module "${name}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to HMR updates for a module
   */
  onHMRUpdate(moduleName: string, callback: Function): () => void {
    if (!this.hmrCallbacks.has(moduleName)) {
      this.hmrCallbacks.set(moduleName, new Set());
    }
    
    const callbacks = this.hmrCallbacks.get(moduleName)!;
    callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.hmrCallbacks.delete(moduleName);
      }
    };
  }

  /**
   * Load module with retry logic
   */
  private async loadModuleWithRetry(moduleInfo: RemoteModuleInfo): Promise<any> {
    let lastError: Error;
    const maxRetries = this.options.retries || 3;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.loadModuleOnce(moduleInfo);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new RemoteLoadError(
      `Failed to load module "${moduleInfo.name}" after ${maxRetries} attempts: ${lastError.message}`,
      moduleInfo.name,
      moduleInfo.url
    );
  }

  /**
   * Load module once with timeout
   */
  private async loadModuleOnce(moduleInfo: RemoteModuleInfo): Promise<any> {
    const timeoutMs = this.options.timeout || 30000;
    
    return Promise.race([
      this.loadModuleScript(moduleInfo),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Module load timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Load module script dynamically
   */
  private async loadModuleScript(moduleInfo: RemoteModuleInfo): Promise<any> {
    const { url, manifest } = moduleInfo;
    
    // For ES modules, use dynamic import
    if (manifest?.exposes) {
      const entryUrl = this.resolveEntryUrl(url);
      return await import(entryUrl);
    }
    
    // For other formats, use script tag loading
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = url;
      
      script.onload = () => {
        try {
          // Try to get the module from global scope
          const globalName = this.getGlobalName(moduleInfo.name);
          const module = (window as any)[globalName];
          
          if (!module) {
            throw new Error(`Module "${moduleInfo.name}" not found in global scope`);
          }
          
          resolve(module);
        } catch (error) {
          reject(error);
        } finally {
          document.head.removeChild(script);
        }
      };
      
      script.onerror = () => {
        document.head.removeChild(script);
        reject(new Error(`Failed to load script: ${url}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load module manifest
   */
  private async loadManifest(manifestUrl: string): Promise<ModuleManifest> {
    try {
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const manifest = await response.json();
      
      // Validate manifest structure
      if (!manifest.name || !manifest.version) {
        throw new Error('Invalid manifest: missing name or version');
      }
      
      return manifest;
    } catch (error) {
      throw new Error(`Failed to load manifest from ${manifestUrl}: ${error}`);
    }
  }

  /**
   * Resolve manifest URL from entry URL
   */
  private resolveManifestUrl(entryUrl: string): string {
    try {
      const url = new URL(entryUrl);
      url.pathname = url.pathname.replace(/\/[^/]*$/, '/manifest.json');
      return url.toString();
    } catch (error) {
      throw new Error(`Invalid entry URL: ${entryUrl}`);
    }
  }

  /**
   * Resolve entry URL for module loading
   */
  private resolveEntryUrl(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      
      // If it's already pointing to a JS file, use it as-is
      if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
        return url.toString();
      }
      
      // Otherwise, assume it's pointing to a directory and add index.js
      if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
      }
      url.pathname += 'index.js';
      
      return url.toString();
    } catch (error) {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }
  }

  /**
   * Get global variable name for a module
   */
  private getGlobalName(moduleName: string): string {
    return moduleName.replace(/[@/-]/g, '_');
  }

  /**
   * Setup HMR (Hot Module Replacement) support
   */
  private setupHMR(): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check if HMR is available (Vite specific)
    if (typeof (import.meta as any).hot !== 'undefined') {
      // Listen for HMR updates
      (import.meta as any).hot.on('plataforma:module-update', (data: any) => {
        const { moduleName } = data;
        
        if (this.modules.has(moduleName)) {
          console.log(`[HMR] Updating module: ${moduleName}`);
          this.unload(moduleName).catch(console.error);
        }
      });
    }
    
    // Setup WebSocket connection for development
    if (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env.DEV) {
      this.setupDevWebSocket();
    }
  }

  /**
   * Setup WebSocket connection for development updates
   */
  private setupDevWebSocket(): void {
    try {
      const ws = new WebSocket('ws://localhost:3030/__plataforma_hmr__');
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'module-update') {
            const { moduleName } = message.data;
            this.unload(moduleName).catch(console.error);
          }
        } catch (error) {
          console.warn('[HMR] Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.warn('[HMR] WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('[HMR] WebSocket connection closed');
        
        // Attempt to reconnect after delay
        setTimeout(() => {
          this.setupDevWebSocket();
        }, 5000);
      };
    } catch (error) {
      console.warn('[HMR] Failed to setup WebSocket:', error);
    }
  }
}

/**
 * Create a module loader instance
 */
export function createModuleLoader(options?: { timeout?: number; retries?: number }): ModuleRegistry {
  return new ModuleLoader(options);
}

/**
 * Global module loader instance
 */
let globalLoader: ModuleRegistry | null = null;

/**
 * Get or create global module loader
 */
export function getGlobalLoader(): ModuleRegistry {
  if (!globalLoader) {
    globalLoader = createModuleLoader();
    
    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      (window as any).__PLATAFORMA_MODULE_LOADER__ = globalLoader;
    }
  }
  
  return globalLoader;
}

/**
 * Load a module using the global loader
 */
export async function loadModule(name: string, url?: string): Promise<any> {
  const loader = getGlobalLoader();
  
  if (url && !loader.getModule(name)) {
    await loader.register(name, url);
  }
  
  return loader.load(name);
}

/**
 * Create error boundary for module loading
 */
export function createModuleErrorBoundary(moduleName: string) {
  return class ModuleErrorBoundary extends Error {
    constructor(message: string, public cause?: Error) {
      super(`Module "${moduleName}" error: ${message}`);
      this.name = 'ModuleErrorBoundary';
    }
  };
}