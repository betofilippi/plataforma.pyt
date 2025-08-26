/**
 * Core types for the Dynamic Module Loader system
 */

import { ComponentType, ReactNode } from 'react';

// Re-export types from module federation
export type {
  ModuleManifest,
  RemoteModuleInfo,
  ModuleRegistry,
  SharedDependencies,
  RemoteModules,
  ModuleFederationError,
  RemoteLoadError
} from '@plataforma/vite-plugin-module-federation';

/**
 * Module lifecycle states
 */
export type ModuleLifecycleState = 
  | 'unloaded'    // Module not loaded yet
  | 'loading'     // Module is being loaded
  | 'loaded'      // Module loaded successfully
  | 'error'       // Module failed to load
  | 'updating'    // Module is being updated/reloaded
  | 'unloading';  // Module is being unloaded

/**
 * Module lifecycle events
 */
export interface ModuleLifecycleEvents {
  onModuleLoad?: (moduleName: string) => void | Promise<void>;
  onModuleReady?: (moduleName: string, module: any) => void | Promise<void>;
  onModuleError?: (moduleName: string, error: Error) => void | Promise<void>;
  onModuleUnload?: (moduleName: string) => void | Promise<void>;
  onModuleUpdate?: (moduleName: string, oldModule: any, newModule: any) => void | Promise<void>;
}

/**
 * Module cache entry
 */
export interface ModuleCacheEntry {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Cached module instance */
  module: any;
  /** Cache timestamp */
  timestamp: number;
  /** Time to live in milliseconds */
  ttl?: number;
  /** Module metadata */
  metadata?: Record<string, any>;
  /** Module hash for version checking */
  hash?: string;
}

/**
 * Module cache configuration
 */
export interface ModuleCacheConfig {
  /** Maximum number of cached modules */
  maxSize?: number;
  /** Default TTL for cached modules (in milliseconds) */
  defaultTtl?: number;
  /** Enable localStorage persistence */
  enablePersistence?: boolean;
  /** Storage key prefix for localStorage */
  storagePrefix?: string;
  /** Enable version checking */
  enableVersionCheck?: boolean;
  /** Enable preloading of modules */
  enablePreloading?: boolean;
}

/**
 * Module communication event
 */
export interface ModuleEvent<T = any> {
  /** Event type */
  type: string;
  /** Source module name */
  source: string;
  /** Target module name (optional, for directed events) */
  target?: string;
  /** Event payload */
  payload: T;
  /** Event timestamp */
  timestamp: number;
  /** Event ID for tracking */
  id: string;
}

/**
 * Module communication configuration
 */
export interface ModuleCommunicationConfig {
  /** Enable event persistence */
  enablePersistence?: boolean;
  /** Maximum event history size */
  maxEventHistory?: number;
  /** Enable event replay for late-joining modules */
  enableEventReplay?: boolean;
  /** Debug mode for event tracking */
  debug?: boolean;
}

/**
 * Shared state entry
 */
export interface SharedStateEntry<T = any> {
  /** State key */
  key: string;
  /** State value */
  value: T;
  /** Owner module name */
  owner: string;
  /** State timestamp */
  timestamp: number;
  /** Whether state should persist */
  persistent?: boolean;
  /** State metadata */
  metadata?: Record<string, any>;
}

/**
 * Module discovery information
 */
export interface ModuleDiscovery {
  /** Module name */
  name: string;
  /** Module version */
  version: string;
  /** Module description */
  description?: string;
  /** Module tags */
  tags?: string[];
  /** Module capabilities */
  capabilities?: string[];
  /** Module dependencies */
  dependencies?: string[];
  /** Module entry URL */
  entry: string;
  /** Discovery timestamp */
  discoveredAt: number;
  /** Module status */
  status: ModuleLifecycleState;
}

/**
 * Module loader configuration
 */
export interface ModuleLoaderConfig {
  /** Cache configuration */
  cache?: ModuleCacheConfig;
  /** Communication configuration */
  communication?: ModuleCommunicationConfig;
  /** Module loading timeout (ms) */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Enable hot module replacement */
  enableHMR?: boolean;
  /** Development mode settings */
  dev?: {
    /** Enable verbose logging */
    verbose?: boolean;
    /** Enable module discovery */
    enableDiscovery?: boolean;
    /** Discovery endpoints */
    discoveryEndpoints?: string[];
  };
}

