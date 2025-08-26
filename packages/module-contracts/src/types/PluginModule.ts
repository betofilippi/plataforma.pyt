/**
 * Plugin Module Type Contract
 * 
 * Defines the specific interface for plugin modules that extend
 * platform functionality through pluggable extensions.
 */

import { Module, ModuleContext, ModuleConfig } from '../contracts/ModuleAPI';
import { ModuleManifest, ModuleType } from '../contracts/ModuleManifest';

/**
 * Plugin module interface extending the base module
 */
export interface PluginModule extends Module {
  /** Plugin module specific manifest */
  readonly manifest: PluginModuleManifest;
  
  /** Plugin module configuration */
  readonly config: PluginModuleConfig;
  
  /** Plugin context */
  readonly pluginContext: PluginModuleContext;
  
  /** Get plugin capabilities */
  getPluginCapabilities(): Promise<readonly PluginCapability[]>;
  
  /** Get plugin hooks */
  getPluginHooks(): Promise<readonly PluginHook[]>;
  
  /** Get plugin extensions */
  getPluginExtensions(): Promise<readonly PluginExtension[]>;
  
  /** Register plugin with host */
  register(host: PluginHost): Promise<PluginRegistrationResult>;
  
  /** Unregister plugin from host */
  unregister(host: PluginHost): Promise<void>;
  
  /** Execute plugin action */
  executeAction(action: PluginAction): Promise<PluginActionResult>;
  
  /** Handle plugin event */
  handlePluginEvent(event: PluginEvent): Promise<PluginEventResult>;
  
  /** Get plugin settings schema */
  getSettingsSchema(): Promise<PluginSettingsSchema>;
  
  /** Validate plugin settings */
  validateSettings(settings: any): Promise<PluginSettingsValidation>;
  
  /** Get plugin metadata */
  getPluginMetadata(): Promise<PluginMetadata>;
}

/**
 * Plugin module manifest extension
 */
export interface PluginModuleManifest extends ModuleManifest {
  /** Must be plugin type */
  readonly type: ModuleType.PLUGIN;
  
  /** Plugin type */
  readonly pluginType: PluginType;
  
  /** Plugin capabilities */
  readonly capabilities: readonly PluginCapabilitySpec[];
  
  /** Plugin hooks */
  readonly hooks: readonly PluginHookSpec[];
  
  /** Plugin extensions */
  readonly extensions: readonly PluginExtensionSpec[];
  
  /** Plugin compatibility */
  readonly compatibility: PluginCompatibility;
  
  /** Plugin assets */
  readonly assets: PluginAssets;
  
  /** Plugin activation */
  readonly activation: PluginActivation;
}

/**
 * Plugin types
 */
export enum PluginType {
  // UI Extensions
  UI_COMPONENT = 'ui-component',
  UI_THEME = 'ui-theme',
  UI_WIDGET = 'ui-widget',
  UI_TOOLBAR = 'ui-toolbar',
  UI_PANEL = 'ui-panel',
  UI_DIALOG = 'ui-dialog',
  
  // Functional Extensions
  FEATURE_EXTENSION = 'feature-extension',
  WORKFLOW_EXTENSION = 'workflow-extension',
  INTEGRATION_EXTENSION = 'integration-extension',
  DATA_PROVIDER = 'data-provider',
  SERVICE_PROVIDER = 'service-provider',
  
  // System Extensions
  MIDDLEWARE = 'middleware',
  INTERCEPTOR = 'interceptor',
  FILTER = 'filter',
  VALIDATOR = 'validator',
  TRANSFORMER = 'transformer',
  
  // Developer Tools
  DEBUG_TOOL = 'debug-tool',
  TESTING_TOOL = 'testing-tool',
  BUILD_TOOL = 'build-tool',
  LINTER = 'linter',
  
  // Content Extensions
  CONTENT_TYPE = 'content-type',
  CONTENT_RENDERER = 'content-renderer',
  CONTENT_EDITOR = 'content-editor',
  
  // Custom
  CUSTOM = 'custom'
}

/**
 * Plugin capability specification
 */
export interface PluginCapabilitySpec {
  /** Capability identifier */
  readonly id: string;
  
  /** Capability name */
  readonly name: string;
  
  /** Capability description */
  readonly description: string;
  
  /** Capability type */
  readonly type: PluginCapabilityType;
  
