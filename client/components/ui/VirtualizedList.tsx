/**
 * VirtualizedList - Lista virtualizada para performance com 1000+ items
 * Suporte a scroll infinito, lazy loading e memory management
 */

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  useEffect, 
  useRef, 
  useState 
} from 'react';
import { useVirtualScrolling, usePerformanceTracking } from '@/lib/performance-utils';

export interface VirtualizedListItem {
  id: string | number;
  data: any;
  height?: number;
}

export interface VirtualizedListProps<T = any> {
  items: VirtualizedListItem[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: VirtualizedListItem, index: number) => React.ReactNode;
  overscan?: number;
  onScrollEnd?: () => void;
  loadMoreThreshold?: number;
  isLoading?: boolean;
  className?: string;
  emptyState?: React.ReactNode;
  estimatedItemSize?: number;
  variableHeight?: boolean;
}

export const VirtualizedList = memo(function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScrollEnd,
  loadMoreThreshold = 100,
  isLoading = false,
  className = '',
  emptyState,
  estimatedItemSize,
  variableHeight = false
}: VirtualizedListProps<T>) {
  usePerformanceTracking('VirtualizedList');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<string | number, number>>(new Map());
  
  // Use virtual scrolling hook
  const {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex
  } = useVirtualScrolling(items, itemHeight, containerHeight, overscan);

  // Memoize visible items para evitar re-renders desnecessários
  const memoizedVisibleItems = useMemo(() => {
    return visibleItems.map((item, index) => ({
      item,
      globalIndex: startIndex + index,
      key: `${item.id}-${startIndex + index}`
    }));
  }, [visibleItems, startIndex]);

  // Handle scroll com otimizações
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const newScrollTop = target.scrollTop;
    
    // Throttle scroll updates
    requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
      
      // Check if near end for infinite scroll
      if (onScrollEnd && !isLoading) {
        const scrollBottom = newScrollTop + containerHeight;
        const threshold = totalHeight - loadMoreThreshold;
        
        if (scrollBottom >= threshold) {
          onScrollEnd();
        }
      }
    });
  }, [containerHeight, totalHeight, loadMoreThreshold, onScrollEnd, isLoading]);

  // Dynamic height measurement for variable height items
  const measureItem = useCallback((id: string | number, height: number) => {
    if (variableHeight) {
      setMeasuredHeights(prev => {
        const newMap = new Map(prev);
        newMap.set(id, height);
        return newMap;
      });
    }
  }, [variableHeight]);

  // Item renderer com measurement para variable heights
  const renderItemWithMeasurement = useCallback((
    item: VirtualizedListItem, 
    globalIndex: number, 
    key: string
  ) => {
    const itemRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (variableHeight && itemRef.current) {
        const height = itemRef.current.offsetHeight;
        measureItem(item.id, height);
      }
    }, [item.id, variableHeight]);

    return (
      <div
        key={key}
        ref={variableHeight ? itemRef : undefined}
        style={{
          height: variableHeight ? 'auto' : itemHeight,
          minHeight: variableHeight ? (estimatedItemSize || itemHeight) : undefined
        }}
        className="virtual-list-item"
      >
        {renderItem(item, globalIndex)}
      </div>
    );
  }, [renderItem, variableHeight, itemHeight, estimatedItemSize, measureItem]);

  // Loading indicator component
  const LoadingIndicator = memo(() => (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="text-sm">Carregando...</span>
      </div>
    </div>
  ));

  // Empty state component
  const EmptyState = memo(() => (
    <div className="flex items-center justify-center h-full text-center">
      {emptyState || (
        <div className="text-gray-400">
          <div className="text-4xl mb-4">📭</div>
          <p>Nenhum item encontrado</p>
        </div>
      )}
    </div>
  ));

  // Performance monitoring
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`VirtualizedList: Rendering ${memoizedVisibleItems.length} of ${items.length} items`);
    }
  }, [memoizedVisibleItems.length, items.length]);

  if (items.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  return (
    <div 
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{ 
        height: containerHeight, 
        overflow: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#6b7280 #1f2937'
      }}
      onScroll={handleScroll}
    >
      <div 
        className="virtual-list-inner"
        style={{ 
          height: totalHeight, 
          position: 'relative',
          // Performance optimization
          contain: 'layout style paint',
          willChange: scrollTop > 0 ? 'transform' : 'auto'
        }}
      >
        <div
          className="virtual-list-items"
          style={{
            transform: `translateY(${offsetY}px)`,
            // Performance optimization
            contain: 'layout style paint'
          }}
        >
          {memoizedVisibleItems.map(({ item, globalIndex, key }) => 
            renderItemWithMeasurement(item, globalIndex, key)
          )}
        </div>
        
        {isLoading && (
          <div style={{ transform: `translateY(${totalHeight}px)` }}>
            <LoadingIndicator />
          </div>
        )}
      </div>
    </div>
  );
});

// High-performance table row for data grids
export interface VirtualizedTableRowProps {
  item: VirtualizedListItem;
  columns: Array<{
    key: string;
    title: string;
    width?: number;
    render?: (value: any, item: any) => React.ReactNode;
  }>;
  onRowClick?: (item: VirtualizedListItem) => void;
  className?: string;
}

export const VirtualizedTableRow = memo(function VirtualizedTableRow({
  item,
  columns,
  onRowClick,
  className = ''
}: VirtualizedTableRowProps) {
  const handleClick = useCallback(() => {
    onRowClick?.(item);
  }, [item, onRowClick]);

  return (
    <div
      className={`virtualized-table-row flex items-center border-b border-gray-700/30 hover:bg-white/5 transition-colors cursor-pointer ${className}`}
      onClick={handleClick}
    >
      {columns.map((column, index) => (
        <div
          key={`${item.id}-${column.key}`}
          className="flex-1 px-4 py-3 text-sm truncate"
          style={{ 
            width: column.width || 'auto',
            minWidth: column.width || 100
          }}
        >
          {column.render 
            ? column.render(item.data[column.key], item.data)
            : item.data[column.key]
          }
        </div>
      ))}
    </div>
  );
});

// Hook for infinite scroll data loading
export function useInfiniteVirtualScroll<T>(
  initialData: T[],
  loadMoreFn: (offset: number, limit: number) => Promise<T[]>,
  options: {
    pageSize?: number;
    enabled?: boolean;
  } = {}
) {
  const { pageSize = 50, enabled = true } = options;
  const [data, setData] = useState<T[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMore = useCallback(async () => {
    if (!enabled || isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const newData = await loadMoreFn(data.length, pageSize);
      
      if (newData.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newData]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [data.length, pageSize, loadMoreFn, enabled, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setIsLoading(false);
    setHasMore(true);
    setError(null);
  }, [initialData]);

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset
  };
}

// Performance-optimized search hook
export function useVirtualSearch<T>(
  data: T[],
  searchFields: (keyof T)[],
  debounceMs: number = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm) return data;

    const lowercaseSearch = debouncedSearchTerm.toLowerCase();
    
    return data.filter(item => 
      searchFields.some(field => 
        String(item[field]).toLowerCase().includes(lowercaseSearch)
      )
    );
  }, [data, searchFields, debouncedSearchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    isSearching: searchTerm !== debouncedSearchTerm
  };
}