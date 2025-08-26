/**
 * Module Contracts Package
 * 
 * Comprehensive module interface contracts and validation system for plataforma.app.
 * This package defines the standard interfaces, types, and validation rules that all
 * modules in the ecosystem must conform to for proper integration and interoperability.
 * 
 * @version 1.0.0
 * @author Plataforma Team
 * @license MIT
 */

// Core contracts - fundamental interfaces all modules must implement
export * from './contracts';

// Specialized module types - specific contracts for different module categories
export * from './types';

// Communication contracts - event-driven inter-module communication
export * from './communication/EventContract';

// Validation system - comprehensive validation and compliance checking
export * from './validation';

// Registry interfaces - module discovery and management
export * from './registry/RegistryAPI';
export * from './registry/DiscoveryAPI';

// Re-export key types for convenience
export type {
  // Core module interface
  Module,
  ModuleManifest,
  ModuleState,
  ModuleConfig,
  ModuleContext,
  
  // Platform integration
  PlatformAPI,
  ModuleRegistry,
  EventBus,
  
  // Lifecycle management
  ModuleLifecycle,
  ModuleLifecycleState,
  ModuleLifecycleManager,
  
  // Permission system
  ModulePermissionRequirement,
  PermissionManager,
  PermissionContext,
  
  // Dependency management
  ModuleDependencySpec,
  DependencyResolver,
  DependencyInjector,
  
  // Communication
  BaseEvent,
  EventStream,
  EventSubscriber,
  
  // Validation
  ManifestValidationResult,
  RuntimeValidator,
  ContractValidator
} from './contracts';

// Export specialized module types
export type {
  BusinessModule,
  SystemModule,
  PluginModule,
  UIModule
} from './types';

// Export utility classes
export { 
  BaseModule,
  BaseModuleLifecycle 
} from './contracts';

export { 
  SystemPermissions,
  PermissionUtils,
  DependencyUtils 
} from './contracts';

export { 
  EventUtils 
} from './communication/EventContract';

export { 
  ManifestValidator,
  ValidationUtils 
} from './validation';

// Package metadata
export const PACKAGE_INFO = {
  name: '@plataforma/module-contracts',
  version: '1.0.0',
  description: 'Comprehensive module interface contracts for plataforma.app',
  author: 'Plataforma Team',
  license: 'MIT',
  contractVersion: '1.0.0',
  apiVersion: '1.0.0',
  schemaVersion: '1.0.0'
} as const;

// Contract versioning
export const CONTRACT_VERSIONS = {
  MANIFEST: '1.0.0',
  API: '1.0.0',
  LIFECYCLE: '1.0.0',
  PERMISSIONS: '1.0.0',
  DEPENDENCIES: '1.0.0',
  EVENTS: '1.0.0',
  VALIDATION: '1.0.0'
} as const;

// Supported platform versions
export const PLATFORM_COMPATIBILITY = {
  MINIMUM_VERSION: '1.0.0',
  RECOMMENDED_VERSION: '1.0.0',
  MAXIMUM_VERSION: '2.0.0',
  SUPPORTED_VERSIONS: ['^1.0.0'] as const
} as const;

// Module categories and types
export const MODULE_CATEGORIES = [
  'business',
  'system',
  'ai',
  'communication',
  'storage',
  'security',
  'analytics',
  'integration',
  'utility',
  'custom'
] as const;

export const MODULE_TYPES = [
  'business-module',
  'system-module',
  'plugin',
  'ui-library',
  'service',
  'data-provider',
  'middleware'
] as const;

// Standard permissions
export const STANDARD_PERMISSIONS = {
  // File system
  FILESYSTEM_READ: 'filesystem:read',
  FILESYSTEM_WRITE: 'filesystem:write',
  
  // Database
  DATABASE_READ: 'database:read',
  DATABASE_WRITE: 'database:write',
  DATABASE_SCHEMA: 'database:schema',
  
  // Network
  NETWORK_HTTP: 'network:http',
  NETWORK_WEBSOCKET: 'network:websocket',
  
  // UI
  UI_DESKTOP: 'ui:desktop',
  UI_WINDOWS: 'ui:windows',
  UI_NOTIFICATIONS: 'ui:notifications',
  
  // User data
  USER_PROFILE: 'user:profile',
  USER_PREFERENCES: 'user:preferences',
  
  // Communication
  COMMUNICATION_EVENTS: 'communication:events',
  COMMUNICATION_RPC: 'communication:rpc'
} as const;

