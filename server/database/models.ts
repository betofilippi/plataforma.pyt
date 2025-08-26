// ===== MODELOS TYPESCRIPT PARA BANCO DE DADOS =====

export interface Worksheet {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  owner_id?: string;
  is_active: boolean;
  settings: Record<string, any>;
  metadata: Record<string, any>;
}

export interface Cell {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  value?: string;
  data_type: string;
  formula?: string;
  display_value?: string;
  style: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export interface ColumnConfig {
  id: string;
  worksheet_id: string;
  col_name: string;
  name?: string;
  width: number;
  data_type: string;
  is_required: boolean;
  is_unique: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  created_at: Date;
}

export interface Relationship {
  id: string;
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  source_worksheet_id: string;
  source_column: string;
  target_worksheet_id: string;
  target_column: string;
  is_active: boolean;
  created_at: Date;
}

export interface FormulaCache {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  formula: string;
  result?: string;
  dependencies: string[];
  last_calculated: Date;
}

// ===== TIPOS PARA APIs =====
export interface CellUpdate {
  worksheet_id: string;
  row_num: number;
  col_name: string;
  value?: string;
  data_type?: string;
  formula?: string;
  style?: Record<string, any>;
}

export interface CellsChunk {
  cells: Cell[];
  total_rows: number;
  total_cells: number;
  start_row: number;
  end_row: number;
  columns: string[];
}

export interface WorksheetStats {
  id: string;
  name: string;
  total_cells: number;
  total_rows: number;
  total_columns: number;
  max_row: number;
  updated_at: Date;
}

// ===== QUERY PARAMETERS =====
export interface GetCellsParams {
  worksheet_id: string;
  start_row?: number;
  end_row?: number;
  columns?: string[];
  include_empty?: boolean;
}

export interface SearchParams {
  worksheet_id: string;
  query: string;
  columns?: string[];
  data_types?: string[];
  limit?: number;
  offset?: number;
}

// ===== VALIDAÇÃO =====
export const DATA_TYPES = [
  'text', 'number', 'currency', 'date', 'boolean',
  'formula', 'lookup', 'reference', 'file', 'image'
] as const;

export type DataType = typeof DATA_TYPES[number];

export const RELATIONSHIP_TYPES = [
  'one-to-one', 'one-to-many', 'many-to-many'
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

// ===== CONSTRAINTS =====
export const MAX_ROWS = 100000;
export const MAX_COLUMNS = 1000;
export const MAX_CELL_VALUE_LENGTH = 32768; // 32KB por célula
export const CHUNK_SIZE = 1000; // Linhas por chunk
export const CACHE_TTL = 300; // 5 minutos

// ===== FUNÇÕES DE VALIDAÇÃO =====
export function validateCellPosition(row: number, col: string): boolean {
  return row >= 1 && row <= MAX_ROWS && col.length <= 10;
}

export function validateDataType(dataType: string): dataType is DataType {
  return DATA_TYPES.includes(dataType as DataType);
}

export function validateRelationshipType(type: string): type is RelationshipType {
  return RELATIONSHIP_TYPES.includes(type as RelationshipType);
}

export function validateCellValue(value: string): boolean {
  return value.length <= MAX_CELL_VALUE_LENGTH;
}

// ===== UTILITÁRIOS =====
export function getCellId(row: number, col: string): string {
  return `${col}${row}`;
}

export function parseCellId(cellId: string): { row: number; col: string } | null {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  return {
    col: match[1],
    row: parseInt(match[2])
  };
}

export function getColumnIndex(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result;
}

export function getColumnName(index: number): string {
  let result = '';
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

// ===== CACHE KEYS =====
export const CacheKeys = {
  worksheet: (id: string) => `worksheet:${id}`,
  cells: (worksheetId: string, startRow: number, endRow: number) => 
    `cells:${worksheetId}:${startRow}-${endRow}`,
  cellsColumn: (worksheetId: string, col: string) => 
    `cells:${worksheetId}:col:${col}`,
  columnConfigs: (worksheetId: string) => `column_configs:${worksheetId}`,
  relationships: (worksheetId: string) => `relationships:${worksheetId}`,
  stats: (worksheetId: string) => `stats:${worksheetId}`
} as const;
