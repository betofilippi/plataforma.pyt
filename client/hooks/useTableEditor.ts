import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, useSchema } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { formulaEngine } from '@/lib/table-editor/formula-engine';

interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  is_primary?: boolean;
  is_foreign?: boolean;
}

interface CellChange {
  row: number;
  col: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface UseTableEditorOptions {
  schema: string;
  table: string;
  pageSize?: number;
  debounceMs?: number;
}

export function useTableEditor({
  schema,
  table,
  pageSize = 1000,
  debounceMs = 500
}: UseTableEditorOptions) {
  const [columns, setColumns] = useState<TableColumn[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, any>>(new Map());
  const [undoStack, setUndoStack] = useState<CellChange[]>([]);
  const [redoStack, setRedoStack] = useState<CellChange[]>([]);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const schemaClient = useSchema(schema);

  // Load table structure and data
  const loadTable = useCallback(async () => {
    if (!schema || !table) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get columns
      const { data: columnsData, error: columnsError } = await schemaClient
        .from('information_schema.columns')
        .select('*')
        .eq('table_schema', schema)
        .eq('table_name', table)
        .order('ordinal_position');
      
      if (columnsError) throw columnsError;
      
      // Get primary keys
      const { data: primaryKeys } = await schemaClient
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_schema', schema)
        .eq('table_name', table)
        .eq('constraint_type', 'PRIMARY KEY');
      
      // Get foreign keys
      const { data: foreignKeys } = await schemaClient
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_schema', schema)
        .eq('table_name', table)
        .eq('constraint_type', 'FOREIGN KEY');
      
      // Process columns
      const processedColumns = (columnsData || []).map((col: any) => ({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        column_default: col.column_default,
        is_primary: primaryKeys?.some(pk => pk.constraint_name.includes(col.column_name)),
        is_foreign: foreignKeys?.some(fk => fk.constraint_name.includes(col.column_name))
      }));
      
      setColumns(processedColumns);
      
      // Get table data
      const { data: tableData, error: dataError } = await schemaClient
        .from(table)
        .select('*')
        .limit(pageSize);
      
      if (dataError) throw dataError;
      
      setData(tableData || []);
      
      // Initialize formula engine with data
      tableData?.forEach((row: any, rowIndex: number) => {
        Object.entries(row).forEach(([col, value]) => {
          const cell = `${col.toUpperCase()}${rowIndex + 1}`;
          formulaEngine.setCellValue(cell, value);
        });
      });
      
    } catch (err) {
      console.error('Error loading table:', err);
      setError(err instanceof Error ? err.message : 'Failed to load table');
    } finally {
      setLoading(false);
    }
  }, [schema, table, schemaClient, pageSize]);

  // Setup realtime subscription
  const setupRealtime = useCallback(() => {
    if (!schema || !table) return;
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    
    // Create new channel
    const channel = supabase
      .channel(`table-${schema}-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: schema,
          table: table
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          // Update local data based on the change
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(row => 
              row.id === payload.new.id ? payload.new : row
            ));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(row => row.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;
  }, [schema, table]);

  // Save cell value
  const saveCellValue = useCallback(async (
    rowIndex: number,
    columnName: string,
    value: any
  ) => {
    const row = data[rowIndex];
    if (!row) return;
    
    // Find primary key column
    const pkColumn = columns.find(col => col.is_primary);
    if (!pkColumn) {
      setError('No primary key found for table');
      return;
    }
    
    const pkValue = row[pkColumn.column_name];
    
    try {
      setSaving(true);
      
      const { error: updateError } = await schemaClient
        .from(table)
        .update({ [columnName]: value })
        .eq(pkColumn.column_name, pkValue);
      
      if (updateError) throw updateError;
      
      // Update local data
      setData(prev => {
        const newData = [...prev];
        newData[rowIndex] = { ...newData[rowIndex], [columnName]: value };
        return newData;
      });
      
      // Clear from unsaved changes
      const changeKey = `${rowIndex}-${columnName}`;
      setUnsavedChanges(prev => {
        const newChanges = new Map(prev);
        newChanges.delete(changeKey);
        return newChanges;
      });
      
    } catch (err) {
      console.error('Error saving cell:', err);
      setError(err instanceof Error ? err.message : 'Failed to save cell');
    } finally {
      setSaving(false);
    }
  }, [data, columns, table, schemaClient]);

  // Debounced save
  const debouncedSave = useCallback((
    rowIndex: number,
    columnName: string,
    value: any
  ) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Mark as unsaved
    const changeKey = `${rowIndex}-${columnName}`;
    setUnsavedChanges(prev => new Map(prev).set(changeKey, { rowIndex, columnName, value }));
    
    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveCellValue(rowIndex, columnName, value);
    }, debounceMs);
  }, [saveCellValue, debounceMs]);

  // Handle cell change
  const handleCellChange = useCallback((
    rowIndex: number,
    columnName: string,
    oldValue: any,
    newValue: any
  ) => {
    // Add to undo stack
    setUndoStack(prev => [...prev, {
      row: rowIndex,
      col: columnName,
      oldValue,
      newValue,
      timestamp: Date.now()
    }]);
    
    // Clear redo stack
    setRedoStack([]);
    
    // Update formula engine
    const cell = `${columnName.toUpperCase()}${rowIndex + 1}`;
    formulaEngine.setCellValue(cell, newValue);
    
    // If it's a formula, recalculate dependents
    if (typeof newValue === 'string' && newValue.startsWith('=')) {
      const results = formulaEngine.recalculateAll();
      // Update affected cells in the grid
      results.forEach((value, cellRef) => {
        // Parse cell reference and update grid
        // This would need to be connected to AG-Grid API
      });
    }
    
    // Save to database
    debouncedSave(rowIndex, columnName, newValue);
  }, [debouncedSave]);

  // Undo operation
  const undo = useCallback(() => {
    const lastChange = undoStack[undoStack.length - 1];
    if (!lastChange) return;
    
    // Remove from undo stack
    setUndoStack(prev => prev.slice(0, -1));
    
    // Add to redo stack
    setRedoStack(prev => [...prev, lastChange]);
    
    // Revert the change
    handleCellChange(
      lastChange.row,
      lastChange.col,
      lastChange.newValue,
      lastChange.oldValue
    );
  }, [undoStack, handleCellChange]);

  // Redo operation
  const redo = useCallback(() => {
    const lastRedo = redoStack[redoStack.length - 1];
    if (!lastRedo) return;
    
    // Remove from redo stack
    setRedoStack(prev => prev.slice(0, -1));
    
    // Add to undo stack
    setUndoStack(prev => [...prev, lastRedo]);
    
    // Reapply the change
    handleCellChange(
      lastRedo.row,
      lastRedo.col,
      lastRedo.oldValue,
      lastRedo.newValue
    );
  }, [redoStack, handleCellChange]);

  // Save all unsaved changes
  const saveAll = useCallback(async () => {
    if (unsavedChanges.size === 0) return;
    
    setSaving(true);
    
    try {
      const promises = Array.from(unsavedChanges.values()).map(change =>
        saveCellValue(change.rowIndex, change.columnName, change.value)
      );
      
      await Promise.all(promises);
      setUnsavedChanges(new Map());
    } catch (err) {
      console.error('Error saving all changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [unsavedChanges, saveCellValue]);

  // Effects
  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    setupRealtime();
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [setupRealtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    columns,
    data,
    loading,
    error,
    saving,
    unsavedChanges: unsavedChanges.size,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    handleCellChange,
    undo,
    redo,
    saveAll,
    refresh: loadTable
  };
}