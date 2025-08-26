/**
 * Module Dependencies Contract
 * 
 * Defines dependency management, version resolution, and dependency injection
 * interfaces for the module system.
 */

/**
 * Module dependency specification
 */
export interface ModuleDependencySpec {
  /** Target module identifier */
  readonly moduleId: string;
  
  /** Version range requirement (semver) */
  readonly versionRange: string;
  
  /** Dependency type */
  readonly type: DependencyType;
  
  /** Whether dependency is optional */
  readonly optional: boolean;
  
  /** Loading order priority (higher numbers load first) */
  readonly priority?: number;
  
  /** Dependency conditions */
  readonly conditions?: readonly DependencyCondition[];
  
  /** Dependency constraints */
  readonly constraints?: readonly DependencyConstraint[];
  
  /** Injection specifications */
  readonly injection?: DependencyInjectionSpec;
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Dependency types
 */
export enum DependencyType {
  /** Required at runtime */
  REQUIRED = 'required',
  
  /** Optional peer dependency */
  PEER = 'peer',
  
  /** Development/build time only */
  DEV = 'dev',
  
  /** Plugin extension */
  PLUGIN = 'plugin',
  
  /** Service provider */
  SERVICE = 'service',
  
  /** Data provider */
  DATA = 'data',
  
  /** UI component library */
  UI = 'ui'
}

/**
 * Dependency condition
 */
export interface DependencyCondition {
  /** Condition type */
  readonly type: 'platform' | 'environment' | 'feature' | 'permission' | 'custom';
  
  /** Condition expression */
  readonly expression: string;
  
  /** Human-readable description */
  readonly description?: string;
}

/**
 * Dependency constraint
 */
export interface DependencyConstraint {
  /** Constraint type */
  readonly type: 'version' | 'platform' | 'environment' | 'capability' | 'resource' | 'security';
  
  /** Constraint specification */
  readonly spec: DependencyConstraintSpec;
  
  /** Error message if constraint is violated */
  readonly message?: string;
}

export interface DependencyConstraintSpec {
  /** Minimum version */
  readonly minVersion?: string;
  
  /** Maximum version */
  readonly maxVersion?: string;
  
  /** Excluded versions */
  readonly excludeVersions?: readonly string[];
  
  /** Required platforms */
  readonly platforms?: readonly string[];
  
  /** Required environment variables */
  readonly environment?: readonly string[];
  
  /** Required capabilities */
  readonly capabilities?: readonly string[];
  
  /** Resource requirements */
  readonly resources?: DependencyResourceRequirements;
  
  /** Security requirements */
  readonly security?: DependencySecurityRequirements;
}

export interface DependencyResourceRequirements {
  readonly minMemory?: number;
  readonly maxMemory?: number;
  readonly minCpu?: number;
  readonly minDisk?: number;
  readonly networkRequired?: boolean;
  readonly databaseRequired?: boolean;
}

export interface DependencySecurityRequirements {
  readonly minTrustLevel?: number;
  readonly requiredCertification?: 'community' | 'verified' | 'official';
  readonly allowedAuthors?: readonly string[];
  readonly prohibitedAuthors?: readonly string[];
  readonly securityScanRequired?: boolean;
}

/**
 * Dependency injection specification
 */
export interface DependencyInjectionSpec {
  /** How to inject the dependency */
  readonly method: InjectionMethod;
  
  /** Target for injection */
  readonly target?: string;
  
  /** Transformation to apply */
  readonly transform?: DependencyTransform;
  
  /** Whether to inject lazily */
  readonly lazy?: boolean;
  
  /** Injection options */
  readonly options?: Record<string, any>;
}

export enum InjectionMethod {
  /** Direct property injection */
  PROPERTY = 'property',
  
  /** Constructor injection */
  CONSTRUCTOR = 'constructor',
  
  /** Method injection */
  METHOD = 'method',
  
  /** Factory injection */
  FACTORY = 'factory',
  
  /** Event-based injection */
  EVENT = 'event'
}

export interface DependencyTransform {
  /** Transform type */
  readonly type: 'extract' | 'wrap' | 'proxy' | 'filter' | 'map' | 'custom';
  
