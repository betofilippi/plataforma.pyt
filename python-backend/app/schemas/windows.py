"""
Window management schemas for API endpoints.

This module contains Pydantic models for window-related operations including:
- Window state management
- Window positioning and sizing
- Window focus and z-order management
- Window persistence and restoration
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union, Tuple
from enum import Enum

from pydantic import BaseModel, Field, validator


class WindowState(str, Enum):
    """Window state options."""
    NORMAL = "normal"
    MINIMIZED = "minimized"
    MAXIMIZED = "maximized"
    FULLSCREEN = "fullscreen"
    CLOSED = "closed"
    HIDDEN = "hidden"


class WindowType(str, Enum):
    """Window type categories."""
    APPLICATION = "application"
    DIALOG = "dialog"
    MODAL = "modal"
    POPUP = "popup"
    NOTIFICATION = "notification"
    SYSTEM = "system"
    UTILITY = "utility"


class WindowPosition(BaseModel):
    """Window position coordinates."""
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate")
    
    @validator('x', 'y')
    def validate_coordinates(cls, v):
        if v < -10000 or v > 10000:
            raise ValueError('Coordinate values must be reasonable')
        return v


class WindowSize(BaseModel):
    """Window size dimensions."""
    width: float = Field(..., ge=50, le=10000, description="Window width")
    height: float = Field(..., ge=30, le=10000, description="Window height")


class WindowConstraints(BaseModel):
    """Window size and position constraints."""
    min_width: Optional[float] = Field(None, ge=50, description="Minimum width")
    min_height: Optional[float] = Field(None, ge=30, description="Minimum height")
    max_width: Optional[float] = Field(None, le=10000, description="Maximum width")
    max_height: Optional[float] = Field(None, le=10000, description="Maximum height")
    resizable: bool = Field(default=True, description="Whether the window can be resized")
    movable: bool = Field(default=True, description="Whether the window can be moved")


# ================================
# BASE SCHEMAS
# ================================

class WindowBase(BaseModel):
    """Base window schema with common fields."""
    title: str = Field(..., min_length=1, max_length=255, description="Window title")
    window_type: WindowType = Field(default=WindowType.APPLICATION, description="Window type")
    module_id: Optional[int] = Field(None, description="Associated module ID")
    component: Optional[str] = Field(None, description="React component name")
    url: Optional[str] = Field(None, description="Window URL (for iframe windows)")
    icon: Optional[str] = Field(None, description="Window icon")
    theme: Optional[str] = Field(None, description="Window theme")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Window metadata")


class WindowCreate(WindowBase):
    """Schema for creating a new window."""
    position: WindowPosition = Field(..., description="Initial window position")
    size: WindowSize = Field(..., description="Initial window size")
    state: WindowState = Field(default=WindowState.NORMAL, description="Initial window state")
    constraints: Optional[WindowConstraints] = Field(None, description="Window constraints")
    parent_id: Optional[str] = Field(None, description="Parent window ID")
    modal: bool = Field(default=False, description="Whether the window is modal")
    always_on_top: bool = Field(default=False, description="Whether the window stays on top")
    show_in_taskbar: bool = Field(default=True, description="Whether to show in taskbar")
    auto_save_state: bool = Field(default=True, description="Whether to auto-save window state")


class WindowUpdate(BaseModel):
    """Schema for updating window information."""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Window title")
    position: Optional[WindowPosition] = Field(None, description="Window position")
    size: Optional[WindowSize] = Field(None, description="Window size")
    state: Optional[WindowState] = Field(None, description="Window state")
    z_index: Optional[int] = Field(None, description="Window z-index")
    theme: Optional[str] = Field(None, description="Window theme")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Window metadata")
    always_on_top: Optional[bool] = Field(None, description="Whether the window stays on top")
    show_in_taskbar: Optional[bool] = Field(None, description="Whether to show in taskbar")


# ================================
# RESPONSE SCHEMAS
# ================================

class WindowResponse(WindowBase):
    """Schema for window responses."""
    id: str = Field(..., description="Window unique identifier")
    user_id: int = Field(..., description="Window owner ID")
    position: WindowPosition = Field(..., description="Current window position")
    size: WindowSize = Field(..., description="Current window size")
    state: WindowState = Field(..., description="Current window state")
    z_index: int = Field(..., description="Window z-index")
    is_focused: bool = Field(default=False, description="Whether the window has focus")
    is_visible: bool = Field(default=True, description="Whether the window is visible")
    constraints: Optional[WindowConstraints] = Field(None, description="Window constraints")
    parent_id: Optional[str] = Field(None, description="Parent window ID")
    modal: bool = Field(default=False, description="Whether the window is modal")
    always_on_top: bool = Field(default=False, description="Whether the window stays on top")
    show_in_taskbar: bool = Field(default=True, description="Whether to show in taskbar")
    auto_save_state: bool = Field(default=True, description="Whether to auto-save window state")
    created_at: datetime = Field(..., description="When the window was created")
    updated_at: Optional[datetime] = Field(None, description="When the window was last updated")
    last_focused: Optional[datetime] = Field(None, description="When the window was last focused")
    
    class Config:
        from_attributes = True


class WindowDetail(WindowResponse):
    """Detailed window information."""
    child_windows: List[str] = Field(default=[], description="Child window IDs")
    session_data: Optional[Dict[str, Any]] = Field(None, description="Window session data")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")
    event_history: List[Dict[str, Any]] = Field(default=[], description="Recent window events")


# ================================
# WINDOW MANAGEMENT
# ================================

class WindowLayout(BaseModel):
    """Window layout configuration."""
    id: str = Field(..., description="Layout ID")
    name: str = Field(..., description="Layout name")
    description: Optional[str] = Field(None, description="Layout description")
    windows: List[Dict[str, Any]] = Field(..., description="Window configurations")
    grid_size: Optional[Tuple[int, int]] = Field(None, description="Grid size for snapping")
    created_by: int = Field(..., description="User who created the layout")
    created_at: datetime = Field(..., description="Layout creation time")
    is_default: bool = Field(default=False, description="Whether this is the default layout")
    
    class Config:
        from_attributes = True


class WindowLayoutCreate(BaseModel):
    """Schema for creating a window layout."""
    name: str = Field(..., min_length=1, max_length=255, description="Layout name")
    description: Optional[str] = Field(None, max_length=1000, description="Layout description")
    windows: List[Dict[str, Any]] = Field(..., description="Window configurations")
    grid_size: Optional[Tuple[int, int]] = Field(None, description="Grid size for snapping")
    is_default: bool = Field(default=False, description="Whether this is the default layout")


class WindowSession(BaseModel):
    """Window session information."""
    id: str = Field(..., description="Session ID")
    user_id: int = Field(..., description="User ID")
    windows: List[WindowResponse] = Field(..., description="Session windows")
    layout_id: Optional[str] = Field(None, description="Active layout ID")
    created_at: datetime = Field(..., description="Session creation time")
    updated_at: Optional[datetime] = Field(None, description="Last session update")
    is_active: bool = Field(default=True, description="Whether the session is active")
    device_info: Optional[Dict[str, Any]] = Field(None, description="Device information")
    
    class Config:
        from_attributes = True


class WindowWorkspace(BaseModel):
    """Window workspace (virtual desktop)."""
    id: str = Field(..., description="Workspace ID")
    name: str = Field(..., description="Workspace name")
    description: Optional[str] = Field(None, description="Workspace description")
    windows: List[str] = Field(..., description="Window IDs in this workspace")
    layout_id: Optional[str] = Field(None, description="Default layout for workspace")
    background: Optional[str] = Field(None, description="Workspace background")
    theme: Optional[str] = Field(None, description="Workspace theme")
    user_id: int = Field(..., description="Workspace owner")
    created_at: datetime = Field(..., description="Workspace creation time")
    is_active: bool = Field(default=False, description="Whether the workspace is active")
    
    class Config:
        from_attributes = True


# ================================
# WINDOW OPERATIONS
# ================================

class WindowFocusRequest(BaseModel):
    """Request to focus a window."""
    window_id: str = Field(..., description="Window ID to focus")
    bring_to_front: bool = Field(default=True, description="Whether to bring to front")


class WindowMoveRequest(BaseModel):
    """Request to move a window."""
    window_id: str = Field(..., description="Window ID to move")
    position: WindowPosition = Field(..., description="New position")
    animate: bool = Field(default=False, description="Whether to animate the move")


class WindowResizeRequest(BaseModel):
    """Request to resize a window."""
    window_id: str = Field(..., description="Window ID to resize")
    size: WindowSize = Field(..., description="New size")
    anchor: str = Field(default="top-left", description="Resize anchor point")
    animate: bool = Field(default=False, description="Whether to animate the resize")


class WindowStateChangeRequest(BaseModel):
    """Request to change window state."""
    window_id: str = Field(..., description="Window ID")
    state: WindowState = Field(..., description="New window state")
    animate: bool = Field(default=True, description="Whether to animate the change")


class WindowStackingRequest(BaseModel):
    """Request to change window stacking order."""
    window_id: str = Field(..., description="Window ID")
    action: str = Field(..., description="Stacking action (bring_to_front, send_to_back, etc.)")
    relative_to: Optional[str] = Field(None, description="Window ID to stack relative to")


# ================================
# WINDOW EVENTS
# ================================

class WindowEvent(BaseModel):
    """Window event information."""
    id: str = Field(..., description="Event ID")
    window_id: str = Field(..., description="Window ID")
    event_type: str = Field(..., description="Event type")
    data: Dict[str, Any] = Field(..., description="Event data")
    timestamp: datetime = Field(..., description="Event timestamp")
    user_id: int = Field(..., description="User who triggered the event")
    
    class Config:
        from_attributes = True


class WindowEventSubscription(BaseModel):
    """Window event subscription."""
    window_id: Optional[str] = Field(None, description="Window ID to subscribe to (all if None)")
    event_types: List[str] = Field(..., description="Event types to subscribe to")
    callback_url: Optional[str] = Field(None, description="Webhook callback URL")


# ================================
# WINDOW STATISTICS
# ================================

class WindowStatistics(BaseModel):
    """Window usage statistics."""
    total_windows: int = Field(..., description="Total number of windows")
    active_windows: int = Field(..., description="Number of active windows")
    windows_by_type: Dict[str, int] = Field(..., description="Window count by type")
    windows_by_state: Dict[str, int] = Field(..., description="Window count by state")
    most_used_modules: List[Dict[str, Any]] = Field(..., description="Most used modules")
    average_session_duration: float = Field(..., description="Average session duration in minutes")
    window_creation_trend: List[Dict[str, Any]] = Field(..., description="Window creation over time")


class WindowPerformanceMetrics(BaseModel):
    """Window performance metrics."""
    window_id: str = Field(..., description="Window ID")
    memory_usage: float = Field(..., description="Memory usage in MB")
    cpu_usage: float = Field(..., description="CPU usage percentage")
    render_time: float = Field(..., description="Average render time in ms")
    event_queue_size: int = Field(..., description="Event queue size")
    last_updated: datetime = Field(..., description="Last metrics update")
    
    class Config:
        from_attributes = True


# ================================
# SEARCH AND FILTERING
# ================================

class WindowSearchFilters(BaseModel):
    """Filters for window search."""
    search: Optional[str] = Field(None, description="Search term for title")
    window_type: Optional[WindowType] = Field(None, description="Filter by window type")
    state: Optional[WindowState] = Field(None, description="Filter by window state")
    module_id: Optional[int] = Field(None, description="Filter by module")
    user_id: Optional[int] = Field(None, description="Filter by user")
    workspace_id: Optional[str] = Field(None, description="Filter by workspace")
    is_focused: Optional[bool] = Field(None, description="Filter by focus state")
    is_visible: Optional[bool] = Field(None, description="Filter by visibility")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")


class WindowSortOption(str, Enum):
    """Window sorting options."""
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    TITLE_ASC = "title_asc"
    TITLE_DESC = "title_desc"
    Z_INDEX_ASC = "z_index_asc"
    Z_INDEX_DESC = "z_index_desc"
    LAST_FOCUSED_ASC = "last_focused_asc"
    LAST_FOCUSED_DESC = "last_focused_desc"


class WindowListParams(BaseModel):
    """Parameters for window listing."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: WindowSortOption = Field(default=WindowSortOption.CREATED_DESC, description="Sort option")
    filters: Optional[WindowSearchFilters] = Field(None, description="Search filters")


