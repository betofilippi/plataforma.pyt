# Plataforma NXT - FastAPI Backend

This is the FastAPI-based backend for the Plataforma NXT system, designed as a production-ready foundation that matches the complexity and capabilities of the existing TypeScript server.

## 🏗️ Architecture Overview

The FastAPI backend is built with modern Python patterns and includes:

- **Comprehensive middleware stack** with security, rate limiting, CORS, and logging
- **Async SQLAlchemy** with connection pooling and database management
- **JWT authentication** with role-based access control (RBAC)
- **Redis integration** for caching and sessions
- **Structured logging** with configurable formats
- **Global exception handling** with standardized error responses
- **Health checks and monitoring** endpoints
- **Environment-based configuration** using Pydantic Settings

## 📁 Project Structure

```
python-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application with middleware
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Pydantic settings and configuration
│   │   ├── database.py        # SQLAlchemy async setup
│   │   ├── security.py        # JWT, password hashing, auth dependencies  
│   │   └── exceptions.py      # Custom exceptions and error handling
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       └── __init__.py
│   ├── models/
│   │   └── __init__.py
│   ├── schemas/
│   │   └── __init__.py
│   ├── services/
│   │   └── __init__.py
│   ├── tasks/
│   │   └── __init__.py
│   └── utils/
│       └── __init__.py
├── .env.example               # Environment configuration template
├── requirements.txt           # Python dependencies
├── pyproject.toml            # Modern Python project configuration
├── run_dev.py                # Development server launcher
├── test_setup.py             # Setup verification script
└── README_FASTAPI.md         # This documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11 or higher
- PostgreSQL database (optional for basic setup)
- Redis server (optional - can be disabled)

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your specific settings:

```env
# Basic settings
APP_NAME="Plataforma NXT API"
DEBUG=true
ENVIRONMENT=development

# Database (optional for basic testing)
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/plataforma_nxt"

# Redis (optional - can be disabled)
REDIS_URL="redis://localhost:6379/0"
DISABLE_REDIS=false

# Security (change these in production!)
SECRET_KEY="your-secret-key-here"
JWT_SECRET_KEY="your-jwt-secret-key-here"

# CORS for frontend integration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3031"]
```

### 3. Verify Setup

Run the setup verification script:

```bash
python test_setup.py
```

This will check all dependencies, imports, and basic functionality.

### 4. Start Development Server

```bash
python run_dev.py
```

The server will start at `http://localhost:8000` by default.

## 🔧 Configuration

The application uses environment-based configuration via Pydantic Settings. All settings are defined in `app/core/config.py` and can be overridden via environment variables or `.env` file.

### Key Configuration Areas

#### Application Settings
- `APP_NAME`: Application name
- `APP_VERSION`: Version string  
- `DEBUG`: Enable/disable debug mode
- `ENVIRONMENT`: deployment environment (development, staging, production)

#### Database Settings
- `DATABASE_URL`: PostgreSQL connection string with asyncpg driver
- `DATABASE_POOL_SIZE`: Connection pool size (default: 10)
- `DATABASE_MAX_OVERFLOW`: Max overflow connections (default: 20)
- `DATABASE_POOL_TIMEOUT`: Pool timeout in seconds (default: 30)
- `DATABASE_POOL_RECYCLE`: Connection recycle time in seconds (default: 3600)

#### Redis Settings  
- `REDIS_URL`: Redis connection string
- `DISABLE_REDIS`: Set to `true` to disable Redis features
- `REDIS_MAX_CONNECTIONS`: Maximum Redis connections (default: 20)

#### Security Settings
- `SECRET_KEY`: Main application secret key
- `JWT_SECRET_KEY`: JWT signing key
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`: Access token lifetime (default: 30)
- `JWT_REFRESH_TOKEN_EXPIRE_DAYS`: Refresh token lifetime (default: 7)

#### Password Requirements
- `PASSWORD_MIN_LENGTH`: Minimum password length (default: 8)
- `PASSWORD_REQUIRE_UPPERCASE`: Require uppercase letters (default: true)
- `PASSWORD_REQUIRE_LOWERCASE`: Require lowercase letters (default: true)
- `PASSWORD_REQUIRE_NUMBERS`: Require numbers (default: true)
- `PASSWORD_REQUIRE_SYMBOLS`: Require special characters (default: true)

## 🔐 Security Features

### Password Security
- **bcrypt hashing** with configurable rounds
- **Password strength validation** with configurable requirements
- **Password update detection** for hash migrations

### JWT Authentication
- **Access and refresh token** support
- **Role-based permissions** in token payload
- **Token validation** with issuer verification
- **Automatic token expiry** handling

### Security Middleware
- **Security headers** (X-Content-Type-Options, X-Frame-Options, etc.)
- **CORS configuration** with credentials support
- **Rate limiting** with Redis backend
- **Request/response logging** for audit trails

### FastAPI Dependencies
```python
# Basic authentication
@app.get("/protected")
async def protected_route(current_user: TokenData = Depends(get_current_user)):
    return {"user_id": current_user.user_id}

# Role-based access
@app.get("/admin")
async def admin_route(current_user: TokenData = Depends(require_roles(["admin"]))):
    return {"message": "Admin access"}

