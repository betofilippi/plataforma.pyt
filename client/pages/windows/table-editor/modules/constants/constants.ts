/**
 * TableEditor Constants - Phase 1 Safe Extraction
 * 
 * EXTRACTED FROM: TableEditorCanvas.tsx lines 143-152, 403
 * RISK LEVEL: 0% - Pure constant values, no logic
 * DEPENDENCIES: None - standalone constants
 * 
 * These are static constant values that were extracted to reduce
 * the main component file size. They are pure data with zero runtime logic.
 */

// Known enum values for different database column types
// Used for providing default values and validation
export const KNOWN_ENUM_VALUES: Record<string, string[]> = {
  'database_type': ['postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'elasticsearch'],
  'status': ['active', 'inactive', 'pending', 'error', 'success'],
  'environment': ['development', 'staging', 'production', 'test'],
  'action': ['create', 'update', 'delete', 'read', 'execute'],
  'priority': ['low', 'medium', 'high', 'critical'],
  'type': ['text', 'number', 'boolean', 'date', 'json'],
};

// Cache duration for database operations (1 minute)
export const CACHE_DURATION = 60000;

// Icon size class for file type icons
export const ICON_SIZE_CLASS = 'h-3 w-3';

// File extension arrays for type detection
export const FILE_EXTENSIONS = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
  VIDEOS: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'],
  AUDIO: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
  PDF: ['pdf'],
  EXCEL: ['xls', 'xlsx', 'csv', 'ods'],
  WORD: ['doc', 'docx', 'odt', 'rtf'],
} as const;