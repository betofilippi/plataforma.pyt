"""
Authentication services for user management, JWT tokens, and security operations.

This module provides comprehensive authentication services including:
- User registration and login
- JWT token generation and validation
- Refresh token handling
- Password reset functionality
- Session management
- Multi-factor authentication
- Security audit logging
"""

import secrets
import uuid
import hashlib
import pyotp
import qrcode
from io import BytesIO
import base64
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple, Union
from uuid import UUID

import structlog
from fastapi import HTTPException, status
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.future import select

from app.core.config import get_settings
from app.core.database import get_database_manager
from app.core.security import (
    password_hasher, password_validator, jwt_manager,
    PasswordStrengthResult, TokenData, AccessToken,
    InvalidTokenError, WeakPasswordError, SecurityError
)
from app.services.cache_service import cache_service, cached
from app.services.notification_service import notification_service, EmailNotification
from app.models.users import (
    User, Organization, Role, Permission, UserSession, 
    LoginAttempt, AuditLog, UserPermission
)
from app.schemas.auth import (
    UserRegistrationRequest, UserRegistrationResponse,
    UserLoginRequest, UserLoginResponse, TokenResponse,
    MFALoginRequest, TokenRefreshResponse,
    PasswordChangeRequest, PasswordResetRequest, PasswordResetResponse,
    UserProfileDetail, UserProfileUpdateRequest,
    SessionSummary, SessionListResponse, SessionRevokeResponse,
    MFASetupResponse, MFAVerifyResponse,
    LoginAttemptSummary, SecurityLogEntry
)

logger = structlog.get_logger(__name__)


class AuthenticationError(Exception):
    """Authentication-related error."""
    pass


class RegistrationError(Exception):
    """User registration-related error."""
    pass


class SessionError(Exception):
    """Session management-related error."""
    pass


class MFAError(Exception):
    """Multi-factor authentication error."""
    pass


