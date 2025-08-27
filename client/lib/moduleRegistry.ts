/**
 * Module Registry System
 * Sistema dinâmico de gerenciamento de módulos para plataforma.app
 * 
 * ATUALMENTE VAZIO - NÃO HÁ MÓDULOS NO SISTEMA
 * Sistema de configurações não é módulo
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';

// Types para o sistema de módulos
export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  component: string; // Caminho do componente ou package name
  lazy?: boolean;
  dependencies?: string[];
  version?: string;
  description?: string;
  permissions?: string[];
  hotReload?: boolean;
  packageModule?: boolean; // Indica se é um módulo de package
}

export interface LoadedModule {
  id: string;
  config: ModuleConfig;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  loadedAt: number;
  status: 'loading' | 'loaded' | 'error' | 'unloaded';
  error?: Error;
}

export interface ModuleRegistryOptions {
  enableCache?: boolean;
  enableHotReload?: boolean;
  fallbackComponent?: ComponentType<any>;
  onModuleLoad?: (moduleId: string) => void;
  onModuleError?: (moduleId: string, error: Error) => void;
}

class ModuleRegistry {
  private modules = new Map<string, LoadedModule>();
  private moduleConfigs = new Map<string, ModuleConfig>();
  private cache = new Map<string, ComponentType<any>>();
  private options: ModuleRegistryOptions;

  constructor(options: ModuleRegistryOptions = {}) {
    this.options = {
      enableCache: true,
      enableHotReload: process.env.NODE_ENV === 'development',
      ...options
    };

    // Inicializar com módulos padrão
    this.initializeDefaultModules();

    // Setup hot reload se habilitado
    if (this.options.enableHotReload && import.meta.hot) {
      this.setupHotReload();
    }
  }

  /**
   * Inicializa os módulos padrão do sistema
   * NÃO HÁ MÓDULOS - SISTEMA É APENAS CONFIGURAÇÃO
   */
  private initializeDefaultModules() {
    const defaultModules: ModuleConfig[] = [
      // NENHUM MÓDULO - REGISTRY VAZIO
    ];

    // Registrar todos os módulos padrão (nenhum)
    defaultModules.forEach(config => {
      this.moduleConfigs.set(config.id, config);
    });
  }

  /**
   * Setup do hot reload para desenvolvimento
   */
  private setupHotReload() {
    if (import.meta.hot) {
      import.meta.hot.accept((newModule) => {
        console.log('🔥 Hot reload triggered for module registry');
        // Limpar cache para forçar reload
        this.cache.clear();
        // Re-inicializar módulos alterados
        this.reloadModules();
      });
    }
  }

  /**
   * Recarrega todos os módulos (para hot reload)
   */
  private async reloadModules() {
    const loadedModuleIds = Array.from(this.modules.keys());
    
    for (const moduleId of loadedModuleIds) {
      const module = this.modules.get(moduleId);
      if (module && module.config.hotReload) {
        console.log(`🔄 Reloading module: ${moduleId}`);
        await this.loadModule(moduleId, true); // Force reload
      }
    }
  }

  /**
   * Registra um novo módulo no registry
   */
  registerModule(config: ModuleConfig): void {
    console.log(`📦 Registering module: ${config.id}`);
    this.moduleConfigs.set(config.id, config);
    
    // Se o módulo já estava carregado, recarregar
    if (this.modules.has(config.id)) {
      this.loadModule(config.id, true);
    }
  }

  /**
   * Remove um módulo do registry
   */
  unregisterModule(moduleId: string): void {
    console.log(`🗑️ Unregistering module: ${moduleId}`);
    
    this.moduleConfigs.delete(moduleId);
    this.modules.delete(moduleId);
    this.cache.delete(moduleId);
  }

  /**
   * Carrega um módulo sob demanda
   */
  async loadModule(moduleId: string, forceReload = false): Promise<LoadedModule | null> {
    // Verificar se módulo existe no registry
    const config = this.moduleConfigs.get(moduleId);
    if (!config) {
      console.error(`❌ Module not found in registry: ${moduleId}`);
      return null;
    }

    // Verificar cache se não for reload forçado
    if (!forceReload && this.options.enableCache && this.modules.has(moduleId)) {
      const cachedModule = this.modules.get(moduleId)!;
      if (cachedModule.status === 'loaded') {
        console.log(`💾 Loading module from cache: ${moduleId}`);
        return cachedModule;
      }
    }

    console.log(`🚀 Loading module: ${moduleId}`);

    // Criar entrada de módulo em loading
    const loadedModule: LoadedModule = {
      id: moduleId,
      config,
      component: this.createFallbackComponent(moduleId),
      loadedAt: Date.now(),
      status: 'loading'
    };

    this.modules.set(moduleId, loadedModule);

    try {
      // Carregar componente dinamicamente
      const component = await this.loadModuleComponent(config);
      
      loadedModule.component = component;
      loadedModule.status = 'loaded';
      
      console.log(`✅ Module loaded successfully: ${moduleId}`);
      this.options.onModuleLoad?.(moduleId);
      
      return loadedModule;
      
    } catch (error) {
      console.error(`❌ Failed to load module: ${moduleId}`, error);
      
      loadedModule.status = 'error';
      loadedModule.error = error as Error;
      loadedModule.component = this.createErrorComponent(moduleId, error as Error);
      
      this.options.onModuleError?.(moduleId, error as Error);
      
      return loadedModule;
    }
  }

  /**
   * Carrega o componente do módulo usando import dinâmico
   */
  private async loadModuleComponent(config: ModuleConfig): Promise<ComponentType<any> | LazyExoticComponent<ComponentType<any>>> {
    const componentPath = config.component;
    
    if (config.lazy) {
      // Lazy loading
      return lazy(async () => {
        try {
          if (config.packageModule) {
            // Para package modules
            const packageModule = await import(/* @vite-ignore */ componentPath);
            const Component = packageModule.default || packageModule;
            return { default: Component };
          } else {
            // Tentar carregar do caminho principal
            const module = await import(/* @vite-ignore */ componentPath);
            return { default: module.default || module };
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load from ${componentPath}, trying fallback paths...`);
          
          if (!config.packageModule) {
            // Tentar caminhos alternativos
            const fallbackPaths = [
              `/client${componentPath}`,
              `/src${componentPath}`,
              `..${componentPath}`,
              `./pages/${config.id}Module`
            ];
            
            for (const fallbackPath of fallbackPaths) {
              try {
                const fallbackModule = await import(/* @vite-ignore */ fallbackPath);
                console.log(`✅ Loaded from fallback path: ${fallbackPath}`);
                return { default: fallbackModule.default || fallbackModule };
              } catch (fallbackError) {
                // Continue tentando
              }
            }
          }
          
          // Se nenhum caminho funcionou, lançar erro original
          throw error;
        }
      });
    } else {
      // Loading imediato
      if (config.packageModule) {
        // Carregar de um package módulo
        const packageModule = await import(/* @vite-ignore */ componentPath);
        return packageModule.default || packageModule;
      } else {
        const module = await import(/* @vite-ignore */ componentPath);
        return module.default || module;
      }
    }
  }

  /**
   * Cria componente de fallback para módulo não encontrado
   */
  private createFallbackComponent(moduleId: string): ComponentType<any> {
    return this.options.fallbackComponent || (() => {
      return React.createElement('div', 
        { className: 'flex items-center justify-center h-64 text-center' },
        React.createElement('div', 
          { className: 'text-gray-400' },
          React.createElement('div', { className: 'text-6xl mb-4' }, '📦'),
          React.createElement('h3', { className: 'text-lg font-medium mb-2' }, 'Módulo não encontrado'),
          React.createElement('p', { className: 'text-sm' }, `ID: ${moduleId}`),
          React.createElement('p', { className: 'text-xs mt-2' }, 'Verifique se o módulo está instalado corretamente')
        )
      );
    });
  }

  /**
   * Cria componente de erro para módulo que falhou ao carregar
   */
  private createErrorComponent(moduleId: string, error: Error): ComponentType<any> {
    return () => React.createElement('div',
      { className: 'flex items-center justify-center h-64 text-center' },
      React.createElement('div',
        { className: 'text-red-400' },
        React.createElement('div', { className: 'text-6xl mb-4' }, '⚠️'),
        React.createElement('h3', { className: 'text-lg font-medium mb-2' }, 'Erro ao carregar módulo'),
        React.createElement('p', { className: 'text-sm mb-2' }, `ID: ${moduleId}`),
        React.createElement('p', 
          { className: 'text-xs bg-red-900/20 p-2 rounded max-w-md' }, 
          error.message
        )
      )
    );
  }

  /**
   * Obtém um módulo carregado
   */
  getModule(moduleId: string): LoadedModule | null {
    return this.modules.get(moduleId) || null;
  }

  /**
   * Lista todos os módulos registrados
   */
  getAllModules(): ModuleConfig[] {
    return Array.from(this.moduleConfigs.values());
  }

  /**
   * Lista módulos carregados
   */
  getLoadedModules(): LoadedModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Verifica se um módulo está carregado
   */
  isModuleLoaded(moduleId: string): boolean {
    const module = this.modules.get(moduleId);
    return module?.status === 'loaded';
  }

  /**
   * Descarrega um módulo da memória
   */
  unloadModule(moduleId: string): void {
    console.log(`🗑️ Unloading module: ${moduleId}`);
    
    const module = this.modules.get(moduleId);
    if (module) {
      module.status = 'unloaded';
      this.modules.delete(moduleId);
    }
    
    this.cache.delete(moduleId);
  }

  /**
   * Limpa o cache de módulos
   */
  clearCache(): void {
    console.log('🧹 Clearing module cache');
    this.cache.clear();
    
    // Marcar módulos carregados para reload
    this.modules.forEach(module => {
      if (module.status === 'loaded') {
        module.status = 'unloaded';
      }
    });
  }

  /**
   * Obtém estatísticas do registry
   */
  getStats() {
    const totalModules = this.moduleConfigs.size;
    const loadedModules = Array.from(this.modules.values()).filter(m => m.status === 'loaded').length;
    const errorModules = Array.from(this.modules.values()).filter(m => m.status === 'error').length;
    const loadingModules = Array.from(this.modules.values()).filter(m => m.status === 'loading').length;

    return {
      totalModules,
      loadedModules,
      errorModules,
      loadingModules,
      cacheSize: this.cache.size
    };
  }
}

// Instância singleton do registry
export const moduleRegistry = new ModuleRegistry({
  enableCache: true,
  enableHotReload: process.env.NODE_ENV === 'development',
  onModuleLoad: (moduleId) => {
    console.log(`📦 Module loaded: ${moduleId}`);
  },
  onModuleError: (moduleId, error) => {
    console.error(`❌ Module error: ${moduleId}`, error);
  }
});

// Export para uso direto
export default moduleRegistry;
export { ModuleRegistry };
export type { ModuleConfig, LoadedModule, ModuleRegistryOptions };