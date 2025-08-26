/**
 * Rate Limiting Configuration
 * Centralizes all rate limiting settings for the application
 */

import { rateLimit, Options } from 'express-rate-limit';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Create a rate limiter with development-friendly defaults
 * In development, rate limiting is effectively disabled for localhost
 */
export function createRateLimit(options: Partial<Options> = {}): any {
  const defaultOptions: Options = {
    windowMs: 15 * 60 * 1000, // 15 minutes default
    max: isDevelopment ? 1000000 : 100, // 1M in dev, 100 in prod
    message: {
      success: false,
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for localhost in development
    skip: (req) => {
      if (isDevelopment) {
        const ip = req.ip || req.socket?.remoteAddress || '';
        const isLocalhost = ip === '::1' || 
                           ip === '127.0.0.1' || 
                           ip === 'localhost' ||
                           ip === 'unknown' ||
                           ip.includes('::ffff:127.0.0.1') ||
                           ip.includes('::ffff:127.0.0');
        
        if (isLocalhost) {
          console.log('🚀 Rate limiting skipped for localhost:', ip);
          return true;
        }
      }
      return false;
    },
    ...options // Allow overriding defaults
  };

  return rateLimit(defaultOptions);
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const rateLimiters = {
  // General API rate limiting
  general: createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000000 : 5000
  }),

  // Authentication rate limiting
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000000 : 50,
    message: {
      success: false,
      message: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMITED'
    }
  }),

  // Login rate limiting (stricter)
  login: createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000000 : 5,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      message: 'Too many login attempts, please try again later',
      code: 'LOGIN_RATE_LIMITED'
    }
  }),

  // AI/LLM rate limiting
  ai: createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000000 : 100,
    message: {
      success: false,
      message: 'Too many AI requests',
      code: 'AI_RATE_LIMITED'
    }
  }),

  // Settings/sensitive operations
  sensitive: createRateLimit({
    windowMs: 5 * 60 * 1000,
    max: isDevelopment ? 1000000 : 10,
    message: {
      success: false,
      message: 'Too many sensitive operations',
      code: 'SENSITIVE_RATE_LIMITED'
    }
  })
};

// Log configuration on startup
if (isDevelopment) {
  console.log('🚀 Rate limiting is DISABLED for localhost in development mode');
} else {
  console.log('🔒 Rate limiting is ENABLED for production mode');
}