"""
User management schemas for API endpoints.

This module contains Pydantic models for user-related operations including:
- User CRUD operations
- Profile management
- User search and filtering
- User statistics and analytics
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, validator


class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    USER = "user"
    MODERATOR = "moderator"
    VIEWER = "viewer"


class UserStatus(str, Enum):
    """User status options."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


# ================================
# BASE SCHEMAS
# ================================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User's email address")
    name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    role: UserRole = Field(default=UserRole.USER, description="User's role in the system")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional user metadata")


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=128, description="User's password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = Field(None, description="User's email address")
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="User's full name")
    role: Optional[UserRole] = Field(None, description="User's role in the system")
    is_active: Optional[bool] = Field(None, description="Whether the user account is active")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional user metadata")


class UserPasswordChange(BaseModel):
    """Schema for changing user password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="New password confirmation")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


# ================================
# RESPONSE SCHEMAS
# ================================

class UserResponse(UserBase):
    """Schema for user responses."""
    id: int = Field(..., description="User's unique identifier")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: Optional[datetime] = Field(None, description="When the user was last updated")
    last_login: Optional[datetime] = Field(None, description="User's last login time")
    active_sessions: int = Field(default=0, description="Number of active sessions")
    
    class Config:
        from_attributes = True


class UserProfile(BaseModel):
    """Extended user profile information."""
    id: int = Field(..., description="User's unique identifier")
    email: EmailStr = Field(..., description="User's email address")
    name: str = Field(..., description="User's full name")
    role: UserRole = Field(..., description="User's role in the system")
    is_active: bool = Field(..., description="Whether the user account is active")
    created_at: datetime = Field(..., description="When the user was created")
    last_login: Optional[datetime] = Field(None, description="User's last login time")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional user metadata")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    statistics: Optional[Dict[str, Any]] = Field(None, description="User statistics")
    
    class Config:
        from_attributes = True


class UserSession(BaseModel):
    """User session information."""
    id: str = Field(..., description="Session ID")
    user_id: int = Field(..., description="User ID")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    created_at: datetime = Field(..., description="Session creation time")
    expires_at: datetime = Field(..., description="Session expiration time")
    is_active: bool = Field(default=True, description="Whether the session is active")
    
    class Config:
        from_attributes = True


# ================================
# SEARCH AND FILTERING
# ================================

class UserSearchFilters(BaseModel):
    """Filters for user search."""
    search: Optional[str] = Field(None, description="Search term for name/email")
    role: Optional[UserRole] = Field(None, description="Filter by role")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    has_active_sessions: Optional[bool] = Field(None, description="Filter by active sessions")


class UserSortOption(str, Enum):
    """User sorting options."""
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    EMAIL_ASC = "email_asc"
    EMAIL_DESC = "email_desc"
    LAST_LOGIN_ASC = "last_login_asc"
    LAST_LOGIN_DESC = "last_login_desc"


class UserListParams(BaseModel):
    """Parameters for user listing."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: UserSortOption = Field(default=UserSortOption.CREATED_DESC, description="Sort option")
    filters: Optional[UserSearchFilters] = Field(None, description="Search filters")


class UserListResponse(BaseModel):
    """Response for user listing."""
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ================================
# STATISTICS AND ANALYTICS
# ================================

class UserStatistics(BaseModel):
    """User statistics and analytics."""
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    new_users_today: int = Field(..., description="New users registered today")
    new_users_this_week: int = Field(..., description="New users registered this week")
    new_users_this_month: int = Field(..., description="New users registered this month")
    users_by_role: Dict[str, int] = Field(..., description="User count by role")
    active_sessions: int = Field(..., description="Number of active sessions")
    login_activity: List[Dict[str, Any]] = Field(..., description="Recent login activity")


class UserActivityLog(BaseModel):
    """User activity log entry."""
    id: int = Field(..., description="Log entry ID")
    user_id: int = Field(..., description="User ID")
    action: str = Field(..., description="Action performed")
    resource: Optional[str] = Field(None, description="Resource affected")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="When the action occurred")
    
    class Config:
        from_attributes = True


# ================================
# BULK OPERATIONS
# ================================

class UserBulkAction(str, Enum):
    """Bulk actions for users."""
    ACTIVATE = "activate"
    DEACTIVATE = "deactivate"
    DELETE = "delete"
    CHANGE_ROLE = "change_role"
    SEND_EMAIL = "send_email"


class UserBulkOperation(BaseModel):
    """Bulk operation on users."""
    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs")
    action: UserBulkAction = Field(..., description="Action to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Action parameters")


class UserBulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[Dict[str, Any]] = Field(default=[], description="List of errors")
    processed_ids: List[int] = Field(..., description="List of processed user IDs")


# ================================
# PREFERENCES AND SETTINGS
# ================================

class UserPreferences(BaseModel):
    """User preferences schema."""
    theme: str = Field(default="light", description="UI theme preference")
    language: str = Field(default="en", description="Language preference")
    timezone: str = Field(default="UTC", description="Timezone preference")
    notifications: Dict[str, bool] = Field(default={}, description="Notification settings")
    dashboard_settings: Dict[str, Any] = Field(default={}, description="Dashboard preferences")
    privacy_settings: Dict[str, bool] = Field(default={}, description="Privacy settings")


class UserPreferencesUpdate(BaseModel):
    """Schema for updating user preferences."""
    theme: Optional[str] = Field(None, description="UI theme preference")
    language: Optional[str] = Field(None, description="Language preference")
    timezone: Optional[str] = Field(None, description="Timezone preference")
    notifications: Optional[Dict[str, bool]] = Field(None, description="Notification settings")
    dashboard_settings: Optional[Dict[str, Any]] = Field(None, description="Dashboard preferences")
    privacy_settings: Optional[Dict[str, bool]] = Field(None, description="Privacy settings")


# ================================
# ADMIN OPERATIONS
# ================================

class AdminUserAction(BaseModel):
    """Admin action on user account."""
    action: str = Field(..., description="Action to perform")
    reason: Optional[str] = Field(None, description="Reason for the action")
    duration: Optional[int] = Field(None, description="Duration in hours (for temporary actions)")
    notify_user: bool = Field(default=True, description="Whether to notify the user")


class AdminUserActionResponse(BaseModel):
    """Response for admin actions."""
    success: bool = Field(..., description="Whether the action was successful")
    message: str = Field(..., description="Action result message")
    action_id: Optional[str] = Field(None, description="Action ID for tracking")
    effective_at: datetime = Field(..., description="When the action took effect")