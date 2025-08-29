"""
Enhanced authentication middleware and dependencies for FastAPI.

This module provides comprehensive authentication and authorization functionality:
- Current user dependency with database integration
- Permission checking dependencies
- Role-based access control (RBAC)
- Rate limiting for authentication endpoints
- Session validation
- Security audit logging
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Callable, Union
from uuid import UUID
import hashlib
import time
from functools import wraps

import redis.asyncio as redis
import structlog
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.database import get_database_manager
from app.core.security import jwt_manager, InvalidTokenError, TokenData
from app.models.users import User, Organization, Role, Permission, UserSession, AuditLog
from app.main import get_redis_client

logger = structlog.get_logger(__name__)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)
settings = get_settings()


class AuthenticationError(Exception):
    """Authentication-related error."""
    pass


class AuthorizationError(Exception):
    """Authorization-related error."""
    pass


class RateLimitError(Exception):
    """Rate limiting error."""
    pass


class EnhancedTokenData(TokenData):
    """Enhanced token data with additional user information."""
    
    def __init__(self, **data):
        super().__init__(**data)
        self.user: Optional[User] = None
        self.organization: Optional[Organization] = None
        self.active_roles: List[Role] = []
        self.effective_permissions: List[str] = []
        self.session_id: Optional[UUID] = None
        self.last_activity: Optional[datetime] = None


class AuthDependency:
    """Base class for authentication dependencies."""
    
    def __init__(self):
        self.db_manager = get_database_manager()
        self.redis_client = get_redis_client()


class CurrentUserDependency(AuthDependency):
    """
    Dependency to get the current authenticated user with full database information.
    """
    
    async def __call__(
        self,
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> EnhancedTokenData:
        """
        Get current user from JWT token with database validation.
        
        Args:
            request: FastAPI request object
            credentials: HTTP Bearer credentials
            
        Returns:
            Enhanced token data with user information
            
        Raises:
            HTTPException: If authentication fails
        """
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            # Verify JWT token
            token_data = jwt_manager.verify_token(credentials.credentials, token_type="access")
            
            # Convert user_id back to UUID
            user_uuid = UUID(hex=format(token_data.user_id, '032x'))
            
            async with self.db_manager.get_session() as session:
                # Get user with related data
                result = await session.execute(
                    select(User).where(User.id == user_uuid).options(
                        selectinload(User.organization),
                        selectinload(User.roles).selectinload(Role.permissions),
                        selectinload(User.user_permissions).selectinload(UserPermission.permission),
                        selectinload(User.sessions)
                    )
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                
                # Check if user account is active
                if user.is_account_locked:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Account locked: {user.lock_reason or 'Security violation'}",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                
                # Validate session if present
                session_id = await self._validate_session(session, user, credentials.credentials)
                
                # Update last activity
                if session_id:
                    await self._update_session_activity(session, session_id)
                
                # Create enhanced token data
                enhanced_token = EnhancedTokenData(
                    user_id=token_data.user_id,
                    username=token_data.username,
                    email=token_data.email,
                    roles=token_data.roles,
                    permissions=token_data.permissions,
                    token_type=token_data.token_type,
                    exp=token_data.exp,
                    iat=token_data.iat,
                    jti=token_data.jti
                )
                
                # Add database information
                enhanced_token.user = user
                enhanced_token.organization = user.organization
                enhanced_token.active_roles = user.get_active_roles()
                enhanced_token.effective_permissions = user.get_effective_permissions()
                enhanced_token.session_id = session_id
                enhanced_token.last_activity = datetime.utcnow()
                
                # Log access for audit
                await self._log_access(
                    session=session,
                    user=user,
                    request=request,
                    action="api.access"
                )
                
                await session.commit()
                
                return enhanced_token
                
        except InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Authentication error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication failed"
            )
    
    async def _validate_session(
        self,
        session: AsyncSession,
        user: User,
        access_token: str
    ) -> Optional[UUID]:
        """
        Validate user session associated with the token.
        
        Args:
            session: Database session
            user: User object
            access_token: Access token
            
        Returns:
            Session ID if valid, None otherwise
        """
        try:
            # For now, we don't have direct token-to-session mapping
            # In a production system, you'd store token families and validate
            active_sessions = [s for s in user.sessions if s.is_active and not s.is_expired]
            
            if active_sessions:
                # Return the most recent active session
                return active_sessions[0].id
            
            return None
            
        except Exception as e:
            logger.warning("Session validation error", error=str(e))
            return None
    
    async def _update_session_activity(
        self,
        session: AsyncSession,
        session_id: UUID
    ):
        """Update session last activity timestamp."""
        try:
            session_record = await session.get(UserSession, session_id)
            if session_record:
                session_record.last_activity = datetime.utcnow()
        except Exception as e:
            logger.warning("Session activity update error", error=str(e))
    
    async def _log_access(
        self,
        session: AsyncSession,
        user: User,
        request: Request,
        action: str
    ):
        """Log user access for audit trail."""
        try:
            audit_entry = AuditLog(
                user_id=user.id,
                organization_id=user.organization_id,
                action=action,
                resource_type="api",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                new_values={
                    "endpoint": str(request.url),
                    "method": request.method,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            session.add(audit_entry)
        except Exception as e:
            logger.warning("Access logging error", error=str(e))


class PermissionChecker(AuthDependency):
    """
    Dependency factory for checking user permissions.
    """
    
    def __init__(
        self, 
        required_permissions: Union[str, List[str]], 
        require_all: bool = True,
        allow_superuser: bool = True
    ):
        """
        Initialize permission checker.
        
        Args:
            required_permissions: Permission(s) required
            require_all: Whether all permissions are required (AND) or just one (OR)
            allow_superuser: Whether superuser can bypass permission check
        """
        super().__init__()
        self.required_permissions = (
            [required_permissions] if isinstance(required_permissions, str) 
            else required_permissions
        )
        self.require_all = require_all
        self.allow_superuser = allow_superuser
    
    async def __call__(
        self,
        current_user: EnhancedTokenData = Depends(CurrentUserDependency())
    ) -> EnhancedTokenData:
        """
        Check if user has required permissions.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            Enhanced token data if authorized
            
        Raises:
            HTTPException: If user lacks required permissions
        """
        try:
            # Check superuser bypass
            if self.allow_superuser and self._is_superuser(current_user):
                return current_user
            
            # Get user's effective permissions
            user_permissions = set(current_user.effective_permissions)
            required_permissions = set(self.required_permissions)
            
            # Check permissions
            if self.require_all:
                # All permissions required (AND logic)
                if not required_permissions.issubset(user_permissions):
                    missing_permissions = required_permissions - user_permissions
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing required permissions: {', '.join(missing_permissions)}"
                    )
            else:
                # Any permission sufficient (OR logic)
                if not required_permissions.intersection(user_permissions):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Missing any of required permissions: {', '.join(required_permissions)}"
                    )
            
            return current_user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Permission check error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Permission check failed"
            )
    
    def _is_superuser(self, user: EnhancedTokenData) -> bool:
        """Check if user is a superuser."""
        superuser_permissions = [
            "system:admin",
            "system:admin_panel",
            "system:super_admin"
        ]
        return any(perm in user.effective_permissions for perm in superuser_permissions)


class RoleChecker(AuthDependency):
    """
    Dependency factory for checking user roles.
    """
    
    def __init__(
        self, 
        required_roles: Union[str, List[str]], 
        require_all: bool = False,
        min_role_level: Optional[int] = None
    ):
        """
        Initialize role checker.
        
        Args:
            required_roles: Role(s) required
            require_all: Whether all roles are required (AND) or just one (OR)
            min_role_level: Minimum role level required (lower number = higher priority)
        """
        super().__init__()
        self.required_roles = (
            [required_roles] if isinstance(required_roles, str) 
            else required_roles
        )
        self.require_all = require_all
        self.min_role_level = min_role_level
    
    async def __call__(
        self,
        current_user: EnhancedTokenData = Depends(CurrentUserDependency())
    ) -> EnhancedTokenData:
        """
        Check if user has required roles.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            Enhanced token data if authorized
            
        Raises:
            HTTPException: If user lacks required roles
        """
        try:
            user_roles = set(current_user.roles)
            required_roles = set(self.required_roles)
            
            # Check role level if specified
            if self.min_role_level is not None:
                user_max_level = current_user.user.get_max_role_level()
                if user_max_level > self.min_role_level:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Insufficient role level. Required: {self.min_role_level}, User: {user_max_level}"
                    )
            
            # Check specific roles
            if required_roles:
                if self.require_all:
                    # All roles required (AND logic)
                    if not required_roles.issubset(user_roles):
                        missing_roles = required_roles - user_roles
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Missing required roles: {', '.join(missing_roles)}"
                        )
                else:
                    # Any role sufficient (OR logic)
                    if not required_roles.intersection(user_roles):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Missing any of required roles: {', '.join(required_roles)}"
                        )
            
            return current_user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Role check error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Role check failed"
            )


class OrganizationChecker(AuthDependency):
    """
    Dependency to ensure user belongs to a specific organization or has organization access.
    """
    
    def __init__(
        self, 
        organization_id: Optional[UUID] = None,
        allow_cross_org_access: bool = False
    ):
        """
        Initialize organization checker.
        
        Args:
            organization_id: Required organization ID (None = any org)
            allow_cross_org_access: Allow cross-organization access for privileged users
        """
        super().__init__()
        self.organization_id = organization_id
        self.allow_cross_org_access = allow_cross_org_access
    
    async def __call__(
        self,
        current_user: EnhancedTokenData = Depends(CurrentUserDependency())
    ) -> EnhancedTokenData:
        """
        Check if user has access to the organization.
        
        Args:
            current_user: Current authenticated user
            
        Returns:
            Enhanced token data if authorized
            
        Raises:
            HTTPException: If user lacks organization access
        """
        try:
            # If no specific organization required, allow any
            if not self.organization_id:
                return current_user
            
            user_org_id = current_user.user.organization_id
            
            # Check direct organization membership
            if user_org_id == self.organization_id:
                return current_user
            
            # Check cross-organization access
            if self.allow_cross_org_access:
                cross_org_permissions = [
                    "system:cross_org_access",
                    "system:admin",
                    "organization:manage_all"
                ]
                if any(perm in current_user.effective_permissions for perm in cross_org_permissions):
                    return current_user
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient organization privileges"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Organization check error", error=str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Organization check failed"
            )


class RateLimiter(AuthDependency):
    """
    Rate limiting dependency for API endpoints.
    """
    
    def __init__(
        self,
        calls_per_minute: int = 60,
        calls_per_hour: int = 1000,
        burst_size: int = 10,
        key_prefix: str = "rate_limit"
    ):
        """
        Initialize rate limiter.
        
        Args:
            calls_per_minute: Maximum calls per minute
            calls_per_hour: Maximum calls per hour
            burst_size: Burst allowance
            key_prefix: Redis key prefix
        """
        super().__init__()
        self.calls_per_minute = calls_per_minute
        self.calls_per_hour = calls_per_hour
        self.burst_size = burst_size
        self.key_prefix = key_prefix
    
    async def __call__(
        self,
        request: Request,
        current_user: Optional[EnhancedTokenData] = Depends(CurrentUserDependency())
    ) -> None:
        """
        Apply rate limiting.
        
        Args:
            request: FastAPI request object
            current_user: Current authenticated user (optional)
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        if not self.redis_client:
            # Skip rate limiting if Redis not available
            return
        
        try:
            # Determine rate limit key
            if current_user:
                limit_key = f"{self.key_prefix}:user:{current_user.user.id}"
            else:
                client_ip = request.client.host if request.client else "unknown"
                limit_key = f"{self.key_prefix}:ip:{client_ip}"
            
            # Check minute-based rate limit
            await self._check_rate_limit(
                key=f"{limit_key}:minute",
                limit=self.calls_per_minute,
                window=60,
                identifier="minute"
            )
            
            # Check hour-based rate limit
            await self._check_rate_limit(
                key=f"{limit_key}:hour",
                limit=self.calls_per_hour,
                window=3600,
                identifier="hour"
            )
            
        except RateLimitError:
            raise
        except Exception as e:
            logger.warning("Rate limiting error", error=str(e))
            # Continue without rate limiting on error
    
    async def _check_rate_limit(
        self, 
        key: str, 
        limit: int, 
        window: int, 
        identifier: str
    ):
        """
        Check rate limit for a specific window.
        
        Args:
            key: Redis key
            limit: Rate limit
            window: Time window in seconds
            identifier: Human-readable identifier
            
        Raises:
            RateLimitError: If rate limit exceeded
        """
        try:
            current_time = int(time.time())
            current_calls = await self.redis_client.get(key)
            
            if current_calls is None:
                # First request in window
                await self.redis_client.setex(key, window, 1)
            else:
                current_calls = int(current_calls)
                if current_calls >= limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Rate limit exceeded: {limit} calls per {identifier}",
                        headers={
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(current_time + window)
                        }
                    )
                
                # Increment counter
                await self.redis_client.incr(key)
                
                # Add remaining calls header
                remaining_calls = max(0, limit - current_calls - 1)
                # Note: In a real implementation, you'd add this header to the response
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Rate limit check error", error=str(e), key=key)