  /** Capability interface */
  readonly interface: PluginCapabilityInterface;
  
  /** Capability dependencies */
  readonly dependencies?: readonly string[];
  
  /** Capability configuration */
  readonly config?: PluginCapabilityConfig;
}

export enum PluginCapabilityType {
  // UI Capabilities
  RENDER = 'render',
  INTERACT = 'interact',
  STYLE = 'style',
  ANIMATE = 'animate',
  
  // Data Capabilities
  READ = 'read',
  WRITE = 'write',
  TRANSFORM = 'transform',
  VALIDATE = 'validate',
  
  // System Capabilities
  EXECUTE = 'execute',
  MONITOR = 'monitor',
  CONFIGURE = 'configure',
  AUTHENTICATE = 'authenticate',
  
  // Communication Capabilities
  EVENT = 'event',
  MESSAGE = 'message',
  REQUEST = 'request',
  STREAM = 'stream',
  
  // Custom
  CUSTOM = 'custom'
}

export interface PluginCapabilityInterface {
  readonly methods: readonly PluginMethod[];
  readonly events: readonly PluginEventSpec[];
  readonly properties: readonly PluginProperty[];
}

export interface PluginMethod {
  readonly name: string;
  readonly description: string;
  readonly parameters: readonly PluginParameter[];
  readonly returnType: string;
  readonly async: boolean;
}

export interface PluginParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description?: string;
  readonly defaultValue?: any;
}

export interface PluginEventSpec {
  readonly name: string;
  readonly description: string;
  readonly data: PluginEventDataSpec;
}

export interface PluginEventDataSpec {
  readonly type: string;
  readonly properties: Record<string, PluginPropertySpec>;
}

export interface PluginPropertySpec {
  readonly type: string;
  readonly required: boolean;
  readonly description?: string;
}

export interface PluginProperty {
  readonly name: string;
  readonly type: string;
  readonly readonly: boolean;
  readonly description?: string;
}

export interface PluginCapabilityConfig {
  readonly settings: Record<string, any>;
  readonly validation: PluginValidationRules;
  readonly security: PluginSecurityConfig;
}

export interface PluginValidationRules {
  readonly required: readonly string[];
  readonly types: Record<string, string>;
  readonly constraints: Record<string, PluginConstraint>;
}

export interface PluginConstraint {
  readonly type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  readonly value: any;
  readonly message?: string;
}

export interface PluginSecurityConfig {
  readonly sandbox: boolean;
  readonly permissions: readonly string[];
  readonly restrictions: readonly string[];
}

/**
 * Plugin hook specification
 */
export interface PluginHookSpec {
  /** Hook identifier */
  readonly id: string;
  
  /** Hook name */
  readonly name: string;
  
  /** Hook type */
  readonly type: PluginHookType;
  
  /** Hook point */
  readonly point: string;
  
  /** Hook priority */
  readonly priority: number;
  
  /** Hook condition */
  readonly condition?: PluginHookCondition;
  
  /** Hook handler */
  readonly handler: string;
}

export enum PluginHookType {
  // Lifecycle hooks
  BEFORE_INIT = 'before-init',
  AFTER_INIT = 'after-init',
  BEFORE_START = 'before-start',
  AFTER_START = 'after-start',
  BEFORE_STOP = 'before-stop',
  AFTER_STOP = 'after-stop',
  
  // Event hooks
  BEFORE_EVENT = 'before-event',
  AFTER_EVENT = 'after-event',
  ON_ERROR = 'on-error',
  
  // Data hooks
  BEFORE_READ = 'before-read',
  AFTER_READ = 'after-read',
  BEFORE_WRITE = 'before-write',
  AFTER_WRITE = 'after-write',
  
  // UI hooks
  BEFORE_RENDER = 'before-render',
  AFTER_RENDER = 'after-render',
  ON_INTERACT = 'on-interact',
  
  // Custom
  CUSTOM = 'custom'
}

export interface PluginHookCondition {
  readonly type: 'always' | 'never' | 'when' | 'unless' | 'custom';
  readonly expression?: string;
  readonly parameters?: Record<string, any>;
}

/**
 * Plugin extension specification
 */
export interface PluginExtensionSpec {
  /** Extension identifier */
  readonly id: string;
  
  /** Extension name */
  readonly name: string;
  
  /** Extension type */
  readonly type: PluginExtensionType;
  
