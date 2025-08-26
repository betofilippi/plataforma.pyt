/**
 * Table State Persistence - Sistema completo de persistência de estado das tabelas
 * 
 * Salva automaticamente o estado completo de cada tabela para restaurar
 * exatamente como estava: posição, filtros, zoom, colunas, seleções, etc.
 */

import { ColumnFilter } from '@/components/TableEditor/ColumnFilterControl';

// =====================================================
// INTERFACES
// =====================================================

export interface TableState {
  // Identificação
  tableId: string;
  schemaName: string;
  tableName: string;
  
  // Posição e tamanho da janela
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized?: boolean;
  
  // Estado das colunas
  columnWidths: Record<string, number>;
  hiddenColumns: string[];
  columnOrder: string[];
  
  // Filtros ativos por coluna
  filters: Record<string, ColumnFilter>;
  
  // Estado visual
  zoom: number;
  scroll: { x: number; y: number };
  
  // Seleções e edição
  selectedCells: string[];
  selectedRows: string[];
  selectedColumns: string[];
  editingCell?: { row: number; col: string };
  
  // Modos e configurações
  rawDataMode: boolean;
  showHiddenColumns: boolean;
  
  // Formatação de células
  cellFormatting: Record<string, {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    border?: string;
  }>;
  
  // Metadados
  lastModified: number;
  version: string;
}

export interface TableStatePersistenceOptions {
  autoSaveDelay?: number; // Delay para debounce do auto-save (default: 1000ms)
  storageKey?: string; // Prefixo da chave no localStorage (default: 'table-state')
  maxStates?: number; // Máximo de estados a manter (default: 50)
}

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

class TableStatePersistence {
  private options: Required<TableStatePersistenceOptions>;
  private saveTimeout: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(options: TableStatePersistenceOptions = {}) {
    this.options = {
      autoSaveDelay: options.autoSaveDelay || 1000,
      storageKey: options.storageKey || 'table-state',
      maxStates: options.maxStates || 50,
      ...options
    };
  }

  // =====================================================
  // SALVAMENTO
  // =====================================================
  
  /**
   * Salva o estado de uma tabela (com debounce)
   */
  saveTableState(state: TableState): void {
    const key = this.getStateKey(state.schemaName, state.tableName);
    
    // Cancelar timeout anterior se existir
    if (this.saveTimeout.has(key)) {
      clearTimeout(this.saveTimeout.get(key)!);
    }
    
    // Agendar salvamento com debounce
    const timeout = setTimeout(() => {
      this.saveTableStateImmediate(state);
      this.saveTimeout.delete(key);
    }, this.options.autoSaveDelay);
    
    this.saveTimeout.set(key, timeout);
  }
  
  /**
   * Salva o estado imediatamente (sem debounce)
   */
  saveTableStateImmediate(state: TableState): void {
    try {
      const key = this.getStateKey(state.schemaName, state.tableName);
      const stateWithTimestamp = {
        ...state,
        lastModified: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem(key, JSON.stringify(stateWithTimestamp));
      
      // Atualizar lista de estados salvos
      this.updateStatesList(key);
      
      console.log('💾 Estado da tabela salvo:', key);
    } catch (error) {
      console.error('❌ Erro ao salvar estado da tabela:', error);
    }
  }
  
  // =====================================================
  // CARREGAMENTO
  // =====================================================
  
  /**
   * Carrega o estado de uma tabela
   */
  loadTableState(schemaName: string, tableName: string): TableState | null {
    try {
      const key = this.getStateKey(schemaName, tableName);
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        console.log('📂 Nenhum estado salvo encontrado para:', key);
        return null;
      }
      
      const state = JSON.parse(stored) as TableState;
      
      // Validar se o estado não é muito antigo (mais de 30 dias)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
      if (Date.now() - state.lastModified > maxAge) {
        console.log('⏰ Estado muito antigo, ignorando:', key);
        this.removeTableState(schemaName, tableName);
        return null;
      }
      
      console.log('📖 Estado da tabela carregado:', key);
      return state;
    } catch (error) {
      console.error('❌ Erro ao carregar estado da tabela:', error);
      return null;
    }
  }
  