// Event types
export const STANDARD_EVENT_TYPES = {
  // System events
  MODULE_LOADED: 'system.module.loaded',
  MODULE_STARTED: 'system.module.started',
  MODULE_STOPPED: 'system.module.stopped',
  MODULE_FAILED: 'system.module.failed',
  CONFIG_CHANGED: 'system.config.changed',
  
  // Business events
  ENTITY_CREATED: 'domain.entity.created',
  ENTITY_UPDATED: 'domain.entity.updated',
  ENTITY_DELETED: 'domain.entity.deleted',
  WORKFLOW_STARTED: 'domain.workflow.started',
  WORKFLOW_COMPLETED: 'domain.workflow.completed',
  
  // UI events
  COMPONENT_RENDERED: 'ui.component.rendered',
  USER_INTERACTION: 'ui.user.interaction',
  NAVIGATION: 'ui.navigation',
  
  // Integration events
  API_CALL: 'integration.api.call',
  WEBHOOK_RECEIVED: 'integration.webhook.received',
  DATA_SYNC: 'integration.data.sync',
  
  // Security events
  AUTH_LOGIN: 'security.auth.login',
  AUTH_LOGOUT: 'security.auth.logout',
  PERMISSION_GRANTED: 'security.permission.granted',
  PERMISSION_DENIED: 'security.permission.denied',
  
  // Monitoring events
  PERFORMANCE_METRIC: 'monitoring.performance.metric',
  HEALTH_CHECK: 'monitoring.health.check',
  ERROR_OCCURRED: 'monitoring.error.occurred'
} as const;

// Validation constants
export const VALIDATION_CONSTANTS = {
  MIN_VALIDATION_SCORE: 70,
  MAX_WARNINGS_ALLOWED: 10,
  CRITICAL_ERRORS_THRESHOLD: 0,
  MAJOR_ERRORS_THRESHOLD: 3,
  
  // ID format rules
  MODULE_ID_PATTERN: /^[a-z][a-z0-9-]*[a-z0-9]$/,
  VERSION_PATTERN: /^\d+\.\d+\.\d+(-[\w\d-]+)?(\+[\w\d-]+)?$/,
  
  // Description limits
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Keywords limits
  MAX_KEYWORDS: 20,
  MIN_KEYWORDS: 1
} as const;

// Error codes
export const ERROR_CODES = {
  // Manifest errors
  INVALID_MANIFEST: 'E001',
  MISSING_REQUIRED_FIELD: 'E002',
  INVALID_FIELD_TYPE: 'E003',
  INVALID_ENUM_VALUE: 'E004',
  INVALID_VERSION: 'E005',
  
  // Dependency errors
  DEPENDENCY_NOT_FOUND: 'E101',
  VERSION_CONFLICT: 'E102',
  CIRCULAR_DEPENDENCY: 'E103',
  MISSING_PEER_DEPENDENCY: 'E104',
  
  // Permission errors
  PERMISSION_DENIED: 'E201',
  INVALID_PERMISSION: 'E202',
  FORBIDDEN_PERMISSION: 'E203',
  PERMISSION_ESCALATION: 'E204',
  
  // Runtime errors
  MODULE_FAILED_TO_LOAD: 'E301',
  MODULE_FAILED_TO_START: 'E302',
  MODULE_CRASHED: 'E303',
  RESOURCE_EXHAUSTED: 'E304',
  
  // Communication errors
  EVENT_DELIVERY_FAILED: 'E401',
  INVALID_EVENT_SCHEMA: 'E402',
  SUBSCRIBER_ERROR: 'E403',
  STREAM_UNAVAILABLE: 'E404',
  
  // Validation errors
  SCHEMA_VALIDATION_FAILED: 'E501',
  CONTRACT_VIOLATION: 'E502',
  RUNTIME_COMPLIANCE_FAILED: 'E503',
  SECURITY_VIOLATION: 'E504'
} as const;

// Default configurations
export const DEFAULT_MODULE_CONFIG = {
  enabled: true,
  debug: false,
  logLevel: 'info' as const,
  features: {},
  env: {}
} as const;

export const DEFAULT_VALIDATION_CONFIG = {
  level: 'standard' as const,
  customRules: [],
  schemaValidation: {
    enabled: true,
    schemaVersion: '1.0.0',
    additionalProperties: false,
    strictTypes: true
  }
} as const;

// Export type utilities
export function createModuleId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateModuleId(id: string): boolean {
  return VALIDATION_CONSTANTS.MODULE_ID_PATTERN.test(id);
}

export function validateVersion(version: string): boolean {
  return VALIDATION_CONSTANTS.VERSION_PATTERN.test(version);
}

export function isCompatibleVersion(required: string, available: string): boolean {
  // Simplified compatibility check - real implementation would use semver
  const [reqMajor] = required.split('.');
  const [availMajor] = available.split('.');
  return reqMajor === availMajor;
}

// Export factory functions
export interface ModuleContractFactory {
  createManifest(options: CreateManifestOptions): ModuleManifest;
  createConfig(options: CreateConfigOptions): ModuleConfig;
  createValidator(options: CreateValidatorOptions): ManifestValidator;
}

export interface CreateManifestOptions {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: string;
  readonly type: string;
  readonly author: string | { name: string; email?: string; url?: string };
  readonly license?: string;
  readonly keywords?: readonly string[];
  readonly homepage?: string;
  readonly repository?: { type: string; url: string };
}

