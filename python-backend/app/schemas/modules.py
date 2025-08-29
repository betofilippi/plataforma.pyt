"""
Module management schemas for API endpoints.

This module contains Pydantic models for module-related operations including:
- Module registration and installation
- Module configuration management
- Module permissions and access control
- Module statistics and monitoring
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, HttpUrl


class ModuleStatus(str, Enum):
    """Module status options."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    INSTALLING = "installing"
    FAILED = "failed"
    UPDATING = "updating"
    DEPRECATED = "deprecated"


class ModuleType(str, Enum):
    """Module type categories."""
    SYSTEM = "system"
    USER = "user"
    PLUGIN = "plugin"
    WIDGET = "widget"
    THEME = "theme"
    INTEGRATION = "integration"


class ModulePermissionLevel(str, Enum):
    """Module permission levels."""
    PUBLIC = "public"
    PRIVATE = "private"
    RESTRICTED = "restricted"
    ADMIN_ONLY = "admin_only"


# ================================
# BASE SCHEMAS
# ================================

class ModuleBase(BaseModel):
    """Base module schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Module name")
    display_name: str = Field(..., min_length=1, max_length=255, description="Display name")
    description: Optional[str] = Field(None, max_length=1000, description="Module description")
    version: str = Field(..., description="Module version")
    author: Optional[str] = Field(None, description="Module author")
    module_type: ModuleType = Field(default=ModuleType.USER, description="Type of module")
    permission_level: ModulePermissionLevel = Field(default=ModulePermissionLevel.PUBLIC, description="Permission level")
    tags: List[str] = Field(default=[], description="Module tags")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional module metadata")


class ModuleCreate(ModuleBase):
    """Schema for creating a new module."""
    source_url: Optional[HttpUrl] = Field(None, description="Source repository URL")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Module configuration")
    dependencies: List[str] = Field(default=[], description="Module dependencies")
    
    @validator('name')
    def validate_name(cls, v):
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Module name must contain only alphanumeric characters, hyphens, and underscores')
        return v.lower()


class ModuleUpdate(BaseModel):
    """Schema for updating module information."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Display name")
    description: Optional[str] = Field(None, max_length=1000, description="Module description")
    version: Optional[str] = Field(None, description="Module version")
    author: Optional[str] = Field(None, description="Module author")
    module_type: Optional[ModuleType] = Field(None, description="Type of module")
    permission_level: Optional[ModulePermissionLevel] = Field(None, description="Permission level")
    tags: Optional[List[str]] = Field(None, description="Module tags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional module metadata")
    config: Optional[Dict[str, Any]] = Field(None, description="Module configuration")


# ================================
# RESPONSE SCHEMAS
# ================================

class ModuleResponse(ModuleBase):
    """Schema for module responses."""
    id: int = Field(..., description="Module unique identifier")
    slug: str = Field(..., description="URL-safe module identifier")
    status: ModuleStatus = Field(..., description="Current module status")
    is_installed: bool = Field(default=False, description="Whether the module is installed")
    is_enabled: bool = Field(default=True, description="Whether the module is enabled")
    install_count: int = Field(default=0, description="Number of installations")
    created_at: datetime = Field(..., description="When the module was created")
    updated_at: Optional[datetime] = Field(None, description="When the module was last updated")
    installed_at: Optional[datetime] = Field(None, description="When the module was installed")
    last_used: Optional[datetime] = Field(None, description="When the module was last used")
    
    class Config:
        from_attributes = True


class ModuleDetail(ModuleResponse):
    """Detailed module information."""
    source_url: Optional[HttpUrl] = Field(None, description="Source repository URL")
    config: Dict[str, Any] = Field(default={}, description="Module configuration")
    dependencies: List[str] = Field(default=[], description="Module dependencies")
    permissions: List[str] = Field(default=[], description="Required permissions")
    statistics: Optional[Dict[str, Any]] = Field(None, description="Usage statistics")
    health_status: Optional[Dict[str, Any]] = Field(None, description="Module health information")


class ModuleInstallation(BaseModel):
    """Module installation information."""
    id: int = Field(..., description="Installation ID")
    module_id: int = Field(..., description="Module ID")
    user_id: int = Field(..., description="User who installed the module")
    version: str = Field(..., description="Installed version")
    config: Dict[str, Any] = Field(default={}, description="Installation-specific configuration")
    status: ModuleStatus = Field(..., description="Installation status")
    installed_at: datetime = Field(..., description="When the module was installed")
    last_updated: Optional[datetime] = Field(None, description="Last update time")
    
    class Config:
        from_attributes = True


