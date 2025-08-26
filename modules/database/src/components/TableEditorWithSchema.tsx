import React from 'react';
import TableEditorCanvas from './TableEditorCanvas';

interface TableEditorWithSchemaProps {
  schemaFilter?: string;
  title?: string;
}

/**
 * Wrapper para TableEditorCanvas com filtro de schema
 * Se schemaFilter for passado, restringe acesso apenas àquele schema
 * Sem schemaFilter = acesso total (para módulo Database)
 */
export default function TableEditorWithSchema({ 
  schemaFilter, 
  title 
}: TableEditorWithSchemaProps) {
  
  // Por enquanto, vamos passar o schema como parte do título
  // para identificação visual
  const displayTitle = schemaFilter 
    ? `Tabelas - Schema: ${schemaFilter}`
    : 'Tabelas - Acesso Total';
  
  // Criar uma versão modificada do TableEditorCanvas
  // que só mostra o schema específico
  React.useEffect(() => {
    // Sobrescrever temporariamente o fetch para filtrar schemas
    if (schemaFilter) {
      const originalFetch = window.fetch;
      
      // Interceptar chamadas para APIs do postgres
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        
        // Se está buscando schemas, retornar apenas o schema filtrado
        if (url.includes('/api/postgres/schemas')) {
          console.log(`🔒 Filtrando schemas - apenas ${schemaFilter}`);
          return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => [{
              schema_name: schemaFilter,
              table_count: 0
            }],
            text: async () => JSON.stringify([{
              schema_name: schemaFilter,
              table_count: 0
            }]),
            clone: function() { return this; }
          } as Response;
        }
        
        // Se está buscando tabelas, adicionar filtro de schema
        if (url.includes('/api/postgres/tables') && !url.includes('schemas=')) {
          console.log(`🔒 Filtrando tabelas - apenas schema ${schemaFilter}`);
          const separator = url.includes('?') ? '&' : '?';
          const filteredUrl = `${url}${separator}schemas=${schemaFilter}`;
          return originalFetch(filteredUrl, init);
        }
        
        // Para outras chamadas, usar o fetch original
        return originalFetch(input, init);
      };
      
      // Limpar ao desmontar
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [schemaFilter]);
  
  return (
    <TableEditorCanvas 
      hideSchemaSelector={!!schemaFilter}
      fixedSchema={schemaFilter}
    />
  );
}

// Exportar função helper para criar queries com schema filter
export function createSchemaFilteredQuery(baseQuery: string, schemaFilter?: string): string {
  if (!schemaFilter) return baseQuery;
  
  // Adicionar filtro de schema em queries comuns
  if (baseQuery.includes('FROM pg_tables')) {
    return baseQuery.replace(
      'FROM pg_tables',
      `FROM pg_tables WHERE schemaname = '${schemaFilter}'`
    );
  }
  
  if (baseQuery.includes('FROM information_schema.tables')) {
    return baseQuery.replace(
      'FROM information_schema.tables',
      `FROM information_schema.tables WHERE table_schema = '${schemaFilter}'`
    );
  }
  
  // Para queries de SELECT, INSERT, UPDATE, DELETE
  // Prefixar nome da tabela com schema
  if (baseQuery.match(/^(SELECT|INSERT|UPDATE|DELETE)/i)) {
    // Esta é uma simplificação - em produção seria mais complexo
    return baseQuery.replace(
      /FROM\s+(\w+)/gi,
      `FROM ${schemaFilter}.$1`
    );
  }
  
  return baseQuery;
}