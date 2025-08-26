/**
 * PersistentTable - Wrapper que adiciona persistência de estado a uma tabela
 * 
 * Este componente envolve a lógica de renderização da tabela e adiciona
 * persistência automática de estado (posição, tamanho, filtros, etc.)
 */

import React, { useCallback, useEffect } from 'react';
import useTableStatePersistence from '@/lib/table-editor/useTableStatePersistence';
import { ColumnFilter } from '@/components/TableEditor/ColumnFilterControl';
import { TableState } from '@/lib/table-state-persistence';

export interface OpenTable {
  id: string;
  name: string;
  schema: string;
  data: any[];
  columns: any[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMaximized?: boolean;
  isMinimized?: boolean;
  zIndex: number;
  columnWidths?: Map<string, number>;
  editingCell?: { row: number; col: string };
}

interface PersistentTableProps {
  table: OpenTable;
  columnFilters: Map<string, Map<string, ColumnFilter>>;
  rawDataMode: Map<string, boolean>;
  selectedCells: Set<string>;
  selectedRows: Set<string>;
  selectedColumns: Set<string>;
  cellFormatting: Map<string, any>;
  zoom: number;
  
  // Callbacks para atualizar estado
  onUpdateTable: (tableId: string, updates: Partial<OpenTable>) => void;
  onUpdateColumnFilters: (tableId: string, filters: Map<string, ColumnFilter>) => void;
  onUpdateRawDataMode: (tableId: string, rawMode: boolean) => void;
  
  // Função para renderizar conteúdo da tabela
  children: (table: OpenTable) => React.ReactNode;
}

export const PersistentTable: React.FC<PersistentTableProps> = ({
  table,
  columnFilters,
  rawDataMode,
  selectedCells,
  selectedRows,
  selectedColumns,
  cellFormatting,
  zoom,
  onUpdateTable,
  onUpdateColumnFilters,
  onUpdateRawDataMode,
  children
}) => {
  
  // Converter estados para formato compatível com persistência
  const currentFilters: Record<string, ColumnFilter> = {};
  const tableFilters = columnFilters.get(table.id);
  if (tableFilters) {
    Array.from(tableFilters.entries()).forEach(([colName, filter]) => {
      currentFilters[colName] = filter;
    });
  }
  
  const currentColumnWidths: Record<string, number> = {};
  if (table.columnWidths) {
    Array.from(table.columnWidths.entries()).forEach(([colName, width]) => {
      currentColumnWidths[colName] = width;
    });
  }
  
  const currentCellFormatting: Record<string, any> = {};
  Array.from(cellFormatting.entries()).forEach(([key, format]) => {
    if (key.startsWith(`${table.id}_`)) {
      currentCellFormatting[key] = format;
    }
  });
  
  // Filtrar células, linhas e colunas desta tabela
  const currentSelectedCells = Array.from(selectedCells).filter(cellKey => 
    cellKey.startsWith(`${table.id}_`)
  );
  const currentSelectedRows = Array.from(selectedRows).filter(rowKey => 
    rowKey.startsWith(`${table.id}_`)
  );
  const currentSelectedColumns = Array.from(selectedColumns).filter(colKey => 
    colKey.startsWith(`${table.id}_`)
  );
  
  // =====================================================
  // CALLBACKS DE RESTAURAÇÃO
  // =====================================================
  
  const handleStateRestored = useCallback((state: TableState) => {
    console.log('🔄 Aplicando estado restaurado para:', table.name);
    
    // Aplicar posição e tamanho
    onUpdateTable(table.id, {
      position: state.position,
      size: state.size,
      isMaximized: state.isMaximized
    });
    
    // Aplicar larguras das colunas
    if (Object.keys(state.columnWidths).length > 0) {
      const columnWidths = new Map<string, number>();
      Object.entries(state.columnWidths).forEach(([colName, width]) => {
        columnWidths.set(colName, width);
      });
      onUpdateTable(table.id, { columnWidths });
    }
    
    // Aplicar filtros
    if (Object.keys(state.filters).length > 0) {
      const filters = new Map<string, ColumnFilter>();
      Object.entries(state.filters).forEach(([colName, filter]) => {
        filters.set(colName, filter);
      });
      onUpdateColumnFilters(table.id, filters);
    }
    
    // Aplicar modo raw data
    if (state.rawDataMode) {
      onUpdateRawDataMode(table.id, state.rawDataMode);
    }
    
    console.log('✅ Estado restaurado aplicado');
  }, [table.id, table.name, onUpdateTable, onUpdateColumnFilters, onUpdateRawDataMode]);
  
  const handlePositionChange = useCallback((position: { x: number; y: number }) => {
    onUpdateTable(table.id, { position });
  }, [table.id, onUpdateTable]);
  
  const handleSizeChange = useCallback((size: { width: number; height: number }) => {
    onUpdateTable(table.id, { size });
  }, [table.id, onUpdateTable]);
  
  const handleColumnWidthsChange = useCallback((widths: Record<string, number>) => {
    const columnWidths = new Map<string, number>();
    Object.entries(widths).forEach(([colName, width]) => {
      columnWidths.set(colName, width);
    });
    onUpdateTable(table.id, { columnWidths });
  }, [table.id, onUpdateTable]);
  
  const handleFiltersChange = useCallback((filters: Record<string, ColumnFilter>) => {
    const filterMap = new Map<string, ColumnFilter>();
    Object.entries(filters).forEach(([colName, filter]) => {
      filterMap.set(colName, filter);
    });
    onUpdateColumnFilters(table.id, filterMap);
  }, [table.id, onUpdateColumnFilters]);
  
  // =====================================================
  // HOOK DE PERSISTÊNCIA
  // =====================================================
  
  const { isStateRestored, saveStateImmediately } = useTableStatePersistence({
    tableId: table.id,
    schemaName: table.schema,
    tableName: table.name,
    position: table.position,
    size: table.size,
    columnWidths: currentColumnWidths,
    filters: currentFilters,
    zoom,
    selectedCells: currentSelectedCells,
    selectedRows: currentSelectedRows,
    selectedColumns: currentSelectedColumns,
    editingCell: table.editingCell,
    rawDataMode: rawDataMode.get(table.id) || false,
    cellFormatting: currentCellFormatting,
    
    onStateRestored: handleStateRestored,
    onPositionChange: handlePositionChange,
    onSizeChange: handleSizeChange,
    onColumnWidthsChange: handleColumnWidthsChange,
    onFiltersChange: handleFiltersChange
  });
  
  // =====================================================
  // SALVAMENTO FORÇADO AO FECHAR
  // =====================================================
  
  useEffect(() => {
    // Salvar estado quando tabela é fechada/desmontada
    return () => {
      console.log('💾 Salvando estado final da tabela:', table.name);
      saveStateImmediately();
    };
  }, [saveStateImmediately, table.name]);
  
  // =====================================================
  // RENDER
  // =====================================================
  
  return <>{children(table)}</>;
};

export default PersistentTable;