# ================================
# CONFIGURATION SCHEMAS
# ================================

class ModuleConfigSchema(BaseModel):
    """Module configuration schema definition."""
    key: str = Field(..., description="Configuration key")
    type: str = Field(..., description="Value type (string, number, boolean, object)")
    label: str = Field(..., description="Human-readable label")
    description: Optional[str] = Field(None, description="Configuration description")
    default_value: Optional[Any] = Field(None, description="Default value")
    required: bool = Field(default=False, description="Whether the configuration is required")
    validation: Optional[Dict[str, Any]] = Field(None, description="Validation rules")


class ModuleConfiguration(BaseModel):
    """Module configuration values."""
    module_id: int = Field(..., description="Module ID")
    config: Dict[str, Any] = Field(..., description="Configuration values")
    schema: List[ModuleConfigSchema] = Field(default=[], description="Configuration schema")


class ModuleConfigUpdate(BaseModel):
    """Schema for updating module configuration."""
    config: Dict[str, Any] = Field(..., description="Updated configuration values")
    validate_schema: bool = Field(default=True, description="Whether to validate against schema")


# ================================
# PERMISSIONS SCHEMAS
# ================================

class ModulePermission(BaseModel):
    """Module permission definition."""
    id: int = Field(..., description="Permission ID")
    module_id: int = Field(..., description="Module ID")
    permission: str = Field(..., description="Permission name")
    description: str = Field(..., description="Permission description")
    resource: Optional[str] = Field(None, description="Resource this permission applies to")
    actions: List[str] = Field(..., description="Allowed actions")
    
    class Config:
        from_attributes = True


class ModuleUserPermission(BaseModel):
    """User permission for a module."""
    user_id: int = Field(..., description="User ID")
    module_id: int = Field(..., description="Module ID")
    permissions: List[str] = Field(..., description="Granted permissions")
    granted_by: int = Field(..., description="User ID who granted permissions")
    granted_at: datetime = Field(..., description="When permissions were granted")
    expires_at: Optional[datetime] = Field(None, description="When permissions expire")
    
    class Config:
        from_attributes = True


class ModulePermissionGrant(BaseModel):
    """Schema for granting module permissions."""
    user_id: int = Field(..., description="User ID to grant permissions to")
    permissions: List[str] = Field(..., description="Permissions to grant")
    expires_at: Optional[datetime] = Field(None, description="When permissions should expire")


# ================================
# SEARCH AND FILTERING
# ================================

class ModuleSearchFilters(BaseModel):
    """Filters for module search."""
    search: Optional[str] = Field(None, description="Search term for name/description")
    module_type: Optional[ModuleType] = Field(None, description="Filter by module type")
    status: Optional[ModuleStatus] = Field(None, description="Filter by status")
    permission_level: Optional[ModulePermissionLevel] = Field(None, description="Filter by permission level")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    author: Optional[str] = Field(None, description="Filter by author")
    installed_only: Optional[bool] = Field(None, description="Show only installed modules")
    enabled_only: Optional[bool] = Field(None, description="Show only enabled modules")


class ModuleSortOption(str, Enum):
    """Module sorting options."""
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    INSTALL_COUNT_ASC = "install_count_asc"
    INSTALL_COUNT_DESC = "install_count_desc"
    LAST_USED_ASC = "last_used_asc"
    LAST_USED_DESC = "last_used_desc"


