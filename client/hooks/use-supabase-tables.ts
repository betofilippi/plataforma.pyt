import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { smartFetch, debouncedFetch } from '@/lib/api-utils';

// Interface para tabelas
interface TableInfo {
  id: string;
  name: string;
  schema: string;
  comment?: string;
  columns?: any[];
  live_rows_estimate?: number;
}

// Lista todas as tabelas usando API do servidor
export const useListTables = (projectRef: string, schemas?: string[]) => {
  return useQuery({
    queryKey: ['tables', projectRef, schemas],
    queryFn: async () => {
      try {
        // Buscar direto da API do servidor que já funciona - rota correta!
        console.log('Fetching tables from /api/postgres/tables...');
        const tables = await smartFetch('/api/postgres/tables', {}, 60); // Cache por 1 minuto
        console.log('Tables fetched successfully:', tables.length, 'tables');
        
        // Formatar para o componente Platform Kit
        const formattedTables = tables.map((table: any, index: number) => ({
          id: table.id || `${table.schema}_${table.name}_${index}`,
          name: table.name,
          schema: table.schema || 'public',
          comment: table.comment || '',
          live_rows_estimate: parseInt(table.live_rows_estimate) || 0
        }));
        
        // Filtrar por schemas se especificado
        if (schemas && schemas.length > 0) {
          return formattedTables.filter((table: any) => schemas.includes(table.schema));
        }
        
        console.log('Returning formatted tables:', formattedTables.length);
        return formattedTables;
      } catch (error) {
        console.error('Error fetching tables:', error);
        return [];
      }
    },
    enabled: !!projectRef,
  });
};

// Busca dados de uma tabela específica
export const useTableData = (tableName: string, schema: string = 'public') => {
  return useQuery({
    queryKey: ['table-data', tableName, schema],
    queryFn: async () => {
      try {
        // Buscar via API do servidor - rota correta!
        const apiData = await debouncedFetch(`/api/postgres/tables/${tableName}/data?schema=${schema}`, {}, 300, 30);
        return apiData.rows || apiData.data || [];
      } catch (error) {
        console.error('Error fetching table data:', error);
        return [];
      }
    },
    enabled: !!tableName,
  });
};

// Executa queries SQL customizadas
export const useRunSQLQuery = () => {
  return {
    mutateAsync: async (query: string) => {
      try {
        // Executar via API do servidor - rota correta!
        const result = await smartFetch('/api/postgres/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }, 0); // Sem cache para queries dinâmicas
        return { result: Array.isArray(result) ? result : result.rows || [result] };
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    },
    isLoading: false,
  };
};