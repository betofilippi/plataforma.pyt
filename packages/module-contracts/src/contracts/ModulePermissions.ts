/**
 * Module Permissions Contract
 * 
 * Defines the permission system for modules, including permission types,
 * scopes, validation, and enforcement mechanisms.
 */

/**
 * Module permission specification
 */
export interface ModulePermissionRequirement {
  /** Unique permission identifier */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Detailed description of what this permission allows */
  readonly description: string;
  
  /** Permission category */
  readonly category: PermissionCategory;
  
  /** Permission scope */
  readonly scope: PermissionScope;
  
  /** Permission level */
  readonly level: PermissionLevel;
  
  /** Whether this permission is required for basic module functionality */
  readonly required: boolean;
  
  /** Permissions that this permission depends on */
  readonly dependencies?: readonly string[];
  
  /** Permissions that conflict with this permission */
  readonly conflicts?: readonly string[];
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Permission categories
 */
export enum PermissionCategory {
  /** System-level permissions */
  SYSTEM = 'system',
  
  /** Database access permissions */
  DATABASE = 'database',
  
  /** File system permissions */
  FILESYSTEM = 'filesystem',
  
  /** Network access permissions */
  NETWORK = 'network',
  
  /** UI/UX related permissions */
  INTERFACE = 'interface',
  
  /** User data access permissions */
  USER_DATA = 'user_data',
  
  /** Inter-module communication permissions */
  COMMUNICATION = 'communication',
  
  /** External service integration permissions */
  INTEGRATION = 'integration',
  
  /** Security-related permissions */
  SECURITY = 'security',
  
  /** Analytics and monitoring permissions */
  ANALYTICS = 'analytics'
}

/**
 * Permission scopes
 */
export enum PermissionScope {
  /** Global system scope */
  GLOBAL = 'global',
  
  /** User-specific scope */
  USER = 'user',
  
  /** Module-specific scope */
  MODULE = 'module',
  
  /** Organization/tenant scope */
  ORGANIZATION = 'organization',
  
  /** Session-specific scope */
  SESSION = 'session',
  
  /** Resource-specific scope */
  RESOURCE = 'resource'
}

/**
 * Permission levels
 */
export enum PermissionLevel {
  /** Read-only access */
  READ = 'read',
  
  /** Write access (includes read) */
  WRITE = 'write',
  
  /** Administrative access */
  ADMIN = 'admin',
  