/**
 * Dynamic module loader context
 */
export interface ModuleLoaderContext {
  /** Module registry instance */
  registry: ModuleRegistry;
  /** Module cache */
  cache: ModuleCache;
  /** Communication bus */
  communication: ModuleCommunication;
  /** Loader configuration */
  config: ModuleLoaderConfig;
  /** Current module state */
  state: Record<string, ModuleLifecycleState>;
  /** Lifecycle event handlers */
  lifecycleHandlers: ModuleLifecycleEvents;
}

/**
 * Module cache interface
 */
export interface ModuleCache {
  /** Get cached module */
  get(name: string): ModuleCacheEntry | null;
  /** Set cached module */
  set(name: string, entry: ModuleCacheEntry): void;
  /** Remove cached module */
  delete(name: string): boolean;
  /** Check if module is cached */
  has(name: string): boolean;
  /** Clear all cached modules */
  clear(): void;
  /** Get cache size */
  size(): number;
  /** Get all cached module names */
  keys(): string[];
  /** Persist cache to storage */
  persist(): Promise<void>;
  /** Load cache from storage */
  restore(): Promise<void>;
  /** Check if module needs update */
  needsUpdate(name: string, version: string, hash?: string): boolean;
}

/**
 * Module communication interface
 */
export interface ModuleCommunication {
  /** Subscribe to events */
  on<T = any>(eventType: string, handler: (event: ModuleEvent<T>) => void): () => void;
  /** Subscribe to events from specific module */
  onFrom<T = any>(eventType: string, source: string, handler: (event: ModuleEvent<T>) => void): () => void;
  /** Emit event to all modules */
  emit<T = any>(eventType: string, payload: T, source: string): void;
  /** Emit event to specific module */
  emitTo<T = any>(eventType: string, payload: T, source: string, target: string): void;
  /** Get shared state */
  getSharedState<T = any>(key: string): T | undefined;
  /** Set shared state */
  setSharedState<T = any>(key: string, value: T, owner: string, persistent?: boolean): void;
  /** Remove shared state */
  removeSharedState(key: string, owner: string): boolean;
  /** List all shared state keys */
  listSharedState(): string[];
  /** Get event history */
  getEventHistory(eventType?: string): ModuleEvent[];
  /** Clear event history */
  clearEventHistory(): void;
  /** Discover available modules */
  discoverModules(): Promise<ModuleDiscovery[]>;
}

/**
 * React component props for module loading
 */
export interface DynamicModuleLoaderProps {
  /** Module name to load */
  moduleName: string;
  /** Module entry URL (optional if already registered) */
  moduleUrl?: string;
  /** Loading fallback component */
  fallback?: ReactNode;
  /** Error fallback component */
  errorFallback?: ComponentType<{ error: Error; retry: () => void }>;
  /** Lifecycle event handlers */
  onLoad?: () => void;
  onReady?: (module: any) => void;
  onError?: (error: Error) => void;
  onUnload?: () => void;
  /** Module props to pass to loaded component */
  moduleProps?: Record<string, any>;
  /** Children render function */
  children?: (module: any, loading: boolean, error: Error | null) => ReactNode;
  /** Enable lazy loading */
  lazy?: boolean;
  /** Preload module without rendering */
  preload?: boolean;
  /** Module loading timeout */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
}

/**
 * Module error boundary props
 */
export interface ModuleErrorBoundaryProps {
  /** Module name for error context */
  moduleName: string;
  /** Fallback component for errors */
  fallback?: ComponentType<{ error: Error; retry: () => void; moduleName: string }>;
  /** Error handler */
  onError?: (error: Error, moduleName: string) => void;
  /** Whether to retry automatically */
  autoRetry?: boolean;
  /** Retry delay in milliseconds */
  retryDelay?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Children */
  children: ReactNode;
}

/**
 * Loading fallback props
 */
