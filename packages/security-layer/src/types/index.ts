// Core Security Types
export interface SecurityConfig {
  jwt: JWTConfig;
  csp: CSPConfig;
  rateLimit: RateLimitConfig;
  audit: AuditConfig;
  sandbox: SandboxConfig;
  rbac: RBACConfig;
}

// JWT Configuration
export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshTokenExpiresIn: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  issuer: string;
  audience: string;
}

// Content Security Policy Configuration
export interface CSPConfig {
  enabled: boolean;
  reportOnly: boolean;
  directives: CSPDirectives;
  reportUri?: string;
  upgradeInsecureRequests: boolean;
}

export interface CSPDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  mediaSrc: string[];
  frameSrc: string[];
  childSrc: string[];
  workerSrc: string[];
  manifestSrc: string[];
  formAction: string[];
  frameAncestors: string[];
  baseUri: string[];
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator?: (req: any) => string;
  skip?: (req: any) => boolean;
}

// Audit Logging Configuration
export interface AuditConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  destinations: AuditDestination[];
  includeRequest: boolean;
  includeResponse: boolean;
  maskSensitiveData: boolean;
  sensitiveFields: string[];
}

export interface AuditDestination {
  type: 'file' | 'database' | 'elasticsearch' | 'syslog';
  config: Record<string, any>;
}

// Sandbox Configuration
export interface SandboxConfig {
  enabled: boolean;
  allowedDomains: string[];
  allowedAPIs: string[];
  resourceLimits: ResourceLimits;
  networkPolicy: NetworkPolicy;
}

export interface ResourceLimits {
  maxMemory: number; // in MB
  maxCpuTime: number; // in milliseconds
  maxNetworkRequests: number;
  maxFileSize: number; // in bytes
}

export interface NetworkPolicy {
  allowedHosts: string[];
  blockedHosts: string[];
  allowedPorts: number[];
  requireHttps: boolean;
}

// Role-Based Access Control Configuration
export interface RBACConfig {
  enabled: boolean;
  defaultRole: string;
  superAdminRole: string;
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  inheritsFrom?: string[];
  metadata?: Record<string, any>;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  metadata?: Record<string, any>;
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  granted: boolean;
  conditions?: PermissionCondition[];
}

// User and Session Types
export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastAccessedAt: Date;
}

// Audit Event Types
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'error';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Security Context
export interface SecurityContext {
  user?: User;
  session?: Session;
  permissions: string[];
  roles: string[];
  ipAddress: string;
  userAgent: string;
  requestId: string;
  timestamp: Date;
}

// Module Sandbox Context
export interface ModuleSandboxContext {
  moduleId: string;
  moduleName: string;
  moduleVersion: string;
  allowedResources: string[];
  resourceLimits: ResourceLimits;
  networkPolicy: NetworkPolicy;
  permissions: string[];
}

// Security Events
export type SecurityEventType = 
  | 'authentication.login'
  | 'authentication.logout'
  | 'authentication.failed'
  | 'authorization.granted'
  | 'authorization.denied'
  | 'session.created'
  | 'session.expired'
  | 'session.revoked'
  | 'rateLimit.exceeded'
  | 'csp.violation'
  | 'sandbox.violation'
  | 'audit.logged'
  | 'security.breach'
  | 'module.loaded'
  | 'module.unloaded'
  | 'module.violation';

export interface SecurityEvent {
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: SecurityContext;
  details: Record<string, any>;
  timestamp: Date;
  handled: boolean;
}

// Error Types
export class SecurityError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AuthenticationError extends SecurityError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends SecurityError {
  constructor(message: string = 'Authorization failed', details?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends SecurityError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details);
    this.name = 'RateLimitError';
  }
}

export class SandboxViolationError extends SecurityError {
  constructor(message: string = 'Sandbox policy violation', details?: Record<string, any>) {
    super(message, 'SANDBOX_VIOLATION', 403, details);
    this.name = 'SandboxViolationError';
  }
}