import React, { useState } from 'react';
import { Copy, Check, ChevronRight, Database, Server, Key, Shield, Code, FileJson, GitBranch, Terminal } from 'lucide-react';

/**
 * Documentação Técnica Completa - Supabase SDK
 * Sistema plataforma.app - Integração com PostgreSQL via Supabase
 */
export function SupabaseSDKDocs() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('config');

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-full flex bg-gray-900 text-gray-100">
      {/* Sidebar - Navigation */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4 text-white">Documentação SDK</h2>
          
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  activeSection === section.id 
                    ? 'bg-gray-800 text-white' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl">
          {/* Connection Info */}
          <div className="mb-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">CONEXÃO ATIVA</h3>
            <div className="font-mono text-xs space-y-1">
              <div>URL: yhvtsbkotszxqndkhhhx.supabase.co</div>
              <div>Database: PostgreSQL 15</div>
              <div>Schemas: public, plataforma_core, identidade_app, produtos_app, estoques_app, loja_app, importacao_app</div>
            </div>
          </div>

          {/* Content Sections */}
          {activeSection === 'config' && <ConfigSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'client' && <ClientSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'auth' && <AuthSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'database' && <DatabaseSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'realtime' && <RealtimeSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'storage' && <StorageSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'rpc' && <RPCSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'hooks' && <HooksSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'api' && <APISection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
          {activeSection === 'schemas' && <SchemasSection copyToClipboard={copyToClipboard} copiedIndex={copiedIndex} />}
        </div>
      </div>
    </div>
  );
}

