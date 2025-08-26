// Central export file for the permission system

export { PermissionService } from './PermissionService';
export type { Permission, Role, UserPermissions, PermissionCheck } from './PermissionService';

export { 
  createPermissionMiddleware, 
  createCommonMiddleware,
  RequirePermission,
  RequireRole,
  RequireLevel,
  RequireAdmin,
  RequireSuperAdmin,
  RequireModulePermission,
  RequireSelfOrAdmin,
  CustomAuthorize
} from './middleware';
export type { PermissionRequest, AuthorizeOptions } from './middleware';

export { createPermissionRoutes } from './routes';

export { ModulePermissionManager, CORE_MODULE_CONFIG } from './ModulePermissionManager';
export type { 
  ModulePermissionDefinition, 
  ModuleRoleDefinition, 
  ModulePermissionConfig 
} from './ModulePermissionManager';

// Re-export common middleware functions for convenience
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { createCommonMiddleware } from './middleware';

export function createPermissionSystem(pool: Pool, redis?: Redis) {
  return createCommonMiddleware(pool, redis);
}

// Export permission constants
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read', 
  UPDATE: 'update',
  DELETE: 'delete',
  ADMIN: 'admin'
} as const;

export const ROLE_LEVELS = {
  GUEST: 10,
  VIEWER: 50,
  USER: 100,
  EDITOR: 200,
  MANAGER: 300,
  MODULE_ADMIN: 400,
  ADMIN: 500,
  SUPER_ADMIN: 1000
} as const;

export const SYSTEM_PERMISSIONS = {
  // User management
  USERS_CREATE: 'system.users.create',
  USERS_READ: 'system.users.read',
  USERS_UPDATE: 'system.users.update',
  USERS_DELETE: 'system.users.delete',
  USERS_ADMIN: 'system.users.admin',
  
  // Role management
  ROLES_CREATE: 'system.roles.create',
  ROLES_READ: 'system.roles.read',
  ROLES_UPDATE: 'system.roles.update',
  ROLES_DELETE: 'system.roles.delete',
  ROLES_ADMIN: 'system.roles.admin',
  
  // Permission management
  PERMISSIONS_CREATE: 'system.permissions.create',
  PERMISSIONS_READ: 'system.permissions.read',
  PERMISSIONS_UPDATE: 'system.permissions.update',
  PERMISSIONS_DELETE: 'system.permissions.delete',
  PERMISSIONS_ADMIN: 'system.permissions.admin',
  
  // Module management
  MODULES_READ: 'system.modules.read',
  MODULES_ADMIN: 'system.modules.admin',
  
  // Audit
  AUDIT_READ: 'system.audit.read'
} as const;

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest',
  VIEWER: 'viewer',
  EDITOR: 'editor',
  MODULE_ADMIN: 'module_admin'
} as const;