class WindowListResponse(BaseModel):
    """Response for window listing."""
    windows: List[WindowResponse] = Field(..., description="List of windows")
    total: int = Field(..., description="Total number of windows")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ================================
# BULK OPERATIONS
# ================================

class WindowBulkAction(str, Enum):
    """Bulk actions for windows."""
    CLOSE = "close"
    MINIMIZE = "minimize"
    MAXIMIZE = "maximize"
    FOCUS = "focus"
    MOVE_TO_WORKSPACE = "move_to_workspace"
    CHANGE_THEME = "change_theme"
    DELETE = "delete"


class WindowBulkOperation(BaseModel):
    """Bulk operation on windows."""
    window_ids: List[str] = Field(..., min_items=1, description="List of window IDs")
    action: WindowBulkAction = Field(..., description="Action to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Action parameters")


class WindowBulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[Dict[str, Any]] = Field(default=[], description="List of errors")
    processed_ids: List[str] = Field(..., description="List of processed window IDs")


# ================================
# WINDOW PERSISTENCE
# ================================

class WindowState_Persistence(BaseModel):
    """Window state for persistence."""
    window_id: str = Field(..., description="Window ID")
    title: str = Field(..., description="Window title")
    position: WindowPosition = Field(..., description="Window position")
    size: WindowSize = Field(..., description="Window size")
    state: WindowState = Field(..., description="Window state")
    z_index: int = Field(..., description="Window z-index")
    workspace_id: Optional[str] = Field(None, description="Workspace ID")
    session_data: Optional[Dict[str, Any]] = Field(None, description="Session data")
    saved_at: datetime = Field(..., description="When the state was saved")


class WindowRestoreRequest(BaseModel):
    """Request to restore window state."""
    window_states: List[WindowState_Persistence] = Field(..., description="Window states to restore")
    clear_existing: bool = Field(default=False, description="Whether to clear existing windows")
    restore_focus: bool = Field(default=True, description="Whether to restore focus order")


class WindowRestoreResponse(BaseModel):
    """Response for window restoration."""
    restored_count: int = Field(..., description="Number of restored windows")
    failed_count: int = Field(..., description="Number of failed restorations")
    errors: List[Dict[str, Any]] = Field(default=[], description="List of errors")
    restored_window_ids: List[str] = Field(..., description="List of restored window IDs")