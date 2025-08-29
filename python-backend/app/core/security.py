"""
Security utilities for authentication and authorization.

This module provides:
- Password hashing and verification
- JWT token creation and validation
- Security dependencies for FastAPI
- Permission checking utilities
"""

import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme for FastAPI
security = HTTPBearer()


class TokenData(BaseModel):
    """Token payload data model."""
    user_id: int
    username: str
    email: Optional[str] = None
    roles: list[str] = []
    permissions: list[str] = []
    token_type: str = "access"
    exp: Optional[datetime] = None
    iat: Optional[datetime] = None
    jti: Optional[str] = None  # JWT ID for token revocation


class AccessToken(BaseModel):
    """Access token response model."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    user_id: int
    username: str


class PasswordStrengthResult(BaseModel):
    """Password strength validation result."""
    is_valid: bool
    errors: list[str] = []
    strength_score: int = 0  # 0-100


class SecurityError(Exception):
    """Base class for security-related errors."""
    pass


class InvalidTokenError(SecurityError):
    """Raised when a token is invalid or expired."""
    pass


class WeakPasswordError(SecurityError):
    """Raised when a password is too weak."""
    pass


class PasswordHasher:
    """Utility class for password hashing and verification."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error("Failed to hash password", error=str(e))
            raise SecurityError("Failed to hash password")
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.warning("Password verification failed", error=str(e))
            return False
    
    @staticmethod
    def needs_update(hashed_password: str) -> bool:
        """Check if password hash needs to be updated."""
        try:
            return pwd_context.needs_update(hashed_password)
        except Exception:
            return False


class PasswordValidator:
    """Utility class for password strength validation."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
    
    def validate_password_strength(self, password: str) -> PasswordStrengthResult:
        """Validate password strength based on configured rules."""
        errors = []
        score = 0
        
        # Check minimum length
        if len(password) < self.settings.password_min_length:
            errors.append(f"Password must be at least {self.settings.password_min_length} characters long")
        else:
            score += min(20, len(password) * 2)
        
        # Check for uppercase letters
        if self.settings.password_require_uppercase:
            if not re.search(r'[A-Z]', password):
                errors.append("Password must contain at least one uppercase letter")
            else:
                score += 15
        
        # Check for lowercase letters
        if self.settings.password_require_lowercase:
            if not re.search(r'[a-z]', password):
                errors.append("Password must contain at least one lowercase letter")
            else:
                score += 15
        
        # Check for numbers
        if self.settings.password_require_numbers:
            if not re.search(r'\d', password):
                errors.append("Password must contain at least one number")
            else:
                score += 15
        
        # Check for symbols
        if self.settings.password_require_symbols:
            if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>?]', password):
                errors.append("Password must contain at least one special character")
            else:
                score += 15
        
        # Additional scoring for complexity
        unique_chars = len(set(password))
        score += min(20, unique_chars)
        
        # Penalty for common patterns
        if re.search(r'(.)\1{2,}', password):  # Repeated characters
            score -= 10
        if re.search(r'(012|123|234|345|456|567|678|789|890|abc|def|ghi)', password.lower()):
            score -= 10
        
        # Common weak passwords
        weak_passwords = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if password.lower() in weak_passwords:
            errors.append("Password is too common")
            score = 0
        
        # Ensure score is within bounds
        score = max(0, min(100, score))
        
        return PasswordStrengthResult(
            is_valid=len(errors) == 0,
            errors=errors,
            strength_score=score
        )


class JWTManager:
    """JWT token manager for creating and validating tokens."""
    
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
    
    def create_access_token(
        self,
        user_id: int,
        username: str,
        email: Optional[str] = None,
        roles: Optional[list[str]] = None,
        permissions: Optional[list[str]] = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=self.settings.jwt_access_token_expire_minutes
            )
        
        # Create token payload
        payload = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "roles": roles or [],
            "permissions": permissions or [],
            "token_type": "access",
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.settings.app_name,  # Issuer
        }
        
        try:
            token = jwt.encode(
                payload,
                self.settings.jwt_secret_key,
                algorithm=self.settings.jwt_algorithm
            )
            
            logger.info(
                "Access token created",
                user_id=user_id,
                username=username,
                expires_at=expire
            )
            
            return token
            
        except Exception as e:
            logger.error("Failed to create access token", error=str(e))
            raise SecurityError("Failed to create access token")
    
    def create_refresh_token(
        self,
        user_id: int,
        username: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT refresh token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                days=self.settings.jwt_refresh_token_expire_days
            )
        
        payload = {
            "user_id": user_id,
            "username": username,
            "token_type": "refresh",
            "exp": expire,
            "iat": datetime.utcnow(),
            "iss": self.settings.app_name,
        }
        
        try:
            token = jwt.encode(
                payload,
                self.settings.jwt_secret_key,
                algorithm=self.settings.jwt_algorithm
            )
            
            logger.info(
                "Refresh token created",
                user_id=user_id,
                username=username,
                expires_at=expire
            )
            
            return token
            
        except Exception as e:
            logger.error("Failed to create refresh token", error=str(e))
            raise SecurityError("Failed to create refresh token")
    
    def verify_token(self, token: str, token_type: str = "access") -> TokenData:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.settings.jwt_secret_key,
                algorithms=[self.settings.jwt_algorithm]
            )
            
            # Verify token type
            if payload.get("token_type") != token_type:
                raise InvalidTokenError(f"Invalid token type. Expected {token_type}")
            
            # Verify issuer
            if payload.get("iss") != self.settings.app_name:
                raise InvalidTokenError("Invalid token issuer")
            
            # Create TokenData object
            token_data = TokenData(
                user_id=payload.get("user_id"),
                username=payload.get("username"),
                email=payload.get("email"),
                roles=payload.get("roles", []),
                permissions=payload.get("permissions", []),
                token_type=payload.get("token_type"),
                exp=datetime.fromtimestamp(payload.get("exp")) if payload.get("exp") else None,
                iat=datetime.fromtimestamp(payload.get("iat")) if payload.get("iat") else None,
                jti=payload.get("jti"),
            )
            
            return token_data
            
        except JWTError as e:
            logger.warning("JWT verification failed", error=str(e))
            raise InvalidTokenError("Invalid or expired token")
        except (ValueError, ValidationError) as e:
            logger.warning("Token data validation failed", error=str(e))
            raise InvalidTokenError("Invalid token data")
    
    def create_token_pair(
        self,
        user_id: int,
        username: str,
        email: Optional[str] = None,
        roles: Optional[list[str]] = None,
        permissions: Optional[list[str]] = None,
    ) -> AccessToken:
        """Create both access and refresh tokens."""
        access_token = self.create_access_token(
            user_id=user_id,
            username=username,
            email=email,
            roles=roles,
            permissions=permissions,
        )
        
        refresh_token = self.create_refresh_token(
            user_id=user_id,
            username=username,
        )
        
        return AccessToken(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=self.settings.jwt_access_token_expire_minutes * 60,
            user_id=user_id,
            username=username,
        )


# Global instances
password_hasher = PasswordHasher()
password_validator = PasswordValidator()
jwt_manager = JWTManager()


# FastAPI Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """
    FastAPI dependency to get the current authenticated user.
    
    Usage:
        @app.get("/protected")
        async def protected_endpoint(current_user: TokenData = Depends(get_current_user)):
            return {"user_id": current_user.user_id}
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        token_data = jwt_manager.verify_token(token, token_type="access")
        
        if token_data.user_id is None:
            raise credentials_exception
            
        return token_data
        
    except InvalidTokenError:
        raise credentials_exception
    except Exception as e:
        logger.error("Authentication error", error=str(e))
        raise credentials_exception


