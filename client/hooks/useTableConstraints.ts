import { useState, useEffect } from 'react';

export interface ColumnConstraint {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  max_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  check_constraint?: string;
  valid_values?: string[];
}

export interface TableConstraints {
  schema: string;
  table: string;
  columns: ColumnConstraint[];
}

/**
 * Hook para carregar constraints de uma tabela
 */
export function useTableConstraints(schema: string | undefined, table: string | undefined) {
  const [constraints, setConstraints] = useState<TableConstraints | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schema || !table) {
      setConstraints(null);
      return;
    }

    const loadConstraints = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/postgres/constraints?schema=${schema}&table=${table}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load constraints: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setConstraints(data);
        } else {
          throw new Error(data.error || 'Failed to load constraints');
        }
      } catch (err: any) {
        console.error('Error loading constraints:', err);
        setError(err.message);
        setConstraints(null);
      } finally {
        setLoading(false);
      }
    };

    loadConstraints();
  }, [schema, table]);

  return { constraints, loading, error };
}

/**
 * Valida um valor contra as constraints de uma coluna
 */
export function validateColumnValue(
  value: any, 
  constraint: ColumnConstraint
): { valid: boolean; error?: string } {
  // Se permite NULL e valor é null, OK
  if (constraint.is_nullable && (value === null || value === undefined)) {
    return { valid: true };
  }

  // Se NÃO permite NULL e valor é null/vazio
  if (!constraint.is_nullable && (value === null || value === undefined || value === '')) {
    return { 
      valid: false, 
      error: `${constraint.column_name} cannot be empty` 
    };
  }

  // Se tem valores válidos definidos (ENUM ou CHECK)
  if (constraint.valid_values && constraint.valid_values.length > 0) {
    if (!constraint.valid_values.includes(value)) {
      return { 
        valid: false, 
        error: `Invalid value. Must be one of: ${constraint.valid_values.join(', ')}` 
      };
    }
  }

  // Validar tipo de dados
  const dataType = constraint.data_type?.toLowerCase();
  
  if (dataType?.includes('int') || dataType?.includes('serial')) {
    const num = Number(value);
    if (isNaN(num) || !Number.isInteger(num)) {
      return { 
        valid: false, 
        error: `Must be an integer` 
      };
    }
  }

  if (dataType?.includes('numeric') || dataType?.includes('decimal') || dataType?.includes('float')) {
    const num = Number(value);
    if (isNaN(num)) {
      return { 
        valid: false, 
        error: `Must be a number` 
      };
    }
  }

  if (dataType?.includes('bool')) {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
      return { 
        valid: false, 
        error: `Must be true or false` 
      };
    }
  }

  // Validar comprimento máximo
  if (constraint.max_length && typeof value === 'string' && value.length > constraint.max_length) {
    return { 
      valid: false, 
      error: `Maximum length is ${constraint.max_length} characters` 
    };
  }

  return { valid: true };
}

/**
 * Obtém ícone apropriado para indicar constraint
 */
export function getConstraintIcon(constraint: ColumnConstraint): string | null {
  if (constraint.is_primary_key) return '🔑';
  if (constraint.is_foreign_key) return '🔗';
  if (!constraint.is_nullable && !constraint.column_default) return '*';
  if (constraint.valid_values && constraint.valid_values.length > 0) return '📋';
  return null;
}

/**
 * Obtém tooltip para constraint
 */
export function getConstraintTooltip(constraint: ColumnConstraint): string {
  const parts: string[] = [];
  
  if (constraint.is_primary_key) parts.push('Primary Key');
  if (constraint.is_foreign_key) parts.push('Foreign Key');
  if (!constraint.is_nullable) parts.push('Required');
  if (constraint.column_default) parts.push(`Default: ${constraint.column_default}`);
  if (constraint.valid_values && constraint.valid_values.length > 0) {
    parts.push(`Values: ${constraint.valid_values.join(', ')}`);
  }
  if (constraint.max_length) parts.push(`Max length: ${constraint.max_length}`);
  
  return parts.join(' | ');
}