"""
File and storage models for document management.

This module implements comprehensive file and document management including:
- File storage with metadata
- Document management and versioning
- Media and attachment handling
- Storage buckets and organization
- File sharing and permissions
- Thumbnail and preview generation
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from sqlalchemy import (
    Column, String, DateTime, Boolean, Text, UUID, JSON, Integer, 
    ForeignKey, UniqueConstraint, CheckConstraint, Index, BigInteger,
    Float, ARRAY
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import JSONB, BYTEA
import sqlalchemy as sa

from .base import (
    BaseModel, EnhancedBaseModel, NamedEntityModel, 
    DatabaseConstraints, VersionMixin, TimestampMixin
)


# Enums for type safety
class FileType(str, Enum):
    """File type categories."""
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    SPREADSHEET = "spreadsheet"
    PRESENTATION = "presentation"
    CODE = "code"
    DATA = "data"
    OTHER = "other"


class StorageProvider(str, Enum):
    """Storage provider types."""
    LOCAL = "local"
    S3 = "s3"
    GOOGLE_CLOUD = "google_cloud"
    AZURE = "azure"
    SUPABASE = "supabase"
    CLOUDINARY = "cloudinary"


class FileStatus(str, Enum):
    """File processing status."""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    QUARANTINED = "quarantined"
    DELETED = "deleted"


class SharePermission(str, Enum):
    """File sharing permissions."""
    VIEW = "view"
    DOWNLOAD = "download"
    EDIT = "edit"
    ADMIN = "admin"


class ThumbnailSize(str, Enum):
    """Standard thumbnail sizes."""
    SMALL = "small"      # 150x150
    MEDIUM = "medium"    # 300x300
    LARGE = "large"      # 600x600
    XLARGE = "xlarge"    # 1200x1200


class StorageBucket(NamedEntityModel):
    """
    Storage buckets for organizing files.
    """
    __tablename__ = 'storage_buckets'

    bucket_key = Column(String(100), nullable=False, unique=True, comment="Unique bucket identifier")
    provider = Column(sa.Enum(StorageProvider), nullable=False)
    provider_bucket_name = Column(String(255), nullable=False, comment="Provider-specific bucket name")
    
    # Configuration
    region = Column(String(50), nullable=True)
    endpoint_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    access_config = Column(JSONB, default={}, nullable=False, comment="Provider access configuration")
    
    # Limits and quotas
    max_file_size = Column(BigInteger, nullable=True, comment="Max file size in bytes")
    storage_quota = Column(BigInteger, nullable=True, comment="Storage quota in bytes")
    current_usage = Column(BigInteger, default=0, nullable=False, comment="Current usage in bytes")
    file_count = Column(Integer, default=0, nullable=False)
    
    # Access control
    is_public = Column(Boolean, default=False, nullable=False)
    public_read = Column(Boolean, default=False, nullable=False)
    public_write = Column(Boolean, default=False, nullable=False)
    
    # Policies
    allowed_mime_types = Column(ARRAY(String), nullable=True, comment="Allowed MIME types")
    blocked_mime_types = Column(ARRAY(String), nullable=True, comment="Blocked MIME types")
    auto_delete_after_days = Column(Integer, nullable=True)
    versioning_enabled = Column(Boolean, default=False, nullable=False)
    encryption_enabled = Column(Boolean, default=True, nullable=False)

    # Relationships
    files = relationship("File", back_populates="bucket", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            f"provider IN {tuple(provider.value for provider in StorageProvider)}",
            name='ck_bucket_provider_valid'
        ),
        CheckConstraint('max_file_size IS NULL OR max_file_size > 0', name='ck_bucket_max_file_size_positive'),
        CheckConstraint('storage_quota IS NULL OR storage_quota > 0', name='ck_bucket_quota_positive'),
        CheckConstraint('current_usage >= 0', name='ck_bucket_usage_non_negative'),
        CheckConstraint('file_count >= 0', name='ck_bucket_file_count_non_negative'),
        Index('idx_storage_buckets_key', 'bucket_key'),
        Index('idx_storage_buckets_provider', 'provider'),
        Index('idx_storage_buckets_public', 'is_public'),
    )

    @property
    def is_quota_exceeded(self) -> bool:
        """Check if storage quota is exceeded."""
        return self.storage_quota is not None and self.current_usage >= self.storage_quota

    @property
    def quota_percentage(self) -> Optional[float]:
        """Get quota usage percentage."""
        if self.storage_quota is None:
            return None
        return (self.current_usage / self.storage_quota) * 100 if self.storage_quota > 0 else 0

    def can_store_file(self, file_size: int, mime_type: str) -> bool:
        """Check if a file can be stored in this bucket."""
        # Check file size
        if self.max_file_size and file_size > self.max_file_size:
            return False
        
        # Check quota
        if self.storage_quota and (self.current_usage + file_size) > self.storage_quota:
            return False
        
        # Check MIME type restrictions
        if self.blocked_mime_types and mime_type in self.blocked_mime_types:
            return False
        
        if self.allowed_mime_types and mime_type not in self.allowed_mime_types:
            return False
        
        return True


class File(EnhancedBaseModel, VersionMixin, TimestampMixin):
    """
    File storage model with comprehensive metadata.
    """
    __tablename__ = 'files'

    # File identification
    file_key = Column(String(255), nullable=False, unique=True, comment="Unique file identifier")
    original_name = Column(String(500), nullable=False)
    display_name = Column(String(500), nullable=True)
    
    # File properties
    mime_type = Column(String(100), nullable=False)
    file_type = Column(sa.Enum(FileType), nullable=False)
    file_extension = Column(String(10), nullable=True)
    size_bytes = Column(BigInteger, nullable=False)
    
    # Storage information
    bucket_id = Column(UUID(as_uuid=True), ForeignKey('storage_buckets.id', ondelete='CASCADE'), nullable=False)
    storage_path = Column(String(1000), nullable=False, comment="Full path in storage provider")
    storage_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True, comment="Direct access URL")
    
    # File status and processing
    status = Column(sa.Enum(FileStatus), default=FileStatus.UPLOADING, nullable=False)
    upload_progress = Column(Float, default=0.0, nullable=False, comment="Upload progress 0-100")
    error_message = Column(Text, nullable=True)
    processing_log = Column(JSONB, default=[], nullable=False, comment="Processing steps log")
    
    # Ownership and access
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    
    # Content analysis
    content_hash = Column(String(64), nullable=True, comment="SHA-256 hash of file content")
    duplicate_of_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='SET NULL'), nullable=True)
    
    # Metadata and tags
    alt_text = Column(Text, nullable=True, comment="Alt text for accessibility")
    description = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    custom_metadata = Column(JSONB, default={}, nullable=False)
    
    # Media-specific metadata
    width = Column(Integer, nullable=True, comment="Image/video width")
    height = Column(Integer, nullable=True, comment="Image/video height")
    duration = Column(Float, nullable=True, comment="Audio/video duration in seconds")
    bitrate = Column(Integer, nullable=True, comment="Audio/video bitrate")
    fps = Column(Float, nullable=True, comment="Video frames per second")
    color_space = Column(String(20), nullable=True, comment="Image color space")
    
    # Document-specific metadata
    page_count = Column(Integer, nullable=True, comment="Number of pages")
    word_count = Column(Integer, nullable=True, comment="Word count for text documents")
    language = Column(String(5), nullable=True, comment="Document language")
    
    # Access control
    is_public = Column(Boolean, default=False, nullable=False)
    is_downloadable = Column(Boolean, default=True, nullable=False)
    password_protected = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(255), nullable=True)
    
    # Lifecycle management
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(BigInteger, default=0, nullable=False)
    download_count = Column(BigInteger, default=0, nullable=False)

    # Relationships
    bucket = relationship("StorageBucket", back_populates="files")
    owner = relationship("User", foreign_keys=[owner_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    organization = relationship("Organization")
    duplicate_of = relationship("File", remote_side="File.id", backref=backref("duplicates"))
    versions = relationship("FileVersion", back_populates="file", cascade="all, delete-orphan")
    shares = relationship("FileShare", back_populates="file", cascade="all, delete-orphan")
    thumbnails = relationship("FileThumbnail", back_populates="file", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="file")

    __table_args__ = (
        CheckConstraint(
            f"file_type IN {tuple(ftype.value for ftype in FileType)}",
            name='ck_file_type_valid'
        ),
        CheckConstraint(
            f"status IN {tuple(status.value for status in FileStatus)}",
            name='ck_file_status_valid'
        ),
        CheckConstraint('size_bytes >= 0', name='ck_file_size_non_negative'),
        CheckConstraint('upload_progress >= 0 AND upload_progress <= 100', name='ck_upload_progress_range'),
        CheckConstraint('width IS NULL OR width > 0', name='ck_file_width_positive'),
        CheckConstraint('height IS NULL OR height > 0', name='ck_file_height_positive'),
        CheckConstraint('duration IS NULL OR duration >= 0', name='ck_file_duration_non_negative'),
        CheckConstraint('access_count >= 0', name='ck_file_access_count_non_negative'),
        CheckConstraint('download_count >= 0', name='ck_file_download_count_non_negative'),
        Index('idx_files_key', 'file_key'),
        Index('idx_files_bucket', 'bucket_id'),
        Index('idx_files_owner', 'owner_id'),
        Index('idx_files_organization', 'organization_id'),
        Index('idx_files_type', 'file_type'),
        Index('idx_files_mime', 'mime_type'),
        Index('idx_files_status', 'status'),
        Index('idx_files_hash', 'content_hash'),
        Index('idx_files_public', 'is_public'),
        Index('idx_files_expires', 'expires_at'),
        Index('idx_files_accessed', 'last_accessed_at'),
    )

    @property
    def is_image(self) -> bool:
        """Check if file is an image."""
        return self.file_type == FileType.IMAGE

    @property
    def is_video(self) -> bool:
        """Check if file is a video."""
        return self.file_type == FileType.VIDEO

    @property
    def is_audio(self) -> bool:
        """Check if file is an audio file."""
        return self.file_type == FileType.AUDIO

    @property
    def is_document(self) -> bool:
        """Check if file is a document."""
        return self.file_type in [FileType.DOCUMENT, FileType.SPREADSHEET, FileType.PRESENTATION]

    @property
    def is_expired(self) -> bool:
        """Check if file has expired."""
        return self.expires_at is not None and self.expires_at <= datetime.utcnow()

    @property
    def size_mb(self) -> float:
        """Get file size in megabytes."""
        return self.size_bytes / (1024 * 1024)

    @property
    def aspect_ratio(self) -> Optional[float]:
        """Get aspect ratio for images/videos."""
        if self.width and self.height and self.height > 0:
            return self.width / self.height
        return None

    def increment_access_count(self):
        """Increment access count and update last accessed time."""
        self.access_count += 1
        self.last_accessed_at = datetime.utcnow()

    def increment_download_count(self):
        """Increment download count."""
        self.download_count += 1
        self.last_accessed_at = datetime.utcnow()


class FileVersion(BaseModel, TimestampMixin):
    """
    File version tracking for versioned files.
    """
    __tablename__ = 'file_versions'

    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    version_number = Column(Integer, nullable=False)
    file_key = Column(String(255), nullable=False, unique=True)
    storage_path = Column(String(1000), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    content_hash = Column(String(64), nullable=False)
    
    # Version metadata
    version_name = Column(String(255), nullable=True)
    change_description = Column(Text, nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Status
    is_current = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    file = relationship("File", back_populates="versions")
    created_by = relationship("User")

    __table_args__ = (
        UniqueConstraint('file_id', 'version_number', name='uq_file_version_number'),
        CheckConstraint('version_number > 0', name='ck_file_version_number_positive'),
        CheckConstraint('size_bytes >= 0', name='ck_file_version_size_non_negative'),
        Index('idx_file_versions_file', 'file_id'),
        Index('idx_file_versions_current', 'file_id', 'is_current'),
        Index('idx_file_versions_hash', 'content_hash'),
    )


class FileThumbnail(BaseModel):
    """
    Generated thumbnails for files.
    """
    __tablename__ = 'file_thumbnails'

    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    size = Column(sa.Enum(ThumbnailSize), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    
    # Storage information
    storage_path = Column(String(1000), nullable=False)
    storage_url = Column(String(DatabaseConstraints.MAX_URL_LENGTH), nullable=True)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Generation metadata
    generated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    generation_method = Column(String(50), nullable=True, comment="Method used to generate thumbnail")
    quality = Column(Integer, default=85, nullable=False, comment="JPEG quality or similar")

    # Relationships
    file = relationship("File", back_populates="thumbnails")

    __table_args__ = (
        UniqueConstraint('file_id', 'size', name='uq_file_thumbnail_size'),
        CheckConstraint(
            f"size IN {tuple(size.value for size in ThumbnailSize)}",
            name='ck_thumbnail_size_valid'
        ),
        CheckConstraint('width > 0 AND height > 0', name='ck_thumbnail_dimensions_positive'),
        CheckConstraint('file_size > 0', name='ck_thumbnail_file_size_positive'),
        CheckConstraint('quality >= 1 AND quality <= 100', name='ck_thumbnail_quality_range'),
        Index('idx_file_thumbnails_file', 'file_id'),
        Index('idx_file_thumbnails_size', 'size'),
    )


class FileShare(BaseModel, TimestampMixin):
    """
    File sharing with external users or public links.
    """
    __tablename__ = 'file_shares'

    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    share_token = Column(String(100), nullable=False, unique=True, comment="Unique share token")
    
    # Sharing configuration
    shared_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    shared_with_email = Column(String(DatabaseConstraints.MAX_EMAIL_LENGTH), nullable=True)
    shared_with_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    # Permissions
    permission = Column(sa.Enum(SharePermission), default=SharePermission.VIEW, nullable=False)
    can_download = Column(Boolean, default=True, nullable=False)
    can_reshare = Column(Boolean, default=False, nullable=False)
    
    # Access control
    is_public_link = Column(Boolean, default=False, nullable=False)
    requires_login = Column(Boolean, default=True, nullable=False)
    password_protected = Column(Boolean, default=False, nullable=False)
    password_hash = Column(String(255), nullable=True)
    
    # Lifecycle
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_downloads = Column(Integer, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(Integer, default=0, nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    file = relationship("File", back_populates="shares")
    shared_by = relationship("User", foreign_keys=[shared_by_id])
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    revoked_by = relationship("User", foreign_keys=[revoked_by_id])

    __table_args__ = (
        CheckConstraint(
            f"permission IN {tuple(perm.value for perm in SharePermission)}",
            name='ck_file_share_permission_valid'
        ),
        CheckConstraint('max_downloads IS NULL OR max_downloads > 0', name='ck_share_max_downloads_positive'),
        CheckConstraint('download_count >= 0', name='ck_share_download_count_non_negative'),
        CheckConstraint('access_count >= 0', name='ck_share_access_count_non_negative'),
        DatabaseConstraints.get_email_constraint('shared_with_email'),
        Index('idx_file_shares_file', 'file_id'),
        Index('idx_file_shares_token', 'share_token'),
        Index('idx_file_shares_shared_by', 'shared_by_id'),
        Index('idx_file_shares_shared_with', 'shared_with_user_id'),
        Index('idx_file_shares_expires', 'expires_at'),
        Index('idx_file_shares_public', 'is_public_link'),
    )

    @property
    def is_expired(self) -> bool:
        """Check if share has expired."""
        return self.expires_at is not None and self.expires_at <= datetime.utcnow()

    @property
    def is_download_limit_exceeded(self) -> bool:
        """Check if download limit has been exceeded."""
        return self.max_downloads is not None and self.download_count >= self.max_downloads

    def can_be_accessed(self) -> bool:
        """Check if share can be accessed."""
        return (
            self.is_active and 
            not self.is_expired and 
            not self.is_download_limit_exceeded and
            self.revoked_at is None
        )


class Document(EnhancedBaseModel, VersionMixin, TimestampMixin):
    """
    Document management for structured document handling.
    """
    __tablename__ = 'documents'

    # Document identification
    title = Column(String(500), nullable=False)
    document_type = Column(String(50), nullable=False, comment="Document type (contract, report, etc.)")
    category = Column(String(100), nullable=True)
    
    # File association
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    
    # Document metadata
    author = Column(String(255), nullable=True)
    subject = Column(Text, nullable=True)
    keywords = Column(ARRAY(String), nullable=True)
    language = Column(String(5), nullable=True)
    
    # Content
    content_text = Column(Text, nullable=True, comment="Extracted text content")
    content_summary = Column(Text, nullable=True, comment="AI-generated summary")
    
    # Document properties
    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    character_count = Column(Integer, nullable=True)
    
    # Ownership and access
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    
    # Status and workflow
    status = Column(String(50), default='draft', nullable=False)
    workflow_state = Column(String(50), nullable=True)
    
    # Dates and lifecycle
    document_date = Column(DateTime(timezone=True), nullable=True, comment="Document creation/effective date")
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    review_date = Column(DateTime(timezone=True), nullable=True)
    
    # Content analysis
    content_hash = Column(String(64), nullable=True, comment="Hash of document content")
    similarity_vector = Column(JSONB, nullable=True, comment="Document similarity vector for ML")
    
    # Search and indexing
    search_vector = Column(Text, nullable=True, comment="Full-text search vector")
    indexed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    file = relationship("File", back_populates="documents")
    owner = relationship("User")
    organization = relationship("Organization")
    attachments = relationship("DocumentAttachment", back_populates="document", cascade="all, delete-orphan")
    annotations = relationship("DocumentAnnotation", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('page_count IS NULL OR page_count > 0', name='ck_document_page_count_positive'),
        CheckConstraint('word_count IS NULL OR word_count >= 0', name='ck_document_word_count_non_negative'),
        CheckConstraint('character_count IS NULL OR character_count >= 0', name='ck_document_char_count_non_negative'),
        Index('idx_documents_file', 'file_id'),
        Index('idx_documents_owner', 'owner_id'),
        Index('idx_documents_organization', 'organization_id'),
        Index('idx_documents_type', 'document_type'),
        Index('idx_documents_category', 'category'),
        Index('idx_documents_status', 'status'),
        Index('idx_documents_date', 'document_date'),
        Index('idx_documents_expiry', 'expiry_date'),
        Index('idx_documents_hash', 'content_hash'),
    )


class DocumentAttachment(BaseModel):
    """
    Attachments linked to documents.
    """
    __tablename__ = 'document_attachments'

    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    attachment_type = Column(String(50), default='attachment', nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="attachments")
    file = relationship("File")

    __table_args__ = (
        UniqueConstraint('document_id', 'file_id', name='uq_document_attachment'),
        Index('idx_document_attachments_document', 'document_id'),
        Index('idx_document_attachments_file', 'file_id'),
        Index('idx_document_attachments_type', 'attachment_type'),
    )


class DocumentAnnotation(BaseModel, TimestampMixin):
    """
    Annotations and comments on documents.
    """
    __tablename__ = 'document_annotations'

    document_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Annotation content
    annotation_type = Column(String(50), default='comment', nullable=False)  # comment, highlight, note
    content = Column(Text, nullable=False)
    
    # Position information
    page_number = Column(Integer, nullable=True)
    position_data = Column(JSONB, nullable=True, comment="Position coordinates, selection info")
    
    # Status
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="annotations")
    user = relationship("User", foreign_keys=[user_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

    __table_args__ = (
        CheckConstraint('page_number IS NULL OR page_number > 0', name='ck_annotation_page_positive'),
        Index('idx_document_annotations_document', 'document_id'),
        Index('idx_document_annotations_user', 'user_id'),
        Index('idx_document_annotations_type', 'annotation_type'),
        Index('idx_document_annotations_resolved', 'is_resolved'),
    )


class MediaCollection(NamedEntityModel):
    """
    Collections for organizing media files.
    """
    __tablename__ = 'media_collections'

    collection_type = Column(String(50), default='album', nullable=False)  # album, gallery, playlist
    owner_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True)
    
    # Collection properties
    is_public = Column(Boolean, default=False, nullable=False)
    sort_order = Column(String(50), default='created_at_desc', nullable=False)
    thumbnail_file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='SET NULL'), nullable=True)
    
    # Statistics
    item_count = Column(Integer, default=0, nullable=False)
    total_size_bytes = Column(BigInteger, default=0, nullable=False)

    # Relationships
    owner = relationship("User")
    organization = relationship("Organization")
    thumbnail_file = relationship("File")
    items = relationship("MediaCollectionItem", back_populates="collection", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('item_count >= 0', name='ck_collection_item_count_non_negative'),
        CheckConstraint('total_size_bytes >= 0', name='ck_collection_size_non_negative'),
        Index('idx_media_collections_owner', 'owner_id'),
        Index('idx_media_collections_organization', 'organization_id'),
        Index('idx_media_collections_type', 'collection_type'),
        Index('idx_media_collections_public', 'is_public'),
    )


class MediaCollectionItem(BaseModel, TimestampMixin):
    """
    Items in media collections.
    """
    __tablename__ = 'media_collection_items'

    collection_id = Column(UUID(as_uuid=True), ForeignKey('media_collections.id', ondelete='CASCADE'), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey('files.id', ondelete='CASCADE'), nullable=False)
    
    # Item properties
    order_index = Column(Integer, default=0, nullable=False)
    caption = Column(Text, nullable=True)
    is_featured = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    added_by_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    collection = relationship("MediaCollection", back_populates="items")
    file = relationship("File")
    added_by = relationship("User")

    __table_args__ = (
        UniqueConstraint('collection_id', 'file_id', name='uq_collection_item'),
        Index('idx_media_collection_items_collection', 'collection_id'),
        Index('idx_media_collection_items_file', 'file_id'),
        Index('idx_media_collection_items_order', 'collection_id', 'order_index'),
    )