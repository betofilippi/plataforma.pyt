"""
Dashboard management schemas for API endpoints.

This module contains Pydantic models for dashboard-related operations including:
- Dashboard configuration management
- Widget management and layouts
- Dashboard sharing and permissions
- Real-time dashboard updates
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator


class WidgetType(str, Enum):
    """Widget type categories."""
    CHART = "chart"
    METRIC = "metric"
    TABLE = "table"
    TEXT = "text"
    IMAGE = "image"
    MAP = "map"
    GAUGE = "gauge"
    PROGRESS = "progress"
    LIST = "list"
    CUSTOM = "custom"


class ChartType(str, Enum):
    """Chart type options."""
    LINE = "line"
    BAR = "bar"
    AREA = "area"
    PIE = "pie"
    DOUGHNUT = "doughnut"
    SCATTER = "scatter"
    BUBBLE = "bubble"
    RADAR = "radar"


class DashboardPermissionLevel(str, Enum):
    """Dashboard permission levels."""
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"
    PUBLIC = "public"


class RefreshInterval(str, Enum):
    """Dashboard refresh intervals."""
    MANUAL = "manual"
    REAL_TIME = "real_time"
    EVERY_5S = "5s"
    EVERY_10S = "10s"
    EVERY_30S = "30s"
    EVERY_1M = "1m"
    EVERY_5M = "5m"
    EVERY_15M = "15m"
    EVERY_30M = "30m"
    EVERY_1H = "1h"


# ================================
# BASE SCHEMAS
# ================================

class DashboardBase(BaseModel):
    """Base dashboard schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Dashboard name")
    description: Optional[str] = Field(None, max_length=1000, description="Dashboard description")
    is_public: bool = Field(default=False, description="Whether the dashboard is public")
    refresh_interval: RefreshInterval = Field(default=RefreshInterval.EVERY_30S, description="Refresh interval")
    layout: Dict[str, Any] = Field(default={}, description="Dashboard layout configuration")
    theme: str = Field(default="default", description="Dashboard theme")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional dashboard metadata")


class DashboardCreate(DashboardBase):
    """Schema for creating a new dashboard."""
    folder_id: Optional[int] = Field(None, description="Parent folder ID")
    tags: List[str] = Field(default=[], description="Dashboard tags")
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Dashboard name cannot be empty')
        return v.strip()