  /** Full control */
  OWNER = 'owner'
}

/**
 * Standard system permissions
 */
export const SystemPermissions = {
  // File system permissions
  FILESYSTEM_READ: {
    id: 'filesystem:read',
    name: 'File System Read',
    description: 'Read files and directories from the file system',
    category: PermissionCategory.FILESYSTEM,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.READ,
    required: false
  },
  
  FILESYSTEM_WRITE: {
    id: 'filesystem:write',
    name: 'File System Write',
    description: 'Write files and create directories in the file system',
    category: PermissionCategory.FILESYSTEM,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.WRITE,
    required: false,
    dependencies: ['filesystem:read']
  },
  
  // Database permissions
  DATABASE_READ: {
    id: 'database:read',
    name: 'Database Read',
    description: 'Read data from database tables and views',
    category: PermissionCategory.DATABASE,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.READ,
    required: false
  },
  
  DATABASE_WRITE: {
    id: 'database:write',
    name: 'Database Write',
    description: 'Insert, update, and delete data in database tables',
    category: PermissionCategory.DATABASE,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.WRITE,
    required: false,
    dependencies: ['database:read']
  },
  
  DATABASE_SCHEMA: {
    id: 'database:schema',
    name: 'Database Schema',
    description: 'Create, modify, and drop database schemas, tables, and indexes',
    category: PermissionCategory.DATABASE,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.ADMIN,
    required: false,
    dependencies: ['database:write']
  },
  
  // Network permissions
  NETWORK_HTTP: {
    id: 'network:http',
    name: 'HTTP Network Access',
    description: 'Make HTTP/HTTPS requests to external services',
    category: PermissionCategory.NETWORK,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.READ,
    required: false
  },
  
  NETWORK_WEBSOCKET: {
    id: 'network:websocket',
    name: 'WebSocket Network Access',
    description: 'Establish WebSocket connections',
    category: PermissionCategory.NETWORK,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.WRITE,
    required: false
  },
  
  // Interface permissions
  UI_DESKTOP: {
    id: 'ui:desktop',
    name: 'Desktop Integration',
    description: 'Create and manage desktop icons and shortcuts',
    category: PermissionCategory.INTERFACE,
    scope: PermissionScope.USER,
    level: PermissionLevel.WRITE,
    required: false
  },
  
  UI_WINDOWS: {
    id: 'ui:windows',
    name: 'Window Management',
    description: 'Create, manage, and control application windows',
    category: PermissionCategory.INTERFACE,
    scope: PermissionScope.USER,
    level: PermissionLevel.WRITE,
    required: true
  },
  
  UI_NOTIFICATIONS: {
    id: 'ui:notifications',
    name: 'Notifications',
    description: 'Send notifications to the user',
    category: PermissionCategory.INTERFACE,
    scope: PermissionScope.USER,
    level: PermissionLevel.WRITE,
    required: false
  },
  
  // User data permissions
  USER_PROFILE: {
    id: 'user:profile',
    name: 'User Profile Access',
    description: 'Access user profile information',
    category: PermissionCategory.USER_DATA,
    scope: PermissionScope.USER,
    level: PermissionLevel.READ,
    required: false
  },
  
  USER_PREFERENCES: {
    id: 'user:preferences',
    name: 'User Preferences',
    description: 'Read and modify user preferences and settings',
    category: PermissionCategory.USER_DATA,
    scope: PermissionScope.USER,
    level: PermissionLevel.WRITE,
    required: false
  },
  
  // Communication permissions
  COMMUNICATION_EVENTS: {
    id: 'communication:events',
    name: 'Event Communication',
    description: 'Send and receive events through the event bus',
    category: PermissionCategory.COMMUNICATION,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.WRITE,
    required: false
  },
  
  COMMUNICATION_RPC: {
    id: 'communication:rpc',
    name: 'RPC Communication',
    description: 'Make and handle remote procedure calls',
    category: PermissionCategory.COMMUNICATION,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.WRITE,
    required: false
  }
} as const;

/**
 * Permission context for evaluation
 */
export interface PermissionContext {
  /** User making the permission request */
  readonly user?: UserPermissionContext;
  
  /** Module requesting the permission */
  readonly module: ModulePermissionContext;
  
  /** Specific resource being accessed */
  readonly resource?: ResourcePermissionContext;
  
  /** Current session information */
  readonly session?: SessionPermissionContext;
  
  /** Additional context data */
  readonly metadata?: Record<string, any>;
}

export interface UserPermissionContext {
  readonly id: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly organization?: string;
  readonly groups?: readonly string[];
}

export interface ModulePermissionContext {
  readonly id: string;
  readonly version: string;
  readonly author: string;
  readonly certification?: 'community' | 'verified' | 'official';
  readonly trustLevel: number;
}

export interface ResourcePermissionContext {
  readonly type: string;
  readonly id: string;
  readonly owner?: string;
  readonly permissions?: Record<string, string[]>;
  readonly tags?: readonly string[];
}

export interface SessionPermissionContext {
  readonly id: string;
  readonly type: 'user' | 'api' | 'service';
  readonly startTime: string;
  readonly location?: string;
  readonly device?: string;
}

/**
 * Permission evaluation result
 */
export interface PermissionEvaluationResult {
  /** Whether permission is granted */
  readonly granted: boolean;
  
  /** Reason for the decision */
  readonly reason: string;
  
  /** Conditions that must be met */
  readonly conditions?: readonly PermissionCondition[];
  
  /** Time when permission expires */
  readonly expiresAt?: string;
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  readonly type: 'time' | 'location' | 'rate_limit' | 'approval' | 'mfa' | 'custom';
  readonly description: string;
  readonly parameters: Record<string, any>;
}

/**
 * Permission manager interface
 */
export interface PermissionManager {
  /** Check if a permission is granted */
  hasPermission(
    permission: string,
    context: PermissionContext
  ): Promise<boolean>;
  
  /** Evaluate permission with detailed result */
  evaluatePermission(
    permission: string,
    context: PermissionContext
  ): Promise<PermissionEvaluationResult>;
  
