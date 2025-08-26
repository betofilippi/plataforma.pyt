import { z } from 'zod';
import type { EventEmitter } from 'eventemitter3';

/**
 * Plugin System Core Types
 * Defines the fundamental types for the plugin architecture
 */

// Plugin Lifecycle States
export enum PluginLifecycleState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNLOADING = 'unloading',
  ERROR = 'error',
  DISABLED = 'disabled'
}

// Plugin Categories
export enum PluginCategory {
  BUSINESS_MODULE = 'business-module',
  UI_COMPONENT = 'ui-component',
  DATA_PROCESSOR = 'data-processor',
  INTEGRATION = 'integration',
  WORKFLOW = 'workflow',
  SECURITY = 'security',
  UTILITY = 'utility',
  AI_EXTENSION = 'ai-extension'
}

// Security Levels
export enum SecurityLevel {
  TRUSTED = 'trusted',
  SANDBOXED = 'sandboxed',
  RESTRICTED = 'restricted',
  UNTRUSTED = 'untrusted'
}

// Plugin Manifest Schema
export const PluginManifestSchema = z.object({
  // Basic Information
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().min(1),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    url: z.string().url().optional()
  }),
  
  // Technical Details
  category: z.nativeEnum(PluginCategory),
  securityLevel: z.nativeEnum(SecurityLevel).default(SecurityLevel.SANDBOXED),
  entryPoint: z.string().default('index.js'),
  
  // Dependencies
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  
  // Permissions & Capabilities
  permissions: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  
  // Extension Points
  extensionPoints: z.array(z.string()).optional(),
  hooks: z.array(z.string()).optional(),
  
  // UI Configuration
  ui: z.object({
    icon: z.string().optional(),
    theme: z.record(z.any()).optional(),
    slots: z.array(z.string()).optional()
  }).optional(),
  
  // Runtime Configuration
  config: z.record(z.any()).optional(),
  
  // Metadata
  keywords: z.array(z.string()).default([]),
  license: z.string().optional(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  
  // System Requirements
  engines: z.object({
    platform: z.string().optional(),
    node: z.string().optional()
  }).optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Plugin Configuration
export interface PluginConfig {
  id: string;
  enabled: boolean;
  autoStart: boolean;
  config: Record<string, any>;
  permissions: string[];
  resourceLimits: {
    memory: number;
    cpu: number;
    storage: number;
    network: boolean;
  };
}

// Plugin Instance
export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  config: PluginConfig;
  state: PluginLifecycleState;
  module: any;
  context: PluginContext;
  sandbox?: any;
  metadata: {
    loadedAt: Date;
    lastActivity: Date;
    errorCount: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
  };
}

// Plugin Context Interface
export interface PluginContext {
  // Plugin Information
  readonly pluginId: string;
  readonly manifest: PluginManifest;
  readonly config: Record<string, any>;
  
  // Core Services
  readonly logger: PluginLogger;
  readonly events: EventEmitter;
  readonly api: PluginAPI;
  readonly ui: PluginUIContext;
  readonly storage: PluginStorage;
  
  // System Integration
  readonly hooks: PluginHooks;
  readonly extensions: PluginExtensions;
  
  // Security Context
  readonly permissions: PluginPermissions;
  readonly sandbox: PluginSandboxContext;
}

// Plugin Logger Interface
export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
  trace(message: string, ...args: any[]): void;
}

// Plugin API Interface
export interface PluginAPI {
  // HTTP Client
  http: {
    get(url: string, options?: RequestInit): Promise<Response>;
    post(url: string, data?: any, options?: RequestInit): Promise<Response>;
    put(url: string, data?: any, options?: RequestInit): Promise<Response>;
    delete(url: string, options?: RequestInit): Promise<Response>;
  };
  
  // Platform APIs
  platform: {
    getModules(): Promise<any[]>;
    getModule(id: string): Promise<any>;
    invokeModule(id: string, method: string, args?: any[]): Promise<any>;
  };
  
