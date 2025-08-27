import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  WindowCard, 
  WindowButton, 
  WindowInput, 
  WindowSelect, 
  WindowToggle 
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Users, 
  Lock, 
  HardDrive, 
  FileText, 
  Key, 
  Sparkles,
  Table,
  Code,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Save,
  Download,
  Upload,
  Settings,
  Search,
  Eye,
  BarChart3
} from 'lucide-react';
import { 
  testConnection, 
  listTables, 
  getTableSchema, 
  getTableData, 
  getDatabaseStats,
  formatRowCount,
  getSchemaColor,
  type TableInfo,
  type ColumnInfo,
  type TableData as TableDataType
} from '@/lib/database-api';

// Create a query client for the database
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DatabaseSidebar({ 
  selectedTable, 
  onTableSelect 
}: { 
  selectedTable: string | null;
  onTableSelect: (table: string) => void;
}) {
  const queryClient = useQueryClient();
  
  // Fetch connection status
  const { data: connectionData, isLoading: connectionLoading } = useQuery({
    queryKey: ['database-connection'],
    queryFn: testConnection,
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Fetch tables list
  const { data: tables = [], isLoading: tablesLoading, error: tablesError } = useQuery({
    queryKey: ['database-tables'],
    queryFn: listTables,
    refetchOnMount: true,
  });

  // Fetch database stats
  const { data: stats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: getDatabaseStats,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['database-tables'] });
    queryClient.invalidateQueries({ queryKey: ['database-stats'] });
    queryClient.invalidateQueries({ queryKey: ['database-connection'] });
  };

  const getConnectionStatus = () => {
    if (connectionLoading) return { icon: RefreshCw, text: 'Conectando...', color: 'text-yellow-300' };
    if (connectionData?.connected) return { icon: CheckCircle, text: 'Conectado', color: 'text-green-300' };
    return { icon: AlertCircle, text: 'Desconectado', color: 'text-red-300' };
  };

  const status = getConnectionStatus();

  // Group tables by schema
  const tablesBySchema = tables.reduce((acc, table) => {
    if (!acc[table.schema]) {
      acc[table.schema] = [];
    }
    acc[table.schema].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);
  return (
    <div className="w-64 border-r border-gray-700 p-4 space-y-4">
      <WindowCard title="Banco de Dados">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="secondary" className={`${
            status.color === 'text-green-300' ? 'bg-green-600/20 text-green-300' :
            status.color === 'text-yellow-300' ? 'bg-yellow-600/20 text-yellow-300' :
            'bg-red-600/20 text-red-300'
          }`}>
            <status.icon className="w-3 h-3 mr-1" />
            {status.text}
          </Badge>
          <WindowButton variant="secondary" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-3 h-3" />
          </WindowButton>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Esquemas ({Object.keys(tablesBySchema).length})
          </div>
          <div className="space-y-1">
            {Object.entries(tablesBySchema).map(([schema, schemaTables]) => (
              <div key={schema} className="p-2 rounded bg-blue-600/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span className={`text-sm font-medium ${getSchemaColor(schema)}`}>
                      {schema}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {schemaTables.length}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </WindowCard>

      <WindowCard title="Tabelas">
        {tablesLoading ? (
          <div className="p-4 text-center">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-400">Carregando tabelas...</p>
          </div>
        ) : tablesError ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-4 h-4 mx-auto mb-2 text-red-400" />
            <p className="text-xs text-red-400">Erro ao carregar tabelas</p>
            <WindowButton variant="secondary" size="sm" onClick={handleRefresh} className="mt-2">
              Tentar novamente
            </WindowButton>
          </div>
        ) : (
          <div className="space-y-1">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => onTableSelect(table.name)}
                className={`
                  w-full p-2 rounded text-left transition-colors
                  flex items-center justify-between
                  ${selectedTable === table.name 
                    ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300' 
                    : 'hover:bg-gray-700/30 text-gray-300'
                  }
                `}
              >
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4" />
                  <div>
                    <div className="text-sm font-medium">{table.name}</div>
                    <div className="text-xs text-gray-500">{table.schema}</div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formatRowCount(table.live_rows_estimate)}
                </Badge>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-700">
          <WindowButton variant="secondary" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Nova Tabela
          </WindowButton>
        </div>
      </WindowCard>
    </div>
  );
}

function DatabaseToolbar({ selectedTable }: { selectedTable: string | null }) {
  return (
    <div className="border-b border-gray-700 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span>Banco de Dados</span>
            {selectedTable && (
              <>
                <span className="text-gray-500">/</span>
                <span className="text-purple-400">{selectedTable}</span>
              </>
            )}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <WindowInput 
            placeholder="Buscar em todas as tabelas..."
            className="w-64"
            leftIcon={<Search className="w-4 h-4" />}
          />
          
          <WindowButton variant="secondary">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </WindowButton>
          
          <WindowButton variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </WindowButton>

          <WindowButton variant="primary">
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </WindowButton>
        </div>
      </div>
    </div>
  );
}

function DatabaseMainContent({ selectedTable }: { selectedTable: string | null }) {
  // Fetch table data when table is selected
  const { data: tableData, isLoading: dataLoading, error: dataError } = useQuery({
    queryKey: ['table-data', selectedTable],
    queryFn: () => selectedTable ? getTableData(selectedTable, { limit: 50 }) : null,
    enabled: !!selectedTable,
  });

  // Fetch table schema when table is selected
  const { data: tableSchema, isLoading: schemaLoading } = useQuery({
    queryKey: ['table-schema', selectedTable],
    queryFn: () => selectedTable ? getTableSchema(selectedTable) : null,
    enabled: !!selectedTable,
  });

  if (!selectedTable) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <WindowCard title="Bem-vindo ao Banco de Dados">
          <div className="text-center py-8">
            <Database className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Selecione uma tabela para começar
            </h3>
            <p className="text-gray-400 mb-6">
              Escolha uma tabela na barra lateral para visualizar e editar os dados
            </p>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <WindowButton variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Nova Tabela
              </WindowButton>
              <WindowButton variant="secondary">
                <Upload className="w-4 h-4 mr-2" />
                Importar Dados
              </WindowButton>
              <WindowButton variant="secondary">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </WindowButton>
            </div>
          </div>
        </WindowCard>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4">
      <WindowCard title={`Tabela: ${selectedTable}`}>
        <Tabs defaultValue="data" className="h-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="data">
              <Table className="w-4 h-4 mr-2" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="schema">
              <Settings className="w-4 h-4 mr-2" />
              Esquema
            </TabsTrigger>
            <TabsTrigger value="sql">
              <Code className="w-4 h-4 mr-2" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Sparkles className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="flex-1 mt-4">
            {dataLoading ? (
              <div className="border border-gray-700 rounded-lg h-96 bg-gray-900/50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Carregando dados...</p>
                </div>
              </div>
            ) : dataError ? (
              <div className="border border-red-700 rounded-lg h-96 bg-red-900/20 flex items-center justify-center">
                <div className="text-center text-red-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Erro ao carregar dados</p>
                  <p className="text-xs mt-1">{dataError.message}</p>
                </div>
              </div>
            ) : tableData && tableData.data.length > 0 ? (
              <div className="border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden">
                <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      Mostrando {tableData.data.length} de {tableData.totalCount} registros
                    </span>
                    <div className="flex items-center space-x-2">
                      <WindowButton variant="secondary" size="sm">
                        <Eye className="w-3 h-3 mr-1" />
                        Visualizar
                      </WindowButton>
                      <WindowButton variant="secondary" size="sm">
                        <Download className="w-3 h-3 mr-1" />
                        Exportar
                      </WindowButton>
                    </div>
                  </div>
                </div>
                
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/80 sticky top-0">
                      <tr>
                        {Object.keys(tableData.data[0] || {}).map((column) => (
                          <th key={column} className="px-3 py-2 text-left text-gray-300 font-medium border-r border-gray-700 last:border-r-0">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-700/30 border-b border-gray-700/50">
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-gray-300 border-r border-gray-700/50 last:border-r-0">
                              <div className="max-w-xs truncate" title={String(value)}>
                                {value === null ? (
                                  <span className="text-gray-500 italic">null</span>
                                ) : String(value)}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-gray-700 rounded-lg h-96 bg-gray-900/50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Table className="w-8 h-8 mx-auto mb-2" />
                  <p>Tabela vazia</p>
                  <p className="text-xs mt-1">Nenhum registro encontrado em {selectedTable}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="schema" className="flex-1 mt-4">
            {schemaLoading ? (
              <div className="border border-gray-700 rounded-lg h-96 bg-gray-900/50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Carregando esquema...</p>
                </div>
              </div>
            ) : tableSchema && tableSchema.length > 0 ? (
              <div className="border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden">
                <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                  <h4 className="text-sm font-medium text-white">Estrutura da Tabela: {selectedTable}</h4>
                </div>
                
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/80 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-300 font-medium border-r border-gray-700">Coluna</th>
                        <th className="px-3 py-2 text-left text-gray-300 font-medium border-r border-gray-700">Tipo</th>
                        <th className="px-3 py-2 text-left text-gray-300 font-medium border-r border-gray-700">Nulo?</th>
                        <th className="px-3 py-2 text-left text-gray-300 font-medium">Padrão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSchema.map((column, index) => (
                        <tr key={index} className="hover:bg-gray-700/30 border-b border-gray-700/50">
                          <td className="px-3 py-2 text-gray-300 border-r border-gray-700/50 font-medium">
                            {column.column_name}
                          </td>
                          <td className="px-3 py-2 text-gray-300 border-r border-gray-700/50">
                            <Badge variant="outline" className="text-xs">
                              {formatDataType(column)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-gray-300 border-r border-gray-700/50">
                            {column.is_nullable === 'YES' ? (
                              <span className="text-yellow-400">Sim</span>
                            ) : (
                              <span className="text-green-400">Não</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {column.column_default ? (
                              <code className="text-xs bg-gray-700 px-1 rounded">
                                {column.column_default}
                              </code>
                            ) : (
                              <span className="text-gray-500 italic">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="border border-gray-700 rounded-lg h-96 bg-gray-900/50 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Settings className="w-8 h-8 mx-auto mb-2" />
                  <p>Esquema não encontrado</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sql" className="flex-1 mt-4">
            <SQLEditor selectedTable={selectedTable} />
          </TabsContent>

          <TabsContent value="insights" className="flex-1 mt-4">
            <DatabaseInsights selectedTable={selectedTable} />
          </TabsContent>
        </Tabs>
      </WindowCard>
    </div>
  );
}

function SQLEditor({ selectedTable }: { selectedTable: string | null }) {
  const [sqlQuery, setSqlQuery] = useState<string>(
    selectedTable ? `SELECT * FROM ${selectedTable} LIMIT 10;` : 'SELECT NOW();'
  );
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    setIsExecuting(true);
    setQueryError(null);
    
    try {
      const result = await executeQuery(sqlQuery);
      setQueryResult(result);
    } catch (error: any) {
      setQueryError(error.message);
      setQueryResult(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecuteQuery();
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/50 overflow-hidden h-96 flex flex-col">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>Editor SQL</span>
          </h4>
          <div className="flex items-center space-x-2">
            <WindowButton
              variant="primary"
              size="sm"
              onClick={handleExecuteQuery}
              disabled={isExecuting || !sqlQuery.trim()}
            >
              {isExecuting ? (
                <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <BarChart3 className="w-3 h-3 mr-1" />
              )}
              Executar
            </WindowButton>
            <span className="text-xs text-gray-400">Ctrl+Enter</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1">
          <textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full p-3 bg-gray-900/50 text-gray-300 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            placeholder="Digite sua consulta SQL aqui..."
            spellCheck={false}
          />
        </div>

        {(queryResult || queryError) && (
          <div className="border-t border-gray-700 max-h-48 overflow-auto">
            {queryError ? (
              <div className="p-3 bg-red-900/20">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 text-sm font-medium">Erro na consulta:</p>
                    <p className="text-red-300 text-xs mt-1">{queryError}</p>
                  </div>
                </div>
              </div>
            ) : queryResult && (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">
                    {queryResult.rowCount || queryResult.rows?.length || 0} registros retornados
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {queryResult.command}
                  </Badge>
                </div>
                
                {queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="max-h-32 overflow-auto border border-gray-700 rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-800/80 sticky top-0">
                        <tr>
                          {Object.keys(queryResult.rows[0]).map((column) => (
                            <th key={column} className="px-2 py-1 text-left text-gray-300 font-medium border-r border-gray-700 last:border-r-0">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.slice(0, 20).map((row: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-700/30 border-b border-gray-700/50">
                            {Object.values(row).map((value: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-2 py-1 text-gray-300 border-r border-gray-700/50 last:border-r-0">
                                <div className="max-w-xs truncate" title={String(value)}>
                                  {value === null ? (
                                    <span className="text-gray-500 italic">null</span>
                                  ) : String(value)}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {queryResult.rows.length > 20 && (
                      <div className="p-2 text-center text-xs text-gray-400 bg-gray-800/50">
                        ... e mais {queryResult.rows.length - 20} registros
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DatabaseInsights({ selectedTable }: { selectedTable: string | null }) {
  // Fetch database stats for insights
  const { data: stats } = useQuery({
    queryKey: ['database-stats'],
    queryFn: getDatabaseStats,
  });

  return (
    <div className="border border-gray-700 rounded-lg h-96 bg-gray-900/50 overflow-auto">
      <div className="p-3 border-b border-gray-700 bg-gray-800/50">
        <h4 className="text-sm font-medium text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Insights do Banco de Dados</span>
        </h4>
      </div>

      <div className="p-4 space-y-4">
        {selectedTable ? (
          <div>
            <h5 className="text-sm font-medium text-purple-400 mb-3">
              Análise da Tabela: {selectedTable}
            </h5>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <WindowCard title="🔍 Análise Rápida">
                <p className="text-xs text-gray-400 mb-2">
                  Tabela selecionada para análise detalhada
                </p>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedTable}
                  </Badge>
                </div>
              </WindowCard>

              <WindowCard title="📊 Métricas">
                <p className="text-xs text-gray-400 mb-2">
                  Estatísticas básicas disponíveis
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400">Ativa</span>
                  </div>
                </div>
              </WindowCard>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-300 text-sm font-medium">Dica de Otimização</p>
                  <p className="text-blue-200 text-xs mt-1">
                    Use a aba SQL para executar consultas personalizadas e explore os dados desta tabela.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h5 className="text-sm font-medium text-blue-400 mb-3">
              Visão Geral do Sistema
            </h5>

            {stats && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <WindowCard title="📊 Schemas">
                  <div className="space-y-2">
                    {stats.schemas.map((schema, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className={`text-xs ${getSchemaColor(schema.schemaname)}`}>
                          {schema.schemaname}
                        </span>
                        <div className="flex space-x-1">
                          <Badge variant="outline" className="text-xs">
                            {schema.table_count}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {formatRowCount(schema.total_rows)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </WindowCard>

                <WindowCard title="📈 Totais">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total de Tabelas:</span>
                      <span className="text-white">{stats.total_tables}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total de Registros:</span>
                      <span className="text-white">{formatRowCount(stats.total_rows)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Schemas Ativos:</span>
                      <span className="text-white">{stats.schemas.length}</span>
                    </div>
                  </div>
                </WindowCard>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Database className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Sistema Multi-Schema</p>
                    <p className="text-purple-200 text-xs mt-1">
                      O banco de dados está organizado em múltiplos schemas para separar os diferentes módulos da plataforma.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-300 text-sm font-medium">Sistema Operacional</p>
                    <p className="text-green-200 text-xs mt-1">
                      Todas as conexões estão funcionais e os dados estão sendo processados corretamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DatabaseContent() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    // Simulate connection check
    const timer = setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center h-full">
        <WindowCard title="Conectando...">
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Conectando ao banco de dados...</p>
          </div>
        </WindowCard>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-full bg-gray-800">
        <DatabaseToolbar selectedTable={selectedTable} />
        
        <div className="flex flex-1 overflow-hidden">
          <DatabaseSidebar 
            selectedTable={selectedTable}
            onTableSelect={setSelectedTable}
          />
          <DatabaseMainContent selectedTable={selectedTable} />
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default DatabaseContent;