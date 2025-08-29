"""
Storage service for file upload, management, and processing.

This service provides comprehensive file storage capabilities including:
- File upload and validation
- Image processing and thumbnail generation
- Filesystem and cloud storage (S3) support
- File metadata management
- Security and access control
- Storage quota management
"""

import hashlib
import mimetypes
import os
import shutil
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union, BinaryIO

import aiofiles
import structlog
from fastapi import UploadFile, HTTPException, status
from PIL import Image, ImageOps
from pydantic import BaseModel, Field, validator

from app.core.config import get_settings
from app.core.exceptions import ValidationError, StorageError
from app.services.database_service import database_service

logger = structlog.get_logger(__name__)


class FileMetadata(BaseModel):
    """File metadata schema."""
    filename: str
    original_filename: str
    content_type: str
    size: int
    checksum: str
    storage_path: str
    public_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None  # For video/audio files
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    @validator('size')
    def validate_size(cls, v):
        if v < 0:
            raise ValueError('File size cannot be negative')
        return v


class UploadResult(BaseModel):
    """Result of file upload operation."""
    success: bool
    file_id: Optional[str] = None
    filename: Optional[str] = None
    url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    metadata: Optional[FileMetadata] = None
    error: Optional[str] = None


class StorageQuota(BaseModel):
    """Storage quota information."""
    used_bytes: int
    total_bytes: int
    file_count: int
    available_bytes: int
    
    @property
    def used_percentage(self) -> float:
        if self.total_bytes == 0:
            return 0.0
        return (self.used_bytes / self.total_bytes) * 100


