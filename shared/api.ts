/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Spreadsheet API response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  message?: string;
}

export interface SpreadsheetListItem {
  id: string;
  name: string;
  metadata: {
    created: string;
    lastModified: string;
    createdBy: string;
    lastModifiedBy: string;
    version: number;
  };
  cellCount: number;
}

export interface SpreadsheetStats {
  totalCells: number;
  filledCells: number;
  formulas: number;
  dataTypes: {
    text: number;
    number: number;
    currency: number;
    date: number;
    file: number;
    image: number;
    formula: number;
    boolean: number;
  };
  lastActivity: string;
  version: number;
}

export interface CreateSpreadsheetRequest {
  name: string;
}

export interface UpdateCellRequest {
  id: string;
  value: any;
  displayValue: string;
  dataType:
    | "text"
    | "number"
    | "currency"
    | "date"
    | "file"
    | "image"
    | "formula"
    | "boolean";
  formula?: string;
  metadata?: Record<string, any>;
  style?: Record<string, any>;
}

export interface CalculateFormulaRequest {
  formula: string;
  cellId: string;
}
