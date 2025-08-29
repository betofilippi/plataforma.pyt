"""
Authentication Pydantic schemas for request/response models.

This module defines all Pydantic models used in authentication endpoints:
- User registration and login schemas
- Token response schemas  
- Password reset schemas
- User profile schemas
- Permission and role schemas
- Session management schemas
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator, root_validator
from pydantic.types import constr

from app.core.config import get_settings


class BaseAuthSchema(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        orm_mode = True
        validate_assignment = True
        use_enum_values = True
        allow_population_by_field_name = True


# ================================
# USER REGISTRATION SCHEMAS
# ================================

class UserRegistrationRequest(BaseAuthSchema):
    """User registration request schema."""
    
    email: EmailStr = Field(..., description="User email address")
    password: constr(min_length=8, max_length=128) = Field(..., description="User password")
    password_confirm: str = Field(..., description="Password confirmation")
    name: constr(min_length=1, max_length=100) = Field(..., description="User full name")
    first_name: Optional[constr(max_length=100)] = Field(None, description="User first name")
    last_name: Optional[constr(max_length=100)] = Field(None, description="User last name")
    phone: Optional[constr(regex=r'^\+?[1-9]\d{1,14}$')] = Field(None, description="User phone number")
    timezone: Optional[str] = Field("UTC", description="User timezone")
    language: Optional[str] = Field("pt-BR", description="User language preference")
    department: Optional[constr(max_length=100)] = Field(None, description="User department")
    job_title: Optional[constr(max_length=100)] = Field(None, description="User job title")
    terms_accepted: bool = Field(..., description="Terms and conditions acceptance")
    privacy_policy_accepted: bool = Field(..., description="Privacy policy acceptance")
    organization_domain: Optional[str] = Field(None, description="Organization domain for registration")
    invite_token: Optional[str] = Field(None, description="Invitation token if applicable")
    
    @validator('password_confirm')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('terms_accepted', 'privacy_policy_accepted')
    def must_accept_terms(cls, v):
        if not v:
            raise ValueError('Must accept terms and conditions')
        return v
    
    @validator('timezone')
    def validate_timezone(cls, v):
        if v:
            # Basic timezone validation - in production, use pytz
            common_timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 
                             'America/Sao_Paulo', 'Europe/London', 'Europe/Berlin',
                             'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney']
            if v not in common_timezones:
                # For now, accept any string - in production, validate against pytz
                pass
        return v or 'UTC'


class UserRegistrationResponse(BaseAuthSchema):
    """User registration response schema."""
    
    success: bool = Field(..., description="Registration success status")
    message: str = Field(..., description="Registration message")
    user_id: Optional[UUID] = Field(None, description="Created user ID")
    email_verification_required: bool = Field(False, description="Whether email verification is required")
    next_steps: List[str] = Field(default_factory=list, description="Next steps for the user")


# ================================
# LOGIN SCHEMAS
# ================================

class UserLoginRequest(BaseAuthSchema):
    """User login request schema."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    remember_me: bool = Field(False, description="Remember login for extended period")
    mfa_token: Optional[str] = Field(None, description="Multi-factor authentication token")
    mfa_backup_code: Optional[str] = Field(None, description="MFA backup code")
    device_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Device information")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    user_agent: Optional[str] = Field(None, description="Client user agent")
    
    @validator('device_info')
    def validate_device_info(cls, v):
        if v is None:
            return {}
        # Limit device info size
        allowed_keys = ['platform', 'browser', 'version', 'mobile', 'timezone']
        return {k: v for k, v in v.items() if k in allowed_keys}