  /** Transform configuration */
  readonly config: Record<string, any>;
  
  /** Transform function (for custom transforms) */
  readonly transformer?: (value: any) => any;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolution {
  /** Resolved dependencies */
  readonly resolved: readonly ResolvedDependency[];
  
  /** Failed dependencies */
  readonly failed: readonly FailedDependency[];
  
  /** Dependency loading order */
  readonly loadOrder: readonly string[];
  
  /** Resolution warnings */
  readonly warnings: readonly DependencyWarning[];
  
  /** Resolution statistics */
  readonly stats: DependencyResolutionStats;
}

export interface ResolvedDependency {
  readonly spec: ModuleDependencySpec;
  readonly resolvedVersion: string;
  readonly moduleInfo: ModuleResolutionInfo;
  readonly injectionPlan: DependencyInjectionPlan;
}

export interface ModuleResolutionInfo {
  readonly moduleId: string;
  readonly version: string;
  readonly location: string;
  readonly manifest: any; // ModuleManifest
  readonly checksum?: string;
  readonly signature?: string;
}

export interface DependencyInjectionPlan {
  readonly method: InjectionMethod;
  readonly target: string;
  readonly order: number;
  readonly lazy: boolean;
  readonly transform?: DependencyTransform;
}

export interface FailedDependency {
  readonly spec: ModuleDependencySpec;
  readonly error: DependencyError;
  readonly canRetry: boolean;
  readonly suggestions?: readonly string[];
}

export interface DependencyError {
  readonly code: DependencyErrorCode;
  readonly message: string;
  readonly details?: Record<string, any>;
}

export enum DependencyErrorCode {
  MODULE_NOT_FOUND = 'module_not_found',
  VERSION_NOT_FOUND = 'version_not_found',
  VERSION_CONFLICT = 'version_conflict',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  CONDITION_NOT_MET = 'condition_not_met',
  PERMISSION_DENIED = 'permission_denied',
  SECURITY_VIOLATION = 'security_violation',
  INCOMPATIBLE_PLATFORM = 'incompatible_platform',
  RESOURCE_INSUFFICIENT = 'resource_insufficient',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface DependencyWarning {
  readonly level: 'info' | 'warning' | 'error';
  readonly message: string;
  readonly moduleId?: string;
  readonly suggestion?: string;
}

export interface DependencyResolutionStats {
  readonly totalDependencies: number;
  readonly resolvedCount: number;
  readonly failedCount: number;
  readonly warningCount: number;
  readonly resolutionTime: number;
  readonly downloadSize?: number;
}

/**
 * Dependency resolver interface
 */
export interface DependencyResolver {
  /** Resolve dependencies for a module */
  resolve(
    moduleId: string,
    dependencies: readonly ModuleDependencySpec[],
    options?: DependencyResolutionOptions
  ): Promise<DependencyResolution>;
  
  /** Check for dependency conflicts */
  checkConflicts(
    dependencies: readonly ModuleDependencySpec[]
  ): Promise<readonly DependencyConflict[]>;
  
  /** Get available versions for a module */
  getAvailableVersions(moduleId: string): Promise<readonly string[]>;
  
  /** Check if a version satisfies a range */
  satisfiesRange(version: string, range: string): boolean;
  
  /** Find best matching version */
  findBestMatch(
    moduleId: string,
    versionRange: string
  ): Promise<string | null>;
  
  /** Validate dependency constraints */
  validateConstraints(
    dependency: ModuleDependencySpec,
    context: DependencyValidationContext
  ): Promise<DependencyConstraintValidation>;
}

export interface DependencyResolutionOptions {
  /** Whether to include dev dependencies */
  readonly includeDev?: boolean;
  
  /** Whether to resolve peer dependencies */
  readonly resolvePeers?: boolean;
  
  /** Maximum resolution depth */
  readonly maxDepth?: number;
  
  /** Whether to use cache */
  readonly useCache?: boolean;
  
  /** Whether to allow pre-release versions */
  readonly allowPrerelease?: boolean;
  
  /** Preferred registry URLs */
  readonly registries?: readonly string[];
  