# ================================
# DEPENDENCY FACTORIES
# ================================

def get_current_user() -> CurrentUserDependency:
    """Get current user dependency."""
    return CurrentUserDependency()


def get_current_active_user() -> CurrentUserDependency:
    """Get current active user dependency (alias for compatibility)."""
    return CurrentUserDependency()


def require_permissions(
    permissions: Union[str, List[str]], 
    require_all: bool = True,
    allow_superuser: bool = True
) -> PermissionChecker:
    """
    Create permission requirement dependency.
    
    Args:
        permissions: Required permission(s)
        require_all: Whether all permissions are required
        allow_superuser: Whether superuser bypasses check
        
    Returns:
        Permission checker dependency
        
    Example:
        @app.get("/admin")
        async def admin_endpoint(
            current_user: EnhancedTokenData = Depends(require_permissions("admin:read"))
        ):
            return {"message": "Admin access granted"}
    """
    return PermissionChecker(
        required_permissions=permissions,
        require_all=require_all,
        allow_superuser=allow_superuser
    )


def require_roles(
    roles: Union[str, List[str]], 
    require_all: bool = False,
    min_role_level: Optional[int] = None
) -> RoleChecker:
    """
    Create role requirement dependency.
    
    Args:
        roles: Required role(s)
        require_all: Whether all roles are required
        min_role_level: Minimum role level required
        
    Returns:
        Role checker dependency
        
    Example:
        @app.get("/manager")
        async def manager_endpoint(
            current_user: EnhancedTokenData = Depends(require_roles("manager"))
        ):
            return {"message": "Manager access granted"}
    """
    return RoleChecker(
        required_roles=roles,
        require_all=require_all,
        min_role_level=min_role_level
    )


