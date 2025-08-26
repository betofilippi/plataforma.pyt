/**
 * Serviço de Metadados de Tabelas
 * 
 * Gerencia cache, persistência e sincronização dos type hints
 * com o banco de dados e localStorage
 */

import { 
  ColumnMetadata, 
  TableMetadata, 
  TypeHint, 
  autoDetectColumnType,
  suggestSelectOptions 
} from './table-metadata';

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const CACHE_PREFIX = 'table_metadata_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas
const API_BASE = '/api/postgres';

// =====================================================
// CACHE EM MEMÓRIA
// =====================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  
  set(key: string, data: T, ttl: number = CACHE_EXPIRY): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
}

const metadataCache = new MemoryCache<TableMetadata>();
const columnCache = new MemoryCache<ColumnMetadata>();

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export class MetadataService {
  
  /**
   * Obter metadados de uma tabela completa
   */
  async getTableMetadata(schema: string, table: string): Promise<TableMetadata> {
    const cacheKey = `${schema}.${table}`;
    
    // Verificar cache primeiro
    const cached = metadataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Buscar do banco
    try {
      const response = await fetch(
        `${API_BASE}/table-metadata?schema=${schema}&table=${table}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }
      
      const metadata = await response.json();
      
      // Converter para Map para facilitar acesso
      const tableMetadata: TableMetadata = {
        schemaName: schema,
        tableName: table,
        columns: new Map(),
        lastUpdated: new Date().toISOString()
      };
      
      metadata.forEach((col: any) => {
        const columnMeta: ColumnMetadata = {
          id: col.id,
          schemaName: col.schema_name,
          tableName: col.table_name,
          columnName: col.column_name,
          typeHint: col.type_hint as TypeHint,
          formatOptions: col.format_options ? JSON.parse(col.format_options) : {},
          validationRules: col.validation_rules ? JSON.parse(col.validation_rules) : {},
          editorType: col.editor_type,
          confidence: col.confidence || 1.0,
          isAutoDetected: col.is_auto_detected || false,
          createdAt: col.created_at,
          updatedAt: col.updated_at
        };
        
        tableMetadata.columns.set(col.column_name, columnMeta);
      });
      
      // Salvar no cache
      metadataCache.set(cacheKey, tableMetadata);
      
      return tableMetadata;
      
    } catch (error) {
      console.error('Error fetching table metadata:', error);
      
      // Retornar metadata vazia em caso de erro
      return {
        schemaName: schema,
        tableName: table,
        columns: new Map(),
        lastUpdated: new Date().toISOString()
      };
    }
  }
  
  /**
   * Obter metadados de uma coluna específica
   */
  async getColumnMetadata(
    schema: string, 
    table: string, 
    column: string
  ): Promise<ColumnMetadata | null> {
    const cacheKey = `${schema}.${table}.${column}`;
    
    // Verificar cache
    const cached = columnCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Buscar da tabela completa
    const tableMetadata = await this.getTableMetadata(schema, table);
    const columnMetadata = tableMetadata.columns.get(column);
    
    if (columnMetadata) {
      columnCache.set(cacheKey, columnMetadata);
      return columnMetadata;
    }
    
    return null;
  }
  
  /**
   * Detectar automaticamente tipos de todas as colunas de uma tabela
   */
  async autoDetectTableTypes(
    schema: string, 
    table: string,
    sampleSize: number = 100
  ): Promise<Map<string, ColumnMetadata>> {
    
    try {
      // Buscar estrutura da tabela
      const columnsResponse = await fetch(
        `${API_BASE}/table-structure?schema=${schema}&table=${table}`
      );
      
      if (!columnsResponse.ok) {
        throw new Error('Failed to fetch table structure');
      }
      
      const columns = await columnsResponse.json();
      
      // Buscar dados de amostra
      const dataResponse = await fetch(
        `${API_BASE}/table-data/${table}?schema=${schema}&limit=${sampleSize}`
      );
      
      if (!dataResponse.ok) {
        throw new Error('Failed to fetch sample data');
      }
      
      const { rows } = await dataResponse.json();
      
      const detectedMetadata = new Map<string, ColumnMetadata>();
      
      // Detectar tipo de cada coluna
      for (const column of columns) {
        const columnName = column.column_name;
        
        // Extrair valores da coluna
        const sampleValues = rows
          .map((row: any) => row[columnName])
          .filter((val: any) => val !== null && val !== undefined)
          .map((val: any) => String(val));
        
        // Detectar tipo automaticamente
        const { hint, confidence } = autoDetectColumnType(columnName, sampleValues);
        
        // Criar metadados
        const metadata: ColumnMetadata = {
          schemaName: schema,
          tableName: table,
          columnName,
          typeHint: hint,
          confidence,
          isAutoDetected: true,
          formatOptions: this.generateFormatOptions(hint, sampleValues),
          validationRules: this.generateValidationRules(hint, sampleValues),
          editorType: this.suggestEditorType(hint),
          createdAt: new Date().toISOString(),
          createdBy: 'auto-detection'
        };
        
        detectedMetadata.set(columnName, metadata);
      }
      
      return detectedMetadata;
      
    } catch (error) {
      console.error('Error in auto-detection:', error);
      return new Map();
    }
  }
  
  /**
   * Salvar metadados de uma coluna
   */
  async saveColumnMetadata(metadata: ColumnMetadata): Promise<void> {
    try {
      const payload = {
        schema_name: metadata.schemaName,
        table_name: metadata.tableName,
        column_name: metadata.columnName,
        type_hint: metadata.typeHint,
        format_options: JSON.stringify(metadata.formatOptions || {}),
        validation_rules: JSON.stringify(metadata.validationRules || {}),
        editor_type: metadata.editorType,
        confidence: metadata.confidence || 1.0,
        is_auto_detected: metadata.isAutoDetected || false,
        updated_by: 'user'
      };
      
      const response = await fetch(`${API_BASE}/column-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save metadata');
      }
      
      // Limpar cache para forçar reload
      const tableCacheKey = `${metadata.schemaName}.${metadata.tableName}`;
      const columnCacheKey = `${tableCacheKey}.${metadata.columnName}`;
      
      metadataCache.delete(tableCacheKey);
      columnCache.delete(columnCacheKey);
      
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw error;
    }
  }
  
  /**
   * Salvar metadados de múltiplas colunas em lote
   */
  async saveTableMetadata(
    schema: string,
    table: string,
    columnsMetadata: Map<string, ColumnMetadata>
  ): Promise<void> {
    
    const metadataArray = Array.from(columnsMetadata.values()).map(metadata => ({
      schema_name: metadata.schemaName,
      table_name: metadata.tableName,
      column_name: metadata.columnName,
      type_hint: metadata.typeHint,
      format_options: JSON.stringify(metadata.formatOptions || {}),
      validation_rules: JSON.stringify(metadata.validationRules || {}),
      editor_type: metadata.editorType,
      confidence: metadata.confidence || 1.0,
      is_auto_detected: metadata.isAutoDetected || false,
      updated_by: 'auto-detection'
    }));
    
    try {
      const response = await fetch(`${API_BASE}/table-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schema,
          table,
          metadata: metadataArray
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save table metadata');
      }
      
      // Limpar cache
      const cacheKey = `${schema}.${table}`;
      metadataCache.delete(cacheKey);
      
      // Limpar cache de colunas individuais
      for (const columnName of columnsMetadata.keys()) {
        columnCache.delete(`${cacheKey}.${columnName}`);
      }
      
    } catch (error) {
      console.error('Error saving table metadata:', error);
      throw error;
    }
  }
  
  /**
   * Aplicar detecção automática e salvar no banco
   */
  async applyAutoDetection(
    schema: string, 
    table: string,
    overrideExisting: boolean = false
  ): Promise<void> {
    
    // Detectar tipos automaticamente
    const detectedMetadata = await this.autoDetectTableTypes(schema, table);
    
    if (detectedMetadata.size === 0) {
      throw new Error('No metadata detected');
    }
    
    // Se não deve sobrescrever, filtrar apenas colunas novas
    if (!overrideExisting) {
      const existingMetadata = await this.getTableMetadata(schema, table);
      
      // Remover colunas que já têm metadata manual
      for (const [columnName, existing] of existingMetadata.columns) {
        if (!existing.isAutoDetected) {
          detectedMetadata.delete(columnName);
        }
      }
    }
    
    if (detectedMetadata.size > 0) {
      await this.saveTableMetadata(schema, table, detectedMetadata);
    }
  }
  
  /**
   * Limpar cache
   */
  clearCache(): void {
    metadataCache.clear();
    columnCache.clear();
  }
  
  // =====================================================
  // MÉTODOS PRIVADOS AUXILIARES
  // =====================================================
  
  private generateFormatOptions(hint: TypeHint, sampleValues: string[]): any {
    switch (hint) {
      case 'currency':
        return { currency: 'BRL', decimals: 2, prefix: 'R$ ' };
        
      case 'percentage':
        return { decimals: 2, suffix: '%' };
        
      case 'date':
        return { format: 'DD/MM/YYYY' };
        
      case 'datetime':
        return { format: 'DD/MM/YYYY HH:mm' };
        
      case 'phone':
        return { mask: '(99) 99999-9999' };
        
      case 'cpf':
        return { mask: '999.999.999-99' };
        
      case 'cnpj':
        return { mask: '99.999.999/9999-99' };
        
      case 'cep':
        return { mask: '99999-999' };
        
      case 'select':
        return { options: suggestSelectOptions(sampleValues) };
        
      case 'boolean':
        return { trueLabel: 'Sim', falseLabel: 'Não' };
        
      case 'rating':
        return { max: 5, showText: true };
        
      default:
        return {};
    }
  }
  
  private generateValidationRules(hint: TypeHint, sampleValues: string[]): any {
    switch (hint) {
      case 'email':
        return { validateEmail: true };
        
      case 'cpf':
        return { validateCPF: true };
        
      case 'cnpj':
        return { validateCNPJ: true };
        
      case 'url':
        return { validateURL: true };
        
      case 'number':
      case 'currency':
        // Tentar detectar range dos valores
        const numbers = sampleValues
          .map(v => parseFloat(v))
          .filter(n => !isNaN(n));
          
        if (numbers.length > 0) {
          return {
            min: Math.min(...numbers),
            max: Math.max(...numbers) * 2 // Buffer para novos valores
          };
        }
        return { min: 0 };
        
      default:
        return {};
    }
  }
  
  private suggestEditorType(hint: TypeHint): string {
    const editorMap: Record<TypeHint, string> = {
      text: 'text',
      textarea: 'textarea',
      number: 'number-input',
      currency: 'currency-input',
      percentage: 'percentage-input',
      date: 'date-picker',
      datetime: 'datetime-picker',
      time: 'time-picker',
      boolean: 'switch',
      select: 'select',
      tags: 'tags-input',
      rating: 'rating',
      cpf: 'masked-input',
      cnpj: 'masked-input',
      phone: 'masked-input',
      email: 'email-input',
      url: 'url-input',
      cep: 'masked-input',
      color: 'color-picker',
      json: 'json-editor',
      markdown: 'markdown-editor',
      code: 'code-editor',
      media: 'file-upload',
      location: 'location-picker',
      relation: 'select',
      uuid: 'readonly',
      ip: 'text',
      slug: 'text'
    };
    
    return editorMap[hint] || 'text';
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const metadataService = new MetadataService();

// =====================================================
// HOOKS REACT - Para ser usado em componentes
// =====================================================

// NOTA: Os hooks devem ser importados separadamente nos componentes
// que os usam para evitar problemas de dependências circulares