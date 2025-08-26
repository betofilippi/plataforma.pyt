/**
 * Module Manifest Contract
 * 
 * Defines the standard structure for module metadata and configuration.
 * All modules MUST provide a valid manifest that conforms to this contract.
 */

export interface ModuleManifest {
  /** Unique module identifier (kebab-case, e.g., 'user-management') */
  readonly id: string;
  
  /** Human-readable module name */
  readonly name: string;
  
  /** Semantic version following semver specification */
  readonly version: string;
  
  /** Brief description of module functionality */
  readonly description: string;
  
  /** Module category for organization and discovery */
  readonly category: ModuleCategory;
  
  /** Module type determines integration patterns */
  readonly type: ModuleType;
  
  /** Author information */
  readonly author: ModuleAuthor;
  
  /** Licensing information */
  readonly license: string;
  
  /** Homepage or documentation URL */
  readonly homepage?: string;
  
  /** Source repository information */
  readonly repository?: ModuleRepository;
  
  /** Keywords for search and discovery */
  readonly keywords: readonly string[];
  
  /** Module entry points and exports */
  readonly entryPoints: ModuleEntryPoints;
  
  /** Module dependencies */
  readonly dependencies: ModuleDependencies;
  
  /** Runtime requirements */
  readonly requirements: ModuleRequirements;
  
  /** Permission specifications */
  readonly permissions: ModulePermissionSpec;
  
  /** Configuration schema */
  readonly configSchema?: ModuleConfigSchema;
  
  /** UI integration specifications */
  readonly ui?: ModuleUISpec;
  
  /** API specifications */
  readonly api?: ModuleAPISpec;
  
  /** Lifecycle hooks configuration */
  readonly lifecycle?: ModuleLifecycleConfig;
  
  /** Module metadata */
  readonly metadata: ModuleMetadata;
}

export enum ModuleCategory {
  BUSINESS = 'business',
  SYSTEM = 'system',
  AI = 'ai',
  COMMUNICATION = 'communication',
  STORAGE = 'storage',
  SECURITY = 'security',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  UTILITY = 'utility',
  CUSTOM = 'custom'
}

export enum ModuleType {
  /** Full-featured business module with UI */
  BUSINESS_MODULE = 'business-module',
  
  /** System-level module */
  SYSTEM_MODULE = 'system-module',
  
  /** Pluggable extension */
  PLUGIN = 'plugin',
  
  /** UI component library */
  UI_LIBRARY = 'ui-library',
  
  /** Service provider (no UI) */
  SERVICE = 'service',
  
  /** Data provider */
  DATA_PROVIDER = 'data-provider',
  
  /** Middleware */
  MIDDLEWARE = 'middleware'
}

export interface ModuleAuthor {
  readonly name: string;
  readonly email?: string;
  readonly url?: string;
  readonly organization?: string;
}

export interface ModuleRepository {
  readonly type: 'git' | 'svn' | 'mercurial';
  readonly url: string;
  readonly directory?: string;
}

export interface ModuleEntryPoints {
  /** Main entry point for the module */
  readonly main: string;
  
  /** TypeScript type definitions */
  readonly types?: string;
  
  /** Browser-specific entry point */
  readonly browser?: string;
  
  /** Node.js-specific entry point */
  readonly node?: string;
  
  /** React component entry point */
  readonly react?: string;
  
  /** Server-side entry point */
  readonly server?: string;
  
  /** Additional named exports */
  readonly exports?: Record<string, string>;
}

export interface ModuleDependencies {
  /** Required platform core version */
  readonly platform: string;
  
  /** Required peer modules */
  readonly peers: readonly ModulePeerDependency[];
  
  /** Optional peer modules */
  readonly optionalPeers: readonly ModulePeerDependency[];
  
  /** External npm dependencies */
  readonly external: readonly ModuleExternalDependency[];
}

export interface ModulePeerDependency {
  readonly moduleId: string;
  readonly versionRange: string;
  readonly optional?: boolean;
}

export interface ModuleExternalDependency {
  readonly name: string;
  readonly versionRange: string;
  readonly dev?: boolean;
}

export interface ModuleRequirements {
  /** Minimum Node.js version */
  readonly node?: string;
  
  /** Required browser features */
  readonly browser?: ModuleBrowserRequirements;
  
  /** Memory requirements in MB */
  readonly memory?: number;
  
  /** Storage requirements in MB */
  readonly storage?: number;
  
  /** Network access requirements */
  readonly network?: ModuleNetworkRequirements;
  
