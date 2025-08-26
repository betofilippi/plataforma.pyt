import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export interface InfiniteQueryOptions<T> {
  queryKey: string[];
  queryFn: (page: number, pageSize: number) => Promise<InfiniteQueryResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
}

export interface InfiniteQueryResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export interface UseInfiniteQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  total: number;
  loadMoreRef: (node?: Element | null) => void;
}

export function useInfiniteDataQuery<T>({
  queryKey,
  queryFn,
  pageSize = 20,
  enabled = true,
  staleTime = 5 * 60 * 1000, // 5 minutes
  cacheTime = 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus = false,
}: InfiniteQueryOptions<T>): UseInfiniteQueryResult<T> {
  
  // Intersection Observer for auto-loading
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px', // Start loading when 100px away from element
  });

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      return await queryFn(pageParam, pageSize);
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.page + 1 : undefined;
    },
    enabled,
    staleTime,
    cacheTime,
    refetchOnWindowFocus,
  });

  // Auto fetch next page when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten data from all pages
  const flatData = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return {
    data: flatData,
    isLoading,
    isError,
    error: error as Error | null,
    hasNextPage: !!hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    total,
    loadMoreRef,
  };
}

// Specialized hooks for common use cases

export function useInfiniteUsers() {
  return useInfiniteDataQuery({
    queryKey: ['users', 'infinite'],
    queryFn: async (page: number, pageSize: number) => {
      const response = await fetch(`/api/users?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });
}

export function useInfiniteTables() {
  return useInfiniteDataQuery({
    queryKey: ['tables', 'infinite'],
    queryFn: async (page: number, pageSize: number) => {
      const response = await fetch(`/api/database/tables?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      return response.json();
    },
  });
}

export function useInfiniteFiles() {
  return useInfiniteDataQuery({
    queryKey: ['files', 'infinite'],
    queryFn: async (page: number, pageSize: number) => {
      const response = await fetch(`/api/storage/files?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    },
  });
}

export function useInfiniteTableData(tableName: string, filters?: Record<string, any>) {
  return useInfiniteDataQuery({
    queryKey: ['table-data', tableName, filters],
    queryFn: async (page: number, pageSize: number) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...filters,
      });
      
      const response = await fetch(`/api/database/tables/${tableName}/data?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch data for table ${tableName}`);
      }
      return response.json();
    },
    enabled: !!tableName,
  });
}

export function useInfiniteNotifications() {
  return useInfiniteDataQuery({
    queryKey: ['notifications', 'infinite'],
    queryFn: async (page: number, pageSize: number) => {
      const response = await fetch(`/api/notifications?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
  });
}

export function useInfiniteAuditLogs() {
  return useInfiniteDataQuery({
    queryKey: ['audit-logs', 'infinite'],
    queryFn: async (page: number, pageSize: number) => {
      const response = await fetch(`/api/audit/logs?page=${page}&limit=${pageSize}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      return response.json();
    },
  });
}

// Loading more component helper
export function LoadMoreIndicator({ 
  hasNextPage, 
  isFetchingNextPage, 
  loadMoreRef 
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: (node?: Element | null) => void;
}) {
  if (!hasNextPage && !isFetchingNextPage) {
    return (
      <div className="flex justify-center py-8">
        <p className="text-gray-500">Todos os itens foram carregados</p>
      </div>
    );
  }

  return (
    <div ref={loadMoreRef} className="flex justify-center py-8">
      {isFetchingNextPage ? (
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-500">Carregando mais...</span>
        </div>
      ) : (
        <button
          onClick={() => {}}
          className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}

export default useInfiniteDataQuery;