import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RegistryConfig, User } from '../../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export function authMiddleware(config: RegistryConfig) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header'
          }
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer '
      
      try {
        const decoded = jwt.verify(token, config.security.jwtSecret) as any;
        
        // TODO: Fetch user from database to ensure they still exist and are active
        // For now, just use the decoded token data
        req.user = {
          id: decoded.userId,
          username: decoded.username,
          email: decoded.email,
          displayName: decoded.displayName,
          role: decoded.role,
          permissions: decoded.permissions,
          isVerified: decoded.isVerified,
          isActive: true,
          packagesPublished: 0,
          totalDownloads: 0,
          createdAt: new Date(decoded.iat * 1000)
        };
        
        req.token = token;
        next();
        
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }
      
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(role: string | string[]) {
  const roles = Array.isArray(role) ? role : [role];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const hasPermission = req.user.permissions.includes('*') || 
                         req.user.permissions.includes(permission) ||
                         req.user.role === 'admin';

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Missing required permission: ${permission}`
        }
      });
    }

    next();
  };
}

export function optionalAuth(config: RegistryConfig) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as any;
      
      req.user = {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        displayName: decoded.displayName,
        role: decoded.role,
        permissions: decoded.permissions,
        isVerified: decoded.isVerified,
        isActive: true,
        packagesPublished: 0,
        totalDownloads: 0,
        createdAt: new Date(decoded.iat * 1000)
      };
      
      req.token = token;
    } catch (jwtError) {
      // Invalid token, but continue without user
      // Could log this for security monitoring
    }
    
    next();
  };
}