# Exemplos do Plataforma SDK

Este arquivo contém exemplos práticos de uso do Plataforma SDK para diferentes cenários.

## 📋 Índice

- [Exemplo 1: Módulo de Vendas (Básico)](#exemplo-1-módulo-de-vendas-básico)
- [Exemplo 2: Sistema CRM (Avançado com Banco)](#exemplo-2-sistema-crm-avançado-com-banco)
- [Exemplo 3: Assistente IA (AI-Powered)](#exemplo-3-assistente-ia-ai-powered)
- [Exemplo 4: Dashboard Analytics](#exemplo-4-dashboard-analytics)
- [Exemplo 5: Módulo de Integração](#exemplo-5-módulo-de-integração)
- [Exemplo 6: Sistema de Relatórios](#exemplo-6-sistema-de-relatórios)

## Exemplo 1: Módulo de Vendas (Básico)

### Criação
```bash
plataforma create vendas-simples --template basic --category vendas
cd vendas-simples
```

### Customização do Componente Principal
```typescript
// src/components/ModuleComponent.tsx
import React, { useState } from 'react';
import { WindowCard, WindowButton, WindowInput } from '@plataforma/design-system';
import { useAuth } from '@plataforma/auth-system';
import { ShoppingCart, Plus, DollarSign } from 'lucide-react';

export function ModuleComponent({ onClose }) {
  const { user } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [novaVenda, setNovaVenda] = useState({
    cliente: '',
    valor: '',
    produto: ''
  });

  const adicionarVenda = () => {
    if (!novaVenda.cliente || !novaVenda.valor) return;

    const venda = {
      id: Date.now(),
      ...novaVenda,
      valor: parseFloat(novaVenda.valor),
      data: new Date().toLocaleDateString('pt-BR'),
      vendedor: user?.name || 'Usuário'
    };

    setVendas([venda, ...vendas]);
    setNovaVenda({ cliente: '', valor: '', produto: '' });
  };

  const totalVendas = vendas.reduce((sum, venda) => sum + venda.valor, 0);

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <WindowCard>
          <div className="text-center">
            <DollarSign className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {totalVendas.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </div>
            <div className="text-gray-400 text-sm">Total em Vendas</div>
          </div>
        </WindowCard>

        <WindowCard>
          <div className="text-center">
            <ShoppingCart className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{vendas.length}</div>
            <div className="text-gray-400 text-sm">Vendas Realizadas</div>
          </div>
        </WindowCard>

        <WindowCard>
          <div className="text-center">
            <Plus className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {vendas.length > 0 ? (totalVendas / vendas.length).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }) : 'R$ 0,00'}
            </div>
            <div className="text-gray-400 text-sm">Ticket Médio</div>
          </div>
        </WindowCard>
      </div>

      {/* Formulário de nova venda */}
      <WindowCard title="Nova Venda">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <WindowInput
            label="Cliente"
            value={novaVenda.cliente}
            onChange={(e) => setNovaVenda(prev => ({ ...prev, cliente: e.target.value }))}
            placeholder="Nome do cliente"
          />
          <WindowInput
            label="Produto"
            value={novaVenda.produto}
            onChange={(e) => setNovaVenda(prev => ({ ...prev, produto: e.target.value }))}
            placeholder="Produto vendido"
          />
          <WindowInput
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={novaVenda.valor}
            onChange={(e) => setNovaVenda(prev => ({ ...prev, valor: e.target.value }))}
            placeholder="0,00"
          />
        </div>
        <WindowButton
          variant="primary"
          onClick={adicionarVenda}
          disabled={!novaVenda.cliente || !novaVenda.valor}
          className="w-full"
        >
          Registrar Venda
        </WindowButton>
      </WindowCard>

      {/* Lista de vendas */}
      <WindowCard title="Vendas Recentes" className="flex-1 overflow-hidden">
        {vendas.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma venda registrada ainda</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-96">
            {vendas.map((venda) => (
              <div key={venda.id} className="border-b border-white/10 py-3 last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-white">{venda.cliente}</div>
                    <div className="text-sm text-gray-400">{venda.produto}</div>
                    <div className="text-xs text-gray-500">{venda.data} • {venda.vendedor}</div>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    {venda.valor.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </WindowCard>
    </div>
  );
}
```

### Desenvolvimento
```bash
plataforma dev
```

## Exemplo 2: Sistema CRM (Avançado com Banco)

### Criação
```bash
plataforma create crm-system --template advanced --category vendas
cd crm-system
```

### Configuração do Banco (module.json)
```json
{
  "database": {
    "schema": "crm_system",
    "tables": [
      {
        "name": "clientes",
        "columns": [
          { "name": "id", "type": "UUID", "primaryKey": true, "default": "gen_random_uuid()" },
          { "name": "nome", "type": "TEXT", "required": true },
          { "name": "email", "type": "TEXT", "required": true },
          { "name": "telefone", "type": "TEXT" },
          { "name": "empresa", "type": "TEXT" },
          { "name": "status", "type": "TEXT", "default": "ativo" },
          { "name": "valor_potencial", "type": "DECIMAL" },
          { "name": "created_at", "type": "TIMESTAMPTZ", "default": "now()" },
          { "name": "created_by", "type": "UUID", "references": "auth.users(id)" }
        ],
        "indexes": [
          { "columns": ["email"], "unique": true },
          { "columns": ["status"] },
          { "columns": ["created_by"] }
        ]
      },
      {
        "name": "oportunidades",
        "columns": [
          { "name": "id", "type": "UUID", "primaryKey": true, "default": "gen_random_uuid()" },
          { "name": "cliente_id", "type": "UUID", "references": "crm_system.clientes(id)" },
          { "name": "titulo", "type": "TEXT", "required": true },
          { "name": "valor", "type": "DECIMAL", "required": true },
          { "name": "estagio", "type": "TEXT", "default": "qualificacao" },
          { "name": "probabilidade", "type": "INTEGER", "default": 0 },
          { "name": "data_fechamento_prevista", "type": "DATE" },
          { "name": "created_at", "type": "TIMESTAMPTZ", "default": "now()" },
          { "name": "created_by", "type": "UUID", "references": "auth.users(id)" }
        ]
      }
    ]
  }
}
```

### Custom Hook para CRM
```typescript
// src/hooks/useCRM.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@plataforma/auth-system';
import { supabase } from '../services/supabase';

export function useCRM() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregarClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarOportunidades = async () => {
    try {
      const { data, error } = await supabase
        .from('oportunidades')
        .select(`
          *,
          cliente:clientes(nome, email, empresa)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOportunidades(data || []);
    } catch (error) {
      console.error('Erro ao carregar oportunidades:', error);
    }
  };

  const criarCliente = async (clienteData) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ ...clienteData, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      setClientes(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      throw error;
    }
  };

  const criarOportunidade = async (oportunidadeData) => {
    try {
      const { data, error } = await supabase
        .from('oportunidades')
        .insert([{ ...oportunidadeData, created_by: user?.id }])
        .select(`
          *,
          cliente:clientes(nome, email, empresa)
        `)
        .single();

      if (error) throw error;
      
      setOportunidades(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Erro ao criar oportunidade:', error);
      throw error;
    }
  };

  const atualizarEstagio = async (oportunidadeId, novoEstagio, novaProbabilidade) => {
    try {
      const { data, error } = await supabase
        .from('oportunidades')
        .update({ 
          estagio: novoEstagio, 
          probabilidade: novaProbabilidade 
        })
        .eq('id', oportunidadeId)
        .select(`
          *,
          cliente:clientes(nome, email, empresa)
        `)
        .single();

      if (error) throw error;
      
      setOportunidades(prev => 
        prev.map(op => op.id === oportunidadeId ? data : op)
      );
      return data;
    } catch (error) {
      console.error('Erro ao atualizar estágio:', error);
      throw error;
    }
  };

  // Estatísticas
  const stats = {
    totalClientes: clientes.length,
    clientesAtivos: clientes.filter(c => c.status === 'ativo').length,
    totalOportunidades: oportunidades.length,
    valorTotal: oportunidades.reduce((sum, op) => sum + (op.valor || 0), 0),
    valorPonderado: oportunidades.reduce((sum, op) => 
      sum + (op.valor * (op.probabilidade / 100)), 0
    )
  };

  useEffect(() => {
    if (user) {
      carregarClientes();
      carregarOportunidades();
    }
  }, [user]);

  return {
    clientes,
    oportunidades,
    loading,
    stats,
    criarCliente,
    criarOportunidade,
    atualizarEstagio,
    carregarClientes,
    carregarOportunidades
  };
}
```

### Pipeline de Vendas
```typescript
// src/components/PipelineVendas.tsx
import React from 'react';
import { WindowCard } from '@plataforma/design-system';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ESTAGIOS = [
  { id: 'qualificacao', nome: 'Qualificação', cor: 'blue', probabilidade: 20 },
  { id: 'proposta', nome: 'Proposta', cor: 'yellow', probabilidade: 50 },
  { id: 'negociacao', nome: 'Negociação', cor: 'orange', probabilidade: 75 },
  { id: 'fechamento', nome: 'Fechamento', cor: 'emerald', probabilidade: 90 }
];

export function PipelineVendas({ oportunidades, onUpdateEstagio }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const oportunidadeId = result.draggableId;
    const novoEstagio = result.destination.droppableId;
    const estagio = ESTAGIOS.find(e => e.id === novoEstagio);
    
    if (estagio) {
      onUpdateEstagio(oportunidadeId, novoEstagio, estagio.probabilidade);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-full">
        {ESTAGIOS.map((estagio) => {
          const oportunidadesEstagio = oportunidades.filter(op => op.estagio === estagio.id);
          const valorTotal = oportunidadesEstagio.reduce((sum, op) => sum + op.valor, 0);

          return (
            <div key={estagio.id} className="flex flex-col">
              <WindowCard title={estagio.nome} className="mb-2">
                <div className="text-center">
                  <div className={`text-lg font-bold text-${estagio.cor}-400`}>
                    {oportunidadesEstagio.length}
                  </div>
                  <div className="text-sm text-gray-400">
                    {valorTotal.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </div>
                </div>
              </WindowCard>

              <Droppable droppableId={estagio.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-2 p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-white/10' : 'bg-transparent'
                    }`}
                  >
                    {oportunidadesEstagio.map((oportunidade, index) => (
                      <Draggable
                        key={oportunidade.id}
                        draggableId={oportunidade.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 rounded-lg border border-white/10 bg-white/5 cursor-move ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="font-medium text-white text-sm">
                              {oportunidade.titulo}
                            </div>
                            <div className="text-gray-400 text-xs mb-1">
                              {oportunidade.cliente?.nome}
                            </div>
                            <div className={`text-${estagio.cor}-400 font-bold`}>
                              {oportunidade.valor.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {oportunidade.probabilidade}% de chance
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
```

### Desenvolvimento
```bash
# Configurar variáveis de ambiente
echo "REACT_APP_SUPABASE_URL=your_supabase_url" > .env
echo "REACT_APP_SUPABASE_ANON_KEY=your_supabase_key" >> .env

# Iniciar com mock API
plataforma dev --mock
```

## Exemplo 3: Assistente IA (AI-Powered)

### Criação
```bash
plataforma create assistente-vendas --template ai-powered --category inteligencia-artificial
cd assistente-vendas
```

### Configuração de IA (module.json)
```json
{
  "ai": {
    "providers": [
      {
        "name": "openai",
        "models": ["gpt-4", "gpt-3.5-turbo"],
        "apiKey": "OPENAI_API_KEY"
      }
    ],
    "defaultProvider": "openai",
    "defaultModel": "gpt-3.5-turbo",
    "features": {
      "chat": {
        "enabled": true,
        "contextWindow": 4000,
        "memoryEnabled": true
      },
      "analysis": {
        "enabled": true,
        "types": ["leads", "vendas", "propostas"]
      },
      "generation": {
        "enabled": true,
        "types": ["emails", "propostas", "relatorios"]
      }
    }
  }
}
```

### Assistente de Vendas
```typescript
// src/components/AssistenteVendas.tsx
import React, { useState } from 'react';
import { WindowCard, WindowButton } from '@plataforma/design-system';
import { ChatInterface } from './ChatInterface';
import { AnalysisPanel } from './AnalysisPanel';
import { GenerationPanel } from './GenerationPanel';
import { useAI } from '../hooks/useAI';

export function AssistenteVendas() {
  const [activeTab, setActiveTab] = useState('chat');
  const { isConnected, currentProvider } = useAI();

  const tabs = [
    { id: 'chat', label: 'Chat Assistente', icon: '💬' },
    { id: 'analysis', label: 'Análise de Vendas', icon: '📊' },
    { id: 'generation', label: 'Geração de Conteúdo', icon: '✨' }
  ];

  const handleAnalyzeLeads = async (leadsData) => {
    const prompt = `
      Analise os seguintes leads e forneça insights sobre:
      1. Qualidade dos leads
      2. Probabilidade de conversão
      3. Próximos passos recomendados
      4. Estratégias de abordagem
      
      Dados dos leads:
      ${JSON.stringify(leadsData, null, 2)}
    `;

    return await sendMessage(prompt, 'analysis');
  };

  const handleGenerateProposal = async (clientData, requirements) => {
    const prompt = `
      Gere uma proposta comercial personalizada com base nos dados:
      
      Cliente: ${clientData.nome}
      Empresa: ${clientData.empresa}
      Necessidades: ${requirements.join(', ')}
      Orçamento: ${clientData.orcamento}
      
      A proposta deve incluir:
      1. Apresentação da empresa
      2. Entendimento das necessidades
      3. Solução proposta
      4. Valores e condições
      5. Próximos passos
    `;

    return await sendMessage(prompt, 'generation');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Status da IA */}
      <div className="p-3 border-b border-white/10 bg-violet-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-violet-300">
              Assistente IA • {currentProvider} • {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <ChatInterface />}
        
        {activeTab === 'analysis' && (
          <AnalysisPanel onAnalyzeLeads={handleAnalyzeLeads} />
        )}
        
        {activeTab === 'generation' && (
          <GenerationPanel onGenerateProposal={handleGenerateProposal} />
        )}
      </div>
    </div>
  );
}
```

### Hook de IA Personalizado
```typescript
// src/hooks/useAIAssistant.ts
import { useState, useCallback } from 'react';
import { useAI } from './useAI';

export function useAIAssistant() {
  const { sendMessage, isLoading } = useAI();
  const [analyses, setAnalyses] = useState([]);
  const [generations, setGenerations] = useState([]);

  const analyzeLeads = useCallback(async (leads) => {
    const prompt = `
      Como especialista em vendas, analise os seguintes leads:
      
      ${leads.map(lead => `
        Nome: ${lead.nome}
        Email: ${lead.email}
        Empresa: ${lead.empresa}
        Interesse: ${lead.interesse}
        Orçamento: ${lead.orcamento}
        Fonte: ${lead.fonte}
      `).join('\n')}
      
      Forneça para cada lead:
      1. Score de qualidade (0-100)
      2. Probabilidade de conversão
      3. Próxima ação recomendada
      4. Timing ideal para contato
      5. Abordagem personalizada
      
      Responda em formato JSON estruturado.
    `;

    const response = await sendMessage(prompt);
    const analysis = {
      id: Date.now(),
      leads,
      result: response,
      timestamp: new Date()
    };
    
    setAnalyses(prev => [analysis, ...prev]);
    return analysis;
  }, [sendMessage]);

  const generateEmail = useCallback(async (cliente, tipo, contexto) => {
    const prompts = {
      followup: `
        Crie um email de follow-up profissional para ${cliente.nome} da empresa ${cliente.empresa}.
        
        Contexto: ${contexto}
        
        O email deve:
        - Ser cordial e personalizado
        - Referenciar nossa conversa anterior
        - Oferecer valor adicional
        - Incluir próximos passos claros
        - Manter tom profissional mas amigável
      `,
      proposal: `
        Crie um email de apresentação de proposta para ${cliente.nome}.
        
        Contexto: ${contexto}
        
        O email deve:
        - Destacar benefícios específicos para a empresa
        - Mencionar ROI esperado
        - Incluir timeline de implementação
        - Ter call-to-action claro
        - Anexar proposta detalhada
      `,
      objection: `
        Crie um email para superar objeções do cliente ${cliente.nome}.
        
        Objeção apresentada: ${contexto}
        
        O email deve:
        - Reconhecer a preocupação
        - Apresentar evidências/casos de sucesso
        - Oferecer garantias ou condições especiais
        - Propor reunião para esclarecimentos
        - Manter confiança na solução
      `
    };

    const response = await sendMessage(prompts[tipo]);
    const generation = {
      id: Date.now(),
      tipo,
      cliente,
      contexto,
      result: response,
      timestamp: new Date()
    };
    
    setGenerations(prev => [generation, ...prev]);
    return generation;
  }, [sendMessage]);

  const analyzeConversation = useCallback(async (transcript) => {
    const prompt = `
      Analise esta conversa de vendas e extraia insights:
      
      Transcrição: ${transcript}
      
      Forneça:
      1. Resumo da conversa
      2. Necessidades identificadas
      3. Objeções apresentadas
      4. Nível de interesse (1-10)
      5. Próximos passos recomendados
      6. Probabilidade de fechamento
      7. Proposta de valor a destacar
    `;

    return await sendMessage(prompt);
  }, [sendMessage]);

  return {
    // Estado
    analyses,
    generations,
    isLoading,
    
    // Funções
    analyzeLeads,
    generateEmail,
    analyzeConversation,
    
    // Utilitários
    clearAnalyses: () => setAnalyses([]),
    clearGenerations: () => setGenerations([])
  };
}
```

### Configuração do Ambiente
```bash
# .env
REACT_APP_OPENAI_API_KEY=sk-your-openai-key
REACT_APP_ANTHROPIC_API_KEY=your-anthropic-key

# Iniciar desenvolvimento
plataforma dev
```

## Exemplo 4: Dashboard Analytics

### Criação
```bash
plataforma create dashboard-analytics --template advanced --category sistema
cd dashboard-analytics
```

### Dashboard Component
```typescript
// src/components/DashboardAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { WindowCard } from '@plataforma/design-system';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

export function DashboardAnalytics() {
  const [dados, setDados] = useState({
    vendas: [],
    clientes: [],
    conversoes: [],
    metricas: {}
  });

  useEffect(() => {
    // Simular dados para demonstração
    setDados({
      vendas: [
        { mes: 'Jan', valor: 45000, meta: 50000 },
        { mes: 'Fev', valor: 52000, meta: 50000 },
        { mes: 'Mar', valor: 48000, meta: 55000 },
        { mes: 'Abr', valor: 61000, meta: 55000 },
        { mes: 'Mai', valor: 58000, meta: 60000 },
        { mes: 'Jun', valor: 65000, meta: 60000 }
      ],
      conversoes: [
        { fonte: 'Site', visitantes: 15000, leads: 1500, vendas: 150 },
        { fonte: 'Social', visitantes: 8000, leads: 800, vendas: 80 },
        { fonte: 'Email', visitantes: 5000, leads: 750, vendas: 105 },
        { fonte: 'Indicação', visitantes: 2000, leads: 600, vendas: 180 }
      ],
      metricas: {
        receitaTotal: 329000,
        crescimento: 12.5,
        clientesAtivos: 1250,
        ticketMedio: 2630
      }
    });
  }, []);

  const { metricas } = dados;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <WindowCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {metricas.receitaTotal?.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <div className="text-gray-400 text-sm">Receita Total</div>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-400 mr-1" />
            <span className="text-emerald-400">+{metricas.crescimento}%</span>
            <span className="text-gray-500 ml-1">vs mês anterior</span>
          </div>
        </WindowCard>

        <WindowCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {metricas.clientesAtivos}
              </div>
              <div className="text-gray-400 text-sm">Clientes Ativos</div>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </WindowCard>

        <WindowCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">
                {metricas.ticketMedio?.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </div>
              <div className="text-gray-400 text-sm">Ticket Médio</div>
            </div>
            <Target className="w-8 h-8 text-violet-400" />
          </div>
        </WindowCard>

        <WindowCard>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-white">87%</div>
              <div className="text-gray-400 text-sm">Meta Atingida</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </WindowCard>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-4">
        {/* Vendas vs Meta */}
        <WindowCard title="Vendas vs Meta" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados.vendas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="mes" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="valor" fill="#8B5CF6" name="Vendas" />
              <Bar dataKey="meta" fill="#06B6D4" name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </WindowCard>

        {/* Funil de Conversão */}
        <WindowCard title="Funil de Conversão" className="h-80">
          <div className="space-y-3">
            {dados.conversoes.map((item, index) => {
              const conversaoLeads = (item.leads / item.visitantes * 100).toFixed(1);
              const conversaoVendas = (item.vendas / item.leads * 100).toFixed(1);
              
              return (
                <div key={item.fonte} className="p-3 rounded-lg bg-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">{item.fonte}</span>
                    <span className="text-sm text-gray-400">
                      {item.visitantes.toLocaleString()} visitantes
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-400">Leads: {item.leads}</span>
                      <span className="text-blue-400">{conversaoLeads}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full" 
                        style={{ width: `${conversaoLeads}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400">Vendas: {item.vendas}</span>
                      <span className="text-emerald-400">{conversaoVendas}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-emerald-400 h-2 rounded-full" 
                        style={{ width: `${conversaoVendas}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </WindowCard>
      </div>
    </div>
  );
}
```

## Exemplo 5: Módulo de Integração

### Criação e Configuração
```bash
plataforma create integracoes-api --template basic --category sistema
cd integracoes-api
```

### Gerenciador de Integrações
```typescript
// src/services/IntegrationManager.ts
export class IntegrationManager {
  private integrations: Map<string, Integration> = new Map();
  
  register(integration: Integration) {
    this.integrations.set(integration.name, integration);
  }
  
  async connect(name: string, config: any) {
    const integration = this.integrations.get(name);
    if (!integration) throw new Error(`Integration ${name} not found`);
    
    return await integration.connect(config);
  }
  
  async sync(name: string, data: any) {
    const integration = this.integrations.get(name);
    if (!integration) throw new Error(`Integration ${name} not found`);
    
    return await integration.sync(data);
  }
}

export interface Integration {
  name: string;
  displayName: string;
  icon: string;
  fields: IntegrationField[];
  connect: (config: any) => Promise<boolean>;
  sync: (data: any) => Promise<SyncResult>;
  disconnect: () => Promise<void>;
}

// Implementação para CRM HubSpot
export class HubSpotIntegration implements Integration {
  name = 'hubspot';
  displayName = 'HubSpot CRM';
  icon = '🟠';
  fields = [
    { name: 'apiKey', label: 'API Key', type: 'password', required: true },
    { name: 'portalId', label: 'Portal ID', type: 'text', required: true }
  ];

  async connect(config: any) {
    try {
      const response = await fetch(`https://api.hubapi.com/contacts/v1/lists/all/contacts/all?hapikey=${config.apiKey}`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async sync(data: any) {
    // Implementar sincronização com HubSpot
    return { success: true, synced: data.length, errors: [] };
  }

  async disconnect() {
    // Cleanup da conexão
  }
}
```

## Exemplo 6: Sistema de Relatórios

### Criação
```bash
plataforma create sistema-relatorios --template advanced --category sistema
cd sistema-relatorios
```

### Gerador de Relatórios
```typescript
// src/services/ReportGenerator.ts
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export class ReportGenerator {
  async generatePDF(data: ReportData, template: ReportTemplate) {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text(template.title, 20, 30);
    
    // Data atual
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
    
    // Conteúdo baseado no template
    let yPosition = 60;
    
    for (const section of template.sections) {
      yPosition = await this.renderSection(doc, section, data, yPosition);
    }
    
    return doc.output('blob');
  }
  
  async generateExcel(data: any[], columns: Column[]) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    
    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }
  
  private async renderSection(doc: jsPDF, section: ReportSection, data: ReportData, yPosition: number) {
    doc.setFontSize(14);
    doc.text(section.title, 20, yPosition);
    yPosition += 15;
    
    switch (section.type) {
      case 'table':
        yPosition = this.renderTable(doc, section.data, yPosition);
        break;
      case 'chart':
        yPosition = await this.renderChart(doc, section.data, yPosition);
        break;
      case 'text':
        yPosition = this.renderText(doc, section.content, yPosition);
        break;
    }
    
    return yPosition + 10;
  }
}
```

### Component de Relatórios
```typescript
// src/components/ReportBuilder.tsx
import React, { useState } from 'react';
import { WindowCard, WindowButton } from '@plataforma/design-system';
import { Download, FileText, BarChart } from 'lucide-react';
import { ReportGenerator } from '../services/ReportGenerator';

export function ReportBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const templates = [
    {
      id: 'vendas-mensal',
      name: 'Relatório de Vendas Mensal',
      description: 'Resumo das vendas do mês com gráficos e métricas',
      type: 'vendas'
    },
    {
      id: 'clientes-ativos',
      name: 'Clientes Ativos',
      description: 'Lista de clientes ativos com detalhes de contato',
      type: 'clientes'
    }
  ];
  
  const handleGenerate = async (format: 'pdf' | 'excel') => {
    setIsGenerating(true);
    
    try {
      const reportGenerator = new ReportGenerator();
      const data = await fetchReportData(selectedTemplate.type);
      
      let blob;
      if (format === 'pdf') {
        blob = await reportGenerator.generatePDF(data, selectedTemplate);
      } else {
        const arrayBuffer = await reportGenerator.generateExcel(data.rows, data.columns);
        blob = new Blob([arrayBuffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
      }
      
      // Download do arquivo
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${selectedTemplate.id}-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      <WindowCard title="Gerador de Relatórios">
        <div className="grid grid-cols-2 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <FileText className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-white">{template.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {selectedTemplate && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex gap-3">
              <WindowButton
                variant="primary"
                icon={<Download />}
                onClick={() => handleGenerate('pdf')}
                loading={isGenerating}
                disabled={isGenerating}
              >
                Gerar PDF
              </WindowButton>
              
              <WindowButton
                variant="secondary"
                icon={<BarChart />}
                onClick={() => handleGenerate('excel')}
                loading={isGenerating}
                disabled={isGenerating}
              >
                Gerar Excel
              </WindowButton>
            </div>
          </div>
        )}
      </WindowCard>
    </div>
  );
}
```

## 🚀 Comandos Úteis para Todos os Exemplos

### Desenvolvimento
```bash
# Servidor com hot reload
plataforma dev

# Com API mock
plataforma dev --mock --api-port 4000

# Porta customizada
plataforma dev --port 3000
```

### Build e Deploy
```bash
# Build para produção
plataforma build

# Validar antes do build
plataforma validate --fix --check-deps

# Build com análise
plataforma build --analyze
```

### Testes
```bash
# Executar todos os testes
plataforma test

# Com coverage
plataforma test --coverage

# Testes específicos
plataforma test --testPattern="*.integration.test.ts"
```

### Publicação
```bash
# Dry run primeiro
plataforma publish --dry-run

# Publicar na registry
plataforma publish

# Publicar versão específica
plataforma publish --tag beta
```

Estes exemplos mostram as capacidades completas do Plataforma SDK, desde módulos simples até sistemas complexos com IA e banco de dados integrados.