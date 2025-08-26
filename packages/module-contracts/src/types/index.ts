/**
 * Module Types Package
 * 
 * Specialized type definitions for different categories of modules
 * in the plataforma.app ecosystem.
 */

// Module type exports
export * from './BusinessModule';
export * from './SystemModule';
export * from './PluginModule';
export * from './UIModule';

// Key type re-exports - types are available from individual module exports

export type {
  SystemModule,
  SystemModuleManifest,
  SystemModuleConfig,
  SystemModuleContext,
  SystemService,
  SystemResource,
  SystemEvent,
  SystemOperation,
  SystemDiagnostics,
  SystemPerformanceMetrics,
  SystemRequirementValidation,
  SystemBackupResult,
  SystemRestoreResult
} from './SystemModule';

export type {
  PluginModule,
  PluginModuleManifest,
  PluginModuleConfig,
  PluginModuleContext,
  PluginHost,
  PluginCapability,
  PluginHook,
  PluginExtension,
  PluginAction,
  PluginEvent,
  PluginRegistrationResult,
  PluginActionResult,
  PluginEventResult
} from './PluginModule';

export type {
  UIModule,
  UIModuleManifest,
  UIModuleConfig,
  UIModuleContext,
  UIComponent,
  UITheme,
  UILayout,
  UIEvent,
  UIRenderResult,
  UIComponentRenderSpec,
  UIThemeResult,
  UIAccessibilityInfo
} from './UIModule';

// Type guards and utilities
export { BusinessDomain, BusinessCapability } from './BusinessModule';
export { SystemFunction, SystemCapability } from './SystemModule';
export { PluginType, PluginCapabilityType } from './PluginModule';
export { UIModuleType, UIComponentCategory } from './UIModule';

/**
 * Module type discriminator union
 */
export type AnyModule = 
  | BusinessModule 
  | SystemModule 
  | PluginModule 
  | UIModule;

export type AnyModuleManifest = 
  | BusinessModuleManifest 
  | SystemModuleManifest 
  | PluginModuleManifest 
  | UIModuleManifest;

export type AnyModuleConfig = 
  | BusinessModuleConfig 
  | SystemModuleConfig 
  | PluginModuleConfig 
  | UIModuleConfig;

export type AnyModuleContext = 
  | BusinessModuleContext 
  | SystemModuleContext 
  | PluginModuleContext 
  | UIModuleContext;

/**
 * Type utility for module type checking
 */
export function isBusinessModule(module: AnyModule): module is BusinessModule {
  return module.manifest.category === 'business';
}

export function isSystemModule(module: AnyModule): module is SystemModule {
  return module.manifest.category === 'system';
}

export function isPluginModule(module: AnyModule): module is PluginModule {
  return module.manifest.type === 'plugin';
}

export function isUIModule(module: AnyModule): module is UIModule {
  return module.manifest.type === 'ui-library';
}

/**
 * Module factory utilities
 */
export interface ModuleFactory<T extends AnyModule> {
  create(manifest: T['manifest'], config?: Partial<T['config']>): Promise<T>;
  validate(manifest: T['manifest']): Promise<boolean>;
  getDefaults(): Partial<T['config']>;
}

export interface BusinessModuleFactory extends ModuleFactory<BusinessModule> {
  createFromDomain(domain: BusinessDomain, options?: BusinessModuleFactoryOptions): Promise<BusinessModule>;
}

export interface BusinessModuleFactoryOptions {
  readonly capabilities?: readonly string[];
  readonly dataModels?: readonly string[];
  readonly integrations?: readonly string[];
}

export interface SystemModuleFactory extends ModuleFactory<SystemModule> {
  createFromFunction(fn: SystemFunction, options?: SystemModuleFactoryOptions): Promise<SystemModule>;
}

export interface SystemModuleFactoryOptions {
  readonly capabilities?: readonly string[];
  readonly resources?: readonly string[];
  readonly security?: readonly string[];
}

export interface PluginModuleFactory extends ModuleFactory<PluginModule> {
  createFromType(type: PluginType, options?: PluginModuleFactoryOptions): Promise<PluginModule>;
}

export interface PluginModuleFactoryOptions {
  readonly capabilities?: readonly string[];
  readonly hooks?: readonly string[];
  readonly extensions?: readonly string[];
}

export interface UIModuleFactory extends ModuleFactory<UIModule> {
  createFromType(type: UIModuleType, options?: UIModuleFactoryOptions): Promise<UIModule>;
}

