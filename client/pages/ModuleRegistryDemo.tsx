import React, { useState, useEffect } from 'react';
import { useModuleRegistry } from '@/lib/useModule';
import ModuleRegistryDevTools from '@/components/ModuleRegistryDevTools';
import { WindowCard, WindowButton, WindowInput } from '@/components/ui';
import { 
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  Database, 
  Brain, 
  Package, 
  Settings 
} from 'lucide-react';

interface ModuleRegistryDemoProps {
  className?: string;
}

export default function ModuleRegistryDemo({ className }: ModuleRegistryDemoProps) {
  const {
    stats,
    refreshStats,
    getAllModules,
    getLoadedModules,
    registerModule,
    clearCache
  } = useModuleRegistry();

  const [isSimulating, setIsSimulating] = useState(false);
  const [newModuleId, setNewModuleId] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');

  useEffect(() => {
    // Auto-refresh stats during simulation
    let interval: NodeJS.Timeout;
    if (isSimulating) {
      interval = setInterval(() => {
        refreshStats();
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating, refreshStats]);

  const simulateModuleActivities = async () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    console.log('🎭 Starting module activity simulation...');

    try {
      // Simulate loading various modules
      const moduleToLoad = ['sistema', 'database', 'ia'];
      
      for (const moduleId of moduleToLoad) {
        if (typeof window !== 'undefined' && (window as any).__moduleRegistry) {
          const registry = (window as any).__moduleRegistry;
          console.log(`🔄 Simulating load of module: ${moduleId}`);
          
          // Simulate some delay and then try to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            await registry.loadModule(moduleId);
          } catch (error) {
            console.log(`⚠️ Expected error loading demo module ${moduleId}:`, error);
          }
        }
        
        refreshStats();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Simulate cache operations
      console.log('🧹 Simulating cache operations...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create some mock modules for demonstration
      const demoModules = [
        {
          id: 'demo-analytics',
          name: 'ANALYTICS DEMO',
          description: 'Demo analytics module for testing',
          icon: 'BarChart',
          component: './demo/AnalyticsModule',
          version: '1.0.0',
          category: 'business' as const,
          type: 'internal' as const,
          lazy: true,
          preload: false,
          priority: 'normal' as const,
          dependencies: [],
          permissions: ['read'],
          hotReload: true,
          route: '/demo-analytics',
          enabled: true,
          tags: ['demo', 'analytics']
        },
        {
          id: 'demo-reports',
          name: 'REPORTS DEMO',
          description: 'Demo reports module for testing',
          icon: 'FileText',
          component: './demo/ReportsModule',
          version: '2.1.0',
          category: 'business' as const,
          type: 'internal' as const,
          lazy: true,
          preload: false,
          priority: 'high' as const,
          dependencies: ['demo-analytics'],
          permissions: ['read', 'write'],
          hotReload: true,
          route: '/demo-reports',
          enabled: true,
          tags: ['demo', 'reports']
        }
      ];

      for (const demoModule of demoModules) {
        console.log(`📦 Registering demo module: ${demoModule.id}`);
        registerModule(demoModule);
        await new Promise(resolve => setTimeout(resolve, 500));
        refreshStats();
      }

      console.log('✅ Simulation completed!');
    } catch (error) {
      console.error('❌ Simulation error:', error);
    }

    setIsSimulating(false);
  };

  const addCustomModule = () => {
    if (!newModuleId.trim()) return;

    const customModule = {
      id: newModuleId.toLowerCase(),
      name: newModuleId.toUpperCase(),
      description: `Custom module: ${newModuleId}`,
      icon: 'Package',
      component: `./custom/${newModuleId}Module`,
      version: '1.0.0',
      category: 'external' as const,
      type: 'internal' as const,
      lazy: true,
      preload: false,
      priority: 'normal' as const,
      dependencies: [],
      permissions: ['read'],
      hotReload: true,
      route: `/${newModuleId}`,
      enabled: true,
      tags: ['custom', newModuleId.toLowerCase()]
    };

    registerModule(customModule);
    setNewModuleId('');
    refreshStats();
    console.log(`✨ Created custom module: ${customModule.id}`);
  };

  const loadSelectedModule = async () => {
    if (!selectedModule) return;
    
    if (typeof window !== 'undefined' && (window as any).__moduleRegistry) {
      const registry = (window as any).__moduleRegistry;
      try {
        console.log(`🚀 Loading module: ${selectedModule}`);
        await registry.loadModule(selectedModule);
        refreshStats();
        console.log(`✅ Module loaded: ${selectedModule}`);
      } catch (error) {
        console.error(`❌ Failed to load module ${selectedModule}:`, error);
      }
    }
  };

  const allModules = getAllModules();
  const loadedModules = getLoadedModules();

  return (
    <div className={`min-h-screen bg-gray-900 p-6 ${className}`}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            Module Registry Demo
          </h1>
          <p className="text-gray-400 text-lg">
            Demonstração do sistema robusto de gerenciamento de módulos
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <WindowCard title="Total Modules">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">
                {stats.totalModules}
              </div>
              <div className="text-sm text-gray-400">
                Registered modules
              </div>
            </div>
          </WindowCard>

          <WindowCard title="Loaded">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {stats.loadedModules}
              </div>
              <div className="text-sm text-gray-400">
                Active in memory
              </div>
            </div>
          </WindowCard>

          <WindowCard title="Cache Efficiency">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                {(stats.cacheEfficiency || 0).toFixed(0)}%
              </div>
              <div className="text-sm text-gray-400">
                Hit rate
              </div>
            </div>
          </WindowCard>

          <WindowCard title="Errors">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">
                {stats.errorModules}
              </div>
              <div className="text-sm text-gray-400">
                Failed loads
              </div>
            </div>
          </WindowCard>
        </div>

        {/* Demo Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WindowCard title="Simulation Controls">
            <div className="space-y-4">
              <WindowButton
                variant={isSimulating ? "danger" : "primary"}
                icon={isSimulating ? <Pause /> : <Play />}
                onClick={simulateModuleActivities}
                disabled={isSimulating}
                className="w-full"
              >
                {isSimulating ? 'Simulating...' : 'Start Activity Simulation'}
              </WindowButton>

              <div className="flex space-x-2">
                <WindowButton
                  variant="secondary"
                  icon={<RotateCcw />}
                  onClick={() => {
                    clearCache();
                    refreshStats();
                  }}
                  className="flex-1"
                >
                  Clear Cache
                </WindowButton>
                
                <WindowButton
                  variant="secondary"
                  icon={<Database />}
                  onClick={refreshStats}
                  className="flex-1"
                >
                  Refresh Stats
                </WindowButton>
              </div>

              {isSimulating && (
                <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span className="text-blue-400 text-sm font-medium">
                      Running module activity simulation...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </WindowCard>

          <WindowCard title="Module Management">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Add Custom Module
                </label>
                <div className="flex space-x-2">
                  <WindowInput
                    placeholder="Module name..."
                    value={newModuleId}
                    onChange={(e) => setNewModuleId(e.target.value)}
                    className="flex-1"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') addCustomModule();
                    }}
                  />
                  <WindowButton
                    variant="primary"
                    icon={<Plus />}
                    onClick={addCustomModule}
                    disabled={!newModuleId.trim()}
                  >
                    Add
                  </WindowButton>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Load Module
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select module...</option>
                    {allModules.map(module => (
                      <option key={module.id} value={module.id}>
                        {module.name} ({module.id})
                      </option>
                    ))}
                  </select>
                  <WindowButton
                    variant="primary"
                    icon={<Play />}
                    onClick={loadSelectedModule}
                    disabled={!selectedModule}
                  >
                    Load
                  </WindowButton>
                </div>
              </div>
            </div>
          </WindowCard>
        </div>

        {/* Module Registry Dev Tools */}
        <ModuleRegistryDevTools />

        {/* Architecture Info */}
        <WindowCard title="Architecture Features">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Settings className="text-blue-400" size={20} />
                <h4 className="font-semibold text-white">Auto-Discovery</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Automatically discovers modules from filesystem using configurable patterns and paths.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Brain className="text-green-400" size={20} />
                <h4 className="font-semibold text-white">Intelligent Cache</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Smart caching with LRU eviction, expiration, and performance monitoring.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Package className="text-purple-400" size={20} />
                <h4 className="font-semibold text-white">Dependency Resolution</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Automatic dependency loading with circular dependency detection.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="text-orange-400" size={20} />
                <h4 className="font-semibold text-white">Hot Reload</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Advanced hot reloading without application restart.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Database className="text-cyan-400" size={20} />
                <h4 className="font-semibold text-white">Performance Monitoring</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Real-time performance metrics and load time tracking.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Plus className="text-pink-400" size={20} />
                <h4 className="font-semibold text-white">Scalable for 20+ Modules</h4>
              </div>
              <p className="text-gray-400 text-sm">
                Optimized architecture ready for enterprise-scale module management.
              </p>
            </div>
          </div>
        </WindowCard>

        {/* Debug Info */}
        <WindowCard title="Debug Console">
          <div className="bg-black/20 rounded-lg p-4">
            <div className="text-green-400 text-sm font-mono">
              <div>📦 [ModuleRegistry] System initialized with robust architecture</div>
              <div>🚀 [ModuleRegistry] Auto-discovery enabled</div>
              <div>🔥 [ModuleRegistry] Hot reload active (development mode)</div>
              <div>💾 [ModuleRegistry] Intelligent caching enabled</div>
              <div>🛠️ [ModuleRegistry] Debug access available at window.__moduleRegistry</div>
              <div className="text-gray-400 mt-2">
                Use the simulation controls above to see the system in action!
              </div>
            </div>
          </div>
        </WindowCard>
      </div>
    </div>
  );
}