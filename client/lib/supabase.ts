/**
 * Supabase Client Configuration
 * Acesso direto ao banco de dados via SDK
 */
import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const SUPABASE_URL = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
// Using service_role key for full access (in production, keep this server-side only!)
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac';

// Create Supabase client with service role for full access
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
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
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
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