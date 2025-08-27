/**
 * Module Registry Configuration
 * Configurações centralizadas para o sistema de módulos
 */

import type { ModuleRegistryConfig } from './types/module-types';

/**
 * Configuração padrão do Module Registry
 */
export const defaultModuleRegistryConfig: ModuleRegistryConfig = {
  // Cache settings
  enableCache: true,
  cacheExpiration: 1000 * 60 * 30, // 30 minutos
  maxCacheSize: 100, // Máximo 100 módulos em cache
  
  // Performance settings
  lazyLoadThreshold: 5, // Lazy load após 5 módulos
  preloadCriticalModules: [
    'sistema',
    'database', 
    'ia'
  ], // Módulos críticos para pré-carregar
  
  // Development settings
  enableHotReload: process.env.NODE_ENV === 'development',
  enableDevTools: process.env.NODE_ENV === 'development',
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  
  // Security settings
  validateModules: true,
  allowedOrigins: [
    'http://localhost:3030',
    'http://localhost:3031', 
    'http://localhost:3032',
    'https://plataforma.app'
  ],
  sandboxMode: false, // Disabled for now
  
  // Callbacks
  onModuleLoad: (moduleId: string, module: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 Module loaded: ${moduleId} (${module.config.name})`);
    }
  },
  
  onModuleError: (moduleId: string, error: Error) => {
    console.error(`❌ Module error: ${moduleId}`, error);
    
    // TODO: Enviar para sistema de monitoramento
    if (process.env.NODE_ENV === 'production') {
      // trackError('module_error', { moduleId, error: error.message });
    }
  },
  
  onModuleUpdate: (moduleId: string, oldVersion: string, newVersion: string) => {
    console.log(`🔄 Module updated: ${moduleId} (${oldVersion} → ${newVersion})`);
  }
};

/**
 * Configuração para produção
 */
export const productionModuleRegistryConfig: Partial<ModuleRegistryConfig> = {
  enableCache: true,
  cacheExpiration: 1000 * 60 * 60 * 2, // 2 horas em produção
  enableHotReload: false,
  enableDevTools: false,
  logLevel: 'error',
  validateModules: true,
  sandboxMode: true
};

/**
 * Configuração para desenvolvimento
 */
export const developmentModuleRegistryConfig: Partial<ModuleRegistryConfig> = {
  enableCache: true,
  cacheExpiration: 1000 * 60 * 5, // 5 minutos em dev
  enableHotReload: true,
  enableDevTools: true,
  logLevel: 'debug',
  validateModules: false, // Menos rigoroso em dev
  sandboxMode: false
};

/**
 * Obtém a configuração baseada no ambiente
 */
export function getModuleRegistryConfig(): ModuleRegistryConfig {
  const baseConfig = defaultModuleRegistryConfig;
  
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseConfig,
      ...productionModuleRegistryConfig
    };
  } else if (process.env.NODE_ENV === 'development') {
    return {
      ...baseConfig,
      ...developmentModuleRegistryConfig
    };
  }
  
  return baseConfig;
}

/**
 * Configurações de módulos específicos
 */
export const moduleSpecificConfigs = {
  // Módulos que devem ser pré-carregados
  preload: [
    'sistema',
    'database'
  ],
  
  // Módulos que suportam hot reload
  hotReloadEnabled: [
    'ia',
    'sistema',
    'database'
  ],
  
  // Módulos que devem ser carregados lazy
  lazyLoad: [
    'estoque',
    'montagem',
    'vendas',
    'faturamento',
    'expedicao',
    'rh',
    'administrativo',
    'financeiro',
    'juridico',
    'tributario',
    'suporte',
    'comunicacao',
    'marketing',
    'produtos',
    'lojas',
    'cadastros',
    'notificacoes'
  ],
  
  // Dependências críticas
  dependencies: {
    'ia': ['sistema'],
    'database': ['sistema'],
    'estoque': ['database'],
    'vendas': ['estoque', 'database'],
    'faturamento': ['vendas', 'database'],
    'expedicao': ['faturamento', 'database']
  },
  
  // Permissões por módulo
  permissions: {
    'sistema': ['admin', 'config'],
    'database': ['admin', 'read', 'write'],
    'ia': ['read', 'write'],
    'financeiro': ['read', 'write', 'admin'],
    'rh': ['read', 'write', 'admin'],
    'juridico': ['read', 'write', 'admin']
  }
};

/**
 * Mapeamento de ícones Material-UI para módulos
 */
export const moduleIconMapping = {
  // Core
  'ia': 'Psychology',
  'database': 'Database',
  'sistema': 'Settings',
  
  // Business
  'estoque': 'Inventory',
  'montagem': 'Build',
  'vendas': 'Sell',
  'faturamento': 'Receipt',
  'expedicao': 'LocalShipping',
  
  // Administrative
  'rh': 'Group',
  'administrativo': 'BusinessCenter',
  'financeiro': 'AttachMoney',
  'juridico': 'Gavel',
  'tributario': 'Calculate',
  
  // Support
  'suporte': 'Support',
  'comunicacao': 'Chat',
  'marketing': 'Campaign',
  'produtos': 'Inventory2',
  'lojas': 'Store',
  'cadastros': 'PersonAdd',
  'notificacoes': 'Notifications'
};

/**
 * Cores por categoria de módulo
 */
export const moduleCategoryColors = {
  'core': '#3b82f6',      // blue
  'business': '#10b981',   // emerald
  'administrative': '#f59e0b', // amber
  'support': '#8b5cf6',    // violet
  'integration': '#06b6d4', // cyan
  'external': '#84cc16'    // lime
};

/**
 * Templates de componentes fallback
 */
export const fallbackComponentTemplates = {
  loading: `
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-400">Carregando módulo...</p>
      </div>
    </div>
  `,
  
  error: `
    <div className="flex items-center justify-center h-64 text-center">
      <div className="text-red-400">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium mb-2">Erro ao carregar módulo</h3>
        <p className="text-sm text-gray-400">Verifique a console para mais detalhes</p>
      </div>
    </div>
  `,
  
  notFound: `
    <div className="flex items-center justify-center h-64 text-center">
      <div className="text-gray-400">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-medium mb-2">Módulo não encontrado</h3>
        <p className="text-sm">Este módulo não está disponível ou instalado</p>
      </div>
    </div>
  `
};

/**
 * Configuração de rotas dos módulos
 */
export const moduleRouteConfig = {
  basePath: '/modules',
  routes: {
    'ia': '/ia',
    'database': '/database', 
    'sistema': '/sistema',
    'estoque': '/estoque',
    'montagem': '/montagem',
    'vendas': '/vendas',
    'faturamento': '/faturamento',
    'expedicao': '/expedicao',
    'rh': '/rh',
    'administrativo': '/administrativo',
    'financeiro': '/financeiro',
    'juridico': '/juridico',
    'tributario': '/tributario',
    'suporte': '/suporte',
    'comunicacao': '/comunicacao',
    'marketing': '/marketing',
    'produtos': '/produtos',
    'lojas': '/lojas',
    'cadastros': '/cadastros',
    'notificacoes': '/notificacoes'
  }
};

export default {
  defaultConfig: defaultModuleRegistryConfig,
  getConfig: getModuleRegistryConfig,
  moduleConfigs: moduleSpecificConfigs,
  icons: moduleIconMapping,
  colors: moduleCategoryColors,
  templates: fallbackComponentTemplates,
  routes: moduleRouteConfig
};