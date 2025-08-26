import { db, getFromCache, setCache, deleteCachePattern } from './config.js';
import { 
  Worksheet, Cell, ColumnConfig, CellUpdate, CellsChunk, 
  GetCellsParams, WorksheetStats, CacheKeys, CHUNK_SIZE, CACHE_TTL,
  validateCellPosition, validateDataType
} from './models.js';

// ===== REPOSITORY PARA WORKSHEETS =====
export class WorksheetRepository {

  // ===== WORKSHEET OPERATIONS =====
  
  async createWorksheet(data: Partial<Worksheet>): Promise<Worksheet> {
    const query = `
      INSERT INTO worksheets (name, description, owner_id, settings, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      data.name || 'Nova Planilha',
      data.description || null,
      data.owner_id || null,
      JSON.stringify(data.settings || {}),
      JSON.stringify(data.metadata || {})
    ];
    
    const result = await db.query(query, values);
    const worksheet = result.rows[0];
    
    // Invalidar cache
    await deleteCachePattern(`worksheet:${worksheet.id}*`);
    
    return worksheet;
  }

  async getWorksheet(id: string): Promise<Worksheet | null> {
    // Tentar cache primeiro
    const cacheKey = CacheKeys.worksheet(id);
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = 'SELECT * FROM worksheets WHERE id = $1 AND is_active = true';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    
    const worksheet = result.rows[0];
    
    // Salvar no cache
    await setCache(cacheKey, JSON.stringify(worksheet), CACHE_TTL);
    
    return worksheet;
  }

  async getWorksheetStats(id: string): Promise<WorksheetStats | null> {
    const cacheKey = CacheKeys.stats(id);
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = `
      SELECT * FROM worksheet_stats WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return null;
    
    const stats = result.rows[0];
    await setCache(cacheKey, JSON.stringify(stats), CACHE_TTL);
    
    return stats;
  }

  // ===== CELL OPERATIONS =====
  
  async getCells(params: GetCellsParams): Promise<CellsChunk> {
    const {
      worksheet_id,
      start_row = 1,
      end_row = CHUNK_SIZE,
      columns = ['A','B','C','D','E','F','G','H','I','J'],
      include_empty = false
    } = params;
    
    // Tentar cache primeiro
    const cacheKey = CacheKeys.cells(worksheet_id, start_row, end_row);
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Query otimizada
    const whereClause = include_empty ? '' : 'AND (value IS NOT NULL AND value != \'\')';
    
    const query = `
      SELECT row_num, col_name, value, data_type, display_value, style, updated_at
      FROM cells
      WHERE worksheet_id = $1
        AND row_num >= $2
        AND row_num <= $3
        AND col_name = ANY($4)
        ${whereClause}
      ORDER BY row_num, col_name
    `;
    
    const values = [worksheet_id, start_row, end_row, columns];
    const result = await db.query(query, values);
    
    // Contar total de linhas (cache separado)
    const countQuery = `
      SELECT COUNT(DISTINCT row_num) as total_rows,
             COUNT(*) as total_cells
      FROM cells
      WHERE worksheet_id = $1 AND (value IS NOT NULL AND value != '')
    `;
    
    const countResult = await db.query(countQuery, [worksheet_id]);
    const { total_rows, total_cells } = countResult.rows[0];
    
    const chunk: CellsChunk = {
      cells: result.rows,
      total_rows: parseInt(total_rows),
      total_cells: parseInt(total_cells),
      start_row,
      end_row,
      columns
    };
    
    // Cache por 5 minutos
    await setCache(cacheKey, JSON.stringify(chunk), CACHE_TTL);
    
    return chunk;
  }

  async getCell(worksheet_id: string, row: number, col: string): Promise<Cell | null> {
    if (!validateCellPosition(row, col)) {
      throw new Error('Posição de célula inválida');
    }
    
    const query = `
      SELECT * FROM cells
      WHERE worksheet_id = $1 AND row_num = $2 AND col_name = $3
    `;
    
    const result = await db.query(query, [worksheet_id, row, col]);
    return result.rows[0] || null;
  }

  async updateCell(update: CellUpdate): Promise<Cell> {
    const { worksheet_id, row_num, col_name, value, data_type, formula, style } = update;
    
    if (!validateCellPosition(row_num, col_name)) {
      throw new Error('Posição de célula inválida');
    }
    
    if (data_type && !validateDataType(data_type)) {
      throw new Error('Tipo de dados inválido');
    }
    
    // Upsert otimizado
    const query = `
      INSERT INTO cells (worksheet_id, row_num, col_name, value, data_type, formula, display_value, style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (worksheet_id, row_num, col_name)
      DO UPDATE SET
        value = EXCLUDED.value,
        data_type = EXCLUDED.data_type,
        formula = EXCLUDED.formula,
        display_value = EXCLUDED.display_value,
        style = EXCLUDED.style,
        updated_at = NOW(),
        version = cells.version + 1
      RETURNING *
    `;
    
    const display_value = this.formatDisplayValue(value, data_type || 'text');
    
    const values = [
      worksheet_id, row_num, col_name, value, data_type || 'text',
      formula, display_value, JSON.stringify(style || {})
    ];
    
    const result = await db.query(query, values);
    const cell = result.rows[0];
    
    // Invalidar caches relacionados
    await this.invalidateCellCaches(worksheet_id, row_num, col_name);
    
    return cell;
  }