# Permission-based access
@app.get("/reports")
async def reports_route(current_user: TokenData = Depends(require_permissions(["reports.read"]))):
    return {"reports": []}
```

## 🗄️ Database Integration

### SQLAlchemy Async Setup
- **Async engine** with connection pooling
- **Session management** with automatic cleanup
- **Transaction support** with rollback on errors
- **Health checks** and connection monitoring

### Database Usage Examples

```python
from app.core.database import get_db, get_db_transaction
from fastapi import Depends

# Basic database session
@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User))
    return result.scalars().all()

# Transaction with automatic rollback
@app.post("/users")
async def create_user(user_data: dict, db: AsyncSession = Depends(get_db_transaction)):
    user = User(**user_data)
    db.add(user)
    # Automatic commit/rollback on success/error
    return user
```

### Database Manager Features
- **Connection pooling** with configurable parameters
- **Health checks** for monitoring
- **Raw SQL execution** for complex queries
- **Migration support** via Alembic (configured but not included)

## 🚨 Error Handling

### Custom Exception Classes
- `APIException`: Base exception with status codes
- `ValidationException`: Input validation errors
- `AuthenticationException`: Authentication failures
- `AuthorizationException`: Permission denied errors
- `NotFoundError`: Resource not found
- `ConflictError`: Resource conflicts
- `DatabaseException`: Database-related errors
- `RateLimitException`: Rate limit exceeded

### Error Response Format
All errors return a standardized JSON response:

```json
{
  "success": false,
  "message": "Resource not found",
  "code": "NOT_FOUND",
  "details": {
    "resource": "user",
    "resource_id": "123"
  },
  "timestamp": 1640995200.0,
  "request_id": "req-abc123"
}
```

## 📊 Health Checks and Monitoring

### Health Endpoints

#### Basic Health Check
```
GET /health
```
Returns basic application status and version.

#### Detailed Health Check  
```
GET /health/detailed
```
Returns comprehensive status including:
- Application status
- Database connection status
- Redis connection status
- Service availability

#### Metrics Endpoint
```
GET /metrics
```
Returns basic application metrics for monitoring.

## 🔧 Development Tools

### Setup Verification
```bash
python test_setup.py
```
Runs comprehensive tests to verify:
- All dependencies are installed
- Modules can be imported correctly
- Configuration is valid
- Security utilities work
- Database configuration is correct
- FastAPI app can be created
- Exception handling is working

### Development Server
```bash
python run_dev.py
```
Starts the development server with:
- Auto-reload enabled
- Debug logging
- CORS configured for frontend development
- Environment validation

## 🏭 Production Considerations

### Environment Variables
Set these for production:
```env
ENVIRONMENT=production
DEBUG=false
SECRET_KEY="secure-secret-key-32-chars-min"
JWT_SECRET_KEY="secure-jwt-secret-key"
DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db"
```

### Security Checklist
- [ ] Change all default secret keys
- [ ] Configure CORS origins for production domains
- [ ] Set up HTTPS with proper certificates
- [ ] Configure rate limiting based on traffic
- [ ] Enable Redis for production caching
- [ ] Set up proper logging aggregation
- [ ] Configure health check monitoring

### Deployment Options
- **Docker**: Dockerfile included for containerization
- **Gunicorn**: Production WSGI server (add to requirements)
- **Nginx**: Reverse proxy configuration
- **Systemd**: Service configuration for Linux servers

## 🔗 Integration with TypeScript Frontend

The FastAPI backend is designed to integrate seamlessly with the existing TypeScript frontend:

### CORS Configuration
```python
# Configured for frontend ports
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3031"]
```

### API Compatibility
- RESTful API design matching frontend expectations
- JSON responses with consistent structure
- Error handling compatible with frontend error handling
- Authentication flow supporting JWT tokens

### WebSocket Support
Ready for WebSocket integration for real-time features:
- Redis pub/sub for message broadcasting
- Connection management for real-time updates
- Event-driven architecture support

## 📚 Next Steps

This foundation provides:

1. **Core Infrastructure**: Database, authentication, error handling
2. **Security Framework**: JWT, RBAC, rate limiting, security headers  
3. **Development Tools**: Configuration management, health checks, testing
4. **Production Readiness**: Logging, monitoring, Docker support

### Recommended Development Path

1. **Add API Endpoints**: Create routes in `app/api/v1/`
2. **Define Models**: Add SQLAlchemy models in `app/models/`
3. **Create Schemas**: Add Pydantic schemas in `app/schemas/`
4. **Implement Services**: Add business logic in `app/services/`
5. **Add Background Tasks**: Use `app/tasks/` for async processing
6. **Testing**: Add tests using pytest and the included test utilities

### Features Ready to Implement

- User management and authentication
- Role-based access control
- API versioning
- Background task processing
- WebSocket real-time communication  
- File upload and storage
- Email notifications
- API documentation with OpenAPI

The FastAPI backend provides a solid, production-ready foundation that matches the complexity and capabilities of the existing TypeScript system while offering the benefits of Python's rich ecosystem and FastAPI's modern async capabilities.