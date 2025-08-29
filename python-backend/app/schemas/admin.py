"""
System administration schemas for API endpoints.

This module contains Pydantic models for admin-related operations including:
- System settings management
- User and role administration
- System monitoring and health checks
- Audit logs and security events
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, EmailStr


class LogLevel(str, Enum):
    """Log level options."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class SettingType(str, Enum):
    """Setting value types."""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    JSON = "json"
    LIST = "list"


class AuditAction(str, Enum):
    """Audit action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    PERMISSION_CHANGE = "permission_change"
    SYSTEM_CHANGE = "system_change"


class HealthStatus(str, Enum):
    """System health status options."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"
    MAINTENANCE = "maintenance"


class MaintenanceType(str, Enum):
    """Maintenance types."""
    SCHEDULED = "scheduled"
    EMERGENCY = "emergency"
    UPDATE = "update"
    SECURITY = "security"


# ================================
# SYSTEM SETTINGS
# ================================

class SystemSettingBase(BaseModel):
    """Base system setting schema."""
    key: str = Field(..., description="Setting key")
    value: Union[str, int, float, bool, List[Any], Dict[str, Any]] = Field(..., description="Setting value")
    setting_type: SettingType = Field(..., description="Setting type")
    description: Optional[str] = Field(None, description="Setting description")
    category: Optional[str] = Field(None, description="Setting category")
    is_public: bool = Field(default=False, description="Whether the setting is publicly readable")
    is_editable: bool = Field(default=True, description="Whether the setting can be edited")


class SystemSettingCreate(SystemSettingBase):
    """Schema for creating a system setting."""
    pass


class SystemSettingUpdate(BaseModel):
    """Schema for updating a system setting."""
    value: Union[str, int, float, bool, List[Any], Dict[str, Any]] = Field(..., description="New setting value")
    description: Optional[str] = Field(None, description="Setting description")


class SystemSettingResponse(SystemSettingBase):
    """Schema for system setting responses."""
    id: int = Field(..., description="Setting ID")
    created_at: datetime = Field(..., description="When the setting was created")
    updated_at: Optional[datetime] = Field(None, description="When the setting was last updated")
    updated_by: Optional[int] = Field(None, description="User who last updated the setting")
    
    class Config:
        from_attributes = True


# ================================
# SYSTEM MONITORING
# ================================

class SystemHealth(BaseModel):
    """System health information."""
    status: HealthStatus = Field(..., description="Overall system health status")
    components: Dict[str, Dict[str, Any]] = Field(..., description="Component health status")
    metrics: Dict[str, Union[int, float]] = Field(..., description="System metrics")
    last_check: datetime = Field(..., description="Last health check time")
    uptime: int = Field(..., description="System uptime in seconds")
    issues: List[Dict[str, Any]] = Field(default=[], description="Current system issues")


class SystemMetrics(BaseModel):
    """System performance metrics."""
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    disk_usage: Dict[str, float] = Field(..., description="Disk usage by mount point")
    network_io: Dict[str, int] = Field(..., description="Network I/O statistics")
    database_connections: int = Field(..., description="Active database connections")
    active_users: int = Field(..., description="Number of active users")
    request_rate: float = Field(..., description="Requests per second")
    response_time: float = Field(..., description="Average response time in ms")
    error_rate: float = Field(..., description="Error rate percentage")
    timestamp: datetime = Field(..., description="Metrics timestamp")


class SystemInfo(BaseModel):
    """System information."""
    version: str = Field(..., description="System version")
    build: str = Field(..., description="Build number")
    environment: str = Field(..., description="Environment (development, staging, production)")
    started_at: datetime = Field(..., description="System start time")
    python_version: str = Field(..., description="Python version")
    database_version: str = Field(..., description="Database version")
    redis_version: Optional[str] = Field(None, description="Redis version")
    total_users: int = Field(..., description="Total number of users")
    total_modules: int = Field(..., description="Total number of modules")
    total_files: int = Field(..., description="Total number of files")
    storage_used: int = Field(..., description="Storage used in bytes")


# ================================
# AUDIT LOGS
# ================================