class ModuleListParams(BaseModel):
    """Parameters for module listing."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: ModuleSortOption = Field(default=ModuleSortOption.CREATED_DESC, description="Sort option")
    filters: Optional[ModuleSearchFilters] = Field(None, description="Search filters")


class ModuleListResponse(BaseModel):
    """Response for module listing."""
    modules: List[ModuleResponse] = Field(..., description="List of modules")
    total: int = Field(..., description="Total number of modules")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ================================
# STATISTICS AND MONITORING
# ================================

class ModuleStatistics(BaseModel):
    """Module statistics and analytics."""
    total_modules: int = Field(..., description="Total number of modules")
    installed_modules: int = Field(..., description="Number of installed modules")
    active_modules: int = Field(..., description="Number of active modules")
    modules_by_type: Dict[str, int] = Field(..., description="Module count by type")
    popular_modules: List[Dict[str, Any]] = Field(..., description="Most popular modules")
    recent_installations: int = Field(..., description="Recent installations count")
    usage_statistics: Dict[str, Any] = Field(..., description="Usage statistics")


class ModuleHealth(BaseModel):
    """Module health information."""
    module_id: int = Field(..., description="Module ID")
    status: ModuleStatus = Field(..., description="Current status")
    health_score: float = Field(..., ge=0.0, le=1.0, description="Health score (0-1)")
    last_check: datetime = Field(..., description="Last health check time")
    issues: List[str] = Field(default=[], description="Current issues")
    performance_metrics: Dict[str, Any] = Field(default={}, description="Performance metrics")
    dependencies_status: Dict[str, str] = Field(default={}, description="Dependencies health")


class ModuleUsageMetrics(BaseModel):
    """Module usage metrics."""
    module_id: int = Field(..., description="Module ID")
    total_uses: int = Field(..., description="Total number of uses")
    unique_users: int = Field(..., description="Number of unique users")
    avg_session_duration: Optional[float] = Field(None, description="Average session duration in minutes")
    last_7_days: Dict[str, int] = Field(..., description="Usage over last 7 days")
    peak_usage_time: Optional[str] = Field(None, description="Peak usage time")
    performance_score: Optional[float] = Field(None, description="Performance score")


# ================================
# MODULE LIFECYCLE
# ================================

class ModuleInstallRequest(BaseModel):
    """Request to install a module."""
    module_id: int = Field(..., description="Module ID to install")
    version: Optional[str] = Field(None, description="Specific version to install")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Installation configuration")
    auto_enable: bool = Field(default=True, description="Whether to enable after installation")


class ModuleInstallResponse(BaseModel):
    """Response for module installation."""
    installation_id: int = Field(..., description="Installation ID")
    status: ModuleStatus = Field(..., description="Installation status")
    message: str = Field(..., description="Installation message")
    progress: Optional[float] = Field(None, description="Installation progress (0-1)")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")


class ModuleUninstallRequest(BaseModel):
    """Request to uninstall a module."""
    keep_data: bool = Field(default=False, description="Whether to keep module data")
    force: bool = Field(default=False, description="Force uninstall even if dependencies exist")


class ModuleUpdateRequest(BaseModel):
    """Request to update a module."""
    version: Optional[str] = Field(None, description="Target version (latest if not specified)")
    backup_config: bool = Field(default=True, description="Whether to backup configuration")
    auto_restart: bool = Field(default=True, description="Whether to restart module after update")


# ================================
# MARKETPLACE INTEGRATION
# ================================

class ModuleMarketplaceInfo(BaseModel):
    """Module marketplace information."""
    marketplace_id: str = Field(..., description="Marketplace ID")
    rating: Optional[float] = Field(None, ge=0.0, le=5.0, description="User rating")
    reviews_count: int = Field(default=0, description="Number of reviews")
    download_count: int = Field(default=0, description="Download count")
    price: Optional[float] = Field(None, description="Module price")
    license: Optional[str] = Field(None, description="License type")
    screenshots: List[HttpUrl] = Field(default=[], description="Screenshot URLs")
    documentation_url: Optional[HttpUrl] = Field(None, description="Documentation URL")


class ModuleReview(BaseModel):
    """Module review."""
    id: int = Field(..., description="Review ID")
    module_id: int = Field(..., description="Module ID")
    user_id: int = Field(..., description="Reviewer user ID")
    rating: float = Field(..., ge=0.0, le=5.0, description="Rating (0-5)")
    title: str = Field(..., description="Review title")
    content: str = Field(..., description="Review content")
    created_at: datetime = Field(..., description="Review creation time")
    helpful_votes: int = Field(default=0, description="Number of helpful votes")
    
    class Config:
        from_attributes = True


# ================================
# BULK OPERATIONS
# ================================

class ModuleBulkAction(str, Enum):
    """Bulk actions for modules."""
    ENABLE = "enable"
    DISABLE = "disable"
    INSTALL = "install"
    UNINSTALL = "uninstall"
    UPDATE = "update"
    DELETE = "delete"


class ModuleBulkOperation(BaseModel):
    """Bulk operation on modules."""
    module_ids: List[int] = Field(..., min_items=1, description="List of module IDs")
    action: ModuleBulkAction = Field(..., description="Action to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Action parameters")


class ModuleBulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[Dict[str, Any]] = Field(default=[], description="List of errors")
    processed_ids: List[int] = Field(..., description="List of processed module IDs")