  /** Request permission from user */
  requestPermission(
    permission: string,
    context: PermissionContext,
    options?: PermissionRequestOptions
  ): Promise<PermissionRequestResult>;
  
  /** Grant permission */
  grantPermission(
    permission: string,
    context: PermissionContext,
    options?: PermissionGrantOptions
  ): Promise<void>;
  
  /** Revoke permission */
  revokePermission(
    permission: string,
    context: PermissionContext
  ): Promise<void>;
  
  /** Get all permissions for a context */
  getPermissions(context: PermissionContext): Promise<readonly PermissionGrant[]>;
  
  /** Validate permission requirements */
  validateRequirements(
    requirements: readonly ModulePermissionRequirement[],
    context: PermissionContext
  ): Promise<PermissionValidationResult>;
  
  /** Subscribe to permission changes */
  subscribe(
    callback: (event: PermissionChangeEvent) => void
  ): () => void;
}

export interface PermissionRequestOptions {
  /** Request message to show to user */
  readonly message?: string;
  
  /** Whether request is urgent */
  readonly urgent?: boolean;
  
  /** Timeout for user response */
  readonly timeout?: number;
  
  /** Alternative permissions that could be granted instead */
  readonly alternatives?: readonly string[];
}

export interface PermissionRequestResult {
  readonly granted: boolean;
  readonly permission: string;
  readonly reason?: string;
  readonly conditions?: readonly PermissionCondition[];
  readonly expiresAt?: string;
}

export interface PermissionGrantOptions {
  /** Conditions for the grant */
  readonly conditions?: readonly PermissionCondition[];
  
  /** When permission expires */
  readonly expiresAt?: string;
  
  /** Reason for granting */
  readonly reason?: string;
  
  /** Grant temporarily */
  readonly temporary?: boolean;
}

export interface PermissionGrant {
  readonly permission: string;
  readonly grantedAt: string;
  readonly grantedBy?: string;
  readonly expiresAt?: string;
  readonly conditions?: readonly PermissionCondition[];
  readonly scope: PermissionScope;
  readonly metadata?: Record<string, any>;
}

export interface PermissionValidationResult {
  readonly valid: boolean;
  readonly missing: readonly string[];
  readonly conflicting: readonly string[];
  readonly warnings: readonly string[];
  readonly recommendations?: readonly string[];
}

export interface PermissionChangeEvent {
  readonly type: 'granted' | 'revoked' | 'expired' | 'modified';
  readonly permission: string;
  readonly context: PermissionContext;
  readonly timestamp: string;
  readonly reason?: string;
}

/**
 * Permission policy interface
 */
export interface PermissionPolicy {
  /** Policy identifier */
  readonly id: string;
  
  /** Policy name */
  readonly name: string;
  
  /** Policy description */
  readonly description: string;
  
  /** Policy rules */
  readonly rules: readonly PermissionRule[];
  
  /** Policy priority (higher numbers take precedence) */
  readonly priority: number;
  
  /** Whether policy is enabled */
  readonly enabled: boolean;
}

export interface PermissionRule {
  /** Rule identifier */
  readonly id: string;
  
  /** Permission pattern this rule applies to */
  readonly permission: string;
  
  /** Context conditions */
  readonly conditions?: readonly PermissionRuleCondition[];
  
  /** Rule effect */
  readonly effect: 'allow' | 'deny';
  
  /** Additional constraints */
  readonly constraints?: readonly PermissionCondition[];
  
  /** Rule description */
  readonly description?: string;
}

export interface PermissionRuleCondition {
  readonly field: string;
  readonly operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'matches';
  readonly value: any;
}

/**
 * Permission audit interface
 */
export interface PermissionAuditLog {
  /** Audit entry ID */
  readonly id: string;
  
  /** Timestamp */
  readonly timestamp: string;
  
  /** Action performed */
  readonly action: 'check' | 'grant' | 'revoke' | 'request' | 'deny';
  
  /** Permission involved */
  readonly permission: string;
  
  /** Context at time of action */
  readonly context: PermissionContext;
  
  /** Result of action */
  readonly result: boolean;
  
