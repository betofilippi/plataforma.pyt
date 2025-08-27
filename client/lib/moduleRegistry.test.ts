/**
 * ModuleRegistry Tests
 * Comprehensive test suite for the module registry system
 */

import { ModuleRegistry, ModuleConfig, LoadedModule } from './moduleRegistry';

// Mock React and lazy loading
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  lazy: jest.fn((importFn) => {
    const mockComponent = () => null;
    mockComponent.displayName = 'LazyMockComponent';
    return mockComponent;
  }),
  createElement: jest.fn(() => 'mock-element'),
}));

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
  },
});

// Mock import.meta.hot
const mockHot = {
  accept: jest.fn(),
};
Object.defineProperty(import.meta, 'hot', {
  writable: true,
  value: mockHot,
});

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  const mockModuleConfig: ModuleConfig = {
    id: 'test-module',
    name: 'Test Module',
    icon: 'TestIcon',
    component: './test/TestComponent',
    version: '1.0.0',
    description: 'Test module for testing',
    category: 'core',
    lazy: true,
    preload: false,
    priority: 'normal',
    dependencies: [],
    permissions: ['read'],
    hotReload: true,
    type: 'internal',
    enabled: true,
    tags: ['test', 'mock'],
  };

  beforeEach(() => {
    // Create new registry for each test
    registry = new ModuleRegistry({
      logLevel: 'silent', // Suppress logs during tests
      enableCache: true,
      enableAutoDiscovery: false,
      enableHotReload: false,
    });

    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Module Registration', () => {
    it('should register a module', () => {
      registry.registerModule(mockModuleConfig);
      
      const modules = registry.getAllModules();
      expect(modules).toHaveLength(1); // Built-in sistema module
      
      const registeredModule = modules.find(m => m.id === 'test-module');
      expect(registeredModule).toEqual(mockModuleConfig);
    });

    it('should unregister a module', () => {
      registry.registerModule(mockModuleConfig);
      registry.unregisterModule('test-module');
      
      const modules = registry.getAllModules();
      const registeredModule = modules.find(m => m.id === 'test-module');
      expect(registeredModule).toBeUndefined();
    });

    it('should not register module with duplicate ID', () => {
      registry.registerModule(mockModuleConfig);
      registry.registerModule({ ...mockModuleConfig, name: 'Updated Module' });
      
      const modules = registry.getAllModules();
      const testModules = modules.filter(m => m.id === 'test-module');
      expect(testModules).toHaveLength(1);
      expect(testModules[0].name).toBe('Updated Module');
    });
  });

  describe('Module Loading', () => {
    beforeEach(() => {
      // Mock dynamic import
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-component',
      });
    });

    it('should load a module successfully', async () => {
      registry.registerModule(mockModuleConfig);
      
      const loadedModule = await registry.loadModule('test-module');
      
      expect(loadedModule).not.toBeNull();
      expect(loadedModule!.id).toBe('test-module');
      expect(loadedModule!.status).toBe('loaded');
      expect(loadedModule!.component).toBeDefined();
    });

    it('should return null for non-existent module', async () => {
      const loadedModule = await registry.loadModule('non-existent');
      expect(loadedModule).toBeNull();
    });

    it('should return null for disabled module', async () => {
      const disabledModule: ModuleConfig = {
        ...mockModuleConfig,
        id: 'disabled-module',
        enabled: false,
      };
      
      registry.registerModule(disabledModule);
      const loadedModule = await registry.loadModule('disabled-module');
      
      expect(loadedModule).toBeNull();
    });

    it('should handle loading errors gracefully', async () => {
      global.import = jest.fn().mockRejectedValue(new Error('Import failed'));
      
      registry.registerModule(mockModuleConfig);
      const loadedModule = await registry.loadModule('test-module');
      
      expect(loadedModule).not.toBeNull();
      expect(loadedModule!.status).toBe('error');
      expect(loadedModule!.error).toBeInstanceOf(Error);
    });

    it('should load dependencies before module', async () => {
      const dependencyModule: ModuleConfig = {
        ...mockModuleConfig,
        id: 'dependency-module',
        dependencies: [],
      };
      
      const moduleWithDep: ModuleConfig = {
        ...mockModuleConfig,
        id: 'main-module',
        dependencies: ['dependency-module'],
      };
      
      registry.registerModule(dependencyModule);
      registry.registerModule(moduleWithDep);
      
      const loadedModule = await registry.loadModule('main-module');
      
      expect(loadedModule).not.toBeNull();
      expect(registry.isModuleLoaded('dependency-module')).toBe(true);
      expect(registry.isModuleLoaded('main-module')).toBe(true);
    });

    it('should prevent duplicate loading', async () => {
      registry.registerModule(mockModuleConfig);
      
      const loadPromise1 = registry.loadModule('test-module');
      const loadPromise2 = registry.loadModule('test-module');
      
      const [result1, result2] = await Promise.all([loadPromise1, loadPromise2]);
      
      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      expect(result1!.id).toBe(result2!.id);
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-component',
      });
    });

    it('should cache loaded modules', async () => {
      registry.registerModule(mockModuleConfig);
      
      // First load
      const loadedModule1 = await registry.loadModule('test-module');
      expect(global.import).toHaveBeenCalledTimes(1);
      
      // Second load should use cache
      const loadedModule2 = await registry.loadModule('test-module');
      expect(global.import).toHaveBeenCalledTimes(1); // Still 1, used cache
      
      expect(loadedModule1!.id).toBe(loadedModule2!.id);
      expect(loadedModule2!.accessCount).toBe(2);
    });

    it('should force reload when specified', async () => {
      registry.registerModule(mockModuleConfig);
      
      await registry.loadModule('test-module');
      expect(global.import).toHaveBeenCalledTimes(1);
      
      await registry.loadModule('test-module', true); // Force reload
      expect(global.import).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', async () => {
      registry.registerModule(mockModuleConfig);
      
      await registry.loadModule('test-module');
      expect(registry.isModuleLoaded('test-module')).toBe(true);
      
      registry.clearCache();
      expect(registry.isModuleLoaded('test-module')).toBe(false);
    });

    it('should unload specific module', async () => {
      registry.registerModule(mockModuleConfig);
      
      await registry.loadModule('test-module');
      expect(registry.isModuleLoaded('test-module')).toBe(true);
      
      registry.unloadModule('test-module');
      expect(registry.isModuleLoaded('test-module')).toBe(false);
    });
  });

  describe('Module Queries', () => {
    beforeEach(() => {
      const modules: ModuleConfig[] = [
        {
          ...mockModuleConfig,
          id: 'core-module-1',
          category: 'core',
          priority: 'critical',
          tags: ['core', 'essential'],
        },
        {
          ...mockModuleConfig,
          id: 'business-module-1',
          category: 'business',
          priority: 'high',
          tags: ['business', 'crm'],
        },
        {
          ...mockModuleConfig,
          id: 'integration-module-1',
          category: 'integration',
          priority: 'normal',
          tags: ['api', 'external'],
        },
      ];

      modules.forEach(module => registry.registerModule(module));
    });

    it('should get modules by category', () => {
      const coreModules = registry.getModulesByCategory('core');
      expect(coreModules).toHaveLength(2); // including built-in sistema
      
      const businessModules = registry.getModulesByCategory('business');
      expect(businessModules).toHaveLength(1);
      expect(businessModules[0].id).toBe('business-module-1');
    });

    it('should get modules by priority', () => {
      const criticalModules = registry.getModulesByPriority('critical');
      expect(criticalModules).toHaveLength(2); // including built-in sistema
      
      const highModules = registry.getModulesByPriority('high');
      expect(highModules).toHaveLength(1);
      expect(highModules[0].id).toBe('business-module-1');
    });

    it('should search modules', () => {
      const searchResults = registry.searchModules('business');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('business-module-1');
      
      const tagSearchResults = registry.searchModules('api');
      expect(tagSearchResults).toHaveLength(1);
      expect(tagSearchResults[0].id).toBe('integration-module-1');
    });

    it('should get enabled modules only', () => {
      const disabledModule: ModuleConfig = {
        ...mockModuleConfig,
        id: 'disabled-module',
        enabled: false,
      };
      
      registry.registerModule(disabledModule);
      
      const enabledModules = registry.getEnabledModules();
      const disabledInResults = enabledModules.find(m => m.id === 'disabled-module');
      
      expect(disabledInResults).toBeUndefined();
    });

    it('should find module by predicate', () => {
      const foundModule = registry.find(m => m.category === 'business');
      expect(foundModule).toBeDefined();
      expect(foundModule!.id).toBe('business-module-1');
    });
  });

  describe('Dependencies', () => {
    it('should get module dependencies', () => {
      const moduleWithDeps: ModuleConfig = {
        ...mockModuleConfig,
        id: 'module-with-deps',
        dependencies: ['dep1', 'dep2'],
      };
      
      registry.registerModule(moduleWithDeps);
      
      const dependencies = registry.getModuleDependencies('module-with-deps');
      expect(dependencies).toEqual(['dep1', 'dep2']);
    });

    it('should return empty array for module without dependencies', () => {
      registry.registerModule(mockModuleConfig);
      
      const dependencies = registry.getModuleDependencies('test-module');
      expect(dependencies).toEqual([]);
    });

    it('should return empty array for non-existent module', () => {
      const dependencies = registry.getModuleDependencies('non-existent');
      expect(dependencies).toEqual([]);
    });
  });

  describe('Permissions', () => {
    it('should check module permissions', () => {
      registry.registerModule(mockModuleConfig);
      
      expect(registry.hasPermission('test-module', 'read')).toBe(true);
      expect(registry.hasPermission('test-module', 'write')).toBe(false);
    });

    it('should return false for non-existent module', () => {
      expect(registry.hasPermission('non-existent', 'read')).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', async () => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-component',
      });

      registry.registerModule(mockModuleConfig);
      await registry.loadModule('test-module');
      
      const stats = registry.getStats();
      
      expect(stats).toMatchObject({
        totalModules: expect.any(Number),
        enabledModules: expect.any(Number),
        loadedModules: expect.any(Number),
        errorModules: expect.any(Number),
        loadingModules: expect.any(Number),
        preloadedModules: expect.any(Number),
        cacheSize: expect.any(Number),
        cacheHits: expect.any(Number),
        cacheMisses: expect.any(Number),
        cacheEfficiency: expect.any(Number),
        dependencyGraphSize: expect.any(Number),
        performanceMetricsCount: expect.any(Number),
      });
      
      expect(stats.loadedModules).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    it('should handle NaN cache efficiency', () => {
      const stats = registry.getStats();
      expect(stats.cacheEfficiency).toBe(0); // Should be 0 when no cache hits/misses
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance metrics', async () => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-component',
      });

      const registryWithMetrics = new ModuleRegistry({
        logLevel: 'silent',
        enablePerformanceMonitoring: true,
      });

      registryWithMetrics.registerModule(mockModuleConfig);
      await registryWithMetrics.loadModule('test-module');
      
      const metrics = registryWithMetrics.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('Developer Tools', () => {
    it('should provide dev tools data when enabled', () => {
      const registryWithDevTools = new ModuleRegistry({
        logLevel: 'silent',
        enableDevTools: true,
      });

      const devData = registryWithDevTools.getDevToolsData();
      
      expect(devData).toHaveProperty('moduleConfigs');
      expect(devData).toHaveProperty('loadedModules');
      expect(devData).toHaveProperty('stats');
      expect(devData).toHaveProperty('options');
      expect(devData.error).toBeUndefined();
    });

    it('should return error when dev tools disabled', () => {
      const devData = registry.getDevToolsData();
      expect(devData.error).toBe('Dev tools not enabled');
    });
  });

  describe('Hot Reload', () => {
    it('should setup hot reload when enabled', () => {
      new ModuleRegistry({
        logLevel: 'silent',
        enableHotReload: true,
      });

      expect(mockHot.accept).toHaveBeenCalled();
    });

    it('should not setup hot reload when disabled', () => {
      mockHot.accept.mockClear();
      
      new ModuleRegistry({
        logLevel: 'silent',
        enableHotReload: false,
      });

      expect(mockHot.accept).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should create fallback component for missing module', () => {
      registry.registerModule(mockModuleConfig);
      
      const fallbackComponent = (registry as any).createFallbackComponent('test-module');
      expect(fallbackComponent).toBeDefined();
      expect(typeof fallbackComponent).toBe('function');
    });

    it('should create error component for failed module', () => {
      const error = new Error('Test error');
      const errorComponent = (registry as any).createErrorComponent('test-module', error);
      
      expect(errorComponent).toBeDefined();
      expect(typeof errorComponent).toBe('function');
    });

    it('should validate dependencies for circular references', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const moduleA: ModuleConfig = {
        ...mockModuleConfig,
        id: 'module-a',
        dependencies: ['module-b'],
      };

      const moduleB: ModuleConfig = {
        ...mockModuleConfig,
        id: 'module-b',
        dependencies: ['module-a'], // Circular dependency
      };

      const registryWithValidation = new ModuleRegistry({
        logLevel: 'error',
      });

      registryWithValidation.registerModule(moduleA);
      registryWithValidation.registerModule(moduleB);

      // Should log circular dependency error
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circular dependency detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Lazy Loading', () => {
    it('should create lazy components for lazy modules', async () => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-lazy-component',
      });

      const lazyModule: ModuleConfig = {
        ...mockModuleConfig,
        lazy: true,
      };

      registry.registerModule(lazyModule);
      const loadedModule = await registry.loadModule('test-module');

      expect(loadedModule).not.toBeNull();
      expect(loadedModule!.component).toBeDefined();
    });

    it('should load non-lazy components immediately', async () => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'mock-immediate-component',
      });

      const immediateModule: ModuleConfig = {
        ...mockModuleConfig,
        lazy: false,
      };

      registry.registerModule(immediateModule);
      const loadedModule = await registry.loadModule('test-module');

      expect(loadedModule).not.toBeNull();
      expect(loadedModule!.component).toBeDefined();
    });
  });

  describe('Package Modules', () => {
    it('should handle package modules', async () => {
      global.import = jest.fn().mockResolvedValue({
        default: () => 'package-component',
      });

      const packageModule: ModuleConfig = {
        ...mockModuleConfig,
        type: 'external',
        packageModule: true,
        component: '@external/test-package',
      };

      registry.registerModule(packageModule);
      const loadedModule = await registry.loadModule('test-module');

      expect(loadedModule).not.toBeNull();
      expect(global.import).toHaveBeenCalledWith('@external/test-package');
    });
  });
});