  /** Extension point */
  readonly point: string;
  
  /** Extension contribution */
  readonly contribution: PluginContribution;
  
  /** Extension configuration */
  readonly config?: PluginExtensionConfig;
}

export enum PluginExtensionType {
  // UI Extensions
  MENU_ITEM = 'menu-item',
  TOOLBAR_BUTTON = 'toolbar-button',
  SIDEBAR_PANEL = 'sidebar-panel',
  CONTEXT_MENU = 'context-menu',
  DIALOG = 'dialog',
  WIDGET = 'widget',
  
  // Command Extensions
  COMMAND = 'command',
  SHORTCUT = 'shortcut',
  
  // Content Extensions
  CONTENT_TYPE = 'content-type',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  
  // Service Extensions
  SERVICE = 'service',
  PROVIDER = 'provider',
  HANDLER = 'handler',
  
  // Custom
  CUSTOM = 'custom'
}

export interface PluginContribution {
  readonly component?: string;
  readonly service?: string;
  readonly data?: any;
  readonly config?: Record<string, any>;
}

export interface PluginExtensionConfig {
  readonly visibility: PluginVisibilityConfig;
  readonly behavior: PluginBehaviorConfig;
  readonly styling: PluginStylingConfig;
}

export interface PluginVisibilityConfig {
  readonly when: string;
  readonly unless?: string;
  readonly contexts: readonly string[];
}

export interface PluginBehaviorConfig {
  readonly lazy: boolean;
  readonly singleton: boolean;
  readonly disposable: boolean;
}

export interface PluginStylingConfig {
  readonly theme: string;
  readonly classes: readonly string[];
  readonly styles: Record<string, string>;
}

/**
 * Plugin compatibility
 */
export interface PluginCompatibility {
  /** Platform compatibility */
  readonly platform: PlatformCompatibility;
  
  /** Host compatibility */
  readonly host: HostCompatibility;
  
  /** Plugin compatibility */
  readonly plugins: PluginPluginCompatibility;
  
  /** API compatibility */
  readonly api: APICompatibility;
}

export interface PlatformCompatibility {
  readonly versions: readonly string[];
  readonly features: readonly string[];
  readonly capabilities: readonly string[];
}

export interface HostCompatibility {
  readonly modules: readonly HostModuleCompatibility[];
  readonly extensions: readonly string[];
}

export interface HostModuleCompatibility {
  readonly moduleId: string;
  readonly versionRange: string;
  readonly required: boolean;
}

export interface PluginPluginCompatibility {
  readonly conflicts: readonly string[];
  readonly dependencies: readonly string[];
  readonly suggestions: readonly string[];
}

export interface APICompatibility {
  readonly versions: readonly string[];
  readonly deprecated: readonly string[];
  readonly breaking: readonly string[];
}

/**
 * Plugin assets
 */
export interface PluginAssets {
  /** Plugin icons */
  readonly icons: PluginIconAssets;
  
  /** Plugin images */
  readonly images: readonly PluginImageAsset[];
  
  /** Plugin styles */
  readonly styles: readonly PluginStyleAsset[];
  
  /** Plugin scripts */
  readonly scripts: readonly PluginScriptAsset[];
  
  /** Plugin templates */
  readonly templates: readonly PluginTemplateAsset[];
  
  /** Plugin documentation */
  readonly documentation: readonly PluginDocumentationAsset[];
}

export interface PluginIconAssets {
  readonly small: string;
  readonly medium: string;
  readonly large: string;
  readonly vector?: string;
}

export interface PluginImageAsset {
  readonly name: string;
  readonly path: string;
  readonly type: string;
  readonly size: AssetSize;
  readonly usage: string;
}

export interface AssetSize {
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
}

export interface PluginStyleAsset {
  readonly name: string;
  readonly path: string;
  readonly theme?: string;
  readonly media?: string;
}

export interface PluginScriptAsset {
  readonly name: string;
  readonly path: string;
  readonly type: 'module' | 'script';
  readonly defer?: boolean;
  readonly async?: boolean;
}

export interface PluginTemplateAsset {
  readonly name: string;
  readonly path: string;
  readonly engine: string;
  readonly variables: readonly string[];
}

export interface PluginDocumentationAsset {
  readonly name: string;
  readonly path: string;
  readonly language: string;
  readonly format: 'markdown' | 'html' | 'pdf';
}