  async deleteCells(worksheet_id: string, cellIds: { row: number; col: string }[]): Promise<void> {
    if (cellIds.length === 0) return;
    
    // Construir query para deletar múltiplas células
    const conditions = cellIds.map((_, i) => 
      `(row_num = $${i * 2 + 2} AND col_name = $${i * 2 + 3})`
    ).join(' OR ');
    
    const query = `
      DELETE FROM cells
      WHERE worksheet_id = $1 AND (${conditions})
    `;
    
    const values = [worksheet_id, ...cellIds.flatMap(cell => [cell.row, cell.col])];
    
    await db.query(query, values);
    
    // Invalidar caches
    for (const cell of cellIds) {
      await this.invalidateCellCaches(worksheet_id, cell.row, cell.col);
    }
  }

  // ===== COLUMN CONFIG OPERATIONS =====
  
  async getColumnConfigs(worksheet_id: string): Promise<ColumnConfig[]> {
    const cacheKey = CacheKeys.columnConfigs(worksheet_id);
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const query = `
      SELECT * FROM column_configs
      WHERE worksheet_id = $1
      ORDER BY col_name
    `;
    
    const result = await db.query(query, [worksheet_id]);
    const configs = result.rows;
    
    await setCache(cacheKey, JSON.stringify(configs), CACHE_TTL);
    
    return configs;
  }

  async updateColumnConfig(config: Partial<ColumnConfig>): Promise<ColumnConfig> {
    const query = `
      INSERT INTO column_configs (worksheet_id, col_name, name, width, data_type, is_required, is_unique, default_value, validation_rules)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (worksheet_id, col_name)
      DO UPDATE SET
        name = EXCLUDED.name,
        width = EXCLUDED.width,
        data_type = EXCLUDED.data_type,
        is_required = EXCLUDED.is_required,
        is_unique = EXCLUDED.is_unique,
        default_value = EXCLUDED.default_value,
        validation_rules = EXCLUDED.validation_rules
      RETURNING *
    `;
    
    const values = [
      config.worksheet_id, config.col_name, config.name,
      config.width || 128, config.data_type || 'text',
      config.is_required || false, config.is_unique || false,
      config.default_value, JSON.stringify(config.validation_rules || {})
    ];
    
    const result = await db.query(query, values);
    
    // Invalidar cache
    await deleteCachePattern(`column_configs:${config.worksheet_id}`);
    
    return result.rows[0];
  }

  // ===== BULK OPERATIONS =====
  
  async bulkUpdateCells(worksheet_id: string, updates: CellUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Usar prepared statement para performance
      const query = `
        INSERT INTO cells (worksheet_id, row_num, col_name, value, data_type, display_value, style)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (worksheet_id, row_num, col_name)
        DO UPDATE SET
          value = EXCLUDED.value,
          data_type = EXCLUDED.data_type,
          display_value = EXCLUDED.display_value,
          style = EXCLUDED.style,
          updated_at = NOW(),
          version = cells.version + 1
      `;
      
      for (const update of updates) {
        const display_value = this.formatDisplayValue(update.value, update.data_type || 'text');
        
        await client.query(query, [
          worksheet_id, update.row_num, update.col_name, update.value,
          update.data_type || 'text', display_value, JSON.stringify(update.style || {})
        ]);
      }
      
      await client.query('COMMIT');
      
      // Invalidar caches em batch
      await deleteCachePattern(`cells:${worksheet_id}*`);
      await deleteCachePattern(`stats:${worksheet_id}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===== HELPER METHODS =====
  
  private formatDisplayValue(value: any, dataType: string): string {
    if (!value && value !== 0) return '';
    
    switch (dataType) {
      case 'currency':
        const num = Number(String(value).replace(/[R$,.\s]/g, ''));
        if (isNaN(num)) return String(value);
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(num / 100);
        
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('pt-BR');
        
      case 'number':
        const numVal = Number(value);
        if (isNaN(numVal)) return String(value);
        return numVal.toString();
        
      default:
        return String(value);
    }
  }
  
  private async invalidateCellCaches(worksheet_id: string, row: number, col: string): Promise<void> {
    // Invalidar caches relacionados a esta célula
    await deleteCachePattern(`cells:${worksheet_id}*`);
    await deleteCachePattern(`stats:${worksheet_id}`);
  }
}

// Singleton instance
export const worksheetRepo = new WorksheetRepository();
