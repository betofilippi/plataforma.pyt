import { useState, useEffect, useCallback } from 'react';
import { 
  NotificationService, 
  Notification, 
  NotificationStats, 
  NotificationEvent, 
  GetNotificationsParams 
} from '../services/NotificationService';
import { useAuth } from '../contexts/AuthContext';

export interface UseNotificationsReturn {
  // Estado
  notifications: Notification[];
  stats: NotificationStats | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  
  // Métodos de busca
  fetchNotifications: (params?: GetNotificationsParams) => Promise<void>;
  refreshStats: () => Promise<void>;
  
  // Métodos de ação
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (category?: string, moduleId?: string) => Promise<void>;
  archiveNotification: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  
  // Conexão
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Paginação
  hasMore: boolean;
  loadMore: () => Promise<void>;
  
  // Filtros
  setFilters: (filters: GetNotificationsParams) => void;
  currentFilters: GetNotificationsParams;
}

export function useNotifications(autoConnect = true): UseNotificationsReturn {
  const { user, token } = useAuth();
  
  // Estado principal
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Paginação
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Filtros
  const [currentFilters, setCurrentFilters] = useState<GetNotificationsParams>({
    limit: 20,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // ===== CONEXÃO WEBSOCKET =====

  const connect = useCallback(async () => {
    if (!token || connected) return;

    try {
      setError(null);
      await NotificationService.connect(token);
      setConnected(true);

      // Configurar handlers de eventos
      setupEventHandlers();
      
      // Subscrever a notificações
      NotificationService.subscribeToNotifications();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão');
      setConnected(false);
    }
  }, [token, connected]);

  const disconnect = useCallback(() => {
    NotificationService.disconnect();
    setConnected(false);
  }, []);

  // ===== HANDLERS DE EVENTOS =====

  const setupEventHandlers = useCallback(() => {
    // Handler para novos eventos de notificação
    const unsubscribeEvents = NotificationService.on('*', (event: NotificationEvent) => {
      handleNotificationEvent(event);
    });

    // Handler para notificações críticas
    const unsubscribeCritical = NotificationService.onCritical((event: NotificationEvent) => {
      handleCriticalNotification(event);
    });

    // Handler para atualizações de estatísticas
    const unsubscribeStats = NotificationService.onStatsUpdate((newStats: NotificationStats) => {
      setStats(newStats);
    });

    // Cleanup function
    return () => {
      unsubscribeEvents();
      unsubscribeCritical();
      unsubscribeStats();
    };
  }, []);

  const handleNotificationEvent = useCallback((event: NotificationEvent) => {
    const { type, notification } = event;

    setNotifications(prevNotifications => {
      switch (type) {
        case 'notification_created':
          // Adicionar nova notificação no início
          return [notification, ...prevNotifications];

        case 'notification_read':
          // Marcar como lida
          return prevNotifications.map(n =>
            n.id === notification.id ? { ...n, read: true, read_at: new Date() } : n
          );

        case 'notification_archived':
          // Remover da lista se não estiver mostrando arquivadas
          if (!currentFilters.archived) {
            return prevNotifications.filter(n => n.id !== notification.id);
          }
          return prevNotifications.map(n =>
            n.id === notification.id ? { ...n, archived: true, archived_at: new Date() } : n
          );

        case 'notification_deleted':
          // Remover da lista
          return prevNotifications.filter(n => n.id !== notification.id);

        default:
          return prevNotifications;
      }
    });

    // Atualizar estatísticas
    refreshStats();
  }, [currentFilters.archived]);

  const handleCriticalNotification = useCallback((event: NotificationEvent) => {
    if (event.type === 'notification_created') {
      // Mostrar alerta visual para notificação crítica
      const alertEvent = new CustomEvent('critical-notification', {
        detail: event.notification
      });
      document.dispatchEvent(alertEvent);
    }
  }, []);

  // ===== MÉTODOS DE BUSCA =====

  const fetchNotifications = useCallback(async (params?: GetNotificationsParams) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const finalParams = { ...currentFilters, ...params };
      const result = await NotificationService.getNotifications(finalParams);

      if (finalParams.offset === 0) {
        // Nova busca - substituir lista
        setNotifications(result.notifications);
      } else {
        // Paginação - adicionar à lista
        setNotifications(prev => [...prev, ...result.notifications]);
      }

      setTotal(result.total);
      setHasMore(result.pagination.has_more);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar notificações');
    } finally {
      setLoading(false);
    }
  }, [user, currentFilters]);

  const refreshStats = useCallback(async () => {
    if (!user) return;

    try {
      const newStats = await NotificationService.getStats();
      setStats(newStats);
    } catch (err) {
      console.error('Erro ao atualizar estatísticas:', err);
    }
  }, [user]);

  // ===== MÉTODOS DE AÇÃO =====

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      
      // Otimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date() } : n
        )
      );
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como lida');
    }
  }, []);

  const markAllAsRead = useCallback(async (category?: string, moduleId?: string) => {
    try {
      const count = await NotificationService.markAllAsRead(category, moduleId);
      
      // Otimistic update
      setNotifications(prev =>
        prev.map(n => {
          const matchesCategory = !category || n.category === category;
          const matchesModule = !moduleId || n.module_name === moduleId;
          
          if (matchesCategory && matchesModule && !n.read) {
            return { ...n, read: true, read_at: new Date() };
          }
          return n;
        })
      );

      return count;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar todas como lidas');
      return 0;
    }
  }, []);

  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.archiveNotification(notificationId);
      
      // Remover da lista se não estiver mostrando arquivadas
      if (!currentFilters.archived) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        // Otimistic update
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, archived: true, archived_at: new Date() } : n
          )
        );
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao arquivar notificação');
    }
  }, [currentFilters.archived]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      
      // Remover da lista
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir notificação');
    }
  }, []);

  // ===== PAGINAÇÃO =====

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextOffset = (currentPage + 1) * (currentFilters.limit || 20);
    await fetchNotifications({ ...currentFilters, offset: nextOffset });
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading, currentPage, currentFilters, fetchNotifications]);

  // ===== FILTROS =====

  const setFilters = useCallback((filters: GetNotificationsParams) => {
    setCurrentFilters(prev => ({ ...prev, ...filters, offset: 0 }));
    setCurrentPage(0);
  }, []);

  // ===== EFEITOS =====

  // Auto-connect quando token estiver disponível
  useEffect(() => {
    if (autoConnect && token && user && !connected) {
      connect();
    }
  }, [autoConnect, token, user, connected, connect]);

  // Buscar notificações quando filtros mudarem
  useEffect(() => {
    if (user && connected) {
      fetchNotifications();
      refreshStats();
    }
  }, [user, connected, currentFilters]);

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Listener para sincronização entre abas
  useEffect(() => {
    const handleReadSync = (event: CustomEvent) => {
      const { notificationId } = event.detail;
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date() } : n
        )
      );
    };

    document.addEventListener('notification-read-sync', handleReadSync as EventListener);
    
    return () => {
      document.removeEventListener('notification-read-sync', handleReadSync as EventListener);
    };
  }, []);

  return {
    // Estado
    notifications,
    stats,
    loading,
    error,
    connected,
    
    // Métodos de busca
    fetchNotifications,
    refreshStats,
    
    // Métodos de ação
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    
    // Conexão
    connect,
    disconnect,
    
    // Paginação
    hasMore,
    loadMore,
    
    // Filtros
    setFilters,
    currentFilters
  };
}