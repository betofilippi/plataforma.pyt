/**
 * RBAC Enterprise Types
 * Complete TypeScript interfaces for Role-Based Access Control system
 */

// =====================================================================
// CORE ENUMS
// =====================================================================

export enum PermissionCategory {
  SYSTEM = 'system',
  USER_MANAGEMENT = 'user_management',
  ROLE_MANAGEMENT = 'role_management', 
  MODULE_MANAGEMENT = 'module_management',
  DATA_ACCESS = 'data_access',
  REPORTS = 'reports',
  SECURITY = 'security'
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  INSTALL = 'install',
  UNINSTALL = 'uninstall',
  CONFIGURE = 'configure',
  MANAGE = 'manage',
  ADMIN_PANEL = 'admin_panel',
  SETTINGS = 'settings'
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  TEAM_LEAD = 'team_lead',
  ANALYST = 'analyst',
  USER = 'user',
  READONLY = 'readonly',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive', 
  LOCKED = 'locked',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export enum AuditAction {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ACTIVATED = 'user.activated',
  USER_DEACTIVATED = 'user.deactivated',
  USER_LOCKED = 'user.locked',
  USER_UNLOCKED = 'user.unlocked',
  ROLE_ASSIGNED = 'role.assigned',
  ROLE_REMOVED = 'role.removed',
  PERMISSION_GRANTED = 'permission.granted',
  PERMISSION_REVOKED = 'permission.revoked',
  LOGIN_SUCCESS = 'login.success',
  LOGIN_FAILED = 'login.failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password.changed'
}

// =====================================================================
// BASE INTERFACES
// =====================================================================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// =====================================================================
// ORGANIZATION & TENANCY
// =====================================================================

export interface Organization extends BaseEntity {
  name: string;
  displayName: string;
  domain?: string;
  logoUrl?: string;
  settings: Record<string, any>;
  isActive: boolean;
}

export interface CreateOrganizationRequest {
  name: string;
  displayName: string;
  domain?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
}

// =====================================================================
// PERMISSIONS SYSTEM
// =====================================================================

export interface Permission {
  id: string;
  name: string; // e.g., "users:create", "data:vendas:read"
  displayName: string;
  description?: string;
  category: PermissionCategory;
  resource?: string; // e.g., "users", "data:vendas"
  action: PermissionAction;
  isSystemPermission: boolean;
  createdAt: string;
}

export interface CreatePermissionRequest {
  name: string;
  displayName: string;
  description?: string;
  category: PermissionCategory;
  resource?: string;
  action: PermissionAction;
}

// System-defined permissions list
export const SYSTEM_PERMISSIONS = {
  // System
  SYSTEM_ADMIN_PANEL: 'system:admin_panel',
  SYSTEM_SETTINGS: 'system:system_settings',
  SYSTEM_AUDIT_LOGS: 'system:audit_logs',
  
  // User Management
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',
  
  // Role Management
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_MANAGE_PERMISSIONS: 'roles:manage_permissions',
  
  // Module Management
  MODULES_INSTALL: 'modules:install',
  MODULES_CONFIGURE: 'modules:configure',
  MODULES_UNINSTALL: 'modules:uninstall',
  
  // Data Access
  DATA_READ: 'data:read',
  DATA_WRITE: 'data:write',
  DATA_DELETE: 'data:delete'
} as const;

export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS];

// =====================================================================
// ROLES SYSTEM
// =====================================================================

export interface Role extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  level: number; // Lower number = higher priority
  parentId?: string;
  organizationId: string;
  isSystemRole: boolean;
  isActive: boolean;
  color: string; // Hex color for UI
  icon?: string; // Lucide icon name
}

export interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  level?: number;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateRoleRequest {
  displayName?: string;
  description?: string;
  level?: number;
  parentId?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  userCount: number;
  children: Role[];
}

// =====================================================================
// USERS SYSTEM
// =====================================================================

export interface User extends BaseEntity {
  email: string;
  emailVerifiedAt?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  organizationId: string;
  
  // Security & Status
  isActive: boolean;
  isLocked: boolean;
  lockReason?: string;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastPasswordChangeAt?: string;
  
  // Multi-factor Authentication
  mfaEnabled: boolean;
  
  // Preferences & Settings
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  preferences: Record<string, any>;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  password?: string;
  mustChangePassword?: boolean;
  roleIds?: string[];
}

