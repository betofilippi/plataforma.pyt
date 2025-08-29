# JWT Authentication System Documentation

## Overview

This comprehensive JWT authentication system provides production-ready security features for the Python FastAPI backend. It implements industry-standard authentication patterns with advanced security measures including role-based access control (RBAC), multi-factor authentication (MFA), and comprehensive audit logging.

## Architecture

### Core Components

1. **Authentication Schemas** (`app/schemas/auth.py`)
   - Pydantic models for all authentication operations
   - Request/response validation
   - Type safety and documentation

2. **Authentication Services** (`app/services/auth.py`)
   - Core business logic for authentication
   - User registration and login
   - Token management and session handling
   - Password reset functionality

3. **API Routes** (`app/api/v1/auth.py`)
   - RESTful authentication endpoints
   - Comprehensive error handling
   - Rate limiting integration

4. **Enhanced Authentication Middleware** (`app/core/auth.py`)
   - Current user dependency with database integration
   - Permission and role checking
   - Organization-based access control
   - Rate limiting middleware

5. **Security Utilities** (`app/utils/security.py`)
   - Advanced password validation
   - Email verification
   - Two-factor authentication
   - Security audit logging
   - Cryptographic utilities

## Key Features

### 🔐 Authentication Features
- ✅ User registration with email validation
- ✅ Secure password hashing (bcrypt)
- ✅ JWT access and refresh tokens
- ✅ Token refresh mechanism
- ✅ Multi-factor authentication (TOTP)
- ✅ Session management
- ✅ Account lockout protection
- ✅ Password reset functionality

### 🛡️ Authorization Features
- ✅ Role-Based Access Control (RBAC)
- ✅ Hierarchical roles with inheritance
- ✅ Granular permissions system
- ✅ Organization-based multi-tenancy
- ✅ Permission overrides
- ✅ Cross-organization access control

### 🚫 Security Features
- ✅ Advanced password strength validation
- ✅ Rate limiting for auth endpoints
- ✅ IP-based security analysis
- ✅ Device fingerprinting
- ✅ Suspicious activity detection
- ✅ Comprehensive audit logging
- ✅ Encrypted sensitive data storage
- ✅ CSRF protection ready

### 📊 Monitoring & Audit
- ✅ Login attempt tracking
- ✅ Security event logging
- ✅ Risk score calculation
- ✅ User activity monitoring
- ✅ Failed login analysis
- ✅ Geographic anomaly detection

## API Endpoints

### Authentication Endpoints

#### User Registration
```
POST /api/v1/auth/register
```
Register a new user account with comprehensive validation.

#### User Login
```
POST /api/v1/auth/login
```
Authenticate user with email/password. Returns JWT tokens.

#### Multi-Factor Authentication
```
POST /api/v1/auth/login/mfa
```
Complete MFA authentication for protected accounts.

#### Token Management
```
POST /api/v1/auth/token/refresh    # Refresh access token
POST /api/v1/auth/token/validate   # Validate token
POST /api/v1/auth/logout           # Logout and revoke tokens
```

#### Password Management
```
POST /api/v1/auth/password/change       # Change password
POST /api/v1/auth/password/reset        # Request password reset
POST /api/v1/auth/password/reset/confirm # Confirm password reset
POST /api/v1/auth/password/strength     # Check password strength
```

#### Profile Management
```
GET  /api/v1/auth/profile         # Get user profile
PUT  /api/v1/auth/profile         # Update user profile
GET  /api/v1/auth/profile/summary # Get profile summary
```

#### Session Management
```
GET  /api/v1/auth/sessions        # List user sessions
POST /api/v1/auth/sessions/revoke # Revoke sessions
```

#### Multi-Factor Authentication
```
POST /api/v1/auth/mfa/setup         # Setup MFA
POST /api/v1/auth/mfa/verify        # Verify MFA setup
POST /api/v1/auth/mfa/disable       # Disable MFA
POST /api/v1/auth/mfa/backup-codes  # Generate backup codes
```

#### Security & Audit
```
GET /api/v1/auth/security/login-attempts # Get login attempts
GET /api/v1/auth/security/audit-log      # Get audit log
GET /api/v1/auth/health                  # Auth service health
```

## Usage Examples

### Basic Authentication

#### Register a new user
```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post("http://localhost:8000/api/v1/auth/register", json={
        "email": "user@example.com",
        "password": "SecureP@ssw0rd123",
        "password_confirm": "SecureP@ssw0rd123",
        "name": "John Doe",
        "first_name": "John",
        "last_name": "Doe",
        "terms_accepted": True,
        "privacy_policy_accepted": True
    })
    print(response.json())
```

#### Login
```python
response = await client.post("http://localhost:8000/api/v1/auth/login", json={
    "email": "user@example.com",
    "password": "SecureP@ssw0rd123"
})
tokens = response.json()["tokens"]
access_token = tokens["access_token"]
```

#### Protected endpoint access
```python
headers = {"Authorization": f"Bearer {access_token}"}
response = await client.get("http://localhost:8000/api/v1/auth/profile", headers=headers)
```

