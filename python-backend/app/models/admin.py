"""
System administration database models.

This module contains SQLAlchemy models for admin-related operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    JSON, Enum as SQLEnum, Index, UniqueConstraint, CheckConstraint, Float
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.hybrid import hybrid_property
import enum
import uuid

from .base import Base
from ..schemas.admin import (
    LogLevel, SettingType, AuditAction, HealthStatus, 
    MaintenanceType, SecurityEventType, SecurityEventSeverity,
    BackupStatus, BackupType
)


class SystemSetting(Base):
    """Model for system settings."""
    __tablename__ = "system_settings"
    __table_args__ = (
        Index('idx_setting_key', 'key'),
        Index('idx_setting_category', 'category'),
        Index('idx_setting_is_public', 'is_public'),
        Index('idx_setting_updated_at', 'updated_at'),
        UniqueConstraint('key', name='uq_setting_key'),
        CheckConstraint('char_length(key) >= 1', name='ck_setting_key_length'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(255), nullable=False, unique=True)
    value = Column(JSON, nullable=False)
    setting_type = Column(SQLEnum(SettingType), nullable=False)
    
    description = Column(Text)
    category = Column(String(100))
    
    # Permissions
    is_public = Column(Boolean, default=False)
    is_editable = Column(Boolean, default=True)
    
    # Metadata
    default_value = Column(JSON)
    validation_rules = Column(JSON, default=dict)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    updater = relationship("User")

    @validates('key')
    def validate_key(self, key_name, key_value):
        """Validate setting key format."""
        if not key_value or not key_value.strip():
            raise ValueError("Setting key cannot be empty")
        
        # Use dot notation for hierarchical settings
        import re
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9._-]*$', key_value):
            raise ValueError("Setting key must start with letter and contain only letters, numbers, dots, hyphens, and underscores")
        
        return key_value.lower()

    def __repr__(self):
        return f"<SystemSetting(key='{self.key}', type='{self.setting_type}', public={self.is_public})>"


class AuditLog(Base):
    """Model for audit logging."""
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index('idx_audit_user_id', 'user_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_resource_type', 'resource_type'),
        Index('idx_audit_resource_id', 'resource_id'),
        Index('idx_audit_timestamp', 'timestamp'),
        Index('idx_audit_ip_address', 'ip_address'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    
    action = Column(SQLEnum(AuditAction), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(255))
    
    # Event details
    details = Column(JSON, default=dict)
    old_values = Column(JSON)  # Previous values for updates
    new_values = Column(JSON)  # New values for updates
    
    # Request context
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    request_id = Column(String(36))
    session_id = Column(String(255))
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, user_id={self.user_id}, action='{self.action}', resource='{self.resource_type}')>"


class SecurityEvent(Base):
    """Model for security events and incidents."""
    __tablename__ = "security_events"
    __table_args__ = (
        Index('idx_security_event_type', 'event_type'),
        Index('idx_security_severity', 'severity'),
        Index('idx_security_user_id', 'user_id'),
        Index('idx_security_timestamp', 'timestamp'),
        Index('idx_security_resolved', 'resolved'),
        Index('idx_security_ip_address', 'ip_address'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(SQLEnum(SecurityEventType), nullable=False)
    severity = Column(SQLEnum(SecurityEventSeverity), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    
    # Related entities
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Resolution tracking
    resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Alert tracking
    alert_sent = Column(Boolean, default=False)
    alert_sent_at = Column(DateTime)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])

    def __repr__(self):
        return f"<SecurityEvent(id={self.id}, type='{self.event_type}', severity='{self.severity}', resolved={self.resolved})>"


class SystemHealth(Base):
    """Model for system health monitoring."""
    __tablename__ = "system_health"
    __table_args__ = (
        Index('idx_health_component', 'component'),
        Index('idx_health_status', 'status'),
        Index('idx_health_last_check', 'last_check'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    component = Column(String(100), nullable=False, unique=True)
    status = Column(SQLEnum(HealthStatus), nullable=False)
    
    # Health details
    message = Column(String(500))
    details = Column(JSON, default=dict)
    
    # Metrics
    response_time = Column(Float)  # in milliseconds
    uptime = Column(Integer)  # in seconds
    error_count = Column(Integer, default=0)
    
    last_check = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_error = Column(DateTime)
    
    # Alert thresholds
    warning_threshold = Column(Float)
    critical_threshold = Column(Float)

    def __repr__(self):
        return f"<SystemHealth(component='{self.component}', status='{self.status}', response_time={self.response_time})>"


class MaintenanceWindow(Base):
    """Model for scheduled maintenance windows."""
    __tablename__ = "maintenance_windows"
    __table_args__ = (
        Index('idx_maintenance_type', 'maintenance_type'),
        Index('idx_maintenance_status', 'status'),
        Index('idx_maintenance_scheduled_start', 'scheduled_start'),
        Index('idx_maintenance_created_by', 'created_by'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    maintenance_type = Column(SQLEnum(MaintenanceType), nullable=False)
    
    # Scheduling
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime)
    actual_end = Column(DateTime)
    
    # Status and impact
    status = Column(String(50), default="scheduled")  # scheduled, in_progress, completed, cancelled
    affected_services = Column(ARRAY(String), nullable=False)
    estimated_downtime = Column(Integer)  # in minutes
    
    # Communication
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime)
    public_message = Column(Text)  # Message to show users
    
    # Tracking
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="maintenance_windows")

    @validates('scheduled_start', 'scheduled_end')
    def validate_schedule(self, key, value):
        """Validate maintenance schedule."""
        if key == 'scheduled_end' and hasattr(self, 'scheduled_start') and self.scheduled_start:
            if value <= self.scheduled_start:
                raise ValueError("Maintenance end time must be after start time")
        return value

    def __repr__(self):
        return f"<MaintenanceWindow(id={self.id}, title='{self.title}', type='{self.maintenance_type}', status='{self.status}')>"


class BackupJob(Base):
    """Model for backup jobs."""
    __tablename__ = "backup_jobs"
    __table_args__ = (
        Index('idx_backup_backup_type', 'backup_type'),
        Index('idx_backup_status', 'status'),
        Index('idx_backup_started_at', 'started_at'),
        Index('idx_backup_created_by', 'created_by'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    backup_type = Column(SQLEnum(BackupType), nullable=False)
    status = Column(SQLEnum(BackupStatus), nullable=False)
    
    # Backup details
    size = Column(Integer)  # in bytes
    file_count = Column(Integer)
    location = Column(String(500), nullable=False)
    checksum = Column(String(64))  # SHA-256
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    duration = Column(Integer)  # in seconds
    
    # Error handling
    error_message = Column(Text)
    retry_count = Column(Integer, default=0)
    
    # Metadata
    backup_data = Column(JSON, default=dict)  # Additional backup metadata
    
    # Tracking
    created_by = Column(Integer, ForeignKey('users.id'))
    
    # Relationships
    creator = relationship("User")

    @hybrid_property
    def size_mb(self):
        """Get backup size in MB."""
        return round(self.size / (1024 * 1024), 2) if self.size else 0

    def __repr__(self):
        return f"<BackupJob(id='{self.id}', type='{self.backup_type}', status='{self.status}', size={self.size_mb}MB)>"


class BackupSchedule(Base):
    """Model for backup schedules."""
    __tablename__ = "backup_schedules"
    __table_args__ = (
        Index('idx_schedule_backup_type', 'backup_type'),
        Index('idx_schedule_is_enabled', 'is_enabled'),
        Index('idx_schedule_next_run', 'next_run'),
        Index('idx_schedule_created_by', 'created_by'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    backup_type = Column(SQLEnum(BackupType), nullable=False)
    
    # Schedule configuration
    cron_expression = Column(String(100), nullable=False)
    is_enabled = Column(Boolean, default=True)
    
    # Backup settings
    retention_days = Column(Integer, default=30)
    storage_location = Column(String(500), nullable=False)
    
    # Notification settings
    notification_emails = Column(ARRAY(String), default=list)
    notify_on_success = Column(Boolean, default=False)
    notify_on_failure = Column(Boolean, default=True)
    
    # Execution tracking
    last_run = Column(DateTime)
    next_run = Column(DateTime)
    last_success = Column(DateTime)
    consecutive_failures = Column(Integer, default=0)
    
    # Metadata
    backup_options = Column(JSON, default=dict)
    
    # Tracking
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")

    def __repr__(self):
        return f"<BackupSchedule(id={self.id}, name='{self.name}', type='{self.backup_type}', enabled={self.is_enabled})>"


class SystemLog(Base):
    """Model for system logs."""
    __tablename__ = "system_logs"
    __table_args__ = (
        Index('idx_log_level', 'level'),
        Index('idx_log_module', 'module'),
        Index('idx_log_user_id', 'user_id'),
        Index('idx_log_timestamp', 'timestamp'),
        Index('idx_log_session_id', 'session_id'),
        Index('idx_log_request_id', 'request_id'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    level = Column(SQLEnum(LogLevel), nullable=False)
    message = Column(Text, nullable=False)
    
    # Source information
    module = Column(String(100))
    function = Column(String(100))
    line_number = Column(Integer)
    
    # Context
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    session_id = Column(String(255))
    request_id = Column(String(36))
    
    # Additional data
    extra_data = Column(JSON, default=dict)
    stack_trace = Column(Text)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<SystemLog(id={self.id}, level='{self.level}', module='{self.module}', timestamp={self.timestamp})>"


class PerformanceAlert(Base):
    """Model for performance alerts."""
    __tablename__ = "performance_alerts"
    __table_args__ = (
        Index('idx_alert_metric', 'metric'),
        Index('idx_alert_is_enabled', 'is_enabled'),
        Index('idx_alert_last_triggered', 'last_triggered'),
        Index('idx_alert_created_by', 'created_by'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    metric = Column(String(100), nullable=False)  # cpu_usage, memory_usage, response_time, etc.
    
    # Alert condition
    condition = Column(String(50), nullable=False)  # greater_than, less_than, equals
    threshold = Column(Float, nullable=False)
    duration = Column(Integer, default=300)  # Time in seconds before triggering
    
    # Alert settings
    is_enabled = Column(Boolean, default=True)
    severity = Column(String(20), default="warning")  # info, warning, critical
    
    # Notification settings
    notification_emails = Column(ARRAY(String), nullable=False)
    webhook_url = Column(String(500))
    notification_interval = Column(Integer, default=1800)  # Seconds between notifications
    
    # Tracking
    last_triggered = Column(DateTime)
    trigger_count = Column(Integer, default=0)
    last_notification_sent = Column(DateTime)
    
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")
    alert_instances = relationship("SystemAlert", back_populates="alert_config", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PerformanceAlert(id={self.id}, name='{self.name}', metric='{self.metric}', threshold={self.threshold})>"


class SystemAlert(Base):
    """Model for system alert instances."""
    __tablename__ = "system_alerts"
    __table_args__ = (
        Index('idx_alert_instance_alert_id', 'alert_id'),
        Index('idx_alert_instance_severity', 'severity'),
        Index('idx_alert_instance_acknowledged', 'acknowledged'),
        Index('idx_alert_instance_resolved', 'resolved'),
        Index('idx_alert_instance_triggered_at', 'triggered_at'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(Integer, ForeignKey('performance_alerts.id', ondelete='CASCADE'), nullable=False)
    
    severity = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    metric_value = Column(Float, nullable=False)
    
    # Status
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey('users.id'))
    acknowledged_at = Column(DateTime)
    
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Timing
    triggered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Additional data
    context_data = Column(JSON, default=dict)
    
    # Relationships
    alert_config = relationship("PerformanceAlert", back_populates="alert_instances")
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])

    def __repr__(self):
        return f"<SystemAlert(id={self.id}, alert_id={self.alert_id}, severity='{self.severity}', resolved={self.resolved})>"


class FeatureFlag(Base):
    """Model for feature flags."""
    __tablename__ = "feature_flags"
    __table_args__ = (
        Index('idx_feature_key', 'key'),
        Index('idx_feature_is_enabled', 'is_enabled'),
        Index('idx_feature_created_by', 'created_by'),
        UniqueConstraint('key', name='uq_feature_key'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    key = Column(String(255), nullable=False, unique=True)
    description = Column(Text)
    
    # Flag configuration
    is_enabled = Column(Boolean, default=False)
    rollout_percentage = Column(Integer, default=0, nullable=False)  # 0-100
    
    # Targeting
    target_users = Column(ARRAY(Integer), default=list)
    target_roles = Column(ARRAY(String), default=list)
    conditions = Column(JSON, default=dict)
    
    # Metadata
    tags = Column(ARRAY(String), default=list)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")

    @validates('rollout_percentage')
    def validate_rollout_percentage(self, key, value):
        """Validate rollout percentage is between 0 and 100."""
        if not 0 <= value <= 100:
            raise ValueError("Rollout percentage must be between 0 and 100")
        return value

    def __repr__(self):
        return f"<FeatureFlag(id={self.id}, key='{self.key}', enabled={self.is_enabled}, rollout={self.rollout_percentage}%)>"