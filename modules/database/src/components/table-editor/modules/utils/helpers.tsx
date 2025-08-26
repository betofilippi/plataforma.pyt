/**
 * TableEditor Helper Functions - Phase 1 Safe Extraction
 * 
 * EXTRACTED FROM: TableEditorCanvas.tsx lines 111-382
 * RISK LEVEL: 2% - Pure utility functions, no state dependencies
 * DEPENDENCIES: lucide-react icons, constants, types (all safe)
 * 
 * These are pure utility functions that perform data transformations,
 * file type detection, and color operations. They have no dependencies
 * on component state or effects.
 */

import React from 'react';
import {
  ImageIcon,
  FileVideo,
  Music,
  FileText,
  FileSpreadsheet,
  FileEdit,
  Paperclip,
} from 'lucide-react';

import { KNOWN_ENUM_VALUES, ICON_SIZE_CLASS, FILE_EXTENSIONS } from '../constants/constants';
import { SCHEMA_ICON_MAP, DEFAULT_SCHEMA_ICON, DATA_TYPE_ICON_MAP, DEFAULT_DATA_TYPE_ICON } from '../constants/mappings';
import type { FileAttachment } from '../constants/types';

/**
 * Convert hex color to RGBA with alpha transparency
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Normalize empty values for consistent display and editing
 */
export const normalizeEmptyValue = (value: any, isEditing: boolean = false): any => {
  // Handle explicit null/undefined
  if (value === null || value === undefined) {
    return isEditing ? '' : '';
  }
  
  // Handle empty strings and whitespace-only strings
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return isEditing ? '' : '';
    }
  }
  
  // Handle arrays (for file attachments)
  if (Array.isArray(value) && value.length === 0) {
    return isEditing ? [] : [];
  }
  
  // Return value as-is if it's not empty
  return value;
};

/**
 * Get valid default value for a column based on its name and data type
 */
export const getValidDefaultValue = (columnName: string, dataType: string): any => {
  const columnLower = columnName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if column name matches known enum pattern
  if (KNOWN_ENUM_VALUES[columnLower]) {
    return KNOWN_ENUM_VALUES[columnLower][0]; // Return first valid value
  }
  
  // Default values by common column names
  if (columnLower === 'name' || columnLower === 'nome') return 'Item';
  if (columnLower === 'description' || columnLower === 'descricao') return 'Descrição';
  if (columnLower === 'email') return 'usuario@exemplo.com';
  if (columnLower === 'phone' || columnLower === 'telefone') return '(11) 99999-9999';
  if (columnLower === 'cpf') return '000.000.000-00';
  if (columnLower === 'cnpj') return '00.000.000/0000-00';
  if (columnLower === 'cep') return '00000-000';
  if (columnLower === 'price' || columnLower === 'preco' || columnLower === 'valor') return '0.00';
  if (columnLower === 'quantity' || columnLower === 'quantidade') return '1';
  if (columnLower === 'active' || columnLower === 'ativo') return 'true';
  if (columnLower === 'date' || columnLower === 'data') return new Date().toISOString().split('T')[0];
  
  // Default values by data type
  const lowerDataType = dataType.toLowerCase();
  if (lowerDataType.includes('int') || lowerDataType.includes('serial') || lowerDataType.includes('numeric')) return 0;
  if (lowerDataType.includes('boolean') || lowerDataType.includes('bool')) return 'false';
  if (lowerDataType.includes('date') || lowerDataType.includes('timestamp')) return new Date().toISOString().split('T')[0];
  if (lowerDataType.includes('time')) return '00:00:00';
  if (lowerDataType.includes('uuid')) return '';
  
  return ''; // Default to empty string
};

/**
 * Get appropriate icon component for a database schema
 */
export const getSchemaIcon = (schemaName: string) => {
  const normalized = schemaName.toLowerCase().replace(/_app$/, '');
  return SCHEMA_ICON_MAP[normalized] || DEFAULT_SCHEMA_ICON;
};

/**
 * Get appropriate icon component for a data type
 */
export const getTypeIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  
  // Check for exact matches first
  if (DATA_TYPE_ICON_MAP[lowerType]) {
    return DATA_TYPE_ICON_MAP[lowerType];
  }
  
  // Check for partial matches
  for (const [key, icon] of Object.entries(DATA_TYPE_ICON_MAP)) {
    if (lowerType.includes(key)) {
      return icon;
    }
  }
  
  return DEFAULT_DATA_TYPE_ICON;
};

/**
 * Ensure a file has a valid unique ID for tracking
 */
