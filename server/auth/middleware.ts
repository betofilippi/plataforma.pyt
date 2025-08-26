import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { getJWTService } from './jwt';
import { AuthRequest } from './controller';

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(pool: Pool) {
  const jwtService = getJWTService(pool);

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
 * Rate limiting middleware for auth endpoints
 */
export function createAuthRateLimit() {
  // Import is handled at the top of the file where this is used
  return {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // Only count failed requests
    skip: (req: any, res: any) => res.statusCode < 400
  };
}

/**
 * Stricter rate limiting for login attempts  
 */
export function createLoginRateLimit() {
  // Import is handled at the top of the file where this is used
  return {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
      code: 'LOGIN_RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful logins
    skipSuccessfulRequests: true
  };
}

/**
 * CORS configuration for auth endpoints
 */
export function authCorsOptions() {
  return {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Helper function to check user permissions (placeholder for future implementation)
 */
async function checkUserPermissions(pool: Pool, userId: string, permissions: string[]): Promise<boolean> {
  // Placeholder implementation - in a real app, you might have a permissions table
  // For now, we'll return true (all authenticated users have all permissions)
  
  // Example of what this might look like:
  /*
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM plataforma_core.user_permissions up
    JOIN plataforma_core.permissions p ON up.permission_id = p.id
    WHERE up.user_id = $1 AND p.name = ANY($2)
  `, [userId, permissions]);
  
  return result.rows[0].count === permissions.length;
  */
  
  return true;
}

/**
 * Request logger middleware for auth routes
 */
export function authLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };
    
    console.log(`[AUTH] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    
    // In production, you might want to log this to a proper logging service
    if (res.statusCode >= 400) {
      console.error('[AUTH ERROR]', logData);
    }
  });
  
  next();
}

export default {
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  combineAuth,
  authErrorHandler,
  createAuthRateLimit,
  createLoginRateLimit,
  authCorsOptions,
  securityHeaders,
  authLogger
};