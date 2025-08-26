/**
 * Core Plugin System Components
 * 
 * This module exports the core components of the plugin system:
 * - PluginManager: Main orchestrator for plugin lifecycle
 * - PluginLoader: Dynamic loading of plugins from various sources
 * - PluginSandbox: Secure execution environment
 * - PluginRegistry: Plugin registration and discovery
 */

export { PluginManager } from './PluginManager';
export type { PluginManagerOptions } from './PluginManager';

export { PluginLoader } from './PluginLoader';
export type { 
  PluginLoaderOptions,
  LoadedPlugin,
  LoadStrategy,
  CacheStats
} from './PluginLoader';

export { PluginSandbox } from './PluginSandbox';
export type {
  PluginSandboxOptions,
  SandboxInstance,
  SandboxStats,
  SecurityViolation
} from './PluginSandbox';

export { 
  PluginRegistry,
  MemoryStorageProvider,
  LocalStorageProvider
} from './PluginRegistry';
export type {
  PluginRegistryOptions,
  RegisteredPlugin,
  PluginMetadata,
  SearchQuery,
  RegistryStatistics,
  RegistryExport,
  DependencyValidation,
  StorageProvider
} from './PluginRegistry';