/**
 * Plugin activation
 */
export interface PluginActivation {
  /** Activation events */
  readonly events: readonly PluginActivationEvent[];
  
  /** Activation conditions */
  readonly conditions: readonly PluginActivationCondition[];
  
  /** Activation mode */
  readonly mode: PluginActivationMode;
  
  /** Activation timeout */
  readonly timeout?: number;
}

export interface PluginActivationEvent {
  readonly type: string;
  readonly condition?: string;
  readonly delay?: number;
}

export interface PluginActivationCondition {
  readonly type: 'context' | 'permission' | 'feature' | 'custom';
  readonly expression: string;
  readonly required: boolean;
}

export enum PluginActivationMode {
  EAGER = 'eager',
  LAZY = 'lazy',
  ON_DEMAND = 'on-demand',
  MANUAL = 'manual'
}

/**
 * Plugin module configuration
 */
export interface PluginModuleConfig extends ModuleConfig {
  /** Plugin configuration */
  readonly plugin: PluginConfiguration;
  
  /** Plugin settings */
  readonly settings: PluginSettingsConfig;
  
  /** Plugin security */
  readonly security: PluginSecurityConfiguration;
  
  /** Plugin performance */
  readonly performance: PluginPerformanceConfig;
}

export interface PluginConfiguration {
  readonly autoActivate: boolean;
  readonly lazyLoad: boolean;
  readonly sandbox: boolean;
  readonly timeout: number;
  readonly retries: number;
}

export interface PluginSettingsConfig {
  readonly userConfigurable: boolean;
  readonly adminConfigurable: boolean;
  readonly persistSettings: boolean;
  readonly validateSettings: boolean;
  readonly defaultSettings: Record<string, any>;
}

export interface PluginSecurityConfiguration {
  readonly sandboxed: boolean;
  readonly codeSignature: boolean;
  readonly permissions: PluginPermissionConfig;
  readonly isolation: PluginIsolationConfig;
}

export interface PluginPermissionConfig {
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly dangerous: readonly string[];
}

export interface PluginIsolationConfig {
  readonly level: 'none' | 'partial' | 'full';
  readonly resources: readonly string[];
  readonly communication: readonly string[];
}

export interface PluginPerformanceConfig {
  readonly maxMemory: number;
  readonly maxCpu: number;
  readonly maxExecutionTime: number;
  readonly monitoring: boolean;
}

/**
 * Plugin module context
 */
export interface PluginModuleContext extends ModuleContext {
  /** Plugin context data */
  readonly plugin: PluginContextData;
  
  /** Host context */
  readonly host: PluginHostContext;
  
  /** Sandbox context */
  readonly sandbox: PluginSandboxContext;
  
  /** Communication context */
  readonly communication: PluginCommunicationContext;
}

export interface PluginContextData {
  readonly type: PluginType;
  readonly capabilities: readonly string[];
  readonly settings: Record<string, any>;
  readonly state: PluginState;
  readonly metadata: PluginRuntimeMetadata;
}

export enum PluginState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  ACTIVATING = 'activating',
  ACTIVE = 'active',
  DEACTIVATING = 'deactivating',
  INACTIVE = 'inactive',
  ERROR = 'error',
  DISABLED = 'disabled'
}

export interface PluginRuntimeMetadata {
  readonly loadTime: string;
  readonly activationTime?: string;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

export interface PluginHostContext {
  readonly hostId: string;
  readonly hostVersion: string;
  readonly hostCapabilities: readonly string[];
  readonly hostApi: PluginHostAPI;
  readonly hostExtensionPoints: readonly ExtensionPoint[];
}

export interface ExtensionPoint {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly schema?: any;
}

export interface PluginSandboxContext {
  readonly enabled: boolean;
  readonly level: 'none' | 'partial' | 'full';
  readonly restrictions: readonly string[];
  readonly allowedApis: readonly string[];
  readonly resourceLimits: ResourceLimits;
}

export interface ResourceLimits {
  readonly memory: number;
  readonly cpu: number;
  readonly storage: number;
  readonly network: boolean;
  readonly fileSystem: readonly string[];
}

export interface PluginCommunicationContext {
  readonly channels: readonly CommunicationChannel[];
  readonly protocols: readonly string[];
  readonly security: CommunicationSecurity;
}

export interface CommunicationChannel {
  readonly id: string;
  readonly type: 'direct' | 'event' | 'message' | 'stream';
  readonly bidirectional: boolean;
  readonly encrypted: boolean;
}

export interface CommunicationSecurity {
  readonly encryption: boolean;
  readonly authentication: boolean;
  readonly authorization: boolean;
  readonly audit: boolean;
}

/**
 * Plugin interfaces
 */
export interface PluginHost {
  /** Host identifier */
  readonly id: string;
  