export interface LoadingFallbackProps {
  /** Module name being loaded */
  moduleName?: string;
  /** Loading progress (0-100) */
  progress?: number;
  /** Loading message */
  message?: string;
  /** Custom loading component */
  component?: ComponentType<{ moduleName?: string; progress?: number; message?: string }>;
  /** Loading animation type */
  animation?: 'spinner' | 'progress' | 'skeleton' | 'pulse';
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Theme variant */
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * Module provider props
 */
export interface ModuleProviderProps {
  /** Module loader configuration */
  config?: ModuleLoaderConfig;
  /** Children components */
  children: ReactNode;
}

/**
 * Typed event handlers for better TypeScript support
 */
export interface TypedModuleEvents {
  /** Module state change events */
  'module:state-change': { moduleName: string; oldState: ModuleLifecycleState; newState: ModuleLifecycleState };
  /** Module ready events */
  'module:ready': { moduleName: string; module: any };
  /** Module error events */
  'module:error': { moduleName: string; error: Error };
  /** Module update events */
  'module:update': { moduleName: string; oldModule: any; newModule: any };
  /** Shared state change events */
  'shared-state:change': { key: string; value: any; owner: string };
  /** Module discovery events */
  'module:discovered': { modules: ModuleDiscovery[] };
}

/**
 * Hook return types
 */
export interface UseModuleLoaderResult {
  /** Load a module */
  loadModule: (name: string, url?: string) => Promise<any>;
  /** Unload a module */
  unloadModule: (name: string) => Promise<void>;
  /** Check if module is loaded */
  isLoaded: (name: string) => boolean;
  /** Get module state */
  getModuleState: (name: string) => ModuleLifecycleState;
  /** List all modules */
  listModules: () => string[];
  /** Module registry */
  registry: ModuleRegistry;
  /** Module cache */
  cache: ModuleCache;
  /** Communication bus */
  communication: ModuleCommunication;
}

export interface UseModuleStateResult {
  /** Module instance */
  module: any | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Module lifecycle state */
  state: ModuleLifecycleState;
  /** Reload module */
  reload: () => Promise<void>;
  /** Unload module */
  unload: () => Promise<void>;
}

export interface UseCommunicationResult {
  /** Emit event */
  emit: <T = any>(eventType: string, payload: T) => void;
  /** Subscribe to events */
  on: <T = any>(eventType: string, handler: (event: ModuleEvent<T>) => void) => () => void;
  /** Get shared state */
  getSharedState: <T = any>(key: string) => T | undefined;
  /** Set shared state */
  setSharedState: <T = any>(key: string, value: T, persistent?: boolean) => void;
  /** Event history */
  eventHistory: ModuleEvent[];
  /** Shared state */
  sharedState: Record<string, any>;
}

/**
 * Module loader factory function type
 */
export type ModuleLoaderFactory = (config?: ModuleLoaderConfig) => {
  registry: ModuleRegistry;
  cache: ModuleCache;
  communication: ModuleCommunication;
  context: ModuleLoaderContext;
};

/**
 * Module preloader configuration
 */
export interface ModulePreloaderConfig {
  /** Modules to preload */
  modules: Array<{ name: string; url: string; priority?: number }>;
  /** Preload strategy */
  strategy?: 'eager' | 'lazy' | 'idle';
  /** Maximum concurrent preloads */
  maxConcurrent?: number;
  /** Enable preload on interaction */
  preloadOnInteraction?: boolean;
  /** Intersection observer options for lazy preloading */
  intersectionOptions?: IntersectionObserverInit;
}

/**
 * Error recovery strategies
 */
export type ErrorRecoveryStrategy = 
  | 'retry'           // Retry loading the module
  | 'fallback'        // Load a fallback module
  | 'skip'            // Skip the module and continue
  | 'reload'          // Reload the entire application
  | 'report'          // Report error and continue
  | 'custom';         // Use custom recovery handler

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  /** Default strategy */
  defaultStrategy?: ErrorRecoveryStrategy;
  /** Strategy per error type */
  strategies?: Record<string, ErrorRecoveryStrategy>;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay */
  retryDelay?: number;
  /** Fallback modules */
  fallbackModules?: Record<string, string>;
  /** Custom recovery handlers */
  customHandlers?: Record<string, (error: Error, context: any) => Promise<void>>;
}