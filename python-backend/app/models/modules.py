"""
Module management database models.

This module contains SQLAlchemy models for module-related operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    JSON, Enum as SQLEnum, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.hybrid import hybrid_property
import enum
import uuid

from .base import Base
from ..schemas.modules import ModuleStatus, ModuleType, ModulePermissionLevel


class Module(Base):
    """Module model for storing module information."""
    __tablename__ = "modules"
    __table_args__ = (
        Index('idx_module_name', 'name'),
        Index('idx_module_slug', 'slug'),
        Index('idx_module_status', 'status'),
        Index('idx_module_type', 'module_type'),
        Index('idx_module_created_at', 'created_at'),
        UniqueConstraint('name', name='uq_module_name'),
        UniqueConstraint('slug', name='uq_module_slug'),
        CheckConstraint('char_length(name) >= 1', name='ck_module_name_length'),
        CheckConstraint('char_length(display_name) >= 1', name='ck_module_display_name_length'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    version = Column(String(50), nullable=False)
    author = Column(String(255))
    module_type = Column(SQLEnum(ModuleType), default=ModuleType.USER, nullable=False)
    status = Column(SQLEnum(ModuleStatus), default=ModuleStatus.ACTIVE, nullable=False)
    permission_level = Column(SQLEnum(ModulePermissionLevel), default=ModulePermissionLevel.PUBLIC, nullable=False)
    
    # Module source and configuration
    source_url = Column(String(500))
    config = Column(JSON, default=dict)
    dependencies = Column(ARRAY(String), default=list)
    
    # Module metadata
    tags = Column(ARRAY(String), default=list)
    metadata = Column(JSON, default=dict)
    
    # Installation and usage tracking
    is_installed = Column(Boolean, default=False)
    is_enabled = Column(Boolean, default=True)
    install_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    installed_at = Column(DateTime)
    last_used = Column(DateTime)
    
    # Relationships
    installations = relationship("ModuleInstallation", back_populates="module", cascade="all, delete-orphan")
    permissions = relationship("ModulePermission", back_populates="module", cascade="all, delete-orphan")
    user_permissions = relationship("ModuleUserPermission", back_populates="module", cascade="all, delete-orphan")
    configurations = relationship("ModuleConfiguration", back_populates="module", cascade="all, delete-orphan")
    health_checks = relationship("ModuleHealth", back_populates="module", cascade="all, delete-orphan")
    usage_metrics = relationship("ModuleUsageMetrics", back_populates="module", cascade="all, delete-orphan")
    reviews = relationship("ModuleReview", back_populates="module", cascade="all, delete-orphan")

    @validates('name')
    def validate_name(self, key, name):
        """Validate module name format."""
        if not name or not name.strip():
            raise ValueError("Module name cannot be empty")
        
        # Convert to lowercase and replace spaces with hyphens
        clean_name = name.lower().replace(' ', '-')
        
        # Check for valid characters
        import re
        if not re.match(r'^[a-z0-9_-]+$', clean_name):
            raise ValueError("Module name can only contain lowercase letters, numbers, hyphens, and underscores")
        
        return clean_name

    @validates('slug')
    def validate_slug(self, key, slug):
        """Validate module slug format."""
        if not slug:
            # Generate slug from name if not provided
            return self.name.lower().replace(' ', '-').replace('_', '-')
        
        import re
        if not re.match(r'^[a-z0-9-]+$', slug):
            raise ValueError("Module slug can only contain lowercase letters, numbers, and hyphens")
        
        return slug

    @hybrid_property
    def is_system_module(self):
        """Check if this is a system module."""
        return self.module_type == ModuleType.SYSTEM

    @hybrid_property
    def average_rating(self):
        """Calculate average rating from reviews."""
        if not self.reviews:
            return None
        
        total_rating = sum(review.rating for review in self.reviews)
        return total_rating / len(self.reviews)

    def __repr__(self):
        return f"<Module(name='{self.name}', version='{self.version}', status='{self.status}')>"


class ModuleInstallation(Base):
    """Model for tracking module installations."""
    __tablename__ = "module_installations"
    __table_args__ = (
        Index('idx_installation_module_id', 'module_id'),
        Index('idx_installation_user_id', 'user_id'),
        Index('idx_installation_status', 'status'),
        Index('idx_installation_installed_at', 'installed_at'),
        UniqueConstraint('module_id', 'user_id', name='uq_module_user_installation'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    version = Column(String(50), nullable=False)
    status = Column(SQLEnum(ModuleStatus), default=ModuleStatus.INSTALLING, nullable=False)
    config = Column(JSON, default=dict)
    
    installed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="installations")
    user = relationship("User", back_populates="module_installations")

    def __repr__(self):
        return f"<ModuleInstallation(module_id={self.module_id}, user_id={self.user_id}, status='{self.status}')>"


class ModuleConfiguration(Base):
    """Model for storing module configurations."""
    __tablename__ = "module_configurations"
    __table_args__ = (
        Index('idx_config_module_id', 'module_id'),
        Index('idx_config_user_id', 'user_id'),
        UniqueConstraint('module_id', 'user_id', name='uq_module_user_config'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    config = Column(JSON, nullable=False, default=dict)
    schema = Column(JSON, default=list)  # Configuration schema definition
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="configurations")
    user = relationship("User", back_populates="module_configurations")

    def __repr__(self):
        return f"<ModuleConfiguration(module_id={self.module_id}, user_id={self.user_id})>"


class ModulePermission(Base):
    """Model for storing module permission definitions."""
    __tablename__ = "module_permissions"
    __table_args__ = (
        Index('idx_permission_module_id', 'module_id'),
        Index('idx_permission_name', 'permission'),
        UniqueConstraint('module_id', 'permission', name='uq_module_permission'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    
    permission = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    resource = Column(String(255))
    actions = Column(ARRAY(String), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    module = relationship("Module", back_populates="permissions")

    def __repr__(self):
        return f"<ModulePermission(module_id={self.module_id}, permission='{self.permission}')>"


class ModuleUserPermission(Base):
    """Model for storing user permissions for modules."""
    __tablename__ = "module_user_permissions"
    __table_args__ = (
        Index('idx_user_permission_module_id', 'module_id'),
        Index('idx_user_permission_user_id', 'user_id'),
        Index('idx_user_permission_granted_at', 'granted_at'),
        UniqueConstraint('module_id', 'user_id', name='uq_module_user_permission'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    granted_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    permissions = Column(ARRAY(String), nullable=False)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime)
    
    # Relationships
    module = relationship("Module", back_populates="user_permissions")
    user = relationship("User", foreign_keys=[user_id], back_populates="module_permissions")
    granted_by_user = relationship("User", foreign_keys=[granted_by])

    def __repr__(self):
        return f"<ModuleUserPermission(module_id={self.module_id}, user_id={self.user_id})>"


class ModuleHealth(Base):
    """Model for tracking module health status."""
    __tablename__ = "module_health"
    __table_args__ = (
        Index('idx_health_module_id', 'module_id'),
        Index('idx_health_last_check', 'last_check'),
        Index('idx_health_status', 'status'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    status = Column(SQLEnum(ModuleStatus), nullable=False)
    health_score = Column(Integer, default=100)  # 0-100 health score
    last_check = Column(DateTime, default=datetime.utcnow, nullable=False)
    issues = Column(ARRAY(String), default=list)
    performance_metrics = Column(JSON, default=dict)
    dependencies_status = Column(JSON, default=dict)
    
    # Relationships
    module = relationship("Module", back_populates="health_checks")

    def __repr__(self):
        return f"<ModuleHealth(module_id={self.module_id}, status='{self.status}', health_score={self.health_score})>"


class ModuleUsageMetrics(Base):
    """Model for tracking module usage metrics."""
    __tablename__ = "module_usage_metrics"
    __table_args__ = (
        Index('idx_usage_module_id', 'module_id'),
        Index('idx_usage_date', 'date'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    total_uses = Column(Integer, default=0)
    unique_users = Column(Integer, default=0)
    avg_session_duration = Column(Integer)  # in minutes
    performance_score = Column(Integer)  # 0-100 performance score
    
    # Daily metrics
    daily_metrics = Column(JSON, default=dict)
    
    # Relationships
    module = relationship("Module", back_populates="usage_metrics")

    def __repr__(self):
        return f"<ModuleUsageMetrics(module_id={self.module_id}, date={self.date}, total_uses={self.total_uses})>"


class ModuleReview(Base):
    """Model for storing module reviews."""
    __tablename__ = "module_reviews"
    __table_args__ = (
        Index('idx_review_module_id', 'module_id'),
        Index('idx_review_user_id', 'user_id'),
        Index('idx_review_rating', 'rating'),
        Index('idx_review_created_at', 'created_at'),
        UniqueConstraint('module_id', 'user_id', name='uq_module_user_review'),
        CheckConstraint('rating >= 0 AND rating <= 5', name='ck_review_rating_range'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    rating = Column(Integer, nullable=False)  # 0-5 rating
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    helpful_votes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("Module", back_populates="reviews")
    user = relationship("User", back_populates="module_reviews")

    def __repr__(self):
        return f"<ModuleReview(module_id={self.module_id}, user_id={self.user_id}, rating={self.rating})>"


class ModuleMarketplace(Base):
    """Model for storing module marketplace information."""
    __tablename__ = "module_marketplace"
    __table_args__ = (
        Index('idx_marketplace_module_id', 'module_id'),
        Index('idx_marketplace_rating', 'rating'),
        Index('idx_marketplace_download_count', 'download_count'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey('modules.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    marketplace_id = Column(String(255), unique=True)
    rating = Column(Integer, default=0)  # Average rating * 10 for precision
    reviews_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    price = Column(Integer)  # Price in cents
    license = Column(String(100))
    screenshots = Column(ARRAY(String), default=list)
    documentation_url = Column(String(500))
    
    # SEO and marketing
    keywords = Column(ARRAY(String), default=list)
    featured = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = relationship("Module")

    def __repr__(self):
        return f"<ModuleMarketplace(module_id={self.module_id}, rating={self.rating}, downloads={self.download_count})>"