  /** Database requirements */
  readonly database?: ModuleDatabaseRequirements;
}

export interface ModuleBrowserRequirements {
  readonly features: readonly string[];
  readonly minimumVersions?: Record<string, string>;
}

export interface ModuleNetworkRequirements {
  readonly required: boolean;
  readonly domains?: readonly string[];
  readonly protocols?: readonly ('http' | 'https' | 'ws' | 'wss')[];
}

export interface ModuleDatabaseRequirements {
  readonly required: boolean;
  readonly schemas?: readonly string[];
  readonly tables?: readonly ModuleTableRequirement[];
  readonly functions?: readonly string[];
}

export interface ModuleTableRequirement {
  readonly name: string;
  readonly schema?: string;
  readonly permissions: readonly ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
}

export interface ModulePermissionSpec {
  /** Required system permissions */
  readonly system: readonly SystemPermission[];
  
  /** Required resource permissions */
  readonly resources: readonly ResourcePermission[];
  
  /** API access permissions */
  readonly api: readonly APIPermission[];
  
  /** UI integration permissions */
  readonly ui: readonly UIPermission[];
}

export enum SystemPermission {
  FILE_SYSTEM_READ = 'filesystem:read',
  FILE_SYSTEM_WRITE = 'filesystem:write',
  NETWORK_ACCESS = 'network:access',
  DATABASE_READ = 'database:read',
  DATABASE_WRITE = 'database:write',
  SYSTEM_CONFIG = 'system:config',
  USER_DATA = 'user:data',
  NOTIFICATIONS = 'notifications:send',
  BACKGROUND_TASKS = 'tasks:background'
}

export interface ResourcePermission {
  readonly resource: string;
  readonly actions: readonly string[];
  readonly scope?: 'global' | 'module' | 'user';
}

export interface APIPermission {
  readonly endpoint: string;
  readonly methods: readonly ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
  readonly rateLimit?: number;
}

export interface UIPermission {
  readonly area: 'desktop' | 'taskbar' | 'sidebar' | 'modal' | 'fullscreen';
  readonly priority?: number;
}

export interface ModuleConfigSchema {
  readonly type: 'object';
  readonly properties: Record<string, JSONSchema>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export interface JSONSchema {
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  readonly description?: string;
  readonly default?: any;
  readonly enum?: readonly any[];
  readonly properties?: Record<string, JSONSchema>;
  readonly items?: JSONSchema;
  readonly required?: readonly string[];
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: string;
}

export interface ModuleUISpec {
  /** Window configuration */
  readonly windows: readonly ModuleWindowSpec[];
  
  /** Sidebar integrations */
  readonly sidebars?: readonly ModuleSidebarSpec[];
  
  /** Taskbar integrations */
  readonly taskbar?: ModuleTaskbarSpec;
  
  /** Context menu integrations */
  readonly contextMenus?: readonly ModuleContextMenuSpec[];
  
  /** Theme support */
  readonly themes?: ModuleThemeSpec;
}

export interface ModuleWindowSpec {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly defaultSize: { width: number; height: number };
  readonly minSize?: { width: number; height: number };
  readonly maxSize?: { width: number; height: number };
  readonly resizable?: boolean;
  readonly modal?: boolean;
  readonly singleton?: boolean;
}

export interface ModuleSidebarSpec {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly position: 'left' | 'right';
  readonly width?: number;
  readonly collapsible?: boolean;
}

export interface ModuleTaskbarSpec {
  readonly icon: string;
  readonly tooltip: string;
  readonly priority?: number;
  readonly showBadge?: boolean;
}

export interface ModuleContextMenuSpec {
  readonly id: string;
  readonly label: string;
  readonly context: 'file' | 'folder' | 'text' | 'global';
  readonly action: string;
  readonly icon?: string;
  readonly shortcut?: string;
}

export interface ModuleThemeSpec {
  readonly supports: readonly ('light' | 'dark' | 'auto')[];
  readonly customThemes?: readonly string[];
}

export interface ModuleAPISpec {
  /** REST API endpoints */
  readonly rest?: readonly ModuleRESTEndpoint[];
  
  /** GraphQL schema */
  readonly graphql?: ModuleGraphQLSpec;
  
  /** Event subscriptions */
  readonly events?: readonly ModuleEventSpec[];
  
