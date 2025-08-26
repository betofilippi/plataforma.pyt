// Types for the advanced table editor

export interface CellFormat {
  backgroundColor?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  textAlign?: 'left' | 'center' | 'right';
  border?: {
    top?: BorderStyle;
    right?: BorderStyle;
    bottom?: BorderStyle;
    left?: BorderStyle;
  };
}

export interface BorderStyle {
  width: number;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
}

export interface Selection {
  type: 'cells' | 'rows' | 'columns' | 'all';
  tableId: string;
  cells?: Set<string>; // "row-col"
  rows?: Set<number>;
  columns?: Set<string>;
  startCell?: { row: number; col: string };
  endCell?: { row: number; col: string };
}

export interface TableRelationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: '1:1' | '1:N' | 'N:N';
  color: string;
  isActive: boolean;
}

export interface UndoRedoAction {
  type: 'cell-edit' | 'format' | 'delete' | 'insert' | 'relationship';
  tableId: string;
  timestamp: number;
  data: any;
  undo: () => void;
  redo: () => void;
}

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  is_primary?: boolean;
  is_foreign?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface OpenTable {
  id: string;
  schema: string;
  name: string;
  columns: TableColumn[];
  data: any[];
  formats: Map<string, CellFormat>; // "row-col" -> format
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isMaximized: boolean;
  isEditing: boolean;
  selection?: Selection;
  editingCell?: { row: number; col: string };
  isResizing: boolean;
  zIndex: number;
  hasUnsavedChanges: boolean;
  appliedTemplates?: AppliedTemplate[];
}

export interface AppliedTemplate {
  id: string;
  templateId: string;
  templateName: string;
  columnName: string;
  category: string;
  appliedAt: Date;
  status: 'active' | 'processing' | 'error' | 'completed';
  config: any;
  results?: TemplateResult[];
}

export interface TemplateResult {
  rowId: string | number;
  input: Record<string, any>;
  output: any;
  metadata?: {
    executionTime: number;
    cost?: number;
    tokens?: number;
    confidence?: number;
    error?: string;
  };
  createdAt: Date;
}

export interface TemplateLibraryState {
  isOpen: boolean;
  selectedTemplate?: string;
  searchQuery: string;
  filters: {
    category?: string;
    difficulty?: string;
    cost?: string;
  };
  sortBy: 'rating' | 'usage' | 'name' | 'created';
  viewMode: 'grid' | 'list';
}

export interface TemplateManagerState {
  isOpen: boolean;
  activeTab: 'create' | 'manage';
  editingTemplate?: string;
  customTemplates: CustomTemplate[];
  favoriteTemplates: string[];
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
  estimatedCost: 'low' | 'medium' | 'high';
  config: any;
  examples?: Array<{
    input: any;
    output: any;
    description: string;
  }>;
  isCustom: true;
  isShared: boolean;
  author: string;
  usageCount: number;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}