  // Data APIs
  data: {
    query(sql: string, params?: any[]): Promise<any[]>;
    execute(sql: string, params?: any[]): Promise<any>;
    transaction(fn: (tx: any) => Promise<void>): Promise<void>;
  };
}

// Plugin UI Context
export interface PluginUIContext {
  // Component Registration
  registerComponent(name: string, component: any): void;
  unregisterComponent(name: string): void;
  
  // UI Slots
  registerSlot(name: string, component: any): void;
  unregisterSlot(name: string): void;
  
  // Notifications
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  showModal(component: any, props?: any): Promise<any>;
  
  // Navigation
  navigate(path: string): void;
  openWindow(config: any): void;
}

// Plugin Storage Interface
export interface PluginStorage {
  // Key-Value Storage
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // File Storage
  readFile(path: string): Promise<string | Buffer>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(pattern?: string): Promise<string[]>;
}

// Plugin Hooks Interface
export interface PluginHooks {
  // Lifecycle Hooks
  onLoad?: () => Promise<void> | void;
  onActivate?: () => Promise<void> | void;
  onDeactivate?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  
  // System Hooks
  onSystemReady?: () => Promise<void> | void;
  onModuleLoaded?: (moduleId: string) => Promise<void> | void;
  
  // Data Hooks
  onDataChange?: (event: DataChangeEvent) => Promise<void> | void;
  onQueryExecuted?: (query: string, results: any) => Promise<void> | void;
  
  // UI Hooks
  onUIEvent?: (event: UIEvent) => Promise<void> | void;
  onRouteChange?: (route: string) => Promise<void> | void;
}

// Plugin Extensions Interface
export interface PluginExtensions {
  // Extension Point Registration
  registerExtension(point: string, extension: any): void;
  unregisterExtension(point: string, id: string): void;
  
  // Extension Usage
  getExtensions(point: string): any[];
  invokeExtensions(point: string, ...args: any[]): Promise<any[]>;
}

// Plugin Permissions Interface
export interface PluginPermissions {
  has(permission: string): boolean;
  request(permission: string): Promise<boolean>;
  revoke(permission: string): void;
  list(): string[];
}

// Plugin Sandbox Context
export interface PluginSandboxContext {
  readonly isRestricted: boolean;
  readonly allowedAPIs: string[];
  readonly resourceLimits: {
    memory: number;
    cpu: number;
    storage: number;
    networkAccess: boolean;
  };
}

// Events
export interface PluginEvent {
  type: string;
  pluginId: string;
  timestamp: Date;
  data?: any;
}

export interface DataChangeEvent {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  oldData?: any;
}

// Error Types
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

export class PluginSecurityError extends PluginError {
  constructor(message: string, pluginId?: string, cause?: Error) {
    super(message, 'SECURITY_ERROR', pluginId, cause);
    this.name = 'PluginSecurityError';
  }
}

export class PluginLoadError extends PluginError {
  constructor(message: string, pluginId?: string, cause?: Error) {
    super(message, 'LOAD_ERROR', pluginId, cause);
    this.name = 'PluginLoadError';
  }
}

// Plugin Development SDK Types
export interface PluginSDK {
  createPlugin(manifest: PluginManifest): PluginBuilder;
  defineHooks(hooks: PluginHooks): void;
  defineExtensions(extensions: Record<string, any>): void;
  createTestEnvironment(): PluginTestEnvironment;
}

export interface PluginBuilder {
  withHooks(hooks: PluginHooks): PluginBuilder;
  withExtensions(extensions: Record<string, any>): PluginBuilder;
  withConfig(config: Record<string, any>): PluginBuilder;
  build(): Plugin;
}

export interface Plugin {
  readonly id: string;
  readonly manifest: PluginManifest;
  readonly hooks: PluginHooks;
  readonly extensions: Record<string, any>;
  
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  destroy(): Promise<void>;
}

export interface PluginTestEnvironment {
  loadPlugin(plugin: Plugin): Promise<void>;
  createMockContext(): PluginContext;
  simulateEvent(event: PluginEvent): Promise<void>;
  getPluginState(): PluginInstance;
}

// Re-export all types
export * from './index';