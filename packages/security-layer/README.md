# @plataforma/security-layer

Comprehensive security layer for plataforma.app with Content Security Policy (CSP), module sandboxing, rate limiting, audit logging, JWT token management, and Role-Based Access Control (RBAC).

## Features

- **Content Security Policy (CSP)** - Module-specific CSP rules with violation reporting
- **Module Sandboxing** - Isolated execution environments with resource limits
- **Rate Limiting** - Configurable rate limiting per module/endpoint
- **Audit Logging** - Comprehensive security event logging
- **JWT Token Management** - Secure authentication with refresh tokens
- **Role-Based Access Control (RBAC)** - Hierarchical permissions system

## Installation

```bash
npm install @plataforma/security-layer
```

## Quick Start

### Server Setup

```typescript
import express from 'express';
import { SecurityLayer, defaultSecurityConfig } from '@plataforma/security-layer/server';

const app = express();
const security = new SecurityLayer(defaultSecurityConfig);

// Initialize security middleware
security.initialize(app);

// Create secure route
app.get('/secure', 
  ...security.createRouteMiddleware({
    requireAuth: true,
    requiredRoles: ['admin'],
    requiredPermissions: [{ resource: 'system', action: 'read' }]
  }),
  (req, res) => {
    res.json({ message: 'Secure endpoint accessed!' });
  }
);
```

### Client Setup

```typescript
import { ClientSecurityContext, TokenStorage } from '@plataforma/security-layer/client';

const securityContext = new ClientSecurityContext();

// Check authentication
if (securityContext.isAuthenticated()) {
  console.log('User:', securityContext.getUser());
  console.log('Roles:', securityContext.getRoles());
  console.log('Permissions:', securityContext.getPermissions());
}

// Set token after login
securityContext.setToken(loginResponse.accessToken);
```

## Core Components

### 1. Content Security Policy (CSP)

```typescript
import { CSPManager } from '@plataforma/security-layer/server';

const csp = new CSPManager({
  enabled: true,
  reportOnly: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"]
  }
});

// Add module-specific CSP
csp.addModuleCSP('my-module', {
  connectSrc: ['https://api.example.com'],
  scriptSrc: ['https://cdn.example.com']
});

// Use as Express middleware
app.use(csp.middleware());
```

### 2. Module Sandboxing

```typescript
import { ModuleSandbox } from '@plataforma/security-layer/server';

const sandbox = new ModuleSandbox({
  enabled: true,
  allowedDomains: ['api.plataforma.app'],
  allowedAPIs: ['/api/*'],
  resourceLimits: {
    maxMemory: 256, // MB
    maxCpuTime: 5000, // ms
    maxNetworkRequests: 50
  }
});

// Create module context
sandbox.createModuleContext('my-module', 'My Module', '1.0.0', {
  permissions: ['api.read', 'api.write'],
  allowedResources: ['database', 'storage']
});

// Execute code in sandbox
const result = await sandbox.executeInSandbox('my-module', async () => {
  // Module code here
  return await processData();
});
```

### 3. Rate Limiting

```typescript
import { RateLimitManager } from '@plataforma/security-layer/server';

const rateLimit = new RateLimitManager();

// Create rate limiter
rateLimit.createLimiter('api', {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: 'Rate limit exceeded'
});

// Use as middleware
app.use('/api', rateLimit.middleware('api'));

// Check rate limit programmatically
const status = await rateLimit.checkRateLimit('user-123', 'api');
if (!status.allowed) {
  console.log(`Rate limit exceeded. Retry after ${status.retryAfter} seconds`);
}
```

### 4. Audit Logging

```typescript
import { AuditLogger } from '@plataforma/security-layer/server';

const audit = new AuditLogger({
  enabled: true,
  logLevel: 'info',
  destinations: [
    { type: 'file', config: { filename: 'audit.log' } },
    { type: 'database', config: { /* db config */ } }
  ],
  maskSensitiveData: true
});

// Log events
await audit.logAuthentication('login', 'user-123', context, true);
await audit.logAuthorization('read', 'user-data', context, true);
await audit.logDataAccess('read', 'users', context, { userId: '123' });

// Use as middleware for automatic logging
app.use(audit.middleware());
```

### 5. JWT Token Management