class DashboardUpdate(BaseModel):
    """Schema for updating dashboard information."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Dashboard name")
    description: Optional[str] = Field(None, max_length=1000, description="Dashboard description")
    is_public: Optional[bool] = Field(None, description="Whether the dashboard is public")
    refresh_interval: Optional[RefreshInterval] = Field(None, description="Refresh interval")
    layout: Optional[Dict[str, Any]] = Field(None, description="Dashboard layout configuration")
    theme: Optional[str] = Field(None, description="Dashboard theme")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional dashboard metadata")
    folder_id: Optional[int] = Field(None, description="Parent folder ID")
    tags: Optional[List[str]] = Field(None, description="Dashboard tags")


# ================================
# WIDGET SCHEMAS
# ================================

class WidgetBase(BaseModel):
    """Base widget schema."""
    title: str = Field(..., min_length=1, max_length=255, description="Widget title")
    widget_type: WidgetType = Field(..., description="Type of widget")
    config: Dict[str, Any] = Field(default={}, description="Widget configuration")
    position: Dict[str, Union[int, float]] = Field(..., description="Widget position and size")
    data_source: Optional[str] = Field(None, description="Data source identifier")
    refresh_interval: Optional[RefreshInterval] = Field(None, description="Widget refresh interval")
    is_visible: bool = Field(default=True, description="Whether the widget is visible")


class WidgetCreate(WidgetBase):
    """Schema for creating a widget."""
    dashboard_id: int = Field(..., description="Dashboard ID")


class WidgetUpdate(BaseModel):
    """Schema for updating a widget."""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Widget title")
    widget_type: Optional[WidgetType] = Field(None, description="Type of widget")
    config: Optional[Dict[str, Any]] = Field(None, description="Widget configuration")
    position: Optional[Dict[str, Union[int, float]]] = Field(None, description="Widget position and size")
    data_source: Optional[str] = Field(None, description="Data source identifier")
    refresh_interval: Optional[RefreshInterval] = Field(None, description="Widget refresh interval")
    is_visible: Optional[bool] = Field(None, description="Whether the widget is visible")


class WidgetResponse(WidgetBase):
    """Schema for widget responses."""
    id: int = Field(..., description="Widget unique identifier")
    dashboard_id: int = Field(..., description="Dashboard ID")
    created_at: datetime = Field(..., description="When the widget was created")
    updated_at: Optional[datetime] = Field(None, description="When the widget was last updated")
    last_data_update: Optional[datetime] = Field(None, description="Last data update time")
    
    class Config:
        from_attributes = True


# ================================
# DASHBOARD RESPONSES
# ================================

class DashboardResponse(DashboardBase):
    """Schema for dashboard responses."""
    id: int = Field(..., description="Dashboard unique identifier")
    slug: str = Field(..., description="URL-safe dashboard identifier")
    owner_id: int = Field(..., description="Dashboard owner ID")
    folder_id: Optional[int] = Field(None, description="Parent folder ID")
    created_at: datetime = Field(..., description="When the dashboard was created")
    updated_at: Optional[datetime] = Field(None, description="When the dashboard was last updated")
    last_viewed: Optional[datetime] = Field(None, description="When the dashboard was last viewed")
    view_count: int = Field(default=0, description="Number of views")
    tags: List[str] = Field(default=[], description="Dashboard tags")
    
    class Config:
        from_attributes = True


class DashboardDetail(DashboardResponse):
    """Detailed dashboard information."""
    widgets: List[WidgetResponse] = Field(default=[], description="Dashboard widgets")
    permissions: List[Dict[str, Any]] = Field(default=[], description="Dashboard permissions")
    shared_users: List[Dict[str, Any]] = Field(default=[], description="Users with access")
    statistics: Optional[Dict[str, Any]] = Field(None, description="Dashboard statistics")


# ================================
# KPI AND METRICS
# ================================

class KPIMetric(BaseModel):
    """KPI metric definition."""
    id: str = Field(..., description="Metric identifier")
    name: str = Field(..., description="Metric name")
    value: Union[int, float, str] = Field(..., description="Current value")
    previous_value: Optional[Union[int, float]] = Field(None, description="Previous value")
    change: Optional[float] = Field(None, description="Change percentage")
    trend: Optional[str] = Field(None, description="Trend direction (up, down, stable)")
    format: str = Field(default="number", description="Display format")
    unit: Optional[str] = Field(None, description="Value unit")
    color: Optional[str] = Field(None, description="Display color")
    icon: Optional[str] = Field(None, description="Display icon")


class KPIResponse(BaseModel):
    """KPI metrics response."""
    metrics: List[KPIMetric] = Field(..., description="List of KPI metrics")
    timestamp: datetime = Field(..., description="Data timestamp")
    refresh_interval: int = Field(..., description="Refresh interval in seconds")


# ================================
# CHART DATA
# ================================

class ChartDataPoint(BaseModel):
    """Chart data point."""
    x: Union[str, int, float, datetime] = Field(..., description="X-axis value")
    y: Union[int, float] = Field(..., description="Y-axis value")
    label: Optional[str] = Field(None, description="Data point label")
    color: Optional[str] = Field(None, description="Data point color")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ChartSeries(BaseModel):
    """Chart data series."""
    name: str = Field(..., description="Series name")
    data: List[ChartDataPoint] = Field(..., description="Series data points")
    color: Optional[str] = Field(None, description="Series color")
    type: Optional[ChartType] = Field(None, description="Chart type for this series")


class ChartData(BaseModel):
    """Chart data structure."""
    series: List[ChartSeries] = Field(..., description="Chart data series")
    categories: Optional[List[str]] = Field(None, description="Chart categories")
    chart_type: ChartType = Field(..., description="Chart type")
    options: Dict[str, Any] = Field(default={}, description="Chart options")
    timestamp: datetime = Field(..., description="Data timestamp")


class ChartResponse(BaseModel):
    """Chart data response."""
    success: bool = Field(..., description="Response success status")
    data: ChartData = Field(..., description="Chart data")
    type: str = Field(..., description="Chart type requested")
    period: str = Field(..., description="Data period")
    timestamp: datetime = Field(..., description="Response timestamp")


# ================================
# DASHBOARD STATISTICS
# ================================

class DashboardStatistics(BaseModel):
    """Dashboard usage statistics."""
    total_dashboards: int = Field(..., description="Total number of dashboards")
    public_dashboards: int = Field(..., description="Number of public dashboards")
    private_dashboards: int = Field(..., description="Number of private dashboards")
    total_widgets: int = Field(..., description="Total number of widgets")
    widgets_by_type: Dict[str, int] = Field(..., description="Widget count by type")
    most_viewed: List[Dict[str, Any]] = Field(..., description="Most viewed dashboards")
    recent_activity: List[Dict[str, Any]] = Field(..., description="Recent dashboard activity")
    popular_themes: Dict[str, int] = Field(..., description="Popular themes usage")


class SystemHealth(BaseModel):
    """System health information."""
    status: str = Field(..., description="Overall system status")
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    disk_usage: float = Field(..., description="Disk usage percentage")
    active_connections: int = Field(..., description="Number of active connections")
    response_time: float = Field(..., description="Average response time in ms")
    uptime: int = Field(..., description="System uptime in seconds")
    last_check: datetime = Field(..., description="Last health check time")
    issues: List[str] = Field(default=[], description="Current system issues")


# ================================
# SHARING AND PERMISSIONS
# ================================

class DashboardShare(BaseModel):
    """Dashboard sharing information."""
    user_id: int = Field(..., description="User ID to share with")
    permission_level: DashboardPermissionLevel = Field(..., description="Permission level")
    expires_at: Optional[datetime] = Field(None, description="When the share expires")
    message: Optional[str] = Field(None, description="Optional message")


class DashboardPermission(BaseModel):
    """Dashboard permission entry."""
    id: int = Field(..., description="Permission ID")
    dashboard_id: int = Field(..., description="Dashboard ID")
    user_id: int = Field(..., description="User ID")
    permission_level: DashboardPermissionLevel = Field(..., description="Permission level")
    granted_by: int = Field(..., description="User who granted the permission")
    granted_at: datetime = Field(..., description="When the permission was granted")
    expires_at: Optional[datetime] = Field(None, description="When the permission expires")
    
    class Config:
        from_attributes = True


class DashboardPublicLink(BaseModel):
    """Public dashboard link."""
    id: str = Field(..., description="Public link ID")
    dashboard_id: int = Field(..., description="Dashboard ID")
    token: str = Field(..., description="Access token")
    expires_at: Optional[datetime] = Field(None, description="Link expiration time")
    view_count: int = Field(default=0, description="Number of views")
    created_by: int = Field(..., description="User who created the link")
    created_at: datetime = Field(..., description="Link creation time")
    is_active: bool = Field(default=True, description="Whether the link is active")
    
    class Config:
        from_attributes = True


# ================================
# SEARCH AND FILTERING
# ================================

class DashboardSearchFilters(BaseModel):
    """Filters for dashboard search."""
    search: Optional[str] = Field(None, description="Search term for name/description")
    owner_id: Optional[int] = Field(None, description="Filter by owner")
    folder_id: Optional[int] = Field(None, description="Filter by folder")
    is_public: Optional[bool] = Field(None, description="Filter by public/private")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    theme: Optional[str] = Field(None, description="Filter by theme")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")


class DashboardSortOption(str, Enum):
    """Dashboard sorting options."""
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    VIEWS_ASC = "views_asc"
    VIEWS_DESC = "views_desc"
    UPDATED_ASC = "updated_asc"
    UPDATED_DESC = "updated_desc"


class DashboardListParams(BaseModel):
    """Parameters for dashboard listing."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: DashboardSortOption = Field(default=DashboardSortOption.UPDATED_DESC, description="Sort option")
    filters: Optional[DashboardSearchFilters] = Field(None, description="Search filters")


