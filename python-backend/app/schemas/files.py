"""
File and storage management schemas for API endpoints.

This module contains Pydantic models for file-related operations including:
- File upload and download
- File management operations
- Storage quota and usage tracking
- File sharing and permissions
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, HttpUrl


class FileType(str, Enum):
    """File type categories."""
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    SPREADSHEET = "spreadsheet"
    PRESENTATION = "presentation"
    TEXT = "text"
    PDF = "pdf"
    CODE = "code"
    OTHER = "other"


class FileStatus(str, Enum):
    """File status options."""
    UPLOADING = "uploading"
    ACTIVE = "active"
    PROCESSING = "processing"
    QUARANTINED = "quarantined"
    DELETED = "deleted"
    ARCHIVED = "archived"
    FAILED = "failed"


class FilePermissionLevel(str, Enum):
    """File permission levels."""
    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"
    READ_ONLY = "read_only"


class StorageBucket(str, Enum):
    """Storage bucket types."""
    USER_FILES = "user_files"
    SYSTEM_FILES = "system_files"
    TEMP_FILES = "temp_files"
    PUBLIC_FILES = "public_files"
    BACKUP_FILES = "backup_files"


# ================================
# BASE SCHEMAS
# ================================

class FileBase(BaseModel):
    """Base file schema with common fields."""
    filename: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_type: FileType = Field(..., description="File type category")
    mime_type: str = Field(..., description="MIME type")
    size: int = Field(..., ge=0, description="File size in bytes")
    checksum: Optional[str] = Field(None, description="File checksum (SHA-256)")
    description: Optional[str] = Field(None, max_length=1000, description="File description")
    tags: List[str] = Field(default=[], description="File tags")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="File metadata")


class FileUpload(BaseModel):
    """Schema for file upload request."""
    filename: str = Field(..., description="Original filename")
    content_type: Optional[str] = Field(None, description="Content type")
    size: Optional[int] = Field(None, ge=0, description="File size in bytes")
    bucket: StorageBucket = Field(default=StorageBucket.USER_FILES, description="Target storage bucket")
    folder_path: Optional[str] = Field(None, description="Folder path within bucket")
    description: Optional[str] = Field(None, description="File description")
    tags: List[str] = Field(default=[], description="File tags")
    permission_level: FilePermissionLevel = Field(default=FilePermissionLevel.PRIVATE, description="Permission level")
    auto_process: bool = Field(default=True, description="Whether to auto-process the file")
    
    @validator('folder_path')
    def validate_folder_path(cls, v):
        if v and (v.startswith('/') or v.endswith('/')):
            raise ValueError('Folder path should not start or end with /')
        return v


class FileUpdate(BaseModel):
    """Schema for updating file information."""
    filename: Optional[str] = Field(None, min_length=1, max_length=255, description="Filename")
    description: Optional[str] = Field(None, max_length=1000, description="File description")
    tags: Optional[List[str]] = Field(None, description="File tags")
    permission_level: Optional[FilePermissionLevel] = Field(None, description="Permission level")
    metadata: Optional[Dict[str, Any]] = Field(None, description="File metadata")


# ================================
# RESPONSE SCHEMAS
# ================================

class FileResponse(FileBase):
    """Schema for file responses."""
    id: int = Field(..., description="File unique identifier")
    path: str = Field(..., description="File path in storage")
    url: Optional[str] = Field(None, description="Public URL (if accessible)")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    bucket: StorageBucket = Field(..., description="Storage bucket")
    folder_path: Optional[str] = Field(None, description="Folder path within bucket")
    status: FileStatus = Field(..., description="File status")
    permission_level: FilePermissionLevel = Field(..., description="Permission level")
    owner_id: int = Field(..., description="File owner ID")
    uploaded_by: int = Field(..., description="User who uploaded the file")
    created_at: datetime = Field(..., description="Upload time")
    updated_at: Optional[datetime] = Field(None, description="Last update time")
    accessed_at: Optional[datetime] = Field(None, description="Last access time")
    download_count: int = Field(default=0, description="Number of downloads")
    
    class Config:
        from_attributes = True


class FileDetail(FileResponse):
    """Detailed file information."""
    processing_status: Optional[Dict[str, Any]] = Field(None, description="Processing status")
    versions: List[Dict[str, Any]] = Field(default=[], description="File versions")
    shares: List[Dict[str, Any]] = Field(default=[], description="File shares")
    virus_scan_result: Optional[Dict[str, Any]] = Field(None, description="Virus scan results")
    content_analysis: Optional[Dict[str, Any]] = Field(None, description="Content analysis results")


class FileUploadResponse(BaseModel):
    """Response for file upload."""
    file_id: int = Field(..., description="Uploaded file ID")
    upload_url: Optional[str] = Field(None, description="Upload URL (for direct upload)")
    status: FileStatus = Field(..., description="Upload status")
    message: str = Field(..., description="Upload message")
    expires_at: Optional[datetime] = Field(None, description="Upload URL expiration")


class FileDownloadResponse(BaseModel):
    """Response for file download."""
    download_url: str = Field(..., description="Download URL")
    filename: str = Field(..., description="Filename")
    size: int = Field(..., description="File size")
    content_type: str = Field(..., description="Content type")
    expires_at: Optional[datetime] = Field(None, description="URL expiration time")


# ================================
# FOLDER MANAGEMENT
# ================================

class FolderBase(BaseModel):
    """Base folder schema."""
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    description: Optional[str] = Field(None, max_length=1000, description="Folder description")
    color: Optional[str] = Field(None, description="Folder color")
    icon: Optional[str] = Field(None, description="Folder icon")


class FolderCreate(FolderBase):
    """Schema for creating a folder."""
    parent_id: Optional[int] = Field(None, description="Parent folder ID")
    bucket: StorageBucket = Field(default=StorageBucket.USER_FILES, description="Storage bucket")


class FolderUpdate(BaseModel):
    """Schema for updating folder information."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Folder name")
    description: Optional[str] = Field(None, max_length=1000, description="Folder description")
    color: Optional[str] = Field(None, description="Folder color")
    icon: Optional[str] = Field(None, description="Folder icon")
    parent_id: Optional[int] = Field(None, description="Parent folder ID")


