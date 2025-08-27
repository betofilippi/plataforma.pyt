/**
 * TableEditor Type Definitions - Phase 1 Safe Extraction
 * 
 * EXTRACTED FROM: TableEditorCanvas.tsx lines 228-298
 * RISK LEVEL: 0% - Pure type definitions, no runtime logic
 * DEPENDENCIES: Only external @/lib imports, no local component dependencies
 * 
 * These are interface definitions and type aliases that were extracted
 * to reduce the main component file size. They are pure TypeScript types
 * with zero runtime impact.
 */

import { OpenTable as OpenTableType, StoredFile } from '@/types/tables';

// Database table column structure
export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  is_primary?: boolean;
  is_foreign?: boolean;
  // Media type support for rich content
  media_type?: 'image' | 'pdf' | 'video' | 'mixed' | null;
  allow_multiple?: boolean;
}

// Database schema information
export interface SchemaInfo {
  schema_name: string;
  table_count: number;
}

// Database table information with metadata
export interface TableInfo {
  schema_name: string;
  table_name: string;
  column_count: number;
  row_count: number;
}

// File attachment with upload state
export type FileAttachment = StoredFile & {
  uploading?: boolean;
  type?: string;
};

// Cell content can contain text and/or files
export interface CellContent {
  text?: string;
  files?: FileAttachment[];
}

// Extended OpenTable interface with additional local properties for the TableEditor
export interface OpenTable extends Omit<OpenTableType, 'formats' | 'selection' | 'hasUnsavedChanges'> {
  formats?: Map<string, CellFormat>;
  selection?: Selection;
  hasUnsavedChanges?: boolean;
  originalData?: any[]; // Store original data for comparison
  cellContents?: Map<string, CellContent>; // Store rich content for cells
  columnWidths?: Map<string, number>; // Store custom column widths
  rowHeight?: number; // Store custom row height for all rows
  columnOrder?: string[]; // Column order from database
  columnMap?: Map<string, number>; // Column name to index mapping
  constraints?: any; // Table constraints (NOT NULL, CHECK, etc)
  metadata?: any; // Type hints metadata for formatting
}

// TableEditor component props
export interface TableEditorCanvasProps {
  hideSchemaSelector?: boolean;
  fixedSchema?: string;
}

// Note: CellFormat and Selection types are imported from external libraries
// and not defined here to avoid circular dependencies