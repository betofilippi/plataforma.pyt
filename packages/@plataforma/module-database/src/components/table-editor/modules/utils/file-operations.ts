/**
 * File operations utilities for TableEditorCanvas
 * Safe extraction - pure utility functions for file handling
 */

import { FileAttachment } from '../constants/types';
import { FILE_EXTENSIONS } from '../constants/constants';

/**
 * Maximum file size allowed (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Accepted file types for upload
 */
export const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.avi,.mov,.doc,.docx,.xls,.xlsx,.csv';

/**
 * Check if file size is valid
 */
export const isValidFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE;
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File | FileAttachment): boolean => {
  const fileName = 'name' in file ? file.name : file.id || '';
  const mimeType = 'type' in file ? file.type : file.mimeType || '';
  
  const extension = getFileExtension(fileName);
  return FILE_EXTENSIONS.IMAGES.includes(extension) || mimeType.startsWith('image/');
};

/**
 * Check if file is a PDF
 */
export const isPDFFile = (file: File | FileAttachment): boolean => {
  const fileName = 'name' in file ? file.name : file.id || '';
  const mimeType = 'type' in file ? file.type : file.mimeType || '';
  
  const extension = getFileExtension(fileName);
  return extension === 'pdf' || mimeType === 'application/pdf';
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file: File | FileAttachment): boolean => {
  const fileName = 'name' in file ? file.name : file.id || '';
  const mimeType = 'type' in file ? file.type : file.mimeType || '';
  
  const extension = getFileExtension(fileName);
  return FILE_EXTENSIONS.VIDEOS.includes(extension) || mimeType.startsWith('video/');
};

/**
 * Check if file is an Excel/spreadsheet
 */
export const isSpreadsheetFile = (file: File | FileAttachment): boolean => {
  const fileName = 'name' in file ? file.name : file.id || '';
  const mimeType = 'type' in file ? file.type : file.mimeType || '';
  
  const extension = getFileExtension(fileName);
  return FILE_EXTENSIONS.EXCEL.includes(extension) || 
         mimeType.includes('spreadsheet') ||
         mimeType.includes('excel');
};

/**
 * Check if file is a Word document
 */
export const isDocumentFile = (file: File | FileAttachment): boolean => {
  const fileName = 'name' in file ? file.name : file.id || '';
  const mimeType = 'type' in file ? file.type : file.mimeType || '';
  
  const extension = getFileExtension(fileName);
  return FILE_EXTENSIONS.WORD.includes(extension) || 
         mimeType.includes('document') ||
         mimeType.includes('msword');
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (fileName: string): string => {
  if (!fileName) return '';
  const cleaned = cleanFileName(fileName);
  return cleaned.split('.').pop()?.toLowerCase() || '';
};

/**
 * Clean file name by removing timestamp prefix
 */
export const cleanFileName = (fileName: string): string => {
  if (!fileName) return '';
  // Remove timestamp prefix (e.g., "1234567890_filename.pdf" -> "filename.pdf")
  return fileName.replace(/^\d+_/, '');
};

/**
 * Generate unique file ID
 */
export const generateFileId = (index: number = 0): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `file_${timestamp}_${index}_${random}`;
};

/**
 * Validate file for upload
 */
export const validateFile = (file: File): {
  valid: boolean;
  error?: string;
} => {
  // Check file size
  if (!isValidFileSize(file)) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo permitido: ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }

  // Check file type
  const extension = getFileExtension(file.name);
  const acceptedExtensions = ACCEPTED_FILE_TYPES.split(',').map(ext => ext.replace('.', ''));
  
  if (!acceptedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Tipo de arquivo não suportado. Tipos aceitos: ${ACCEPTED_FILE_TYPES}`
    };
  }

  return { valid: true };
};

/**
 * Get file type category
 */
export const getFileCategory = (file: File | FileAttachment): string => {
  if (isImageFile(file)) return 'image';
  if (isPDFFile(file)) return 'pdf';
  if (isVideoFile(file)) return 'video';
  if (isSpreadsheetFile(file)) return 'spreadsheet';
  if (isDocumentFile(file)) return 'document';
  return 'other';
};

/**
 * Create file preview URL
 */
export const createFilePreviewURL = (file: File): string => {
  return URL.createObjectURL(file);
};

/**
 * Revoke file preview URL to free memory
 */
export const revokeFilePreviewURL = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Sort files by type and name
 */
export const sortFiles = (files: FileAttachment[]): FileAttachment[] => {
  return files.sort((a, b) => {
    // First sort by category
    const categoryA = getFileCategory(a);
    const categoryB = getFileCategory(b);
    
    if (categoryA !== categoryB) {
      const categoryOrder = ['image', 'pdf', 'video', 'spreadsheet', 'document', 'other'];
      return categoryOrder.indexOf(categoryA) - categoryOrder.indexOf(categoryB);
    }
    
    // Then sort by name
    const nameA = cleanFileName(a.name || a.id || '');
    const nameB = cleanFileName(b.name || b.id || '');
    return nameA.localeCompare(nameB);
  });
};

/**
 * Parse CSV file content
 */
export const parseCSV = (content: string, delimiter: string = ','): string[][] => {
  const lines = content.split('\n');
  return lines.map(line => {
    // Simple CSV parsing (doesn't handle quotes properly)
    return line.split(delimiter).map(cell => cell.trim());
  });
};

/**
 * Generate CSV content from data
 */
export const generateCSV = (data: any[][], delimiter: string = ','): string => {
  return data.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains delimiter
      const cellStr = String(cell || '');
      if (cellStr.includes(delimiter) || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(delimiter)
  ).join('\n');
};

/**
 * Download file utility
 */
export const downloadFile = (content: string, fileName: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};