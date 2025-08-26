/**
 * Registry API Contract
 * 
 * Defines the interface for module registry operations including
 * registration, discovery, versioning, and metadata management.
 */

import { ModuleManifest } from '../contracts/ModuleManifest';

/**
 * Module registry interface
 */
export interface ModuleRegistryAPI {
  /** Register a new module */
  register(request: ModuleRegistrationRequest): Promise<ModuleRegistrationResult>;
  
  /** Update an existing module */
  update(request: ModuleUpdateRequest): Promise<ModuleUpdateResult>;
  
  /** Unregister a module */
  unregister(request: ModuleUnregistrationRequest): Promise<ModuleUnregistrationResult>;
  
  /** Get module information */
  getModule(request: GetModuleRequest): Promise<GetModuleResult>;
  
  /** Search for modules */
  search(request: ModuleSearchRequest): Promise<ModuleSearchResult>;
  
  /** List modules with pagination */
  list(request: ModuleListRequest): Promise<ModuleListResult>;
  
  /** Get module versions */
  getVersions(request: GetVersionsRequest): Promise<GetVersionsResult>;
  
  /** Get registry statistics */
  getStats(): Promise<RegistryStats>;
}

/**
 * Registration requests and responses
 */
export interface ModuleRegistrationRequest {
  /** Module manifest */
  readonly manifest: ModuleManifest;
  
  /** Module package data */
  readonly packageData: ModulePackageData;
  
  /** Registration metadata */
  readonly metadata: RegistrationMetadata;
}

export interface ModulePackageData {
  /** Package tarball URL or content */
  readonly package: string | ArrayBuffer;
  
  /** Package checksum */
  readonly checksum: string;
  
  /** Package size in bytes */
  readonly size: number;
  
  /** Package signature (if signed) */
  readonly signature?: string;
}

export interface RegistrationMetadata {
  /** Publisher information */
  readonly publisher: PublisherInfo;
  
  /** Publication timestamp */
  readonly publishedAt: string;
  
  /** Publication notes */
  readonly notes?: string;
  
  /** Tags for this version */
  readonly tags: readonly string[];
}

export interface PublisherInfo {
  readonly userId: string;
  readonly userName: string;
  readonly email: string;
  readonly organization?: string;
}

export interface ModuleRegistrationResult {
  readonly success: boolean;
  readonly moduleId: string;
  readonly version: string;
  readonly registryUrl: string;
  readonly publishedAt: string;
  readonly error?: RegistrationError;
  readonly warnings?: readonly string[];
}

export interface RegistrationError {
  readonly code: string;
  readonly message: string;
  readonly details?: any;
}

/**
 * Update requests and responses
 */
export interface ModuleUpdateRequest {
  readonly moduleId: string;
  readonly version: string;
  readonly manifest: ModuleManifest;
  readonly packageData: ModulePackageData;
  readonly metadata: RegistrationMetadata;
}

export interface ModuleUpdateResult {
  readonly success: boolean;
  readonly moduleId: string;
  readonly version: string;
  readonly updatedAt: string;
  readonly error?: RegistrationError;
  readonly warnings?: readonly string[];
}

/**
 * Unregistration requests and responses
 */
export interface ModuleUnregistrationRequest {
  readonly moduleId: string;
  readonly version?: string; // If not specified, unregister all versions
  readonly reason: string;
  readonly force?: boolean;
}

export interface ModuleUnregistrationResult {
  readonly success: boolean;
  readonly moduleId: string;
  readonly version?: string;
  readonly unregisteredAt: string;
  readonly error?: RegistrationError;
}

/**
 * Get module requests and responses
 */
export interface GetModuleRequest {
  readonly moduleId: string;
  readonly version?: string; // If not specified, get latest
  readonly includeManifest?: boolean;
  readonly includeStats?: boolean;
  readonly includeVersions?: boolean;
}

export interface GetModuleResult {
  readonly success: boolean;
  readonly module?: ModuleRegistryEntry;
  readonly error?: RegistrationError;
}

export interface ModuleRegistryEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly type: string;
  readonly author: string;
  readonly license: string;
  readonly keywords: readonly string[];
  readonly homepage?: string;
  readonly repository?: string;
  
  /** Current version info */
  readonly version: string;
  readonly publishedAt: string;
  readonly publisher: PublisherInfo;
  
  /** Package info */
  readonly packageUrl: string;
  readonly checksum: string;
  readonly size: number;
  
  /** Full manifest (if requested) */
  readonly manifest?: ModuleManifest;
  
  /** Module statistics (if requested) */
  readonly stats?: ModuleStats;
  
  /** All versions (if requested) */
  readonly versions?: readonly ModuleVersionInfo[];
}

export interface ModuleStats {
  readonly downloads: ModuleDownloadStats;
  readonly ratings: ModuleRatings;
  readonly dependencies: ModuleDependencyStats;
  readonly lastUpdated: string;
}

export interface ModuleDownloadStats {
  readonly total: number;
  readonly lastWeek: number;
  readonly lastMonth: number;
  readonly lastYear: number;
}