// Code Block Component
function CodeBlock({ code, index, copyToClipboard, copiedIndex }: any) {
  return (
    <div className="relative bg-gray-950 rounded-lg border border-gray-800">
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-300">{code}</code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, index)}
        className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
      >
        {copiedIndex === index ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}

// Sections Data
const sections = [
  { id: 'config', title: '1. Configuração' },
  { id: 'client', title: '2. Cliente Principal' },
  { id: 'auth', title: '3. Autenticação' },
  { id: 'database', title: '4. Database Operations' },
  { id: 'realtime', title: '5. Realtime' },
  { id: 'storage', title: '6. Storage' },
  { id: 'rpc', title: '7. RPC Functions' },
  { id: 'hooks', title: '8. React Hooks' },
  { id: 'api', title: '9. API Endpoints' },
  { id: 'schemas', title: '10. Database Schemas' },
];

// Section Components
function ConfigSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">1. Configuração do Supabase</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Instalação</h3>
        <CodeBlock 
          code="npm install @supabase/supabase-js @tanstack/react-query"
          index={0}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">client/lib/supabase.ts - Cliente Principal</h3>
        <CodeBlock 
          code={`import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Service Role Key

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public', // Schema padrão
  },
  global: {
    headers: {
      'x-application': 'plataforma.app',
    },
  },
});`}
          index={1}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Helper para Múltiplos Schemas</h3>
        <CodeBlock 
          code={`// Criar cliente para schema específico
export const useSchema = (schema: string) => {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema },
  });
};

// Uso:
const identidadeClient = useSchema('identidade_app');
const produtosClient = useSchema('produtos_app');`}
          index={2}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function ClientSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">2. Cliente Principal - Implementação Completa</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Arquivo: client/lib/supabase.ts</h3>
        <p className="text-gray-400 mb-3">Este é o arquivo principal de configuração usado em toda a plataforma.</p>
        <CodeBlock 
          code={`/**
 * Supabase Client Configuration
 * Acesso direto ao banco de dados via SDK
 */
import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const SUPABASE_URL = 'https://yhvtsbkotszxqndkhhhx.supabase.co';
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
    db: { schema },
  });
};`}
          index={10}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Database Helpers Implementados</h3>
        <CodeBlock 
          code={`export const databaseHelpers = {
  // Listar todas as tabelas
  async listTables(): Promise<TableInfo[]> {
    const { data, error } = await supabase.rpc('list_all_tables');
    if (error) throw error;
    return data || [];
  },

  // Obter schema de uma tabela
  async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
    const { data, error } = await supabase.rpc('get_table_schema', {
      table_name: tableName,
    });
    if (error) throw error;
    return data || [];
  },

  // Obter dados com paginação
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

  // Executar SQL direto
  async executeSQL(query: string) {
    const { data, error } = await supabase.rpc('execute_sql', { query });
    if (error) throw error;
    return data;
  },
};`}
          index={11}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function AuthSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">3. Autenticação - Implementação Real</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Login com Email/Senha (AuthContext.tsx)</h3>
        <p className="text-gray-400 mb-3">Usado em: client/contexts/AuthContext.tsx - linha 326</p>
        <CodeBlock 
          code={`const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
  dispatch({ type: 'AUTH_START' });

  try {
    const response = await authApi.post<AuthResponse>('/login', credentials);
    const { data } = response.data;

    if (response.data.success && data) {
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: data.user,
          accessToken: data.accessToken,
          expiresIn: data.expiresIn,
        },
      });

      // Salvar token e usuário no localStorage
      tokenStorage.set(data.accessToken);
      tokenStorage.setExpiry(Date.now() + data.expiresIn * 1000);
      tokenStorage.setUser(data.user);
      
      return response.data;
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    return { success: false, message: errorMessage };
  }
}, []);`}
          index={20}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">OAuth Social Login (Google, GitHub, Discord)</h3>
        <p className="text-gray-400 mb-3">Usado em: client/contexts/AuthContext.tsx - linha 375</p>
        <CodeBlock 
          code={`const socialLogin = useCallback(async (provider: 'google' | 'github' | 'discord'): Promise<void> => {
  const { supabase } = await import('@/lib/supabase');
  
  try {
    dispatch({ type: 'AUTH_START' });
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: \`\${window.location.origin}/auth/callback\`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) throw error;
    // OAuth redirect acontece automaticamente
  } catch (error: any) {
    dispatch({ type: 'AUTH_FAILURE', payload: error.message });
  }
}, []);`}
          index={21}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Exchange Code for Session (OAuth Callback)</h3>
        <p className="text-gray-400 mb-3">Usado em: client/components/auth/AuthCallback.tsx - linha 40</p>
        <CodeBlock 
          code={`// Componente AuthCallback.tsx
const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(authCode);

if (supabaseError) {
  console.error('Supabase auth error:', supabaseError);
  throw supabaseError;
}

if (data?.session) {
  // Sessão criada com sucesso
  const { user, access_token, expires_in } = data.session;
  
  // Salvar no contexto de autenticação
  await login({
    email: user.email,
    password: '', // OAuth não usa senha
  });
}`}
          index={22}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function DatabaseSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">4. Database Operations - Implementações Reais</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">SELECT - Buscar Dados</h3>
        <p className="text-gray-400 mb-3">Usado em: DatabaseFullEditor.tsx - linha 294</p>
        <CodeBlock 
          code={`// Buscar dados de uma tabela com paginação
let query = supabase.from(tableName).select('*', { count: 'exact' });

// Adicionar ordenação se especificada
if (orderBy) {
  query = query.order(orderBy, { ascending: sortDirection === 'asc' });
}

// Adicionar filtros
if (filters.length > 0) {
  filters.forEach(filter => {
    if (filter.operator === 'eq') {
      query = query.eq(filter.column, filter.value);
    } else if (filter.operator === 'contains') {
      query = query.ilike(filter.column, \`%\${filter.value}%\`);
    }
  });
}

// Aplicar paginação
query = query.range(from, to);

const { data, error, count } = await query;`}
          index={30}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">INSERT - Inserir Registros</h3>
        <p className="text-gray-400 mb-3">Usado em vários componentes de edição</p>
        <CodeBlock 
          code={`// Inserir um novo registro
const { data, error } = await supabase
  .from('produtos')
  .insert([
    { 
      nome: 'Notebook Dell',
      preco: 3500.00,
      categoria: 'eletrônicos',
      estoque: 15,
      created_at: new Date().toISOString()
    }
  ])
  .select(); // Retorna o registro inserido

if (error) {
  console.error('Erro ao inserir:', error);
  throw error;
}

console.log('Produto inserido:', data);`}
          index={31}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">UPDATE - Atualizar Registros</h3>
        <CodeBlock 
          code={`// Atualizar um registro específico
const { data, error } = await supabase
  .from('produtos')
  .update({ 
    preco: 3200.00,
    estoque: 10,
    updated_at: new Date().toISOString()
  })
  .eq('id', productId)
  .select();

// Atualizar múltiplos registros
const { error: bulkError } = await supabase
  .from('produtos')
  .update({ categoria: 'notebooks' })
  .in('id', [1, 2, 3, 4, 5]);`}
          index={32}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">DELETE - Remover Registros</h3>
        <CodeBlock 
          code={`// Deletar um registro
const { error } = await supabase
  .from('produtos')
  .delete()
  .eq('id', productId);

// Deletar múltiplos registros
const { error: bulkError } = await supabase
  .from('produtos')
  .delete()
  .in('categoria', ['descontinuado', 'obsoleto']);`}
          index={33}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function RealtimeSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">5. Realtime - Implementação no Sistema</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Hook useRealtime.ts - Implementação Completa</h3>
        <p className="text-gray-400 mb-3">Arquivo: client/hooks/useRealtime.ts</p>
        <CodeBlock 
          code={`import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeSubscription(
  table: string,
  callback: (payload: any) => void
) {
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    // Criar canal para a tabela
    const channelInstance = supabase
      .channel(\`\${table}-changes\`)
      .on(
        'postgres_changes',
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: table 
        },
        (payload) => {
          console.log('Mudança detectada:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Status do canal:', status);
      });

    setChannel(channelInstance);

    // Cleanup
    return () => {
      if (channelInstance) {
        supabase.removeChannel(channelInstance);
      }
    };
  }, [table, callback]);

  return channel;
}`}
          index={40}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Presence - Usuários Online</h3>
        <p className="text-gray-400 mb-3">Usado em: RealtimeAvatarStack.tsx</p>
        <CodeBlock 
          code={`// Rastrear presença de usuários
const channel = supabase.channel('online-users');

// Escutar mudanças de presença
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Usuários online:', state);
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('Usuário entrou:', newPresences);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('Usuário saiu:', leftPresences);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Enviar própria presença
      await channel.track({
        user_id: user.id,
        user_name: user.name,
        online_at: new Date().toISOString(),
      });
    }
  });`}
          index={41}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function StorageSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">6. Storage - Upload e Download</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Upload de Arquivo</h3>
        <p className="text-gray-400 mb-3">Hook: client/hooks/use-storage-upload.ts</p>
        <CodeBlock 
          code={`// Upload de arquivo
const uploadFile = async (file: File, bucket: string = 'arquivos') => {
  const fileName = \`\${Date.now()}-\${file.name}\`;
  const filePath = \`uploads/\${fileName}\`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Obter URL público
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    path: data.path,
    url: urlData.publicUrl
  };
};`}
          index={50}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Download e Listagem</h3>
        <CodeBlock 
          code={`// Download de arquivo
const downloadFile = async (path: string, bucket: string = 'arquivos') => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) throw error;

  // Criar URL para download
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop() || 'download';
  a.click();
};

// Listar arquivos
const listFiles = async (folder: string = '', bucket: string = 'arquivos') => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

  return data || [];
};`}
          index={51}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function RPCSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">7. RPC Functions - Stored Procedures</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Funções RPC Implementadas no Sistema</h3>
        <p className="text-gray-400 mb-3">Estas funções estão definidas no PostgreSQL e são chamadas via SDK</p>
        <CodeBlock 
          code={`// 1. get_schemas() - Listar todos os schemas
const { data: schemas, error } = await supabase.rpc('get_schemas');

// 2. list_all_tables() - Listar todas as tabelas
const { data: tables, error } = await supabase.rpc('list_all_tables');

// 3. get_table_schema() - Obter estrutura de uma tabela
const { data: columns, error } = await supabase.rpc('get_table_schema', {
  table_name: 'produtos'
});

// 4. execute_sql() - Executar SQL arbitrário (cuidado!)
const { data: result, error } = await supabase.rpc('execute_sql', {
  query: 'SELECT COUNT(*) FROM produtos WHERE preco > 1000'
});

// 5. update_user_presence() - Atualizar presença do usuário
await supabase.rpc('update_user_presence', {
  user_id: userId,
  status: 'online',
  last_seen: new Date().toISOString()
});

// 6. get_online_users() - Obter usuários online
const { data: onlineUsers, error } = await supabase.rpc('get_online_users');`}
          index={60}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Uso Real: DatabaseFullEditor.tsx</h3>
        <p className="text-gray-400 mb-3">Linha 226 - Carregamento de schemas</p>
        <CodeBlock 
          code={`const loadSchemas = async () => {
  try {
    const { data: schemaData, error } = await supabase.rpc('get_schemas');
    
    if (error || !schemaData) {
      // Fallback para schemas conhecidos
      const knownSchemas = [
        { schema_name: 'public' },
        { schema_name: 'plataforma_core' },
        { schema_name: 'identidade_app' },
        { schema_name: 'produtos_app' },
        { schema_name: 'estoques_app' },
        { schema_name: 'loja_app' },
        { schema_name: 'importacao_app' }
      ];
      setSchemas(knownSchemas);
    } else {
      setSchemas(schemaData);
    }
  } catch (error) {
    console.error('Error loading schemas:', error);
    setSchemas([{ schema_name: 'public' }]);
  }
};`}
          index={61}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function HooksSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">8. React Hooks Customizados</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">useListTables - Hook para Listar Tabelas</h3>
        <p className="text-gray-400 mb-3">Arquivo: client/hooks/use-supabase-tables.ts</p>
        <CodeBlock 
          code={`import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export const useListTables = (projectRef: string, schemas?: string[]) => {
  return useQuery({
    queryKey: ['tables', projectRef, schemas],
    queryFn: async () => {
      try {
        // Buscar via API do servidor
        const response = await fetch('/api/postgres/tables');
        if (!response.ok) throw new Error('Failed to fetch tables');
        
        const tables = await response.json();
        
        // Formatar para o componente
        const formattedTables = tables.map((table: any, index: number) => ({
          id: table.id || \`\${table.schema}_\${table.name}_\${index}\`,
          name: table.name,
          schema: table.schema || 'public',
          comment: table.comment || '',
          live_rows_estimate: parseInt(table.live_rows_estimate) || 0
        }));
        
        // Filtrar por schemas se especificado
        if (schemas && schemas.length > 0) {
          return formattedTables.filter((table: any) => 
            schemas.includes(table.schema)
          );
        }
        
        return formattedTables;
      } catch (error) {
        console.error('Error fetching tables:', error);
        return [];
      }
    },
    enabled: !!projectRef,
  });
};`}
          index={70}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">useTableData - Hook para Dados da Tabela</h3>
        <CodeBlock 
          code={`export const useTableData = (tableName: string, schema: string = 'public') => {
  return useQuery({
    queryKey: ['table-data', tableName, schema],
    queryFn: async () => {
      try {
        // Buscar via API do servidor
        const response = await fetch(
          \`/api/postgres/tables/\${tableName}/data?schema=\${schema}\`
        );
        if (!response.ok) {
          console.warn(\`Could not fetch data from \${tableName}\`);
          return [];
        }
        
        const apiData = await response.json();
        return apiData.data || [];
      } catch (error) {
        console.error('Error fetching table data:', error);
        return [];
      }
    },
    enabled: !!tableName,
  });
};`}
          index={71}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">useRunSQLQuery - Executar SQL</h3>
        <CodeBlock 
          code={`export const useRunSQLQuery = () => {
  return {
    mutateAsync: async (query: string) => {
      try {
        const response = await fetch('/api/postgres/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(\`Query failed: \${errorText}\`);
        }

        const result = await response.json();
        return { 
          result: Array.isArray(result) 
            ? result 
            : result.rows || [result] 
        };
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    },
    isLoading: false,
  };
};`}
          index={72}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function APISection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">9. API Endpoints do Servidor</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Rotas Implementadas</h3>
        <p className="text-gray-400 mb-3">Arquivo: server/routes/postgres-direct.ts</p>
        <CodeBlock 
          code={`// 1. Listar tabelas
GET /api/postgres/tables
Response: Array de tabelas com schema, nome, contagem de linhas

// 2. Executar query SQL
POST /api/postgres/query
Body: { query: "SELECT * FROM produtos LIMIT 10" }
Response: Array de resultados

// 3. Obter dados de uma tabela
GET /api/postgres/tables/:tableName/data
Query params: ?schema=public&limit=100&offset=0
Response: { data: [...], total: 1234 }

// 4. Obter schema de uma tabela
GET /api/postgres/tables/:tableName/schema
Query params: ?schema=public
Response: Array de colunas com tipos, nullable, defaults

// 5. Testar conexão
GET /api/postgres/test
Response: { connected: true, database: "postgres" }

// 6. Estatísticas do banco
GET /api/postgres/stats
Response: { tables: 41, total_size: "125MB", connections: 5 }`}
          index={80}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Proxy para Supabase Management API</h3>
        <p className="text-gray-400 mb-3">Arquivo: server/routes/supabase-proxy.ts</p>
        <CodeBlock 
          code={`// Proxy para Management API
GET/POST/PUT/DELETE /api/supabase-proxy/*

// Exemplos de uso:
// Listar projetos
GET /api/supabase-proxy/v1/projects

// Obter detalhes de um projeto
GET /api/supabase-proxy/v1/projects/{ref}

// Configurações de auth
GET /api/supabase-proxy/v1/projects/{ref}/config/auth

// Database settings
GET /api/supabase-proxy/v1/projects/{ref}/config/database`}
          index={81}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

function SchemasSection({ copyToClipboard, copiedIndex }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">10. Database Schemas</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Schemas Configurados no PostgreSQL</h3>
        <CodeBlock 
          code={`-- 1. public (Schema padrão)
-- Tabelas: users, organizations, modules, permissions, etc.

-- 2. plataforma_core
-- Tabelas do core da plataforma: 
-- audit_logs, notifications, user_sessions, system_config

-- 3. identidade_app
-- Gestão de identidade visual:
-- brands, logos, colors, fonts, design_tokens

-- 4. produtos_app
-- Catálogo de produtos:
-- products, categories, variants, prices, inventory

-- 5. estoques_app
-- Controle de estoque:
-- warehouses, stock_movements, inventory_counts, locations

-- 6. loja_app
-- E-commerce:
-- orders, order_items, customers, payments, shipping

-- 7. importacao_app
-- Importação de produtos:
-- import_batches, suppliers, shipping_containers, customs`}
          index={90}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Como Usar Schemas Diferentes</h3>
        <CodeBlock 
          code={`// Método 1: Criar cliente específico para o schema
const identidadeClient = useSchema('identidade_app');
const { data } = await identidadeClient
  .from('brands')
  .select('*');

// Método 2: Especificar schema na query (quando suportado)
const { data } = await supabase
  .from('identidade_app.brands')
  .select('*');

// Método 3: Via RPC com schema específico
const { data } = await supabase.rpc('get_table_data', {
  schema_name: 'produtos_app',
  table_name: 'products'
});`}
          index={91}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Estatísticas Atuais do Banco</h3>
        <CodeBlock 
          code={`// Total de tabelas por schema:
public: 41 tabelas
plataforma_core: 8 tabelas
identidade_app: 5 tabelas
produtos_app: 7 tabelas
estoques_app: 6 tabelas
loja_app: 9 tabelas
importacao_app: 4 tabelas

// Tabelas principais:
- users (usuários do sistema)
- organizations (empresas/clientes)
- modules (módulos da plataforma)
- permissions (permissões RBAC)
- audit_logs (auditoria)
- notifications (notificações)
- products (produtos)
- orders (pedidos)
- inventory (estoque)`}
          index={92}
          copyToClipboard={copyToClipboard}
          copiedIndex={copiedIndex}
        />
      </div>
    </div>
  );
}

export default SupabaseSDKDocs;