  /** Resolution strategy */
  readonly strategy?: DependencyResolutionStrategy;
}

export enum DependencyResolutionStrategy {
  /** Prefer latest compatible versions */
  LATEST = 'latest',
  
  /** Prefer stable versions */
  STABLE = 'stable',
  
  /** Prefer locally cached versions */
  CACHED = 'cached',
  
  /** Use exact version matches when possible */
  EXACT = 'exact'
}

export interface DependencyConflict {
  readonly type: 'version' | 'constraint' | 'circular' | 'incompatible';
  readonly modules: readonly string[];
  readonly description: string;
  readonly resolutions?: readonly DependencyConflictResolution[];
}

export interface DependencyConflictResolution {
  readonly description: string;
  readonly action: 'upgrade' | 'downgrade' | 'exclude' | 'replace' | 'configure';
  readonly targets: readonly string[];
  readonly automatic: boolean;
}

export interface DependencyValidationContext {
  readonly platform: string;
  readonly environment: Record<string, string>;
  readonly features: readonly string[];
  readonly permissions: readonly string[];
  readonly resources: DependencyResourceContext;
}

export interface DependencyResourceContext {
  readonly availableMemory: number;
  readonly availableCpu: number;
  readonly availableDisk: number;
  readonly hasNetwork: boolean;
  readonly hasDatabase: boolean;
}

export interface DependencyConstraintValidation {
  readonly valid: boolean;
  readonly violations: readonly ConstraintViolation[];
  readonly warnings: readonly string[];
}

export interface ConstraintViolation {
  readonly constraint: DependencyConstraint;
  readonly reason: string;
  readonly severity: 'error' | 'warning';
  readonly canOverride: boolean;
}

/**
 * Dependency injector interface
 */
export interface DependencyInjector {
  /** Inject dependencies into a module */
  inject(
    target: any,
    dependencies: readonly ResolvedDependency[],
    options?: DependencyInjectionOptions
  ): Promise<DependencyInjectionResult>;
  
  /** Remove injected dependencies */
  eject(
    target: any,
    dependencies: readonly string[]
  ): Promise<void>;
  
  /** Get current injection state */
  getInjectionState(target: any): DependencyInjectionState;
  
  /** Register injection factory */
  registerFactory(
    name: string,
    factory: DependencyFactory
  ): void;
  
  /** Create injection plan */
  createInjectionPlan(
    dependencies: readonly ResolvedDependency[]
  ): DependencyInjectionPlan[];
}

export interface DependencyInjectionOptions {
  readonly lazy?: boolean;
  readonly validate?: boolean;
  readonly timeout?: number;
  readonly retries?: number;
}

export interface DependencyInjectionResult {
  readonly success: boolean;
  readonly injected: readonly string[];
  readonly failed: readonly DependencyInjectionFailure[];
  readonly warnings: readonly string[];
}

export interface DependencyInjectionFailure {
  readonly dependencyId: string;
  readonly error: string;
  readonly retryable: boolean;
}

export interface DependencyInjectionState {
  readonly injected: Record<string, any>;
  readonly pending: readonly string[];
  readonly failed: readonly string[];
  readonly lastUpdate: string;
}

export interface DependencyFactory {
  readonly name: string;
  readonly create: (spec: ModuleDependencySpec, resolved: ResolvedDependency) => Promise<any>;
  readonly destroy?: (instance: any) => Promise<void>;
}

/**
 * Dependency graph interface
 */
export interface DependencyGraph {
  /** Add module to graph */
  addModule(moduleId: string, dependencies: readonly ModuleDependencySpec[]): void;
  
  /** Remove module from graph */
  removeModule(moduleId: string): void;
  
  /** Get topological sort order */
  getLoadOrder(): readonly string[];
  
  /** Check for circular dependencies */
  hasCircularDependencies(): boolean;
  
  /** Get circular dependency paths */
  getCircularPaths(): readonly string[][];
  
  /** Get dependencies of a module */
  getDependencies(moduleId: string): readonly string[];
  
  /** Get dependents of a module */
  getDependents(moduleId: string): readonly string[];
  
  /** Get all connected modules */
  getConnectedModules(moduleId: string): readonly string[];
  
