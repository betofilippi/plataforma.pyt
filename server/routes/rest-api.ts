import { Request, Response } from "express";

// Usar o mesmo cache do sistema
const spreadsheetCache = new Map<string, any>();

// Interfaces
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: any;
}

interface CellData {
  value: any;
  dataType: string;
  row: number;
  col: number;
  lastModified: Date;
  source?: string;
}

interface UpdateCellRequest {
  value: any;
  dataType?: string;
}

interface CreateRowRequest {
  data: Record<string, any>;
  table?: string;
  options?: {
    autoDetectTypes?: boolean;
    insertAt?: number;
  };
}

interface UpdateRowRequest {
  data: Record<string, any>;
  options?: {
    merge?: boolean;
    autoDetectTypes?: boolean;
  };
}

interface QueryParams {
  table?: string;
  limit?: string;
  offset?: string;
  sort?: string;
  filter?: string;
  fields?: string;
  format?: 'json' | 'array' | 'csv';
}

// Utility functions
function numberToColumn(num: number): string {
  let result = "";
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}

function columnToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result - 1;
}

function detectDataType(value: any): string {
  if (value === null || value === undefined || value === "") return "text";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";

  const str = String(value);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return "email";
  if (/^https?:\/\//.test(str)) return "url";
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return "date";
  if (/^\d+(\.\d+)?$/.test(str)) return "number";
  if (/^R\$\s?\d+[,.]?\d*/.test(str)) return "currency";

  return "text";
}

function createSpreadsheet(id: string) {
  return {
    id,
    cells: new Map(),
    rows: 0,
    cols: 0,
    tables: new Map(),
    metadata: {
      created: new Date(),
      lastModified: new Date(),
      apiRequests: 0,
      version: "1.0.0"
    },
  };
}

// === SPREADSHEET OPERATIONS ===

// GET /api/v1/spreadsheets - Listar planilhas
export async function listSpreadsheets(req: Request, res: Response) {
  try {
    const spreadsheets = Array.from(spreadsheetCache.entries()).map(([id, data]) => ({
      id,
      rows: data.rows,
      cols: data.cols,
      tables: Array.from(data.tables.keys()),
      totalCells: data.cells.size,
      created: data.metadata.created,
      lastModified: data.metadata.lastModified
    }));

    const response: ApiResponse = {
      success: true,
      data: spreadsheets,
      metadata: {
        total: spreadsheets.length,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/v1/spreadsheets/:id - Obter planilha específica
export async function getSpreadsheet(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { table, limit = "100", offset = "0", format = "json" } = req.query as QueryParams;

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    // Incrementar contador de requests
    spreadsheet.metadata.apiRequests++;

    let data;
    if (table) {
      // Retornar dados de uma tabela específica
      const targetTable = spreadsheet.tables.get(table);
      if (!targetTable) {
        return res.status(404).json({
          success: false,
          error: "Tabela não encontrada"
        });
      }

      const startIndex = parseInt(offset);
      const limitNum = parseInt(limit);
      const tableData = targetTable.data.slice(startIndex, startIndex + limitNum);

      if (format === 'array') {
        data = tableData.map((row: any) => 
          targetTable.headers.map((header: string) => row[header]?.value || '')
        );
      } else {
        data = tableData.map((row: any) => {
          const obj: any = {};
          targetTable.headers.forEach((header: string) => {
            obj[header] = row[header]?.value || '';
          });
          return obj;
        });
      }
    } else {
      // Retornar metadados da planilha
      data = {
        id,
        rows: spreadsheet.rows,
        cols: spreadsheet.cols,
        tables: Array.from(spreadsheet.tables.entries()).map(([name, table]: [string, any]) => ({
          name,
          rows: table.rows,
          cols: table.cols,
          headers: table.headers
        })),
        totalCells: spreadsheet.cells.size,
        metadata: spreadsheet.metadata
      };
    }

    const response: ApiResponse = {
      success: true,
      data,
      metadata: {
        spreadsheetId: id,
        table,
        format,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// POST /api/v1/spreadsheets - Criar nova planilha
export async function createSpreadsheetEndpoint(req: Request, res: Response) {
  try {
    const { id, name, tables = ['default'] } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID da planilha é obrigatório"
      });
    }

    if (spreadsheetCache.has(id)) {
      return res.status(409).json({
        success: false,
        error: "Planilha com este ID já existe"
      });
    }

    const spreadsheet = createSpreadsheet(id);
    spreadsheet.metadata.name = name || id;

    // Criar tabelas iniciais
    tables.forEach((tableName: string) => {
      spreadsheet.tables.set(tableName, {
        name: tableName,
        rows: 0,
        cols: 0,
        headers: [],
        data: []
      });
    });

    spreadsheetCache.set(id, spreadsheet);

    const response: ApiResponse = {
      success: true,
      data: {
        id,
        name: spreadsheet.metadata.name,
        tables: Array.from(spreadsheet.tables.keys()),
        created: spreadsheet.metadata.created
      },
      message: "Planilha criada com sucesso"
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/v1/spreadsheets/:id - Deletar planilha
export async function deleteSpreadsheet(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!spreadsheetCache.has(id)) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    spreadsheetCache.delete(id);

    const response: ApiResponse = {
      success: true,
      message: "Planilha deletada com sucesso"
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// === ROW OPERATIONS ===

// POST /api/v1/spreadsheets/:id/rows - Criar nova linha
export async function createRow(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { data, table = 'default', options = {} }: CreateRowRequest = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Campo 'data' é obrigatório e deve ser um objeto"
      });
    }

    let spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      spreadsheet = createSpreadsheet(id);
      spreadsheetCache.set(id, spreadsheet);
    }

    // Obter ou criar tabela
    if (!spreadsheet.tables.has(table)) {
      spreadsheet.tables.set(table, {
        name: table,
        rows: 0,
        cols: 0,
        headers: [],
        data: []
      });
    }

    const targetTable = spreadsheet.tables.get(table);
    const { autoDetectTypes = true, insertAt } = options;

    // Atualizar headers
    const fields = Object.keys(data);
    fields.forEach(field => {
      if (!targetTable.headers.includes(field)) {
        targetTable.headers.push(field);
      }
    });
    targetTable.cols = targetTable.headers.length;

    // Criar nova linha
    const rowIndex = insertAt !== undefined ? insertAt : targetTable.data.length;
    const newRow: any = {};

    fields.forEach((field, colIndex) => {
      const value = data[field];
      const dataType = autoDetectTypes ? detectDataType(value) : 'text';

      newRow[field] = {
        value,
        dataType,
        row: rowIndex,
        col: colIndex,
        lastModified: new Date(),
        source: 'api'
      };

      // Inserir também no formato de células
      const cellKey = `${rowIndex}-${colIndex}`;
      spreadsheet.cells.set(cellKey, {
        value,
        dataType,
        row: rowIndex,
        col: colIndex,
        table,
        field,
        lastModified: new Date(),
        source: 'api'
      });
    });

    // Inserir linha na posição correta
    if (insertAt !== undefined && insertAt < targetTable.data.length) {
      targetTable.data.splice(insertAt, 0, newRow);
    } else {
      targetTable.data.push(newRow);
    }

    targetTable.rows = targetTable.data.length;
    spreadsheet.rows = Math.max(spreadsheet.rows, targetTable.rows);
    spreadsheet.cols = Math.max(spreadsheet.cols, targetTable.cols);
    spreadsheet.metadata.lastModified = new Date();
    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      data: {
        id: rowIndex,
        table,
        data: newRow,
        insertedAt: rowIndex
      },
      message: "Linha criada com sucesso"
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// GET /api/v1/spreadsheets/:id/rows/:rowId - Obter linha específica
export async function getRow(req: Request, res: Response) {
  try {
    const { id, rowId } = req.params;
    const { table = 'default' } = req.query;

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const targetTable = spreadsheet.tables.get(table as string);
    if (!targetTable) {
      return res.status(404).json({
        success: false,
        error: "Tabela não encontrada"
      });
    }

    const rowIndex = parseInt(rowId);
    if (rowIndex < 0 || rowIndex >= targetTable.data.length) {
      return res.status(404).json({
        success: false,
        error: "Linha não encontrada"
      });
    }

    const row = targetTable.data[rowIndex];
    const formattedRow: any = { id: rowIndex };
    
    targetTable.headers.forEach(header => {
      formattedRow[header] = row[header]?.value || '';
    });

    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      data: formattedRow,
      metadata: {
        table,
        rowId: rowIndex,
        headers: targetTable.headers
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/v1/spreadsheets/:id/rows/:rowId - Atualizar linha
export async function updateRow(req: Request, res: Response) {
  try {
    const { id, rowId } = req.params;
    const { data, options = {} }: UpdateRowRequest = req.body;
    const { table = 'default' } = req.query;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: "Campo 'data' é obrigatório"
      });
    }

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const targetTable = spreadsheet.tables.get(table as string);
    if (!targetTable) {
      return res.status(404).json({
        success: false,
        error: "Tabela não encontrada"
      });
    }

    const rowIndex = parseInt(rowId);
    if (rowIndex < 0 || rowIndex >= targetTable.data.length) {
      return res.status(404).json({
        success: false,
        error: "Linha não encontrada"
      });
    }

    const { merge = true, autoDetectTypes = true } = options;
    const existingRow = targetTable.data[rowIndex];

    // Atualizar dados
    const fields = Object.keys(data);
    fields.forEach(field => {
      if (!targetTable.headers.includes(field)) {
        targetTable.headers.push(field);
      }

      const value = data[field];
      const dataType = autoDetectTypes ? detectDataType(value) : 'text';

      if (merge) {
        // Merge: manter campos existentes, atualizar apenas os fornecidos
        existingRow[field] = {
          value,
          dataType,
          row: rowIndex,
          col: targetTable.headers.indexOf(field),
          lastModified: new Date(),
          source: 'api'
        };
      } else {
        // Replace: substituir completamente a linha
        existingRow[field] = {
          value,
          dataType,
          row: rowIndex,
          col: targetTable.headers.indexOf(field),
          lastModified: new Date(),
          source: 'api'
        };
      }

      // Atualizar também no formato de células
      const colIndex = targetTable.headers.indexOf(field);
      const cellKey = `${rowIndex}-${colIndex}`;
      spreadsheet.cells.set(cellKey, {
        value,
        dataType,
        row: rowIndex,
        col: colIndex,
        table: table as string,
        field,
        lastModified: new Date(),
        source: 'api'
      });
    });

    targetTable.cols = targetTable.headers.length;
    spreadsheet.metadata.lastModified = new Date();
    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      data: {
        id: rowIndex,
        table,
        updated: fields,
        mode: merge ? 'merge' : 'replace'
      },
      message: "Linha atualizada com sucesso"
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// DELETE /api/v1/spreadsheets/:id/rows/:rowId - Deletar linha
export async function deleteRow(req: Request, res: Response) {
  try {
    const { id, rowId } = req.params;
    const { table = 'default' } = req.query;

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const targetTable = spreadsheet.tables.get(table as string);
    if (!targetTable) {
      return res.status(404).json({
        success: false,
        error: "Tabela não encontrada"
      });
    }

    const rowIndex = parseInt(rowId);
    if (rowIndex < 0 || rowIndex >= targetTable.data.length) {
      return res.status(404).json({
        success: false,
        error: "Linha não encontrada"
      });
    }

    // Remover linha
    targetTable.data.splice(rowIndex, 1);
    targetTable.rows = targetTable.data.length;

    // Remover células relacionadas
    targetTable.headers.forEach((header, colIndex) => {
      const cellKey = `${rowIndex}-${colIndex}`;
      spreadsheet.cells.delete(cellKey);
    });

    spreadsheet.metadata.lastModified = new Date();
    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      message: "Linha deletada com sucesso",
      data: {
        deletedRowId: rowIndex,
        table,
        newRowCount: targetTable.rows
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// === CELL OPERATIONS ===

// GET /api/v1/spreadsheets/:id/cells/:cellId - Obter célula específica
export async function getCell(req: Request, res: Response) {
  try {
    const { id, cellId } = req.params;

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const cell = spreadsheet.cells.get(cellId);
    if (!cell) {
      return res.status(404).json({
        success: false,
        error: "Célula não encontrada"
      });
    }

    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      data: {
        id: cellId,
        value: cell.value,
        dataType: cell.dataType,
        row: cell.row,
        col: cell.col,
        table: cell.table,
        field: cell.field,
        lastModified: cell.lastModified,
        source: cell.source
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// PUT /api/v1/spreadsheets/:id/cells/:cellId - Atualizar célula
export async function updateCell(req: Request, res: Response) {
  try {
    const { id, cellId } = req.params;
    const { value, dataType }: UpdateCellRequest = req.body;

    const spreadsheet = spreadsheetCache.get(id);
    if (!spreadsheet) {
      return res.status(404).json({
        success: false,
        error: "Planilha não encontrada"
      });
    }

    const existingCell = spreadsheet.cells.get(cellId);
    if (!existingCell) {
      return res.status(404).json({
        success: false,
        error: "Célula não encontrada"
      });
    }

    // Atualizar célula
    const updatedCell: CellData = {
      ...existingCell,
      value,
      dataType: dataType || detectDataType(value),
      lastModified: new Date(),
      source: 'api'
    };

    spreadsheet.cells.set(cellId, updatedCell);
    spreadsheet.metadata.lastModified = new Date();
    spreadsheet.metadata.apiRequests++;

    const response: ApiResponse = {
      success: true,
      data: {
        id: cellId,
        value: updatedCell.value,
        dataType: updatedCell.dataType,
        lastModified: updatedCell.lastModified
      },
      message: "Célula atualizada com sucesso"
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// === UTILITY ENDPOINTS ===

// GET /api/v1/status - Status da API
export async function getApiStatus(req: Request, res: Response) {
  try {
    const totalSpreadsheets = spreadsheetCache.size;
    const totalCells = Array.from(spreadsheetCache.values())
      .reduce((sum, sheet) => sum + sheet.cells.size, 0);
    const totalApiRequests = Array.from(spreadsheetCache.values())
      .reduce((sum, sheet) => sum + (sheet.metadata.apiRequests || 0), 0);

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'online',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        stats: {
          totalSpreadsheets,
          totalCells,
          totalApiRequests,
          memoryUsage: process.memoryUsage()
        },
        endpoints: {
          spreadsheets: '/api/v1/spreadsheets',
          webhooks: '/api/v1/webhooks',
          import: '/api/v1/import',
          export: '/api/v1/export'
        }
      }
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
