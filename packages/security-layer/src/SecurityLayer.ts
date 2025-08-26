import { Express, Request, Response, NextFunction } from 'express';
import { SecurityConfig, SecurityContext, SecurityError } from './types/index.js';
import { CSPManager } from './csp/CSPManager.js';
import { ModuleSandbox } from './sandbox/ModuleSandbox.js';
import { RateLimitManager } from './rate-limiting/RateLimitManager.js';
import { AuditLogger } from './audit/AuditLogger.js';
import { JWTManager } from './jwt/JWTManager.js';
import { RBACManager } from './rbac/RBACManager.js';

/**
 * Main Security Layer that orchestrates all security components
 */
export class SecurityLayer {
  private config: SecurityConfig;
  
  // Security components
  public readonly csp: CSPManager;
  public readonly sandbox: ModuleSandbox;
  public readonly rateLimit: RateLimitManager;
  public readonly audit: AuditLogger;
  public readonly jwt: JWTManager;
  public readonly rbac: RBACManager;

  constructor(config: SecurityConfig) {
    this.config = config;
    
    // Initialize components
    this.csp = new CSPManager(config.csp);
    this.sandbox = new ModuleSandbox(config.sandbox);
    this.rateLimit = new RateLimitManager();
    this.audit = new AuditLogger(config.audit);
    this.jwt = new JWTManager(config.jwt);
    this.rbac = new RBACManager(config.rbac);

    // Setup default rate limiters
    this.setupDefaultRateLimiters();
  }

  /**
   * Initialize security layer with Express app
   */
  public initialize(app: Express): void {
    // Apply security middleware in order
    this.applySecurityMiddleware(app);
  }

  /**
   * Apply all security middleware to Express app
   */
  private applySecurityMiddleware(app: Express): void {
    // 1. Basic security headers
    app.use(this.securityHeadersMiddleware());

    // 2. Content Security Policy
    if (this.config.csp.enabled) {
      app.use(this.csp.middleware());
    }

    // 3. Rate limiting
    app.use(this.rateLimit.middleware('global'));

    // 4. Audit logging
    if (this.config.audit.enabled) {
      app.use(this.audit.middleware({
        excludePaths: ['/health', '/metrics', '/favicon.ico'],
        includeBody: false,
        includeQuery: true
      }));
    }

    // 5. JWT authentication
    app.use(this.jwt.middleware({ required: false }));

    // 6. Security context middleware
    app.use(this.securityContextMiddleware());

    // 7. Error handling
    app.use(this.errorHandlingMiddleware());
  }

  /**
   * Setup default rate limiters
   */
  private setupDefaultRateLimiters(): void {
    // Global rate limiter
    this.rateLimit.createLimiter('global', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // 1000 requests per window per IP
      message: 'Too many requests from this IP, please try again later.'
    });

    // Auth rate limiter (stricter)
    this.rateLimit.createLimiter('auth', {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 login attempts per window per IP
      message: 'Too many authentication attempts, please try again later.'
    });

