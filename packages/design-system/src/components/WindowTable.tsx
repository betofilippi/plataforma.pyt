import React from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';

interface Column<T> {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

interface WindowTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  glassmorphism?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: number[];
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * WindowTable - Table component with glassmorphism support
 * Segue o Design System do plataforma.app
 */
export function WindowTable<T extends Record<string, any>>({
  columns,
  data,
  className = '',
  striped = true,
  hoverable = true,
  compact = false,
  glassmorphism = true,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedRows = [],
  onSort,
  sortColumn,
  sortDirection,
}: WindowTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    
    const newDirection = 
      sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    
    onSort(column.key, newDirection);
  };

  const getCellAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  const tableClasses = glassmorphism 
    ? createGlassmorphism('subtle')
    : 'bg-white/5';

  const rowSpacing = compact ? 'px-3 py-2' : 'px-4 py-3';

  if (loading) {
    return (
      <div className={`${tableClasses} rounded-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-white/60">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${tableClasses} rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="border-b border-white/10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    ${rowSpacing} 
                    ${getCellAlignment(column.align)}
                    text-xs font-semibold text-white/90 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-white/5' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-2">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )
                        ) : (
                          <svg className="w-3 h-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-white/5">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  className="px-4 py-8 text-center text-white/40"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`
                    ${striped && rowIndex % 2 === 1 ? 'bg-white/5' : ''}
                    ${hoverable ? 'hover:bg-white/10 transition-colors' : ''}
                    ${selectedRows.includes(rowIndex) ? 'bg-purple-500/20' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        ${rowSpacing}
                        ${getCellAlignment(column.align)}
                        text-sm text-white/80
                      `}
                    >
                      {column.render 
                        ? column.render(row[column.key], row, rowIndex)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Table pagination component
interface WindowTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  className?: string;
}

export function WindowTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  className = '',
}: WindowTablePaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-white/60">
        {totalItems && pageSize && (
          <span>
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="
            px-3 py-1 rounded-md
            text-white/60 hover:text-white hover:bg-white/10
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Previous
        </button>
        
        {/* Page numbers */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="text-white/40">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`
              px-3 py-1 rounded-md transition-colors
              ${page === currentPage 
                ? 'bg-purple-600 text-white' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            `}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-white/40">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}
        
        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="
            px-3 py-1 rounded-md
            text-white/60 hover:text-white hover:bg-white/10
            disabled:opacity-30 disabled:cursor-not-allowed
            transition-colors
          "
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default WindowTable;