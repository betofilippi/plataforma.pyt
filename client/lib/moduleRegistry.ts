/**
 * Module Registry System - ROBUST ARCHITECTURE
 * Sistema robusto de gerenciamento de módulos para 20+ módulos
 * 
 * FEATURES:
 * - Auto-discovery de módulos
 * - Lazy loading inteligente com cache
 * - Hot-reload sem restart
 * - Gestão de dependências
 * - Performance optimization
 * - Developer tools
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';

// Enhanced Types para o sistema robusto de módulos
export interface ModuleConfig {
  // Core properties
  id: string;
  name: string;
  icon: string;
  component: string;
  
  // Advanced properties
  version: string;
  description: string;
  category: 'core' | 'business' | 'administrative' | 'support' | 'integration' | 'external';
  
  // Loading configuration
  lazy: boolean;
  preload: boolean;
  priority: 'critical' | 'high' | 'normal' | 'low';
  
  // Dependencies & permissions
  dependencies: string[];
  permissions: string[];
  requiredRoles?: string[];
  
  // Development features
  hotReload: boolean;
  devMode?: boolean;
  
  // Module type
  type: 'internal' | 'external' | 'package';
  packageModule?: boolean;
  
  // Paths & routes
  route?: string;
  basePath?: string;
  
  // Metadata
  author?: string;
  tags?: string[];
  lastUpdated?: Date;
  
  // Feature flags
  enabled: boolean;
  beta?: boolean;
  experimental?: boolean;
}

export interface LoadedModule {
  id: string;
  config: ModuleConfig;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  loadedAt: number;
  lastAccessed: number;
  status: 'loading' | 'loaded' | 'error' | 'unloaded' | 'reloading';
  error?: Error;
  
  // Performance metrics
  loadTime?: number;
  memoryUsage?: number;
  accessCount: number;
}

// Auto-discovery configuration
export interface ModuleDiscoveryConfig {
  paths: string[];
  patterns: string[];
  exclude?: string[];
  enableWatch?: boolean;
}

// Enhanced registry options
export interface ModuleRegistryOptions {
  // Cache configuration
  enableCache: boolean;
  cacheExpiration: number;
  maxCacheSize: number;
  
  // Performance settings
  lazyLoadThreshold: number;
  preloadCriticalModules: string[];
  enablePerformanceMonitoring: boolean;
  
  // Development features
  enableHotReload: boolean;
  enableDevTools: boolean;
  enableAutoDiscovery: boolean;
  discoveryConfig?: ModuleDiscoveryConfig;
  
  // Security & validation
  validateModules: boolean;
  sandboxMode: boolean;
  allowedOrigins?: string[];
  
  // Callbacks
  fallbackComponent?: ComponentType<any>;
  onModuleLoad?: (moduleId: string, module: LoadedModule) => void;
  onModuleError?: (moduleId: string, error: Error) => void;
  onModuleUpdate?: (moduleId: string, oldVersion: string, newVersion: string) => void;
  onModuleUnload?: (moduleId: string) => void;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

class ModuleRegistry {
  private modules = new Map<string, LoadedModule>();
  private moduleConfigs = new Map<string, ModuleConfig>();
  private cache = new Map<string, ComponentType<any>>();
  private dependencyGraph = new Map<string, string[]>();
  private loadingQueue = new Set<string>();
  private performanceMetrics = new Map<string, any>();
  private options: ModuleRegistryOptions;

  // Auto-discovery state
  private discoveredModules = new Map<string, ModuleConfig>();
  private watchedPaths = new Set<string>();
  
  // Performance optimization
  private preloadedModules = new Set<string>();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(options: Partial<ModuleRegistryOptions> = {}) {
    // Enhanced default options
    this.options = {
      enableCache: true,
      cacheExpiration: 1000 * 60 * 30, // 30 minutes
      maxCacheSize: 100,
      
      lazyLoadThreshold: 5,
      preloadCriticalModules: ['sistema', 'database'],
      enablePerformanceMonitoring: true,
      
      enableHotReload: process.env.NODE_ENV === 'development',
      enableDevTools: process.env.NODE_ENV === 'development',
      enableAutoDiscovery: true,
      
      validateModules: true,
      sandboxMode: false,
      
      logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
      
      discoveryConfig: {
        paths: [
          './client/modules',
          './client/modulos', 
          './client/pages/modules'
        ],
        patterns: ['**/*.module.tsx', '**/*Module.tsx', '**/index.tsx'],
        exclude: ['**/node_modules/**', '**/*.test.tsx', '**/*.spec.tsx'],
        enableWatch: process.env.NODE_ENV === 'development'
      },
      
      ...options
    };

    this.log('info', '🚀 Initializing Module Registry with robust architecture');

    // Initialize module system
    this.initializeModuleSystem();

    // Setup auto-discovery if enabled
    if (this.options.enableAutoDiscovery) {
      this.initializeAutoDiscovery();
    }

    // Setup hot reload se habilitado
    if (this.options.enableHotReload && import.meta.hot) {
      this.setupAdvancedHotReload();
    }

    // Preload critical modules
    this.preloadCriticalModules();
  }

  /**
   * Log with configurable levels
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
    const currentLevel = levels[this.options.logLevel];
    const messageLevel = levels[level];
    
    if (messageLevel >= currentLevel) {
      const prefix = {
        debug: '🐛',
        info: '📦',
        warn: '⚠️',
        error: '❌'
      }[level];
      
      console[level](`${prefix} [ModuleRegistry]`, message, ...args);
    }
  }

  /**
   * Initialize comprehensive module system
   */
  private initializeModuleSystem() {
    this.log('debug', 'Initializing comprehensive module system');
    
    // Load built-in modules
    this.initializeBuiltInModules();
    
    // Initialize dependency graph
    this.buildDependencyGraph();
    
    // Setup performance monitoring
    if (this.options.enablePerformanceMonitoring) {
      this.initializePerformanceMonitoring();
    }
  }

  /**
   * Initialize built-in system modules
   */
  private initializeBuiltInModules() {
    const builtInModules: ModuleConfig[] = [
      // NENHUM MÓDULO - Registry vazio como solicitado
      // Sistema não é um módulo, é uma configuração
      
      // Future modules structure (commented for now but ready for implementation)
      /*
      {
        id: 'database',
        name: 'DATABASE MANAGER',
        description: 'Gerenciamento de banco de dados e conexões',
        icon: 'Database',
        component: './modules/DatabaseModule',
        version: '1.0.0',
        category: 'core',
        type: 'internal',
        lazy: true,
        preload: true,
        priority: 'critical',
        dependencies: ['sistema'],
        permissions: ['admin', 'database'],
        hotReload: true,
        route: '/database',
        enabled: true,
        tags: ['core', 'database']
      },
      
      {
        id: 'ia',
        name: 'INTELIGÊNCIA ARTIFICIAL',
        description: 'Módulo de IA e machine learning',
        icon: 'Psychology',
        component: './modules/IAModule',
        version: '1.0.0',
        category: 'integration',
        type: 'internal',
        lazy: true,
        preload: false,
        priority: 'high',
        dependencies: ['sistema', 'database'],
        permissions: ['read', 'write'],
        hotReload: true,
        route: '/ia',
        enabled: true,
        tags: ['ai', 'ml', 'integration']
      }
      */
    ];

    this.log('debug', `Registering ${builtInModules.length} built-in modules`);
    
    builtInModules.forEach(config => {
      this.moduleConfigs.set(config.id, config);
      this.log('debug', `Registered built-in module: ${config.id} (${config.name})`);
    });
  }

  /**
   * Build dependency graph for modules
   */
  private buildDependencyGraph() {
    this.log('debug', 'Building dependency graph');
    
    this.moduleConfigs.forEach(config => {
      if (config.dependencies.length > 0) {
        this.dependencyGraph.set(config.id, config.dependencies);
      }
    });
    
    // Validate no circular dependencies
    this.validateDependencies();
  }

  /**
   * Validate dependencies for circular references
   */
  private validateDependencies() {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (moduleId: string): boolean => {
      visited.add(moduleId);
      recursionStack.add(moduleId);
      
      const dependencies = this.dependencyGraph.get(moduleId) || [];
      
      for (const dep of dependencies) {
        if (!visited.has(dep) && hasCycle(dep)) {
          return true;
        } else if (recursionStack.has(dep)) {
          this.log('error', `Circular dependency detected: ${moduleId} -> ${dep}`);
          return true;
        }
      }
      
      recursionStack.delete(moduleId);
      return false;
    };
    
    for (const moduleId of this.moduleConfigs.keys()) {
      if (!visited.has(moduleId)) {
        hasCycle(moduleId);
      }
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring() {
    this.log('debug', 'Initializing performance monitoring');
    
    // Track cache performance
    setInterval(() => {
      const cacheEfficiency = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;
      this.performanceMetrics.set('cacheEfficiency', cacheEfficiency);
      
      if (this.options.logLevel === 'debug') {
        this.log('debug', `Cache efficiency: ${cacheEfficiency.toFixed(2)}%`);
      }
    }, 60000); // Every minute
  }

  /**
   * Auto-discovery system
   */
  private async initializeAutoDiscovery() {
    this.log('info', 'Initializing auto-discovery system');
    
    if (!this.options.discoveryConfig) return;
    
    try {
      // Discover modules from filesystem
      await this.discoverModules();
      
      // Setup file watching if enabled
      if (this.options.discoveryConfig.enableWatch) {
        this.setupModuleWatcher();
      }
    } catch (error) {
      this.log('error', 'Failed to initialize auto-discovery', error);
    }
  }

  /**
   * Discover modules from filesystem
   */
  private async discoverModules() {
    const { paths, patterns } = this.options.discoveryConfig!;
    
    this.log('debug', `Discovering modules in paths: ${paths.join(', ')}`);
    
    // For now, we'll use a simulated discovery
    // In a real implementation, this would use filesystem APIs or build-time code generation
    const discoveredModules = await this.simulateModuleDiscovery(paths, patterns);
    
    discoveredModules.forEach(config => {
      this.discoveredModules.set(config.id, config);
      this.log('debug', `Discovered module: ${config.id}`);
    });
  }

  /**
   * Simulate module discovery (placeholder for real implementation)
   */
  private async simulateModuleDiscovery(paths: string[], patterns: string[]): Promise<ModuleConfig[]> {
    // This would be replaced with actual filesystem scanning or build-time generation
    return [];
  }

  /**
   * Setup file system watcher for modules
   */
  private setupModuleWatcher() {
    if (!this.options.discoveryConfig?.enableWatch) return;
    
    this.log('debug', 'Setting up module file watcher');
    
    // In a real implementation, this would use fs.watch or chokidar
    // For now, we'll use a polling mechanism
    setInterval(() => {
      this.checkForModuleChanges();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for module changes
   */
  private async checkForModuleChanges() {
    // Placeholder for actual file change detection
    // Would compare file modification times and trigger reloads
  }

  /**
   * Preload critical modules
   */
  private async preloadCriticalModules() {
    this.log('info', 'Preloading critical modules');
    
    const criticalModules = this.options.preloadCriticalModules;
    
    for (const moduleId of criticalModules) {
      try {
        const config = this.moduleConfigs.get(moduleId);
        if (config?.preload) {
          this.log('debug', `Preloading critical module: ${moduleId}`);
          await this.loadModule(moduleId);
          this.preloadedModules.add(moduleId);
        }
      } catch (error) {
        this.log('warn', `Failed to preload critical module ${moduleId}:`, error);
      }
    }
  }

  /**
   * Advanced hot reload setup
   */
  private setupAdvancedHotReload() {
    if (import.meta.hot) {
      this.log('debug', 'Setting up advanced hot reload');
      
      import.meta.hot.accept((newModule) => {
        this.log('info', '🔥 Hot reload triggered - performing intelligent reload');
        
        // Intelligent cache invalidation
        this.intelligentCacheInvalidation();
        
        // Re-initialize changed modules
        this.reloadChangedModules();
        
        // Update dependency graph
        this.buildDependencyGraph();
      });
    }
  }

  /**
   * Intelligent cache invalidation
   */
  private intelligentCacheInvalidation() {
    // Clear only modules that need reloading
    const modulesToInvalidate = Array.from(this.modules.keys())
      .filter(moduleId => {
        const module = this.modules.get(moduleId);
        return module?.config.hotReload;
      });
    
    modulesToInvalidate.forEach(moduleId => {
      this.cache.delete(moduleId);
      this.log('debug', `Invalidated cache for: ${moduleId}`);
    });
  }

  /**
   * Reload changed modules intelligently
   */
  private async reloadChangedModules() {
    const loadedModuleIds = Array.from(this.modules.keys());
    
    for (const moduleId of loadedModuleIds) {
      const module = this.modules.get(moduleId);
      if (module && module.config.hotReload) {
        this.log('debug', `🔄 Reloading module: ${moduleId}`);
        module.status = 'reloading';
        
        try {
          await this.loadModule(moduleId, true); // Force reload
        } catch (error) {
          this.log('error', `Failed to reload module ${moduleId}:`, error);
        }
      }
    }
  }

  /**
   * Load modules with dependency resolution
   */
  private async loadModulesWithDependencies(moduleIds: string[]): Promise<Map<string, LoadedModule>> {
    const loadedModules = new Map<string, LoadedModule>();
    const loadQueue = new Set<string>();
    
    // Build load queue with dependencies
    const addToQueue = (moduleId: string) => {
      if (loadQueue.has(moduleId)) return;
      
      const config = this.moduleConfigs.get(moduleId);
      if (!config) return;
      
      // Add dependencies first
      config.dependencies.forEach(dep => addToQueue(dep));
      loadQueue.add(moduleId);
    };
    
    moduleIds.forEach(moduleId => addToQueue(moduleId));
    
    // Load in dependency order
    for (const moduleId of loadQueue) {
      try {
        const module = await this.loadModule(moduleId);
        if (module) {
          loadedModules.set(moduleId, module);
        }
      } catch (error) {
        this.log('error', `Failed to load module ${moduleId}:`, error);
      }
    }
    
    return loadedModules;
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
   * Enhanced module loading with dependency resolution and performance tracking
   */
  async loadModule(moduleId: string, forceReload = false): Promise<LoadedModule | null> {
    const startTime = performance.now();
    
    // Check if module exists
    const config = this.moduleConfigs.get(moduleId) || this.discoveredModules.get(moduleId);
    if (!config) {
      this.log('error', `Module not found in registry: ${moduleId}`);
      return null;
    }

    // Check if module is enabled
    if (!config.enabled) {
      this.log('warn', `Module ${moduleId} is disabled`);
      return null;
    }

    // Prevent duplicate loading
    if (this.loadingQueue.has(moduleId)) {
      this.log('debug', `Module ${moduleId} is already being loaded`);
      return this.waitForModuleLoad(moduleId);
    }

    // Check cache if not force reload
    if (!forceReload && this.options.enableCache && this.modules.has(moduleId)) {
      const cachedModule = this.modules.get(moduleId)!;
      if (cachedModule.status === 'loaded') {
        // Update access metrics
        cachedModule.lastAccessed = Date.now();
        cachedModule.accessCount++;
        this.cacheHits++;
        
        this.log('debug', `Loading module from cache: ${moduleId}`);
        return cachedModule;
      }
    }

    this.cacheMisses++;
    this.loadingQueue.add(moduleId);

    this.log('info', `🚀 Loading module: ${moduleId} (${config.name})`);

    // Load dependencies first
    if (config.dependencies.length > 0) {
      this.log('debug', `Loading dependencies for ${moduleId}: ${config.dependencies.join(', ')}`);
      await this.loadModulesWithDependencies(config.dependencies);
    }

    // Create loading module entry
    const loadedModule: LoadedModule = {
      id: moduleId,
      config,
      component: this.createFallbackComponent(moduleId),
      loadedAt: Date.now(),
      lastAccessed: Date.now(),
      status: 'loading',
      accessCount: 1
    };

    this.modules.set(moduleId, loadedModule);

    try {
      // Load component with performance tracking
      const component = await this.loadModuleComponent(config);
      
      const loadTime = performance.now() - startTime;
      
      // Update module state
      loadedModule.component = component;
      loadedModule.status = 'loaded';
      loadedModule.loadTime = loadTime;
      
      // Performance tracking
      if (this.options.enablePerformanceMonitoring) {
        this.performanceMetrics.set(`${moduleId}.loadTime`, loadTime);
      }
      
      this.log('info', `✅ Module loaded successfully: ${moduleId} (${loadTime.toFixed(2)}ms)`);
      this.options.onModuleLoad?.(moduleId, loadedModule);
      
      return loadedModule;
      
    } catch (error) {
      this.log('error', `Failed to load module: ${moduleId}`, error);
      
      loadedModule.status = 'error';
      loadedModule.error = error as Error;
      loadedModule.component = this.createErrorComponent(moduleId, error as Error);
      
      this.options.onModuleError?.(moduleId, error as Error);
      
      return loadedModule;
    } finally {
      this.loadingQueue.delete(moduleId);
    }
  }

  /**
   * Wait for module to finish loading
   */
  private async waitForModuleLoad(moduleId: string): Promise<LoadedModule | null> {
    return new Promise((resolve) => {
      const checkModule = () => {
        const module = this.modules.get(moduleId);
        if (module && (module.status === 'loaded' || module.status === 'error')) {
          resolve(module);
        } else {
          setTimeout(checkModule, 100);
        }
      };
      checkModule();
    });
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
   * Find module by ID (for compatibility with existing code)
   */
  find(predicate: (config: ModuleConfig) => boolean): ModuleConfig | undefined {
    const allConfigs = [...this.moduleConfigs.values(), ...this.discoveredModules.values()];
    return allConfigs.find(predicate);
  }

  /**
   * Get module by category
   */
  getModulesByCategory(category: string): ModuleConfig[] {
    const allConfigs = [...this.moduleConfigs.values(), ...this.discoveredModules.values()];
    return allConfigs.filter(config => config.category === category && config.enabled);
  }

  /**
   * Get modules by priority
   */
  getModulesByPriority(priority: 'critical' | 'high' | 'normal' | 'low'): ModuleConfig[] {
    const allConfigs = [...this.moduleConfigs.values(), ...this.discoveredModules.values()];
    return allConfigs.filter(config => config.priority === priority && config.enabled);
  }

  /**
   * Search modules by name, description, or tags
   */
  searchModules(query: string): ModuleConfig[] {
    const allConfigs = [...this.moduleConfigs.values(), ...this.discoveredModules.values()];
    const lowercaseQuery = query.toLowerCase();
    
    return allConfigs.filter(config => 
      config.enabled && (
        config.name.toLowerCase().includes(lowercaseQuery) ||
        config.description.toLowerCase().includes(lowercaseQuery) ||
        config.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
      )
    );
  }

  /**
   * Get enabled modules only
   */
  getEnabledModules(): ModuleConfig[] {
    const allConfigs = [...this.moduleConfigs.values(), ...this.discoveredModules.values()];
    return allConfigs.filter(config => config.enabled);
  }

  /**
   * Get module dependencies
   */
  getModuleDependencies(moduleId: string): string[] {
    const config = this.moduleConfigs.get(moduleId) || this.discoveredModules.get(moduleId);
    return config?.dependencies || [];
  }

  /**
   * Check if module has permission
   */
  hasPermission(moduleId: string, permission: string): boolean {
    const config = this.moduleConfigs.get(moduleId) || this.discoveredModules.get(moduleId);
    return config?.permissions.includes(permission) || false;
  }

  /**
   * Get advanced statistics
   */
  getStats() {
    const totalModules = this.moduleConfigs.size + this.discoveredModules.size;
    const enabledModules = this.getEnabledModules().length;
    const loadedModules = Array.from(this.modules.values()).filter(m => m.status === 'loaded').length;
    const errorModules = Array.from(this.modules.values()).filter(m => m.status === 'error').length;
    const loadingModules = Array.from(this.modules.values()).filter(m => m.status === 'loading').length;
    const preloadedCount = this.preloadedModules.size;
    
    const cacheEfficiency = this.cacheHits / (this.cacheHits + this.cacheMisses) * 100;

    return {
      totalModules,
      enabledModules,
      loadedModules,
      errorModules,
      loadingModules,
      preloadedModules: preloadedCount,
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheEfficiency: isNaN(cacheEfficiency) ? 0 : cacheEfficiency,
      dependencyGraphSize: this.dependencyGraph.size,
      performanceMetricsCount: this.performanceMetrics.size
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return Object.fromEntries(this.performanceMetrics);
  }

  /**
   * Developer tools - get internal state
   */
  getDevToolsData() {
    if (!this.options.enableDevTools) {
      return { error: 'Dev tools not enabled' };
    }

    return {
      moduleConfigs: Object.fromEntries(this.moduleConfigs),
      discoveredModules: Object.fromEntries(this.discoveredModules),
      loadedModules: Object.fromEntries(this.modules),
      dependencyGraph: Object.fromEntries(this.dependencyGraph),
      cache: Array.from(this.cache.keys()),
      loadingQueue: Array.from(this.loadingQueue),
      preloadedModules: Array.from(this.preloadedModules),
      performanceMetrics: this.getPerformanceMetrics(),
      stats: this.getStats(),
      options: this.options
    };
  }

  /**
   * Cache management - cleanup expired modules
   */
  private cleanupExpiredCache() {
    const now = Date.now();
    const expiredModules = Array.from(this.modules.entries())
      .filter(([_, module]) => 
        now - module.lastAccessed > this.options.cacheExpiration
      )
      .map(([id]) => id);

    expiredModules.forEach(moduleId => {
      this.unloadModule(moduleId);
      this.log('debug', `Cleaned up expired module from cache: ${moduleId}`);
    });

    // Enforce max cache size
    if (this.modules.size > this.options.maxCacheSize) {
      const sortedByAccess = Array.from(this.modules.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toRemove = sortedByAccess.slice(0, this.modules.size - this.options.maxCacheSize);
      toRemove.forEach(([moduleId]) => {
        this.unloadModule(moduleId);
        this.log('debug', `Removed module due to cache size limit: ${moduleId}`);
      });
    }
  }
}

// Enhanced singleton instance with robust configuration
export const moduleRegistry = new ModuleRegistry({
  // Cache settings
  enableCache: true,
  cacheExpiration: process.env.NODE_ENV === 'development' ? 1000 * 60 * 5 : 1000 * 60 * 30,
  maxCacheSize: 50,
  
  // Performance settings
  lazyLoadThreshold: 5,
  preloadCriticalModules: [], // Empty - Sistema is not a module
  enablePerformanceMonitoring: false, // Disabled to fix initialization
  
  // Development features
  enableHotReload: false, // Disabled to fix initialization
  enableDevTools: process.env.NODE_ENV === 'development',
  enableAutoDiscovery: false, // Disabled to fix initialization
  
  // Security settings
  validateModules: true,
  sandboxMode: false,
  
  // Logging
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  
  // Callbacks
  onModuleLoad: (moduleId, module) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 [ModuleRegistry] Module loaded: ${moduleId} (${module.config.name})`);
    }
  },
  
  onModuleError: (moduleId, error) => {
    console.error(`❌ [ModuleRegistry] Module error: ${moduleId}`, error);
  },
  
  onModuleUpdate: (moduleId, oldVersion, newVersion) => {
    console.log(`🔄 [ModuleRegistry] Module updated: ${moduleId} (${oldVersion} → ${newVersion})`);
  },
  
  onModuleUnload: (moduleId) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🗑️ [ModuleRegistry] Module unloaded: ${moduleId}`);
    }
  }
});

// Setup periodic cache cleanup
if (typeof window !== 'undefined') {
  setInterval(() => {
    // Method is private, so we can't call it directly
    // This is a temporary workaround
    try {
      (moduleRegistry as any).cleanupExpiredCache?.();
    } catch (err) {
      console.warn('Cache cleanup failed:', err);
    }
  }, 1000 * 60 * 10); // Every 10 minutes
}

// Global debug access in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).__moduleRegistry = moduleRegistry;
  console.log('🛠️ [ModuleRegistry] Debug access available at window.__moduleRegistry');
}

// Export for use
export default moduleRegistry;
export { ModuleRegistry };
export type { 
  ModuleConfig, 
  LoadedModule, 
  ModuleRegistryOptions, 
  ModuleDiscoveryConfig 
};