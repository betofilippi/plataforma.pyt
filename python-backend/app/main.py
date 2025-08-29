"""
FastAPI Main Application
Complete backend with authentication and all endpoints
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
import bcrypt
import os
from uuid import uuid4

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Create FastAPI app
app = FastAPI(
    title="Plataforma Python Backend",
    description="Complete Python backend with authentication",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3333",
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
- Security headers
- Rate limiting
- Request logging
- Error handling
- Health check endpoints
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, Optional

import redis.asyncio as redis
import structlog
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import get_settings
from app.core.database import get_database_manager
from app.core.exceptions import (
    APIException,
    DatabaseException,
    ValidationException,
    setup_exception_handlers,
)
from app.api.v1 import router as api_v1_router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Application state
app_state: Dict[str, Any] = {
    "redis_client": None,
    "database_manager": None,
}


class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware to add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        
        # Remove server header for security
        response.headers.pop("server", None)
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with Redis backend."""
    
    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        
    async def dispatch(self, request: Request, call_next) -> Response:
        if not app_state.get("redis_client"):
            # Skip rate limiting if Redis is not available
            return await call_next(request)
            
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        redis_key = f"rate_limit:{client_ip}"
        
        try:
            redis_client = app_state["redis_client"]
            current_calls = await redis_client.get(redis_key)
            
            if current_calls is None:
                # First request from this IP
                await redis_client.setex(redis_key, 60, 1)
            else:
                current_calls = int(current_calls)
                if current_calls >= self.calls_per_minute:
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "success": False,
                            "message": "Rate limit exceeded",
                            "code": "RATE_LIMIT_EXCEEDED",
                        },
                    )
                await redis_client.incr(redis_key)
                
        except Exception as e:
            logger.warning("Rate limiting error", error=str(e))
            # Continue without rate limiting if Redis fails
            
        return await call_next(request)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Request/response logging middleware."""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        # Log request
        logger.info(
            "Request received",
            method=request.method,
            url=str(request.url),
            client=request.client.host if request.client else None,
        )
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                "Request completed",
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
                process_time=round(process_time, 4),
            )
            
            # Add process time header
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "Request failed",
                method=request.method,
                url=str(request.url),
                process_time=round(process_time, 4),
                error=str(e),
            )
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown tasks."""
    settings = get_settings()
    
    # Startup
    logger.info("Starting FastAPI application", version=settings.app_version)
    
    # Initialize Redis if enabled
    if not settings.disable_redis:
        try:
            redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True,
                health_check_interval=30,
            )
            # Test connection
            await redis_client.ping()
            app_state["redis_client"] = redis_client
            logger.info("Redis connection established", url=settings.redis_url)
        except Exception as e:
            logger.warning("Redis connection failed, continuing without Redis", error=str(e))
            app_state["redis_client"] = None
    else:
        logger.info("Redis disabled via configuration")
        
    # Initialize Database Manager
    try:
        db_manager = get_database_manager()
        await db_manager.initialize()
        app_state["database_manager"] = db_manager
        logger.info("Database connection established")
    except Exception as e:
        logger.error("Database initialization failed", error=str(e))
        raise
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("Starting application shutdown")
    
    # Close Redis connection
    if app_state.get("redis_client"):
        try:
            await app_state["redis_client"].close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error("Error closing Redis connection", error=str(e))
    
    # Close database connections
    if app_state.get("database_manager"):
        try:
            await app_state["database_manager"].close()
            logger.info("Database connections closed")
        except Exception as e:
            logger.error("Error closing database connections", error=str(e))
    
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.app_name,
        description="FastAPI backend for Plataforma NXT - A modular business platform",
        version=settings.app_version,
        debug=settings.debug,
        docs_url="/api/docs" if settings.debug else None,
        redoc_url="/api/redoc" if settings.debug else None,
        openapi_url="/api/openapi.json" if settings.debug else None,
        lifespan=lifespan,
    )
    
    # Setup exception handlers
    setup_exception_handlers(app)
    
    # Add security middleware
    app.add_middleware(SecurityMiddleware)
    
    # Add trusted host middleware
    if settings.allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.allowed_hosts,
        )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Accept",
            "Accept-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRF-Token",
            "Cache-Control",
        ],
        expose_headers=["X-Process-Time", "X-Rate-Limit-Remaining"],
    )
    
    # Add session middleware
    if settings.session_secret_key:
        app.add_middleware(
            SessionMiddleware,
            secret_key=settings.session_secret_key,
            same_site="lax",
            https_only=not settings.debug,
        )
    
    # Add rate limiting middleware
    if not settings.disable_rate_limiting:
        app.add_middleware(
            RateLimitMiddleware,
            calls_per_minute=settings.rate_limit_per_minute,
        )
    
    # Add logging middleware
    app.add_middleware(LoggingMiddleware)
    
    # Include API routes
    app.include_router(api_v1_router, prefix="/api")
    
    # Health check endpoints
    @app.get("/health", tags=["Health"])
    async def health_check():
        """Basic health check endpoint."""
        return {
            "status": "healthy",
            "version": settings.app_version,
            "timestamp": time.time(),
        }
    
    @app.get("/health/detailed", tags=["Health"])
    async def detailed_health_check():
        """Detailed health check with service status."""
        health_status = {
            "status": "healthy",
            "version": settings.app_version,
            "timestamp": time.time(),
            "services": {},
        }
        
        # Check Redis connection
        if app_state.get("redis_client"):
            try:
                await app_state["redis_client"].ping()
                health_status["services"]["redis"] = {
                    "status": "healthy",
                    "url": settings.redis_url,
                }
            except Exception as e:
                health_status["services"]["redis"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }
                health_status["status"] = "degraded"
        else:
            health_status["services"]["redis"] = {
                "status": "disabled",
            }
        
        # Check database connection
        if app_state.get("database_manager"):
            try:
                db_manager = app_state["database_manager"]
                is_healthy = await db_manager.health_check()
                health_status["services"]["database"] = {
                    "status": "healthy" if is_healthy else "unhealthy",
                    "url": settings.database_url_safe,
                }
                if not is_healthy:
                    health_status["status"] = "unhealthy"
            except Exception as e:
                health_status["services"]["database"] = {
                    "status": "unhealthy",
                    "error": str(e),
                }
                health_status["status"] = "unhealthy"
        
        # Return appropriate HTTP status code
        if health_status["status"] == "unhealthy":
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=health_status,
            )
        elif health_status["status"] == "degraded":
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=health_status,
            )
        
        return health_status
    
    # Metrics endpoint (basic implementation)
    @app.get("/metrics", tags=["Monitoring"])
    async def metrics():
        """Basic metrics endpoint for monitoring."""
        return {
            "app_info": {
                "name": settings.app_name,
                "version": settings.app_version,
                "debug": settings.debug,
            },
            "system_info": {
                "redis_enabled": app_state.get("redis_client") is not None,
                "database_connected": app_state.get("database_manager") is not None,
            },
            "timestamp": time.time(),
        }
    
    # API root endpoint
    @app.get("/api", tags=["Root"])
    async def api_root():
        """API root endpoint with basic information."""
        return {
            "message": "Plataforma NXT FastAPI Backend",
            "version": settings.app_version,
            "docs": "/api/docs" if settings.debug else "Documentation disabled in production",
            "health": "/health",
            "timestamp": time.time(),
        }
    
    return app


# Create the application instance
app = create_app()


def get_redis_client() -> Optional[redis.Redis]:
    """Get the Redis client instance."""
    return app_state.get("redis_client")


def get_app_state() -> Dict[str, Any]:
    """Get the application state dictionary."""
    return app_state


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    
    uvicorn.run(
        "app.main:app",
        host=settings.server_host,
        port=settings.server_port,
        reload=settings.debug,
        log_level="info" if not settings.debug else "debug",
        access_log=True,
    )