class AuditLogBase(BaseModel):
    """Base audit log schema."""
    action: AuditAction = Field(..., description="Action performed")
    resource_type: str = Field(..., description="Type of resource")
    resource_id: Optional[str] = Field(None, description="Resource identifier")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")


class AuditLogCreate(AuditLogBase):
    """Schema for creating an audit log entry."""
    user_id: int = Field(..., description="User who performed the action")


class AuditLogResponse(AuditLogBase):
    """Schema for audit log responses."""
    id: int = Field(..., description="Audit log ID")
    user_id: int = Field(..., description="User who performed the action")
    username: Optional[str] = Field(None, description="Username")
    timestamp: datetime = Field(..., description="When the action occurred")
    
    class Config:
        from_attributes = True


class AuditLogFilters(BaseModel):
    """Filters for audit log search."""
    user_id: Optional[int] = Field(None, description="Filter by user")
    action: Optional[AuditAction] = Field(None, description="Filter by action")
    resource_type: Optional[str] = Field(None, description="Filter by resource type")
    resource_id: Optional[str] = Field(None, description="Filter by resource ID")
    ip_address: Optional[str] = Field(None, description="Filter by IP address")
    date_from: Optional[datetime] = Field(None, description="Filter from date")
    date_to: Optional[datetime] = Field(None, description="Filter to date")


class AuditLogListResponse(BaseModel):
    """Response for audit log listing."""
    logs: List[AuditLogResponse] = Field(..., description="List of audit logs")
    total: int = Field(..., description="Total number of logs")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


# ================================
# SECURITY EVENTS
# ================================

class SecurityEventType(str, Enum):
    """Security event types."""
    LOGIN_FAILURE = "login_failure"
    BRUTE_FORCE = "brute_force"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH = "data_breach"
    MALWARE_DETECTED = "malware_detected"
    POLICY_VIOLATION = "policy_violation"