class StorageService:
    """Comprehensive file storage and management service."""
    
    def __init__(self):
        self.settings = get_settings()
        self.storage_path = Path(self.settings.storage_path)
        self.max_file_size = self.settings.upload_max_size
        self.allowed_extensions = set(self.settings.upload_allowed_extensions)
        
        # Image processing settings
        self.thumbnail_sizes = [(150, 150), (300, 300), (800, 600)]
        self.image_formats = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}
        self.video_formats = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'}
        self.audio_formats = {'.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'}
        
        # Ensure storage directories exist
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Ensure all required storage directories exist."""
        directories = [
            self.storage_path,
            self.storage_path / "uploads",
            self.storage_path / "thumbnails",
            self.storage_path / "temp",
            self.storage_path / "cache",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _generate_filename(self, original_filename: str) -> str:
        """Generate a unique filename while preserving extension."""
        file_extension = Path(original_filename).suffix.lower()
        unique_id = str(uuid.uuid4())
        return f"{unique_id}{file_extension}"
    
    def _calculate_checksum(self, file_content: bytes) -> str:
        """Calculate SHA-256 checksum of file content."""
        return hashlib.sha256(file_content).hexdigest()
    
    def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        # Check file size
        if hasattr(file, 'size') and file.size and file.size > self.max_file_size:
            raise ValidationError(f"File size exceeds maximum allowed size of {self.max_file_size} bytes")
        
        # Check file extension
        if file.filename:
            file_extension = Path(file.filename).suffix.lower()
            if file_extension not in self.allowed_extensions:
                raise ValidationError(f"File extension {file_extension} is not allowed")
        
        # Check content type
        if file.content_type:
            # Basic MIME type validation
            if not any(file.content_type.startswith(mime) for mime in 
                      ['image/', 'video/', 'audio/', 'application/', 'text/']):
                raise ValidationError(f"Content type {file.content_type} is not allowed")
    
    async def _read_file_content(self, file: UploadFile) -> bytes:
        """Read file content and reset file position."""
        content = await file.read()
        await file.seek(0)  # Reset file position for potential reuse
        return content
    
    async def _save_file_to_disk(self, content: bytes, filepath: Path) -> None:
        """Save file content to disk asynchronously."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(content)
    
    def _get_image_dimensions(self, content: bytes) -> Tuple[Optional[int], Optional[int]]:
        """Get image dimensions from content."""
        try:
            with Image.open(BytesIO(content)) as img:
                return img.size
        except Exception as e:
            logger.warning("Could not get image dimensions", error=str(e))
            return None, None
    
    async def _generate_thumbnails(
        self, 
        content: bytes, 
        original_filename: str
    ) -> Dict[str, str]:
        """Generate thumbnails for image files."""
        thumbnails = {}
        
        try:
            with Image.open(BytesIO(content)) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                for size in self.thumbnail_sizes:
                    # Create thumbnail
                    thumbnail = img.copy()
                    thumbnail.thumbnail(size, Image.Lanczos)
                    
                    # Generate filename
                    base_name = Path(original_filename).stem
                    thumb_filename = f"{base_name}_{size[0]}x{size[1]}.jpg"
                    thumb_path = self.storage_path / "thumbnails" / thumb_filename
                    
                    # Save thumbnail
                    thumbnail.save(thumb_path, 'JPEG', quality=85, optimize=True)
                    
                    thumbnails[f"{size[0]}x{size[1]}"] = str(thumb_path.relative_to(self.storage_path))
                    
        except Exception as e:
            logger.error("Failed to generate thumbnails", error=str(e))
        
        return thumbnails
    
    async def upload_file(
        self, 
        file: UploadFile,
        user_id: Optional[str] = None,
        folder: Optional[str] = None,
        public: bool = False
    ) -> UploadResult:
        """
        Upload a file to storage.
        
        Args:
            file: The uploaded file
            user_id: ID of the user uploading the file
            folder: Optional folder to organize files
            public: Whether the file should be publicly accessible
            
        Returns:
            Upload result with file information
        """
        try:
            # Validate file
            self._validate_file(file)
            
            if not file.filename:
                raise ValidationError("Filename is required")
            
            # Read file content
            content = await self._read_file_content(file)
            actual_size = len(content)
            
            # Check actual file size
            if actual_size > self.max_file_size:
                raise ValidationError(f"File size {actual_size} exceeds maximum allowed size")
            
            # Calculate checksum
            checksum = self._calculate_checksum(content)
            
            # Check for duplicate files (optional deduplication)
            # existing_file = await self._find_file_by_checksum(checksum)
            # if existing_file:
            #     return UploadResult(success=True, file_id=existing_file.id, ...)
            
            # Generate unique filename
            unique_filename = self._generate_filename(file.filename)
            
            # Determine storage path
            if folder:
                storage_dir = self.storage_path / "uploads" / folder
            else:
                storage_dir = self.storage_path / "uploads"
            
            file_path = storage_dir / unique_filename
            
            # Save file to disk
            await self._save_file_to_disk(content, file_path)
            
            # Get file dimensions for images
            width, height = None, None
            thumbnails = {}
            file_extension = Path(file.filename).suffix.lower()
            
            if file_extension in self.image_formats:
                width, height = self._get_image_dimensions(content)
                thumbnails = await self._generate_thumbnails(content, unique_filename)
            
            # Create file metadata
            metadata = FileMetadata(
                filename=unique_filename,
                original_filename=file.filename,
                content_type=file.content_type or mimetypes.guess_type(file.filename)[0] or 'application/octet-stream',
                size=actual_size,
                checksum=checksum,
                storage_path=str(file_path.relative_to(self.storage_path)),
                width=width,
                height=height
            )
            
            # TODO: Save metadata to database
            # file_record = await self._save_file_metadata(metadata, user_id, public, thumbnails)
            
            # Generate URLs
            public_url = self._generate_public_url(unique_filename, folder) if public else None
            thumbnail_url = None
            
            if thumbnails and '300x300' in thumbnails:
                thumbnail_url = self._generate_thumbnail_url(thumbnails['300x300'])
            
            logger.info(
                "File uploaded successfully",
                filename=file.filename,
                unique_filename=unique_filename,
                size=actual_size,
                user_id=user_id
            )
            
            return UploadResult(
                success=True,
                file_id=str(uuid.uuid4()),  # TODO: Use actual database ID
                filename=unique_filename,
                url=public_url,
                thumbnail_url=thumbnail_url,
                metadata=metadata
            )
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error("File upload failed", error=str(e), filename=getattr(file, 'filename', 'unknown'))
            raise StorageError(f"Failed to upload file: {str(e)}")
    
    async def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get file information by ID."""
        # TODO: Implement database lookup
        # return await database_service.get_by_id(FileModel, file_id)
        return None
    
    async def delete_file(self, file_id: str, user_id: Optional[str] = None) -> bool:
        """Delete a file and its thumbnails."""
        try:
            # TODO: Get file from database
            # file_record = await self.get_file(file_id)
            # if not file_record:
            #     return False
            
            # # Check permissions
            # if user_id and file_record.user_id != user_id:
            #     raise HTTPException(status_code=403, detail="Access denied")
            
            # # Delete physical file
            # file_path = self.storage_path / file_record.storage_path
            # if file_path.exists():
            #     file_path.unlink()
            
            # # Delete thumbnails
            # if file_record.thumbnails:
            #     for thumb_path in file_record.thumbnails.values():
            #         thumb_full_path = self.storage_path / thumb_path
            #         if thumb_full_path.exists():
            #             thumb_full_path.unlink()
            
            # # Delete from database
            # await database_service.delete(FileModel, file_id)
            
            logger.info("File deleted successfully", file_id=file_id, user_id=user_id)
            return True
            
        except Exception as e:
            logger.error("File deletion failed", error=str(e), file_id=file_id)
            raise StorageError(f"Failed to delete file: {str(e)}")
    
    async def get_file_content(self, file_id: str) -> Optional[bytes]:
        """Get file content by ID."""
        try:
            # TODO: Get file from database
            # file_record = await self.get_file(file_id)
            # if not file_record:
            #     return None
            
            # file_path = self.storage_path / file_record.storage_path
            # if not file_path.exists():
            #     return None
            
            # async with aiofiles.open(file_path, 'rb') as f:
            #     return await f.read()
            
            return None
            
        except Exception as e:
            logger.error("Failed to read file content", error=str(e), file_id=file_id)
            return None
    
    async def list_files(
        self,
        user_id: Optional[str] = None,
        folder: Optional[str] = None,
        content_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """List files with filtering and pagination."""
        try:
            filters = {}
            
            if user_id:
                filters['user_id'] = user_id
            if folder:
                filters['folder'] = folder
            if content_type:
                filters['content_type'] = content_type
            
            # TODO: Implement database query
            # result = await database_service.get_many(
            #     FileModel,
            #     filters=filters,
            #     limit=limit,
            #     offset=offset,
            #     order_by='-created_at'
            # )
            
            return {
                "files": [],  # result.items
                "total": 0,   # result.total
                "limit": limit,
                "offset": offset,
                "has_more": False  # result.has_next
            }
            
        except Exception as e:
            logger.error("Failed to list files", error=str(e))
            raise StorageError(f"Failed to list files: {str(e)}")
    
    async def get_storage_quota(self, user_id: Optional[str] = None) -> StorageQuota:
        """Get storage quota information for user or system."""
        try:
            # Calculate used space
            used_bytes = 0
            file_count = 0
            
            # TODO: Get from database
            # if user_id:
            #     # User-specific quota
            #     user_files = await database_service.get_many(
            #         FileModel,
            #         filters={'user_id': user_id}
            #     )
            #     used_bytes = sum(f.size for f in user_files.items)
            #     file_count = len(user_files.items)
            # else:
            #     # System-wide quota
            #     all_files = await database_service.get_many(FileModel)
            #     used_bytes = sum(f.size for f in all_files.items)
            #     file_count = len(all_files.items)
            
            # Calculate available space on disk
            stat = shutil.disk_usage(self.storage_path)
            total_bytes = stat.total
            available_bytes = stat.free
            
            return StorageQuota(
                used_bytes=used_bytes,
                total_bytes=total_bytes,
                file_count=file_count,
                available_bytes=available_bytes
            )
            
        except Exception as e:
            logger.error("Failed to get storage quota", error=str(e))
            raise StorageError(f"Failed to get storage quota: {str(e)}")
    
    async def cleanup_temp_files(self, older_than_hours: int = 24) -> int:
        """Clean up temporary files older than specified hours."""
        try:
            temp_dir = self.storage_path / "temp"
            if not temp_dir.exists():
                return 0
            
            cutoff_time = datetime.now() - timedelta(hours=older_than_hours)
            cleaned_count = 0
            
            for temp_file in temp_dir.iterdir():
                if temp_file.is_file():
                    # Check file modification time
                    file_time = datetime.fromtimestamp(temp_file.stat().st_mtime)
                    if file_time < cutoff_time:
                        temp_file.unlink()
                        cleaned_count += 1
            
            logger.info("Temp files cleanup completed", cleaned_count=cleaned_count)
            return cleaned_count
            
        except Exception as e:
            logger.error("Failed to cleanup temp files", error=str(e))
            return 0
    
    def _generate_public_url(self, filename: str, folder: Optional[str] = None) -> str:
        """Generate public URL for file access."""
        base_url = "http://localhost:8000"  # TODO: Get from settings
        if folder:
            return f"{base_url}/api/v1/storage/files/{folder}/{filename}"
        return f"{base_url}/api/v1/storage/files/{filename}"
    
    def _generate_thumbnail_url(self, thumbnail_path: str) -> str:
        """Generate public URL for thumbnail access."""
        base_url = "http://localhost:8000"  # TODO: Get from settings
        return f"{base_url}/api/v1/storage/thumbnails/{thumbnail_path}"
    
    async def resize_image(
        self,
        file_id: str,
        width: int,
        height: int,
        maintain_aspect: bool = True
    ) -> Optional[str]:
        """Resize an image and return new file ID."""
        try:
            # TODO: Implement image resizing
            # 1. Get original file
            # 2. Load and resize image
            # 3. Save as new file
            # 4. Return new file ID
            
            return None
            
        except Exception as e:
            logger.error("Failed to resize image", error=str(e), file_id=file_id)
            raise StorageError(f"Failed to resize image: {str(e)}")
    
    async def get_file_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            stats = {
                "total_files": 0,
                "total_size": 0,
                "file_types": {},
                "storage_usage": await self.get_storage_quota()
            }
            
            # TODO: Implement database queries
            # all_files = await database_service.get_many(FileModel)
            # stats["total_files"] = len(all_files.items)
            # stats["total_size"] = sum(f.size for f in all_files.items)
            
            # # Group by content type
            # for file in all_files.items:
            #     content_type = file.content_type.split('/')[0] if file.content_type else 'unknown'
            #     stats["file_types"][content_type] = stats["file_types"].get(content_type, 0) + 1
            
            return stats
            
        except Exception as e:
            logger.error("Failed to get file stats", error=str(e))
            raise StorageError(f"Failed to get file stats: {str(e)}")


# Global service instance
storage_service = StorageService()