class FolderResponse(FolderBase):
    """Schema for folder responses."""
    id: int = Field(..., description="Folder unique identifier")
    path: str = Field(..., description="Full folder path")
    parent_id: Optional[int] = Field(None, description="Parent folder ID")
    bucket: StorageBucket = Field(..., description="Storage bucket")
    owner_id: int = Field(..., description="Folder owner ID")
    created_at: datetime = Field(..., description="Creation time")
    updated_at: Optional[datetime] = Field(None, description="Last update time")
    file_count: int = Field(default=0, description="Number of files in folder")
    subfolder_count: int = Field(default=0, description="Number of subfolders")
    total_size: int = Field(default=0, description="Total size of folder contents")
    
    class Config:
        from_attributes = True


# ================================
# STORAGE QUOTA AND USAGE
# ================================

class StorageQuota(BaseModel):
    """Storage quota information."""
    user_id: int = Field(..., description="User ID")
    total_quota: int = Field(..., description="Total storage quota in bytes")
    used_space: int = Field(..., description="Used storage space in bytes")
    available_space: int = Field(..., description="Available storage space in bytes")
    quota_percentage: float = Field(..., description="Quota usage percentage")
    last_calculated: datetime = Field(..., description="Last calculation time")
    
    class Config:
        from_attributes = True


class StorageUsage(BaseModel):
    """Storage usage breakdown."""
    total_files: int = Field(..., description="Total number of files")
    total_size: int = Field(..., description="Total size in bytes")
    usage_by_type: Dict[str, Dict[str, Union[int, float]]] = Field(..., description="Usage by file type")
    usage_by_bucket: Dict[str, Dict[str, Union[int, float]]] = Field(..., description="Usage by bucket")
    largest_files: List[Dict[str, Any]] = Field(..., description="Largest files")
    recent_uploads: List[Dict[str, Any]] = Field(..., description="Recent uploads")
    growth_trend: List[Dict[str, Any]] = Field(default=[], description="Storage growth over time")


