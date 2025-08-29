"""
Window management database models.

This module contains SQLAlchemy models for window-related operations.
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
from ..schemas.windows import WindowState, WindowType


class Window(Base):
    """Window model for storing window information."""
    __tablename__ = "windows"
    __table_args__ = (
        Index('idx_window_user_id', 'user_id'),
        Index('idx_window_state', 'state'),
        Index('idx_window_window_type', 'window_type'),
        Index('idx_window_module_id', 'module_id'),
        Index('idx_window_workspace_id', 'workspace_id'),
        Index('idx_window_parent_id', 'parent_id'),
        Index('idx_window_z_index', 'z_index'),
        Index('idx_window_created_at', 'created_at'),
        Index('idx_window_last_focused', 'last_focused'),
        CheckConstraint('char_length(title) >= 1', name='ck_window_title_length'),
        CheckConstraint('z_index >= 0', name='ck_window_z_index_positive'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Window identification
    title = Column(String(255), nullable=False)
    window_type = Column(SQLEnum(WindowType), default=WindowType.APPLICATION, nullable=False)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='SET NULL'))
    component = Column(String(255))  # React component name
    url = Column(String(1000))  # Window URL for iframe windows
    
    # Window state
    state = Column(SQLEnum(WindowState), default=WindowState.NORMAL, nullable=False)
    position_x = Column(Float, nullable=False, default=0)
    position_y = Column(Float, nullable=False, default=0)
    width = Column(Float, nullable=False, default=800)
    height = Column(Float, nullable=False, default=600)
    
    # Window management
    z_index = Column(Integer, default=1)
    parent_id = Column(String(36), ForeignKey('windows.id', ondelete='CASCADE'))
    workspace_id = Column(String(36), ForeignKey('window_workspaces.id', ondelete='SET NULL'))
    
    # Window properties
    is_focused = Column(Boolean, default=False)
    is_visible = Column(Boolean, default=True)
    is_resizable = Column(Boolean, default=True)
    is_movable = Column(Boolean, default=True)
    modal = Column(Boolean, default=False)
    always_on_top = Column(Boolean, default=False)
    show_in_taskbar = Column(Boolean, default=True)
    auto_save_state = Column(Boolean, default=True)
    
    # Appearance
    icon = Column(String(255))
    theme = Column(String(100))
    
    # Constraints
    min_width = Column(Float, default=50)
    min_height = Column(Float, default=30)
    max_width = Column(Float)
    max_height = Column(Float)
    
    # Session data
    session_data = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_focused = Column(DateTime)
    last_state_change = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="windows")
    module = relationship("Module")
    parent = relationship("Window", remote_side=[id], back_populates="children")
    children = relationship("Window", back_populates="parent", cascade="all, delete-orphan")
    workspace = relationship("WindowWorkspace", back_populates="windows")
    events = relationship("WindowEvent", back_populates="window", cascade="all, delete-orphan")
    performance_metrics = relationship("WindowPerformanceMetrics", back_populates="window", cascade="all, delete-orphan")

    @validates('position_x', 'position_y')
    def validate_coordinates(self, key, value):
        """Validate window coordinates."""
        if value < -10000 or value > 10000:
            raise ValueError(f"Window {key} must be between -10000 and 10000")
        return value

    @validates('width', 'height')
    def validate_dimensions(self, key, value):
        """Validate window dimensions."""
        min_val = 50 if key == 'width' else 30
        if value < min_val:
            raise ValueError(f"Window {key} must be at least {min_val}")
        if value > 10000:
            raise ValueError(f"Window {key} cannot exceed 10000")
        return value

    @hybrid_property
    def position(self):
        """Get window position as dictionary."""
        return {'x': self.position_x, 'y': self.position_y}

    @hybrid_property
    def size(self):
        """Get window size as dictionary."""
        return {'width': self.width, 'height': self.height}

    @hybrid_property
    def bounds(self):
        """Get window bounds as dictionary."""
        return {
            'x': self.position_x,
            'y': self.position_y,
            'width': self.width,
            'height': self.height
        }

    @hybrid_property
    def is_child_window(self):
        """Check if this window has a parent."""
        return self.parent_id is not None

    @hybrid_property
    def child_count(self):
        """Get number of child windows."""
        return len(self.children)

    def __repr__(self):
        return f"<Window(id='{self.id}', title='{self.title}', state='{self.state}', user_id={self.user_id})>"


class WindowLayout(Base):
    """Model for storing window layout configurations."""
    __tablename__ = "window_layouts"
    __table_args__ = (
        Index('idx_layout_user_id', 'user_id'),
        Index('idx_layout_created_by', 'created_by'),
        Index('idx_layout_is_default', 'is_default'),
        Index('idx_layout_created_at', 'created_at'),
        UniqueConstraint('user_id', 'name', name='uq_layout_user_name'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Layout configuration
    windows = Column(JSON, nullable=False)  # Array of window configurations
    grid_size = Column(JSON)  # Grid size for snapping (width, height)
    
    # Layout properties
    is_default = Column(Boolean, default=False)
    is_shared = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="window_layouts")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<WindowLayout(id='{self.id}', name='{self.name}', user_id={self.user_id})>"


class WindowSession(Base):
    """Model for storing window session information."""
    __tablename__ = "window_sessions"
    __table_args__ = (
        Index('idx_session_user_id', 'user_id'),
        Index('idx_session_layout_id', 'layout_id'),
        Index('idx_session_created_at', 'created_at'),
        Index('idx_session_is_active', 'is_active'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    layout_id = Column(String(36), ForeignKey('window_layouts.id', ondelete='SET NULL'))
    
    # Session data
    window_states = Column(JSON, nullable=False)  # Array of window states
    device_info = Column(JSON, default=dict)
    
    # Session status
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_restored = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="window_sessions")
    layout = relationship("WindowLayout")

    def __repr__(self):
        return f"<WindowSession(id='{self.id}', user_id={self.user_id}, active={self.is_active})>"


class WindowWorkspace(Base):
    """Model for window workspaces (virtual desktops)."""
    __tablename__ = "window_workspaces"
    __table_args__ = (
        Index('idx_workspace_user_id', 'user_id'),
        Index('idx_workspace_is_active', 'is_active'),
        Index('idx_workspace_created_at', 'created_at'),
        UniqueConstraint('user_id', 'name', name='uq_workspace_user_name'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    layout_id = Column(String(36), ForeignKey('window_layouts.id', ondelete='SET NULL'))
    
    # Appearance
    background = Column(String(500))  # Background image URL
    theme = Column(String(100))
    
    # Workspace properties
    is_active = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="window_workspaces")
    layout = relationship("WindowLayout")
    windows = relationship("Window", back_populates="workspace")

    def __repr__(self):
        return f"<WindowWorkspace(id='{self.id}', name='{self.name}', user_id={self.user_id}, active={self.is_active})>"


class WindowEvent(Base):
    """Model for tracking window events."""
    __tablename__ = "window_events"
    __table_args__ = (
        Index('idx_event_window_id', 'window_id'),
        Index('idx_event_user_id', 'user_id'),
        Index('idx_event_event_type', 'event_type'),
        Index('idx_event_timestamp', 'timestamp'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    window_id = Column(String(36), ForeignKey('windows.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    event_type = Column(String(100), nullable=False)  # create, move, resize, focus, close, etc.
    data = Column(JSON, default=dict)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    window = relationship("Window", back_populates="events")
    user = relationship("User")

    def __repr__(self):
        return f"<WindowEvent(id='{self.id}', window_id='{self.window_id}', type='{self.event_type}')>"


class WindowPerformanceMetrics(Base):
    """Model for tracking window performance metrics."""
    __tablename__ = "window_performance_metrics"
    __table_args__ = (
        Index('idx_metrics_window_id', 'window_id'),
        Index('idx_metrics_timestamp', 'timestamp'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    window_id = Column(String(36), ForeignKey('windows.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Performance metrics
    memory_usage = Column(Float, default=0)  # MB
    cpu_usage = Column(Float, default=0)  # Percentage
    render_time = Column(Float, default=0)  # Average render time in ms
    event_queue_size = Column(Integer, default=0)
    
    # Additional metrics
    fps = Column(Float)  # Frames per second
    load_time = Column(Float)  # Initial load time in ms
    interaction_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    window = relationship("Window", back_populates="performance_metrics")

    def __repr__(self):
        return f"<WindowPerformanceMetrics(window_id='{self.window_id}', memory={self.memory_usage}MB, cpu={self.cpu_usage}%)>"


class WindowStatePersistence(Base):
    """Model for persisting window states across sessions."""
    __tablename__ = "window_state_persistence"
    __table_args__ = (
        Index('idx_persistence_user_id', 'user_id'),
        Index('idx_persistence_window_id', 'window_id'),
        Index('idx_persistence_saved_at', 'saved_at'),
        UniqueConstraint('user_id', 'window_id', name='uq_persistence_user_window'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    window_id = Column(String(36), nullable=False)  # Not FK as window may be deleted
    
    # Persisted state
    title = Column(String(255), nullable=False)
    window_type = Column(SQLEnum(WindowType), nullable=False)
    module_id = Column(Integer)
    component = Column(String(255))
    url = Column(String(1000))
    
    # Position and size
    position_x = Column(Float, nullable=False)
    position_y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    state = Column(SQLEnum(WindowState), nullable=False)
    z_index = Column(Integer, default=1)
    
    # Session data
    session_data = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    
    # Workspace information
    workspace_id = Column(String(36))
    
    saved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")

    def __repr__(self):
        return f"<WindowStatePersistence(user_id={self.user_id}, window_id='{self.window_id}', title='{self.title}')>"


class WindowStatistics(Base):
    """Model for storing window usage statistics."""
    __tablename__ = "window_statistics"
    __table_args__ = (
        Index('idx_stats_user_id', 'user_id'),
        Index('idx_stats_module_id', 'module_id'),
        Index('idx_stats_window_type', 'window_type'),
        Index('idx_stats_date', 'date'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'))
    window_type = Column(SQLEnum(WindowType))
    
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Usage statistics
    total_windows_created = Column(Integer, default=0)
    total_focus_time = Column(Integer, default=0)  # in seconds
    average_session_duration = Column(Float, default=0)  # in minutes
    most_used_positions = Column(JSON, default=list)
    
    # Performance statistics
    average_load_time = Column(Float, default=0)  # in ms
    total_errors = Column(Integer, default=0)
    crash_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User")
    module = relationship("Module")

    def __repr__(self):
        return f"<WindowStatistics(user_id={self.user_id}, date={self.date}, windows_created={self.total_windows_created})>"