class DashboardListResponse(BaseModel):
    """Response for dashboard listing."""
    dashboards: List[DashboardResponse] = Field(..., description="List of dashboards")
    total: int = Field(..., description="Total number of dashboards")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ================================
# REAL-TIME UPDATES
# ================================

class DashboardRealtimeUpdate(BaseModel):
    """Real-time dashboard update."""
    dashboard_id: int = Field(..., description="Dashboard ID")
    update_type: str = Field(..., description="Type of update")
    data: Dict[str, Any] = Field(..., description="Update data")
    timestamp: datetime = Field(..., description="Update timestamp")
    user_id: Optional[int] = Field(None, description="User who made the update")


class WidgetDataUpdate(BaseModel):
    """Widget data update."""
    widget_id: int = Field(..., description="Widget ID")
    data: Dict[str, Any] = Field(..., description="New widget data")
    timestamp: datetime = Field(..., description="Update timestamp")
    source: str = Field(..., description="Data source")


# ================================
# EXPORT AND IMPORT
# ================================

class DashboardExport(BaseModel):
    """Dashboard export data."""
    dashboard: DashboardDetail = Field(..., description="Dashboard data")
    export_format: str = Field(..., description="Export format")
    export_date: datetime = Field(..., description="Export date")
    version: str = Field(..., description="Export format version")


class DashboardImport(BaseModel):
    """Dashboard import data."""
    name: str = Field(..., description="Dashboard name")
    dashboard_data: Dict[str, Any] = Field(..., description="Dashboard configuration")
    widgets_data: List[Dict[str, Any]] = Field(..., description="Widgets configuration")
    preserve_ids: bool = Field(default=False, description="Whether to preserve original IDs")
    folder_id: Optional[int] = Field(None, description="Target folder ID")


class DashboardTemplate(BaseModel):
    """Dashboard template."""
    id: int = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: str = Field(..., description="Template category")
    preview_image: Optional[str] = Field(None, description="Preview image URL")
    template_data: Dict[str, Any] = Field(..., description="Template data")
    created_by: int = Field(..., description="Template creator")
    created_at: datetime = Field(..., description="Template creation time")
    usage_count: int = Field(default=0, description="Number of times used")
    
    class Config:
        from_attributes = True