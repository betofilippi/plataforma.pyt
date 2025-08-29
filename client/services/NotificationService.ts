import { pythonApiClient } from '@/lib/python-api-client';
import { PYTHON_API_URLS } from '@/lib/api-config';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  source_id?: string;
  source_type?: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: Date;
  archived: boolean;
  archived_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationStats {
  user_id: string;
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  recent_activity: Date;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  category: 'system' | 'module' | 'security' | 'workflow' | 'user';
  module_name?: string;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GetNotificationsParams {
  read?: boolean;
  archived?: boolean;
  category?: 'system' | 'module' | 'security' | 'workflow' | 'user';
  type?: 'info' | 'success' | 'warning' | 'error' | 'critical';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  module_name?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'priority' | 'type';
  sort_order?: 'asc' | 'desc';
}

export interface NotificationEvent {
  type: 'notification_created' | 'notification_read' | 'notification_archived' | 'notification_deleted';
  notification: Notification;
  user_id: string;
  timestamp: Date;
}

type NotificationEventHandler = (event: NotificationEvent) => void;
type CriticalNotificationHandler = (event: NotificationEvent) => void;
type StatsUpdateHandler = (stats: NotificationStats) => void;

class NotificationServiceClass {
  private websocket: WebSocket | null = null;
  private eventHandlers: Map<string, NotificationEventHandler[]> = new Map();
  private criticalHandlers: CriticalNotificationHandler[] = [];
  private statsHandlers: StatsUpdateHandler[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // ===== CONEXÃO WEBSOCKET =====

  async connect(token: string): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = PYTHON_API_URLS.websocket.replace('http', 'ws');
        this.websocket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

        this.websocket.onopen = () => {
          console.log('Notification service connected to WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.websocket.onerror = (error) => {
          console.error('Notification service connection error:', error);
          this.isConnected = false;
          reject(error);
        };

        this.websocket.onclose = (event) => {
          console.log('Notification service disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.handleDisconnection(token);
        };

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
    }
  }

  private handleMessage(data: any): void {
    if (data.type === 'notification_event') {
      this.handleNotificationEvent(data.payload);
    } else if (data.type === 'critical_notification') {
      this.handleCriticalNotification(data.payload);
    } else if (data.type === 'notification_read_sync') {
      this.handleNotificationReadSync(data.payload);
    }
  }

  private handleDisconnection(token?: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && token) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`Attempting to reconnect notification service (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect(token).catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached for notification service');
    }
  }

  private handleNotificationEvent(event: NotificationEvent): void {
    // Notificar handlers específicos do tipo de evento
    const handlers = this.eventHandlers.get(event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in notification event handler:', error);
      }
    });

    // Notificar handlers gerais
    const generalHandlers = this.eventHandlers.get('*') || [];
    generalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in general notification handler:', error);
      }
    });

    // Mostrar notificação do browser se permitido
    if (event.type === 'notification_created' && this.hasPermission()) {
      this.showBrowserNotification(event.notification);
    }

    // Atualizar estatísticas
    this.updateStats();
  }

  private handleCriticalNotification(event: NotificationEvent): void {
    this.criticalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in critical notification handler:', error);
      }
    });

    // Para notificações críticas, sempre tentar mostrar notificação do browser
    if (event.type === 'notification_created') {
      this.showBrowserNotification(event.notification, { requireInteraction: true });
    }
  }

  private handleNotificationReadSync(data: { notificationId: string; userId: string }): void {
    // Emitir evento local para sincronizar UI
    const event = new CustomEvent('notification-read-sync', { detail: data });
    document.dispatchEvent(event);
  }

  // ===== SUBSCRIPTIONS =====

  subscribeToNotifications(options: {
    categories?: string[];
    modules?: string[];
    priorities?: string[];
  } = {}): void {
    if (!this.isConnected || !this.websocket) {
      console.warn('Cannot subscribe to notifications: not connected');
      return;
    }

    this.websocket.send(JSON.stringify({
      type: 'subscribe_notifications',
      payload: options
    }));
  }

  unsubscribeFromNotifications(): void {
    if (!this.isConnected || !this.websocket) {
      console.warn('Cannot unsubscribe from notifications: not connected');
      return;
    }

    this.websocket.send(JSON.stringify({
      type: 'unsubscribe_notifications'
    }));
  }

  // ===== EVENT HANDLERS =====

  on(eventType: NotificationEvent['type'] | '*', handler: NotificationEventHandler): () => void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);

    // Retorna função para remover o handler
    return () => {
      const currentHandlers = this.eventHandlers.get(eventType) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.eventHandlers.set(eventType, currentHandlers);
      }
    };
  }

  onCritical(handler: CriticalNotificationHandler): () => void {
    this.criticalHandlers.push(handler);

    return () => {
      const index = this.criticalHandlers.indexOf(handler);
      if (index > -1) {
        this.criticalHandlers.splice(index, 1);
      }
    };
  }

  onStatsUpdate(handler: StatsUpdateHandler): () => void {
    this.statsHandlers.push(handler);

    return () => {
      const index = this.statsHandlers.indexOf(handler);
      if (index > -1) {
        this.statsHandlers.splice(index, 1);
      }
    };
  }

  // ===== API CALLS =====

  async getNotifications(params: GetNotificationsParams = {}): Promise<{
    notifications: Notification[];
    total: number;
    pagination: any;
  }> {
    try {
      const result = await pythonApiClient.notifications.list(params);
      return {
        notifications: result.items || [],
        total: result.total || 0,
        pagination: result.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { notifications: [], total: 0, pagination: {} };
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await pythonApiClient.notifications.markAsRead(notificationId);
      
      // Também enviar via WebSocket para sincronização em tempo real
      if (this.isConnected && this.websocket) {
        this.websocket.send(JSON.stringify({
          type: 'notification_read',
          payload: { notificationId }
        }));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(category?: string, moduleId?: string): Promise<number> {
    try {
      const result = await pythonApiClient.notifications.markAllAsRead({ category, module_name: moduleId });
      return result.count || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async archiveNotification(notificationId: string): Promise<void> {
    try {
      await pythonApiClient.notifications.archive(notificationId);
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await pythonApiClient.notifications.delete(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  async getStats(): Promise<NotificationStats> {
    try {
      const result = await pythonApiClient.notifications.getStats();
      return result;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }

  async getPreferences(): Promise<NotificationPreference[]> {
    try {
      const result = await pythonApiClient.notifications.getPreferences();
      return result;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return [];
    }
  }

  async updatePreferences(
    category: string,
    moduleId: string | null,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    try {
      const result = await pythonApiClient.notifications.updatePreferences([{
        category,
        module_name: moduleId,
        ...preferences
      }]);
      return result[0] || preferences as NotificationPreference;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // ===== BROWSER NOTIFICATIONS =====

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  private showBrowserNotification(notification: Notification, options: NotificationOptions = {}): void {
    if (!this.hasPermission()) return;

    const title = notification.title;
    const body = notification.message;
    
    const notificationOptions: NotificationOptions = {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notification.id,
      timestamp: new Date(notification.created_at).getTime(),
      ...options
    };

    const browserNotification = new Notification(title, notificationOptions);

    browserNotification.onclick = () => {
      window.focus();
      // Navegar para o centro de notificações
      if (window.location.pathname !== '/notifications') {
        window.location.pathname = '/notifications';
      }
      browserNotification.close();
    };

    // Fechar automaticamente após 5 segundos (exceto notificações críticas)
    if (notification.priority !== 'critical') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  // ===== UTILS =====

  private async updateStats(): Promise<void> {
    try {
      const stats = await this.getStats();
      this.statsHandlers.forEach(handler => {
        try {
          handler(stats);
        } catch (error) {
          console.error('Error in stats update handler:', error);
        }
      });
    } catch (error) {
      console.error('Error updating notification stats:', error);
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.websocket) return 'disconnected';
    if (this.websocket.readyState === WebSocket.OPEN) return 'connected';
    if (this.websocket.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }
}

export const NotificationService = new NotificationServiceClass();