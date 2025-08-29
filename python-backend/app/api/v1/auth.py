"""
Authentication API routes for user authentication, registration, and account management.

This module provides RESTful API endpoints for:
- User registration and login
- Token management (refresh, validation)
- Password management (change, reset)
- User profile management
- Session management
- Multi-factor authentication
- Security audit endpoints
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.security import get_current_user, get_current_active_user, TokenData
from app.services.auth import auth_service
from app.schemas.auth import (
    # Registration schemas
    UserRegistrationRequest, UserRegistrationResponse,
    
    # Login schemas  
    UserLoginRequest, UserLoginResponse, MFALoginRequest,
    
    # Token schemas
    TokenRefreshRequest, TokenRefreshResponse,
    TokenValidationRequest, TokenValidationResponse,
    LogoutRequest, LogoutResponse,
    
    # Password schemas
    PasswordChangeRequest, PasswordResetRequest, PasswordResetResponse,
    PasswordResetConfirm, PasswordStrengthCheck, PasswordStrengthResponse,
    
    # Profile schemas
    UserProfileDetail, UserProfileUpdateRequest, UserProfileSummary,
    
    # Session schemas
    SessionListResponse, SessionRevokeRequest, SessionRevokeResponse,
    
    # MFA schemas
    MFASetupRequest, MFASetupResponse, MFAVerifyRequest, MFAVerifyResponse,
    MFADisableRequest, MFADisableResponse, MFABackupCodesResponse,
    
    # Security schemas
    SecurityLogResponse, LoginAttemptSummary,
    
    # Standard responses
    StandardResponse, PaginatedResponse
)

logger = structlog.get_logger(__name__)

# Create router
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
    responses={
        400: {"description": "Bad Request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden"},
        404: {"description": "Not Found"},
        422: {"description": "Validation Error"},
        500: {"description": "Internal Server Error"}
    }
)

# Security scheme
security = HTTPBearer()
settings = get_settings()


def get_client_info(request: Request) -> Dict[str, Optional[str]]:
    """Extract client information from request."""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent")
    }


# ================================
# REGISTRATION ENDPOINTS
# ================================

@router.post(
    "/register",
    response_model=UserRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register new user",
    description="Register a new user account with email and password"
)
async def register_user(
    registration_data: UserRegistrationRequest,
    request: Request
) -> UserRegistrationResponse:
    """
    Register a new user account.
    
    This endpoint creates a new user account with the provided information.
    The password will be validated according to security policies.
    """
    client_info = get_client_info(request)
    
    try:
        result = await auth_service.register_user(
            registration_data=registration_data,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        logger.info(
            "User registration successful",
            email=registration_data.email,
            user_id=str(result.user_id) if result.user_id else None
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Registration endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post(
    "/register/check-availability",
    response_model=StandardResponse,
    summary="Check email availability",
    description="Check if an email address is available for registration"
)
async def check_email_availability(
    email: str
) -> StandardResponse:
    """
    Check if email address is available for registration.
    
    This endpoint checks if an email address is already registered.
    """
    # TODO: Implement email availability check
    return StandardResponse(
        success=True,
        message="Email availability check not implemented yet",
        data={"available": True}
    )


# ================================
# LOGIN ENDPOINTS
# ================================

@router.post(
    "/login",
    response_model=UserLoginResponse,
    summary="User login",
    description="Authenticate user with email and password"
)
async def login_user(
    login_data: UserLoginRequest,
    request: Request
) -> UserLoginResponse:
    """
    Authenticate user login.
    
    This endpoint authenticates a user with email and password.
    May require MFA if enabled for the account.
    """
    client_info = get_client_info(request)
    
    # Add client info to login data
    if not login_data.ip_address:
        login_data.ip_address = client_info["ip_address"]
    if not login_data.user_agent:
        login_data.user_agent = client_info["user_agent"]
    
    try:
        result = await auth_service.authenticate_user(
            login_data=login_data,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        logger.info(
            "User login attempt",
            email=login_data.email,
            success=result.success,
            mfa_required=result.mfa_required
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Login endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post(
    "/login/mfa",
    response_model=UserLoginResponse,
    summary="Complete MFA login",
    description="Complete multi-factor authentication login"
)
async def mfa_login(
    mfa_data: MFALoginRequest,
    request: Request
) -> UserLoginResponse:
    """
    Complete MFA authentication.
    
    This endpoint completes the login process for users who require MFA.
    """
    client_info = get_client_info(request)
    
    try:
        result = await auth_service.authenticate_mfa(
            mfa_request=mfa_data,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"]
        )
        
        logger.info(
            "MFA login completed",
            success=result.success
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("MFA login endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA login failed"
        )


# ================================
# TOKEN MANAGEMENT ENDPOINTS
# ================================

@router.post(
    "/token/refresh",
    response_model=TokenRefreshResponse,
    summary="Refresh access token",
    description="Refresh access token using valid refresh token"
)
async def refresh_token(
    token_data: TokenRefreshRequest,
    request: Request
) -> TokenRefreshResponse:
    """
    Refresh authentication tokens.
    
    This endpoint generates new access and refresh tokens using a valid refresh token.
    """
    client_info = get_client_info(request)
    
    try:
        result = await auth_service.refresh_token(
            refresh_token=token_data.refresh_token,
            ip_address=client_info["ip_address"]
        )
        
        logger.info("Token refreshed successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Token refresh endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post(
    "/token/validate",
    response_model=TokenValidationResponse,
    summary="Validate token",
    description="Validate access or refresh token"
)
async def validate_token(
    token_data: TokenValidationRequest,
    current_user: TokenData = Depends(get_current_user)
) -> TokenValidationResponse:
    """
    Validate authentication token.
    
    This endpoint validates whether a token is valid and returns token information.
    """
    try:
        # If we get here, token is valid (passed get_current_user dependency)
        return TokenValidationResponse(
            valid=True,
            user_id=UUID(hex=format(current_user.user_id, '032x')),
            expires_at=current_user.exp,
            scopes=current_user.permissions,
            message="Token is valid"
        )
        
    except Exception as e:
        logger.error("Token validation endpoint error", error=str(e))
        return TokenValidationResponse(
            valid=False,
            message="Token validation failed"
        )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="User logout",
    description="Logout user and revoke sessions"
)
async def logout_user(
    logout_data: LogoutRequest,
    current_user: TokenData = Depends(get_current_user)
) -> LogoutResponse:
    """
    Logout user.
    
    This endpoint logs out the user by revoking their sessions.
    """
    try:
        user_uuid = UUID(hex=format(current_user.user_id, '032x'))
        
        revoked_count = await auth_service.logout_user(
            user_id=user_uuid,
            refresh_token=logout_data.refresh_token,
            logout_all_sessions=logout_data.logout_all_sessions
        )
        
        message = "Logged out successfully"
        if logout_data.logout_all_sessions:
            message += f" from {revoked_count} sessions"
        
        return LogoutResponse(
            success=True,
            message=message,
            sessions_revoked=revoked_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Logout endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


# ================================
# PASSWORD MANAGEMENT ENDPOINTS
# ================================

@router.post(
    "/password/change",
    response_model=StandardResponse,
    summary="Change password",
    description="Change user password with current password verification"
)
async def change_password(
    password_data: PasswordChangeRequest,
    request: Request,
    current_user: TokenData = Depends(get_current_active_user)
) -> StandardResponse:
    """
    Change user password.
    
    This endpoint allows users to change their password by providing their current password.
    """
    client_info = get_client_info(request)
    user_uuid = UUID(hex=format(current_user.user_id, '032x'))
    
    try:
        await auth_service.change_password(
            user_id=user_uuid,
            password_data=password_data,
            ip_address=client_info["ip_address"]
        )
        
        return StandardResponse(
            success=True,
            message="Password changed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password change endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )


@router.post(
    "/password/reset",
    response_model=PasswordResetResponse,
    summary="Request password reset",
    description="Request password reset link via email"
)
async def request_password_reset(
    reset_data: PasswordResetRequest,
    request: Request
) -> PasswordResetResponse:
    """
    Request password reset.
    
    This endpoint sends a password reset link to the user's email address.
    """
    client_info = get_client_info(request)
    
    try:
        result = await auth_service.request_password_reset(
            email=reset_data.email,
            return_url=reset_data.return_url,
            ip_address=client_info["ip_address"]
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password reset request endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )


@router.post(
    "/password/reset/confirm",
    response_model=StandardResponse,
    summary="Confirm password reset",
    description="Confirm password reset with token and set new password"
)
async def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    request: Request
) -> StandardResponse:
    """
    Confirm password reset.
    
    This endpoint confirms a password reset using a token and sets a new password.
    """
    # TODO: Implement password reset confirmation
    return StandardResponse(
        success=False,
        message="Password reset confirmation not implemented yet"
    )


@router.post(
    "/password/strength",
    response_model=PasswordStrengthResponse,
    summary="Check password strength",
    description="Validate password strength according to security policies"
)
async def check_password_strength(
    password_data: PasswordStrengthCheck
) -> PasswordStrengthResponse:
    """
    Check password strength.
    
    This endpoint validates a password against security policies and returns strength information.
    """
    try:
        from app.core.security import password_validator
        
        result = password_validator.validate_password_strength(password_data.password)
        
        suggestions = []
        if result.strength_score < 60:
            suggestions.extend([
                "Use a mix of uppercase and lowercase letters",
                "Include numbers and special characters",
                "Make it longer (12+ characters recommended)",
                "Avoid common words and patterns"
            ])
        
        return PasswordStrengthResponse(
            valid=result.is_valid,
            strength_score=result.strength_score,
            errors=result.errors,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error("Password strength check endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password strength check failed"
        )


# ================================
# USER PROFILE ENDPOINTS
# ================================

@router.get(
    "/profile",
    response_model=UserProfileDetail,
    summary="Get user profile",
    description="Get current user's detailed profile information"
)
async def get_user_profile(
    current_user: TokenData = Depends(get_current_active_user)
) -> UserProfileDetail:
    """
    Get user profile.
    
    This endpoint returns the current user's detailed profile information.
    """
    try:
        # TODO: Implement get user profile from service
        # For now, return basic info from token
        user_uuid = UUID(hex=format(current_user.user_id, '032x'))
        
        return UserProfileDetail(
            id=user_uuid,
            email=current_user.email or "",
            name=current_user.username,
            is_active=True,
            is_locked=False,
            must_change_password=False,
            mfa_enabled=False,
            timezone="UTC",
            language="pt-BR",
            theme="system",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            preferences={},
            active_sessions_count=1
        )
        
    except Exception as e:
        logger.error("Get profile endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )


@router.put(
    "/profile",
    response_model=StandardResponse,
    summary="Update user profile",
    description="Update current user's profile information"
)
async def update_user_profile(
    profile_data: UserProfileUpdateRequest,
    current_user: TokenData = Depends(get_current_active_user)
) -> StandardResponse:
    """
    Update user profile.
    
    This endpoint updates the current user's profile information.
    """
    try:
        # TODO: Implement update user profile in service
        return StandardResponse(
            success=False,
            message="Profile update not implemented yet"
        )
        
    except Exception as e:
        logger.error("Update profile endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile update failed"
        )


@router.get(
    "/profile/summary",
    response_model=UserProfileSummary,
    summary="Get user profile summary",
    description="Get current user's profile summary"
)
async def get_user_profile_summary(
    current_user: TokenData = Depends(get_current_active_user)
) -> UserProfileSummary:
    """
    Get user profile summary.
    
    This endpoint returns a summary of the current user's profile.
    """
    try:
        user_uuid = UUID(hex=format(current_user.user_id, '032x'))
        
        return UserProfileSummary(
            id=user_uuid,
            email=current_user.email or "",
            name=current_user.username,
            is_active=True,
            roles=current_user.roles,
            permissions=current_user.permissions,
            preferences={}
        )
        
    except Exception as e:
        logger.error("Get profile summary endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile summary"
        )


# ================================
# SESSION MANAGEMENT ENDPOINTS
# ================================

@router.get(
    "/sessions",
    response_model=SessionListResponse,
    summary="Get user sessions",
    description="Get list of current user's active sessions"
)
async def get_user_sessions(
    current_user: TokenData = Depends(get_current_active_user)
) -> SessionListResponse:
    """
    Get user sessions.
    
    This endpoint returns a list of the current user's active sessions.
    """
    try:
        # TODO: Implement get user sessions from service
        return SessionListResponse(
            sessions=[],
            total_sessions=0,
            active_sessions=0
        )
        
    except Exception as e:
        logger.error("Get sessions endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user sessions"
        )


@router.post(
    "/sessions/revoke",
    response_model=SessionRevokeResponse,
    summary="Revoke user sessions",
    description="Revoke specific user sessions or all sessions"
)
async def revoke_user_sessions(
    revoke_data: SessionRevokeRequest,
    current_user: TokenData = Depends(get_current_active_user)
) -> SessionRevokeResponse:
    """
    Revoke user sessions.
    
    This endpoint allows users to revoke specific sessions or all sessions.
    """
    try:
        # TODO: Implement revoke sessions from service
        return SessionRevokeResponse(
            success=False,
            message="Session revocation not implemented yet",
            revoked_sessions=0,
            remaining_sessions=0
        )
        
    except Exception as e:
        logger.error("Revoke sessions endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session revocation failed"
        )


# ================================
# MULTI-FACTOR AUTHENTICATION ENDPOINTS
# ================================

@router.post(
    "/mfa/setup",
    response_model=MFASetupResponse,
    summary="Setup MFA",
    description="Setup multi-factor authentication for user account"
)
async def setup_mfa(
    mfa_data: MFASetupRequest,
    current_user: TokenData = Depends(get_current_active_user)
) -> MFASetupResponse:
    """
    Setup multi-factor authentication.
    
    This endpoint initiates MFA setup for the current user.
    """
    try:
        # TODO: Implement MFA setup from service
        return MFASetupResponse(
            success=False,
            method=mfa_data.method,
            message="MFA setup not implemented yet"
        )
        
    except Exception as e:
        logger.error("MFA setup endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA setup failed"
        )


@router.post(
    "/mfa/verify",
    response_model=MFAVerifyResponse,
    summary="Verify MFA setup",
    description="Verify MFA setup with token"
)
async def verify_mfa_setup(
    verify_data: MFAVerifyRequest,
    current_user: TokenData = Depends(get_current_active_user)
) -> MFAVerifyResponse:
    """
    Verify MFA setup.
    
    This endpoint verifies the MFA setup by validating a token.
    """
    try:
        # TODO: Implement MFA verification from service
        return MFAVerifyResponse(
            success=False,
            message="MFA verification not implemented yet"
        )
        
    except Exception as e:
        logger.error("MFA verify endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA verification failed"
        )


@router.post(
    "/mfa/disable",
    response_model=MFADisableResponse,
    summary="Disable MFA",
    description="Disable multi-factor authentication"
)
async def disable_mfa(
    disable_data: MFADisableRequest,
    current_user: TokenData = Depends(get_current_active_user)
) -> MFADisableResponse:
    """
    Disable multi-factor authentication.
    
    This endpoint disables MFA for the current user.
    """
    try:
        # TODO: Implement MFA disable from service
        return MFADisableResponse(
            success=False,
            message="MFA disable not implemented yet"
        )
        
    except Exception as e:
        logger.error("MFA disable endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA disable failed"
        )


@router.post(
    "/mfa/backup-codes",
    response_model=MFABackupCodesResponse,
    summary="Generate MFA backup codes",
    description="Generate new MFA backup codes"
)
async def generate_mfa_backup_codes(
    current_user: TokenData = Depends(get_current_active_user)
) -> MFABackupCodesResponse:
    """
    Generate MFA backup codes.
    
    This endpoint generates new MFA backup codes for the current user.
    """
    try:
        # TODO: Implement backup code generation from service
        return MFABackupCodesResponse(
            backup_codes=[],
            message="MFA backup codes generation not implemented yet"
        )
        
    except Exception as e:
        logger.error("MFA backup codes endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="MFA backup codes generation failed"
        )


# ================================
# SECURITY AUDIT ENDPOINTS
# ================================

@router.get(
    "/security/login-attempts",
    response_model=List[LoginAttemptSummary],
    summary="Get login attempts",
    description="Get recent login attempts for current user"
)
async def get_login_attempts(
    limit: int = 20,
    current_user: TokenData = Depends(get_current_active_user)
) -> List[LoginAttemptSummary]:
    """
    Get login attempts.
    
    This endpoint returns recent login attempts for the current user.
    """
    try:
        # TODO: Implement get login attempts from service
        return []
        
    except Exception as e:
        logger.error("Get login attempts endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get login attempts"
        )


@router.get(
    "/security/audit-log",
    response_model=SecurityLogResponse,
    summary="Get security audit log",
    description="Get security audit log for current user"
)
async def get_security_audit_log(
    page: int = 1,
    per_page: int = 20,
    current_user: TokenData = Depends(get_current_active_user)
) -> SecurityLogResponse:
    """
    Get security audit log.
    
    This endpoint returns the security audit log for the current user.
    """
    try:
        # TODO: Implement get security log from service
        return SecurityLogResponse(
            logs=[],
            total=0,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error("Get security log endpoint error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get security audit log"
        )


# ================================
# HEALTH CHECK ENDPOINTS
# ================================

@router.get(
    "/health",
    response_model=StandardResponse,
    summary="Auth service health check",
    description="Check authentication service health"
)
async def auth_health_check() -> StandardResponse:
    """
    Authentication service health check.
    
    This endpoint provides health status for the authentication service.
    """
    try:
        # TODO: Add actual health checks
        return StandardResponse(
            success=True,
            message="Authentication service is healthy",
            data={
                "timestamp": datetime.utcnow(),
                "version": settings.app_version,
                "features": {
                    "registration": True,
                    "login": True,
                    "token_refresh": True,
                    "password_reset": False,  # Not fully implemented
                    "mfa": False,  # Not fully implemented
                    "session_management": False  # Not fully implemented
                }
            }
        )
        
    except Exception as e:
        logger.error("Auth health check error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service health check failed"
        )