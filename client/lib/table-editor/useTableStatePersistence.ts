/**
 * Hook useTableStatePersistence
 * 
 * Integra automaticamente a persistência de estado com componentes de tabela.
 * Salva automaticamente mudanças e restaura estado ao montar.
 */

import { useEffect, useCallback, useRef } from 'react';
import { tablePersistence, type TableState, createInitialTableState, mergeTableState } from '@/lib/table-state-persistence';
import { ColumnFilter } from '@/components/TableEditor/ColumnFilterControl';

export interface UseTableStatePersistenceProps {
  tableId: string;
  schemaName: string;
  tableName: string;
  
  // Estado atual da tabela
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  columnWidths?: Record<string, number>;
  hiddenColumns?: string[];
  filters?: Record<string, ColumnFilter>;
  zoom?: number;
  scroll?: { x: number; y: number };
  selectedCells?: string[];
  selectedRows?: string[];
  selectedColumns?: string[];
  editingCell?: { row: number; col: string };
  rawDataMode?: boolean;
  cellFormatting?: Record<string, any>;
  
  // Callbacks para aplicar estado restaurado
  onStateRestored?: (state: TableState) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onColumnWidthsChange?: (widths: Record<string, number>) => void;
  onFiltersChange?: (filters: Record<string, ColumnFilter>) => void;
  onZoomChange?: (zoom: number) => void;
  onScrollChange?: (scroll: { x: number; y: number }) => void;
}

export function useTableStatePersistence(props: UseTableStatePersistenceProps) {
  const {
    tableId,
    schemaName,
    tableName,
    position,
    size,
    columnWidths = {},
    hiddenColumns = [],
    filters = {},
    zoom = 1,
    scroll = { x: 0, y: 0 },
    selectedCells = [],
    selectedRows = [],
    selectedColumns = [],
    editingCell,
    rawDataMode = false,
    cellFormatting = {},
    onStateRestored,
    onPositionChange,
    onSizeChange,
    onColumnWidthsChange,
    onFiltersChange,
    onZoomChange,
    onScrollChange
  } = props;
  
  const stateRestoredRef = useRef(false);
  const initialStateCreatedRef = useRef(false);
  
  // =====================================================
  // RESTAURAÇÃO DE ESTADO (apenas uma vez)
  // =====================================================
  
  useEffect(() => {
    if (stateRestoredRef.current) return;
    
    const savedState = tablePersistence.loadTableState(schemaName, tableName);
    
    if (savedState) {
      console.log('🔄 Restaurando estado da tabela:', `${schemaName}.${tableName}`);
      
      // Aplicar estado restaurado através dos callbacks
      if (onPositionChange && savedState.position) {
        onPositionChange(savedState.position);
      }
      
      if (onSizeChange && savedState.size) {
        onSizeChange(savedState.size);
      }
      
      if (onColumnWidthsChange && Object.keys(savedState.columnWidths).length > 0) {
        onColumnWidthsChange(savedState.columnWidths);
      }
      
      if (onFiltersChange && Object.keys(savedState.filters).length > 0) {
        onFiltersChange(savedState.filters);
      }
      
      if (onZoomChange && savedState.zoom !== 1) {
        onZoomChange(savedState.zoom);
      }
      
      if (onScrollChange && (savedState.scroll.x !== 0 || savedState.scroll.y !== 0)) {
        onScrollChange(savedState.scroll);
      }
      
      // Callback geral para estado restaurado
      if (onStateRestored) {
        onStateRestored(savedState);
      }
      
      console.log('✅ Estado restaurado com sucesso');
    } else {
      console.log('📋 Criando estado inicial para:', `${schemaName}.${tableName}`);
    }
    
    stateRestoredRef.current = true;
  }, [schemaName, tableName]); // Executar apenas quando schema/table mudarem
  
  // =====================================================
  // SALVAMENTO AUTOMÁTICO
  // =====================================================
  
  const saveCurrentState = useCallback(() => {
    // Não salvar se ainda não restaurou o estado (evita sobrescrever)
    if (!stateRestoredRef.current) return;
    
    const currentState: TableState = {
      tableId,
      schemaName,
      tableName,
      position: position || { x: 100, y: 100 },
      size: size || { width: 800, height: 600 },
      columnWidths,
      hiddenColumns,
      columnOrder: [], // TODO: implementar ordem das colunas
      filters,
      zoom,
      scroll,
      selectedCells,
      selectedRows,
      selectedColumns,
      editingCell,
      rawDataMode,
      showHiddenColumns: false, // TODO: implementar
      cellFormatting,
      lastModified: Date.now(),
      version: '1.0'
    };
    
    tablePersistence.saveTableState(currentState);
  }, [
    tableId,
    schemaName,
    tableName,
    position,
    size,
    columnWidths,
    hiddenColumns,
    filters,
    zoom,
    scroll,
    selectedCells,
    selectedRows,
    selectedColumns,
    editingCell,
    rawDataMode,
    cellFormatting
  ]);
  
  // Auto-save quando qualquer propriedade muda
  useEffect(() => {
    saveCurrentState();
  }, [saveCurrentState]);
  
  // =====================================================
  // SALVAMENTO MANUAL E LIMPEZA
  // =====================================================
  
  const saveStateImmediately = useCallback(() => {
    const currentState: TableState = {
      tableId,
      schemaName,
      tableName,
      position: position || { x: 100, y: 100 },
      size: size || { width: 800, height: 600 },
      columnWidths,
      hiddenColumns,
      columnOrder: [],
      filters,
      zoom,
      scroll,
      selectedCells,
      selectedRows,
      selectedColumns,
      editingCell,
      rawDataMode,
      showHiddenColumns: false,
      cellFormatting,
      lastModified: Date.now(),
      version: '1.0'
    };
    
    tablePersistence.saveTableStateImmediate(currentState);
  }, [
    tableId,
    schemaName,
    tableName,
    position,
    size,
    columnWidths,
    hiddenColumns,
    filters,
    zoom,
    scroll,
    selectedCells,
    selectedRows,
    selectedColumns,
    editingCell,
    rawDataMode,
    cellFormatting
  ]);
  
  const clearSavedState = useCallback(() => {
    tablePersistence.removeTableState(schemaName, tableName);
  }, [schemaName, tableName]);
  
  const getSavedState = useCallback(() => {
    return tablePersistence.loadTableState(schemaName, tableName);
  }, [schemaName, tableName]);
  
  // =====================================================
  // LIMPEZA AO DESMONTAR
  // =====================================================
  
  useEffect(() => {
    // Salvar estado final ao desmontar
    return () => {
      saveStateImmediately();
    };
  }, [saveStateImmediately]);
  
  // =====================================================
  // RETORNO
  // =====================================================
  
  return {
    // Estado de controle
    isStateRestored: stateRestoredRef.current,
    
    // Funções de controle
    saveStateImmediately,
    clearSavedState,
    getSavedState,
    
    // Função para forçar salvamento
    forceSave: saveCurrentState
  };
}

export default useTableStatePersistence;