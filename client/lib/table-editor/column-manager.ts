// Sistema de gerenciamento de colunas para o Table Editor
// Fornece identificação única e consistente para colunas

export interface ColumnIdentifier {
  tableId: string;
  columnName: string;
  dataIndex: number;    // Índice real nos dados (0-based)
}

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable?: string;
  column_default?: string;
  is_primary?: boolean;
  is_foreign?: boolean;
  media_type?: 'image' | 'pdf' | 'video' | 'mixed' | null;
  allow_multiple?: boolean;
  is_empty?: boolean;  // Para colunas vazias extras
}

export interface OpenTable {
  id: string;
  schema: string;
  name: string;
  columns: TableColumn[];
  data: any[];
  // Outros campos conforme necessário
}

/**
 * Classe para gerenciar identificação e mapeamento de colunas
 */
export class ColumnManager {
  private columnMap: Map<string, ColumnIdentifier> = new Map();
  
  /**
   * Cria um identificador único para uma coluna
   * @param table - Tabela que contém a coluna
   * @param col - Coluna a ser identificada
   * @param dataIndex - Índice da coluna nos dados (0-based)
   * @returns ColumnIdentifier com todos os metadados necessários
   */
  static createColumnId(
    table: { id: string; columns?: TableColumn[] }, 
    col: TableColumn, 
    dataIndex: number
  ): ColumnIdentifier {
    return {
      tableId: table.id,
      columnName: col.column_name,
      dataIndex: dataIndex         // Índice real nos dados (0-based)
    };
  }
  
  /**
   * Gera uma chave única para o Map a partir do identificador
   * @param id - ColumnIdentifier
   * @returns String única para usar como chave
   */
  static createKey(id: ColumnIdentifier): string {
    // Usa um formato que não pode conflitar com nomes de tabelas ou colunas
    return `${id.tableId}::column::${id.columnName}`;
  }
  
  /**
   * Obtém o identificador de uma coluna pelo índice de dados
   * @param tableId - ID da tabela
   * @param dataIndex - Índice nos dados (0-based)
   * @param columns - Array de colunas da tabela
   * @returns ColumnIdentifier ou null se não encontrado
   */
  static getColumnByIndex(
    tableId: string, 
    dataIndex: number, 
    columns: TableColumn[]
  ): ColumnIdentifier | null {
    if (dataIndex < 0 || dataIndex >= columns.length) return null;
    
    const col = columns[dataIndex];
    return this.createColumnId({ id: tableId, columns }, col, dataIndex);
  }
  
  /**
   * Obtém o identificador de uma coluna pelo índice de dados
   * @param tableId - ID da tabela
   * @param dataIndex - Índice nos dados (0-based)
   * @param columns - Array de colunas da tabela
   * @returns ColumnIdentifier ou null se não encontrado
   */
  static getColumnByDataIndex(
    tableId: string, 
    dataIndex: number, 
    columns: TableColumn[]
  ): ColumnIdentifier | null {
    if (dataIndex < 0 || dataIndex >= columns.length) return null;
    
    const col = columns[dataIndex];
    return this.createColumnId({ id: tableId, columns }, col, dataIndex);
  }
  
  /**
   * Verifica se um índice visual corresponde à coluna de números
   * @param visualIndex - Índice visual a verificar
   * @returns true se é a coluna de números de linha
   */
  static isRowNumberColumn(visualIndex: number): boolean {
    return visualIndex === 0;
  }
  
  /**
   * Converte índice visual para índice de dados
   * @param visualIndex - Índice visual (1-based para dados)
   * @returns Índice de dados (0-based) ou -1 se é coluna de números
   */
  static visualToDataIndex(visualIndex: number): number {
    return visualIndex - 1;
  }
  
  /**
   * Converte índice de dados para índice visual
   * @param dataIndex - Índice de dados (0-based)
   * @returns Índice visual (1-based)
   */
  static dataToVisualIndex(dataIndex: number): number {
    return dataIndex + 1;
  }
  
  /**
   * Valida se um ColumnIdentifier está correto
   * @param id - ColumnIdentifier a validar
   * @returns true se os índices estão consistentes
   */
  static validateColumnId(id: ColumnIdentifier): boolean {
    return id.dataIndex >= 0;
  }
  
  /**
   * Cria um Set de chaves de colunas selecionadas
   * @param tableId - ID da tabela
   * @param columnNames - Array de nomes de colunas
   * @returns Set de chaves únicas
   */
  static createSelectionSet(tableId: string, columnNames: string[]): Set<string> {
    const set = new Set<string>();
    columnNames.forEach(name => {
      const key = `${tableId}::column::${name}`;
      set.add(key);
    });
    return set;
  }
  
  /**
   * Extrai o nome da coluna de uma chave
   * @param key - Chave no formato tableId::column::columnName
   * @returns Nome da coluna ou null se formato inválido
   */
  static extractColumnName(key: string): string | null {
    const parts = key.split('::column::');
    if (parts.length !== 2) return null;
    return parts[1];
  }
  
  /**
   * Extrai o ID da tabela de uma chave
   * @param key - Chave no formato tableId::column::columnName
   * @returns ID da tabela ou null se formato inválido
   */
  static extractTableId(key: string): string | null {
    const parts = key.split('::column::');
    if (parts.length !== 2) return null;
    return parts[0];
  }
}

export default ColumnManager;