class StorageStatistics(BaseModel):
    """System-wide storage statistics."""
    total_files: int = Field(..., description="Total files in system")
    total_size: int = Field(..., description="Total storage used")
    average_file_size: float = Field(..., description="Average file size")
    files_by_type: Dict[str, int] = Field(..., description="File count by type")
    size_by_type: Dict[str, int] = Field(..., description="Storage used by type")
    top_users: List[Dict[str, Any]] = Field(..., description="Users with most storage usage")
    storage_efficiency: float = Field(..., description="Storage efficiency percentage")


# ================================
# FILE SHARING
# ================================

class FileShare(BaseModel):
    """File sharing configuration."""
    user_id: Optional[int] = Field(None, description="User to share with (if private share)")
    permission_level: str = Field(..., description="Permission level (read, write, admin)")
    expires_at: Optional[datetime] = Field(None, description="Share expiration time")
    password: Optional[str] = Field(None, description="Share password")
    download_limit: Optional[int] = Field(None, description="Maximum download count")
    message: Optional[str] = Field(None, description="Share message")


class FileShareResponse(BaseModel):
    """File share response."""
    share_id: str = Field(..., description="Share ID")
    file_id: int = Field(..., description="File ID")
    share_token: str = Field(..., description="Share access token")
    share_url: str = Field(..., description="Share URL")
    permission_level: str = Field(..., description="Permission level")
    created_by: int = Field(..., description="User who created the share")
    created_at: datetime = Field(..., description="Share creation time")
    expires_at: Optional[datetime] = Field(None, description="Share expiration time")
    download_count: int = Field(default=0, description="Number of downloads")
    is_active: bool = Field(default=True, description="Whether the share is active")
    
    class Config:
        from_attributes = True


class PublicLink(BaseModel):
    """Public file link."""
    id: str = Field(..., description="Link ID")
    file_id: int = Field(..., description="File ID")
    token: str = Field(..., description="Access token")
    url: str = Field(..., description="Public URL")
    expires_at: Optional[datetime] = Field(None, description="Link expiration time")
    download_limit: Optional[int] = Field(None, description="Download limit")
    password_protected: bool = Field(default=False, description="Whether password is required")
    created_by: int = Field(..., description="User who created the link")
    created_at: datetime = Field(..., description="Link creation time")
    access_count: int = Field(default=0, description="Number of accesses")
    is_active: bool = Field(default=True, description="Whether the link is active")
    
    class Config:
        from_attributes = True


# ================================
# SEARCH AND FILTERING
# ================================

class FileSearchFilters(BaseModel):
    """Filters for file search."""
    search: Optional[str] = Field(None, description="Search term for filename/description")
    file_type: Optional[FileType] = Field(None, description="Filter by file type")
    mime_type: Optional[str] = Field(None, description="Filter by MIME type")
    status: Optional[FileStatus] = Field(None, description="Filter by status")
    permission_level: Optional[FilePermissionLevel] = Field(None, description="Filter by permission level")
    bucket: Optional[StorageBucket] = Field(None, description="Filter by bucket")
    folder_id: Optional[int] = Field(None, description="Filter by folder")
    owner_id: Optional[int] = Field(None, description="Filter by owner")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    size_min: Optional[int] = Field(None, description="Minimum file size")
    size_max: Optional[int] = Field(None, description="Maximum file size")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")


class FileSortOption(str, Enum):
    """File sorting options."""
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"
    SIZE_ASC = "size_asc"
    SIZE_DESC = "size_desc"
    CREATED_ASC = "created_asc"
    CREATED_DESC = "created_desc"
    MODIFIED_ASC = "modified_asc"
    MODIFIED_DESC = "modified_desc"
    DOWNLOADS_ASC = "downloads_asc"
    DOWNLOADS_DESC = "downloads_desc"


