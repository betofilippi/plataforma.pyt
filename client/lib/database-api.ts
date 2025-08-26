/**
 * Database API Client - Interface para as APIs do banco de dados integrado
 * 
 * Cliente para consumir as APIs migradas do planilha.app
 */

import { API_URLS } from './api-config';
import { smartFetch, debouncedFetch } from './api-utils';

// Base API URL - use centralized configuration
const API_BASE = API_URLS.database;

// API Response Types
export interface TableInfo {
  name: string;
  id: string;
  schema: string;
  live_rows_estimate: number;
  comment?: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  comment?: string;
}

export interface TableData {
  data: any[];
  totalCount: number;
  offset: number;
  limit: number;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  command: string;
  fields?: { name: string; dataType: number }[];
}

export interface DatabaseStats {
  schemas: Array<{
    schemaname: string;
    table_count: string;
    total_rows: string;
  }>;
  total_tables: number;
  total_rows: number;
}

// API Functions

/**
 * Test database connection
 */
export async function testConnection(): Promise<{
  connected: boolean;
  current_time?: string;
  postgres_version?: string;
  error?: string;
}> {
  return await smartFetch(`${API_BASE}/test`, {}, 60); // Cache por 1 minuto
}

/**
 * List all tables with metadata
 */
export async function listTables(): Promise<TableInfo[]> {
  return await debouncedFetch(`${API_BASE}/tables`, {}, 500, 120); // Debounce 500ms, cache 2min
}

/**
 * Get table schema details
 */
export async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  return await smartFetch(`${API_BASE}/tables/${encodeURIComponent(tableName)}/schema`, {}, 300); // Cache por 5 minutos
}

/**
 * Get table data with pagination and search
 */
export async function getTableData(
  tableName: string,
  options: {
    offset?: number;
    limit?: number;
    search?: string;
  } = {}
): Promise<TableData> {
  const params = new URLSearchParams();
  if (options.offset !== undefined) params.append('offset', options.offset.toString());
  if (options.limit !== undefined) params.append('limit', options.limit.toString());
  if (options.search) params.append('search', options.search);

  const url = `${API_BASE}/tables/${encodeURIComponent(tableName)}/data?${params}`;
  return await debouncedFetch(url, {}, 300, 30); // Debounce 300ms, cache 30s
}

/**
 * Execute custom SQL query
 */
export async function executeQuery(
  sql: string,
  params: any[] = []
): Promise<QueryResult> {
  const response = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Create new table
 */
export async function createTable(
  tableName: string,
  columns: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    defaultValue?: string;
  }>,
  schema: string = 'public'
): Promise<{
  success: boolean;
  message: string;
  tableName?: string;
}> {
  const response = await fetch(`${API_BASE}/tables`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify({ tableName, columns, schema }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create table: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  return await smartFetch(`${API_BASE}/stats`, {}, 180); // Cache por 3 minutos
}

// Utility functions for data type formatting
export function formatDataType(column: ColumnInfo): string {
  let type = column.data_type.toUpperCase();
  
  if (column.character_maximum_length) {
    type += `(${column.character_maximum_length})`;
  } else if (column.numeric_precision) {
    if (column.numeric_scale) {
      type += `(${column.numeric_precision},${column.numeric_scale})`;
    } else {
      type += `(${column.numeric_precision})`;
    }
  }
  
  return type;
}

export function formatRowCount(count: number | string): string {
  const num = typeof count === 'string' ? parseInt(count) : count;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function getSchemaColor(schema: string): string {
  const colors: Record<string, string> = {
    public: 'text-blue-400',
    plataforma_core: 'text-purple-400',
    identidade_app: 'text-pink-400',
    produtos_app: 'text-green-400',
    estoques_app: 'text-yellow-400',
    loja_app: 'text-red-400',
    importacao_app: 'text-orange-400',
  };
  
  return colors[schema] || 'text-gray-400';
}