  /** Host name */
  readonly name: string;
  
  /** Host version */
  readonly version: string;
  
  /** Host API */
  readonly api: PluginHostAPI;
  
  /** Register plugin */
  registerPlugin(plugin: PluginModule): Promise<PluginRegistrationResult>;
  
  /** Unregister plugin */
  unregisterPlugin(pluginId: string): Promise<void>;
  
  /** Get registered plugins */
  getRegisteredPlugins(): Promise<readonly PluginInfo[]>;
  
  /** Get extension points */
  getExtensionPoints(): Promise<readonly ExtensionPoint[]>;
  
  /** Get plugin settings */
  getPluginSettings(pluginId: string): Promise<any>;
  
  /** Update plugin settings */
  updatePluginSettings(pluginId: string, settings: any): Promise<void>;
}

export interface PluginHostAPI {
  /** Core platform API */
  readonly platform: any; // PlatformAPI
  
  /** Host-specific API */
  readonly host: HostSpecificAPI;
  
  /** Extension API */
  readonly extensions: ExtensionAPI;
  
  /** Communication API */
  readonly communication: CommunicationAPI;
}

export interface HostSpecificAPI {
  readonly [key: string]: any;
}

export interface ExtensionAPI {
  /** Contribute to extension point */
  contribute(point: string, contribution: any): Promise<void>;
  
  /** Remove contribution */
  removeContribution(point: string, contributionId: string): Promise<void>;
  
  /** Get contributions */
  getContributions(point: string): Promise<readonly any[]>;
}

export interface CommunicationAPI {
  /** Send message */
  send(target: string, message: any): Promise<void>;
  
  /** Subscribe to messages */
  subscribe(callback: (message: any) => void): () => void;
  
  /** Request-response */
  request<T>(target: string, request: any): Promise<T>;
  