export const ensureValidFileId = (file: any, index: number): string => {
  if (
    file?.id &&
    typeof file.id === 'string' &&
    file.id.length > 0 &&
    file.id.length < 100 &&
    !file.id.startsWith('http') &&
    !file.id.includes('undefined') &&
    file.id !== 'null' &&
    file.id !== 'undefined'
  ) {
    return file.id;
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `file_${timestamp}_${index}_${random}`;
};

/**
 * Get appropriate file icon with size and color for file attachments
 */
export const getFileIcon = (file: FileAttachment, size: number = 24) => {
  const fileName = file?.name || file?.id || '';
  const cleanFileName = fileName.replace(/^\d+_/, '');
  const extension = cleanFileName.split('.').pop()?.toLowerCase() || '';
  const mimeType = file?.mimeType || file?.type || '';
  
  // File type detection
  const allNames = [file?.name, file?.id, file?.url, file?.publicUrl].filter(Boolean).join(' ').toLowerCase();
  
  const isPDF = extension === 'pdf' || allNames.includes('.pdf') || mimeType.includes('pdf');
  const isExcel = FILE_EXTENSIONS.EXCEL.includes(extension) || 
                  allNames.includes('.xls') || allNames.includes('.xlsx') || mimeType.includes('spreadsheet');
  const isWord = FILE_EXTENSIONS.WORD.includes(extension) || 
                 allNames.includes('.doc') || allNames.includes('.docx') || mimeType.includes('document');
  const isVideo = FILE_EXTENSIONS.VIDEOS.includes(extension) || 
                  allNames.includes('.mp4') || allNames.includes('.avi') || mimeType.includes('video');
  const isImage = FILE_EXTENSIONS.IMAGES.includes(extension) || 
                  allNames.includes('.jpg') || allNames.includes('.png') || mimeType.includes('image');
  
  // Return appropriate icon with styling
  if (isPDF) {
    return <FileText className="text-red-400" style={{ width: `${size}px`, height: `${size}px` }} />;
  }
  if (isExcel) {
    return <FileSpreadsheet className="text-green-400" style={{ width: `${size}px`, height: `${size}px` }} />;
  }
  if (isWord) {
    return <FileEdit className="text-blue-500" style={{ width: `${size}px`, height: `${size}px` }} />;
  }
  if (isVideo) {
    return <FileVideo className="text-purple-400" style={{ width: `${size}px`, height: `${size}px` }} />;
  }
  if (isImage) {
    return <ImageIcon className="text-blue-400" style={{ width: `${size}px`, height: `${size}px` }} />;
  }
  
  // Generic file icon
  return <Paperclip className="text-gray-400" style={{ width: `${size}px`, height: `${size}px` }} />;
};

/**
 * Get styled file icon for display in table cells (small size)
 */
export const getFileIconStyled = (file: FileAttachment) => {
  const mimeType = file.mimeType || file.type || '';
  // Remove timestamp from name before getting extension
  const cleanName = (file.name || '').replace(/^\d+_/, '');
  const extension = cleanName.split('.').pop()?.toLowerCase() || '';
  
  // Images
  if (mimeType.startsWith('image/') || FILE_EXTENSIONS.IMAGES.includes(extension)) {
    return <ImageIcon className={`${ICON_SIZE_CLASS} text-blue-400`} />;
  }
  
  // Videos
  if (mimeType.startsWith('video/') || FILE_EXTENSIONS.VIDEOS.includes(extension)) {
    return <FileVideo className={`${ICON_SIZE_CLASS} text-purple-400`} />;
  }
  
  // Audio
  if (mimeType.startsWith('audio/') || FILE_EXTENSIONS.AUDIO.includes(extension)) {
    return <Music className={`${ICON_SIZE_CLASS} text-pink-500`} />;
  }
  
  // PDF
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return <FileText className={`${ICON_SIZE_CLASS} text-red-400`} />;
  }
  
  // Excel/Spreadsheets
  if (mimeType.includes('spreadsheet') || FILE_EXTENSIONS.EXCEL.includes(extension)) {
    return <FileSpreadsheet className={`${ICON_SIZE_CLASS} text-green-400`} />;
  }
  
  // Word/Documents
  if (mimeType.includes('document') || FILE_EXTENSIONS.WORD.includes(extension)) {
    return <FileEdit className={`${ICON_SIZE_CLASS} text-blue-500`} />;
  }
  
  // Generic file
  return <Paperclip className={`${ICON_SIZE_CLASS} text-gray-400`} />;
};