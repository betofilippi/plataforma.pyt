/**
 * RBAC Middleware - Authorization middleware for protected routes
 * Provides permission-based and role-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { RbacService } from './RbacService';
import { UserWithRoles } from '../../types/rbac';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: UserWithRoles;
      userId?: string;
      userRoles?: string[];
      userPermissions?: string[];
    }
  }
}

export class RbacMiddleware {
  constructor(private rbacService: RbacService) {}

  /**
   * Require specific permission
   */
  requirePermission(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permission denied. Required: ${permission}`,
            code: 'PERMISSION_DENIED',
            required: permission
          });
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking permissions',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Require one of multiple permissions (OR logic)
   */
  requireAnyPermission(permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        for (const permission of permissions) {
          const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);
          if (hasPermission) {
            return next();
          }
        }

        return res.status(403).json({
          success: false,
          message: `Permission denied. Required one of: ${permissions.join(', ')}`,
          code: 'PERMISSION_DENIED',
          required: permissions
        });
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking permissions',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Require all of multiple permissions (AND logic)
   */
  requireAllPermissions(permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        for (const permission of permissions) {
          const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);
          if (!hasPermission) {
            return res.status(403).json({
              success: false,
              message: `Permission denied. Missing: ${permission}`,
              code: 'PERMISSION_DENIED',
              required: permissions,
              missing: permission
            });
          }
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking permissions',
          code: 'PERMISSION_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Require specific role
   */
  requireRole(role: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasRole = req.user.roles.some(r => r.name === role);
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `Role required: ${role}`,
          code: 'ROLE_REQUIRED',
          required: role
        });
      }

      next();
    };
  }

  /**
   * Require one of multiple roles (OR logic)
   */
  requireAnyRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const hasRole = req.user.roles.some(r => roles.includes(r.name));
      
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: `One of these roles required: ${roles.join(', ')}`,
          code: 'ROLE_REQUIRED',
          required: roles
        });
      }

      next();
    };
  }

  /**
   * Require minimum role level
   */
  requireRoleLevel(minLevel: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const highestRole = req.user.roles.reduce((highest, role) => {
        return !highest || role.level < highest.level ? role : highest;
      }, null);

      if (!highestRole || highestRole.level > minLevel) {
        return res.status(403).json({
          success: false,
          message: `Insufficient role level. Required: ${minLevel} or lower`,
          code: 'INSUFFICIENT_ROLE_LEVEL',
          required: minLevel,
          current: highestRole?.level
        });
      }

      next();
    };
  }

  /**
   * Allow resource owner or admin
   */
  requireOwnershipOrPermission(permission: string, resourceIdParam: string = 'id') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        const resourceId = req.params[resourceIdParam];
        
        // Allow if user is accessing their own resource
        if (resourceId === req.user.id) {
          return next();
        }

        // Check if user has the required permission
        const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources or need admin permission.',
            code: 'ACCESS_DENIED'
          });
        }

        next();
      } catch (error) {
        console.error('Ownership check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking access rights',
          code: 'ACCESS_CHECK_ERROR'
        });
      }
    };
  }

  /**
   * Check data access permission (for dynamic table/schema access)
   */
  requireDataAccess(action: 'read' | 'write' | 'delete' = 'read') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Extract table/schema from request
        const { schema, table } = req.params;
        const resource = schema && table ? `data:${schema}:${table}` : 'data';
        const permission = `${resource}:${action}`;

        const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Data access denied for ${resource} (${action})`,
            code: 'DATA_ACCESS_DENIED',
            resource,
            action
          });
        }

        next();
      } catch (error) {
        console.error('Data access check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking data access',
          code: 'DATA_ACCESS_ERROR'
        });
      }
    };
  }

  /**
   * Rate limiting by user role
   */
  rateLimitByRole() {
    const roleLimits: Record<string, number> = {
      'super_admin': 1000, // 1000 requests per window
      'admin': 500,
      'manager': 200,
      'user': 100,
      'readonly': 50
    };

    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(); // Let other middleware handle auth
      }

      const highestRole = req.user.roles.reduce((highest, role) => {
        return !highest || role.level < highest.level ? role : highest;
      }, null);

      const limit = highestRole ? roleLimits[highestRole.name] || 50 : 50;
      
      // Add rate limit info to request for use by rate limiting middleware
      req.rateLimit = {
        max: limit,
        windowMs: 15 * 60 * 1000 // 15 minutes
      };

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  auditLog(action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(body) {
        // Log the action asynchronously
        setImmediate(async () => {
          try {
            if (req.user) {
              // Log to audit table - implementation depends on your audit service
              console.log('Audit Log:', {
                userId: req.user.id,
                action,
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                success: res.statusCode < 400,
                statusCode: res.statusCode,
                timestamp: new Date().toISOString()
              });
            }
          } catch (error) {
            console.error('Audit logging error:', error);
          }
        });

        // Call original json method
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Check if user account is active and not locked
   */
  requireActiveAccount() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!req.user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      if (req.user.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'Account is locked',
          code: 'ACCOUNT_LOCKED',
          reason: req.user.lockReason
        });
      }

      next();
    };
  }

  /**
   * Organization isolation middleware
   */
  requireSameOrganization() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Add organization filter to request for database queries
      req.organizationId = req.user.organizationId;
      
      next();
    };
  }

  /**
   * Development mode bypass (for testing)
   */
  devBypass() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (process.env.NODE_ENV === 'development' && process.env.RBAC_DEV_BYPASS === 'true') {
        console.warn('🚨 RBAC DEV BYPASS ENABLED - This should NEVER be used in production!');
        return next();
      }
      
      // In production, this middleware does nothing
      next();
    };
  }
}

// =====================================================================
// CONVENIENCE FUNCTIONS
// =====================================================================

/**
 * Create RBAC middleware instance
 */
export function createRbacMiddleware(pool: Pool): RbacMiddleware {
  const rbacService = new RbacService(pool);
  return new RbacMiddleware(rbacService);
}

/**
 * Common permission combinations
 */
export const COMMON_PERMISSIONS = {
  ADMIN_PANEL: ['system:admin_panel'],
  USER_MANAGEMENT: ['users:read', 'users:create', 'users:update'],
  USER_ADMIN: ['users:create', 'users:read', 'users:update', 'users:delete', 'users:manage_roles'],
  ROLE_MANAGEMENT: ['roles:read', 'roles:create', 'roles:update', 'roles:manage_permissions'],
  DATA_READ: ['data:read'],
  DATA_WRITE: ['data:read', 'data:write'],
  DATA_ADMIN: ['data:read', 'data:write', 'data:delete']
} as const;

/**
 * Common role combinations
 */
export const COMMON_ROLES = {
  SUPER_USERS: ['super_admin'],
  ADMINS: ['super_admin', 'admin'],
  MANAGERS: ['super_admin', 'admin', 'manager'],
  ALL_USERS: ['super_admin', 'admin', 'manager', 'user']
} as const;

// =====================================================================
// TYPE EXTENSIONS
// =====================================================================

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      rateLimit?: {
        max: number;
        windowMs: number;
      };
    }
  }
}