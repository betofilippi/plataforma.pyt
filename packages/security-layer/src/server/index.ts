// Server-side exports
export { SecurityLayer } from '../SecurityLayer.js';
export { CSPManager } from '../csp/CSPManager.js';
export { ModuleSandbox } from '../sandbox/ModuleSandbox.js';
export { RateLimitManager, MemoryStore } from '../rate-limiting/RateLimitManager.js';
export { AuditLogger } from '../audit/AuditLogger.js';
export { JWTManager } from '../jwt/JWTManager.js';
export { RBACManager } from '../rbac/RBACManager.js';

// Export all types
export * from '../types/index.js';

// Default configuration
export const defaultSecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    algorithm: 'HS256' as const,
    issuer: 'plataforma.app',
    audience: 'plataforma.app'
  },
  csp: {
    enabled: true,
    reportOnly: false,
    upgradeInsecureRequests: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
      childSrc: ["'self'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  audit: {
    enabled: true,
    logLevel: 'info' as const,
    destinations: [
      {
        type: 'file' as const,
        config: {
          filename: 'logs/audit.log',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5
        }
      }
    ],
    includeRequest: true,
    includeResponse: false,
    maskSensitiveData: true,
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization']
  },
  sandbox: {
    enabled: true,
    allowedDomains: ['localhost', '*.plataforma.app'],
    allowedAPIs: ['/api/*'],
    resourceLimits: {
      maxMemory: 256, // MB
      maxCpuTime: 5000, // ms
      maxNetworkRequests: 50,
      maxFileSize: 10 * 1024 * 1024 // bytes
    },
    networkPolicy: {
      allowedHosts: ['api.plataforma.app'],
      blockedHosts: [],
      allowedPorts: [80, 443],
      requireHttps: true
    }
  },
  rbac: {
    enabled: true,
    defaultRole: 'user',
    superAdminRole: 'super_admin',
    roles: [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access',
        isSystemRole: true
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access',
        isSystemRole: true,
        inheritsFrom: ['user']
      },
      {
        id: 'user',
        name: 'User',
        description: 'Basic user access',
        isSystemRole: true
      }
    ],
    permissions: [
      {
        id: 'system.read',
        name: 'Read System',
        resource: 'system',
        action: 'read'
      },
      {
        id: 'system.write',
        name: 'Write System',
        resource: 'system',
        action: 'write'
      },
      {
        id: 'modules.execute',
        name: 'Execute Modules',
        resource: 'modules',
        action: 'execute'
      }
    ],
    rolePermissions: [
      { roleId: 'super_admin', permissionId: 'system.read', granted: true },
      { roleId: 'super_admin', permissionId: 'system.write', granted: true },
      { roleId: 'super_admin', permissionId: 'modules.execute', granted: true },
      { roleId: 'admin', permissionId: 'system.read', granted: true },
      { roleId: 'admin', permissionId: 'modules.execute', granted: true },
      { roleId: 'user', permissionId: 'modules.execute', granted: true }
    ]
  }
};