  // =====================================================
  // REMOÇÃO E LIMPEZA
  // =====================================================
  
  /**
   * Remove o estado de uma tabela
   */
  removeTableState(schemaName: string, tableName: string): void {
    try {
      const key = this.getStateKey(schemaName, tableName);
      localStorage.removeItem(key);
      this.removeFromStatesList(key);
      console.log('🗑️ Estado da tabela removido:', key);
    } catch (error) {
      console.error('❌ Erro ao remover estado da tabela:', error);
    }
  }
  
  /**
   * Remove todos os estados salvos
   */
  clearAllStates(): void {
    try {
      const statesList = this.getStatesList();
      statesList.forEach(key => {
        localStorage.removeItem(key);
      });
      
      localStorage.removeItem(this.getStatesListKey());
      console.log('🧹 Todos os estados das tabelas foram limpos');
    } catch (error) {
      console.error('❌ Erro ao limpar estados:', error);
    }
  }
  
  /**
   * Lista todos os estados salvos
   */
  getAllSavedStates(): { key: string; state: TableState }[] {
    const states: { key: string; state: TableState }[] = [];
    const statesList = this.getStatesList();
    
    statesList.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const state = JSON.parse(stored) as TableState;
          states.push({ key, state });
        }
      } catch (error) {
        console.error('❌ Erro ao carregar estado:', key, error);
      }
    });
    
    return states.sort((a, b) => b.state.lastModified - a.state.lastModified);
  }
  
  // =====================================================
  // UTILITÁRIOS PRIVADOS
  // =====================================================
  
  private getStateKey(schemaName: string, tableName: string): string {
    return `${this.options.storageKey}:${schemaName}:${tableName}`;
  }
  
  private getStatesListKey(): string {
    return `${this.options.storageKey}:list`;
  }
  
  private getStatesList(): string[] {
    try {
      const stored = localStorage.getItem(this.getStatesListKey());
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  private updateStatesList(key: string): void {
    try {
      const list = this.getStatesList();
      
      // Adicionar à lista se não existir
      if (!list.includes(key)) {
        list.push(key);
        
        // Limitar número de estados
        if (list.length > this.options.maxStates) {
          const removed = list.shift()!;
          localStorage.removeItem(removed);
        }
        
        localStorage.setItem(this.getStatesListKey(), JSON.stringify(list));
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar lista de estados:', error);
    }
  }
  
  private removeFromStatesList(key: string): void {
    try {
      const list = this.getStatesList();
      const index = list.indexOf(key);
      
      if (index !== -1) {
        list.splice(index, 1);
        localStorage.setItem(this.getStatesListKey(), JSON.stringify(list));
      }
    } catch (error) {
      console.error('❌ Erro ao remover da lista de estados:', error);
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const tablePersistence = new TableStatePersistence();

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Cria um estado inicial para uma nova tabela
 */
export function createInitialTableState(
  tableId: string,
  schemaName: string,
  tableName: string,
  position: { x: number; y: number } = { x: 100, y: 100 },
  size: { width: number; height: number } = { width: 800, height: 600 }
): TableState {
  return {
    tableId,
    schemaName,
    tableName,
    position,
    size,
    columnWidths: {},
    hiddenColumns: [],
    columnOrder: [],
    filters: {},
    zoom: 1,
    scroll: { x: 0, y: 0 },
    selectedCells: [],
    selectedRows: [],
    selectedColumns: [],
    rawDataMode: false,
    showHiddenColumns: false,
    cellFormatting: {},
    lastModified: Date.now(),
    version: '1.0'
  };
}

/**
 * Mescla um estado existente com atualizações
 */
export function mergeTableState(
  currentState: TableState,
  updates: Partial<TableState>
): TableState {
  return {
    ...currentState,
    ...updates,
    lastModified: Date.now()
  };
}

export default tablePersistence;