  /** Export graph as DOT format */
  toDot(): string;
  
  /** Export graph data */
  export(): DependencyGraphData;
}

export interface DependencyGraphData {
  readonly nodes: readonly DependencyGraphNode[];
  readonly edges: readonly DependencyGraphEdge[];
  readonly metadata: DependencyGraphMetadata;
}

export interface DependencyGraphNode {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly metadata?: Record<string, any>;
}

export interface DependencyGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly type: DependencyType;
  readonly optional: boolean;
  readonly versionRange: string;
  readonly metadata?: Record<string, any>;
}

export interface DependencyGraphMetadata {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly hasCircular: boolean;
  readonly maxDepth: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Dependency cache interface
 */
export interface DependencyCache {
  /** Store resolution result */
  store(
    key: string,
    resolution: DependencyResolution,
    ttl?: number
  ): Promise<void>;
  
  /** Retrieve resolution result */
  retrieve(key: string): Promise<DependencyResolution | null>;
  
  /** Check if cached resolution exists */
  has(key: string): Promise<boolean>;
  
  /** Clear cache entry */
  clear(key: string): Promise<void>;
  
  /** Clear all cache */
  clearAll(): Promise<void>;
  
  /** Get cache statistics */
  getStats(): Promise<DependencyCacheStats>;
}

export interface DependencyCacheStats {
  readonly size: number;
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly lastCleanup: string;
}

/**
 * Dependency utilities
 */
export class DependencyUtils {
  /**
   * Create dependency specification
   */
  static createDependency(
    moduleId: string,
    versionRange: string = '*',
    options: Partial<ModuleDependencySpec> = {}
  ): ModuleDependencySpec {
    return {
      moduleId,
      versionRange,
      type: DependencyType.REQUIRED,
      optional: false,
      ...options
    };
  }
  
  /**
   * Check if version satisfies range
   */
  static satisfiesVersion(version: string, range: string): boolean {
    // Simplified semver check - real implementation would use semver library
    if (range === '*') return true;
    if (range.startsWith('^')) {
      const baseVersion = range.substring(1);
      return version >= baseVersion;
    }
    if (range.startsWith('~')) {
      const baseVersion = range.substring(1);
      const baseParts = baseVersion.split('.');
      const versionParts = version.split('.');
      return versionParts[0] === baseParts[0] && versionParts[1] === baseParts[1];
    }
    return version === range;
  }
  
  /**
   * Generate dependency key for caching
   */
  static generateCacheKey(
    moduleId: string,
    dependencies: readonly ModuleDependencySpec[],
    options?: DependencyResolutionOptions
  ): string {
    const depHash = dependencies
      .map(dep => `${dep.moduleId}@${dep.versionRange}`)
      .sort()
      .join('|');
    
    const optionsHash = options ? JSON.stringify(options) : '';
    
    return `${moduleId}:${depHash}:${optionsHash}`;
  }
  
  /**
   * Parse version range
   */
  static parseVersionRange(range: string): VersionRange {
    if (range === '*') {
      return { type: 'any' };
    }
    
    if (range.startsWith('^')) {
      return { 
        type: 'caret', 
        version: range.substring(1) 
      };
    }
    
    if (range.startsWith('~')) {
      return { 
        type: 'tilde', 
        version: range.substring(1) 
      };
    }
    
    if (range.includes(' - ')) {
      const [min, max] = range.split(' - ');
      return { 
        type: 'range', 
        min: min.trim(), 
        max: max.trim() 
      };
    }
    
    return { 
      type: 'exact', 
      version: range 
    };
  }
  
  /**
   * Validate dependency specification
   */
  static validate(spec: ModuleDependencySpec): DependencyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!spec.moduleId) {
      errors.push('Module ID is required');
    }
    
    if (!spec.versionRange) {
      errors.push('Version range is required');
    }
    
    if (spec.optional && spec.type === DependencyType.REQUIRED) {
      warnings.push('Optional flag conflicts with required type');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export interface VersionRange {
  readonly type: 'any' | 'exact' | 'caret' | 'tilde' | 'range';
  readonly version?: string;
  readonly min?: string;
  readonly max?: string;
}

export interface DependencyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}