/**
 * Advanced Memory Manager para 20+ Módulos
 * Sistema completo de gerenciamento de memória, garbage collection e cleanup
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { performanceMonitor } from './performance-utils';

// Interfaces para memory management
export interface MemoryEntry {
  id: string;
  type: 'window' | 'module' | 'component' | 'data';
  size: number;
  lastAccessed: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cleanup?: () => void;
  metadata?: Record<string, any>;
}

export interface MemoryConfig {
  maxMemoryMB: number;
  cleanupThresholdMB: number;
  gcIntervalMs: number;
  inactivityTimeoutMs: number;
  enableAutoCleanup: boolean;
  enableAggressiveGC: boolean;
  lowMemoryWarningMB: number;
}

// Memory Manager Singleton
class MemoryManager {
  private static instance: MemoryManager;
  private entries: Map<string, MemoryEntry> = new Map();
  private observers: Set<(stats: MemoryStats) => void> = new Set();
  private gcTimer: NodeJS.Timeout | null = null;
  private config: MemoryConfig;
  private isCleaningUp = false;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxMemoryMB: 500, // 500MB max
      cleanupThresholdMB: 400, // Start cleanup at 400MB
      gcIntervalMs: 30000, // GC every 30s
      inactivityTimeoutMs: 300000, // 5 minutes inactive timeout
      enableAutoCleanup: true,
      enableAggressiveGC: false,
      lowMemoryWarningMB: 300,
      ...config
    };

    this.startGarbageCollection();
    this.setupMemoryMonitoring();
  }

  static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config);
    }
    return MemoryManager.instance;
  }

  // Registra um item na memória
  register(entry: Omit<MemoryEntry, 'lastAccessed'>): void {
    const memoryEntry: MemoryEntry = {
      ...entry,
      lastAccessed: Date.now()
    };

    this.entries.set(entry.id, memoryEntry);
    this.notifyObservers();

    // Check if cleanup is needed
    if (this.config.enableAutoCleanup && this.shouldTriggerCleanup()) {
      this.performCleanup();
    }
  }

  // Desregistra um item
  unregister(id: string): void {
    const entry = this.entries.get(id);
    if (entry && entry.cleanup) {
      try {
        entry.cleanup();
      } catch (error) {
        console.error(`Error cleaning up memory entry ${id}:`, error);
      }
    }
    
    this.entries.delete(id);
    this.notifyObservers();
  }

  // Atualiza último acesso
  touch(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
    }
  }

  // Obtém estatísticas de memória
  getStats(): MemoryStats {
    const totalSize = Array.from(this.entries.values())
      .reduce((sum, entry) => sum + entry.size, 0);

    const jsMemory = this.getJSMemoryUsage();
    
    const entriesByType = Array.from(this.entries.values())
      .reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const entriesByPriority = Array.from(this.entries.values())
      .reduce((acc, entry) => {
        acc[entry.priority] = (acc[entry.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalSizeMB = totalSize / (1024 * 1024);

    return {
      totalEntries: this.entries.size,
      totalSizeMB,
      jsHeapUsedMB: jsMemory.used,
      jsHeapTotalMB: jsMemory.total,
      jsHeapLimitMB: jsMemory.limit,
      entriesByType,
      entriesByPriority,
      isLowMemory: jsMemory.used > this.config.lowMemoryWarningMB,
      needsCleanup: totalSizeMB > this.config.cleanupThresholdMB || 
                    jsMemory.used > this.config.cleanupThresholdMB
    };
  }

  // Cleanup manual
  performCleanup(aggressive = false): number {
    if (this.isCleaningUp) return 0;
    
    this.isCleaningUp = true;
    let cleanedCount = 0;
    const now = Date.now();
    const inactivityThreshold = now - this.config.inactivityTimeoutMs;

    try {
      // Sort entries by priority and last accessed
      const sortedEntries = Array.from(this.entries.values())
        .sort((a, b) => {
          // Priority order: low < medium < high < critical
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          
          if (priorityDiff !== 0) return priorityDiff;
          return a.lastAccessed - b.lastAccessed; // Older first
        });

      for (const entry of sortedEntries) {
        const shouldClean = aggressive || 
          entry.priority === 'low' ||
          (entry.priority === 'medium' && entry.lastAccessed < inactivityThreshold) ||
          (this.isLowMemory() && entry.priority !== 'critical');

        if (shouldClean) {
          this.unregister(entry.id);
          cleanedCount++;

          // Stop if we've freed enough memory
          if (!aggressive && !this.shouldTriggerCleanup()) {
            break;
          }
        }
      }

      // Force garbage collection if available
      if (aggressive && 'gc' in window) {
        (window as any).gc();
      }

    } finally {
      this.isCleaningUp = false;
    }

    console.log(`Memory cleanup completed: ${cleanedCount} entries cleaned`);
    return cleanedCount;
  }

  // Auto garbage collection
  private startGarbageCollection(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    this.gcTimer = setInterval(() => {
      if (this.config.enableAutoCleanup) {
        this.performCleanup();
      }

      // Aggressive GC if enabled and low memory
      if (this.config.enableAggressiveGC && this.isLowMemory()) {
        this.performCleanup(true);
      }
    }, this.config.gcIntervalMs);
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory pressure
    setInterval(() => {
      const stats = this.getStats();
      
      if (stats.isLowMemory) {
        console.warn('Low memory warning:', stats);
        this.performCleanup();
      }

      // Emit memory pressure events
      if (stats.jsHeapUsedMB > this.config.lowMemoryWarningMB) {
        window.dispatchEvent(new CustomEvent('memoryPressure', {
          detail: { level: 'warning', stats }
        }));
      }

      if (stats.jsHeapUsedMB > this.config.cleanupThresholdMB) {
        window.dispatchEvent(new CustomEvent('memoryPressure', {
          detail: { level: 'critical', stats }
        }));
      }
    }, 10000); // Check every 10s
  }

  private shouldTriggerCleanup(): boolean {
    const stats = this.getStats();
    return stats.totalSizeMB > this.config.cleanupThresholdMB ||
           stats.jsHeapUsedMB > this.config.cleanupThresholdMB;
  }

  private isLowMemory(): boolean {
    const jsMemory = this.getJSMemoryUsage();
    return jsMemory.used > this.config.lowMemoryWarningMB;
  }

  private getJSMemoryUsage(): { used: number; total: number; limit: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / (1024 * 1024),
        total: memory.totalJSHeapSize / (1024 * 1024),
        limit: memory.jsHeapSizeLimit / (1024 * 1024)
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  // Observer pattern
  subscribe(callback: (stats: MemoryStats) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(): void {
    const stats = this.getStats();
    this.observers.forEach(callback => callback(stats));
  }

  // Cleanup on shutdown
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    // Cleanup all entries
    for (const entry of this.entries.values()) {
      if (entry.cleanup) {
        try {
          entry.cleanup();
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    }

    this.entries.clear();
    this.observers.clear();
  }
}

// Interface para estatísticas
export interface MemoryStats {
  totalEntries: number;
  totalSizeMB: number;
  jsHeapUsedMB: number;
  jsHeapTotalMB: number;
  jsHeapLimitMB: number;
  entriesByType: Record<string, number>;
  entriesByPriority: Record<string, number>;
  isLowMemory: boolean;
  needsCleanup: boolean;
}

// Hooks para React
export function useMemoryManager(config?: Partial<MemoryConfig>) {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const manager = useRef<MemoryManager>();

  useEffect(() => {
    manager.current = MemoryManager.getInstance(config);
    
    const unsubscribe = manager.current.subscribe(setStats);
    
    // Initial stats
    setStats(manager.current.getStats());

    return unsubscribe;
  }, []);

  const register = useCallback((entry: Omit<MemoryEntry, 'lastAccessed'>) => {
    manager.current?.register(entry);
  }, []);

  const unregister = useCallback((id: string) => {
    manager.current?.unregister(id);
  }, []);

  const touch = useCallback((id: string) => {
    manager.current?.touch(id);
  }, []);

  const cleanup = useCallback((aggressive = false) => {
    return manager.current?.performCleanup(aggressive) || 0;
  }, []);

  return {
    stats,
    register,
    unregister,
    touch,
    cleanup
  };
}

// Hook para registrar componente automaticamente
export function useMemoryEntry(
  id: string,
  type: MemoryEntry['type'],
  estimatedSize: number,
  priority: MemoryEntry['priority'] = 'medium',
  cleanup?: () => void
) {
  const { register, unregister, touch } = useMemoryManager();

  useEffect(() => {
    register({
      id,
      type,
      size: estimatedSize,
      priority,
      cleanup
    });

    return () => unregister(id);
  }, [id, type, estimatedSize, priority, register, unregister]);

  // Touch on each render
  useEffect(() => {
    touch(id);
  });
}

// Hook para memory-sensitive operations
export function useMemoryAware<T>(
  operation: () => T,
  fallback: () => T,
  memoryThreshold: number = 400 // MB
) {
  const { stats } = useMemoryManager();

  return useCallback(() => {
    if (stats && stats.jsHeapUsedMB > memoryThreshold) {
      console.log('Using fallback due to memory pressure');
      return fallback();
    }
    return operation();
  }, [stats, operation, fallback, memoryThreshold]);
}

// Window memory management
export function useWindowMemoryManagement(windowId: string, estimatedSize: number = 5) {
  const { register, unregister, touch } = useMemoryManager();

  useEffect(() => {
    register({
      id: `window-${windowId}`,
      type: 'window',
      size: estimatedSize * 1024 * 1024, // Convert MB to bytes
      priority: 'medium',
      cleanup: () => {
        // Cleanup window-specific resources
        const windowElement = document.getElementById(`window-${windowId}`);
        if (windowElement) {
          // Remove event listeners, clear intervals, etc.
          const cleanupEvent = new CustomEvent('windowCleanup', { 
            detail: { windowId } 
          });
          windowElement.dispatchEvent(cleanupEvent);
        }
      }
    });

    return () => unregister(`window-${windowId}`);
  }, [windowId, estimatedSize, register, unregister]);

  // Touch on activity
  const markActive = useCallback(() => {
    touch(`window-${windowId}`);
  }, [windowId, touch]);

  return { markActive };
}

// Module memory management  
export function useModuleMemoryManagement(moduleId: string, estimatedSize: number = 10) {
  const { register, unregister } = useMemoryManager();

  useEffect(() => {
    register({
      id: `module-${moduleId}`,
      type: 'module',
      size: estimatedSize * 1024 * 1024, // Convert MB to bytes
      priority: 'high', // Modules have higher priority
      cleanup: () => {
        // Module-specific cleanup
        console.log(`Cleaning up module: ${moduleId}`);
        
        // Clear module cache if exists
        if ('moduleCache' in window) {
          delete (window as any).moduleCache[moduleId];
        }

        // Emit cleanup event
        window.dispatchEvent(new CustomEvent('moduleCleanup', {
          detail: { moduleId }
        }));
      }
    });

    return () => unregister(`module-${moduleId}`);
  }, [moduleId, estimatedSize, register, unregister]);
}

// Data cache memory management
export function useDataCacheMemory<T>(
  key: string,
  data: T,
  priority: MemoryEntry['priority'] = 'low'
) {
  const { register, unregister } = useMemoryManager();

  useEffect(() => {
    const size = estimateObjectSize(data);
    
    register({
      id: `cache-${key}`,
      type: 'data',
      size,
      priority,
      cleanup: () => {
        // Clear from cache
        if ('dataCache' in window) {
          delete (window as any).dataCache[key];
        }
      }
    });

    return () => unregister(`cache-${key}`);
  }, [key, data, priority, register, unregister]);
}

// Utility functions
function estimateObjectSize(obj: any): number {
  let bytes = 0;
  
  function sizeOf(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    
    switch (typeof obj) {
      case 'number':
        return 8;
      case 'string':
        return obj.length * 2;
      case 'boolean':
        return 4;
      case 'object':
        if (obj instanceof ArrayBuffer) {
          return obj.byteLength;
        }
        
        let objBytes = 0;
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            objBytes += sizeOf(key);
            objBytes += sizeOf(obj[key]);
          }
        }
        return objBytes;
      default:
        return 0;
    }
  }
  
  return sizeOf(obj);
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance();

// Global memory pressure handler
window.addEventListener('memoryPressure', (event: CustomEvent) => {
  const { level, stats } = event.detail;
  
  console.warn(`Memory pressure detected (${level}):`, stats);
  
  if (level === 'critical') {
    // Aggressive cleanup
    memoryManager.performCleanup(true);
    
    // Notify components to reduce memory usage
    window.dispatchEvent(new CustomEvent('reduceMemoryUsage', {
      detail: { aggressive: true }
    }));
  }
});

// Development tools
if (process.env.NODE_ENV === 'development') {
  (window as any).memoryManager = memoryManager;
  (window as any).memoryStats = () => memoryManager.getStats();
  (window as any).memoryCleanup = (aggressive = false) => memoryManager.performCleanup(aggressive);
}