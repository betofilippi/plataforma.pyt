import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface ColumnFilter {
  columnName: string;
  formatting?: {
    type: string;
    options?: any;
  };
  dataFilter?: {
    condition: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty';
    value?: string;
    caseSensitive?: boolean;
  };
  sorting?: {
    direction: 'asc' | 'desc' | null;
    priority?: number;
  };
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ColumnFilterControlProps {
  columnName: string;
  columnType: string;
  filter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter) => void;
  onClose?: () => void;
}

export const ColumnFilterControlSimple: React.FC<ColumnFilterControlProps> = ({
  columnName,
  columnType,
  filter,
  onFilterChange,
  onClose
}) => {
  // Versão simplificada sem hooks para testar
  return (
    <div style={{
      position: 'relative',
      display: 'inline-block'
    }}>
      <button
        style={{
          background: 'transparent',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px'
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Por enquanto, apenas mostrar que está funcionando
          console.log('Filter control clicked for column:', columnName);
        }}
      >
        <span>{columnType.toUpperCase()}</span>
        <ChevronDown size={10} />
      </button>
    </div>
  );
};