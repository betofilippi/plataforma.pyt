import React, { CSSProperties, memo } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { Edit2 } from 'lucide-react';
import { CellRenderer } from '@/components/TableEditor/CellRenderer';
import type { ColumnFilter } from '@/components/TableEditor/ColumnFilterControl';

interface VirtualizedTableBodyProps {
  data: any[];
  columns: any[];
  tableId: string;
  width: number;
  height: number;
  rowHeight: number;
  columnWidths: Map<string, number>;
  selectedCells: Set<string>;
  editingCell?: { row: number; col: string };
  metadata?: any; // Metadados de type hints
  columnFilters?: Map<string, ColumnFilter>; // Filtros de coluna
  onCellEdit: (tableId: string, row: number, col: string, value: any, isDelete?: boolean) => void;
  onCellClick: (tableId: string, row: number, col: string, e: React.MouseEvent) => void;
  onCellDoubleClick: (tableId: string, row: number, col: string) => void;
  getCellContent: (row: any, col: any) => React.ReactNode;
  getCellStyle: (row: number, col: string) => CSSProperties;
}

// Componente de célula memoizado para performance
const Cell = memo(({ 
  columnIndex, 
  rowIndex, 
  style,
  data 
}: GridChildComponentProps<any>) => {
  const {
    rows,
    columns,
    tableId,
    selectedCells,
    editingCell,
    metadata,
    columnFilters,
    onCellEdit,
    onCellClick,
    onCellDoubleClick,
    getCellContent,
    getCellStyle,
    columnWidths
  } = data;

  // Primeira coluna é o número da linha
  if (columnIndex === 0) {
    const isSelected = selectedCells.has(`${tableId}_${rowIndex}`);
    return (
      <div
        style={{
          ...style,
          width: '20px',
          minWidth: '20px',
          maxWidth: '20px',
          backgroundColor: isSelected ? '#0070f3' : '#606060',
          color: '#FFFFFF',
          borderRight: '1px solid #505050',
          borderBottom: '1px solid #505050',
          textAlign: 'center',
          fontSize: '9px',
          fontWeight: 'normal',
          fontFamily: 'Calibri, Arial, sans-serif',
          padding: '2px',
          userSelect: 'none',
          cursor: 'pointer',
          position: 'sticky',
          left: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {rowIndex + 1}
      </div>
    );
  }

  // Ajustar índice para colunas de dados (pular coluna de número)
  const dataColumnIndex = columnIndex - 1;
  const column = columns[dataColumnIndex];
  
  if (!column) return null;

  const row = rows[rowIndex] || {};
  const cellKey = `${tableId}_${rowIndex}_${column.column_name}`;
  const isSelected = selectedCells.has(cellKey);
  const isEditing = editingCell?.row === rowIndex && editingCell?.col === column.column_name;
  const cellValue = row[column.column_name];

  // Calcular largura da coluna
  const columnWidth = columnWidths.get(column.column_name) || 200;

  // Estilo base da célula (mantendo visual Excel)
  const cellStyle: CSSProperties = {
    ...style,
    left: columnIndex === 0 ? 0 : (style.left as number) + 20, // Ajustar para coluna de número
    width: columnWidth,
    backgroundColor: isSelected ? 'rgba(0, 112, 243, 0.1)' : '#FFFFFF',
    borderRight: '1px solid #c0c0c0',
    borderBottom: '1px solid #d0d0d0',
    padding: '4px 8px',
    fontSize: '14px',
    fontFamily: 'Calibri, Arial, sans-serif',
    color: '#000000',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    cursor: 'cell',
    userSelect: 'none',
    ...getCellStyle(rowIndex, column.column_name)
  };

  // Se está editando, renderizar input
  if (isEditing) {
    return (
      <div style={cellStyle}>
        <input
          type="text"
          defaultValue={cellValue || ''}
          autoFocus
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            outline: '2px solid #0070f3',
            padding: '2px',
            fontSize: '14px',
            fontFamily: 'Calibri, Arial, sans-serif',
            backgroundColor: '#FFFFFF'
          }}
          onBlur={(e) => {
            const newValue = e.target.value;
            onCellEdit(tableId, rowIndex, column.column_name, newValue === '' ? null : newValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newValue = e.currentTarget.value;
              onCellEdit(tableId, rowIndex, column.column_name, newValue === '' ? null : newValue);
              // Sair do modo de edição será tratado no componente pai
            } else if (e.key === 'Escape') {
              // Cancelar edição será tratado no componente pai
            }
          }}
        />
      </div>
    );
  }

  // Renderizar conteúdo da célula
  // Usar filtros de coluna para formatação
  const renderCellContent = () => {
    
    const columnFilter = columnFilters?.get(column.column_name);
    
    // Se tem filtro de formatação ativo, usar CellRenderer
    if (columnFilter?.formatting) {
      return (
        <CellRenderer
          value={cellValue}
          metadata={{
            typeHint: columnFilter.formatting.type,
            formatOptions: columnFilter.formatting.options || {}
          }}
        />
      );
    }
    
    // Se tem metadados salvos no banco (fallback)
    if (metadata && metadata[column.column_name]) {
      return (
        <CellRenderer
          value={cellValue}
          metadata={metadata[column.column_name]}
        />
      );
    }
    
    // Renderização padrão
    return cellValue || '';
  };

  return (
    <div
      style={cellStyle}
      onClick={(e) => onCellClick(tableId, rowIndex, column.column_name, e)}
      onDoubleClick={() => onCellDoubleClick(tableId, rowIndex, column.column_name)}
      data-table-cell="true"
      data-table-id={tableId}
      data-row={rowIndex}
      data-col={column.column_name}
    >
      {renderCellContent()}
    </div>
  );
});