export interface UpdateUserRequest {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  managerId?: string;
  isActive?: boolean;
  timezone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  preferences?: Record<string, any>;
}

export interface UserWithRoles extends User {
  roles: Role[];
  manager?: User;
  permissions: UserPermission[];
  effectivePermissions: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  recentLogins: number;
  usersWithMfa: number;
}

// =====================================================================
// USER-ROLE ASSIGNMENTS
// =====================================================================

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: string;
  assignedBy?: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  expiresAt?: string;
}

export interface BulkAssignRoleRequest {
  userIds: string[];
  roleId: string;
  expiresAt?: string;
}

// =====================================================================
// PERMISSIONS ASSIGNMENTS
// =====================================================================

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  grantedAt: string;
  grantedBy?: string;
}

export interface UserPermission {
  id: string;
  userId: string;
  permissionId: string;
  granted: boolean; // true = grant, false = deny
  grantedAt: string;
  grantedBy?: string;
  expiresAt?: string;
  reason?: string;
}

export interface PermissionWithSource extends Permission {
  granted: boolean;
  source: 'direct' | 'role' | string; // role name if from role
}

// =====================================================================
// GROUPS SYSTEM
// =====================================================================

export interface Group extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  organizationId: string;
  parentGroupId?: string;
  isActive: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  joinedBy?: string;
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & { user: User })[];
  permissions: Permission[];
  children: Group[];
}

// =====================================================================
// SESSIONS & SECURITY
// =====================================================================

export interface UserSession {
  id: string;
  userId: string;
  tokenFamily: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
}

export interface LoginAttempt {
  id: string;
  email: string;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  attemptedAt: string;
  organizationId?: string;
}

export interface SecurityStats {
  totalSessions: number;
  activeSessions: number;
  failedLogins24h: number;
  uniqueIps24h: number;
  mfaUsage: number;
  suspiciousActivity: LoginAttempt[];
}

// =====================================================================
// AUDIT SYSTEM
// =====================================================================

export interface AuditLog {
  id: string;
  userId?: string;
  organizationId?: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

// =====================================================================
// AUTHENTICATION
// =====================================================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserWithRoles;
    accessToken: string;
    expiresIn: number;
    tokenType: string;
    requiresMfa?: boolean;
    mfaQrCode?: string;
  };
  code?: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string; // Optional if using HTTP-only cookies
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

// =====================================================================
// MFA (Multi-Factor Authentication)
// =====================================================================

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MfaVerifyRequest {
  code: string;
}

export interface MfaBackupCodeRequest {
  backupCode: string;
}

// =====================================================================
// API RESPONSES
// =====================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// =====================================================================
// QUERY PARAMETERS
// =====================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserFilters extends PaginationParams {
  search?: string;
  role?: string;
  department?: string;
  isActive?: boolean;
  isLocked?: boolean;
  organizationId?: string;
}

export interface RoleFilters extends PaginationParams {
  search?: string;
  level?: number;
  isActive?: boolean;
  organizationId?: string;
}

export interface AuditFilters extends PaginationParams {
  userId?: string;
  action?: AuditAction;
  resourceType?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
}

// =====================================================================
// RBAC CONTEXT & STATE
// =====================================================================

export interface RbacContext {
  user: UserWithRoles | null;
  permissions: string[];
  roles: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  canAccess: (resource: string, action: string) => boolean;
}

export interface RbacState {
  user: UserWithRoles | null;
  users: User[];
  roles: Role[];
  permissions: Permission[];
  organizations: Organization[];
  isLoading: boolean;
  error: string | null;
}

// =====================================================================
// UTILITY TYPES
// =====================================================================

export type PermissionCheck = (permission: string) => boolean;
export type RoleCheck = (role: string | string[]) => boolean;

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string | string[];
  requiresAuthentication?: boolean;
  fallback?: React.ReactNode;
}

// =====================================================================
// MODULE INTEGRATION
// =====================================================================

export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  permissions: Permission[];
}

export interface DataPermission {
  schema: string;
  table: string;
  permissions: ('read' | 'write' | 'delete')[];
}

// =====================================================================
// EXPORT ALL
// =====================================================================

export type {
  BaseEntity,
  Timestamps,
  Organization,
  Permission,
  Role,
  User,
  UserRole,
  UserPermission,
  Group,
  UserSession,
  LoginAttempt,
  AuditLog
};