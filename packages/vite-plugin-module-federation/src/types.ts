/**
 * Type definitions for Module Federation plugin
 */

export interface ModuleFederationOptions {
  /**
   * Name of the current application
   */
  name: string;
  
  /**
   * Shared dependencies configuration
   */
  shared?: SharedDependencies;
  
  /**
   * Remote modules configuration
   */
  remotes?: RemoteModules;
  
  /**
   * Exposed modules configuration
   */
  exposes?: ExposedModules;
  
  /**
   * Library configuration for exposed modules
   */
  library?: LibraryOptions;
  
  /**
   * Development server configuration
   */
  dev?: DevServerOptions;
}

export interface SharedDependencies {
  [packageName: string]: SharedDependencyOptions | string;
}

export interface SharedDependencyOptions {
  /**
   * Version of the dependency
   */
  version?: string;
  
  /**
   * Whether this dependency is singleton
   */
  singleton?: boolean;
  
  /**
   * Whether this dependency is required
   */
  requiredVersion?: string | false;
  
  /**
   * Whether to use strict version matching
   */
  strictVersion?: boolean;
  
  /**
   * Package name to use for the dependency
   */
  packageName?: string;
  
  /**
   * Whether this dependency should be eagerly loaded
   */
  eager?: boolean;
}

export interface RemoteModules {
  [remoteName: string]: string | RemoteModuleOptions;
}

export interface RemoteModuleOptions {
  /**
   * URL of the remote entry
   */
  url: string;
  
  /**
   * Format of the remote entry
   */
  format?: 'esm' | 'systemjs' | 'var';
  
  /**
   * Whether to preload this remote
   */
  preload?: boolean;
  
  /**
   * Timeout for loading remote
   */
  timeout?: number;
}

export interface ExposedModules {
  [exposeName: string]: string;
}

export interface LibraryOptions {
  /**
   * Library type
   */
  type: 'esm' | 'systemjs' | 'var';
  
  /**
   * Library name for 'var' type
   */
  name?: string;
}

export interface DevServerOptions {
  /**
   * Port for the development server
   */
  port?: number;
  
  /**
   * Host for the development server
   */
  host?: string;
  
  /**
   * Whether to enable hot module replacement
   */
  hmr?: boolean;
}

export interface ModuleManifest {
  /**
   * Module name
   */
  name: string;
  
  /**
   * Module version
   */
  version: string;
  
  /**
   * Entry point URL
   */
  entry: string;
  
  /**
   * Exposed modules
   */
  exposes: ExposedModules;
  
  /**
   * Required shared dependencies
   */
  shared: SharedDependencies;
  
  /**
   * Module metadata
   */
  metadata?: {
    description?: string;
    author?: string;
    homepage?: string;
    repository?: string;
    keywords?: string[];
  };
  
  /**
   * Build information
   */
  build?: {
    timestamp: number;
    hash: string;
    viteVersion: string;
    pluginVersion: string;
  };
}

export interface RemoteModuleInfo {
  /**
   * Remote module name
   */
  name: string;
  
  /**
   * Remote module URL
   */
  url: string;
  
  /**
   * Loaded manifest
   */
  manifest?: ModuleManifest;
  
  /**
   * Loading status
   */
  status: 'loading' | 'loaded' | 'error';
  
  /**
   * Error message if loading failed
   */
  error?: string;
  
  /**
   * Loaded module instance
   */
  module?: any;
}

export interface ModuleRegistry {
  /**
   * Register a new remote module
   */
  register(name: string, url: string): Promise<void>;
  
  /**
   * Load a remote module
   */
  load(name: string): Promise<any>;
  
  /**
   * Get module information
   */
  getModule(name: string): RemoteModuleInfo | undefined;
  
  /**
   * List all registered modules
   */
  listModules(): RemoteModuleInfo[];
  
  /**
   * Check if a module is loaded
   */
  isLoaded(name: string): boolean;
  
  /**
   * Unload a module
   */
  unload(name: string): Promise<void>;
}

export interface ModuleFederationPlugin {
  /**
   * Plugin name
   */
  name: string;
  
  /**
   * Apply plugin configuration
   */
  apply: 'serve' | 'build' | undefined;
  
  /**
   * Configure development server
   */
  configureServer?: (server: any) => void;
  
  /**
   * Build start hook
   */
  buildStart?: () => void;
  
  /**
   * Generate bundle hook
   */
  generateBundle?: (options: any, bundle: any) => void;
  
  /**
   * Transform code hook
   */
  transform?: (code: string, id: string) => string | null;
}

// Error types
export class ModuleFederationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ModuleFederationError';
  }
}

export class RemoteLoadError extends ModuleFederationError {
  constructor(message: string, public remoteName: string, public url: string) {
    super(message);
    this.name = 'RemoteLoadError';
    this.code = 'REMOTE_LOAD_ERROR';
  }
}

export class SharedDependencyError extends ModuleFederationError {
  constructor(message: string, public dependency: string, public version?: string) {
    super(message);
    this.name = 'SharedDependencyError';
    this.code = 'SHARED_DEPENDENCY_ERROR';
  }
}

// Utility types
export type ModuleLoader = (name: string) => Promise<any>;
export type SharedDependencyResolver = (name: string, version: string) => any;
export type RemoteEntryFactory = () => Promise<any>;

// Global types for runtime
declare global {
  interface Window {
    __PLATAFORMA_MODULE_FEDERATION__?: {
      registry: ModuleRegistry;
      shared: Record<string, any>;
      version: string;
    };
  }
}