Cell.displayName = 'VirtualizedCell';

const VirtualizedTableBody: React.FC<VirtualizedTableBodyProps> = ({
  data,
  columns,
  tableId,
  width,
  height,
  rowHeight = 32,
  columnWidths,
  selectedCells,
  editingCell,
  metadata,
  columnFilters,
  onCellEdit,
  onCellClick,
  onCellDoubleClick,
  getCellContent,
  getCellStyle
}) => {
  
  // VERIFICAR: Dados já vêm filtrados e ordenados do pai
  console.log('🎯 [VIRTUALIZED] Received data:', data.length, 'rows');
  console.log('🎯 [VIRTUALIZED] Active filters:', Array.from(columnFilters?.entries() || []));
  
  // Adicionar linhas vazias extras (20 como definido)
  const EMPTY_ROWS = 20;
  const allRows = [...data, ...Array(EMPTY_ROWS).fill({})];

  // Calcular largura de cada coluna
  const getColumnWidth = (index: number) => {
    if (index === 0) return 20; // Coluna de número de linha
    const column = columns[index - 1];
    return columnWidths.get(column?.column_name) || 200;
  };

  // Calcular largura total
  const totalWidth = columns.reduce((sum, col) => 
    sum + (columnWidths.get(col.column_name) || 200), 20 // +20 para coluna de número
  );

  return (
    <Grid
      key={`grid-${tableId}`}
      columnCount={columns.length + 1} // +1 para coluna de número de linha
      columnWidth={getColumnWidth}
      height={height}
      rowCount={allRows.length}
      rowHeight={() => rowHeight}
      width={Math.min(width, totalWidth)}
      itemData={{
        rows: allRows,
        columns,
        tableId,
        selectedCells,
        editingCell,
        metadata,
        columnFilters,
        onCellEdit,
        onCellClick,
        onCellDoubleClick,
        getCellContent,
        getCellStyle,
        columnWidths
      }}
      style={{
        backgroundColor: 'transparent',
        overflowX: 'auto',
        overflowY: 'auto'
      }}
    >
      {Cell}
    </Grid>
  );
};

export default memo(VirtualizedTableBody);