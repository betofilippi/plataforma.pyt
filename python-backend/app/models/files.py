"""
File and storage management database models.

This module contains SQLAlchemy models for file-related operations.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    JSON, Enum as SQLEnum, Index, UniqueConstraint, CheckConstraint,
    BigInteger, Float
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.ext.hybrid import hybrid_property
import enum
import uuid
import hashlib

from .base import Base
from ..schemas.files import (
    FileType, FileStatus, FilePermissionLevel, StorageBucket
)


class File(Base):
    """File model for storing file information."""
    __tablename__ = "files"
    __table_args__ = (
        Index('idx_file_owner_id', 'owner_id'),
        Index('idx_file_uploaded_by', 'uploaded_by'),
        Index('idx_file_filename', 'filename'),
        Index('idx_file_file_type', 'file_type'),
        Index('idx_file_status', 'status'),
        Index('idx_file_bucket', 'bucket'),
        Index('idx_file_folder_id', 'folder_id'),
        Index('idx_file_created_at', 'created_at'),
        Index('idx_file_checksum', 'checksum'),
        Index('idx_file_permission_level', 'permission_level'),
        UniqueConstraint('path', name='uq_file_path'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    path = Column(String(1000), nullable=False, unique=True)
    
    # File metadata
    file_type = Column(SQLEnum(FileType), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(BigInteger, nullable=False)
    checksum = Column(String(64))  # SHA-256 hash
    
    # Storage information
    bucket = Column(SQLEnum(StorageBucket), default=StorageBucket.USER_FILES, nullable=False)
    folder_id = Column(Integer, ForeignKey('file_folders.id', ondelete='SET NULL'))
    folder_path = Column(String(1000))
    
    # File status and permissions
    status = Column(SQLEnum(FileStatus), default=FileStatus.ACTIVE, nullable=False)
    permission_level = Column(SQLEnum(FilePermissionLevel), default=FilePermissionLevel.PRIVATE, nullable=False)
    
    # Ownership
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # URLs
    url = Column(String(500))  # Public URL if accessible
    thumbnail_url = Column(String(500))
    
    # Content information
    description = Column(Text)
    tags = Column(ARRAY(String), default=list)
    metadata = Column(JSON, default=dict)
    
    # Usage tracking
    download_count = Column(Integer, default=0)
    access_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    accessed_at = Column(DateTime)
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="owned_files")
    uploader = relationship("User", foreign_keys=[uploaded_by], back_populates="uploaded_files")
    folder = relationship("FileFolder", back_populates="files")
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")
    processing_jobs = relationship("FileProcessingJob", back_populates="file", cascade="all, delete-orphan")
    analysis_results = relationship("FileAnalysisResult", back_populates="file", cascade="all, delete-orphan")

    @validates('checksum')
    def generate_checksum(self, key, checksum):
        """Generate checksum if not provided."""
        if not checksum and hasattr(self, 'file_content'):
            return hashlib.sha256(self.file_content).hexdigest()
        return checksum

    @validates('filename')
    def sanitize_filename(self, key, filename):
        """Sanitize filename for storage."""
        if not filename:
            raise ValueError("Filename cannot be empty")
        
        # Remove path separators and other problematic characters
        import re
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
        sanitized = sanitized.strip('. ')
        
        if not sanitized:
            raise ValueError("Invalid filename")
        
        return sanitized[:255]  # Limit length

    @hybrid_property
    def file_extension(self):
        """Get file extension."""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''

    @hybrid_property
    def is_image(self):
        """Check if file is an image."""
        return self.file_type == FileType.IMAGE

    @hybrid_property
    def is_document(self):
        """Check if file is a document."""
        return self.file_type in [FileType.DOCUMENT, FileType.PDF, FileType.SPREADSHEET, FileType.PRESENTATION]

    @hybrid_property
    def size_mb(self):
        """Get file size in MB."""
        return round(self.size / (1024 * 1024), 2)

    def __repr__(self):
        return f"<File(filename='{self.filename}', type='{self.file_type}', size={self.size})>"


class FileFolder(Base):
    """Model for organizing files in folders."""
    __tablename__ = "file_folders"
    __table_args__ = (
        Index('idx_folder_owner_id', 'owner_id'),
        Index('idx_folder_parent_id', 'parent_id'),
        Index('idx_folder_path', 'path'),
        Index('idx_folder_bucket', 'bucket'),
        UniqueConstraint('owner_id', 'parent_id', 'name', 'bucket', name='uq_folder_owner_parent_name_bucket'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    parent_id = Column(Integer, ForeignKey('file_folders.id', ondelete='CASCADE'))
    bucket = Column(SQLEnum(StorageBucket), default=StorageBucket.USER_FILES, nullable=False)
    
    # Display settings
    color = Column(String(7))  # Hex color
    icon = Column(String(50))
    path = Column(String(1000))  # Full path for efficient queries
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("User", back_populates="file_folders")
    parent = relationship("FileFolder", remote_side=[id], back_populates="children")
    children = relationship("FileFolder", back_populates="parent", cascade="all, delete-orphan")
    files = relationship("File", back_populates="folder")

    @validates('path')
    def update_path(self, key, path):
        """Update path when parent changes."""
        if self.parent:
            return f"{self.parent.path}/{self.name}"
        return f"/{self.name}"

    @hybrid_property
    def total_files(self):
        """Get total number of files in folder and subfolders."""
        count = len(self.files)
        for child in self.children:
            count += child.total_files
        return count

    @hybrid_property
    def total_size(self):
        """Get total size of files in folder and subfolders."""
        size = sum(file.size for file in self.files)
        for child in self.children:
            size += child.total_size
        return size

    def __repr__(self):
        return f"<FileFolder(name='{self.name}', owner_id={self.owner_id}, path='{self.path}')>"


class FileVersion(Base):
    """Model for tracking file versions."""
    __tablename__ = "file_versions"
    __table_args__ = (
        Index('idx_version_file_id', 'file_id'),
        Index('idx_version_version_number', 'version_number'),
        Index('idx_version_created_at', 'created_at'),
        UniqueConstraint('file_id', 'version_number', name='uq_file_version_number'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(Integer, nullable=False)
    
    # Version metadata
    filename = Column(String(255), nullable=False)
    size = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=False)
    path = Column(String(1000), nullable=False)
    
    # Version information
    comment = Column(Text)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="versions")
    uploader = relationship("User")

    def __repr__(self):
        return f"<FileVersion(file_id={self.file_id}, version={self.version_number}, size={self.size})>"


class FileShare(Base):
    """Model for file sharing permissions."""
    __tablename__ = "file_shares"
    __table_args__ = (
        Index('idx_share_file_id', 'file_id'),
        Index('idx_share_shared_with', 'shared_with'),
        Index('idx_share_token', 'token'),
        Index('idx_share_created_at', 'created_at'),
        UniqueConstraint('token', name='uq_file_share_token'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    shared_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    shared_with = Column(Integer, ForeignKey('users.id'))  # Null for public shares
    
    token = Column(String(255), nullable=False, unique=True)
    permission_level = Column(String(50), nullable=False)  # read, write, admin
    
    # Share settings
    expires_at = Column(DateTime)
    password_hash = Column(String(255))
    download_limit = Column(Integer)
    message = Column(Text)
    
    # Usage tracking
    access_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    last_accessed = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="shares")
    sharer = relationship("User", foreign_keys=[shared_by])
    recipient = relationship("User", foreign_keys=[shared_with])

    def __repr__(self):
        return f"<FileShare(file_id={self.file_id}, token='{self.token[:10]}...', access_count={self.access_count})>"


class StorageQuota(Base):
    """Model for tracking user storage quotas."""
    __tablename__ = "storage_quotas"
    __table_args__ = (
        Index('idx_quota_user_id', 'user_id'),
        Index('idx_quota_bucket', 'bucket'),
        UniqueConstraint('user_id', 'bucket', name='uq_user_bucket_quota'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    bucket = Column(SQLEnum(StorageBucket), nullable=False)
    
    # Quota information
    total_quota = Column(BigInteger, nullable=False)  # bytes
    used_space = Column(BigInteger, default=0)  # bytes
    
    # Timestamps
    last_calculated = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="storage_quotas")

    @hybrid_property
    def available_space(self):
        """Get available storage space."""
        return max(0, self.total_quota - self.used_space)

    @hybrid_property
    def quota_percentage(self):
        """Get quota usage percentage."""
        if self.total_quota == 0:
            return 100.0
        return (self.used_space / self.total_quota) * 100

    def __repr__(self):
        return f"<StorageQuota(user_id={self.user_id}, bucket='{self.bucket}', used={self.used_space}/{self.total_quota})>"


class FileProcessingJob(Base):
    """Model for tracking file processing jobs."""
    __tablename__ = "file_processing_jobs"
    __table_args__ = (
        Index('idx_job_file_id', 'file_id'),
        Index('idx_job_job_type', 'job_type'),
        Index('idx_job_status', 'status'),
        Index('idx_job_created_at', 'created_at'),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    
    job_type = Column(String(100), nullable=False)  # thumbnail, virus_scan, content_analysis, etc.
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    
    # Job result
    result = Column(JSON, default=dict)
    error = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Relationships
    file = relationship("File", back_populates="processing_jobs")

    def __repr__(self):
        return f"<FileProcessingJob(id='{self.id}', file_id={self.file_id}, type='{self.job_type}', status='{self.status}')>"


class FileAnalysisResult(Base):
    """Model for storing file analysis results."""
    __tablename__ = "file_analysis_results"
    __table_args__ = (
        Index('idx_analysis_file_id', 'file_id'),
        Index('idx_analysis_analysis_type', 'analysis_type'),
        Index('idx_analysis_performed_at', 'performed_at'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    
    analysis_type = Column(String(100), nullable=False)  # content_type, metadata, ocr, etc.
    result = Column(JSON, nullable=False)
    confidence = Column(Float)  # 0.0 to 1.0 confidence score
    
    performed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="analysis_results")

    def __repr__(self):
        return f"<FileAnalysisResult(file_id={self.file_id}, type='{self.analysis_type}', confidence={self.confidence})>"


class VirusScanResult(Base):
    """Model for storing virus scan results."""
    __tablename__ = "virus_scan_results"
    __table_args__ = (
        Index('idx_virus_scan_file_id', 'file_id'),
        Index('idx_virus_scan_status', 'status'),
        Index('idx_virus_scan_scanned_at', 'scanned_at'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    status = Column(String(50), nullable=False)  # clean, infected, error
    scanner = Column(String(100))  # Scanner used
    scanner_version = Column(String(50))
    
    # Scan results
    threats_found = Column(ARRAY(String), default=list)
    scan_details = Column(JSON, default=dict)
    
    scanned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File")

    def __repr__(self):
        return f"<VirusScanResult(file_id={self.file_id}, status='{self.status}', threats={len(self.threats_found)})>"


class FileAccessLog(Base):
    """Model for logging file access events."""
    __tablename__ = "file_access_logs"
    __table_args__ = (
        Index('idx_access_log_file_id', 'file_id'),
        Index('idx_access_log_user_id', 'user_id'),
        Index('idx_access_log_action', 'action'),
        Index('idx_access_log_accessed_at', 'accessed_at'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(Integer, ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    
    action = Column(String(50), nullable=False)  # view, download, share, delete, etc.
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    
    # Additional context
    share_token = Column(String(255))  # If accessed via share
    metadata = Column(JSON, default=dict)
    
    accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    file = relationship("File")
    user = relationship("User")

    def __repr__(self):
        return f"<FileAccessLog(file_id={self.file_id}, user_id={self.user_id}, action='{self.action}')>"