class SecurityEventSeverity(str, Enum):
    """Security event severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEvent(BaseModel):
    """Security event information."""
    id: int = Field(..., description="Event ID")
    event_type: SecurityEventType = Field(..., description="Event type")
    severity: SecurityEventSeverity = Field(..., description="Event severity")
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    details: Dict[str, Any] = Field(..., description="Event details")
    user_id: Optional[int] = Field(None, description="Related user ID")
    ip_address: Optional[str] = Field(None, description="Source IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    resolved: bool = Field(default=False, description="Whether the event is resolved")
    resolved_by: Optional[int] = Field(None, description="User who resolved the event")
    resolved_at: Optional[datetime] = Field(None, description="When the event was resolved")
    timestamp: datetime = Field(..., description="Event timestamp")
    
    class Config:
        from_attributes = True


# ================================
# SYSTEM MAINTENANCE
# ================================

class MaintenanceWindow(BaseModel):
    """System maintenance window."""
    id: int = Field(..., description="Maintenance window ID")
    title: str = Field(..., description="Maintenance title")
    description: str = Field(..., description="Maintenance description")
    maintenance_type: MaintenanceType = Field(..., description="Maintenance type")
    scheduled_start: datetime = Field(..., description="Scheduled start time")
    scheduled_end: datetime = Field(..., description="Scheduled end time")
    actual_start: Optional[datetime] = Field(None, description="Actual start time")
    actual_end: Optional[datetime] = Field(None, description="Actual end time")
    status: str = Field(..., description="Maintenance status")
    affected_services: List[str] = Field(..., description="Affected services")
    notification_sent: bool = Field(default=False, description="Whether notifications were sent")
    created_by: int = Field(..., description="User who scheduled the maintenance")
    created_at: datetime = Field(..., description="Creation time")
    
    class Config:
        from_attributes = True


class MaintenanceCreate(BaseModel):
    """Schema for creating a maintenance window."""
    title: str = Field(..., min_length=1, max_length=255, description="Maintenance title")
    description: str = Field(..., description="Maintenance description")
    maintenance_type: MaintenanceType = Field(..., description="Maintenance type")
    scheduled_start: datetime = Field(..., description="Scheduled start time")
    scheduled_end: datetime = Field(..., description="Scheduled end time")
    affected_services: List[str] = Field(..., description="Affected services")
    notify_users: bool = Field(default=True, description="Whether to notify users")


# ================================
# USER ADMINISTRATION
# ================================

class UserAdminView(BaseModel):
    """Admin view of user information."""
    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    name: str = Field(..., description="User name")
    role: str = Field(..., description="User role")
    is_active: bool = Field(..., description="Whether user is active")
    created_at: datetime = Field(..., description="User creation time")
    last_login: Optional[datetime] = Field(None, description="Last login time")
    login_count: int = Field(default=0, description="Total login count")
    storage_used: int = Field(default=0, description="Storage used in bytes")
    modules_installed: int = Field(default=0, description="Number of modules installed")
    last_activity: Optional[datetime] = Field(None, description="Last activity time")
    ip_address: Optional[str] = Field(None, description="Last known IP address")
    
    class Config:
        from_attributes = True


class UserStatisticsSummary(BaseModel):
    """User statistics summary."""
    total_users: int = Field(..., description="Total number of users")
    active_users: int = Field(..., description="Number of active users")
    new_users_today: int = Field(..., description="New users today")
    new_users_this_week: int = Field(..., description="New users this week")
    new_users_this_month: int = Field(..., description="New users this month")
    users_by_role: Dict[str, int] = Field(..., description="Users by role")
    most_active_users: List[Dict[str, Any]] = Field(..., description="Most active users")
    recent_logins: int = Field(..., description="Recent logins count")


class RoleAdministration(BaseModel):
    """Role administration information."""
    id: int = Field(..., description="Role ID")
    name: str = Field(..., description="Role name")
    description: str = Field(..., description="Role description")
    permissions: List[str] = Field(..., description="Role permissions")
    user_count: int = Field(default=0, description="Number of users with this role")
    is_system_role: bool = Field(default=False, description="Whether this is a system role")
    created_at: datetime = Field(..., description="Role creation time")
    
    class Config:
        from_attributes = True


# ================================
# SYSTEM CONFIGURATION
# ================================

class SystemConfiguration(BaseModel):
    """System configuration overview."""
    general: Dict[str, Any] = Field(..., description="General settings")
    security: Dict[str, Any] = Field(..., description="Security settings")
    email: Dict[str, Any] = Field(..., description="Email settings")
    storage: Dict[str, Any] = Field(..., description="Storage settings")
    integrations: Dict[str, Any] = Field(..., description="Integration settings")
    features: Dict[str, bool] = Field(..., description="Feature flags")


class FeatureFlag(BaseModel):
    """Feature flag configuration."""
    id: int = Field(..., description="Feature flag ID")
    name: str = Field(..., description="Feature name")
    key: str = Field(..., description="Feature key")
    description: str = Field(..., description="Feature description")
    is_enabled: bool = Field(default=False, description="Whether the feature is enabled")
    rollout_percentage: int = Field(default=0, ge=0, le=100, description="Rollout percentage")
    target_users: List[int] = Field(default=[], description="Target user IDs")
    conditions: Dict[str, Any] = Field(default={}, description="Conditions for enabling")
    created_at: datetime = Field(..., description="Creation time")
    updated_at: Optional[datetime] = Field(None, description="Last update time")
    
    class Config:
        from_attributes = True


# ================================
# BACKUP AND RECOVERY
# ================================

class BackupStatus(str, Enum):
    """Backup status options."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BackupType(str, Enum):
    """Backup types."""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    DATABASE_ONLY = "database_only"
    FILES_ONLY = "files_only"


class BackupJob(BaseModel):
    """Backup job information."""
    id: str = Field(..., description="Backup job ID")
    backup_type: BackupType = Field(..., description="Backup type")
    status: BackupStatus = Field(..., description="Backup status")
    started_at: datetime = Field(..., description="Backup start time")
    completed_at: Optional[datetime] = Field(None, description="Backup completion time")
    size: Optional[int] = Field(None, description="Backup size in bytes")
    file_count: Optional[int] = Field(None, description="Number of files backed up")
    location: str = Field(..., description="Backup storage location")
    checksum: Optional[str] = Field(None, description="Backup checksum")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_by: int = Field(..., description="User who initiated the backup")
    
    class Config:
        from_attributes = True


