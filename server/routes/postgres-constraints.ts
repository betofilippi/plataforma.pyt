import { Request, Response } from 'express';
import { Pool } from 'pg';

// Reutilizar pool do postgres-direct
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

/**
 * Detecta constraints de uma tabela (CHECK, NOT NULL, DEFAULT, etc)
 */
export async function getTableConstraints(req: Request, res: Response) {
  try {
    const { schema, table } = req.query;
    
    if (!schema || !table) {
      return res.status(400).json({ error: 'Schema and table are required' });
    }

    // Query para buscar informações detalhadas das colunas
    const columnsQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        -- Detectar se é primary key
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_primary_key,
        -- Detectar se é foreign key
        CASE 
          WHEN fk.column_name IS NOT NULL THEN true 
          ELSE false 
        END as is_foreign_key,
        -- Buscar check constraints
        check_constraints.check_clause,
        -- Buscar valores de ENUM se for tipo ENUM
        enum_values.enum_values
      FROM information_schema.columns c
      -- Join para primary keys
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      -- Join para foreign keys
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2
          AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      -- Join para check constraints
      LEFT JOIN LATERAL (
        SELECT string_agg(pg_get_constraintdef(con.oid), '; ') as check_clause
        FROM pg_constraint con
        JOIN pg_namespace nsp ON nsp.oid = con.connamespace
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = cls.oid
        WHERE nsp.nspname = $1
          AND cls.relname = $2
          AND att.attname = c.column_name
          AND con.contype = 'c'
          AND array_position(con.conkey, att.attnum) IS NOT NULL
      ) check_constraints ON true
      -- Join para valores de ENUM
      LEFT JOIN LATERAL (
        SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = $1
          AND t.typname = (
            SELECT udt_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 
              AND table_name = $2 
              AND column_name = c.column_name
          )
      ) enum_values ON true
      WHERE c.table_schema = $1 
        AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `;

    const result = await pool.query(columnsQuery, [schema, table]);
    
    // Processar resultados para extrair valores válidos de check constraints
    const columns = result.rows.map(col => {
      const constraint: any = {
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable === 'YES',
        column_default: col.column_default,
        is_primary_key: col.is_primary_key,
        is_foreign_key: col.is_foreign_key,
        max_length: col.character_maximum_length,
        numeric_precision: col.numeric_precision,
        numeric_scale: col.numeric_scale
      };

      // Se tem check constraint, tentar extrair valores válidos
      if (col.check_clause) {
        constraint.check_constraint = col.check_clause;
        
        // Tentar extrair valores de CHECK IN (...)
        const inMatch = col.check_clause.match(/IN\s*\((.*?)\)/i);
        if (inMatch) {
          const valuesStr = inMatch[1];
          constraint.valid_values = valuesStr
            .split(',')
            .map((v: string) => v.trim().replace(/^'|'$/g, ''))
            .filter((v: string) => v.length > 0);
        }
        
        // Tentar extrair valores de = ANY(ARRAY[...])
        const anyMatch = col.check_clause.match(/ANY\s*\(ARRAY\[(.*?)\]/i);
        if (anyMatch) {
          const valuesStr = anyMatch[1];
          constraint.valid_values = valuesStr
            .split(',')
            .map((v: string) => v.trim().replace(/^'|'$/g, '').replace(/::[\w\s]+/g, ''))
            .filter((v: string) => v.length > 0);
        }
      }

      // Se tem valores ENUM
      if (col.enum_values && col.enum_values.length > 0) {
        constraint.valid_values = col.enum_values;
      }

      return constraint;
    });

    res.json({
      success: true,
      schema,
      table,
      columns
    });

  } catch (error: any) {
    console.error('Error getting table constraints:', error);
    res.status(500).json({ 
      error: 'Failed to get table constraints', 
      message: error.message 
    });
  }
}

/**
 * Valida um valor contra as constraints de uma coluna
 */
export function validateValue(value: any, constraint: any): { valid: boolean; error?: string } {
  // Se permite NULL e valor é null, OK
  if (constraint.is_nullable && (value === null || value === undefined)) {
    return { valid: true };
  }

  // Se NÃO permite NULL e valor é null/vazio
  if (!constraint.is_nullable && (value === null || value === undefined || value === '')) {
    return { 
      valid: false, 
      error: `Column ${constraint.column_name} cannot be null` 
    };
  }

  // Se tem valores válidos definidos (ENUM ou CHECK)
  if (constraint.valid_values && constraint.valid_values.length > 0) {
    if (!constraint.valid_values.includes(value)) {
      return { 
        valid: false, 
        error: `Invalid value for ${constraint.column_name}. Valid values: ${constraint.valid_values.join(', ')}` 
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
        error: `Column ${constraint.column_name} must be an integer` 
      };
    }
  }

  if (dataType?.includes('numeric') || dataType?.includes('decimal') || dataType?.includes('float')) {
    const num = Number(value);
    if (isNaN(num)) {
      return { 
        valid: false, 
        error: `Column ${constraint.column_name} must be a number` 
      };
    }
  }

  if (dataType?.includes('bool')) {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
      return { 
        valid: false, 
        error: `Column ${constraint.column_name} must be a boolean` 
      };
    }
  }

  if (dataType?.includes('json')) {
    try {
      if (typeof value === 'string') {
        JSON.parse(value);
      }
    } catch {
      return { 
        valid: false, 
        error: `Column ${constraint.column_name} must be valid JSON` 
      };
    }
  }

  // Validar comprimento máximo
  if (constraint.max_length && typeof value === 'string' && value.length > constraint.max_length) {
    return { 
      valid: false, 
      error: `Column ${constraint.column_name} exceeds maximum length of ${constraint.max_length}` 
    };
  }

  return { valid: true };
}