class AuthService:
    """
    Core authentication service handling user authentication, registration,
    and security operations.
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.db_manager = get_database_manager()
        
        # Cache settings
        self.user_cache_ttl = 300  # 5 minutes
        self.session_cache_ttl = 600  # 10 minutes
        
        # Rate limiting settings
        self.max_login_attempts = 5
        self.lockout_duration = 900  # 15 minutes
    
    async def register_user(
        self, 
        registration_data: UserRegistrationRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserRegistrationResponse:
        """
        Register a new user account.
        
        Args:
            registration_data: User registration data
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Registration response with user details
            
        Raises:
            RegistrationError: If registration fails
        """
        async with self.db_manager.get_session() as session:
            try:
                # Check if email already exists
                existing_user = await self._get_user_by_email(session, registration_data.email)
                if existing_user:
                    raise RegistrationError("Email address already registered")
                
                # Validate password strength
                password_result = password_validator.validate_password_strength(
                    registration_data.password
                )
                if not password_result.is_valid:
                    raise WeakPasswordError(f"Password validation failed: {', '.join(password_result.errors)}")
                
                # Get or create organization
                organization = await self._get_or_create_organization(
                    session, registration_data.organization_domain
                )
                
                # Hash password
                password_hash = password_hasher.hash_password(registration_data.password)
                
                # Create new user
                user = User(
                    email=registration_data.email,
                    password_hash=password_hash,
                    name=registration_data.name,
                    first_name=registration_data.first_name,
                    last_name=registration_data.last_name,
                    phone=registration_data.phone,
                    timezone=registration_data.timezone or "UTC",
                    language=registration_data.language or "pt-BR",
                    department=registration_data.department,
                    job_title=registration_data.job_title,
                    organization_id=organization.id,
                    is_active=True,
                    last_password_change_at=datetime.utcnow()
                )
                
                session.add(user)
                await session.flush()  # Get user ID
                
                # Assign default role
                await self._assign_default_role(session, user, organization)
                
                # Log registration
                await self._log_security_event(
                    session=session,
                    action="user.registered",
                    resource_type="user",
                    resource_id=user.id,
                    user_id=user.id,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={
                        "email": registration_data.email,
                        "organization_id": str(organization.id)
                    }
                )
                
                await session.commit()
                
                logger.info(
                    "User registered successfully",
                    user_id=str(user.id),
                    email=registration_data.email,
                    organization_id=str(organization.id)
                )
                
                # Send welcome email
                await self._send_welcome_email(user)
                
                return UserRegistrationResponse(
                    success=True,
                    message="User registered successfully",
                    user_id=user.id,
                    email_verification_required=False,  # TODO: Implement email verification
                    next_steps=[
                        "Complete your profile",
                        "Explore the platform features"
                    ]
                )
                
            except (WeakPasswordError, RegistrationError) as e:
                await session.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
            except Exception as e:
                await session.rollback()
                logger.error("User registration failed", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Registration failed"
                )
    
    async def authenticate_user(
        self, 
        login_data: UserLoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserLoginResponse:
        """
        Authenticate user login.
        
        Args:
            login_data: Login credentials and data
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Login response with tokens and user data
            
        Raises:
            AuthenticationError: If authentication fails
        """
        async with self.db_manager.get_session() as session:
            login_success = False
            user = None
            failure_reason = None
            
            try:
                # Get user by email
                user = await self._get_user_by_email(session, login_data.email)
                
                if not user:
                    failure_reason = "Invalid credentials"
                elif user.is_account_locked:
                    failure_reason = f"Account locked: {user.lock_reason or 'Security violation'}"
                elif not user.password_hash:
                    failure_reason = "Account requires SSO login"
                elif not password_hasher.verify_password(login_data.password, user.password_hash):
                    failure_reason = "Invalid credentials"
                    # Increment failed attempts
                    user.failed_login_attempts += 1
                    if user.failed_login_attempts >= self.max_login_attempts:  # Lock after 5 failed attempts
                        user.is_locked = True
                        user.lock_reason = "Too many failed login attempts"
                        
                        # Send security alert
                        await self._send_security_alert(
                            user, 
                            "Account Locked - Too Many Failed Login Attempts",
                            ip_address,
                            user_agent
                        )
                else:
                    login_success = True
                
                # Log login attempt
                await self._log_login_attempt(
                    session=session,
                    email=login_data.email,
                    user_id=user.id if user else None,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=login_success,
                    failure_reason=failure_reason
                )
                
                if not login_success:
                    if user:
                        await session.commit()  # Save failed attempt count
                    
                    raise AuthenticationError(failure_reason)
                
                # Check if MFA is required
                if user.is_mfa_required() and not login_data.mfa_token and not login_data.mfa_backup_code:
                    # Create temporary login session
                    temp_token = await self._create_temporary_login_session(
                        session, user, ip_address, user_agent
                    )
                    
                    await session.commit()
                    
                    return UserLoginResponse(
                        success=False,
                        message="Multi-factor authentication required",
                        mfa_required=True,
                        mfa_methods=["totp", "backup_code"],
                        session_id=temp_token
                    )
                
                # Verify MFA if provided
                if user.is_mfa_required():
                    if not await self._verify_mfa(user, login_data.mfa_token, login_data.mfa_backup_code):
                        failure_reason = "Invalid MFA token"
                        await self._log_login_attempt(
                            session=session,
                            email=login_data.email,
                            user_id=user.id,
                            ip_address=ip_address,
                            user_agent=user_agent,
                            success=False,
                            failure_reason=failure_reason
                        )
                        raise AuthenticationError(failure_reason)
                
                # Update user login info
                user.last_login_at = datetime.utcnow()
                user.last_login_ip = ip_address
                user.failed_login_attempts = 0
                
                # Get user permissions and roles
                user_permissions = await self._get_user_permissions(session, user)
                user_roles = [role.name for role in user.get_active_roles()]
                
                # Create authentication tokens
                token_response = jwt_manager.create_token_pair(
                    user_id=int(user.id.hex, 16),  # Convert UUID to int for JWT
                    username=user.email,
                    email=user.email,
                    roles=user_roles,
                    permissions=user_permissions
                )
                
                # Create session record
                session_id = await self._create_session(
                    session=session,
                    user=user,
                    refresh_token=token_response.refresh_token,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_info=login_data.device_info,
                    remember_me=login_data.remember_me
                )
                
                # Create user profile summary
                user_profile = await self._create_user_profile_summary(session, user)
                
                await session.commit()
                
                logger.info(
                    "User authenticated successfully",
                    user_id=str(user.id),
                    email=user.email,
                    session_id=str(session_id)
                )
                
                return UserLoginResponse(
                    success=True,
                    message="Login successful",
                    tokens=TokenResponse(
                        access_token=token_response.access_token,
                        refresh_token=token_response.refresh_token,
                        token_type=token_response.token_type,
                        expires_in=token_response.expires_in,
                        refresh_expires_in=self.settings.jwt_refresh_token_expire_days * 24 * 3600
                    ),
                    user=user_profile,
                    session_id=str(session_id)
                )
                
            except AuthenticationError:
                raise
            except Exception as e:
                logger.error("Authentication error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication failed"
                )
    
    async def authenticate_mfa(
        self,
        mfa_request: MFALoginRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserLoginResponse:
        """
        Complete MFA authentication.
        
        Args:
            mfa_request: MFA authentication request
            ip_address: Client IP address
            user_agent: Client user agent
            
        Returns:
            Login response with tokens
        """
        async with self.db_manager.get_session() as session:
            try:
                # Verify temporary login session
                user = await self._verify_temporary_login_session(
                    session, mfa_request.login_session_token
                )
                
                if not user:
                    raise AuthenticationError("Invalid or expired login session")
                
                # Verify MFA
                if not await self._verify_mfa(user, mfa_request.mfa_token, mfa_request.mfa_backup_code):
                    raise AuthenticationError("Invalid MFA token")
                
                # Complete login process (similar to regular login)
                user.last_login_at = datetime.utcnow()
                user.last_login_ip = ip_address
                
                # Get user data and create tokens
                user_permissions = await self._get_user_permissions(session, user)
                user_roles = [role.name for role in user.get_active_roles()]
                
                token_response = jwt_manager.create_token_pair(
                    user_id=int(user.id.hex, 16),
                    username=user.email,
                    email=user.email,
                    roles=user_roles,
                    permissions=user_permissions
                )
                
                # Create session
                session_id = await self._create_session(
                    session=session,
                    user=user,
                    refresh_token=token_response.refresh_token,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    device_info={},
                    remember_me=False
                )
                
                user_profile = await self._create_user_profile_summary(session, user)
                
                await session.commit()
                
                return UserLoginResponse(
                    success=True,
                    message="MFA authentication successful",
                    tokens=TokenResponse(
                        access_token=token_response.access_token,
                        refresh_token=token_response.refresh_token,
                        token_type=token_response.token_type,
                        expires_in=token_response.expires_in,
                        refresh_expires_in=self.settings.jwt_refresh_token_expire_days * 24 * 3600
                    ),
                    user=user_profile,
                    session_id=str(session_id)
                )
                
            except AuthenticationError:
                raise
            except Exception as e:
                logger.error("MFA authentication error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="MFA authentication failed"
                )
    
    async def refresh_token(
        self, 
        refresh_token: str,
        ip_address: Optional[str] = None
    ) -> TokenRefreshResponse:
        """
        Refresh authentication tokens.
        
        Args:
            refresh_token: Valid refresh token
            ip_address: Client IP address
            
        Returns:
            New token pair
        """
        async with self.db_manager.get_session() as session:
            try:
                # Verify refresh token
                token_data = jwt_manager.verify_token(refresh_token, token_type="refresh")
                
                # Get user
                user_uuid = UUID(hex=format(token_data.user_id, '032x'))
                user = await session.get(User, user_uuid)
                
                if not user or user.is_account_locked:
                    raise InvalidTokenError("User account not found or locked")
                
                # Verify session exists and is valid
                session_record = await self._get_session_by_refresh_token(session, refresh_token)
                if not session_record or not session_record.is_active or session_record.is_expired:
                    raise InvalidTokenError("Invalid or expired refresh token")
                
                # Update session activity
                session_record.last_activity = datetime.utcnow()
                
                # Get fresh user data
                user_permissions = await self._get_user_permissions(session, user)
                user_roles = [role.name for role in user.get_active_roles()]
                
                # Create new token pair
                token_response = jwt_manager.create_token_pair(
                    user_id=token_data.user_id,
                    username=user.email,
                    email=user.email,
                    roles=user_roles,
                    permissions=user_permissions
                )
                
                # Update session with new refresh token
                session_record.refresh_token_hash = hashlib.sha256(
                    token_response.refresh_token.encode()
                ).hexdigest()
                
                await session.commit()
                
                logger.info(
                    "Tokens refreshed successfully",
                    user_id=str(user.id),
                    session_id=str(session_record.id)
                )
                
                return TokenRefreshResponse(
                    success=True,
                    tokens=TokenResponse(
                        access_token=token_response.access_token,
                        refresh_token=token_response.refresh_token,
                        token_type=token_response.token_type,
                        expires_in=token_response.expires_in,
                        refresh_expires_in=self.settings.jwt_refresh_token_expire_days * 24 * 3600
                    )
                )
                
            except InvalidTokenError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=str(e)
                )
            except Exception as e:
                logger.error("Token refresh error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Token refresh failed"
                )
    
    async def logout_user(
        self,
        user_id: UUID,
        refresh_token: Optional[str] = None,
        logout_all_sessions: bool = False
    ) -> int:
        """
        Logout user by revoking sessions.
        
        Args:
            user_id: User ID
            refresh_token: Specific refresh token to revoke
            logout_all_sessions: Whether to revoke all user sessions
            
        Returns:
            Number of sessions revoked
        """
        async with self.db_manager.get_session() as session:
            try:
                revoked_count = 0
                
                if logout_all_sessions:
                    # Revoke all user sessions
                    user_sessions = await session.execute(
                        select(UserSession).where(
                            and_(
                                UserSession.user_id == user_id,
                                UserSession.is_active == True
                            )
                        )
                    )
                    sessions = user_sessions.scalars().all()
                    
                    for session_record in sessions:
                        session_record.revoke("User logout - all sessions")
                        revoked_count += 1
                        
                elif refresh_token:
                    # Revoke specific session
                    session_record = await self._get_session_by_refresh_token(session, refresh_token)
                    if session_record and session_record.user_id == user_id:
                        session_record.revoke("User logout")
                        revoked_count = 1
                
                await session.commit()
                
                logger.info(
                    "User logged out",
                    user_id=str(user_id),
                    sessions_revoked=revoked_count,
                    logout_all=logout_all_sessions
                )
                
                return revoked_count
                
            except Exception as e:
                logger.error("Logout error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Logout failed"
                )
    
    async def change_password(
        self,
        user_id: UUID,
        password_data: PasswordChangeRequest,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Change user password.
        
        Args:
            user_id: User ID
            password_data: Password change data
            ip_address: Client IP address
            
        Returns:
            Success status
        """
        async with self.db_manager.get_session() as session:
            try:
                user = await session.get(User, user_id)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                    )
                
                # Verify current password
                if not password_hasher.verify_password(
                    password_data.current_password, user.password_hash
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Current password is incorrect"
                    )
                
                # Validate new password
                password_result = password_validator.validate_password_strength(
                    password_data.new_password
                )
                if not password_result.is_valid:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Password validation failed: {', '.join(password_result.errors)}"
                    )
                
                # Update password
                user.password_hash = password_hasher.hash_password(password_data.new_password)
                user.last_password_change_at = datetime.utcnow()
                user.must_change_password = False
                
                # Revoke other sessions if requested
                if password_data.revoke_all_sessions:
                    user_sessions = await session.execute(
                        select(UserSession).where(
                            and_(
                                UserSession.user_id == user_id,
                                UserSession.is_active == True
                            )
                        )
                    )
                    sessions = user_sessions.scalars().all()
                    
                    for session_record in sessions:
                        session_record.revoke("Password changed")
                
                # Log security event
                await self._log_security_event(
                    session=session,
                    action="password.changed",
                    resource_type="user",
                    resource_id=user_id,
                    user_id=user_id,
                    ip_address=ip_address,
                    details={"revoked_sessions": password_data.revoke_all_sessions}
                )
                
                await session.commit()
                
                # Invalidate user cache
                await self._invalidate_user_cache(user_id, user.email)
                
                logger.info(
                    "Password changed successfully",
                    user_id=str(user_id)
                )
                
                return True
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error("Password change error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Password change failed"
                )
    
    async def request_password_reset(
        self,
        email: str,
        return_url: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> PasswordResetResponse:
        """
        Request password reset for user.
        
        Args:
            email: User email address
            return_url: URL to redirect after reset
            ip_address: Client IP address
            
        Returns:
            Password reset response
        """
        async with self.db_manager.get_session() as session:
            try:
                user = await self._get_user_by_email(session, email)
                
                # Always return success to prevent email enumeration
                if not user:
                    return PasswordResetResponse(
                        success=True,
                        message="If the email address exists, a reset link has been sent",
                        email_sent=False
                    )
                
                # Generate reset token (implement secure token generation)
                reset_token = secrets.token_urlsafe(32)
                reset_expires = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
                
                # TODO: Store reset token securely (implement reset token table)
                # Send password reset email
                await self._send_password_reset_email(user, reset_token)
                
                # Log security event
                await self._log_security_event(
                    session=session,
                    action="password.reset_requested",
                    resource_type="user",
                    resource_id=user.id,
                    user_id=user.id,
                    ip_address=ip_address,
                    details={"email": email}
                )
                
                await session.commit()
                
                logger.info(
                    "Password reset requested",
                    user_id=str(user.id),
                    email=email
                )
                
                return PasswordResetResponse(
                    success=True,
                    message="If the email address exists, a reset link has been sent",
                    email_sent=True
                )
                
            except Exception as e:
                logger.error("Password reset request error", error=str(e))
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Password reset request failed"
                )
    
    # Private helper methods
    
    async def _get_user_by_email(self, session: AsyncSession, email: str) -> Optional[User]:
        """Get user by email address with caching."""
        cache_key = f"user:email:{email}"
        
        # Try cache first
        cached_user = await cache_service.get(cache_key)
        if cached_user:
            # If cached, still need to attach to session for updates
            # This is a simplified approach - in production you'd handle session attachment properly
            return cached_user
        
        result = await session.execute(
            select(User).where(User.email == email).options(
                selectinload(User.roles),
                selectinload(User.user_permissions),
                selectinload(User.organization)
            )
        )
        user = result.scalar_one_or_none()
        
        # Cache the user if found
        if user:
            await cache_service.set(cache_key, user, ttl=self.user_cache_ttl)
        
        return user
    
    async def _get_or_create_organization(
        self, 
        session: AsyncSession, 
        domain: Optional[str]
    ) -> Organization:
        """Get or create organization."""
        if domain:
            result = await session.execute(
                select(Organization).where(Organization.domain == domain)
            )
            org = result.scalar_one_or_none()
            if org:
                return org
        
        # Create default organization
        org = Organization(
            name="Default Organization",
            domain=domain,
            is_active=True
        )
        session.add(org)
        await session.flush()
        return org
    
    async def _assign_default_role(
        self, 
        session: AsyncSession, 
        user: User, 
        organization: Organization
    ):
        """Assign default role to new user."""
        # Get or create default role
        result = await session.execute(
            select(Role).where(
                and_(
                    Role.name == "user",
                    Role.organization_id == organization.id
                )
            )
        )
        default_role = result.scalar_one_or_none()
        
        if not default_role:
            default_role = Role(
                name="user",
                description="Default user role",
                level=50,
                organization_id=organization.id,
                is_system_role=True,
                color="#6366f1"
            )
            session.add(default_role)
            await session.flush()
        
        user.roles.append(default_role)
    
    async def _get_user_permissions(self, session: AsyncSession, user: User) -> List[str]:
        """Get all effective permissions for user."""
        return user.get_effective_permissions()
    
    async def _create_session(
        self,
        session: AsyncSession,
        user: User,
        refresh_token: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        device_info: Dict[str, Any],
        remember_me: bool = False
    ) -> UUID:
        """Create user session record."""
        token_family = uuid.uuid4()
        refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        expires_delta = timedelta(days=30 if remember_me else 7)
        expires_at = datetime.utcnow() + expires_delta
        
        session_record = UserSession(
            user_id=user.id,
            token_family=token_family,
            refresh_token_hash=refresh_token_hash,
            ip_address=ip_address,
            user_agent=user_agent,
            device_info=device_info or {},
            expires_at=expires_at,
            is_active=True
        )
        
        session.add(session_record)
        await session.flush()
        return session_record.id
    
    async def _get_session_by_refresh_token(
        self, 
        session: AsyncSession, 
        refresh_token: str
    ) -> Optional[UserSession]:
        """Get session by refresh token hash."""
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        result = await session.execute(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )
        return result.scalar_one_or_none()
    
    async def _create_temporary_login_session(
        self,
        session: AsyncSession,
        user: User,
        ip_address: Optional[str],
        user_agent: Optional[str]
    ) -> str:
        """Create temporary login session for MFA."""
        # TODO: Implement temporary login session storage
        # For now, return a simple token
        temp_token = secrets.token_urlsafe(32)
        # Store in Redis or database with 5 minute expiry
        return temp_token
    
    async def _verify_temporary_login_session(
        self,
        session: AsyncSession,
        temp_token: str
    ) -> Optional[User]:
        """Verify temporary login session."""
        # TODO: Implement verification of temporary session
        # For now, return None (MFA flow incomplete)
        return None
    
    async def _verify_mfa(
        self, 
        user: User, 
        mfa_token: Optional[str], 
        backup_code: Optional[str]
    ) -> bool:
        """Verify MFA token or backup code."""
        if not user.mfa_enabled:
            return True
        
        if mfa_token and user.mfa_secret:
            # Verify TOTP token
            totp = pyotp.TOTP(user.mfa_secret)
            return totp.verify(mfa_token, valid_window=1)
        
        if backup_code and user.mfa_backup_codes:
            # Verify backup code
            # TODO: Implement secure backup code verification
            return backup_code in user.mfa_backup_codes
        
        return False
    
    async def _create_user_profile_summary(
        self, 
        session: AsyncSession, 
        user: User
    ) -> Dict[str, Any]:
        """Create user profile summary for response."""
        return {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "email_verified_at": user.email_verified_at,
            "last_login_at": user.last_login_at,
            "roles": [role.name for role in user.get_active_roles()],
            "permissions": user.get_effective_permissions(),
            "preferences": user.preferences
        }
    
    async def _log_login_attempt(
        self,
        session: AsyncSession,
        email: str,
        user_id: Optional[UUID],
        ip_address: Optional[str],
        user_agent: Optional[str],
        success: bool,
        failure_reason: Optional[str] = None
    ):
        """Log login attempt for security monitoring."""
        attempt = LoginAttempt(
            email=email,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason,
            attempted_at=datetime.utcnow()
        )
        session.add(attempt)
    
    async def _log_security_event(
        self,
        session: AsyncSession,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log security event for audit trail."""
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            new_values=details or {}
        )
        session.add(log_entry)
    
    # ================================
    # CACHE MANAGEMENT METHODS
    # ================================
    
    async def _invalidate_user_cache(self, user_id: UUID, email: str = None):
        """Invalidate all cache entries for a user."""
        cache_keys = [
            f"user:id:{user_id}",
            f"user:permissions:{user_id}",
            f"user:sessions:{user_id}"
        ]
        
        if email:
            cache_keys.append(f"user:email:{email}")
        
        for key in cache_keys:
            await cache_service.delete(key)
    
    @cached(ttl=300, key_prefix="user_permissions")
    async def _get_user_permissions_cached(self, user_id: UUID) -> List[str]:
        """Get user permissions with caching."""
        async with self.db_manager.session() as session:
            user = await session.get(User, user_id)
            if user:
                return user.get_effective_permissions()
            return []
    
    # ================================
    # NOTIFICATION METHODS
    # ================================
    
    async def _send_welcome_email(self, user: User):
        """Send welcome email to new user."""
        try:
            email_notification = EmailNotification(
                to=user.email,
                subject="Welcome to Plataforma NXT!",
                template="welcome_email",
                template_data={
                    "user_name": user.name or user.first_name or user.email,
                    "app_name": self.settings.app_name,
                    "dashboard_url": "http://localhost:3031/dashboard"  # TODO: Get from settings
                }
            )
            
            await notification_service.send_email(
                email_notification,
                user_id=str(user.id),
                priority="normal"
            )
            
        except Exception as e:
            logger.error("Failed to send welcome email", error=str(e), user_id=str(user.id))
    
    async def _send_security_alert(
        self, 
        user: User, 
        alert_type: str,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Send security alert email."""
        try:
            email_notification = EmailNotification(
                to=user.email,
                subject=f"Security Alert - {alert_type}",
                template="security_alert",
                template_data={
                    "user_name": user.name or user.first_name or user.email,
                    "alert_type": alert_type,
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "ip_address": ip_address or "Unknown",
                    "user_agent": user_agent or "Unknown"
                }
            )
            
            await notification_service.send_email(
                email_notification,
                user_id=str(user.id),
                priority="high"
            )
            
        except Exception as e:
            logger.error("Failed to send security alert", error=str(e), user_id=str(user.id))
    
    async def _send_password_reset_email(
        self, 
        user: User, 
        reset_token: str,
        expiry_hours: int = 1
    ):
        """Send password reset email."""
        try:
            reset_url = f"http://localhost:3031/reset-password?token={reset_token}"  # TODO: Get from settings
            
            email_notification = EmailNotification(
                to=user.email,
                subject="Reset your password",
                template="password_reset",
                template_data={
                    "user_name": user.name or user.first_name or user.email,
                    "reset_url": reset_url,
                    "expiry_hours": expiry_hours
                }
            )
            
            await notification_service.send_email(
                email_notification,
                user_id=str(user.id),
                priority="high"
            )
            
        except Exception as e:
            logger.error("Failed to send password reset email", error=str(e), user_id=str(user.id))
    
    # ================================
    # ENHANCED METHODS
    # ================================
    
    async def get_user_stats(self, user_id: UUID) -> Dict[str, Any]:
        """Get user statistics and metrics."""
        cache_key = f"user:stats:{user_id}"
        
        # Check cache first
        stats = await cache_service.get(cache_key)
        if stats:
            return stats
        
        async with self.db_manager.session() as session:
            user = await session.get(User, user_id)
            if not user:
                return {}
            
            # Get login attempts in last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_logins = await session.execute(
                select(func.count(LoginAttempt.id))
                .where(
                    and_(
                        LoginAttempt.user_id == user_id,
                        LoginAttempt.attempted_at >= thirty_days_ago,
                        LoginAttempt.success == True
                    )
                )
            )
            login_count = recent_logins.scalar() or 0
            
            # Get active sessions
            active_sessions = await session.execute(
                select(func.count(UserSession.id))
                .where(
                    and_(
                        UserSession.user_id == user_id,
                        UserSession.is_active == True
                    )
                )
            )
            session_count = active_sessions.scalar() or 0
            
            stats = {
                "user_id": str(user_id),
                "email": user.email,
                "name": user.name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "login_count_30_days": login_count,
                "active_sessions": session_count,
                "failed_login_attempts": user.failed_login_attempts,
                "is_locked": user.is_account_locked,
                "mfa_enabled": user.mfa_enabled,
                "roles": [role.name for role in user.get_active_roles()],
                "permissions_count": len(user.get_effective_permissions())
            }
            
            # Cache for 5 minutes
            await cache_service.set(cache_key, stats, ttl=300)
            return stats
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        async with self.db_manager.session() as session:
            expired_sessions = await session.execute(
                select(UserSession).where(
                    or_(
                        UserSession.expires_at < datetime.utcnow(),
                        and_(
                            UserSession.is_active == True,
                            UserSession.last_activity < (datetime.utcnow() - timedelta(days=30))
                        )
                    )
                )
            )
            
            sessions_to_cleanup = expired_sessions.scalars().all()
            cleaned_count = 0
            
            for session_record in sessions_to_cleanup:
                session_record.revoke("Expired or inactive")
                cleaned_count += 1
            
            await session.commit()
            
            logger.info("Expired sessions cleaned up", count=cleaned_count)
            return cleaned_count


# Global service instance
auth_service = AuthService()