class TokenResponse(BaseAuthSchema):
    """Token response schema."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")
    refresh_expires_in: int = Field(..., description="Refresh token expiration time in seconds")
    scope: Optional[str] = Field(None, description="Token scope")


class UserLoginResponse(BaseAuthSchema):
    """User login response schema."""
    
    success: bool = Field(..., description="Login success status")
    message: str = Field(..., description="Login message")
    tokens: Optional[TokenResponse] = Field(None, description="Authentication tokens")
    user: Optional['UserProfileSummary'] = Field(None, description="User profile summary")
    mfa_required: bool = Field(False, description="Whether MFA is required")
    mfa_methods: List[str] = Field(default_factory=list, description="Available MFA methods")
    session_id: Optional[str] = Field(None, description="Session identifier")
    warnings: List[str] = Field(default_factory=list, description="Login warnings")


class MFALoginRequest(BaseAuthSchema):
    """Multi-factor authentication login request."""
    
    login_session_token: str = Field(..., description="Temporary login session token")
    mfa_token: Optional[str] = Field(None, description="TOTP token")
    mfa_backup_code: Optional[str] = Field(None, description="Backup code")
    trust_device: bool = Field(False, description="Trust this device for future logins")
    
    @root_validator
    def validate_mfa_credentials(cls, values):
        mfa_token = values.get('mfa_token')
        mfa_backup_code = values.get('mfa_backup_code')
        
        if not mfa_token and not mfa_backup_code:
            raise ValueError('Either MFA token or backup code is required')
        
        return values


# ================================
# TOKEN MANAGEMENT SCHEMAS
# ================================

class TokenRefreshRequest(BaseAuthSchema):
    """Token refresh request schema."""
    
    refresh_token: str = Field(..., description="Valid refresh token")


class TokenRefreshResponse(BaseAuthSchema):
    """Token refresh response schema."""
    
    success: bool = Field(..., description="Refresh success status")
    tokens: Optional[TokenResponse] = Field(None, description="New authentication tokens")
    message: Optional[str] = Field(None, description="Response message")


class TokenValidationRequest(BaseAuthSchema):
    """Token validation request schema."""
    
    token: str = Field(..., description="Token to validate")
    token_type: Optional[str] = Field("access", description="Type of token to validate")


class TokenValidationResponse(BaseAuthSchema):
    """Token validation response schema."""
    
    valid: bool = Field(..., description="Token validity status")
    user_id: Optional[UUID] = Field(None, description="Token owner user ID")
    expires_at: Optional[datetime] = Field(None, description="Token expiration time")
    scopes: List[str] = Field(default_factory=list, description="Token scopes")
    message: Optional[str] = Field(None, description="Validation message")


class LogoutRequest(BaseAuthSchema):
    """Logout request schema."""
    
    refresh_token: Optional[str] = Field(None, description="Refresh token to revoke")
    logout_all_sessions: bool = Field(False, description="Logout from all sessions")


class LogoutResponse(BaseAuthSchema):
    """Logout response schema."""
    
    success: bool = Field(..., description="Logout success status")
    message: str = Field(..., description="Logout message")
    sessions_revoked: int = Field(0, description="Number of sessions revoked")


# ================================
# PASSWORD MANAGEMENT SCHEMAS
# ================================

class PasswordChangeRequest(BaseAuthSchema):
    """Password change request schema."""
    
    current_password: str = Field(..., description="Current password")
    new_password: constr(min_length=8, max_length=128) = Field(..., description="New password")
    new_password_confirm: str = Field(..., description="New password confirmation")
    revoke_all_sessions: bool = Field(True, description="Revoke all other sessions after password change")
    
    @validator('new_password_confirm')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('New passwords do not match')
        return v


class PasswordResetRequest(BaseAuthSchema):
    """Password reset request schema."""
    
    email: EmailStr = Field(..., description="Email address to send reset link")
    return_url: Optional[str] = Field(None, description="URL to redirect after reset")


class PasswordResetConfirm(BaseAuthSchema):
    """Password reset confirmation schema."""
    
    token: str = Field(..., description="Password reset token")
    new_password: constr(min_length=8, max_length=128) = Field(..., description="New password")
    new_password_confirm: str = Field(..., description="New password confirmation")
    
    @validator('new_password_confirm')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class PasswordResetResponse(BaseAuthSchema):
    """Password reset response schema."""
    
    success: bool = Field(..., description="Reset success status")
    message: str = Field(..., description="Reset message")
    email_sent: bool = Field(False, description="Whether reset email was sent")


class PasswordStrengthCheck(BaseAuthSchema):
    """Password strength validation request."""
    
    password: str = Field(..., description="Password to check")


class PasswordStrengthResponse(BaseAuthSchema):
    """Password strength validation response."""
    
    valid: bool = Field(..., description="Whether password meets requirements")
    strength_score: int = Field(..., description="Password strength score (0-100)")
    errors: List[str] = Field(default_factory=list, description="Password validation errors")
    suggestions: List[str] = Field(default_factory=list, description="Password improvement suggestions")


# ================================
# USER PROFILE SCHEMAS
# ================================

class UserProfileSummary(BaseAuthSchema):
    """User profile summary schema."""
    
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    name: str = Field(..., description="User full name")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    avatar_url: Optional[str] = Field(None, description="User avatar URL")
    is_active: bool = Field(..., description="User active status")
    email_verified_at: Optional[datetime] = Field(None, description="Email verification timestamp")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    roles: List[str] = Field(default_factory=list, description="User roles")
    permissions: List[str] = Field(default_factory=list, description="User permissions")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")


class UserProfileDetail(BaseAuthSchema):
    """Detailed user profile schema."""
    
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    email_verified_at: Optional[datetime] = Field(None, description="Email verification timestamp")
    name: str = Field(..., description="User full name")
    first_name: Optional[str] = Field(None, description="User first name")
    last_name: Optional[str] = Field(None, description="User last name")
    avatar_url: Optional[str] = Field(None, description="User avatar URL")
    phone: Optional[str] = Field(None, description="User phone number")
    department: Optional[str] = Field(None, description="User department")
    job_title: Optional[str] = Field(None, description="User job title")
    timezone: str = Field(..., description="User timezone")
    language: str = Field(..., description="User language")
    theme: str = Field(..., description="User theme preference")
    is_active: bool = Field(..., description="User active status")
    is_locked: bool = Field(..., description="User locked status")
    must_change_password: bool = Field(..., description="Must change password flag")
    mfa_enabled: bool = Field(..., description="MFA enabled status")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    last_password_change_at: Optional[datetime] = Field(None, description="Last password change timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Account update timestamp")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    organization: Optional['OrganizationSummary'] = Field(None, description="User organization")
    roles: List['RoleSummary'] = Field(default_factory=list, description="User roles")
    active_sessions_count: int = Field(0, description="Number of active sessions")


class UserProfileUpdateRequest(BaseAuthSchema):
    """User profile update request schema."""
    
    name: Optional[constr(min_length=1, max_length=100)] = Field(None, description="User full name")
    first_name: Optional[constr(max_length=100)] = Field(None, description="User first name")
    last_name: Optional[constr(max_length=100)] = Field(None, description="User last name")
    phone: Optional[constr(regex=r'^\+?[1-9]\d{1,14}$')] = Field(None, description="User phone number")
    department: Optional[constr(max_length=100)] = Field(None, description="User department")
    job_title: Optional[constr(max_length=100)] = Field(None, description="User job title")
    timezone: Optional[str] = Field(None, description="User timezone")
    language: Optional[str] = Field(None, description="User language")
    theme: Optional[str] = Field(None, description="User theme preference")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    
    @validator('theme')
    def validate_theme(cls, v):
        if v and v not in ['light', 'dark', 'system']:
            raise ValueError('Theme must be light, dark, or system')
        return v


# ================================
# ORGANIZATION SCHEMAS
# ================================

class OrganizationSummary(BaseAuthSchema):
    """Organization summary schema."""
    
    id: UUID = Field(..., description="Organization ID")
    name: str = Field(..., description="Organization name")
    domain: Optional[str] = Field(None, description="Organization domain")
    logo_url: Optional[str] = Field(None, description="Organization logo URL")
    is_active: bool = Field(..., description="Organization active status")


class OrganizationDetail(BaseAuthSchema):
    """Detailed organization schema."""
    
    id: UUID = Field(..., description="Organization ID")
    name: str = Field(..., description="Organization name")
    description: Optional[str] = Field(None, description="Organization description")
    domain: Optional[str] = Field(None, description="Organization domain")
    logo_url: Optional[str] = Field(None, description="Organization logo URL")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Organization settings")
    is_active: bool = Field(..., description="Organization active status")
    created_at: datetime = Field(..., description="Organization creation timestamp")
    updated_at: datetime = Field(..., description="Organization update timestamp")
    user_count: int = Field(0, description="Number of users in organization")
    role_count: int = Field(0, description="Number of roles in organization")


# ================================
# ROLE AND PERMISSION SCHEMAS
# ================================

class PermissionSummary(BaseAuthSchema):
    """Permission summary schema."""
    
    id: UUID = Field(..., description="Permission ID")
    name: str = Field(..., description="Permission name")
    description: Optional[str] = Field(None, description="Permission description")
    category: str = Field(..., description="Permission category")
    resource: Optional[str] = Field(None, description="Permission resource")
    action: str = Field(..., description="Permission action")
    module_name: Optional[str] = Field(None, description="Module name")
    is_system_permission: bool = Field(..., description="System permission flag")


class RoleSummary(BaseAuthSchema):
    """Role summary schema."""
    
    id: UUID = Field(..., description="Role ID")
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    level: int = Field(..., description="Role level")
    color: str = Field(..., description="Role color")
    icon: Optional[str] = Field(None, description="Role icon")
    is_system_role: bool = Field(..., description="System role flag")
    permission_count: int = Field(0, description="Number of permissions")


class RoleDetail(BaseAuthSchema):
    """Detailed role schema."""
    
    id: UUID = Field(..., description="Role ID")
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    level: int = Field(..., description="Role level")
    color: str = Field(..., description="Role color")
    icon: Optional[str] = Field(None, description="Role icon")
    is_system_role: bool = Field(..., description="System role flag")
    is_active: bool = Field(..., description="Role active status")
    created_at: datetime = Field(..., description="Role creation timestamp")
    updated_at: datetime = Field(..., description="Role update timestamp")
    organization: OrganizationSummary = Field(..., description="Role organization")
    parent_role: Optional['RoleSummary'] = Field(None, description="Parent role")
    child_roles: List['RoleSummary'] = Field(default_factory=list, description="Child roles")
    permissions: List[PermissionSummary] = Field(default_factory=list, description="Role permissions")
    user_count: int = Field(0, description="Number of users with this role")


# ================================
# SESSION MANAGEMENT SCHEMAS
# ================================

class SessionSummary(BaseAuthSchema):
    """User session summary schema."""
    
    id: UUID = Field(..., description="Session ID")
    token_family: UUID = Field(..., description="Token family ID")
    ip_address: Optional[str] = Field(None, description="Session IP address")
    user_agent: Optional[str] = Field(None, description="Session user agent")
    device_info: Dict[str, Any] = Field(default_factory=dict, description="Device information")
    created_at: datetime = Field(..., description="Session creation timestamp")
    last_activity: datetime = Field(..., description="Last activity timestamp")
    expires_at: datetime = Field(..., description="Session expiration timestamp")
    is_current: bool = Field(False, description="Whether this is the current session")
    is_active: bool = Field(..., description="Session active status")


class SessionListResponse(BaseAuthSchema):
    """Session list response schema."""
    
    sessions: List[SessionSummary] = Field(..., description="List of user sessions")
    total_sessions: int = Field(..., description="Total number of sessions")
    active_sessions: int = Field(..., description="Number of active sessions")


class SessionRevokeRequest(BaseAuthSchema):
    """Session revoke request schema."""
    
    session_ids: Optional[List[UUID]] = Field(None, description="Specific session IDs to revoke")
    revoke_all_except_current: bool = Field(False, description="Revoke all sessions except current")
    revoke_all: bool = Field(False, description="Revoke all sessions including current")
    
    @root_validator
    def validate_revoke_options(cls, values):
        session_ids = values.get('session_ids')
        revoke_all_except_current = values.get('revoke_all_except_current')
        revoke_all = values.get('revoke_all')
        
        options_count = sum([
            bool(session_ids),
            revoke_all_except_current,
            revoke_all
        ])
        
        if options_count != 1:
            raise ValueError('Must specify exactly one revocation option')
        
        return values


class SessionRevokeResponse(BaseAuthSchema):
    """Session revoke response schema."""
    
    success: bool = Field(..., description="Revocation success status")
    message: str = Field(..., description="Revocation message")
    revoked_sessions: int = Field(..., description="Number of revoked sessions")
    remaining_sessions: int = Field(..., description="Number of remaining active sessions")


# ================================
# MULTI-FACTOR AUTHENTICATION SCHEMAS
# ================================

class MFASetupRequest(BaseAuthSchema):
    """MFA setup request schema."""
    
    method: str = Field(..., description="MFA method (totp, sms, email)")
    phone_number: Optional[str] = Field(None, description="Phone number for SMS MFA")
    
    @validator('method')
    def validate_method(cls, v):
        if v not in ['totp', 'sms', 'email']:
            raise ValueError('Invalid MFA method')
        return v


class MFASetupResponse(BaseAuthSchema):
    """MFA setup response schema."""
    
    success: bool = Field(..., description="Setup success status")
    method: str = Field(..., description="MFA method")
    secret: Optional[str] = Field(None, description="TOTP secret (for totp method)")
    qr_code_url: Optional[str] = Field(None, description="QR code URL (for totp method)")
    backup_codes: Optional[List[str]] = Field(None, description="Backup codes")
    message: str = Field(..., description="Setup message")


class MFAVerifyRequest(BaseAuthSchema):
    """MFA verification request schema."""
    
    token: str = Field(..., description="MFA token to verify")


class MFAVerifyResponse(BaseAuthSchema):
    """MFA verification response schema."""
    
    success: bool = Field(..., description="Verification success status")
    message: str = Field(..., description="Verification message")


class MFADisableRequest(BaseAuthSchema):
    """MFA disable request schema."""
    
    current_password: str = Field(..., description="Current password for confirmation")
    mfa_token: Optional[str] = Field(None, description="Current MFA token")


class MFADisableResponse(BaseAuthSchema):
    """MFA disable response schema."""
    
    success: bool = Field(..., description="Disable success status")
    message: str = Field(..., description="Disable message")


class MFABackupCodesResponse(BaseAuthSchema):
    """MFA backup codes response schema."""
    
    backup_codes: List[str] = Field(..., description="New backup codes")
    message: str = Field(..., description="Response message")


# ================================
# AUDIT AND SECURITY SCHEMAS
# ================================

class LoginAttemptSummary(BaseAuthSchema):
    """Login attempt summary schema."""
    
    id: UUID = Field(..., description="Login attempt ID")
    email: str = Field(..., description="Email used in attempt")
    ip_address: str = Field(..., description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    success: bool = Field(..., description="Attempt success status")
    failure_reason: Optional[str] = Field(None, description="Failure reason")
    attempted_at: datetime = Field(..., description="Attempt timestamp")


class SecurityLogEntry(BaseAuthSchema):
    """Security log entry schema."""
    
    id: UUID = Field(..., description="Log entry ID")
    user_id: Optional[UUID] = Field(None, description="User ID")
    action: str = Field(..., description="Security action")
    resource_type: str = Field(..., description="Resource type")
    resource_id: Optional[UUID] = Field(None, description="Resource ID")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    details: Dict[str, Any] = Field(default_factory=dict, description="Action details")
    created_at: datetime = Field(..., description="Log timestamp")


class SecurityLogResponse(BaseAuthSchema):
    """Security log response schema."""
    
    logs: List[SecurityLogEntry] = Field(..., description="Security log entries")
    total: int = Field(..., description="Total log entries")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Entries per page")


# ================================
# API RESPONSE SCHEMAS
# ================================

class StandardResponse(BaseAuthSchema):
    """Standard API response schema."""
    
    success: bool = Field(..., description="Operation success status")
    message: str = Field(..., description="Response message")
    data: Optional[Any] = Field(None, description="Response data")
    errors: Optional[List[str]] = Field(None, description="Error messages")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")


class PaginatedResponse(BaseAuthSchema):
    """Paginated response schema."""
    
    items: List[Any] = Field(..., description="Response items")
    total: int = Field(..., description="Total items")
    page: int = Field(..., description="Current page")
    per_page: int = Field(..., description="Items per page")
    pages: int = Field(..., description="Total pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")


# Forward reference updates for self-referencing models
RoleDetail.update_forward_refs()
UserLoginResponse.update_forward_refs()
UserProfileDetail.update_forward_refs()