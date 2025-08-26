import { MarketplaceModule, ModuleCategory } from '../types';

// Mock categories
export const mockCategories: ModuleCategory[] = [
  {
    id: 'ai',
    name: 'ai',
    displayName: 'Inteligência Artificial',
    description: 'Módulos de IA e Machine Learning',
    icon: 'Brain',
    color: '#10B981'
  },
  {
    id: 'business',
    name: 'business',
    displayName: 'Negócios',
    description: 'Ferramentas para gestão empresarial',
    icon: 'Building',
    color: '#3B82F6'
  },
  {
    id: 'productivity',
    name: 'productivity',
    displayName: 'Produtividade',
    description: 'Ferramentas para aumentar a produtividade',
    icon: 'Zap',
    color: '#F59E0B'
  },
  {
    id: 'finance',
    name: 'finance',
    displayName: 'Financeiro',
    description: 'Gestão financeira e contábil',
    icon: 'DollarSign',
    color: '#10B981'
  },
  {
    id: 'communication',
    name: 'communication',
    displayName: 'Comunicação',
    description: 'Chat, email e colaboração',
    icon: 'MessageCircle',
    color: '#8B5CF6'
  }
];

// Mock modules
export const mockModules: MarketplaceModule[] = [
  {
    id: 'ai-assistant',
    name: 'ai-assistant',
    displayName: 'AI Assistant Pro',
    description: 'Assistente de IA avançado com capacidades de processamento de linguagem natural',
    longDescription: 'Um assistente de IA completo que pode ajudar com tarefas de escritório, análise de dados, geração de conteúdo e muito mais. Integra-se perfeitamente com sua plataforma existente.',
    version: '2.1.0',
    author: {
      id: 'dev-1',
      name: 'AI Labs Inc.',
      email: 'contact@ailabs.com',
      verified: true
    },
    category: mockCategories[0],
    tags: ['ai', 'nlp', 'chatbot', 'automation'],
    price: {
      type: 'paid',
      amount: 29.99,
      currency: 'R$'
    },
    ratings: {
      average: 4.8,
      count: 1247,
      breakdown: { 5: 950, 4: 200, 3: 70, 2: 20, 1: 7 }
    },
    downloads: 15420,
    featured: true,
    trending: false,
    newRelease: false,
    screenshots: [
      '/api/placeholder/800/600?text=AI+Assistant+Dashboard',
      '/api/placeholder/800/600?text=Chat+Interface',
      '/api/placeholder/800/600?text=Analytics'
    ],
    icon: '/api/placeholder/64/64?text=AI',
    permissions: [
      {
        id: 'read-data',
        name: 'Leitura de dados',
        description: 'Acesso para ler dados do sistema',
        required: true
      },
      {
        id: 'api-access',
        name: 'Acesso à API externa',
        description: 'Conexão com serviços de IA externos',
        required: true
      }
    ],
    dependencies: ['@plataforma/core', '@plataforma/ui'],
    compatibility: {
      minVersion: '1.0.0'
    },
    repository: {
      type: 'github',
      url: 'https://github.com/ailabs/ai-assistant-pro'
    },
    changelog: [
      {
        version: '2.1.0',
        releaseDate: '2024-01-15',
        notes: 'Melhorias na interface e novos comandos de IA',
        breaking: false,
        features: ['Nova interface de chat', 'Comandos personalizados'],
        bugfixes: ['Correção de memory leak', 'Melhor tratamento de erros']
      },
      {
        version: '2.0.0',
        releaseDate: '2023-12-10',
        notes: 'Versão major com breaking changes',
        breaking: true,
        features: ['Arquitetura completamente nova', 'Suporte a múltiplas linguagens'],
        bugfixes: ['Diversos bugs corrigidos']
      }
    ],
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    publishedAt: '2023-10-15T00:00:00Z',
    status: 'published'
  },
  
  {
    id: 'crm-pro',
    name: 'crm-pro',
    displayName: 'CRM Profissional',
    description: 'Sistema completo de gestão de relacionamento com clientes',
    version: '1.5.2',
    author: {
      id: 'dev-2',
      name: 'Business Solutions',
      email: 'contact@bizsolucoes.com.br',
      verified: true
    },
    category: mockCategories[1],
    tags: ['crm', 'vendas', 'clientes', 'leads'],
    price: {
      type: 'freemium',
      trialDays: 14
    },
    ratings: {
      average: 4.5,
      count: 892,
      breakdown: { 5: 600, 4: 200, 3: 70, 2: 15, 1: 7 }
    },
    downloads: 8900,
    featured: false,
    trending: true,
    newRelease: false,
    screenshots: [
      '/api/placeholder/800/600?text=CRM+Dashboard',
      '/api/placeholder/800/600?text=Contact+Management'
    ],
    icon: '/api/placeholder/64/64?text=CRM',
    permissions: [
      {
        id: 'manage-contacts',
        name: 'Gerenciar contatos',
        description: 'Criar, editar e excluir contatos',
        required: true
      }
    ],
    dependencies: ['@plataforma/core'],
    compatibility: {
      minVersion: '1.0.0'
    },
    changelog: [
      {
        version: '1.5.2',
        releaseDate: '2024-01-20',
        notes: 'Correções de bugs e melhorias de performance',
        breaking: false,
        features: [],
        bugfixes: ['Correção no filtro de contatos', 'Melhoria na sincronização']
      }
    ],
    createdAt: '2023-09-15T00:00:00Z',
    updatedAt: '2024-01-20T15:45:00Z',
    publishedAt: '2023-10-01T00:00:00Z',
    status: 'published'
  },

  {
    id: 'task-manager',
    name: 'task-manager',
    displayName: 'Gerenciador de Tarefas',
    description: 'Organize suas tarefas e projetos com facilidade',
    version: '1.2.1',
    author: {
      id: 'dev-3',
      name: 'Productivity Tools',
      email: 'hello@prodtools.com',
      verified: false
    },
    category: mockCategories[2],
    tags: ['tarefas', 'produtividade', 'projetos', 'kanban'],
    price: {
      type: 'free'
    },
    ratings: {
      average: 4.2,
      count: 543,
      breakdown: { 5: 300, 4: 150, 3: 70, 2: 15, 1: 8 }
    },
    downloads: 12340,
    featured: false,
    trending: false,
    newRelease: true,
    screenshots: [
      '/api/placeholder/800/600?text=Task+Board',
      '/api/placeholder/800/600?text=Calendar+View'
    ],
    icon: '/api/placeholder/64/64?text=TASK',
    permissions: [],
    dependencies: ['@plataforma/core', '@plataforma/ui'],
    compatibility: {
      minVersion: '1.0.0'
    },
    changelog: [
      {
        version: '1.2.1',
        releaseDate: '2024-01-25',
        notes: 'Nova versão com melhorias na interface',
        breaking: false,
        features: ['Vista de calendário', 'Drag and drop melhorado'],
        bugfixes: ['Correção em notificações']
      }
    ],
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2024-01-25T09:15:00Z',
    publishedAt: '2023-11-15T00:00:00Z',
    status: 'published'
  },

  {
    id: 'financial-dashboard',
    name: 'financial-dashboard',
    displayName: 'Dashboard Financeiro',
    description: 'Visualize suas métricas financeiras em tempo real',
    version: '3.0.0',
    author: {
      id: 'dev-4',
      name: 'FinTech Solutions',
      email: 'support@fintech.com',
      verified: true
    },
    category: mockCategories[3],
    tags: ['finanças', 'dashboard', 'relatórios', 'analytics'],
    price: {
      type: 'paid',
      amount: 49.90,
      currency: 'R$'
    },
    ratings: {
      average: 4.7,
      count: 756,
      breakdown: { 5: 550, 4: 150, 3: 40, 2: 10, 1: 6 }
    },
    downloads: 6780,
    featured: true,
    trending: true,
    newRelease: false,
    screenshots: [
      '/api/placeholder/800/600?text=Financial+Dashboard',
      '/api/placeholder/800/600?text=Reports'
    ],
    icon: '/api/placeholder/64/64?text=FIN',
    permissions: [
      {
        id: 'financial-data',
        name: 'Dados financeiros',
        description: 'Acesso aos dados financeiros da empresa',
        required: true
      }
    ],
    dependencies: ['@plataforma/core', '@plataforma/charts'],
    compatibility: {
      minVersion: '1.2.0'
    },
    changelog: [
      {
        version: '3.0.0',
        releaseDate: '2024-01-10',
        notes: 'Versão major com nova arquitetura',
        breaking: true,
        features: ['Nova engine de relatórios', 'Dashboards customizáveis'],
        bugfixes: ['Performance melhorada', 'Correções de sincronização']
      }
    ],
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2024-01-10T14:20:00Z',
    publishedAt: '2023-08-15T00:00:00Z',
    status: 'published'
  },

  {
    id: 'team-chat',
    name: 'team-chat',
    displayName: 'Chat da Equipe',
    description: 'Comunicação instantânea para sua equipe',
    version: '2.3.1',
    author: {
      id: 'dev-5',
      name: 'Communication Co.',
      email: 'team@commco.com',
      verified: true
    },
    category: mockCategories[4],
    tags: ['chat', 'comunicação', 'equipe', 'colaboração'],
    price: {
      type: 'paid',
      amount: 19.90,
      currency: 'R$'
    },
    ratings: {
      average: 4.3,
      count: 432,
      breakdown: { 5: 250, 4: 120, 3: 40, 2: 15, 1: 7 }
    },
    downloads: 9870,
    featured: false,
    trending: false,
    newRelease: false,
    screenshots: [
      '/api/placeholder/800/600?text=Chat+Interface',
      '/api/placeholder/800/600?text=Group+Chat'
    ],
    icon: '/api/placeholder/64/64?text=CHAT',
    permissions: [
      {
        id: 'send-messages',
        name: 'Enviar mensagens',
        description: 'Capacidade de enviar mensagens no chat',
        required: true
      },
      {
        id: 'file-upload',
        name: 'Upload de arquivos',
        description: 'Enviar arquivos no chat',
        required: false
      }
    ],
    dependencies: ['@plataforma/core', '@plataforma/websocket'],
    compatibility: {
      minVersion: '1.1.0'
    },
    changelog: [
      {
        version: '2.3.1',
        releaseDate: '2024-01-18',
        notes: 'Melhorias na interface e correções',
        breaking: false,
        features: ['Emojis customizados', 'Melhor busca'],
        bugfixes: ['Correção em notificações', 'Fix em upload de arquivos']
      }
    ],
    createdAt: '2023-07-15T00:00:00Z',
    updatedAt: '2024-01-18T11:30:00Z',
    publishedAt: '2023-08-01T00:00:00Z',
    status: 'published'
  }
];

// Helper to get featured modules
export const getFeaturedModules = () => mockModules.filter(m => m.featured);

// Helper to get trending modules  
export const getTrendingModules = () => mockModules.filter(m => m.trending);

// Helper to get new releases
export const getNewReleases = () => mockModules.filter(m => m.newRelease);

// Helper to search modules
export const searchModules = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return mockModules.filter(m => 
    m.displayName.toLowerCase().includes(lowerQuery) ||
    m.description.toLowerCase().includes(lowerQuery) ||
    m.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};