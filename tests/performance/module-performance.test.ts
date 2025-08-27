/**
 * Module Performance Tests
 * Testing performance characteristics of module loading and management
 */

import { performance } from 'perf_hooks';
import { ModuleRegistry } from '../../client/lib/moduleRegistry';
import type { ModuleConfig } from '../../client/lib/moduleRegistry';

// Mock React for testing
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  lazy: jest.fn((importFn) => {
    const mockComponent = () => null;
    mockComponent.displayName = 'LazyMockComponent';
    return mockComponent;
  }),
  createElement: jest.fn(() => 'mock-element'),
}));

// Mock dynamic imports for performance testing
global.import = jest.fn();

describe('Module Performance Tests', () => {
  let registry: ModuleRegistry;

  const createMockModule = (id: string, size: 'small' | 'medium' | 'large' = 'small'): ModuleConfig => {
    const baseModule: ModuleConfig = {
      id,
      name: `Module ${id}`,
      icon: 'TestIcon',
      component: `./modules/${id}`,
      version: '1.0.0',
      description: `Test module ${id}`,
      category: 'business',
      lazy: true,
      preload: false,
      priority: 'normal',
      dependencies: [],
      permissions: ['read'],
      hotReload: true,
      type: 'internal',
      enabled: true,
      tags: ['test'],
    };

    // Simulate different module sizes with different load times
    const loadTimes = {
      small: 50,
      medium: 150,
      large: 500,
    };

    // Mock import with simulated delay
    (global.import as jest.Mock).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ default: () => `Component-${id}` }), loadTimes[size])
      )
    );

    return baseModule;
  };

  beforeEach(() => {
    registry = new ModuleRegistry({
      logLevel: 'silent',
      enableCache: true,
      enablePerformanceMonitoring: true,
      maxCacheSize: 100,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Module Loading Performance', () => {
    it('should load single module within performance threshold', async () => {
      const module = createMockModule('test-module', 'small');
      registry.registerModule(module);

      const startTime = performance.now();
      const loadedModule = await registry.loadModule('test-module');
      const endTime = performance.now();
      
      const loadTime = endTime - startTime;

      expect(loadedModule).not.toBeNull();
      expect(loadTime).toBeLessThan(200); // Should load within 200ms
    });

    it('should load multiple small modules efficiently', async () => {
      const moduleCount = 10;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`module-${i}`, 'small')
      );

      modules.forEach(module => registry.registerModule(module));

      const startTime = performance.now();
      const loadPromises = modules.map(module => registry.loadModule(module.id));
      await Promise.all(loadPromises);
      const endTime = performance.now();

      const totalLoadTime = endTime - startTime;

      // Should load all modules within reasonable time (not linearly scaled)
      expect(totalLoadTime).toBeLessThan(1000); // 1 second for 10 modules
    });

    it('should handle concurrent module loading', async () => {
      const moduleCount = 20;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`concurrent-${i}`, 'medium')
      );

      modules.forEach(module => registry.registerModule(module));

      const startTime = performance.now();
      
      // Load modules concurrently
      const loadPromises = modules.map(module => registry.loadModule(module.id));
      const results = await Promise.all(loadPromises);
      
      const endTime = performance.now();
      const concurrentLoadTime = endTime - startTime;

      // All modules should load successfully
      expect(results.every(result => result !== null)).toBe(true);
      
      // Concurrent loading should be faster than sequential
      expect(concurrentLoadTime).toBeLessThan(3000); // 3 seconds for 20 concurrent modules
    });

    it('should perform well with large modules', async () => {
      const largeModule = createMockModule('large-module', 'large');
      registry.registerModule(largeModule);

      const startTime = performance.now();
      const loadedModule = await registry.loadModule('large-module');
      const endTime = performance.now();

      const loadTime = endTime - startTime;

      expect(loadedModule).not.toBeNull();
      expect(loadTime).toBeLessThan(1000); // Even large modules should load within 1 second
    });
  });

  describe('Cache Performance', () => {
    it('should demonstrate cache performance benefits', async () => {
      const module = createMockModule('cached-module', 'medium');
      registry.registerModule(module);

      // First load (cache miss)
      const firstStartTime = performance.now();
      await registry.loadModule('cached-module');
      const firstEndTime = performance.now();
      const firstLoadTime = firstEndTime - firstStartTime;

      // Second load (cache hit)
      const secondStartTime = performance.now();
      await registry.loadModule('cached-module');
      const secondEndTime = performance.now();
      const secondLoadTime = secondEndTime - secondStartTime;

      // Cached load should be significantly faster
      expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.1); // 10x faster
      expect(secondLoadTime).toBeLessThan(10); // Less than 10ms
    });

    it('should maintain cache performance with many modules', async () => {
      const moduleCount = 50;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`cache-test-${i}`, 'small')
      );

      modules.forEach(module => registry.registerModule(module));

      // Load all modules first time
      await Promise.all(modules.map(module => registry.loadModule(module.id)));

      // Measure cache access performance
      const startTime = performance.now();
      await Promise.all(modules.map(module => registry.loadModule(module.id)));
      const endTime = performance.now();

      const cacheAccessTime = endTime - startTime;

      // All cached modules should load very quickly
      expect(cacheAccessTime).toBeLessThan(100); // Less than 100ms for 50 cached modules
    });

    it('should handle cache eviction efficiently', async () => {
      const registry = new ModuleRegistry({
        logLevel: 'silent',
        enableCache: true,
        maxCacheSize: 5, // Small cache size to force eviction
      });

      const moduleCount = 10;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`eviction-test-${i}`, 'small')
      );

      modules.forEach(module => registry.registerModule(module));

      // Load more modules than cache can hold
      for (const module of modules) {
        await registry.loadModule(module.id);
      }

      const stats = registry.getStats();
      
      // Cache should be at max size
      expect(stats.cacheSize).toBeLessThanOrEqual(5);
      
      // Should have some cache hits and misses
      expect(stats.cacheHits + stats.cacheMisses).toBeGreaterThan(0);
    });
  });

  describe('Memory Performance', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform many load/unload cycles
      for (let i = 0; i < 100; i++) {
        const module = createMockModule(`memory-test-${i}`, 'small');
        registry.registerModule(module);
        await registry.loadModule(module.id);
        registry.unloadModule(module.id);
        registry.unregisterModule(module.id);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should manage memory efficiently with many loaded modules', async () => {
      const moduleCount = 100;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`memory-load-${i}`, 'small')
      );

      const initialMemory = process.memoryUsage();

      modules.forEach(module => registry.registerModule(module));
      await Promise.all(modules.map(module => registry.loadModule(module.id)));

      const loadedMemory = process.memoryUsage();
      const memoryIncrease = loadedMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB for 100 modules)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Clear all modules
      registry.clearCache();
      modules.forEach(module => registry.unregisterModule(module.id));

      const clearedMemory = process.memoryUsage();
      const remainingIncrease = clearedMemory.heapUsed - initialMemory.heapUsed;

      // Most memory should be freed
      expect(remainingIncrease).toBeLessThan(memoryIncrease * 0.5);
    });
  });

  describe('Dependency Resolution Performance', () => {
    it('should resolve dependencies efficiently', async () => {
      // Create modules with dependency chain
      const moduleA = createMockModule('dep-a', 'small');
      const moduleB = { ...createMockModule('dep-b', 'small'), dependencies: ['dep-a'] };
      const moduleC = { ...createMockModule('dep-c', 'small'), dependencies: ['dep-b'] };
      const moduleD = { ...createMockModule('dep-d', 'small'), dependencies: ['dep-c', 'dep-a'] };

      [moduleA, moduleB, moduleC, moduleD].forEach(module => 
        registry.registerModule(module)
      );

      const startTime = performance.now();
      await registry.loadModule('dep-d');
      const endTime = performance.now();

      const resolveTime = endTime - startTime;

      // Should resolve complex dependencies quickly
      expect(resolveTime).toBeLessThan(500);

      // All dependencies should be loaded
      expect(registry.isModuleLoaded('dep-a')).toBe(true);
      expect(registry.isModuleLoaded('dep-b')).toBe(true);
      expect(registry.isModuleLoaded('dep-c')).toBe(true);
      expect(registry.isModuleLoaded('dep-d')).toBe(true);
    });

    it('should handle complex dependency graph efficiently', async () => {
      // Create a complex dependency graph
      const modules = [];
      
      // Base modules (no dependencies)
      for (let i = 0; i < 5; i++) {
        modules.push(createMockModule(`base-${i}`, 'small'));
      }
      
      // Mid-level modules (depend on base)
      for (let i = 0; i < 10; i++) {
        modules.push({
          ...createMockModule(`mid-${i}`, 'small'),
          dependencies: [`base-${i % 5}`]
        });
      }
      
      // Top-level modules (depend on mid-level)
      for (let i = 0; i < 5; i++) {
        modules.push({
          ...createMockModule(`top-${i}`, 'small'),
          dependencies: [`mid-${i}`, `mid-${i + 5}`]
        });
      }

      modules.forEach(module => registry.registerModule(module));

      const startTime = performance.now();
      await Promise.all([
        registry.loadModule('top-0'),
        registry.loadModule('top-1'),
        registry.loadModule('top-2'),
      ]);
      const endTime = performance.now();

      const resolveTime = endTime - startTime;

      // Complex dependency resolution should still be fast
      expect(resolveTime).toBeLessThan(1000);
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent module registrations', async () => {
      const registrations = Array.from({ length: 50 }, (_, i) => 
        () => registry.registerModule(createMockModule(`concurrent-reg-${i}`, 'small'))
      );

      const startTime = performance.now();
      registrations.forEach(reg => reg());
      const endTime = performance.now();

      const registrationTime = endTime - startTime;

      expect(registrationTime).toBeLessThan(100); // Should register quickly
      expect(registry.getAllModules().length).toBeGreaterThan(45); // Most should be registered
    });

    it('should handle concurrent queries efficiently', async () => {
      const moduleCount = 100;
      const modules = Array.from({ length: moduleCount }, (_, i) => 
        createMockModule(`query-test-${i}`, 'small')
      );

      modules.forEach(module => registry.registerModule(module));

      const queries = [
        () => registry.getAllModules(),
        () => registry.getModulesByCategory('business'),
        () => registry.getModulesByPriority('normal'),
        () => registry.searchModules('test'),
        () => registry.getEnabledModules(),
      ];

      const startTime = performance.now();
      
      // Run queries concurrently multiple times
      await Promise.all(
        Array.from({ length: 20 }, () => 
          Promise.all(queries.map(query => query()))
        )
      );
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      // Concurrent queries should complete quickly
      expect(queryTime).toBeLessThan(200);
    });
  });

  describe('Real-world Scenario Performance', () => {
    it('should handle typical application load pattern', async () => {
      // Simulate typical application with various module types
      const coreModules = Array.from({ length: 5 }, (_, i) => ({
        ...createMockModule(`core-${i}`, 'medium'),
        category: 'core' as const,
        priority: 'critical' as const,
        preload: true,
      }));

      const businessModules = Array.from({ length: 15 }, (_, i) => ({
        ...createMockModule(`business-${i}`, 'medium'),
        category: 'business' as const,
        priority: 'high' as const,
      }));

      const integrationModules = Array.from({ length: 10 }, (_, i) => ({
        ...createMockModule(`integration-${i}`, 'large'),
        category: 'integration' as const,
        priority: 'normal' as const,
        dependencies: i < 5 ? [`core-${i}`] : [],
      }));

      const allModules = [...coreModules, ...businessModules, ...integrationModules];
      allModules.forEach(module => registry.registerModule(module));

      const startTime = performance.now();

      // Simulate application startup - load core modules first
      await Promise.all(coreModules.map(m => registry.loadModule(m.id)));

      // Load business modules
      await Promise.all(businessModules.map(m => registry.loadModule(m.id)));

      // Load integration modules (with dependencies)
      for (const module of integrationModules) {
        await registry.loadModule(module.id);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Real-world scenario should complete in reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for full application load

      // All modules should be loaded
      expect(registry.getLoadedModules().length).toBe(allModules.length);

      // Performance metrics should be available
      const stats = registry.getStats();
      expect(stats.loadedModules).toBe(allModules.length);
      expect(stats.cacheEfficiency).toBeGreaterThan(0);
    });

    it('should maintain performance under stress', async () => {
      const stressModules = Array.from({ length: 200 }, (_, i) => 
        createMockModule(`stress-${i}`, i % 3 === 0 ? 'large' : 'small')
      );

      stressModules.forEach(module => registry.registerModule(module));

      const operations = [];

      // Mix of different operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          registry.loadModule(`stress-${i % 200}`),
          Promise.resolve(registry.getAllModules()),
          Promise.resolve(registry.searchModules('stress')),
          Promise.resolve(registry.getStats())
        );
      }

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      const stressTime = endTime - startTime;

      // Should handle stress operations within reasonable time
      expect(stressTime).toBeLessThan(10000); // 10 seconds for stress test

      // System should still be responsive
      const quickQuery = performance.now();
      registry.getAllModules();
      const queryTime = performance.now() - quickQuery;

      expect(queryTime).toBeLessThan(10); // Quick queries should still be fast
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide accurate performance metrics', async () => {
      const registryWithMonitoring = new ModuleRegistry({
        logLevel: 'silent',
        enablePerformanceMonitoring: true,
        enableCache: true,
      });

      const modules = Array.from({ length: 10 }, (_, i) => 
        createMockModule(`metrics-${i}`, 'small')
      );

      modules.forEach(module => registryWithMonitoring.registerModule(module));

      // Load some modules
      await Promise.all(modules.slice(0, 5).map(m => registryWithMonitoring.loadModule(m.id)));

      // Load some modules again (cache hits)
      await Promise.all(modules.slice(0, 3).map(m => registryWithMonitoring.loadModule(m.id)));

      const stats = registryWithMonitoring.getStats();
      const metrics = registryWithMonitoring.getPerformanceMetrics();

      // Should have accurate statistics
      expect(stats.totalModules).toBe(10);
      expect(stats.loadedModules).toBe(5);
      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.cacheMisses).toBeGreaterThan(0);
      expect(stats.cacheEfficiency).toBeGreaterThan(0);

      // Should have performance metrics
      expect(typeof metrics).toBe('object');
    });
  });
});