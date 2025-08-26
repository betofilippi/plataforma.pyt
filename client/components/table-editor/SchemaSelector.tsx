import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  ChevronDown,
  ChevronRight,
  Search,
  RefreshCw,
  Layers,
  Grid,
  Info,
  Key,
  Link as LinkIcon
} from 'lucide-react';

// Schema colors - mesmo padrão do Schema Visualizer
const schemaColors: Record<string, string> = {
  public: '#8B5CF6',
  plataforma_core: '#06B6D4',
  produtos_app: '#10B981',
  estoques_app: '#F59E0B',
  loja_app: '#EF4444',
  identidade_app: '#6366F1',
  importacao_app: '#EC4899'
};

interface SchemaInfo {
  schema_name: string;
  table_count: number;
  is_expanded?: boolean;
}

interface TableInfo {
  schema_name: string;
  table_name: string;
  column_count: number;
  row_count: number;
  has_primary_key?: boolean;
  has_foreign_keys?: boolean;
}

interface SchemaSelectorProps {
  onSelectTable: (schema: string, table: string) => void;
  selectedSchema?: string;
  selectedTable?: string;
  className?: string;
}

export default function SchemaSelector({
  onSelectTable,
  selectedSchema,
  selectedTable,
  className = ''
}: SchemaSelectorProps) {
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [tables, setTables] = useState<Record<string, TableInfo[]>>({});
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['public']));
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual Supabase query
      const mockSchemas: SchemaInfo[] = [
        { schema_name: 'public', table_count: 12 },
        { schema_name: 'plataforma_core', table_count: 8 },
        { schema_name: 'produtos_app', table_count: 6 },
        { schema_name: 'estoques_app', table_count: 5 },
        { schema_name: 'loja_app', table_count: 7 },
        { schema_name: 'identidade_app', table_count: 4 },
        { schema_name: 'importacao_app', table_count: 3 }
      ];
      
      setSchemas(mockSchemas);
      
      // Load tables for expanded schemas
      for (const schema of mockSchemas) {
        if (expandedSchemas.has(schema.schema_name)) {
          await loadTablesForSchema(schema.schema_name);
        }
      }
    } catch (error) {
      console.error('Error loading schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTablesForSchema = async (schemaName: string) => {
    try {
      // Mock data for now - replace with actual Supabase query
      const mockTables: TableInfo[] = [
        {
          schema_name: schemaName,
          table_name: 'usuarios',
          column_count: 9,
          row_count: 1250,
          has_primary_key: true,
          has_foreign_keys: true
        },
        {
          schema_name: schemaName,
          table_name: 'empresas',
          column_count: 8,
          row_count: 45,
          has_primary_key: true,
          has_foreign_keys: false
        },
        {
          schema_name: schemaName,
          table_name: 'projetos',
          column_count: 12,
          row_count: 320,
          has_primary_key: true,
          has_foreign_keys: true
        }
      ];
      
      setTables(prev => ({
        ...prev,
        [schemaName]: mockTables
      }));
    } catch (error) {
      console.error(`Error loading tables for ${schemaName}:`, error);
    }
  };

  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schemaName)) {
        newSet.delete(schemaName);
      } else {
        newSet.add(schemaName);
        // Load tables if not loaded yet
        if (!tables[schemaName]) {
          loadTablesForSchema(schemaName);
        }
      }
      return newSet;
    });
  };

  const filteredSchemas = schemas.filter(schema =>
    schema.schema_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFilteredTables = (schemaName: string) => {
    const schemaTables = tables[schemaName] || [];
    return schemaTables.filter(table =>
      table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Banco de Dados</span>
          </div>
          <button
            onClick={loadSchemas}
            className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar schemas e tabelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-slate-400 backdrop-blur-sm hover:bg-white/[0.075] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 transition-all"
          />
        </div>
      </div>

      {/* Schema List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && schemas.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSchemas.map(schema => {
              const isExpanded = expandedSchemas.has(schema.schema_name);
              const schemaColor = schemaColors[schema.schema_name] || '#8B5CF6';
              const filteredTables = getFilteredTables(schema.schema_name);
              
              return (
                <div key={schema.schema_name}>
                  {/* Schema Header */}
                  <div
                    className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                      selectedSchema === schema.schema_name && !selectedTable
                        ? 'bg-white/[0.12] border border-white/20'
                        : 'bg-white/[0.05] hover:bg-white/[0.08] border border-transparent'
                    }`}
                    onClick={() => toggleSchema(schema.schema_name)}
                  >
                    <ChevronRight 
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: schemaColor }}
                    />
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span className="flex-1 text-sm font-medium text-white">
                      {schema.schema_name}
                    </span>
                    <span className="text-xs text-slate-400 bg-white/[0.05] px-2 py-0.5 rounded-full">
                      {schema.table_count}
                    </span>
                  </div>

                  {/* Tables */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {loading && !tables[schema.schema_name] ? (
                        <div className="px-4 py-2 text-xs text-slate-400">
                          Carregando tabelas...
                        </div>
                      ) : filteredTables.length > 0 ? (
                        filteredTables.map(table => (
                          <div
                            key={`${table.schema_name}.${table.table_name}`}
                            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                              selectedSchema === table.schema_name && selectedTable === table.table_name
                                ? 'bg-white/[0.12] border border-white/20'
                                : 'bg-white/[0.03] hover:bg-white/[0.06] border border-transparent'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTable(table.schema_name, table.table_name);
                            }}
                          >
                            <Table className="w-4 h-4 text-slate-500" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">
                                {table.table_name}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                <span>{table.column_count} cols</span>
                                <span>{table.row_count} rows</span>
                                {table.has_primary_key && (
                                  <Key className="w-3 h-3 text-yellow-400" title="Has Primary Key" />
                                )}
                                {table.has_foreign_keys && (
                                  <LinkIcon className="w-3 h-3 text-purple-400" title="Has Foreign Keys" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-xs text-slate-400">
                          {searchTerm ? 'Nenhuma tabela encontrada' : 'Sem tabelas'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{schemas.length} schemas</span>
          <span>
            {Object.values(tables).flat().length} tabelas carregadas
          </span>
        </div>
      </div>
    </div>
  );
}