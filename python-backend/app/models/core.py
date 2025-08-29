"""
Core business models for the Plataforma.dev system.

This module implements the core business logic models including:
- Module registry and management
- Window system and desktop management
- Dashboard configuration
- Worksheet and cell management
- System settings and configuration
- Notification system
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from enum import Enum
from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, UUID, JSON, Integer, 
    ForeignKey, UniqueConstraint, CheckConstraint, Index, Float,
    ARRAY, BigInteger, SmallInteger
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import JSONB
import sqlalchemy as sa

from .base import (
    BaseModel, EnhancedBaseModel, NamedEntityModel, ConfigurableModel,
    DatabaseConstraints, VersionMixin, TimestampMixin
)


# Enums for type safety
class ModuleStatus(str, Enum):
    """Module lifecycle status."""
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"
    UNINSTALLED = "uninstalled"


class WindowState(str, Enum):
    """Window states in the desktop system."""
    MINIMIZED = "minimized"
    NORMAL = "normal"
    MAXIMIZED = "maximized"
    FULLSCREEN = "fullscreen"


class NotificationType(str, Enum):
    """Notification types."""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationCategory(str, Enum):
    """Notification categories."""
    SYSTEM = "system"
    MODULE = "module"
    SECURITY = "security"
    WORKFLOW = "workflow"
    USER = "user"


class DataType(str, Enum):
    """Cell data types for worksheet system."""
    TEXT = "text"
    NUMBER = "number"
    CURRENCY = "currency"
    DATE = "date"
    BOOLEAN = "boolean"
    FORMULA = "formula"
    LOOKUP = "lookup"
    REFERENCE = "reference"
    FILE = "file"
    IMAGE = "image"


class RelationshipType(str, Enum):
    """Worksheet relationship types."""
    ONE_TO_ONE = "one-to-one"
    ONE_TO_MANY = "one-to-many"
    MANY_TO_MANY = "many-to-many"


class Module(NamedEntityModel, ConfigurableModel, VersionMixin):
    """
    Module registry for managing application modules.
    Tracks installed modules, their configuration, and lifecycle.
    """
    __tablename__ = 'modules'

    # Module identification
    module_id = Column(String(100), nullable=False, unique=True, comment="Unique module identifier")
    version = Column(String(20), nullable=False, comment="Module version (semver)")
    status = Column(sa.Enum(ModuleStatus), default=ModuleStatus.ACTIVE, nullable=False)
    
    # Module metadata
    author = Column(String(255), nullable=True)
    homepage_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    repository_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    documentation_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    license = Column(String(50), nullable=True)
    keywords = Column(ARRAY(String), nullable=True)
    
    # Module dependencies and requirements
    dependencies = Column(JSONB, default=[], nullable=False, comment="Module dependencies")
    peer_dependencies = Column(JSONB, default=[], nullable=False, comment="Peer dependencies")
    min_platform_version = Column(String(20), nullable=True)
    max_platform_version = Column(String(20), nullable=True)
    
    # Installation and lifecycle
    installed_at = Column(DateTime(timezone=True), nullable=True)
    installed_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    last_updated_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    
    # Module configuration and permissions
    permissions_required = Column(JSONB, default=[], nullable=False, comment="Required permissions")
    default_settings = Column(JSONB, default={}, nullable=False, comment="Default module settings")
    user_configurable_settings = Column(JSONB, default=[], nullable=False, comment="Settings users can modify")
    
    # UI and display
    icon = Column(String(50), nullable=True, comment="Lucide icon name")
    color = Column(String(7), nullable=True, comment="Module theme color")
    category = Column(String(50), nullable=True, comment="Module category")
    tags = Column(ARRAY(String), nullable=True, comment="Module tags")
    
    # Performance and usage metrics
    install_count = Column(Integer, default=0, nullable=False)
    usage_count = Column(BigInteger, default=0, nullable=False)
    average_rating = Column(Float, nullable=True)
    
    # Relationships
    installed_by = relationship("User")
    module_permissions = relationship("ModulePermission", back_populates="module", cascade="all, delete-orphan")
    user_module_settings = relationship("UserModuleSettings", back_populates="module", cascade="all, delete-orphan")
    windows = relationship("Window", back_populates="module")

    __table_args__ = (
        CheckConstraint(
            f"status IN {tuple(status.value for status in ModuleStatus)}",
            name='ck_module_status_valid'
        ),
        DatabaseConstraints.get_color_constraint('color'),
        Index('idx_modules_module_id', 'module_id'),
        Index('idx_modules_status', 'status'),
        Index('idx_modules_category', 'category'),
        Index('idx_modules_installed', 'installed_at'),
        Index('idx_modules_last_used', 'last_used_at'),
    )

    @property
    def is_installed(self) -> bool:
        """Check if module is installed."""
        return self.status not in [ModuleStatus.UNINSTALLED, ModuleStatus.DRAFT]

    def get_effective_settings(self, user_id: Optional[uuid.UUID] = None) -> Dict[str, Any]:
        """
        Get effective settings for the module, combining defaults with user overrides.
        
        Args:
            user_id: Optional user ID to get user-specific settings
            
        Returns:
            Dictionary of effective settings
        """
        effective_settings = dict(self.default_settings or {})
        
        if user_id:
            user_settings = self.get_user_settings(user_id)
            if user_settings:
                effective_settings.update(user_settings.settings or {})
        
        return effective_settings

    def get_user_settings(self, user_id: uuid.UUID) -> Optional['UserModuleSettings']:
        """Get user-specific settings for this module."""
        for user_settings in self.user_module_settings:
            if user_settings.user_id == user_id:
                return user_settings
        return None

    def can_be_used_by_user(self, user_id: uuid.UUID) -> bool:
        """
        Check if a user can use this module based on permissions.
        
        Args:
            user_id: User ID to check
            
        Returns:
            True if user can use the module
        """
        # This would typically involve checking user permissions against module_permissions
        # Implementation depends on how permissions are structured
        return self.is_installed and self.is_active


class ModulePermission(BaseModel):
    """
    Permissions required by modules to function.
    """
    __tablename__ = 'module_permissions'

    module_id = Column(UUID(as_uuid=True), ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    permission_name = Column(String(100), nullable=False)
    required = Column(Boolean, default=True, nullable=False, comment="Whether permission is required or optional")
    reason = Column(Text, nullable=True, comment="Why this permission is needed")

    # Relationships
    module = relationship("Module", back_populates="module_permissions")

    __table_args__ = (
        UniqueConstraint('module_id', 'permission_name', name='uq_module_permission'),
        Index('idx_module_permissions_module', 'module_id'),
        Index('idx_module_permissions_permission', 'permission_name'),
    )


class UserModuleSettings(BaseModel):
    """
    User-specific module settings and preferences.
    """
    __tablename__ = 'user_module_settings'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    settings = Column(JSONB, default={}, nullable=False, comment="User-specific module settings")
    is_enabled = Column(Boolean, default=True, nullable=False, comment="Whether module is enabled for user")
    is_pinned = Column(Boolean, default=False, nullable=False, comment="Whether module is pinned to dashboard")

    # Relationships
    user = relationship("User")
    module = relationship("Module", back_populates="user_module_settings")

    __table_args__ = (
        UniqueConstraint('user_id', 'module_id', name='uq_user_module_settings'),
        Index('idx_user_module_settings_user', 'user_id'),
        Index('idx_user_module_settings_module', 'module_id'),
    )


class Window(EnhancedBaseModel, TimestampMixin):
    """
    Window instances in the desktop system.
    Tracks window states, positions, and configurations.
    """
    __tablename__ = 'windows'

    # Window identification
    window_id = Column(String(100), nullable=False, comment="Unique window identifier")
    title = Column(String(255), nullable=False)
    window_type = Column(String(50), nullable=False, comment="Type of window (modal, standard, utility)")
    
    # Window ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    module_id = Column(UUID(as_uuid=True), ForeignKey('modules.id', ondelete='CASCADE'), nullable=True)
    parent_window_id = Column(UUID(as_uuid=True), ForeignKey('windows.id', ondelete='CASCADE'), nullable=True)
    
    # Window state
    state = Column(sa.Enum(WindowState), default=WindowState.NORMAL, nullable=False)
    is_visible = Column(Boolean, default=True, nullable=False)
    is_modal = Column(Boolean, default=False, nullable=False)
    is_resizable = Column(Boolean, default=True, nullable=False)
    is_movable = Column(Boolean, default=True, nullable=False)
    is_closable = Column(Boolean, default=True, nullable=False)
    is_minimizable = Column(Boolean, default=True, nullable=False)
    is_maximizable = Column(Boolean, default=True, nullable=False)
    
    # Window dimensions and position
    x = Column(Integer, default=0, nullable=False, comment="X position on screen")
    y = Column(Integer, default=0, nullable=False, comment="Y position on screen") 
    width = Column(Integer, default=800, nullable=False, comment="Window width")
    height = Column(Integer, default=600, nullable=False, comment="Window height")
    min_width = Column(Integer, default=300, nullable=False)
    min_height = Column(Integer, default=200, nullable=False)
    max_width = Column(Integer, nullable=True)
    max_height = Column(Integer, nullable=True)
    
    # Window content and configuration
    content_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    content_data = Column(JSONB, default={}, nullable=False, comment="Window-specific data")
    window_config = Column(JSONB, default={}, nullable=False, comment="Window configuration")
    
    # Z-order and focus management
    z_index = Column(Integer, default=1, nullable=False, comment="Z-order for window stacking")
    is_focused = Column(Boolean, default=False, nullable=False)
    focus_timestamp = Column(DateTime(timezone=True), nullable=True)
    
    # Session and persistence
    session_id = Column(String(100), nullable=True, comment="Browser session ID")
    is_persistent = Column(Boolean, default=False, nullable=False, comment="Restore on next login")
    auto_save_enabled = Column(Boolean, default=True, nullable=False)
    
    # Relationships
    user = relationship("User")
    module = relationship("Module", back_populates="windows")
    parent_window = relationship("Window", remote_side="Window.id", backref=backref("child_windows", cascade="all"))

    __table_args__ = (
        CheckConstraint(
            f"state IN {tuple(state.value for state in WindowState)}",
            name='ck_window_state_valid'
        ),
        CheckConstraint('width > 0 AND height > 0', name='ck_window_dimensions_positive'),
        CheckConstraint('min_width > 0 AND min_height > 0', name='ck_window_min_dimensions_positive'),
        CheckConstraint('z_index >= 0', name='ck_window_z_index_non_negative'),
        Index('idx_windows_user', 'user_id'),
        Index('idx_windows_module', 'module_id'),
        Index('idx_windows_session', 'session_id'),
        Index('idx_windows_state', 'state'),
        Index('idx_windows_z_index', 'z_index'),
        Index('idx_windows_focused', 'is_focused', 'focus_timestamp'),
    )

    def get_bounds(self) -> Dict[str, int]:
        """Get window bounds as a dictionary."""
        return {
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height
        }

    def set_bounds(self, x: int, y: int, width: int, height: int):
        """Set window bounds with validation."""
        self.x = x
        self.y = y
        self.width = max(width, self.min_width)
        self.height = max(height, self.min_height)
        
        if self.max_width:
            self.width = min(self.width, self.max_width)
        if self.max_height:
            self.height = min(self.height, self.max_height)

    def focus(self):
        """Focus this window."""
        self.is_focused = True
        self.focus_timestamp = datetime.utcnow()


class DashboardLayout(EnhancedBaseModel, VersionMixin):
    """
    User dashboard layouts and configurations.
    """
    __tablename__ = 'dashboard_layouts'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False, comment="Layout name")
    is_default = Column(Boolean, default=False, nullable=False, comment="Default layout for user")
    layout_data = Column(JSONB, nullable=False, comment="Dashboard layout configuration")
    
    # Grid configuration
    grid_size = Column(Integer, default=12, nullable=False, comment="Grid columns")
    row_height = Column(Integer, default=100, nullable=False, comment="Grid row height")
    margin = Column(JSONB, default={'x': 10, 'y': 10}, nullable=False, comment="Grid margins")
    
    # Theme and styling
    theme = Column(String(50), default='default', nullable=False)
    background_color = Column(String(7), nullable=True)
    background_image_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)

    # Relationships
    user = relationship("User")
    widgets = relationship("DashboardWidget", back_populates="layout", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_dashboard_layout_name'),
        DatabaseConstraints.get_color_constraint('background_color'),
        CheckConstraint('grid_size > 0', name='ck_dashboard_grid_size_positive'),
        CheckConstraint('row_height > 0', name='ck_dashboard_row_height_positive'),
        Index('idx_dashboard_layouts_user', 'user_id'),
        Index('idx_dashboard_layouts_default', 'user_id', 'is_default'),
    )


class DashboardWidget(BaseModel, VersionMixin):
    """
    Individual widgets on dashboard layouts.
    """
    __tablename__ = 'dashboard_widgets'

    layout_id = Column(UUID(as_uuid=True), ForeignKey('dashboard_layouts.id', ondelete='CASCADE'), nullable=False)
    widget_type = Column(String(50), nullable=False, comment="Widget type (module, shortcut, metric, etc.)")
    widget_id = Column(String(100), nullable=False, comment="Widget identifier")
    title = Column(String(255), nullable=False)
    
    # Grid position and size
    x = Column(Integer, nullable=False, comment="Grid X position")
    y = Column(Integer, nullable=False, comment="Grid Y position")
    width = Column(Integer, nullable=False, comment="Grid width")
    height = Column(Integer, nullable=False, comment="Grid height")
    
    # Widget configuration
    config = Column(JSONB, default={}, nullable=False, comment="Widget-specific configuration")
    data_source = Column(String(255), nullable=True, comment="Data source for widget")
    refresh_interval = Column(Integer, nullable=True, comment="Auto-refresh interval in seconds")
    
    # Permissions and visibility
    is_visible = Column(Boolean, default=True, nullable=False)
    min_role_level = Column(Integer, nullable=True, comment="Minimum role level to see widget")
    required_permissions = Column(ARRAY(String), nullable=True, comment="Required permissions")
    
    # Styling
    background_color = Column(String(7), nullable=True)
    text_color = Column(String(7), nullable=True)
    border_color = Column(String(7), nullable=True)

    # Relationships
    layout = relationship("DashboardLayout", back_populates="widgets")

    __table_args__ = (
        CheckConstraint('x >= 0 AND y >= 0', name='ck_widget_position_non_negative'),
        CheckConstraint('width > 0 AND height > 0', name='ck_widget_size_positive'),
        CheckConstraint('refresh_interval IS NULL OR refresh_interval > 0', name='ck_widget_refresh_positive'),
        DatabaseConstraints.get_color_constraint('background_color'),
        DatabaseConstraints.get_color_constraint('text_color'),
        DatabaseConstraints.get_color_constraint('border_color'),
        Index('idx_dashboard_widgets_layout', 'layout_id'),
        Index('idx_dashboard_widgets_type', 'widget_type'),
        Index('idx_dashboard_widgets_position', 'x', 'y'),
    )


class Worksheet(EnhancedBaseModel, VersionMixin, TimestampMixin):
    """
    Worksheet/spreadsheet model for data management.
    """
    __tablename__ = 'worksheets'

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Worksheet statistics
    total_rows = Column(BigInteger, default=0, nullable=False)
    total_columns = Column(Integer, default=0, nullable=False)
    total_cells = Column(BigInteger, default=0, nullable=False)
    max_row = Column(BigInteger, default=0, nullable=False)
    
    # Configuration
    settings = Column(JSONB, default={}, nullable=False, comment="Worksheet settings")
    view_config = Column(JSONB, default={}, nullable=False, comment="View configuration")
    
    # Access control
    is_public = Column(Boolean, default=False, nullable=False)
    is_template = Column(Boolean, default=False, nullable=False)
    template_category = Column(String(50), nullable=True)

    # Relationships
    owner = relationship("User")
    cells = relationship("Cell", back_populates="worksheet", cascade="all, delete-orphan")
    columns = relationship("ColumnConfig", back_populates="worksheet", cascade="all, delete-orphan")
    relationships_source = relationship("WorksheetRelationship", 
                                      foreign_keys="WorksheetRelationship.source_worksheet_id",
                                      back_populates="source_worksheet",
                                      cascade="all, delete-orphan")
    relationships_target = relationship("WorksheetRelationship",
                                      foreign_keys="WorksheetRelationship.target_worksheet_id",
                                      back_populates="target_worksheet")

    __table_args__ = (
        CheckConstraint('total_rows >= 0', name='ck_worksheet_total_rows_non_negative'),
        CheckConstraint('total_columns >= 0', name='ck_worksheet_total_columns_non_negative'),
        CheckConstraint('total_cells >= 0', name='ck_worksheet_total_cells_non_negative'),
        CheckConstraint('max_row >= 0', name='ck_worksheet_max_row_non_negative'),
        Index('idx_worksheets_owner', 'owner_id'),
        Index('idx_worksheets_public', 'is_public'),
        Index('idx_worksheets_template', 'is_template', 'template_category'),
        Index('idx_worksheets_active', 'is_active'),
    )

    def get_cell(self, row_num: int, col_name: str) -> Optional['Cell']:
        """Get a specific cell by coordinates."""
        for cell in self.cells:
            if cell.row_num == row_num and cell.col_name == col_name:
                return cell
        return None


class ColumnConfig(BaseModel, VersionMixin):
    """
    Column configuration for worksheets.
    """
    __tablename__ = 'column_configs'

    worksheet_id = Column(UUID(as_uuid=True), ForeignKey('worksheets.id', ondelete='CASCADE'), nullable=False)
    col_name = Column(String(10), nullable=False, comment="Column name (A, B, C, etc.)")
    display_name = Column(String(255), nullable=True, comment="Human-readable column name")
    data_type = Column(sa.Enum(DataType), default=DataType.TEXT, nullable=False)
    width = Column(Integer, default=100, nullable=False, comment="Column width in pixels")
    
    # Validation and constraints
    is_required = Column(Boolean, default=False, nullable=False)
    is_unique = Column(Boolean, default=False, nullable=False)
    default_value = Column(Text, nullable=True)
    validation_rules = Column(JSONB, default={}, nullable=False, comment="Validation rules")
    
    # Display formatting
    format_config = Column(JSONB, default={}, nullable=False, comment="Display format configuration")
    is_hidden = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, nullable=True, comment="Display order")

    # Relationships
    worksheet = relationship("Worksheet", back_populates="columns")

    __table_args__ = (
        UniqueConstraint('worksheet_id', 'col_name', name='uq_column_config_worksheet_col'),
        CheckConstraint(
            f"data_type IN {tuple(dtype.value for dtype in DataType)}",
            name='ck_column_data_type_valid'
        ),
        CheckConstraint('width > 0', name='ck_column_width_positive'),
        CheckConstraint("col_name ~ '^[A-Z]+$'", name='ck_column_name_format'),
        Index('idx_column_configs_worksheet', 'worksheet_id'),
        Index('idx_column_configs_type', 'data_type'),
        Index('idx_column_configs_sort', 'sort_order'),
    )


class Cell(BaseModel, VersionMixin, TimestampMixin):
    """
    Individual cell data in worksheets.
    """
    __tablename__ = 'cells'

    worksheet_id = Column(UUID(as_uuid=True), ForeignKey('worksheets.id', ondelete='CASCADE'), nullable=False)
    row_num = Column(BigInteger, nullable=False, comment="Row number (1-based)")
    col_name = Column(String(10), nullable=False, comment="Column name")
    
    # Cell content
    value = Column(Text, nullable=True, comment="Raw cell value")
    display_value = Column(Text, nullable=True, comment="Formatted display value")
    data_type = Column(sa.Enum(DataType), default=DataType.TEXT, nullable=False)
    formula = Column(Text, nullable=True, comment="Cell formula")
    
    # Cell styling and formatting
    style = Column(JSONB, default={}, nullable=False, comment="Cell styling")
    format_config = Column(JSONB, default={}, nullable=False, comment="Format configuration")
    
    # Validation and metadata
    is_locked = Column(Boolean, default=False, nullable=False)
    is_error = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    
    # Relationships and references
    references = Column(ARRAY(String), nullable=True, comment="Cell references used in formulas")
    
    # Relationships
    worksheet = relationship("Worksheet", back_populates="cells")

    __table_args__ = (
        UniqueConstraint('worksheet_id', 'row_num', 'col_name', name='uq_cell_coordinates'),
        CheckConstraint(
            f"data_type IN {tuple(dtype.value for dtype in DataType)}",
            name='ck_cell_data_type_valid'
        ),
        CheckConstraint('row_num > 0', name='ck_cell_row_positive'),
        CheckConstraint("col_name ~ '^[A-Z]+$'", name='ck_cell_col_name_format'),
        Index('idx_cells_worksheet', 'worksheet_id'),
        Index('idx_cells_coordinates', 'worksheet_id', 'row_num', 'col_name'),
        Index('idx_cells_type', 'data_type'),
        Index('idx_cells_formula', 'worksheet_id', 'formula'),
    )

    @property
    def cell_id(self) -> str:
        """Get Excel-style cell ID (e.g., A1, B2)."""
        return f"{self.col_name}{self.row_num}"

    def get_effective_value(self) -> str:
        """Get the effective value (display_value or value)."""
        return self.display_value or self.value or ""


class WorksheetRelationship(EnhancedBaseModel):
    """
    Relationships between worksheets for data linking.
    """
    __tablename__ = 'worksheet_relationships'

    name = Column(String(100), nullable=False)
    relationship_type = Column(sa.Enum(RelationshipType), nullable=False)
    
    # Source worksheet and column
    source_worksheet_id = Column(UUID(as_uuid=True), ForeignKey('worksheets.id', ondelete='CASCADE'), nullable=False)
    source_column = Column(String(10), nullable=False)
    
    # Target worksheet and column
    target_worksheet_id = Column(UUID(as_uuid=True), ForeignKey('worksheets.id', ondelete='CASCADE'), nullable=False)
    target_column = Column(String(10), nullable=False)
    
    # Relationship configuration
    config = Column(JSONB, default={}, nullable=False, comment="Relationship configuration")
    
    # Relationships
    source_worksheet = relationship("Worksheet", foreign_keys=[source_worksheet_id], back_populates="relationships_source")
    target_worksheet = relationship("Worksheet", foreign_keys=[target_worksheet_id], back_populates="relationships_target")

    __table_args__ = (
        CheckConstraint(
            f"relationship_type IN {tuple(rtype.value for rtype in RelationshipType)}",
            name='ck_relationship_type_valid'
        ),
        CheckConstraint('source_worksheet_id != target_worksheet_id', name='ck_relationship_different_worksheets'),
        Index('idx_worksheet_relationships_source', 'source_worksheet_id'),
        Index('idx_worksheet_relationships_target', 'target_worksheet_id'),
        Index('idx_worksheet_relationships_type', 'relationship_type'),
    )


class SystemSetting(NamedEntityModel):
    """
    System-wide configuration settings.
    """
    __tablename__ = 'system_settings'

    setting_key = Column(String(100), nullable=False, unique=True)
    setting_value = Column(JSONB, nullable=False, comment="Setting value (any JSON type)")
    data_type = Column(String(20), nullable=False, comment="Value data type")
    category = Column(String(50), nullable=False, comment="Setting category")
    is_public = Column(Boolean, default=False, nullable=False, comment="Can be read by non-admins")
    is_readonly = Column(Boolean, default=False, nullable=False, comment="Cannot be modified via API")
    validation_schema = Column(JSONB, nullable=True, comment="JSON schema for validation")

    __table_args__ = (
        CheckConstraint("data_type IN ('string', 'number', 'boolean', 'object', 'array')", name='ck_setting_data_type'),
        Index('idx_system_settings_key', 'setting_key'),
        Index('idx_system_settings_category', 'category'),
        Index('idx_system_settings_public', 'is_public'),
    )


class Notification(EnhancedBaseModel, TimestampMixin):
    """
    User notifications system.
    """
    __tablename__ = 'notifications'

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(String(2000), nullable=False)
    notification_type = Column(sa.Enum(NotificationType), nullable=False)
    priority = Column(sa.Enum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)
    category = Column(sa.Enum(NotificationCategory), nullable=False)
    
    # Source information
    module_name = Column(String(100), nullable=True)
    source_id = Column(UUID(as_uuid=True), nullable=True, comment="ID of entity that generated notification")
    source_type = Column(String(50), nullable=True, comment="Type of source entity")
    data = Column(JSONB, default={}, nullable=False, comment="Additional notification data")
    
    # Status and lifecycle
    read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery tracking
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    delivery_attempts = Column(Integer, default=0, nullable=False)
    last_delivery_attempt = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        CheckConstraint(
            f"notification_type IN {tuple(ntype.value for ntype in NotificationType)}",
            name='ck_notification_type_valid'
        ),
        CheckConstraint(
            f"priority IN {tuple(priority.value for priority in NotificationPriority)}",
            name='ck_notification_priority_valid'
        ),
        CheckConstraint(
            f"category IN {tuple(category.value for category in NotificationCategory)}",
            name='ck_notification_category_valid'
        ),
        Index('idx_notifications_user', 'user_id'),
        Index('idx_notifications_read', 'user_id', 'read'),
        Index('idx_notifications_archived', 'user_id', 'archived'),
        Index('idx_notifications_type', 'notification_type'),
        Index('idx_notifications_priority', 'priority'),
        Index('idx_notifications_category', 'category'),
        Index('idx_notifications_expires', 'expires_at'),
        Index('idx_notifications_module', 'module_name'),
    )

    @property
    def is_expired(self) -> bool:
        """Check if notification has expired."""
        return self.expires_at is not None and self.expires_at <= datetime.utcnow()

    def mark_as_read(self):
        """Mark notification as read."""
        self.read = True
        self.read_at = datetime.utcnow()

    def archive(self):
        """Archive notification."""
        self.archived = True
        self.archived_at = datetime.utcnow()


class NotificationTemplate(NamedEntityModel):
    """
    Templates for generating notifications.
    """
    __tablename__ = 'notification_templates'

    template_key = Column(String(100), nullable=False, unique=True)
    title_template = Column(String(200), nullable=False)
    message_template = Column(String(2000), nullable=False)
    notification_type = Column(sa.Enum(NotificationType), nullable=False)
    priority = Column(sa.Enum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)
    category = Column(sa.Enum(NotificationCategory), nullable=False)
    module_name = Column(String(100), nullable=True)
    variables = Column(ARRAY(String), default=[], nullable=False, comment="Template variables")
    
    # Template configuration
    default_expires_hours = Column(Integer, nullable=True, comment="Default expiration in hours")
    auto_archive_after_read = Column(Boolean, default=False, nullable=False)
    
    __table_args__ = (
        CheckConstraint(
            f"notification_type IN {tuple(ntype.value for ntype in NotificationType)}",
            name='ck_template_type_valid'
        ),
        CheckConstraint(
            f"priority IN {tuple(priority.value for priority in NotificationPriority)}",
            name='ck_template_priority_valid'
        ),
        CheckConstraint(
            f"category IN {tuple(category.value for category in NotificationCategory)}",
            name='ck_template_category_valid'
        ),
        Index('idx_notification_templates_key', 'template_key'),
        Index('idx_notification_templates_module', 'module_name'),
    )