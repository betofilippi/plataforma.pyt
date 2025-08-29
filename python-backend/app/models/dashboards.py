"""
Dashboard management database models.

This module contains SQLAlchemy models for dashboard-related operations.
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
from ..schemas.dashboard import (
    WidgetType, ChartType, DashboardPermissionLevel, RefreshInterval
)


class Dashboard(Base):
    """Dashboard model for storing dashboard information."""
    __tablename__ = "dashboards"
    __table_args__ = (
        Index('idx_dashboard_owner_id', 'owner_id'),
        Index('idx_dashboard_slug', 'slug'),
        Index('idx_dashboard_created_at', 'created_at'),
        Index('idx_dashboard_updated_at', 'updated_at'),
        Index('idx_dashboard_is_public', 'is_public'),
        Index('idx_dashboard_folder_id', 'folder_id'),
        UniqueConstraint('owner_id', 'slug', name='uq_dashboard_owner_slug'),
        CheckConstraint('char_length(name) >= 1', name='ck_dashboard_name_length'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    folder_id = Column(Integer, ForeignKey('dashboard_folders.id', ondelete='SET NULL'))
    
    # Dashboard settings
    is_public = Column(Boolean, default=False)
    refresh_interval = Column(SQLEnum(RefreshInterval), default=RefreshInterval.EVERY_30S)
    layout = Column(JSON, default=dict)
    theme = Column(String(100), default="default")
    metadata = Column(JSON, default=dict)
    
    # Display settings
    tags = Column(ARRAY(String), default=list)
    
    # Usage tracking
    view_count = Column(Integer, default=0)
    last_viewed = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="dashboards")
    folder = relationship("DashboardFolder", back_populates="dashboards")
    widgets = relationship("Widget", back_populates="dashboard", cascade="all, delete-orphan")
    permissions = relationship("DashboardPermission", back_populates="dashboard", cascade="all, delete-orphan")
    public_links = relationship("DashboardPublicLink", back_populates="dashboard", cascade="all, delete-orphan")
    statistics = relationship("DashboardStatistics", back_populates="dashboard", cascade="all, delete-orphan")

    @validates('slug')
    def validate_slug(self, key, slug):
        """Validate dashboard slug format."""
        if not slug:
            # Generate slug from name if not provided
            import re
            slug = re.sub(r'[^a-zA-Z0-9-]', '-', self.name.lower())
            slug = re.sub(r'-+', '-', slug).strip('-')
        
        import re
        if not re.match(r'^[a-z0-9-]+$', slug):
            raise ValueError("Dashboard slug can only contain lowercase letters, numbers, and hyphens")
        
        return slug

    @hybrid_property
    def widget_count(self):
        """Get the number of widgets in this dashboard."""
        return len(self.widgets)

    @hybrid_property
    def shared_user_count(self):
        """Get the number of users with access to this dashboard."""
        return len([p for p in self.permissions if p.permission_level != DashboardPermissionLevel.OWNER])

    def __repr__(self):
        return f"<Dashboard(name='{self.name}', owner_id={self.owner_id}, public={self.is_public})>"


class DashboardFolder(Base):
    """Model for organizing dashboards in folders."""
    __tablename__ = "dashboard_folders"
    __table_args__ = (
        Index('idx_folder_owner_id', 'owner_id'),
        Index('idx_folder_parent_id', 'parent_id'),
        Index('idx_folder_path', 'path'),
        UniqueConstraint('owner_id', 'parent_id', 'name', name='uq_folder_owner_parent_name'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_id = Column(Integer, ForeignKey('dashboard_folders.id', ondelete='CASCADE'))
    
    # Display settings
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    path = Column(String(1000))  # Full path for efficient queries
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="dashboard_folders")
    parent = relationship("DashboardFolder", remote_side=[id], back_populates="children")
    children = relationship("DashboardFolder", back_populates="parent", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="folder")

    @validates('path')
    def update_path(self, key, path):
        """Update path when parent changes."""
        if self.parent:
            return f"{self.parent.path}/{self.name}"
        return f"/{self.name}"

    def __repr__(self):
        return f"<DashboardFolder(name='{self.name}', owner_id={self.owner_id}, path='{self.path}')>"


class Widget(Base):
    """Widget model for dashboard components."""
    __tablename__ = "widgets"
    __table_args__ = (
        Index('idx_widget_dashboard_id', 'dashboard_id'),
        Index('idx_widget_type', 'widget_type'),
        Index('idx_widget_created_at', 'created_at'),
        CheckConstraint('char_length(title) >= 1', name='ck_widget_title_length'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(Integer, ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False)
    
    title = Column(String(255), nullable=False)
    widget_type = Column(SQLEnum(WidgetType), nullable=False)
    config = Column(JSON, default=dict)
    position = Column(JSON, nullable=False)  # x, y, width, height
    
    # Data settings
    data_source = Column(String(255))
    refresh_interval = Column(SQLEnum(RefreshInterval))
    
    # Display settings
    is_visible = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_data_update = Column(DateTime)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="widgets")
    data_cache = relationship("WidgetDataCache", back_populates="widget", cascade="all, delete-orphan")

    @validates('position')
    def validate_position(self, key, position):
        """Validate widget position format."""
        if not isinstance(position, dict):
            raise ValueError("Widget position must be a dictionary")
        
        required_fields = ['x', 'y', 'width', 'height']
        if not all(field in position for field in required_fields):
            raise ValueError(f"Widget position must contain: {required_fields}")
        
        # Validate numeric values
        for field in required_fields:
            if not isinstance(position[field], (int, float)):
                raise ValueError(f"Widget position {field} must be a number")
        
        return position

    def __repr__(self):
        return f"<Widget(title='{self.title}', type='{self.widget_type}', dashboard_id={self.dashboard_id})>"


class WidgetDataCache(Base):
    """Model for caching widget data."""
    __tablename__ = "widget_data_cache"
    __table_args__ = (
        Index('idx_cache_widget_id', 'widget_id'),
        Index('idx_cache_timestamp', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    widget_id = Column(Integer, ForeignKey('widgets.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    data = Column(JSON, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime)
    source = Column(String(255))
    
    # Relationships
    widget = relationship("Widget", back_populates="data_cache")

    def __repr__(self):
        return f"<WidgetDataCache(widget_id={self.widget_id}, timestamp={self.timestamp})>"


class DashboardPermission(Base):
    """Model for dashboard sharing permissions."""
    __tablename__ = "dashboard_permissions"
    __table_args__ = (
        Index('idx_permission_dashboard_id', 'dashboard_id'),
        Index('idx_permission_user_id', 'user_id'),
        Index('idx_permission_granted_at', 'granted_at'),
        UniqueConstraint('dashboard_id', 'user_id', name='uq_dashboard_user_permission'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(Integer, ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    permission_level = Column(SQLEnum(DashboardPermissionLevel), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="permissions")
    user = relationship("User", foreign_keys=[user_id], back_populates="dashboard_permissions")
    granted_by_user = relationship("User", foreign_keys=[granted_by])

    def __repr__(self):
        return f"<DashboardPermission(dashboard_id={self.dashboard_id}, user_id={self.user_id}, level='{self.permission_level}')>"


class DashboardPublicLink(Base):
    """Model for public dashboard links."""
    __tablename__ = "dashboard_public_links"
    __table_args__ = (
        Index('idx_public_link_dashboard_id', 'dashboard_id'),
        Index('idx_public_link_token', 'token'),
        Index('idx_public_link_created_at', 'created_at'),
        UniqueConstraint('token', name='uq_public_link_token'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dashboard_id = Column(Integer, ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    expires_at = Column(DateTime)
    view_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="public_links")
    creator = relationship("User")

    def __repr__(self):
        return f"<DashboardPublicLink(dashboard_id={self.dashboard_id}, token='{self.token[:10]}...', views={self.view_count})>"


class DashboardStatistics(Base):
    """Model for tracking dashboard statistics."""
    __tablename__ = "dashboard_statistics"
    __table_args__ = (
        Index('idx_stats_dashboard_id', 'dashboard_id'),
        Index('idx_stats_date', 'date'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    dashboard_id = Column(Integer, ForeignKey('dashboards.id', ondelete='CASCADE'), nullable=False)
    
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    view_count = Column(Integer, default=0)
    unique_viewers = Column(Integer, default=0)
    avg_view_duration = Column(Integer)  # in seconds
    widget_interactions = Column(Integer, default=0)
    
    # Performance metrics
    load_time = Column(Float)  # in seconds
    error_count = Column(Integer, default=0)
    
    # Relationships
    dashboard = relationship("Dashboard", back_populates="statistics")

    def __repr__(self):
        return f"<DashboardStatistics(dashboard_id={self.dashboard_id}, date={self.date}, views={self.view_count})>"


class DashboardTemplate(Base):
    """Model for dashboard templates."""
    __tablename__ = "dashboard_templates"
    __table_args__ = (
        Index('idx_template_category', 'category'),
        Index('idx_template_created_by', 'created_by'),
        Index('idx_template_usage_count', 'usage_count'),
        Index('idx_template_created_at', 'created_at'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    preview_image = Column(String(500))
    
    template_data = Column(JSON, nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    usage_count = Column(Integer, default=0)
    
    # Visibility
    is_public = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="dashboard_templates")

    def __repr__(self):
        return f"<DashboardTemplate(name='{self.name}', category='{self.category}', usage={self.usage_count})>"


class KPIMetric(Base):
    """Model for storing KPI metric definitions."""
    __tablename__ = "kpi_metrics"
    __table_args__ = (
        Index('idx_kpi_identifier', 'identifier'),
        Index('idx_kpi_category', 'category'),
        Index('idx_kpi_created_by', 'created_by'),
        UniqueConstraint('identifier', name='uq_kpi_identifier'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    identifier = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    
    # Calculation settings
    query = Column(Text)  # SQL query or data source
    calculation_method = Column(String(100))  # sum, avg, count, etc.
    data_source = Column(String(255))
    
    # Display settings
    format_type = Column(String(50), default="number")  # number, currency, percentage, etc.
    unit = Column(String(20))
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    
    # Thresholds for alerts
    warning_threshold = Column(Float)
    critical_threshold = Column(Float)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    refresh_interval = Column(Integer, default=300)  # seconds
    
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")
    data_points = relationship("KPIDataPoint", back_populates="metric", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<KPIMetric(identifier='{self.identifier}', name='{self.name}')>"


class KPIDataPoint(Base):
    """Model for storing KPI metric data points."""
    __tablename__ = "kpi_data_points"
    __table_args__ = (
        Index('idx_kpi_data_metric_id', 'metric_id'),
        Index('idx_kpi_data_timestamp', 'timestamp'),
        Index('idx_kpi_data_metric_timestamp', 'metric_id', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_id = Column(Integer, ForeignKey('kpi_metrics.id', ondelete='CASCADE'), nullable=False)
    
    value = Column(Float, nullable=False)
    previous_value = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Trend calculation
    change_percentage = Column(Float)
    trend = Column(String(10))  # up, down, stable
    
    # Metadata
    metadata = Column(JSON, default=dict)
    
    # Relationships
    metric = relationship("KPIMetric", back_populates="data_points")

    def __repr__(self):
        return f"<KPIDataPoint(metric_id={self.metric_id}, value={self.value}, timestamp={self.timestamp})>"