### Using Dependencies

#### Basic authentication dependency
```python
from fastapi import Depends
from app.core.auth import get_current_user, EnhancedTokenData

@app.get("/protected")
async def protected_endpoint(
    current_user: EnhancedTokenData = Depends(get_current_user)
):
    return {"user_id": current_user.user.id}
```

#### Permission-based access
```python
from app.core.auth import require_permissions

@app.get("/admin")
async def admin_endpoint(
    current_user: EnhancedTokenData = Depends(require_permissions("admin:read"))
):
    return {"message": "Admin access granted"}
```

#### Role-based access
```python
from app.core.auth import require_roles

@app.get("/manager")
async def manager_endpoint(
    current_user: EnhancedTokenData = Depends(require_roles(["manager", "admin"]))
):
    return {"message": "Manager access granted"}
```

#### Rate limiting
```python
from app.core.auth import apply_rate_limit

@app.post("/auth/login")
async def login(
    _: None = Depends(apply_rate_limit(calls_per_minute=5))
):
    # Login logic with 5 attempts per minute limit
    pass
```

## Security Configuration

### Environment Variables

```bash
# JWT Settings
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SYMBOLS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=120
DISABLE_RATE_LIMITING=false

# Redis (for rate limiting and sessions)
REDIS_URL=redis://localhost:6379/0
DISABLE_REDIS=false

# Email (for verification and password reset)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_USE_TLS=true

# Security
SECRET_KEY=your-application-secret-key
SESSION_SECRET_KEY=your-session-secret-key
```

### Database Migration

The authentication system requires the following database tables:

1. `organizations` - Multi-tenant organization support
2. `users` - User accounts with security features
3. `roles` - Hierarchical role system
4. `permissions` - Granular permission system
5. `user_roles` - Many-to-many user-role assignments
6. `role_permissions` - Many-to-many role-permission assignments
7. `user_permissions` - Direct user permission overrides
8. `user_sessions` - Session tracking
9. `login_attempts` - Login attempt monitoring
10. `audit_logs` - Comprehensive audit trail

Run Alembic migrations to create the tables:
```bash
cd python-backend
alembic upgrade head
```

## Security Best Practices

### Implemented Security Measures

1. **Password Security**
   - Bcrypt hashing with salt
   - Configurable strength requirements
   - Common password detection
   - Pattern and sequence detection

2. **Token Security**
   - Short-lived access tokens (30 min default)
   - Longer-lived refresh tokens (7 days default)
   - Token family tracking
   - Automatic token rotation

3. **Session Security**
   - Session tracking and management
   - Device fingerprinting
   - IP-based anomaly detection
   - Session revocation

4. **Rate Limiting**
   - Per-user and per-IP limits
   - Configurable thresholds
   - Redis-backed storage
   - Burst capacity handling

5. **Audit & Monitoring**
   - Comprehensive event logging
   - Risk score calculation
   - Suspicious activity detection
   - Security metrics

### Additional Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **CORS Configuration**: Properly configure CORS origins
3. **Database Security**: Use connection pooling and prepared statements
4. **Environment Variables**: Never commit secrets to version control
5. **Regular Updates**: Keep dependencies updated for security patches

## Performance Considerations

### Database Optimization
- Indexed columns for fast user lookups
- Connection pooling for scalability
- Async database operations
- Optimized queries with SQLAlchemy

### Caching Strategy
- Redis for rate limiting data
- Token blacklist caching
- Session data caching
- User permission caching

### Scalability
- Stateless JWT tokens
- Horizontal scaling support
- Database connection pooling
- Async request handling

## Monitoring and Troubleshooting

### Health Checks
```
GET /api/v1/auth/health
```
Returns authentication service health status.

### Common Issues

1. **Token Expired**: Refresh token or re-authenticate
2. **Rate Limited**: Wait or increase rate limits
3. **Account Locked**: Check failed login attempts
4. **Permission Denied**: Verify user roles and permissions
5. **Database Connection**: Check database health

### Logs and Metrics

The system logs security events with structured logging:
- Authentication attempts
- Permission checks
- Rate limiting events
- Error conditions
- Security violations

Monitor these logs for security and performance insights.

## Migration from Existing Systems

### From Basic JWT
1. Update user models to include new fields
2. Migrate existing roles to new RBAC system
3. Update API endpoints to use new dependencies
4. Configure new security features

### From Session-Based Auth
1. Implement JWT token generation
2. Update frontend to use tokens
3. Migrate session data to new system
4. Configure token refresh logic

## Contributing

When extending the authentication system:

1. **Security First**: Always consider security implications
2. **Test Coverage**: Add comprehensive tests for new features
3. **Documentation**: Update documentation for new endpoints
4. **Backwards Compatibility**: Maintain API compatibility
5. **Performance**: Consider performance impact of changes

## License and Support

This authentication system is part of the Plataforma NXT project. For support and questions, refer to the main project documentation.