async def get_current_active_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """
    FastAPI dependency to get the current active user.
    Add additional checks here (e.g., user is not disabled).
    """
    # Add additional user validation logic here if needed
    # For example, check if user is disabled in database
    return current_user


def require_permissions(required_permissions: list[str]):
    """
    Create a FastAPI dependency that requires specific permissions.
    
    Usage:
        @app.get("/admin")
        async def admin_endpoint(
            current_user: TokenData = Depends(require_permissions(["admin.read"]))
        ):
            return {"message": "Admin access granted"}
    """
    async def check_permissions(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if not all(perm in current_user.permissions for perm in required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    
    return check_permissions


def require_roles(required_roles: list[str]):
    """
    Create a FastAPI dependency that requires specific roles.
    
    Usage:
        @app.get("/admin")
        async def admin_endpoint(
            current_user: TokenData = Depends(require_roles(["admin"]))
        ):
            return {"message": "Admin access granted"}
    """
    async def check_roles(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        if not any(role in current_user.roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role privileges"
            )
        return current_user
    
    return check_roles


# Utility functions
def generate_password_hash(password: str) -> str:
    """Generate a password hash."""
    return password_hasher.hash_password(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return password_hasher.verify_password(plain_password, hashed_password)


def validate_password(password: str) -> PasswordStrengthResult:
    """Validate password strength."""
    return password_validator.validate_password_strength(password)


def create_access_token(user_data: Dict[str, Any]) -> str:
    """Create an access token."""
    return jwt_manager.create_access_token(**user_data)


def create_token_pair(user_data: Dict[str, Any]) -> AccessToken:
    """Create access and refresh token pair."""
    return jwt_manager.create_token_pair(**user_data)


def verify_token(token: str, token_type: str = "access") -> TokenData:
    """Verify a JWT token."""
    return jwt_manager.verify_token(token, token_type)