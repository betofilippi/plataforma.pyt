import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PermissionService } from './PermissionService';
import { AuthRequest } from '../auth/controller';

// Extend AuthRequest to include permission info
export interface PermissionRequest extends AuthRequest {
  permissions?: {
    hasPermission: (permission: string, module?: string) => Promise<boolean>;
    checkPermissions: (permissions: string[], module?: string) => Promise<Record<string, boolean>>;
    userPermissions?: any;
    maxRoleLevel?: number;
  };
}

export interface AuthorizeOptions {
  permissions?: string | string[];
  roles?: string | string[];
  module?: string;
  requireAll?: boolean; // If true, user must have ALL specified permissions/roles
  allowSelf?: boolean; // Allow if user is accessing their own data
  selfParam?: string; // Parameter name for self-check (default: 'userId')
  minLevel?: number; // Minimum role level required
  maxLevel?: number; // Maximum role level allowed
  customCheck?: (req: PermissionRequest, service: PermissionService) => Promise<boolean>;
}

/**
 * Permission middleware factory
 */
export function createPermissionMiddleware(pool: Pool, redis?: Redis) {
  const permissionService = new PermissionService(pool, redis);

  /**
   * Base authorization middleware
   */
  function authorize(options: AuthorizeOptions = {}) {
    return async (req: PermissionRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Ensure user is authenticated
        if (!req.user?.userId) {
          res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
          return;
        }

        const userId = req.user.userId;

        // Get user permissions for context
        const userPermissions = await permissionService.getUserPermissions(userId, options.module);

        // Attach permission helpers to request
        req.permissions = {
          hasPermission: async (permission: string, module?: string) => {
            const result = await permissionService.hasPermission(userId, permission, module);
            return result.granted;
          },
          checkPermissions: async (permissions: string[], module?: string) => {
            const results = await permissionService.hasPermissions(userId, permissions, module);
            return Object.fromEntries(
              Object.entries(results).map(([perm, result]) => [perm, result.granted])
            );
          },
          userPermissions,
          maxRoleLevel: userPermissions.maxLevel
        };

        // Check self-access
        if (options.allowSelf && req.params) {
          const selfParam = options.selfParam || 'userId';
          const targetUserId = req.params[selfParam] || req.body[selfParam];
          if (targetUserId === userId) {
            next();
            return;
          }
        }

        // Check minimum role level
        if (options.minLevel !== undefined) {
          if (userPermissions.maxLevel < options.minLevel) {
            res.status(403).json({
              success: false,
              message: `Minimum role level ${options.minLevel} required`,
              code: 'INSUFFICIENT_LEVEL',
              required: { minLevel: options.minLevel },
              current: { maxLevel: userPermissions.maxLevel }
            });
            return;
          }
        }

        // Check maximum role level
        if (options.maxLevel !== undefined) {
          if (userPermissions.maxLevel > options.maxLevel) {
            res.status(403).json({
              success: false,
              message: `Role level too high, maximum ${options.maxLevel} allowed`,
              code: 'EXCESSIVE_LEVEL',
              required: { maxLevel: options.maxLevel },
              current: { maxLevel: userPermissions.maxLevel }
            });
            return;
          }
        }

        // Check role requirements
        if (options.roles) {
          const requiredRoles = Array.isArray(options.roles) ? options.roles : [options.roles];
          const userRoleNames = userPermissions.roles.map(r => r.name);
          
          const hasRoles = options.requireAll
            ? requiredRoles.every(role => userRoleNames.includes(role))
            : requiredRoles.some(role => userRoleNames.includes(role));

          if (!hasRoles) {
            res.status(403).json({
              success: false,
              message: `Required roles: ${requiredRoles.join(', ')}`,
              code: 'INSUFFICIENT_ROLES',
              required: requiredRoles,
              current: userRoleNames
            });
            return;
          }
        }

        // Check permission requirements
        if (options.permissions) {
          const requiredPermissions = Array.isArray(options.permissions) 
            ? options.permissions 
            : [options.permissions];

          const permissionChecks = await permissionService.hasPermissions(
            userId, 
            requiredPermissions, 
            options.module
          );

          const hasPermissions = options.requireAll
            ? requiredPermissions.every(perm => permissionChecks[perm]?.granted)
            : requiredPermissions.some(perm => permissionChecks[perm]?.granted);

          if (!hasPermissions) {
            const deniedPermissions = requiredPermissions.filter(
              perm => !permissionChecks[perm]?.granted
            );

            res.status(403).json({
              success: false,
              message: `Insufficient permissions`,
              code: 'INSUFFICIENT_PERMISSIONS',
              required: requiredPermissions,
              denied: deniedPermissions,
              module: options.module
            });
            return;
          }
        }

        // Custom authorization check
        if (options.customCheck) {
          const customResult = await options.customCheck(req, permissionService);
          if (!customResult) {
            res.status(403).json({
              success: false,
              message: 'Custom authorization check failed',
              code: 'CUSTOM_AUTH_FAILED'
            });
            return;
          }
        }

        next();
      } catch (error) {
        console.error('Authorization middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Authorization service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    };
  }

  return {
    authorize,
    permissionService
  };
}

/**
 * Decorator for requiring specific permissions
 */
export function RequirePermission(permissions: string | string[], options: Omit<AuthorizeOptions, 'permissions'> = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(req: PermissionRequest, res: Response, next: NextFunction) {
      // Apply authorization middleware
      const middleware = createPermissionMiddleware(this.pool, this.redis).authorize({
        ...options,
        permissions
      });

      await middleware(req, res, async () => {
        // Call original method if authorized
        return originalMethod.call(this, req, res, next);
      });
    };

    return descriptor;
  };
}

/**
 * Decorator for requiring specific roles
 */
export function RequireRole(roles: string | string[], options: Omit<AuthorizeOptions, 'roles'> = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(req: PermissionRequest, res: Response, next: NextFunction) {
      const middleware = createPermissionMiddleware(this.pool, this.redis).authorize({
        ...options,
        roles
      });

      await middleware(req, res, async () => {
        return originalMethod.call(this, req, res, next);
      });
    };

    return descriptor;
  };
}