export interface UIModuleFactoryOptions {
  readonly components?: readonly string[];
  readonly themes?: readonly string[];
  readonly layouts?: readonly string[];
}

/**
 * Module registry type definitions
 */
export interface TypedModuleRegistry {
  /** Register a business module */
  registerBusiness(module: BusinessModule): Promise<void>;
  
  /** Register a system module */
  registerSystem(module: SystemModule): Promise<void>;
  
  /** Register a plugin module */
  registerPlugin(module: PluginModule): Promise<void>;
  
  /** Register a UI module */
  registerUI(module: UIModule): Promise<void>;
  
  /** Get all business modules */
  getBusinessModules(): Promise<readonly BusinessModule[]>;
  
  /** Get all system modules */
  getSystemModules(): Promise<readonly SystemModule[]>;
  
  /** Get all plugin modules */
  getPluginModules(): Promise<readonly PluginModule[]>;
  
  /** Get all UI modules */
  getUIModules(): Promise<readonly UIModule[]>;
  
  /** Find modules by type */
  findModulesByType<T extends AnyModule>(
    type: T['manifest']['type'] | T['manifest']['category']
  ): Promise<readonly T[]>;
}

/**
 * Cross-module interaction types
 */
export interface ModuleInteraction {
  readonly from: string;
  readonly to: string;
  readonly type: ModuleInteractionType;
  readonly data?: any;
  readonly timestamp: string;
}

export enum ModuleInteractionType {
  DATA_REQUEST = 'data-request',
  DATA_RESPONSE = 'data-response',
  EVENT_EMIT = 'event-emit',
  EVENT_HANDLE = 'event-handle',
  SERVICE_CALL = 'service-call',
  SERVICE_RESPONSE = 'service-response',
  UI_RENDER = 'ui-render',
  UI_INTERACT = 'ui-interact',
  PLUGIN_ACTIVATE = 'plugin-activate',
  PLUGIN_EXECUTE = 'plugin-execute'
}

export interface ModuleInteractionTracker {
  track(interaction: ModuleInteraction): void;
  getInteractions(moduleId: string): Promise<readonly ModuleInteraction[]>;
  getInteractionHistory(): Promise<readonly ModuleInteraction[]>;
  analyzeInteractionPatterns(): Promise<ModuleInteractionAnalysis>;
}

export interface ModuleInteractionAnalysis {
  readonly totalInteractions: number;
  readonly moduleStats: Record<string, ModuleInteractionStats>;
  readonly mostActiveModules: readonly string[];
  readonly interactionTypes: Record<ModuleInteractionType, number>;
  readonly trends: readonly ModuleInteractionTrend[];
}

export interface ModuleInteractionStats {
  readonly moduleId: string;
  readonly sent: number;
  readonly received: number;
  readonly errors: number;
  readonly averageResponseTime: number;
}

export interface ModuleInteractionTrend {
  readonly period: string;
  readonly interactions: number;
  readonly change: number;
  readonly direction: 'up' | 'down' | 'stable';
}

/**
 * Module composition utilities
 */
export interface ModuleComposition {
  readonly modules: readonly AnyModule[];
  readonly dependencies: readonly ModuleDependencyRelation[];
  readonly interactions: readonly ModuleInteractionSpec[];
}

export interface ModuleDependencyRelation {
  readonly from: string;
  readonly to: string;
  readonly type: 'required' | 'optional' | 'suggested';
  readonly version: string;
}

export interface ModuleInteractionSpec {
  readonly from: string;
  readonly to: string;
  readonly interface: string;
  readonly protocol: string;
}

export interface ModuleCompositionBuilder {
  addModule(module: AnyModule): ModuleCompositionBuilder;
  addDependency(from: string, to: string, type: 'required' | 'optional' | 'suggested'): ModuleCompositionBuilder;
  addInteraction(from: string, to: string, interface: string): ModuleCompositionBuilder;
  validate(): Promise<ModuleCompositionValidation>;
  build(): Promise<ModuleComposition>;
}

export interface ModuleCompositionValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
}

// Export type metadata
export const MODULE_TYPES_VERSION = '1.0.0';
export const MODULE_TYPES_METADATA = {
  version: MODULE_TYPES_VERSION,
  types: ['business', 'system', 'plugin', 'ui'] as const,
  lastUpdated: '2025-08-26',
  description: 'Specialized type definitions for plataforma.app modules'
} as const;