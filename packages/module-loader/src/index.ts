/**
 * Dynamic Module Loader System for plataforma.app
 * 
 * A comprehensive system for dynamic module loading with React components,
 * lifecycle hooks, caching, and inter-module communication.
 */

// Core types
export type * from './types';

// Cache system
export * from './cache';

// Communication system
export * from './communication';

// React components
export * from './react';

// Hooks
export * from './hooks';

// Utilities
export * from './utils';

// Re-export module federation types and utilities
export type {
  ModuleRegistry,
  ModuleManifest,
  RemoteModuleInfo,
  ModuleFederationError,
  RemoteLoadError,
  SharedDependencies,
  RemoteModules
} from '@plataforma/vite-plugin-module-federation';

export { 
  getGlobalLoader,
  loadModule,
  createModuleLoader as createModuleFederationLoader
} from '@plataforma/vite-plugin-module-federation';

// Default export - main factory function
export { createModuleLoader as default } from './utils/ModuleLoaderFactory';