  /** RPC methods */
  readonly rpc?: readonly ModuleRPCSpec[];
}

export interface ModuleRESTEndpoint {
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly description: string;
  readonly parameters?: readonly ModuleAPIParameter[];
  readonly responses: Record<string, ModuleAPIResponse>;
  readonly authentication?: boolean;
  readonly rateLimit?: number;
}

export interface ModuleAPIParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly required: boolean;
  readonly description: string;
  readonly schema?: JSONSchema;
}

export interface ModuleAPIResponse {
  readonly description: string;
  readonly schema: JSONSchema;
}

export interface ModuleGraphQLSpec {
  readonly schema: string;
  readonly resolvers?: string[];
}

export interface ModuleEventSpec {
  readonly name: string;
  readonly description: string;
  readonly schema: JSONSchema;
}

export interface ModuleRPCSpec {
  readonly name: string;
  readonly description: string;
  readonly parameters: JSONSchema;
  readonly returns: JSONSchema;
}

export interface ModuleLifecycleConfig {
  /** Hooks to execute during module lifecycle */
  readonly hooks: ModuleLifecycleHooks;
  
  /** Startup dependencies */
  readonly dependencies: readonly string[];
  
  /** Graceful shutdown timeout */
  readonly shutdownTimeout?: number;
  
  /** Health check configuration */
  readonly healthCheck?: ModuleHealthCheckConfig;
}

export interface ModuleLifecycleHooks {
  readonly beforeLoad?: string;
  readonly afterLoad?: string;
  readonly beforeStart?: string;
  readonly afterStart?: string;
  readonly beforeStop?: string;
  readonly afterStop?: string;
  readonly beforeUnload?: string;
  readonly afterUnload?: string;
}

export interface ModuleHealthCheckConfig {
  readonly enabled: boolean;
  readonly interval?: number;
  readonly timeout?: number;
  readonly endpoint?: string;
}

export interface ModuleMetadata {
  /** Creation timestamp */
  readonly createdAt: string;
  
  /** Last modified timestamp */
  readonly modifiedAt: string;
  
  /** Build information */
  readonly build?: ModuleBuildInfo;
  
  /** Certification status */
  readonly certification?: ModuleCertification;
  
  /** Usage analytics opt-in */
  readonly analytics?: boolean;
  
  /** Telemetry configuration */
  readonly telemetry?: ModuleTelemetryConfig;
  
  /** Documentation links */
  readonly documentation?: ModuleDocumentation;
}

export interface ModuleBuildInfo {
  readonly hash: string;
  readonly timestamp: string;
  readonly platform: string;
  readonly node: string;
  readonly environment: string;
}

export interface ModuleCertification {
  readonly level: 'community' | 'verified' | 'official';
  readonly certifiedAt?: string;
  readonly certifiedBy?: string;
  readonly signature?: string;
}

export interface ModuleTelemetryConfig {
  readonly enabled: boolean;
  readonly endpoint?: string;
  readonly events?: readonly string[];
}

export interface ModuleDocumentation {
  readonly readme?: string;
  readonly api?: string;
  readonly examples?: string;
  readonly changelog?: string;
  readonly migration?: string;
}

/**
 * Type guard to check if an object is a valid ModuleManifest
 */
export function isModuleManifest(obj: any): obj is ModuleManifest {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.description === 'string' &&
    Object.values(ModuleCategory).includes(obj.category) &&
    Object.values(ModuleType).includes(obj.type) &&
    typeof obj.author === 'object' &&
    typeof obj.license === 'string' &&
    Array.isArray(obj.keywords) &&
    typeof obj.entryPoints === 'object' &&
    typeof obj.dependencies === 'object' &&
    typeof obj.requirements === 'object' &&
    typeof obj.permissions === 'object' &&
    typeof obj.metadata === 'object'
  );
}

/**
 * Creates a minimal valid module manifest with defaults
 */
export function createModuleManifest(
  partial: Partial<ModuleManifest> & Pick<ModuleManifest, 'id' | 'name' | 'version' | 'description' | 'category' | 'type' | 'author'>
): ModuleManifest {
  const now = new Date().toISOString();
  
  return {
    ...partial,
    license: partial.license ?? 'MIT',
    keywords: partial.keywords ?? [],
    entryPoints: {
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      ...partial.entryPoints
    },
    dependencies: {
      platform: '^1.0.0',
      peers: [],
      optionalPeers: [],
      external: [],
      ...partial.dependencies
    },
    requirements: {
      ...partial.requirements
    },
    permissions: {
      system: [],
      resources: [],
      api: [],
      ui: [],
      ...partial.permissions
    },
    metadata: {
      createdAt: now,
      modifiedAt: now,
      ...partial.metadata
    }
  };
}