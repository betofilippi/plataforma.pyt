// Types e interfaces principais do módulo Database

export interface DatabaseModuleProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface TableData {
  id: string;
  name: string;
  schema: string;
  columns: TableColumn[];
  rows: Record<string, any>[];
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  isPrimaryKey?: boolean;
}

export interface DatabaseSchema {
  name: string;
  tables: TableData[];
}

export interface QueryResult {
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime: number;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
}

export type DatabaseEvent = 
  | { type: 'table_created'; payload: { table: TableData } }
  | { type: 'table_updated'; payload: { table: TableData } }
  | { type: 'table_deleted'; payload: { tableId: string } }
  | { type: 'query_executed'; payload: { query: string; result: QueryResult } };

export interface DatabaseState {
  schemas: DatabaseSchema[];
  activeSchema?: string;
  activeTable?: string;
  connection?: DatabaseConnection;
  isConnected: boolean;
  isLoading: boolean;
  error?: string;
}