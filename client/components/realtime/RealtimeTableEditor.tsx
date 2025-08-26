import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import useRealtime from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase';
import { WindowCard, WindowButton, WindowInput } from '@/components/ui';
import { 
  Database, 
  Table,
  RefreshCw,
  Save,
  Users,
  Wifi,
  WifiOff,
  UserCheck,
  MousePointer,
  Edit3,
  Copy,
  Clipboard,
  Undo,
  Redo,
  Loader,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface RealtimeTableEditorProps {
  initialSchema?: string;
  initialTable?: string;
  roomId?: string;
  showCollaboration?: boolean;
}

interface CellData {
  value: any;
  formula?: string;
  style?: CellStyle;
  lastModified?: Date;
  lastModifiedBy?: string;
}

interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  fontSize?: string;
  textAlign?: 'left' | 'center' | 'right';
}

interface CollaborativeCursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  cell?: string;
  color: string;
}

export function RealtimeTableEditor({ 
  initialSchema = 'public', 
  initialTable,
  roomId: propRoomId,
  showCollaboration = true 
}: RealtimeTableEditorProps) {
  // Auth and user data
  const { user, token } = useAuth();
  
  // Table data state
  const [selectedSchema, setSelectedSchema] = useState<string>(initialSchema);
  const [selectedTable, setSelectedTable] = useState<string | null>(initialTable || null);
  const [data, setData] = useState<CellData[][]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Collaboration state
  const [showCursors, setShowCursors] = useState(true);
  const [showTypingIndicators, setShowTypingIndicators] = useState(true);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number; value: string } | null>(null);
  
  // Refs
  const tableRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create room ID from schema and table
  const roomId = propRoomId || (selectedTable ? `table_${selectedSchema}_${selectedTable}` : null);

  // Initialize real-time connection
  const realtime = useRealtime({
    userId: user?.id || '',
    username: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Unknown',
    email: user?.email || '',
    token: token || '',
    roomId: roomId || undefined,
    autoConnect: !!roomId && showCollaboration
  });

  // ===== DATA LOADING =====
  
  const loadTableData = useCallback(async () => {
    if (!selectedTable) return;

    setLoading(true);
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable)
        .select('*')
        .limit(1000);

      if (error) throw error;

      if (tableData && tableData.length > 0) {
        const cols = Object.keys(tableData[0]);
        setColumns(cols);

        // Convert to CellData format
        const cellData = tableData.map((row, rowIndex) => 
          cols.map((col, colIndex) => ({
            value: row[col],
            lastModified: new Date(),
            lastModifiedBy: user?.id
          }))
        );

        setData(cellData);
      } else {
        setColumns([]);
        setData([]);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, user?.id]);

  // Load data when table changes
  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // ===== REAL-TIME COLLABORATION =====

  // Handle cursor updates
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!showCollaboration || !roomId || cursorUpdateTimeoutRef.current) return;

    const rect = tableRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find cell under cursor
    const cellElement = document.elementFromPoint(event.clientX, event.clientY);
    const cellId = cellElement?.getAttribute('data-cell-id');

    realtime.updateCursor(x, y, cellId || undefined);

    // Throttle cursor updates
    cursorUpdateTimeoutRef.current = setTimeout(() => {
      cursorUpdateTimeoutRef.current = null;
    }, 50);
  }, [showCollaboration, roomId, realtime]);

  // Handle cell updates from other users
  useEffect(() => {
    const unsubscribe = realtime.subscribe('cell_update', (cellUpdate) => {
      if (cellUpdate.userId === user?.id) return; // Ignore own updates

      const [sheetId, cellAddress] = cellUpdate.data.cellId.split(':');
      const [colLetter, rowNum] = parseCellAddress(cellAddress);
      
      if (sheetId !== `${selectedSchema}_${selectedTable}`) return;

      const rowIndex = parseInt(rowNum) - 1;
      const colIndex = columnLetterToIndex(colLetter);

      if (rowIndex >= 0 && colIndex >= 0) {
        setData(prevData => {
          const newData = [...prevData];
          if (!newData[rowIndex]) {
            newData[rowIndex] = [];
          }
          
          newData[rowIndex][colIndex] = {
            value: cellUpdate.data.value,
            formula: cellUpdate.data.formula,
            lastModified: new Date(cellUpdate.timestamp),
            lastModifiedBy: cellUpdate.userId
          };

          return newData;
        });
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [realtime, user?.id, selectedSchema, selectedTable]);

  // ===== CELL EDITING =====

  const handleCellClick = useCallback((rowIndex: number, colIndex: number) => {
    setActiveCell({ row: rowIndex, col: colIndex });

    const cellValue = data[rowIndex]?.[colIndex]?.value || '';
    setEditingCell({ row: rowIndex, col: colIndex, value: String(cellValue) });

    // Start typing indicator
    if (showCollaboration && roomId) {
      const cellId = `${columnIndexToLetter(colIndex)}${rowIndex + 1}`;
      realtime.startTyping(cellId);
    }
  }, [data, showCollaboration, roomId, realtime]);

  const handleCellValueChange = useCallback((value: string) => {
    if (!editingCell) return;

    setEditingCell(prev => prev ? { ...prev, value } : null);
    setHasUnsavedChanges(true);

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (showCollaboration && roomId) {
        const cellId = `${columnIndexToLetter(editingCell.col)}${editingCell.row + 1}`;
        realtime.stopTyping(cellId);
      }
    }, 1000);
  }, [editingCell, showCollaboration, roomId, realtime]);

  const handleCellSubmit = useCallback(async () => {
    if (!editingCell || !selectedTable) return;

    const { row, col, value } = editingCell;
    const column = columns[col];
    
    if (!column) return;

    setSaving(true);

    try {
      // Update local state optimistically
      setData(prevData => {
        const newData = [...prevData];
        if (!newData[row]) {
          newData[row] = [];
        }
        
        newData[row][col] = {
          value,
          lastModified: new Date(),
          lastModifiedBy: user?.id
        };

        return newData;
      });

      // Broadcast to other users
      if (showCollaboration && roomId) {
        const cellId = `${selectedSchema}_${selectedTable}:${columnIndexToLetter(col)}${row + 1}`;
        realtime.updateCell(
          `${selectedSchema}_${selectedTable}`,
          cellId,
          value
        );

        // Stop typing indicator
        realtime.stopTyping(cellId);
      }

      // Save to database (in real implementation, you'd want to batch these)
      // For now, we'll just update the local state

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating cell:', error);
    } finally {
      setSaving(false);
      setEditingCell(null);
    }
  }, [editingCell, selectedTable, columns, showCollaboration, roomId, realtime, user?.id, selectedSchema]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!editingCell) return;

    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        handleCellSubmit();
        break;
      case 'Escape':
        setEditingCell(null);
        if (showCollaboration && roomId) {
          const cellId = `${columnIndexToLetter(editingCell.col)}${editingCell.row + 1}`;
          realtime.stopTyping(cellId);
        }
        break;
    }
  }, [editingCell, handleCellSubmit, showCollaboration, roomId, realtime]);

  // ===== RENDER HELPERS =====

  const renderCursor = useCallback((cursor: any) => (
    <div
      key={cursor.userId}
      className="absolute pointer-events-none z-50"
      style={{
        left: cursor.cursor.x,
        top: cursor.cursor.y,
        transform: 'translate(-2px, -2px)'
      }}
    >
      <MousePointer 
        className="w-4 h-4 text-white" 
        style={{ 
          filter: `drop-shadow(0 0 2px ${cursor.status === 'online' ? '#10b981' : '#6b7280'})`,
          color: cursor.status === 'online' ? '#10b981' : '#6b7280'
        }} 
      />
      <div 
        className="absolute top-4 left-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
        style={{ backgroundColor: cursor.status === 'online' ? '#10b981' : '#6b7280' }}
      >
        {cursor.username}
      </div>
    </div>
  ), []);

  const renderCell = useCallback((cellData: CellData | undefined, rowIndex: number, colIndex: number) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
    const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
    const cellId = `${columnIndexToLetter(colIndex)}${rowIndex + 1}`;
    
    // Check if someone is typing in this cell
    const typingUser = realtime.typingUsers.find(u => u.cellId === cellId && u.userId !== user?.id);
    
    const cellStyle = {
      ...cellData?.style,
      ...(isActive && { outline: '2px solid #6366f1' }),
      ...(typingUser && { boxShadow: '0 0 0 2px #f59e0b' }),
    };

    return (
      <td
        key={`${rowIndex}-${colIndex}`}
        className="relative border border-gray-300 min-w-[100px] h-8"
        style={cellStyle}
        data-cell-id={cellId}
        onClick={() => handleCellClick(rowIndex, colIndex)}
      >
        {isEditing ? (
          <input
            ref={cellInputRef}
            className="w-full h-full px-2 bg-transparent border-none outline-none"
            value={editingCell.value}
            onChange={(e) => handleCellValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCellSubmit}
            autoFocus
          />
        ) : (
          <div className="px-2 py-1 truncate">
            {cellData?.value || ''}
          </div>
        )}
        
        {/* Typing indicator */}
        {typingUser && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}
        
        {/* Last modified indicator */}
        {cellData?.lastModifiedBy && cellData.lastModifiedBy !== user?.id && (
          <div 
            className="absolute -top-1 -left-1 w-2 h-2 bg-green-400 rounded-full"
            title={`Modified by ${cellData.lastModifiedBy}`}
          />
        )}
      </td>
    );
  }, [editingCell, activeCell, realtime.typingUsers, user?.id, handleCellClick, handleCellValueChange, handleKeyDown, handleCellSubmit]);

  // ===== MAIN RENDER =====

  if (!user) {
    return (
      <WindowCard title="Authentication Required">
        <p className="text-gray-400">Please log in to use the collaborative table editor.</p>
      </WindowCard>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-purple-400" />
          <div>
            <h1 className="text-lg font-semibold text-white">
              Realtime Table Editor
            </h1>
            <p className="text-sm text-gray-400">
              {selectedTable ? `${selectedSchema}.${selectedTable}` : 'No table selected'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Connection status */}
          <div className="flex items-center space-x-1">
            {realtime.isConnected ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs ${realtime.isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {realtime.connectionStatus}
            </span>
          </div>

          {/* Online users count */}
          {showCollaboration && (
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-blue-400">
                {realtime.onlineCount}
              </span>
            </div>
          )}

          {/* Collaboration controls */}
          {showCollaboration && (
            <>
              <WindowButton
                variant="secondary"
                size="sm"
                icon={showCursors ? <Eye /> : <EyeOff />}
                onClick={() => setShowCursors(!showCursors)}
                title="Toggle cursor visibility"
              >
                Cursors
              </WindowButton>
              
              <WindowButton
                variant="secondary"
                size="sm"
                icon={showTypingIndicators ? <Eye /> : <EyeOff />}
                onClick={() => setShowTypingIndicators(!showTypingIndicators)}
                title="Toggle typing indicators"
              >
                Typing
              </WindowButton>
            </>
          )}

          {/* Save button */}
          <WindowButton
            variant={hasUnsavedChanges ? "primary" : "secondary"}
            size="sm"
            icon={saving ? <Loader className="animate-spin" /> : <Save />}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Saving...' : 'Save'}
          </WindowButton>

          {/* Refresh button */}
          <WindowButton
            variant="secondary"
            size="sm"
            icon={loading ? <Loader className="animate-spin" /> : <RefreshCw />}
            onClick={loadTableData}
            disabled={loading}
          >
            Refresh
          </WindowButton>
        </div>
      </div>

      {/* Online users list */}
      {showCollaboration && realtime.users.length > 0 && (
        <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-300">Online:</span>
            {realtime.users.map((user, index) => (
              <div key={user.userId} className="flex items-center space-x-1">
                <UserCheck className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{user.username}</span>
                {index < realtime.users.length - 1 && <span className="text-gray-500">•</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table content */}
      <div 
        className="flex-1 overflow-auto relative"
        ref={tableRef}
        onMouseMove={handleMouseMove}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <table className="w-full border-collapse">
            {/* Header */}
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="w-8 h-8 border border-gray-300 bg-gray-200">#</th>
                {columns.map((col, index) => (
                  <th 
                    key={col} 
                    className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-900"
                  >
                    <div className="flex items-center justify-between">
                      <span>{col}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {columnIndexToLetter(index)}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="w-8 h-8 border border-gray-300 bg-gray-100 text-center text-sm font-medium text-gray-600">
                    {rowIndex + 1}
                  </td>
                  {columns.map((_, colIndex) => 
                    renderCell(row[colIndex], rowIndex, colIndex)
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Collaborative cursors */}
        {showCollaboration && showCursors && realtime.otherCursors.map(renderCursor)}
      </div>
    </div>
  );
}

// ===== UTILITY FUNCTIONS =====

function columnIndexToLetter(index: number): string {
  let result = '';
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26) - 1;
  }
  return result;
}

function columnLetterToIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 64);
  }
  return result - 1;
}

function parseCellAddress(address: string): [string, string] {
  const match = address.match(/^([A-Z]+)(\d+)$/);
  return match ? [match[1], match[2]] : ['A', '1'];
}

export default RealtimeTableEditor;