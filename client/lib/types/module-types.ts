/**
 * Module System Types
 * Definições de tipos para o sistema de módulos da plataforma
 */

import { ComponentType, LazyExoticComponent } from 'react';

// Categorias de módulos
export type ModuleCategory = 
  | 'core'
  | 'business' 
  | 'administrative'
  | 'support'
  | 'integration'
  | 'external';

// Status de carregamento do módulo
export type ModuleStatus = 
  | 'loading'
  | 'loaded'
  | 'error'
  | 'unloaded'
  | 'installing'
  | 'updating';

// Permissões do módulo
export type ModulePermission = 
  | 'read'
  | 'write'
  | 'delete'
  | 'admin'
  | 'config';

// Dependências entre módulos
export interface ModuleDependency {
  id: string;
  version?: string;
  optional?: boolean;
  reason?: string;
}

// Configuração avançada do módulo
export interface ModuleMetadata {
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  changelog?: string;
  screenshots?: string[];
  documentation?: string;
  support?: string;
}

// Configuração estendida do módulo
export interface ExtendedModuleConfig {
  // Identificação
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  
  // Visual
  icon: string;
  color?: string;
  banner?: string;
  
  // Carregamento
  component: string;
  lazy: boolean;
  preload?: boolean;
  
  // Classificação
  category: ModuleCategory;
  tags?: string[];
  
  // Permissões e segurança
  permissions?: ModulePermission[];
  requiresAuth?: boolean;
  roles?: string[];
  
  // Dependências
  dependencies?: ModuleDependency[];
  peerDependencies?: ModuleDependency[];
  
  // Configuração
  configurable?: boolean;
  settings?: Record<string, any>;
  
  // Recursos
  hotReload?: boolean;
  offline?: boolean;
  experimental?: boolean;
  
  // Metadados
  metadata?: ModuleMetadata;
  
  // Hooks de ciclo de vida
  onLoad?: (module: LoadedModule) => void;
  onUnload?: (module: LoadedModule) => void;
  onError?: (error: Error) => void;
  onUpdate?: (oldVersion: string, newVersion: string) => void;
}

// Módulo carregado com informações de runtime
export interface ExtendedLoadedModule {
  id: string;
  config: ExtendedModuleConfig;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  
  // Status
  status: ModuleStatus;
  loadedAt: number;
  lastUsed?: number;
  
  // Performance
  loadTime?: number;
  renderCount?: number;
  memoryUsage?: number;
  
  // Erros
  error?: Error;
  warnings?: string[];
  
  // Cache
  cached: boolean;
  cacheKey?: string;
  
  // Dependências resolvidas
  resolvedDependencies?: LoadedModule[];
}

// Contexto do módulo durante execução
export interface ModuleContext {
  moduleId: string;
  version: string;
  config: ExtendedModuleConfig;
  permissions: ModulePermission[];
  user?: {
    id: string;
    roles: string[];
  };
  environment: 'development' | 'production' | 'test';
  api: ModuleAPI;
}

// API disponível para módulos
export interface ModuleAPI {
  // Storage
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  
  // Comunicação entre módulos
  messaging: {
    send: (targetModuleId: string, message: any) => Promise<void>;
    broadcast: (message: any) => Promise<void>;
    subscribe: (event: string, handler: (data: any) => void) => () => void;
    emit: (event: string, data: any) => void;
  };
  
  // Notificações
  notifications: {
    show: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    showPersistent: (id: string, message: string) => void;
    hide: (id: string) => void;
  };
  
  // Logger
  logger: {
    log: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, error?: Error) => void;
    debug: (message: string, data?: any) => void;
  };
  
  // Configurações
  settings: {
    get: (key: string) => any;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Record<string, any>;
    setAll: (settings: Record<string, any>) => Promise<void>;
  };
  
  // UI Components
  ui: {
    modal: (content: ComponentType<any>, options?: any) => Promise<any>;
    toast: (message: string, options?: any) => void;
    confirm: (message: string) => Promise<boolean>;
    prompt: (message: string, defaultValue?: string) => Promise<string | null>;
  };
}

// Eventos do sistema de módulos
export type ModuleEvent = 
  | 'module:registered'
  | 'module:unregistered' 
  | 'module:loading'
  | 'module:loaded'
  | 'module:error'
  | 'module:unloaded'
  | 'module:updated'
  | 'module:installed'
  | 'module:uninstalled';

// Listener de eventos
export interface ModuleEventListener {
  event: ModuleEvent;
  moduleId?: string;
  handler: (data: any) => void;
}

// Configurações do registry
export interface ModuleRegistryConfig {
  // Cache
  enableCache: boolean;
  cacheExpiration?: number;
  maxCacheSize?: number;
  
  // Performance
  lazyLoadThreshold?: number;
  preloadCriticalModules?: string[];
  
  // Development
  enableHotReload: boolean;
  enableDevTools?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // Security
  validateModules?: boolean;
  allowedOrigins?: string[];
  sandboxMode?: boolean;
  
  // Fallbacks
  fallbackComponent?: ComponentType<any>;
  errorBoundary?: ComponentType<any>;
  
  // Callbacks
  onModuleLoad?: (moduleId: string, module: LoadedModule) => void;
  onModuleError?: (moduleId: string, error: Error) => void;
  onModuleUpdate?: (moduleId: string, oldVersion: string, newVersion: string) => void;
}

// Estatísticas detalhadas do registry
export interface ModuleRegistryStats {
  // Contadores
  totalModules: number;
  loadedModules: number;
  errorModules: number;
  loadingModules: number;
  cachedModules: number;
  
  // Performance
  averageLoadTime: number;
  totalMemoryUsage: number;
  cacheHitRate: number;
  
  // Categorias
  modulesByCategory: Record<ModuleCategory, number>;
  modulesByStatus: Record<ModuleStatus, number>;
  
  // Dependências
  dependencyGraph: Record<string, string[]>;
  circularDependencies: string[][];
  
  // Uso
  mostUsedModules: Array<{
    id: string;
    usageCount: number;
    lastUsed: number;
  }>;
  
  // Erros
  recentErrors: Array<{
    moduleId: string;
    error: string;
    timestamp: number;
  }>;
}

// Manifest do módulo (para instalação)
export interface ModuleManifest {
  name: string;
  version: string;
  description?: string;
  main: string;
  files?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  config: Partial<ExtendedModuleConfig>;
  installScript?: string;
  uninstallScript?: string;
}

// Resultado de instalação
export interface ModuleInstallResult {
  success: boolean;
  moduleId: string;
  version: string;
  installedFiles?: string[];
  errors?: string[];
  warnings?: string[];
  installTime: number;
}

// Filtros para busca de módulos
export interface ModuleFilter {
  category?: ModuleCategory;
  status?: ModuleStatus;
  permissions?: ModulePermission[];
  tags?: string[];
  search?: string;
  author?: string;
  installed?: boolean;
}

// Resultado de busca de módulos
export interface ModuleSearchResult {
  modules: ExtendedModuleConfig[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export {
  type ModuleConfig,
  type LoadedModule
} from '../moduleRegistry';