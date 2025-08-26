import { useState, useCallback, useRef } from 'react';
import { Selection } from '@/lib/table-editor/types';

export function useTableSelection(tableId: string) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const isSelecting = useRef(false);
  const startCell = useRef<{ row: number; col: string } | null>(null);

  // Start selection
  const startSelection = useCallback((row: number, col: string, type: 'cells' | 'rows' | 'columns' = 'cells') => {
    isSelecting.current = true;
    startCell.current = { row, col };
    
    if (type === 'rows') {
      setSelection({
        type: 'rows',
        tableId,
        rows: new Set([row])
      });
    } else if (type === 'columns') {
      setSelection({
        type: 'columns',
        tableId,
        columns: new Set([col])
      });
    } else {
      setSelection({
        type: 'cells',
        tableId,
        cells: new Set([`${row}-${col}`]),
        startCell: { row, col },
        endCell: { row, col }
      });
    }
  }, [tableId]);

  // Update selection (during drag)
  const updateSelection = useCallback((row: number, col: string) => {
    if (!isSelecting.current || !startCell.current || !selection) return;

    if (selection.type === 'cells') {
      const minRow = Math.min(startCell.current.row, row);
      const maxRow = Math.max(startCell.current.row, row);
      
      // For columns, we need to handle them properly
      const cells = new Set<string>();
      
      for (let r = minRow; r <= maxRow; r++) {
        // This is simplified - in real implementation we'd need to iterate through actual columns
        cells.add(`${r}-${col}`);
        cells.add(`${r}-${startCell.current.col}`);
      }
      
      setSelection({
        ...selection,
        cells,
        endCell: { row, col }
      });
    } else if (selection.type === 'rows') {
      const minRow = Math.min(startCell.current.row, row);
      const maxRow = Math.max(startCell.current.row, row);
      const rows = new Set<number>();
      
      for (let r = minRow; r <= maxRow; r++) {
        rows.add(r);
      }
      
      setSelection({
        ...selection,
        rows
      });
    }
  }, [selection]);

  // End selection
  const endSelection = useCallback(() => {
    isSelecting.current = false;
  }, []);

  // Add to selection (Ctrl+Click)
  const addToSelection = useCallback((row: number, col: string, type: 'cells' | 'rows' | 'columns' = 'cells') => {
    if (!selection) {
      startSelection(row, col, type);
      return;
    }

    if (type === 'cells' && selection.type === 'cells') {
      const cells = new Set(selection.cells);
      const key = `${row}-${col}`;
      
      if (cells.has(key)) {
        cells.delete(key);
      } else {
        cells.add(key);
      }
      
      setSelection({
        ...selection,
        cells
      });
    } else if (type === 'rows' && selection.type === 'rows') {
      const rows = new Set(selection.rows);
      
      if (rows.has(row)) {
        rows.delete(row);
      } else {
        rows.add(row);
      }
      
      setSelection({
        ...selection,
        rows
      });
    } else if (type === 'columns' && selection.type === 'columns') {
      const columns = new Set(selection.columns);
      
      if (columns.has(col)) {
        columns.delete(col);
      } else {
        columns.add(col);
      }
      
      setSelection({
        ...selection,
        columns
      });
    }
  }, [selection, startSelection]);

  // Select all
  const selectAll = useCallback((totalRows: number, columns: string[]) => {
    const cells = new Set<string>();
    
    for (let row = 0; row < totalRows; row++) {
      for (const col of columns) {
        cells.add(`${row}-${col}`);
      }
    }
    
    setSelection({
      type: 'all',
      tableId,
      cells
    });
  }, [tableId]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
    isSelecting.current = false;
    startCell.current = null;
  }, []);

  // Check if cell is selected
  const isCellSelected = useCallback((row: number, col: string): boolean => {
    if (!selection) return false;
    
    if (selection.type === 'all') return true;
    if (selection.type === 'rows') return selection.rows?.has(row) || false;
    if (selection.type === 'columns') return selection.columns?.has(col) || false;
    if (selection.type === 'cells') return selection.cells?.has(`${row}-${col}`) || false;
    
    return false;
  }, [selection]);

  // Get selected cells
  const getSelectedCells = useCallback((columns: string[], totalRows: number): Array<{ row: number; col: string }> => {
    const cells: Array<{ row: number; col: string }> = [];
    
    if (!selection) return cells;
    
    if (selection.type === 'all') {
      for (let row = 0; row < totalRows; row++) {
        for (const col of columns) {
          cells.push({ row, col });
        }
      }
    } else if (selection.type === 'rows' && selection.rows) {
      for (const row of selection.rows) {
        for (const col of columns) {
          cells.push({ row, col });
        }
      }
    } else if (selection.type === 'columns' && selection.columns) {
      for (let row = 0; row < totalRows; row++) {
        for (const col of selection.columns) {
          cells.push({ row, col });
        }
      }
    } else if (selection.type === 'cells' && selection.cells) {
      for (const cellKey of selection.cells) {
        const [rowStr, col] = cellKey.split('-');
        cells.push({ row: parseInt(rowStr), col });
      }
    }
    
    return cells;
  }, [selection]);

  return {
    selection,
    startSelection,
    updateSelection,
    endSelection,
    addToSelection,
    selectAll,
    clearSelection,
    isCellSelected,
    getSelectedCells,
    isSelecting: isSelecting.current
  };
}