export interface CreateConfigOptions {
  readonly enabled?: boolean;
  readonly debug?: boolean;
  readonly logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  readonly features?: Record<string, boolean>;
  readonly env?: Record<string, string>;
  readonly custom?: Record<string, any>;
}

export interface CreateValidatorOptions {
  readonly level?: 'basic' | 'standard' | 'strict' | 'pedantic';
  readonly platformVersion?: string;
  readonly environment?: 'development' | 'staging' | 'production';
  readonly organizationRules?: any;
}

/**
 * Contract compliance checker
 */
export interface ContractCompliance {
  checkCompliance(module: Module): Promise<ComplianceResult>;
  validateInterface(module: Module): Promise<InterfaceValidationResult>;
  validateLifecycle(module: Module): Promise<LifecycleValidationResult>;
  validatePermissions(module: Module): Promise<PermissionValidationResult>;
  validateEvents(module: Module): Promise<EventValidationResult>;
}

export interface ComplianceResult {
  readonly compliant: boolean;
  readonly score: number;
  readonly violations: readonly ComplianceViolation[];
  readonly recommendations: readonly string[];
}

export interface ComplianceViolation {
  readonly type: 'interface' | 'lifecycle' | 'permission' | 'event' | 'security';
  readonly severity: 'critical' | 'major' | 'minor';
  readonly message: string;
  readonly fix?: string;
}

export interface InterfaceValidationResult {
  readonly valid: boolean;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly deprecated: readonly string[];
}

export interface LifecycleValidationResult {
  readonly valid: boolean;
  readonly states: readonly string[];
  readonly transitions: readonly string[];
  readonly hooks: readonly string[];
}

/**
 * Module contract builder for creating compliant modules
 */
export class ModuleContractBuilder {
  private manifest: Partial<ModuleManifest> = {};
  private config: Partial<ModuleConfig> = {};
  
  setId(id: string): this {
    this.manifest.id = id;
    return this;
  }
  
  setName(name: string): this {
    this.manifest.name = name;
    return this;
  }
  
  setVersion(version: string): this {
    this.manifest.version = version;
    return this;
  }
  
  setDescription(description: string): this {
    this.manifest.description = description;
    return this;
  }
  
  setCategory(category: keyof typeof MODULE_CATEGORIES): this {
    this.manifest.category = category as any;
    return this;
  }
  
  setType(type: keyof typeof MODULE_TYPES): this {
    this.manifest.type = type as any;
    return this;
  }
  
  setAuthor(author: string | { name: string; email?: string }): this {
    if (typeof author === 'string') {
      this.manifest.author = { name: author };
    } else {
      this.manifest.author = author;
    }
    return this;
  }
  
  setLicense(license: string): this {
    this.manifest.license = license;
    return this;
  }
  
  addKeywords(...keywords: string[]): this {
    this.manifest.keywords = [...(this.manifest.keywords || []), ...keywords];
    return this;
  }
  
  enableFeature(feature: string): this {
    if (!this.config.features) {
      this.config.features = {};
    }
    this.config.features[feature] = true;
    return this;
  }
  
  setLogLevel(level: 'error' | 'warn' | 'info' | 'debug' | 'trace'): this {
    this.config.logLevel = level;
    return this;
  }
  
  build(): { manifest: ModuleManifest; config: ModuleConfig } {
    // Validate required fields
    const required = ['id', 'name', 'version', 'description', 'category', 'type', 'author'];
    for (const field of required) {
      if (!(field in this.manifest)) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }
    
    // Apply defaults
    const manifest: ModuleManifest = {
      license: 'MIT',
      keywords: [],
      entryPoints: {
        main: 'dist/index.js',
        types: 'dist/index.d.ts'
      },
      dependencies: {
        platform: '^1.0.0',
        peers: [],
        optionalPeers: [],
        external: []
      },
      requirements: {},
      permissions: {
        system: [],
        resources: [],
        api: [],
        ui: []
      },
      metadata: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      },
      ...this.manifest
    } as ModuleManifest;
    
    const config: ModuleConfig = {
      ...DEFAULT_MODULE_CONFIG,
      ...this.config
    };
    
    return { manifest, config };
  }
}

// Export version information
export const VERSION_INFO = {
  package: PACKAGE_INFO.version,
  contracts: CONTRACT_VERSIONS,
  platform: PLATFORM_COMPATIBILITY,
  buildDate: new Date().toISOString(),
  nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown'
} as const;

// Export for debugging and introspection
export const DEBUG_INFO = {
  packageInfo: PACKAGE_INFO,
  contractVersions: CONTRACT_VERSIONS,
  platformCompatibility: PLATFORM_COMPATIBILITY,
  moduleCategories: MODULE_CATEGORIES,
  moduleTypes: MODULE_TYPES,
  standardPermissions: STANDARD_PERMISSIONS,
  standardEventTypes: STANDARD_EVENT_TYPES,
  validationConstants: VALIDATION_CONSTANTS,
  errorCodes: ERROR_CODES
} as const;