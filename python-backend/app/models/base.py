"""
Base models and mixins for the Plataforma.dev application.

This module provides common database patterns, audit trails, and base functionality
for all SQLAlchemy models in the system.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, DateTime, Boolean, Text, UUID, JSON, Integer, Index
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import sqlalchemy as sa


# Create the base class for all models
Base = declarative_base()


class BaseModel(Base):
    """
    Base model class with common fields that all models should have.
    Includes primary key, timestamps, and common utility methods.
    """
    __abstract__ = True

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        """String representation of the model."""
        return f"<{self.__class__.__name__}(id={self.id})>"

    def to_dict(self, exclude_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Convert model instance to dictionary.
        
        Args:
            exclude_fields: List of field names to exclude from the dict
            
        Returns:
            Dictionary representation of the model
        """
        exclude_fields = exclude_fields or []
        result = {}
        
        for column in self.__table__.columns:
            if column.name not in exclude_fields:
                value = getattr(self, column.name)
                # Handle datetime and UUID serialization
                if isinstance(value, datetime):
                    result[column.name] = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    result[column.name] = str(value)
                else:
                    result[column.name] = value
        
        return result

    @classmethod
    def get_table_name(cls) -> str:
        """Get the table name for this model."""
        return cls.__tablename__


class AuditMixin:
    """
    Mixin for tracking who created and updated records.
    Provides created_by and updated_by fields with foreign key relationships.
    """
    
    @declared_attr
    def created_by_id(cls):
        return Column(UUID(as_uuid=True), nullable=True, comment="ID of user who created this record")
    
    @declared_attr
    def updated_by_id(cls):
        return Column(UUID(as_uuid=True), nullable=True, comment="ID of user who last updated this record")

    def set_audit_fields(self, user_id: Optional[uuid.UUID], is_creation: bool = False):
        """
        Set audit fields for creation or update.
        
        Args:
            user_id: ID of the user performing the action
            is_creation: Whether this is a creation (sets created_by) or update
        """
        if is_creation and hasattr(self, 'created_by_id'):
            self.created_by_id = user_id
        
        if hasattr(self, 'updated_by_id'):
            self.updated_by_id = user_id


class SoftDeleteMixin:
    """
    Mixin for soft delete functionality.
    Records are marked as deleted instead of being physically removed.
    """
    
    deleted_at = Column(DateTime(timezone=True), nullable=True, comment="Timestamp when record was soft deleted")
    deleted_by_id = Column(UUID(as_uuid=True), nullable=True, comment="ID of user who deleted this record")
    is_deleted = Column(Boolean, default=False, nullable=False, comment="Flag indicating if record is soft deleted")

    def soft_delete(self, deleted_by: Optional[uuid.UUID] = None):
        """
        Mark record as soft deleted.
        
        Args:
            deleted_by: ID of user performing the deletion
        """
        self.is_deleted = True
        self.deleted_at = datetime.utcnow()
        self.deleted_by_id = deleted_by

    def restore(self):
        """Restore a soft deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by_id = None

    @property
    def is_active(self) -> bool:
        """Check if record is not soft deleted."""
        return not self.is_deleted


class VersionMixin:
    """
    Mixin for optimistic locking using version numbers.
    Helps prevent concurrent modification conflicts.
    """
    
    version = Column(Integer, default=0, nullable=False, comment="Version number for optimistic locking")

    def increment_version(self):
        """Increment the version number."""
        self.version += 1


class MetadataMixin:
    """
    Mixin for storing flexible metadata as JSON.
    Useful for configuration, settings, and extensible data.
    """
    
    metadata_ = Column('metadata', JSON, default={}, nullable=False, comment="Flexible metadata storage")

    def get_metadata(self, key: str, default: Any = None) -> Any:
        """
        Get a metadata value by key.
        
        Args:
            key: Metadata key to retrieve
            default: Default value if key not found
            
        Returns:
            Metadata value or default
        """
        if not self.metadata_:
            return default
        return self.metadata_.get(key, default)

    def set_metadata(self, key: str, value: Any):
        """
        Set a metadata value by key.
        
        Args:
            key: Metadata key to set
            value: Value to set
        """
        if not self.metadata_:
            self.metadata_ = {}
        self.metadata_[key] = value

    def update_metadata(self, updates: Dict[str, Any]):
        """
        Update multiple metadata values.
        
        Args:
            updates: Dictionary of key-value pairs to update
        """
        if not self.metadata_:
            self.metadata_ = {}
        self.metadata_.update(updates)


class StatusMixin:
    """
    Mixin for records that have an active/inactive status.
    """
    
    is_active = Column(Boolean, default=True, nullable=False, comment="Whether this record is active")

    def activate(self):
        """Mark record as active."""
        self.is_active = True

    def deactivate(self):
        """Mark record as inactive."""
        self.is_active = False


class NamedMixin:
    """
    Mixin for records that have name and display name fields.
    Common pattern for many business entities.
    """
    
    name = Column(String(100), nullable=False, comment="Internal name/identifier")
    display_name = Column(String(255), nullable=False, comment="Human-readable display name")
    description = Column(Text, nullable=True, comment="Optional description")

    @property
    def label(self) -> str:
        """Get the best label for display (display_name or name)."""
        return self.display_name or self.name


class TimestampMixin:
    """
    Mixin for additional timestamp tracking.
    Extends base timestamps with last activity and access times.
    """
    
    last_accessed_at = Column(DateTime(timezone=True), nullable=True, comment="Last time record was accessed")
    last_activity_at = Column(DateTime(timezone=True), nullable=True, comment="Last time record had activity")

    def touch_accessed(self):
        """Update last accessed timestamp."""
        self.last_accessed_at = datetime.utcnow()

    def touch_activity(self):
        """Update last activity timestamp."""
        self.last_activity_at = datetime.utcnow()


class SlugMixin:
    """
    Mixin for URL-friendly slug generation.
    Useful for records that need clean URLs.
    """
    
    slug = Column(String(150), nullable=True, unique=True, comment="URL-friendly identifier")

    @staticmethod
    def generate_slug(text: str) -> str:
        """
        Generate a URL-friendly slug from text.
        
        Args:
            text: Text to convert to slug
            
        Returns:
            URL-friendly slug
        """
        import re
        # Convert to lowercase and replace spaces with hyphens
        slug = re.sub(r'[^\w\s-]', '', text.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        return slug.strip('-')


# Enhanced Base Model combining common mixins
class EnhancedBaseModel(BaseModel, AuditMixin, SoftDeleteMixin, StatusMixin, MetadataMixin):
    """
    Enhanced base model with audit trail, soft delete, status, and metadata support.
    Use this for most business entities that need full tracking capabilities.
    """
    __abstract__ = True


# Specialized base models for different use cases
class NamedEntityModel(EnhancedBaseModel, NamedMixin, SlugMixin):
    """
    Base model for named entities like roles, permissions, modules, etc.
    Includes name, display name, description, and slug generation.
    """
    __abstract__ = True


class ConfigurableModel(EnhancedBaseModel, NamedMixin):
    """
    Base model for configurable entities that store settings.
    """
    __abstract__ = True
    
    settings = Column(JSON, default={}, nullable=False, comment="Configuration settings")

    def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a configuration setting."""
        if not self.settings:
            return default
        return self.settings.get(key, default)

    def set_setting(self, key: str, value: Any):
        """Set a configuration setting."""
        if not self.settings:
            self.settings = {}
        self.settings[key] = value

    def update_settings(self, updates: Dict[str, Any]):
        """Update multiple settings."""
        if not self.settings:
            self.settings = {}
        self.settings.update(updates)