class BackupSchedule(BaseModel):
    """Backup schedule configuration."""
    id: int = Field(..., description="Schedule ID")
    name: str = Field(..., description="Schedule name")
    backup_type: BackupType = Field(..., description="Backup type")
    cron_expression: str = Field(..., description="Cron expression for scheduling")
    is_enabled: bool = Field(default=True, description="Whether the schedule is enabled")
    retention_days: int = Field(default=30, description="Backup retention in days")
    storage_location: str = Field(..., description="Storage location")
    notification_emails: List[EmailStr] = Field(default=[], description="Notification emails")
    last_run: Optional[datetime] = Field(None, description="Last run time")
    next_run: Optional[datetime] = Field(None, description="Next run time")
    created_at: datetime = Field(..., description="Schedule creation time")
    
    class Config:
        from_attributes = True


# ================================
# SYSTEM LOGS
# ================================

class SystemLogEntry(BaseModel):
    """System log entry."""
    id: int = Field(..., description="Log entry ID")
    level: LogLevel = Field(..., description="Log level")
    message: str = Field(..., description="Log message")
    module: Optional[str] = Field(None, description="Module that generated the log")
    function: Optional[str] = Field(None, description="Function that generated the log")
    line_number: Optional[int] = Field(None, description="Line number")
    user_id: Optional[int] = Field(None, description="Related user ID")
    session_id: Optional[str] = Field(None, description="Related session ID")
    request_id: Optional[str] = Field(None, description="Related request ID")
    extra_data: Optional[Dict[str, Any]] = Field(None, description="Extra log data")
    timestamp: datetime = Field(..., description="Log timestamp")
    
    class Config:
        from_attributes = True


class SystemLogFilters(BaseModel):
    """Filters for system log search."""
    level: Optional[LogLevel] = Field(None, description="Filter by log level")
    module: Optional[str] = Field(None, description="Filter by module")
    user_id: Optional[int] = Field(None, description="Filter by user ID")
    search: Optional[str] = Field(None, description="Search in message content")
    date_from: Optional[datetime] = Field(None, description="Filter from date")
    date_to: Optional[datetime] = Field(None, description="Filter to date")


# ================================
# PERFORMANCE MONITORING
# ================================

class PerformanceAlert(BaseModel):
    """Performance alert configuration."""
    id: int = Field(..., description="Alert ID")
    name: str = Field(..., description="Alert name")
    metric: str = Field(..., description="Metric to monitor")
    condition: str = Field(..., description="Alert condition")
    threshold: float = Field(..., description="Alert threshold")
    is_enabled: bool = Field(default=True, description="Whether the alert is enabled")
    notification_emails: List[EmailStr] = Field(..., description="Notification emails")
    webhook_url: Optional[str] = Field(None, description="Webhook URL")
    last_triggered: Optional[datetime] = Field(None, description="Last trigger time")
    trigger_count: int = Field(default=0, description="Number of times triggered")
    created_at: datetime = Field(..., description="Alert creation time")
    
    class Config:
        from_attributes = True


class SystemAlert(BaseModel):
    """System alert instance."""
    id: int = Field(..., description="Alert instance ID")
    alert_id: int = Field(..., description="Alert configuration ID")
    severity: str = Field(..., description="Alert severity")
    message: str = Field(..., description="Alert message")
    metric_value: float = Field(..., description="Metric value that triggered the alert")
    acknowledged: bool = Field(default=False, description="Whether the alert is acknowledged")
    acknowledged_by: Optional[int] = Field(None, description="User who acknowledged the alert")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledgment time")
    resolved: bool = Field(default=False, description="Whether the alert is resolved")
    resolved_at: Optional[datetime] = Field(None, description="Resolution time")
    triggered_at: datetime = Field(..., description="Alert trigger time")
    
    class Config:
        from_attributes = True