export interface ModuleRatings {
  readonly average: number;
  readonly count: number;
  readonly distribution: Record<string, number>; // "1" to "5"
}

export interface ModuleDependencyStats {
  readonly dependents: number;
  readonly dependencies: number;
}

export interface ModuleVersionInfo {
  readonly version: string;
  readonly publishedAt: string;
  readonly publisher: PublisherInfo;
  readonly deprecated?: boolean;
  readonly deprecationReason?: string;
  readonly tags: readonly string[];
  readonly downloads: number;
}

/**
 * Search requests and responses
 */
export interface ModuleSearchRequest {
  /** Search query */
  readonly query?: string;
  
  /** Filter by category */
  readonly category?: string;
  
  /** Filter by type */
  readonly type?: string;
  
  /** Filter by keywords */
  readonly keywords?: readonly string[];
  
  /** Filter by author */
  readonly author?: string;
  
  /** Filter by license */
  readonly license?: string;
  
  /** Minimum rating */
  readonly minRating?: number;
  
  /** Sort order */
  readonly sortBy?: SearchSortBy;
  
  /** Sort direction */
  readonly sortDirection?: 'asc' | 'desc';
  
  /** Pagination */
  readonly limit?: number;
  readonly offset?: number;
}

export enum SearchSortBy {
  RELEVANCE = 'relevance',
  NAME = 'name',
  DOWNLOADS = 'downloads',
  RATING = 'rating',
  UPDATED = 'updated',
  CREATED = 'created'
}

export interface ModuleSearchResult {
  readonly success: boolean;
  readonly modules: readonly ModuleSearchEntry[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly facets?: SearchFacets;
  readonly error?: RegistrationError;
}

export interface ModuleSearchEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly type: string;
  readonly author: string;
  readonly license: string;
  readonly keywords: readonly string[];
  readonly version: string;
  readonly publishedAt: string;
  readonly downloads: number;
  readonly rating: number;
  readonly ratingCount: number;
  readonly homepage?: string;
}

export interface SearchFacets {
  readonly categories: readonly FacetCount[];
  readonly types: readonly FacetCount[];
  readonly authors: readonly FacetCount[];
  readonly licenses: readonly FacetCount[];
}

export interface FacetCount {
  readonly value: string;
  readonly count: number;
}

/**
 * List requests and responses
 */
export interface ModuleListRequest {
  /** Filter by category */
  readonly category?: string;
  
  /** Filter by type */
  readonly type?: string;
  
  /** Filter by author */
  readonly author?: string;
  
  /** Sort order */
  readonly sortBy?: ListSortBy;
  
  /** Sort direction */
  readonly sortDirection?: 'asc' | 'desc';
  
  /** Pagination */
  readonly limit?: number;
  readonly offset?: number;
  
  /** Include deprecated modules */
  readonly includeDeprecated?: boolean;
}

export enum ListSortBy {
  NAME = 'name',
  CATEGORY = 'category',
  TYPE = 'type',
  AUTHOR = 'author',
  CREATED = 'created',
  UPDATED = 'updated'
}

export interface ModuleListResult {
  readonly success: boolean;
  readonly modules: readonly ModuleListEntry[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly error?: RegistrationError;
}

export interface ModuleListEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly type: string;
  readonly author: string;
  readonly version: string;
  readonly publishedAt: string;
  readonly deprecated?: boolean;
}

/**
 * Version requests and responses
 */
export interface GetVersionsRequest {
  readonly moduleId: string;
  readonly includeDeprecated?: boolean;
  readonly sortBy?: 'version' | 'published';
  readonly sortDirection?: 'asc' | 'desc';
  readonly limit?: number;
  readonly offset?: number;
}

export interface GetVersionsResult {
  readonly success: boolean;
  readonly moduleId: string;
  readonly versions: readonly ModuleVersionInfo[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly error?: RegistrationError;
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  readonly modules: RegistryModuleStats;
  readonly downloads: RegistryDownloadStats;
  readonly users: RegistryUserStats;
  readonly health: RegistryHealthStats;
  readonly generatedAt: string;
}

export interface RegistryModuleStats {
  readonly total: number;
  readonly byCategory: Record<string, number>;
  readonly byType: Record<string, number>;
  readonly byLicense: Record<string, number>;
  readonly recentlyAdded: number;
  readonly recentlyUpdated: number;
}

export interface RegistryDownloadStats {
  readonly total: number;
  readonly lastDay: number;
  readonly lastWeek: number;
  readonly lastMonth: number;
  readonly topModules: readonly DownloadRanking[];
}

export interface DownloadRanking {
  readonly moduleId: string;
  readonly name: string;
  readonly downloads: number;
}

export interface RegistryUserStats {
  readonly publishers: number;
  readonly organizations: number;
  readonly activePublishers: number;
}

export interface RegistryHealthStats {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly uptime: number;
  readonly responseTime: number;
  readonly errors: RegistryErrorStats;
}

export interface RegistryErrorStats {
  readonly total: number;
  readonly lastHour: number;
  readonly lastDay: number;
  readonly byType: Record<string, number>;
}

/**
 * Registry events
 */
export interface RegistryEvent {
  readonly type: RegistryEventType;
  readonly moduleId: string;
  readonly version?: string;
  readonly timestamp: string;
  readonly data: any;
}

export enum RegistryEventType {
  MODULE_REGISTERED = 'module-registered',
  MODULE_UPDATED = 'module-updated',
  MODULE_UNREGISTERED = 'module-unregistered',
  MODULE_DEPRECATED = 'module-deprecated',
  MODULE_DOWNLOADED = 'module-downloaded',
  PUBLISHER_ADDED = 'publisher-added',
  PUBLISHER_REMOVED = 'publisher-removed'
}

/**
 * Registry client interface
 */
export interface RegistryClient {
  /** Configure the client */
  configure(config: RegistryClientConfig): void;
  