def require_organization(
    organization_id: Optional[UUID] = None,
    allow_cross_org_access: bool = False
) -> OrganizationChecker:
    """
    Create organization requirement dependency.
    
    Args:
        organization_id: Required organization ID
        allow_cross_org_access: Allow cross-org access for privileged users
        
    Returns:
        Organization checker dependency
    """
    return OrganizationChecker(
        organization_id=organization_id,
        allow_cross_org_access=allow_cross_org_access
    )


def apply_rate_limit(
    calls_per_minute: int = 60,
    calls_per_hour: int = 1000,
    burst_size: int = 10,
    key_prefix: str = "rate_limit"
) -> RateLimiter:
    """
    Create rate limiting dependency.
    
    Args:
        calls_per_minute: Maximum calls per minute
        calls_per_hour: Maximum calls per hour
        burst_size: Burst allowance
        key_prefix: Redis key prefix
        
    Returns:
        Rate limiter dependency
        
    Example:
        @app.post("/auth/login")
        async def login(
            _: None = Depends(apply_rate_limit(calls_per_minute=5))
        ):
            # Login logic with 5 attempts per minute limit
    """
    return RateLimiter(
        calls_per_minute=calls_per_minute,
        calls_per_hour=calls_per_hour,
        burst_size=burst_size,
        key_prefix=key_prefix
    )