  /** Reason for result */
  readonly reason?: string;
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

export interface PermissionAuditor {
  /** Log permission action */
  log(entry: Omit<PermissionAuditLog, 'id' | 'timestamp'>): Promise<void>;
  
  /** Query audit logs */
  query(criteria: PermissionAuditQuery): Promise<readonly PermissionAuditLog[]>;
  
  /** Get audit statistics */
  getStatistics(criteria: PermissionAuditQuery): Promise<PermissionAuditStatistics>;
}

export interface PermissionAuditQuery {
  readonly startTime?: string;
  readonly endTime?: string;
  readonly permissions?: readonly string[];
  readonly users?: readonly string[];
  readonly modules?: readonly string[];
  readonly actions?: readonly string[];
  readonly results?: readonly boolean[];
  readonly limit?: number;
  readonly offset?: number;
}

export interface PermissionAuditStatistics {
  readonly totalEntries: number;
  readonly successRate: number;
  readonly topPermissions: readonly PermissionStatistic[];
  readonly topUsers: readonly UserStatistic[];
  readonly topModules: readonly ModuleStatistic[];
  readonly timeDistribution: Record<string, number>;
}

export interface PermissionStatistic {
  readonly permission: string;
  readonly count: number;
  readonly successRate: number;
}

export interface UserStatistic {
  readonly userId: string;
  readonly count: number;
  readonly successRate: number;
}

export interface ModuleStatistic {
  readonly moduleId: string;
  readonly count: number;
  readonly successRate: number;
}

/**
 * Permission utilities
 */
export class PermissionUtils {
  /**
   * Check if one permission implies another
   */
  static implies(permission: string, impliedPermission: string): boolean {
    // Simple hierarchical check (e.g., "database:write" implies "database:read")
    if (permission === impliedPermission) return true;
    
    const permParts = permission.split(':');
    const impliedParts = impliedPermission.split(':');
    
    if (permParts.length !== impliedParts.length) return false;
    
    for (let i = 0; i < permParts.length - 1; i++) {
      if (permParts[i] !== impliedParts[i]) return false;
    }
    
    const permLevel = permParts[permParts.length - 1];
    const impliedLevel = impliedParts[impliedParts.length - 1];
    
    return PermissionUtils.levelImplies(permLevel, impliedLevel);
  }
  
  /**
   * Check if one permission level implies another
   */
  static levelImplies(level: string, impliedLevel: string): boolean {
    const hierarchy = ['read', 'write', 'admin', 'owner'];
    const levelIndex = hierarchy.indexOf(level);
    const impliedIndex = hierarchy.indexOf(impliedLevel);
    
    return levelIndex >= impliedIndex && levelIndex !== -1 && impliedIndex !== -1;
  }
  
  /**
   * Normalize permission string
   */
  static normalize(permission: string): string {
    return permission.toLowerCase().trim();
  }
  
  /**
   * Parse permission string into components
   */
  static parse(permission: string): PermissionComponents {
    const parts = permission.split(':');
    
    return {
      category: parts[0] || '',
      resource: parts[1] || '',
      action: parts[2] || '',
      scope: parts[3] || ''
    };
  }
  
  /**
   * Build permission string from components
   */
  static build(components: Partial<PermissionComponents>): string {
    return [
      components.category || '',
      components.resource || '',
      components.action || '',
      components.scope || ''
    ].filter(Boolean).join(':');
  }
}

export interface PermissionComponents {
  readonly category: string;
  readonly resource: string;
  readonly action: string;
  readonly scope: string;
}

/**
 * Type guard for permission requirements
 */
export function isPermissionRequirement(obj: any): obj is ModulePermissionRequirement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    Object.values(PermissionCategory).includes(obj.category) &&
    Object.values(PermissionScope).includes(obj.scope) &&
    Object.values(PermissionLevel).includes(obj.level) &&
    typeof obj.required === 'boolean'
  );
}

/**
 * Create a permission requirement with defaults
 */
export function createPermissionRequirement(
  partial: Partial<ModulePermissionRequirement> & Pick<ModulePermissionRequirement, 'id' | 'name' | 'description'>
): ModulePermissionRequirement {
  return {
    category: PermissionCategory.SYSTEM,
    scope: PermissionScope.GLOBAL,
    level: PermissionLevel.READ,
    required: false,
    ...partial
  };
}