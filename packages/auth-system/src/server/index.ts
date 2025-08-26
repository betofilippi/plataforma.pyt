// Server-side Auth System exports
export { createAuthController, AuthController } from './controllers/authController';
export { createJWTService, JWTService } from './services/jwtService';
export { 
  createAuthMiddleware,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  combineAuth,
  authErrorHandler
} from './middleware/authMiddleware';

// Server-side types
export type {
  AuthRequest,
  AuthMiddlewareOptions,
  JWTPayload,
  TokenPair,
  RefreshTokenData,
  RateLimitConfig
} from './types';