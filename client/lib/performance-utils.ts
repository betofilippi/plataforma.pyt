/**
 * Performance Utilities para Otimização de 20+ Módulos
 * Ferramentas para monitoramento, otimização e debugging de performance
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import debounce from 'lodash/debounce';

// Tipos para métricas de performance
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentCount: number;
  reRenderCount: number;
  bundleSize: number;
  networkRequests: number;
  cacheHitRate: number;
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  props: Record<string, any>;
  reRenderCount: number;
  memoryImpact: number;
}

// Performance Monitor Singleton
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, ComponentPerformance> = new Map();
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private memoryObserver?: PerformanceObserver;
  private renderObserver?: PerformanceObserver;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.setupObservers();
    this.startMemoryMonitoring();
  }

  private setupObservers() {
    // Observer para métricas de paint
    if ('PerformanceObserver' in window) {
      try {
        this.renderObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure') {
              this.updateRenderMetrics(entry.name, entry.duration);
            }
          });
        });
        this.renderObserver.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  private startMemoryMonitoring() {
    // Monitoring contínuo de memória
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryMB = memory.usedJSHeapSize / (1024 * 1024);
        
        // Alerta para vazamentos de memória
        if (memoryMB > 100) {
          console.warn(`High memory usage detected: ${memoryMB.toFixed(2)}MB`);
          this.notifyObservers();
        }
      }
    }, 5000);
  }

  trackComponent(componentName: string, renderTime: number, props: Record<string, any> = {}) {
    const existing = this.metrics.get(componentName);
    const newMetric: ComponentPerformance = {
      componentName,
      renderTime,
      props,
      reRenderCount: existing ? existing.reRenderCount + 1 : 1,
      memoryImpact: this.calculateMemoryImpact(componentName)
    };

    this.metrics.set(componentName, newMetric);
    
    // Log performance crítica
    if (renderTime > 16.67) { // Mais de 1 frame (60fps)
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    this.notifyObservers();
  }

  private calculateMemoryImpact(componentName: string): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return 0;
  }

  private updateRenderMetrics(name: string, duration: number) {
    if (name.startsWith('React')) {
      this.trackComponent(name, duration);
    }
  }

  getMetrics(): PerformanceMetrics {
    const components = Array.from(this.metrics.values());
    const totalRenderTime = components.reduce((sum, comp) => sum + comp.renderTime, 0);
    const totalReRenders = components.reduce((sum, comp) => sum + comp.reRenderCount, 0);

    // Calcula métricas de rede
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const networkRequests = resourceEntries.length;
    const cachedRequests = resourceEntries.filter(
      entry => entry.transferSize === 0 && entry.decodedBodySize > 0
    ).length;
    const cacheHitRate = networkRequests > 0 ? (cachedRequests / networkRequests) * 100 : 0;

    // Calcula bundle size
    const bundleSize = resourceEntries.reduce((total, entry) => total + (entry.transferSize || 0), 0);

    return {
      renderTime: totalRenderTime,
      memoryUsage: 'memory' in performance ? (performance as any).memory.usedJSHeapSize : 0,
      componentCount: this.metrics.size,
      reRenderCount: totalReRenders,
      bundleSize,
      networkRequests,
      cacheHitRate
    };
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers() {
    const metrics = this.getMetrics();
    this.observers.forEach(callback => callback(metrics));
  }

  getComponentMetrics() {
    return Array.from(this.metrics.values());
  }

  reset() {
    this.metrics.clear();
  }
}

// Performance Hooks
export function usePerformanceTracking(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    monitor.trackComponent(componentName, renderTime);
  });

  return {
    trackRender: useCallback((customName?: string) => {
      const renderTime = performance.now() - renderStartTime.current;
      monitor.trackComponent(customName || componentName, renderTime);
    }, [componentName, monitor]),
    
    getMetrics: useCallback(() => monitor.getComponentMetrics(), [monitor])
  };
}

export function useMemoryMonitoring(threshold: number = 50) {
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [isHighUsage, setIsHighUsage] = useState(false);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usageMB = memory.usedJSHeapSize / (1024 * 1024);
        setMemoryUsage(usageMB);
        setIsHighUsage(usageMB > threshold);
      }
    };

    const interval = setInterval(checkMemory, 1000);
    return () => clearInterval(interval);
  }, [threshold]);

  return { memoryUsage, isHighUsage };
}

export function useRenderOptimization() {
  const renderCounts = useRef<Map<string, number>>(new Map());

  const trackRender = useCallback((componentName: string) => {
    const count = renderCounts.current.get(componentName) || 0;
    renderCounts.current.set(componentName, count + 1);
    
    if (count > 10) {
      console.warn(`Component ${componentName} has rendered ${count} times - consider optimization`);
    }
  }, []);

  const getRenderCounts = useCallback(() => {
    return Array.from(renderCounts.current.entries());
  }, []);

  return { trackRender, getRenderCounts };
}

// Bundle Analyzer
export class BundleAnalyzer {
  static analyzeLoadedChunks() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsFiles = resources.filter(r => r.name.includes('.js'));
    const cssFiles = resources.filter(r => r.name.includes('.css'));
    
    const analysis = {
      totalFiles: resources.length,
      jsFiles: jsFiles.length,
      cssFiles: cssFiles.length,
      totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      jsSize: jsFiles.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      cssSize: cssFiles.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      largestChunks: jsFiles
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 5)
        .map(r => ({
          name: r.name.split('/').pop() || 'unknown',
          size: r.transferSize || 0,
          loadTime: r.responseEnd - r.requestStart
        }))
    };

    return analysis;
  }

  static identifyUnusedChunks() {
    // Analisa chunks carregados mas possivelmente não utilizados
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsFiles = resources.filter(r => r.name.includes('.js'));
    
    return jsFiles
      .filter(r => r.transferSize && r.transferSize > 0)
      .map(r => ({
        name: r.name.split('/').pop() || 'unknown',
        size: r.transferSize || 0,
        cached: r.transferSize === 0 && r.decodedBodySize > 0
      }));
  }
}

// Debounced Performance Tracker
export function useDebouncePerformance<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  options?: { leading?: boolean; trailing?: boolean }
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay, options),
    [callback, delay, options]
  );

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);

  return debouncedCallback as T;
}

// Virtual Scrolling Hook para listas grandes
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleEndIndex = Math.min(
    visibleStartIndex + Math.ceil(containerHeight / itemHeight),
    items.length - 1
  );

  const startIndex = Math.max(0, visibleStartIndex - overscan);
  const endIndex = Math.min(items.length - 1, visibleEndIndex + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };
}

// Image Lazy Loading Hook
export function useLazyImage(src: string, options?: IntersectionObserverInit) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let observer: IntersectionObserver;

    if (imageRef && imageSrc !== src) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.unobserve(imageRef);
        }
      }, options);

      observer.observe(imageRef);
    }

    return () => {
      if (observer && imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, imageSrc, src, options]);

  return [imageSrc, setImageRef] as const;
}

// Component com performance tracking automático
export function withPerformanceTracking<P extends Record<string, any>>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const ComponentWithPerformance: React.FC<P> = (props) => {
    const name = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Unknown';
    usePerformanceTracking(name);
    
    return React.createElement(WrappedComponent, props);
  };

  ComponentWithPerformance.displayName = `withPerformanceTracking(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ComponentWithPerformance;
}

// Export do monitor singleton
export const performanceMonitor = PerformanceMonitor.getInstance();

// Função para performance profiling de desenvolvimento
export function startPerformanceProfiler() {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Performance Profiler iniciado');
    
    // Profile inicial
    setTimeout(() => {
      const metrics = performanceMonitor.getMetrics();
      console.table({
        'Bundle Size (KB)': Math.round(metrics.bundleSize / 1024),
        'Memory Usage (MB)': Math.round(metrics.memoryUsage / (1024 * 1024)),
        'Components': metrics.componentCount,
        'Re-renders': metrics.reRenderCount,
        'Network Requests': metrics.networkRequests,
        'Cache Hit Rate (%)': Math.round(metrics.cacheHitRate)
      });
    }, 2000);
  }
}