/**
 * Decorator for requiring minimum role level
 */
export function RequireLevel(minLevel: number, options: Omit<AuthorizeOptions, 'minLevel'> = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(req: PermissionRequest, res: Response, next: NextFunction) {
      const middleware = createPermissionMiddleware(this.pool, this.redis).authorize({
        ...options,
        minLevel
      });

      await middleware(req, res, async () => {
        return originalMethod.call(this, req, res, next);
      });
    };

    return descriptor;
  };
}

/**
 * Decorator for admin-only access
 */
export function RequireAdmin(options: Omit<AuthorizeOptions, 'roles'> = {}) {
  return RequireRole(['admin', 'super_admin'], { ...options, requireAll: false });
}

/**
 * Decorator for super admin-only access
 */
export function RequireSuperAdmin(options: Omit<AuthorizeOptions, 'roles'> = {}) {
  return RequireRole('super_admin', options);
}

/**
 * Decorator for module-specific permissions
 */
export function RequireModulePermission(
  moduleName: string, 
  permissions: string | string[], 
  options: Omit<AuthorizeOptions, 'module' | 'permissions'> = {}
) {
  return RequirePermission(permissions, { ...options, module: moduleName });
}

/**
 * Decorator for self-or-admin access
 */
export function RequireSelfOrAdmin(selfParam = 'userId', options: Omit<AuthorizeOptions, 'allowSelf' | 'selfParam' | 'roles'> = {}) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(req: PermissionRequest, res: Response, next: NextFunction) {
      const middleware = createPermissionMiddleware(this.pool, this.redis).authorize({
        ...options,
        allowSelf: true,
        selfParam,
        roles: ['admin', 'super_admin'],
        requireAll: false
      });

      await middleware(req, res, async () => {
        return originalMethod.call(this, req, res, next);
      });
    };

    return descriptor;
  };
}

/**
 * Decorator for custom authorization logic
 */
export function CustomAuthorize(
  customCheck: (req: PermissionRequest, service: PermissionService) => Promise<boolean>,
  options: Omit<AuthorizeOptions, 'customCheck'> = {}
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(req: PermissionRequest, res: Response, next: NextFunction) {
      const middleware = createPermissionMiddleware(this.pool, this.redis).authorize({
        ...options,
        customCheck
      });

      await middleware(req, res, async () => {
        return originalMethod.call(this, req, res, next);
      });
    };

    return descriptor;
  };
}

/**
 * Helper function to create common middleware combinations
 */
export function createCommonMiddleware(pool: Pool, redis?: Redis) {
  const { authorize, permissionService } = createPermissionMiddleware(pool, redis);

  return {
    // Basic permission checks
    hasPermission: (permission: string, module?: string) => 
      authorize({ permissions: permission, module }),
    
    hasAnyPermission: (permissions: string[], module?: string) => 
      authorize({ permissions, module, requireAll: false }),
    
    hasAllPermissions: (permissions: string[], module?: string) => 
      authorize({ permissions, module, requireAll: true }),

    // Role checks
    hasRole: (role: string, module?: string) => 
      authorize({ roles: role, module }),
    
    hasAnyRole: (roles: string[], module?: string) => 
      authorize({ roles, module, requireAll: false }),
    
    hasAllRoles: (roles: string[], module?: string) => 
      authorize({ roles, module, requireAll: true }),

    // Level checks
    minLevel: (level: number) => 
      authorize({ minLevel: level }),
    
    maxLevel: (level: number) => 
      authorize({ maxLevel: level }),
    
    levelRange: (min: number, max: number) => 
      authorize({ minLevel: min, maxLevel: max }),

    // Common combinations
    adminOnly: () => authorize({ roles: ['admin', 'super_admin'] }),
    superAdminOnly: () => authorize({ roles: 'super_admin' }),
    managerOrAbove: () => authorize({ minLevel: 300 }),
    userOrAbove: () => authorize({ minLevel: 100 }),

    // Self-access patterns
    selfOrAdmin: (param = 'userId') => authorize({ 
      allowSelf: true, 
      selfParam: param, 
      roles: ['admin', 'super_admin'] 
    }),

    selfOrManager: (param = 'userId') => authorize({ 
      allowSelf: true, 
      selfParam: param, 
      minLevel: 300 
    }),

    // Module-specific
    planilhaAdmin: () => authorize({ 
      permissions: 'planilha.worksheets.admin', 
      module: 'planilha' 
    }),

    crmManager: () => authorize({ 
      permissions: ['crm.contacts.admin', 'crm.interactions.admin'], 
      module: 'crm',
      requireAll: false 
    }),

    // Custom hierarchical check
    canManageUser: () => authorize({
      customCheck: async (req: PermissionRequest, service: PermissionService) => {
        const managerId = req.user!.userId;
        const targetUserId = req.params.userId || req.body.userId;
        
        if (!targetUserId) return true; // No target specified
        if (managerId === targetUserId) return true; // Self-management
        
        return await service.canManageUser(managerId, targetUserId);
      }
    }),

    permissionService
  };
}

export default {
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
};