  /** Get current configuration */
  getConfig(): RegistryClientConfig;
  
  /** Test connection to registry */
  ping(): Promise<RegistryPingResult>;
  
  /** Authenticate with registry */
  authenticate(credentials: RegistryCredentials): Promise<AuthenticationResult>;
  
  /** Get current authentication status */
  getAuthStatus(): Promise<AuthenticationStatus>;
  
  /** Registry API */
  readonly api: ModuleRegistryAPI;
  
  /** Subscribe to registry events */
  subscribe(callback: (event: RegistryEvent) => void): () => void;
}

export interface RegistryClientConfig {
  /** Registry base URL */
  readonly baseUrl: string;
  
  /** Client timeout */
  readonly timeout: number;
  
  /** Retry configuration */
  readonly retry: RetryConfig;
  
  /** Cache configuration */
  readonly cache: CacheConfig;
  
  /** Authentication token */
  readonly token?: string;
}

export interface RetryConfig {
  readonly maxAttempts: number;
  readonly delay: number;
  readonly backoff: 'linear' | 'exponential';
  readonly maxDelay: number;
}

export interface CacheConfig {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly maxSize: number;
}

export interface RegistryPingResult {
  readonly success: boolean;
  readonly responseTime: number;
  readonly version: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
}

export interface RegistryCredentials {
  readonly username?: string;
  readonly password?: string;
  readonly token?: string;
  readonly apiKey?: string;
}

export interface AuthenticationResult {
  readonly success: boolean;
  readonly token?: string;
  readonly expiresAt?: string;
  readonly user?: UserInfo;
  readonly error?: string;
}

export interface AuthenticationStatus {
  readonly authenticated: boolean;
  readonly user?: UserInfo;
  readonly expiresAt?: string;
}

export interface UserInfo {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly name: string;
  readonly organization?: string;
  readonly roles: readonly string[];
}

/**
 * Registry utilities
 */
export class RegistryUtils {
  /**
   * Parse module ID into components
   */
  static parseModuleId(moduleId: string): ModuleIdComponents {
    const parts = moduleId.split('/');
    
    if (parts.length === 1) {
      return { scope: undefined, name: parts[0] };
    } else if (parts.length === 2 && parts[0].startsWith('@')) {
      return { scope: parts[0], name: parts[1] };
    } else {
      throw new Error(`Invalid module ID format: ${moduleId}`);
    }
  }
  
  /**
   * Build module ID from components
   */
  static buildModuleId(components: ModuleIdComponents): string {
    if (components.scope) {
      return `${components.scope}/${components.name}`;
    } else {
      return components.name;
    }
  }
  
  /**
   * Validate module ID format
   */
  static validateModuleId(moduleId: string): boolean {
    try {
      RegistryUtils.parseModuleId(moduleId);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Compare versions using semantic versioning
   */
  static compareVersions(a: string, b: string): number {
    const parseVersion = (version: string) => {
      const [major, minor, patch] = version.split('.').map(Number);
      return { major, minor, patch };
    };
    
    const versionA = parseVersion(a);
    const versionB = parseVersion(b);
    
    if (versionA.major !== versionB.major) {
      return versionA.major - versionB.major;
    }
    
    if (versionA.minor !== versionB.minor) {
      return versionA.minor - versionB.minor;
    }
    
    return versionA.patch - versionB.patch;
  }
  
  /**
   * Get latest version from a list
   */
  static getLatestVersion(versions: readonly string[]): string {
    return versions
      .slice()
      .sort(RegistryUtils.compareVersions)
      .pop() || '0.0.0';
  }
  
  /**
   * Check if version satisfies range
   */
  static satisfiesRange(version: string, range: string): boolean {
    // Simplified range checking - real implementation would use semver library
    if (range === '*') return true;
    if (range.startsWith('^')) {
      const baseVersion = range.substring(1);
      return RegistryUtils.compareVersions(version, baseVersion) >= 0;
    }
    return version === range;
  }
}

export interface ModuleIdComponents {
  readonly scope?: string;
  readonly name: string;
}