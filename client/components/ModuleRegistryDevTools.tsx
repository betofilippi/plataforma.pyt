import React, { useState, useEffect } from 'react';
import { useModuleRegistry } from '@/lib/useModule';
import { WindowCard, WindowButton } from '@/components/ui';
import { 
  Refresh, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Trash2,
  Search,
  Filter,
  Download,
  Upload,
  Settings
} from 'lucide-react';

interface ModuleRegistryDevToolsProps {
  className?: string;
}

export function ModuleRegistryDevTools({ className }: ModuleRegistryDevToolsProps) {
  const {
    stats,
    refreshStats,
    getAllModules,
    getLoadedModules,
    clearCache,
    registerModule,
    unregisterModule
  } = useModuleRegistry();

  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'loaded' | 'performance' | 'cache'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [devToolsData, setDevToolsData] = useState<any>(null);

  useEffect(() => {
    // Get dev tools data if available
    if (typeof window !== 'undefined' && (window as any).__moduleRegistry) {
      const registry = (window as any).__moduleRegistry;
      if (registry.getDevToolsData) {
        setDevToolsData(registry.getDevToolsData());
      }
    }
  }, []);

  useEffect(() => {
    // Auto-refresh stats every 10 seconds
    const interval = setInterval(() => {
      refreshStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [refreshStats]);

  const allModules = getAllModules();
  const loadedModules = getLoadedModules();

  const filteredModules = allModules.filter(module => {
    const matchesSearch = !searchQuery || 
      module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      module.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(allModules.map(m => m.category))).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return 'text-green-400';
      case 'loading': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'loaded': return <CheckCircle size={16} className="text-green-400" />;
      case 'loading': return <Clock size={16} className="text-yellow-400" />;
      case 'error': return <AlertTriangle size={16} className="text-red-400" />;
      default: return <Info size={16} className="text-gray-400" />;
    }
  };

  const handleClearCache = () => {
    clearCache();
    refreshStats();
    console.log('🧹 Module cache cleared');
  };

  const exportData = () => {
    const exportData = {
      stats,
      modules: allModules,
      loadedModules,
      devToolsData,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `module-registry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Module Registry Dev Tools</h2>
        <div className="flex space-x-2">
          <WindowButton
            variant="secondary"
            icon={<Refresh />}
            onClick={() => refreshStats()}
          >
            Refresh
          </WindowButton>
          <WindowButton
            variant="secondary"
            icon={<Download />}
            onClick={exportData}
          >
            Export
          </WindowButton>
          <WindowButton
            variant="danger"
            icon={<Trash2 />}
            onClick={handleClearCache}
          >
            Clear Cache
          </WindowButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'modules', label: 'Modules' },
          { id: 'loaded', label: 'Loaded' },
          { id: 'performance', label: 'Performance' },
          { id: 'cache', label: 'Cache' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WindowCard title="Module Statistics">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Modules:</span>
                <span className="text-white font-semibold">{stats.totalModules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Enabled:</span>
                <span className="text-green-400 font-semibold">{stats.enabledModules || stats.totalModules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loaded:</span>
                <span className="text-blue-400 font-semibold">{stats.loadedModules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Errors:</span>
                <span className="text-red-400 font-semibold">{stats.errorModules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Loading:</span>
                <span className="text-yellow-400 font-semibold">{stats.loadingModules}</span>
              </div>
            </div>
          </WindowCard>

          <WindowCard title="Cache Performance">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Cache Size:</span>
                <span className="text-white font-semibold">{stats.cacheSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cache Hits:</span>
                <span className="text-green-400 font-semibold">{stats.cacheHits || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cache Misses:</span>
                <span className="text-red-400 font-semibold">{stats.cacheMisses || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Efficiency:</span>
                <span className="text-blue-400 font-semibold">
                  {stats.cacheEfficiency?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </WindowCard>

          <WindowCard title="System Info">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Environment:</span>
                <span className="text-white font-semibold">
                  {process.env.NODE_ENV || 'unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auto Discovery:</span>
                <span className="text-green-400 font-semibold">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hot Reload:</span>
                <span className="text-green-400 font-semibold">
                  {process.env.NODE_ENV === 'development' ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Preloaded:</span>
                <span className="text-blue-400 font-semibold">{stats.preloadedModules || 0}</span>
              </div>
            </div>
          </WindowCard>
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Module List */}
          <WindowCard title={`Modules (${filteredModules.length})`}>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredModules.map(module => {
                const loadedModule = loadedModules.find(lm => lm.id === module.id);
                const status = loadedModule?.status || 'unloaded';
                
                return (
                  <div
                    key={module.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(status)}
                        <span className="font-medium text-white">{module.name}</span>
                        <span className="text-xs text-gray-400">({module.id})</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {module.description || 'No description'}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>v{module.version}</span>
                        <span>{module.category}</span>
                        <span>{module.type}</span>
                        {module.lazy && <span>lazy</span>}
                        {module.preload && <span>preload</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getStatusColor(status)}`}>
                        {status}
                      </span>
                      {loadedModule?.loadTime && (
                        <span className="text-xs text-gray-400">
                          {loadedModule.loadTime.toFixed(0)}ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </WindowCard>
        </div>
      )}

      {/* Loaded Modules Tab */}
      {activeTab === 'loaded' && (
        <WindowCard title={`Loaded Modules (${loadedModules.length})`}>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadedModules.map(module => (
              <div
                key={module.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(module.status)}
                    <span className="font-medium text-white">{module.config.name}</span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Loaded: {new Date(module.loadedAt).toLocaleTimeString()}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                    {module.loadTime && <span>Load: {module.loadTime.toFixed(0)}ms</span>}
                    {module.accessCount && <span>Accessed: {module.accessCount}x</span>}
                    {module.lastAccessed && (
                      <span>Last: {new Date(module.lastAccessed).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm ${getStatusColor(module.status)}`}>
                    {module.status}
                  </div>
                  {module.error && (
                    <div className="text-xs text-red-400 mt-1 max-w-xs truncate">
                      {module.error.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loadedModules.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No modules loaded yet
              </div>
            )}
          </div>
        </WindowCard>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WindowCard title="Load Times">
            <div className="space-y-2">
              {loadedModules
                .filter(m => m.loadTime)
                .sort((a, b) => (b.loadTime || 0) - (a.loadTime || 0))
                .map(module => (
                  <div key={module.id} className="flex justify-between items-center">
                    <span className="text-gray-400">{module.config.name}</span>
                    <span className="text-white font-mono">
                      {module.loadTime?.toFixed(1)}ms
                    </span>
                  </div>
                ))}
            </div>
          </WindowCard>

          <WindowCard title="Access Counts">
            <div className="space-y-2">
              {loadedModules
                .filter(m => m.accessCount)
                .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
                .map(module => (
                  <div key={module.id} className="flex justify-between items-center">
                    <span className="text-gray-400">{module.config.name}</span>
                    <span className="text-white font-mono">
                      {module.accessCount}x
                    </span>
                  </div>
                ))}
            </div>
          </WindowCard>
        </div>
      )}

      {/* Cache Tab */}
      {activeTab === 'cache' && (
        <WindowCard title="Cache Management">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.cacheSize}</div>
                <div className="text-sm text-gray-400">Cached Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.cacheHits || 0}</div>
                <div className="text-sm text-gray-400">Cache Hits</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{stats.cacheMisses || 0}</div>
                <div className="text-sm text-gray-400">Cache Misses</div>
              </div>
            </div>

            {devToolsData && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold text-white mb-3">Debug Information</h4>
                <div className="bg-black/20 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-xs text-gray-300">
                    {JSON.stringify(devToolsData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </WindowCard>
      )}
    </div>
  );
}

export default ModuleRegistryDevTools;