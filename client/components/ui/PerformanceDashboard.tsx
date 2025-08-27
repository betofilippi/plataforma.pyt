/**
 * Performance Dashboard - Monitoring completo de performance
 * Dashboard em tempo real para monitoramento de 20+ módulos
 */

import React, { 
  memo, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo 
} from 'react';
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  HardDrive,
  Monitor,
  Network,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { 
  usePerformanceTracking, 
  useMemoryMonitoring,
  performanceMonitor,
  PerformanceMetrics,
  ComponentPerformance,
  BundleAnalyzer
} from '@/lib/performance-utils';
import { useMemoryManager, MemoryStats } from '@/lib/memory-manager';
import { WindowCard, WindowButton } from './index';

interface PerformanceDashboardProps {
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  refreshInterval?: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  category: 'memory' | 'performance' | 'network' | 'bundle';
}

export const PerformanceDashboard = memo(function PerformanceDashboard({
  isExpanded = false,
  onToggle,
  refreshInterval = 2000
}: PerformanceDashboardProps) {
  usePerformanceTracking('PerformanceDashboard');

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [componentMetrics, setComponentMetrics] = useState<ComponentPerformance[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'components' | 'memory' | 'network'>('overview');

  const { stats: memoryStats } = useMemoryManager();
  const { memoryUsage, isHighUsage } = useMemoryMonitoring(100); // 100MB threshold

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      // Get performance metrics
      const newMetrics = performanceMonitor.getMetrics();
      setMetrics(newMetrics);

      // Get component metrics
      const components = performanceMonitor.getComponentMetrics();
      setComponentMetrics(components);

      // Check for new alerts
      checkForAlerts(newMetrics, memoryStats);

    } catch (error) {
      console.error('Error refreshing performance data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [memoryStats]);

  // Auto refresh
  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshData, refreshInterval]);

  // Alert system
  const checkForAlerts = useCallback((metrics: PerformanceMetrics, memStats: MemoryStats | null) => {
    const newAlerts: PerformanceAlert[] = [];

    // Memory alerts
    if (memStats) {
      if (memStats.jsHeapUsedMB > 200) {
        newAlerts.push({
          id: `memory-high-${Date.now()}`,
          type: 'warning',
          message: `High memory usage: ${memStats.jsHeapUsedMB.toFixed(1)}MB`,
          timestamp: Date.now(),
          category: 'memory'
        });
      }

      if (memStats.needsCleanup) {
        newAlerts.push({
          id: `memory-cleanup-${Date.now()}`,
          type: 'error',
          message: 'Memory cleanup required',
          timestamp: Date.now(),
          category: 'memory'
        });
      }
    }

    // Performance alerts
    if (metrics.renderTime > 100) {
      newAlerts.push({
        id: `render-slow-${Date.now()}`,
        type: 'warning',
        message: `Slow render time: ${metrics.renderTime.toFixed(1)}ms`,
        timestamp: Date.now(),
        category: 'performance'
      });
    }

    // Bundle size alerts
    if (metrics.bundleSize > 3 * 1024 * 1024) { // 3MB
      newAlerts.push({
        id: `bundle-large-${Date.now()}`,
        type: 'warning',
        message: `Large bundle size: ${(metrics.bundleSize / (1024 * 1024)).toFixed(1)}MB`,
        timestamp: Date.now(),
        category: 'bundle'
      });
    }

    // Network alerts
    if (metrics.cacheHitRate < 50) {
      newAlerts.push({
        id: `cache-low-${Date.now()}`,
        type: 'info',
        message: `Low cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`,
        timestamp: Date.now(),
        category: 'network'
      });
    }

    // Keep only recent alerts (last 10 minutes)
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    setAlerts(prev => [...prev.filter(alert => alert.timestamp > tenMinutesAgo), ...newAlerts]);
  }, []);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    if (!metrics || !memoryStats) return 0;

    let score = 100;

    // Memory penalties
    if (memoryStats.jsHeapUsedMB > 300) score -= 30;
    else if (memoryStats.jsHeapUsedMB > 200) score -= 20;
    else if (memoryStats.jsHeapUsedMB > 100) score -= 10;

    // Render time penalties
    if (metrics.renderTime > 100) score -= 25;
    else if (metrics.renderTime > 50) score -= 15;
    else if (metrics.renderTime > 20) score -= 5;

    // Bundle size penalties
    const bundleSizeMB = metrics.bundleSize / (1024 * 1024);
    if (bundleSizeMB > 5) score -= 20;
    else if (bundleSizeMB > 3) score -= 15;
    else if (bundleSizeMB > 2) score -= 10;

    // Cache hit rate bonus/penalty
    if (metrics.cacheHitRate > 80) score += 5;
    else if (metrics.cacheHitRate < 50) score -= 10;

    return Math.max(0, Math.min(100, score));
  }, [metrics, memoryStats]);

  // Component analysis
  const slowComponents = useMemo(() => {
    return componentMetrics
      .filter(comp => comp.renderTime > 16.67) // Slower than 60fps
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 5);
  }, [componentMetrics]);

  const frequentRerenders = useMemo(() => {
    return componentMetrics
      .filter(comp => comp.reRenderCount > 10)
      .sort((a, b) => b.reRenderCount - a.reRenderCount)
      .slice(0, 5);
  }, [componentMetrics]);

  // Bundle analysis
  const [bundleAnalysis, setBundleAnalysis] = useState<any>(null);
  
  useEffect(() => {
    setBundleAnalysis(BundleAnalyzer.analyzeLoadedChunks());
  }, []);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <WindowButton
          onClick={() => onToggle?.(true)}
          className="glassmorphism p-3 shadow-lg hover:shadow-xl transition-all"
          variant="ghost"
        >
          <Activity className="w-5 h-5 text-blue-400" />
          <span className="ml-2 hidden sm:inline">Performance</span>
          {performanceScore < 70 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </WindowButton>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 pointer-events-none">
      <div className="h-full flex items-end justify-end">
        <WindowCard 
          className="w-full max-w-4xl h-full max-h-[600px] pointer-events-auto glassmorphism"
          title="Performance Dashboard"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Performance Dashboard</h2>
                </div>
                
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5">
                  <div className={`w-2 h-2 rounded-full ${
                    performanceScore > 80 ? 'bg-green-400' : 
                    performanceScore > 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm text-gray-300">{performanceScore}/100</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <WindowButton
                  onClick={refreshData}
                  variant="ghost"
                  size="sm"
                  disabled={isRefreshing}
                  className="p-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </WindowButton>
                
                <WindowButton
                  onClick={() => onToggle?.(false)}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <Minimize2 className="w-4 h-4" />
                </WindowButton>
              </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="p-4 border-b border-white/10">
                <div className="space-y-2 max-h-20 overflow-y-auto">
                  {alerts.slice(-3).map(alert => (
                    <div
                      key={alert.id}
                      className={`flex items-center space-x-2 text-sm p-2 rounded ${
                        alert.type === 'error' ? 'bg-red-500/10 text-red-400' :
                        alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {alert.type === 'error' ? <XCircle className="w-4 h-4" /> :
                       alert.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                       <CheckCircle className="w-4 h-4" />}
                      <span>{alert.message}</span>
                      <span className="text-xs opacity-70 ml-auto">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 p-4 border-b border-white/10">
              {[
                { key: 'overview', label: 'Overview', icon: Monitor },
                { key: 'components', label: 'Components', icon: BarChart3 },
                { key: 'memory', label: 'Memory', icon: HardDrive },
                { key: 'network', label: 'Network', icon: Network }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTab === tab.key 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {selectedTab === 'overview' && (
                <OverviewTab 
                  metrics={metrics} 
                  memoryStats={memoryStats} 
                  bundleAnalysis={bundleAnalysis}
                  performanceScore={performanceScore}
                />
              )}
              
              {selectedTab === 'components' && (
                <ComponentsTab 
                  componentMetrics={componentMetrics}
                  slowComponents={slowComponents}
                  frequentRerenders={frequentRerenders}
                />
              )}
              
              {selectedTab === 'memory' && (
                <MemoryTab memoryStats={memoryStats} />
              )}
              
              {selectedTab === 'network' && (
                <NetworkTab metrics={metrics} bundleAnalysis={bundleAnalysis} />
              )}
            </div>
          </div>
        </WindowCard>
      </div>
    </div>
  );
});

// Overview Tab Component
const OverviewTab = memo(({ metrics, memoryStats, bundleAnalysis, performanceScore }: any) => (
  <div className="p-4 space-y-4 h-full overflow-y-auto">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Performance Score"
        value={`${performanceScore}/100`}
        icon={Zap}
        color={performanceScore > 80 ? 'green' : performanceScore > 60 ? 'yellow' : 'red'}
      />
      
      <MetricCard
        title="Memory Usage"
        value={`${memoryStats?.jsHeapUsedMB.toFixed(1) || 0}MB`}
        icon={HardDrive}
        color={memoryStats?.isLowMemory ? 'red' : 'green'}
      />
      
      <MetricCard
        title="Bundle Size"
        value={`${((metrics?.bundleSize || 0) / (1024 * 1024)).toFixed(1)}MB`}
        icon={Database}
        color={(metrics?.bundleSize || 0) > 3 * 1024 * 1024 ? 'red' : 'green'}
      />
      
      <MetricCard
        title="Cache Hit Rate"
        value={`${metrics?.cacheHitRate.toFixed(1) || 0}%`}
        icon={Network}
        color={(metrics?.cacheHitRate || 0) > 80 ? 'green' : (metrics?.cacheHitRate || 0) > 50 ? 'yellow' : 'red'}
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Render Performance</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Render Time</span>
            <span className="text-white">{metrics?.renderTime.toFixed(1) || 0}ms</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Components</span>
            <span className="text-white">{metrics?.componentCount || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Re-renders</span>
            <span className="text-white">{metrics?.reRenderCount || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Bundle Analysis</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">JS Files</span>
            <span className="text-white">{bundleAnalysis?.jsFiles || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">CSS Files</span>
            <span className="text-white">{bundleAnalysis?.cssFiles || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Size</span>
            <span className="text-white">{((bundleAnalysis?.totalSize || 0) / 1024).toFixed(1)}KB</span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

// Components Tab
const ComponentsTab = memo(({ componentMetrics, slowComponents, frequentRerenders }: any) => (
  <div className="p-4 space-y-4 h-full overflow-y-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Slowest Components</h3>
        <div className="space-y-2">
          {slowComponents.map((comp: ComponentPerformance, index: number) => (
            <div key={`${comp.componentName}-${index}`} className="flex justify-between text-sm">
              <span className="text-gray-400 truncate">{comp.componentName}</span>
              <span className="text-red-400">{comp.renderTime.toFixed(1)}ms</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Frequent Re-renders</h3>
        <div className="space-y-2">
          {frequentRerenders.map((comp: ComponentPerformance, index: number) => (
            <div key={`${comp.componentName}-${index}`} className="flex justify-between text-sm">
              <span className="text-gray-400 truncate">{comp.componentName}</span>
              <span className="text-yellow-400">{comp.reRenderCount}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

// Memory Tab
const MemoryTab = memo(({ memoryStats }: any) => (
  <div className="p-4 space-y-4 h-full overflow-y-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">JS Heap Memory</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Used</span>
            <span className="text-white">{memoryStats?.jsHeapUsedMB.toFixed(1) || 0}MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total</span>
            <span className="text-white">{memoryStats?.jsHeapTotalMB.toFixed(1) || 0}MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Limit</span>
            <span className="text-white">{memoryStats?.jsHeapLimitMB.toFixed(1) || 0}MB</span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Memory Entries</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Entries</span>
            <span className="text-white">{memoryStats?.totalEntries || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Size</span>
            <span className="text-white">{memoryStats?.totalSizeMB.toFixed(1) || 0}MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Needs Cleanup</span>
            <span className={memoryStats?.needsCleanup ? 'text-red-400' : 'text-green-400'}>
              {memoryStats?.needsCleanup ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
));

// Network Tab
const NetworkTab = memo(({ metrics, bundleAnalysis }: any) => (
  <div className="p-4 space-y-4 h-full overflow-y-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Network Metrics</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Requests</span>
            <span className="text-white">{metrics?.networkRequests || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cache Hit Rate</span>
            <span className="text-white">{metrics?.cacheHitRate.toFixed(1) || 0}%</span>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Largest Chunks</h3>
        <div className="space-y-2">
          {bundleAnalysis?.largestChunks?.slice(0, 3).map((chunk: any, index: number) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-400 truncate">{chunk.name}</span>
              <span className="text-white">{(chunk.size / 1024).toFixed(1)}KB</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

// Metric Card Component
const MetricCard = memo(({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white/5 rounded-lg p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
        <p className={`text-lg font-bold ${
          color === 'green' ? 'text-green-400' :
          color === 'yellow' ? 'text-yellow-400' :
          color === 'red' ? 'text-red-400' :
          'text-white'
        }`}>
          {value}
        </p>
      </div>
      <Icon className={`w-8 h-8 ${
        color === 'green' ? 'text-green-400' :
        color === 'yellow' ? 'text-yellow-400' :
        color === 'red' ? 'text-red-400' :
        'text-gray-400'
      }`} />
    </div>
  </div>
));

export default PerformanceDashboard;