    // API rate limiter
    this.rateLimit.createLimiter('api', {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // 100 API requests per minute per user
      keyGenerator: (req: Request) => {
        return (req as any).user?.id || req.ip;
      }
    });
  }

  /**
   * Security headers middleware
   */
  private securityHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Basic security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Remove powered-by header
      res.removeHeader('X-Powered-By');
      
      next();
    };
  }

  /**
   * Security context middleware
   */
  private securityContextMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Create security context for the request
      const context = this.jwt.createSecurityContext(req);
      (req as any).securityContext = context;
      
      next();
    };
  }

  /**
   * Centralized error handling middleware
   */
  private errorHandlingMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      if (error instanceof SecurityError) {
        // Log security error
        if (this.config.audit.enabled) {
          const context = (req as any).securityContext as SecurityContext;
          this.audit.logSecurityEvent(
            'security.breach' as any,
            context,
            {
              error: error.message,
              code: error.code,
              path: req.path,
              method: req.method
            },
            'critical'
          );
        }

        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        });
      } else {
        // Handle other errors
        console.error('Unhandled error:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * Create module-specific security context
   */
  public createModuleContext(
    moduleId: string,
    moduleName: string,
    moduleVersion: string,
    securityConfig: {
      allowedDomains?: string[];
      allowedAPIs?: string[];
      permissions?: string[];
      cspSources?: any;
      rateLimits?: any;
    } = {}
  ): void {
    // Create sandbox context
    this.sandbox.createModuleContext(
      moduleId,
      moduleName,
      moduleVersion,
      {
        allowedResources: securityConfig.allowedAPIs || [],
        permissions: securityConfig.permissions || [],
        networkPolicy: {
          allowedHosts: securityConfig.allowedDomains || [],
          blockedHosts: [],
          allowedPorts: [80, 443],
          requireHttps: true
        }
      }
    );

    // Add module-specific CSP rules
    if (securityConfig.cspSources) {
      this.csp.addModuleCSP(moduleId, securityConfig.cspSources);
    }

    // Create module-specific rate limiter
    if (securityConfig.rateLimits) {
      this.rateLimit.createModuleLimiter(moduleId, securityConfig.rateLimits);
    }
  }

  /**
   * Remove module security context
   */
  public removeModuleContext(moduleId: string): void {
    this.sandbox.cleanupModule(moduleId);
    this.csp.removeModuleCSP(moduleId);
    this.rateLimit.removeLimiter(`module:${moduleId}`);
  }

  /**
   * Validate module action against security policies
   */
  public async validateModuleAction(
    moduleId: string,
    action: string,
    resource: string,
    context: SecurityContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check RBAC permissions
    if (this.config.rbac.enabled && context.user) {
      const hasPermission = this.rbac.hasPermission(
        context.user.id,
        resource,
        action
      );

      if (!hasPermission) {
        return { allowed: false, reason: 'Insufficient permissions' };
      }
    }

    // Check sandbox policies
    const resourceValidation = this.sandbox.validateResourceAccess(
      moduleId,
      resource,
      action
    );

    if (!resourceValidation.allowed) {
      return resourceValidation;
    }

    // Log the action
    if (this.config.audit.enabled) {
      await this.audit.logModuleEvent(moduleId, 'execute', context, {
        action,
        resource
      });
    }

    return { allowed: true };
  }

  /**
   * Get security metrics and statistics
   */
  public getSecurityMetrics(): {
    jwt: any;
    rbac: any;
    rateLimit: any;
    activeModules: string[];
    securityEvents: number;
  } {
    return {
      jwt: this.jwt.getStatistics(),
      rbac: this.rbac.getStatistics(),
      rateLimit: {}, // Would implement statistics method
      activeModules: this.sandbox.getActiveModules(),
      securityEvents: 0 // Would track from audit logs
    };
  }

  /**
   * Create security middleware for specific route
   */
  public createRouteMiddleware(options: {
    requireAuth?: boolean;
    requiredRoles?: string[];
    requiredPermissions?: Array<{ resource: string; action: string }>;
    rateLimitConfig?: any;
    allowedModules?: string[];
  }) {
    const middlewares: any[] = [];

    // Rate limiting
    if (options.rateLimitConfig) {
      const limiterName = `route_${Date.now()}`;
      this.rateLimit.createLimiter(limiterName, options.rateLimitConfig);
      middlewares.push(this.rateLimit.middleware(limiterName));
    }

    // Authentication
    if (options.requireAuth) {
      middlewares.push(this.jwt.middleware({ required: true }));
    }

    // Role-based authorization
    if (options.requiredRoles) {
      middlewares.push(this.rbac.requireRole(options.requiredRoles));
    }

    // Permission-based authorization
    if (options.requiredPermissions) {
      options.requiredPermissions.forEach(perm => {
        middlewares.push(this.rbac.requirePermission(perm.resource, perm.action));
      });
    }

    return middlewares;
  }

  /**
   * Health check endpoint
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, { status: string; lastCheck: string }>;
    timestamp: string;
  } {
    const timestamp = new Date().toISOString();
    
    return {
      status: 'healthy',
      components: {
        csp: { status: 'healthy', lastCheck: timestamp },
        sandbox: { status: 'healthy', lastCheck: timestamp },
        rateLimit: { status: 'healthy', lastCheck: timestamp },
        audit: { status: 'healthy', lastCheck: timestamp },
        jwt: { status: 'healthy', lastCheck: timestamp },
        rbac: { status: 'healthy', lastCheck: timestamp }
      },
      timestamp
    };
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    if (newConfig.csp) {
      this.csp.updateConfig(newConfig.csp);
    }

    if (newConfig.audit) {
      this.audit.updateConfig(newConfig.audit);
    }

    if (newConfig.jwt) {
      this.jwt.updateConfig(newConfig.jwt);
    }

    if (newConfig.rbac) {
      // Would need to implement updateConfig in RBACManager
    }
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Clear rate limit data
    this.rateLimit.clearAllRateLimits();

    // Cleanup audit logger
    this.audit.destroy();

    // Clear sandbox contexts
    this.sandbox.getActiveModules().forEach(moduleId => {
      this.sandbox.cleanupModule(moduleId);
    });
  }
}