```typescript
import { JWTManager } from '@plataforma/security-layer/server';

const jwt = new JWTManager({
  secret: 'your-secret-key',
  expiresIn: '1h',
  refreshTokenExpiresIn: '7d',
  algorithm: 'HS256'
});

// Generate tokens
const tokens = await jwt.generateTokens(user, ipAddress, userAgent);

// Verify token
const payload = await jwt.verifyToken(tokens.accessToken);

// Refresh token
const newTokens = await jwt.refreshAccessToken(tokens.refreshToken);

// Use as middleware
app.use(jwt.middleware({ required: true }));
```

### 6. Role-Based Access Control (RBAC)

```typescript
import { RBACManager } from '@plataforma/security-layer/server';

const rbac = new RBACManager({
  enabled: true,
  defaultRole: 'user',
  roles: [
    { id: 'admin', name: 'Administrator', isSystemRole: true },
    { id: 'user', name: 'User', isSystemRole: true }
  ],
  permissions: [
    { id: 'read', name: 'Read', resource: 'data', action: 'read' },
    { id: 'write', name: 'Write', resource: 'data', action: 'write' }
  ],
  rolePermissions: [
    { roleId: 'admin', permissionId: 'read', granted: true },
    { roleId: 'admin', permissionId: 'write', granted: true },
    { roleId: 'user', permissionId: 'read', granted: true }
  ]
});

// Check permissions
const canRead = rbac.hasPermission('user-123', 'data', 'read');
const canWrite = rbac.hasPermission('user-123', 'data', 'write');

// Use as middleware
app.use('/admin', rbac.requireRole('admin'));
app.use('/api/write', rbac.requirePermission('data', 'write'));
```

## Module Integration

### Secure Module Registration

```typescript
// Register module with security context
security.createModuleContext('ai-module', 'AI Module', '1.0.0', {
  allowedDomains: ['api.openai.com', 'api.anthropic.com'],
  allowedAPIs: ['/api/ai/*'],
  permissions: ['ai.execute', 'data.read'],
  cspSources: {
    connectSrc: ['https://api.openai.com'],
    scriptSrc: ['https://cdn.ai-module.com']
  },
  rateLimits: {
    windowMs: 60 * 1000,
    max: 20 // 20 AI requests per minute
  }
});

// Validate module actions
const validation = await security.validateModuleAction(
  'ai-module',
  'execute',
  'ai-model',
  securityContext
);

if (validation.allowed) {
  // Proceed with action
} else {
  console.log('Action blocked:', validation.reason);
}
```

## Configuration

### Default Configuration

```typescript
import { defaultSecurityConfig } from '@plataforma/security-layer/server';

// Use default config
const security = new SecurityLayer(defaultSecurityConfig);

// Or customize
const customConfig = {
  ...defaultSecurityConfig,
  jwt: {
    ...defaultSecurityConfig.jwt,
    expiresIn: '2h', // Extend token expiration
  },
  rateLimit: {
    ...defaultSecurityConfig.rateLimit,
    max: 200, // Increase rate limit
  }
};
```

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Security Settings
SECURITY_AUDIT_ENABLED=true
SECURITY_CSP_ENABLED=true
SECURITY_RBAC_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Monitor audit logs** for suspicious activity
4. **Configure CSP** restrictively
5. **Set appropriate rate limits** based on usage patterns
6. **Review module permissions** regularly
7. **Use least privilege principle** for RBAC
8. **Keep dependencies updated**

## Monitoring and Metrics

```typescript
// Get security metrics
const metrics = security.getSecurityMetrics();
console.log('Security Status:', metrics);

// Health check
const health = security.getHealthStatus();
if (health.status !== 'healthy') {
  console.warn('Security components degraded:', health);
}
```

## Testing

```typescript
import { SecurityLayer, defaultSecurityConfig } from '@plataforma/security-layer/server';

describe('Security Layer', () => {
  let security: SecurityLayer;

  beforeEach(() => {
    security = new SecurityLayer(defaultSecurityConfig);
  });

  test('should enforce authentication', async () => {
    const validation = await security.validateModuleAction(
      'test-module',
      'read',
      'data',
      contextWithoutAuth
    );
    expect(validation.allowed).toBe(false);
  });
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.