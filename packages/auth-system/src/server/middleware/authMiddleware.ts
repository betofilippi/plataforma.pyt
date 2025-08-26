import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { createJWTService } from '../services/jwtService';
import { AuthRequest, AuthMiddlewareOptions } from '../types';

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(pool: Pool) {
  const jwtService = createJWTService(pool);

  /**
   * Main authentication middleware
   */
  return function authMiddleware(options: AuthMiddlewareOptions = { required: true }) {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = jwtService.extractTokenFromHeader(authHeader);

        // If no token provided
        if (!token) {
          if (options.required) {
            res.status(401).json({
              success: false,
              message: 'Authentication token required',
              code: 'TOKEN_REQUIRED'
            });
            return;
          } else {
            // Optional auth - continue without user
            next();
            return;
          }
        }

        // Verify token
        let payload;
        try {
          payload = jwtService.verifyAccessToken(token);
        } catch (error) {
          if (error instanceof Error) {
            let message = 'Invalid authentication token';
            let code = 'INVALID_TOKEN';

            switch (error.message) {
              case 'TOKEN_EXPIRED':
                message = 'Authentication token expired';
                code = 'TOKEN_EXPIRED';
                break;
              case 'INVALID_TOKEN':
                message = 'Invalid authentication token';
                code = 'INVALID_TOKEN';
                break;
              case 'TOKEN_VERIFICATION_FAILED':
                message = 'Token verification failed';
                code = 'TOKEN_VERIFICATION_FAILED';
                break;
            }

            res.status(401).json({
              success: false,
              message,
              code
            });
            return;
          }

          res.status(401).json({
            success: false,
            message: 'Authentication failed',
            code: 'AUTH_FAILED'
          });
          return;
        }

        // Verify user still exists and is active
        const userResult = await pool.query(`
          SELECT id, email, name, role, is_active, metadata
          FROM plataforma_core.users
          WHERE id = $1
        `, [payload.userId]);

        if (userResult.rows.length === 0) {
          res.status(401).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          });
          return;
        }

        const user = userResult.rows[0];

        if (!user.is_active) {
          res.status(401).json({
            success: false,
            message: 'User account is disabled',
            code: 'USER_DISABLED'
          });
          return;
        }

        // Check role requirements
        if (options.roles && options.roles.length > 0) {
          if (!options.roles.includes(user.role)) {
            res.status(403).json({
              success: false,
              message: 'Insufficient permissions - role required',
              code: 'INSUFFICIENT_ROLE',
              required: options.roles
            });
            return;
          }
        }

        // Check permission requirements (if implemented)
        if (options.permissions && options.permissions.length > 0) {
          const hasPermission = await checkUserPermissions(pool, user.id, options.permissions);
          if (!hasPermission) {
            res.status(403).json({
              success: false,
              message: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              required: options.permissions
            });
            return;
          }
        }

        // Attach user to request
        req.user = {
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };

        next();

      } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
      }
    };
  };
}

/**
 * Convenience middleware for required authentication
 */
export function requireAuth(pool: Pool) {
  const authMiddleware = createAuthMiddleware(pool);
  return authMiddleware({ required: true });
}

/**
 * Convenience middleware for optional authentication
 */
export function optionalAuth(pool: Pool) {
  const authMiddleware = createAuthMiddleware(pool);
  return authMiddleware({ required: false });
}

/**
 * Role-based authentication middleware
 */
export function requireRole(pool: Pool, ...roles: string[]) {
  const authMiddleware = createAuthMiddleware(pool);
  return authMiddleware({ required: true, roles });
}

/**
 * Admin-only middleware
 */
export function requireAdmin(pool: Pool) {
  return requireRole(pool, 'admin', 'super_admin');
}

/**
 * Permission-based authentication middleware
 */
export function requirePermission(pool: Pool, ...permissions: string[]) {
  const authMiddleware = createAuthMiddleware(pool);
  return authMiddleware({ required: true, permissions });
}

/**
 * Multiple middleware combiner
 */
export function combineAuth(pool: Pool, options: AuthMiddlewareOptions) {
  const authMiddleware = createAuthMiddleware(pool);
  return authMiddleware(options);
}

/**
 * Custom error handler for auth routes
 */
export function authErrorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
  console.error('Auth error:', error);

  // JWT specific errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
    return;
  }

  // Database errors
  if (error.code === '23505') { // Unique violation
    res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      code: 'DUPLICATE_ENTRY'
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
}

/**
 * Helper function to check user permissions (placeholder for future implementation)
 */
async function checkUserPermissions(pool: Pool, userId: string, permissions: string[]): Promise<boolean> {
  // Placeholder implementation - in a real app, you might have a permissions table
  // For now, we'll return true (all authenticated users have all permissions)
  return true;
}

export default {
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  combineAuth,
  authErrorHandler
};