# ================================
# UTILITY FUNCTIONS
# ================================

async def get_user_by_id(user_id: UUID) -> Optional[User]:
    """
    Get user by ID with full related data.
    
    Args:
        user_id: User ID
        
    Returns:
        User object or None if not found
    """
    try:
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            result = await session.execute(
                select(User).where(User.id == user_id).options(
                    selectinload(User.organization),
                    selectinload(User.roles).selectinload(Role.permissions),
                    selectinload(User.user_permissions).selectinload(UserPermission.permission)
                )
            )
            return result.scalar_one_or_none()
    except Exception as e:
        logger.error("Get user by ID error", error=str(e), user_id=str(user_id))
        return None


async def check_user_permission(user_id: UUID, permission: str) -> bool:
    """
    Check if user has a specific permission.
    
    Args:
        user_id: User ID
        permission: Permission to check
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        user = await get_user_by_id(user_id)
        if not user:
            return False
        
        return user.has_permission(permission)
    except Exception as e:
        logger.error("Check user permission error", error=str(e))
        return False


async def log_security_event(
    user_id: Optional[UUID],
    action: str,
    resource_type: str,
    resource_id: Optional[UUID] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Log security event for audit trail.
    
    Args:
        user_id: User ID performing the action
        action: Action performed
        resource_type: Type of resource affected
        resource_id: ID of resource affected
        details: Additional details
        ip_address: IP address
        user_agent: User agent string
    """
    try:
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            audit_entry = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                new_values=details or {}
            )
            session.add(audit_entry)
            await session.commit()
    except Exception as e:
        logger.error("Security event logging error", error=str(e))