# Utility functions for common database operations
class ModelUtils:
    """Utility class for common model operations."""

    @staticmethod
    def create_indexes_for_common_fields():
        """
        Create common indexes that should be applied to tables using mixins.
        This should be called after all models are defined.
        """
        indexes = []
        
        # Common indexes for audit fields
        indexes.extend([
            Index('idx_created_at', 'created_at'),
            Index('idx_updated_at', 'updated_at'),
            Index('idx_created_by', 'created_by_id'),
            Index('idx_updated_by', 'updated_by_id'),
        ])
        
        # Soft delete indexes
        indexes.extend([
            Index('idx_is_deleted', 'is_deleted'),
            Index('idx_deleted_at', 'deleted_at'),
        ])
        
        # Status indexes
        indexes.extend([
            Index('idx_is_active', 'is_active'),
        ])
        
        return indexes

    @staticmethod
    def get_active_records_filter():
        """Get SQLAlchemy filter for active (non-deleted) records."""
        return sa.and_(
            sa.or_(BaseModel.is_deleted.is_(None), BaseModel.is_deleted.is_(False)),
            BaseModel.is_active.is_(True)
        )


# Database constraints and validation
class DatabaseConstraints:
    """Common database constraints and validation patterns."""
    
    # Email validation pattern
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    # Phone number pattern (international format)
    PHONE_PATTERN = r'^\+?[1-9]\d{1,14}$'
    
    # Username/identifier pattern
    USERNAME_PATTERN = r'^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$'
    
    # Slug pattern
    SLUG_PATTERN = r'^[a-z0-9]+(?:-[a-z0-9]+)*$'
    
    # Color hex pattern
    COLOR_HEX_PATTERN = r'^#[0-9a-fA-F]{6}$'
    
    # Common string length constraints
    MAX_EMAIL_LENGTH = 255
    MAX_NAME_LENGTH = 255
    MAX_SHORT_NAME_LENGTH = 100
    MAX_DESCRIPTION_LENGTH = 2000
    MAX_SLUG_LENGTH = 150
    MAX_URL_LENGTH = 2048
    MAX_COLOR_LENGTH = 7

    @classmethod
    def get_email_constraint(cls, column_name: str = 'email'):
        """Get email validation constraint."""
        return sa.CheckConstraint(
            f"{column_name} ~ '{cls.EMAIL_PATTERN}'",
            name=f'ck_{column_name}_format'
        )

    @classmethod
    def get_phone_constraint(cls, column_name: str = 'phone'):
        """Get phone validation constraint."""
        return sa.CheckConstraint(
            f"{column_name} ~ '{cls.PHONE_PATTERN}' OR {column_name} IS NULL",
            name=f'ck_{column_name}_format'
        )

    @classmethod
    def get_color_constraint(cls, column_name: str = 'color'):
        """Get color hex validation constraint."""
        return sa.CheckConstraint(
            f"{column_name} ~ '{cls.COLOR_HEX_PATTERN}'",
            name=f'ck_{column_name}_format'
        )