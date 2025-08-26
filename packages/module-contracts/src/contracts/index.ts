/**
 * Module Contracts Package
 * 
 * Comprehensive contracts and interfaces for the plataforma.app module system.
 * All modules must conform to these contracts for proper integration.
 */

// Core contracts
export * from './ModuleManifest';
export * from './ModuleAPI';
export * from './ModuleLifecycle';
export * from './ModulePermissions';
export * from './ModuleDependencies';

// Key type re-exports are handled by individual module exports

export type {
  Module,
  ModuleState,
  ModuleConfig,
  ModuleContext,
  PlatformAPI,
  ModuleRegistry,
  EventBus,
  ModuleLogger,
  ConfigService,
  PermissionManager as APIPermissionManager,
  StorageService,
  DatabaseService,
  HTTPClient,
  WindowAPI,
  DesktopAPI,
  NotificationAPI,
  ThemeAPI,
  UserAPI,
  AuthAPI,
  BaseModule
} from './ModuleAPI';

export type {
  ModuleLifecycle,
  ModuleLifecycleState,
  ModuleLifecycleHooks,
  ModuleLifecycleResult,
  ModuleLifecycleStatus,
  ModuleLifecycleManager,
  BaseModuleLifecycle
} from './ModuleLifecycle';

export type {
  ModulePermissionRequirement,
  PermissionCategory,
  PermissionScope,
  PermissionLevel,
  PermissionManager,
  PermissionContext,
  PermissionEvaluationResult,
  PermissionRequestResult,
  PermissionGrant,
  PermissionPolicy,
  PermissionAuditor
} from './ModulePermissions';

export type {
  ModuleDependencySpec,
  DependencyType,
  DependencyResolver,
  DependencyInjector,
  DependencyGraph,
  DependencyResolution,
  ResolvedDependency,
  DependencyConflict
} from './ModuleDependencies';

// Export utility functions
export { 
  isModuleManifest, 
  createModuleManifest 
} from './ModuleManifest';

export { 
  BaseModule 
} from './ModuleAPI';

export { 
  BaseModuleLifecycle 
} from './ModuleLifecycle';

export { 
  SystemPermissions,
  PermissionUtils,
  isPermissionRequirement,
  createPermissionRequirement
} from './ModulePermissions';

export { 
  DependencyUtils 
} from './ModuleDependencies';

/**
 * Contract version information
 */
export const CONTRACT_VERSION = '1.0.0';

/**
 * Supported platform versions
 */
export const SUPPORTED_PLATFORM_VERSIONS = ['^1.0.0'] as const;

/**
 * Contract metadata
 */
export const CONTRACT_METADATA = {
  version: CONTRACT_VERSION,
  supportedPlatforms: SUPPORTED_PLATFORM_VERSIONS,
  lastUpdated: '2025-08-26',
  description: 'Module interface contracts for plataforma.app',
  author: 'Plataforma Team',
  license: 'MIT'
} as const;