  /** Handle requests */
  handle<T>(handler: (request: any) => Promise<T>): () => void;
}

export interface PluginInfo {
  readonly plugin: PluginModule;
  readonly registration: PluginRegistration;
  readonly state: PluginState;
  readonly metrics: PluginMetrics;
}

export interface PluginRegistration {
  readonly timestamp: string;
  readonly host: string;
  readonly settings: any;
  readonly permissions: readonly string[];
  readonly status: RegistrationStatus;
}

export enum RegistrationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

export interface PluginMetrics {
  readonly activations: number;
  readonly executions: number;
  readonly errors: number;
  readonly averageExecutionTime: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
}

export interface PluginRegistrationResult {
  readonly success: boolean;
  readonly registrationId: string;
  readonly permissions: readonly string[];
  readonly warnings?: readonly string[];
  readonly error?: string;
}

/**
 * Plugin capabilities and hooks
 */
export interface PluginCapability {
  readonly spec: PluginCapabilitySpec;
  readonly implementation: PluginCapabilityImplementation;
  readonly state: CapabilityState;
}

export interface PluginCapabilityImplementation {
  readonly methods: Record<string, Function>;
  readonly events: Record<string, PluginEventHandler>;
  readonly properties: Record<string, any>;
}

export interface PluginEventHandler {
  readonly handler: Function;
  readonly options: EventHandlerOptions;
}

export interface EventHandlerOptions {
  readonly once: boolean;
  readonly passive: boolean;
  readonly capture: boolean;
}

export enum CapabilityState {
  AVAILABLE = 'available',
  ACTIVE = 'active',
  DISABLED = 'disabled',
  ERROR = 'error'
}

export interface PluginHook {
  readonly spec: PluginHookSpec;
  readonly implementation: PluginHookImplementation;
  readonly state: HookState;
}

export interface PluginHookImplementation {
  readonly handler: Function;
  readonly options: HookOptions;
}

export interface HookOptions {
  readonly async: boolean;
  readonly timeout: number;
  readonly priority: number;
}

export enum HookState {
  REGISTERED = 'registered',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

export interface PluginExtension {
  readonly spec: PluginExtensionSpec;
  readonly implementation: PluginExtensionImplementation;
  readonly state: ExtensionState;
}

export interface PluginExtensionImplementation {
  readonly component?: any;
  readonly service?: any;
  readonly data?: any;
}

export enum ExtensionState {
  CONTRIBUTED = 'contributed',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REMOVED = 'removed'
}

/**
 * Plugin actions and events
 */
export interface PluginAction {
  readonly id: string;
  readonly type: string;
  readonly target: string;
  readonly parameters: Record<string, any>;
  readonly context: PluginActionContext;
}

export interface PluginActionContext {
  readonly user?: string;
  readonly session?: string;
  readonly source: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, any>;
}

export interface PluginActionResult {
  readonly success: boolean;
  readonly result?: any;
  readonly error?: string;
  readonly warnings?: readonly string[];
}

export interface PluginEvent {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly target?: string;
  readonly data: any;
  readonly timestamp: string;
  readonly context: PluginEventContext;
}

export interface PluginEventContext {
  readonly pluginId?: string;
  readonly hostId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly metadata?: Record<string, any>;
}

export interface PluginEventResult {
  readonly handled: boolean;
  readonly result?: any;
  readonly error?: string;
  readonly preventDefault?: boolean;
  readonly stopPropagation?: boolean;
}

/**
 * Plugin settings and metadata
 */
export interface PluginSettingsSchema {
  readonly properties: Record<string, PluginSettingProperty>;
  readonly required: readonly string[];
  readonly groups: readonly PluginSettingGroup[];
  readonly validation: PluginSettingsValidationSchema;
}

export interface PluginSettingProperty {
  readonly type: string;
  readonly title: string;
  readonly description?: string;
  readonly default?: any;
  readonly enum?: readonly any[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: string;
  readonly secret?: boolean;
  readonly advanced?: boolean;
}

export interface PluginSettingGroup {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly properties: readonly string[];
  readonly collapsed?: boolean;
}

export interface PluginSettingsValidationSchema {
  readonly rules: readonly PluginSettingValidationRule[];
  readonly dependencies: Record<string, PluginSettingDependency>;
}

export interface PluginSettingValidationRule {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly params?: any[];
}

export interface PluginSettingDependency {
  readonly when: string;
  readonly then: PluginSettingConstraint;
  readonly otherwise?: PluginSettingConstraint;
}

export interface PluginSettingConstraint {
  readonly required?: readonly string[];
  readonly disabled?: readonly string[];
  readonly hidden?: readonly string[];
}

export interface PluginSettingsValidation {
  readonly valid: boolean;
  readonly errors: readonly PluginSettingError[];
  readonly warnings: readonly PluginSettingWarning[];
}

export interface PluginSettingError {
  readonly field: string;
  readonly message: string;
  readonly value: any;
}

export interface PluginSettingWarning {
  readonly field: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface PluginMetadata {
  readonly runtime: PluginRuntimeMetadata;
  readonly security: PluginSecurityMetadata;
  readonly performance: PluginPerformanceMetadata;
  readonly usage: PluginUsageMetadata;
}

export interface PluginSecurityMetadata {
  readonly signature: string;
  readonly permissions: readonly string[];
  readonly violations: readonly SecurityViolation[];
  readonly lastScan: string;
}

export interface SecurityViolation {
  readonly type: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly message: string;
  readonly timestamp: string;
}

export interface PluginPerformanceMetadata {
  readonly loadTime: number;
  readonly activationTime: number;
  readonly memoryUsage: MemoryUsage;
  readonly cpuUsage: CPUUsage;
  readonly networkUsage: NetworkUsage;
}

export interface MemoryUsage {
  readonly current: number;
  readonly peak: number;
  readonly average: number;
}

export interface CPUUsage {
  readonly current: number;
  readonly peak: number;
  readonly average: number;
}

export interface NetworkUsage {
  readonly requests: number;
  readonly bytesTransferred: number;
  readonly errors: number;
}

export interface PluginUsageMetadata {
  readonly activations: number;
  readonly invocations: number;
  readonly errors: number;
  readonly lastUsed: string;
  readonly mostUsedFeatures: readonly string[];
  readonly userRating?: number;
  readonly reviews?: number;
}