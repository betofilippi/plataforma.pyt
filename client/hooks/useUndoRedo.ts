import { useState, useCallback } from 'react';
import { UndoRedoAction } from '@/lib/table-editor/types';

const MAX_HISTORY = 50;

export function useUndoRedo() {
  const [history, setHistory] = useState<UndoRedoAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Add action to history
  const addAction = useCallback((action: UndoRedoAction) => {
    setHistory(prev => {
      // Remove any actions after current index
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new action
      newHistory.push(action);
      
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentIndex]);

  // Undo
  const undo = useCallback(() => {
    if (currentIndex < 0) return false;
    
    const action = history[currentIndex];
    if (action) {
      action.undo();
      setCurrentIndex(prev => prev - 1);
      return true;
    }
    
    return false;
  }, [history, currentIndex]);

  // Redo
  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return false;
    
    const nextIndex = currentIndex + 1;
    const action = history[nextIndex];
    if (action) {
      action.redo();
      setCurrentIndex(nextIndex);
      return true;
    }
    
    return false;
  }, [history, currentIndex]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  // Create action for cell edit
  const createCellEditAction = useCallback((
    tableId: string,
    row: number,
    col: string,
    oldValue: any,
    newValue: any,
    applyChange: (value: any) => void
  ): UndoRedoAction => {
    return {
      type: 'cell-edit',
      tableId,
      timestamp: Date.now(),
      data: { row, col, oldValue, newValue },
      undo: () => applyChange(oldValue),
      redo: () => applyChange(newValue)
    };
  }, []);

  // Create action for format change
  const createFormatAction = useCallback((
    tableId: string,
    cells: Array<{ row: number; col: string }>,
    oldFormats: Map<string, any>,
    newFormats: Map<string, any>,
    applyFormats: (formats: Map<string, any>) => void
  ): UndoRedoAction => {
    return {
      type: 'format',
      tableId,
      timestamp: Date.now(),
      data: { cells, oldFormats, newFormats },
      undo: () => applyFormats(oldFormats),
      redo: () => applyFormats(newFormats)
    };
  }, []);

  return {
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < history.length - 1,
    undo,
    redo,
    addAction,
    clearHistory,
    createCellEditAction,
    createFormatAction,
    historyLength: history.length,
    currentIndex
  };
}