class FileListParams(BaseModel):
    """Parameters for file listing."""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort: FileSortOption = Field(default=FileSortOption.CREATED_DESC, description="Sort option")
    filters: Optional[FileSearchFilters] = Field(None, description="Search filters")


class FileListResponse(BaseModel):
    """Response for file listing."""
    files: List[FileResponse] = Field(..., description="List of files")
    folders: List[FolderResponse] = Field(default=[], description="List of folders")
    total_files: int = Field(..., description="Total number of files")
    total_folders: int = Field(default=0, description="Total number of folders")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there are more pages")
    has_previous: bool = Field(..., description="Whether there are previous pages")


# ================================
# FILE OPERATIONS
# ================================

class FileMove(BaseModel):
    """File move operation."""
    destination_folder_id: Optional[int] = Field(None, description="Destination folder ID")
    destination_bucket: Optional[StorageBucket] = Field(None, description="Destination bucket")
    new_filename: Optional[str] = Field(None, description="New filename")


class FileCopy(BaseModel):
    """File copy operation."""
    destination_folder_id: Optional[int] = Field(None, description="Destination folder ID")
    destination_bucket: Optional[StorageBucket] = Field(None, description="Destination bucket")
    new_filename: Optional[str] = Field(None, description="New filename")
    copy_permissions: bool = Field(default=False, description="Whether to copy permissions")


class FileBulkAction(str, Enum):
    """Bulk actions for files."""
    DELETE = "delete"
    MOVE = "move"
    COPY = "copy"
    ARCHIVE = "archive"
    CHANGE_PERMISSIONS = "change_permissions"
    ADD_TAGS = "add_tags"
    REMOVE_TAGS = "remove_tags"


class FileBulkOperation(BaseModel):
    """Bulk operation on files."""
    file_ids: List[int] = Field(..., min_items=1, description="List of file IDs")
    action: FileBulkAction = Field(..., description="Action to perform")
    parameters: Optional[Dict[str, Any]] = Field(None, description="Action parameters")


class FileBulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    errors: List[Dict[str, Any]] = Field(default=[], description="List of errors")
    processed_ids: List[int] = Field(..., description="List of processed file IDs")


# ================================
# FILE PROCESSING
# ================================

class FileProcessingJob(BaseModel):
    """File processing job."""
    id: str = Field(..., description="Job ID")
    file_id: int = Field(..., description="File ID")
    job_type: str = Field(..., description="Processing job type")
    status: str = Field(..., description="Job status")
    progress: float = Field(default=0.0, ge=0.0, le=1.0, description="Job progress")
    result: Optional[Dict[str, Any]] = Field(None, description="Processing result")
    error: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Job creation time")
    started_at: Optional[datetime] = Field(None, description="Job start time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")
    
    class Config:
        from_attributes = True


class ThumbnailGeneration(BaseModel):
    """Thumbnail generation request."""
    file_id: int = Field(..., description="File ID")
    size: str = Field(default="medium", description="Thumbnail size (small, medium, large)")
    format: str = Field(default="jpeg", description="Output format")
    quality: int = Field(default=85, ge=1, le=100, description="Image quality")


class FileAnalysis(BaseModel):
    """File analysis request."""
    file_id: int = Field(..., description="File ID")
    analysis_type: str = Field(..., description="Type of analysis to perform")
    options: Optional[Dict[str, Any]] = Field(None, description="Analysis options")


class FileAnalysisResult(BaseModel):
    """File analysis result."""
    file_id: int = Field(..., description="File ID")
    analysis_type: str = Field(..., description="Analysis type")
    result: Dict[str, Any] = Field(..., description="Analysis result")
    confidence: Optional[float] = Field(None, description="Result confidence score")
    performed_at: datetime = Field(..., description="Analysis time")
    
    class Config:
        from_attributes = True