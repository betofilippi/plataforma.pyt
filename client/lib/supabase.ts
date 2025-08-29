/**
 * Supabase Client Configuration
 * Acesso direto ao banco de dados via SDK - Project kblvviunzleurqlskeab
 */
import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kblvviunzleurqlskeab.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibHZ2aXVuemxldXJxbHNrZWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NzYwMzIsImV4cCI6MjA3MDE1MjAzMn0.lP8QJeDoIrg3GDR7vTuf6sLmn4hnpN4SeWppw_tgTm4';

// Create Supabase client with anon key for secure access
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application': 'plataforma.app',
    },
  },
});

// Helper to switch schema
export const useSchema = (schema: string) => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
      schema,
    },
  });
};

// Type definitions for tables
export interface TableInfo {
  name: string;
  id: string;
  schema: string;
  live_rows_estimate: number;
  comment?: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default?: string;
  character_maximum_length?: number;
  numeric_precision?: number;
  numeric_scale?: number;
  comment?: string;
}

// Helper functions for database operations
export const databaseHelpers = {
  // List all tables
  async listTables(): Promise<TableInfo[]> {
    const { data, error } = await supabase.rpc('list_all_tables');
    if (error) throw error;
    return data || [];
  },

  // Get table schema
  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: tableName,
    });
    if (error) throw error;
    return data || [];
  },

  // Get table data with pagination
  async getTableData(
    tableName: string,
    options: {
      page?: number;
      pageSize?: number;
      orderBy?: string;
      ascending?: boolean;
    } = {}
  ) {
    const { page = 1, pageSize = 100, orderBy, ascending = true } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(tableName).select('*', { count: 'exact' });

    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
    };
  },

  // Execute raw SQL (requires a database function)
  async executeSQL(query: string) {
    const { data, error } = await supabase.rpc('execute_sql', {
      query,
    });
    if (error) throw error;
    return data;
  },
};

// Export types from Supabase
export type { User } from '@supabase/supabase-js';

export default supabase;