import { io, Socket } from 'socket.io-client';

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
  private socket: Socket | null = null;
  private eventHandlers: Map<string, NotificationEventHandler[]> = new Map();
  private criticalHandlers: CriticalNotificationHandler[] = [];
  private statsHandlers: StatsUpdateHandler[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // ===== CONEXÃO WEBSOCKET =====

  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.socket = io(`ws://localhost:4000`, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('Notification service connected to WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Notification service connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Notification service disconnected:', reason);
        this.isConnected = false;
        this.handleDisconnection();
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Eventos de notificação
    this.socket.on('notification_event', (event: NotificationEvent) => {
      this.handleNotificationEvent(event);
    });

    this.socket.on('critical_notification', (event: NotificationEvent) => {
      this.handleCriticalNotification(event);
    });

    this.socket.on('notification_read_sync', (data: { notificationId: string; userId: string }) => {
      // Sincronizar leitura entre sessões do mesmo usuário
      this.handleNotificationReadSync(data);
    });

    this.socket.on('notification_subscription_confirmed', (data: any) => {
      console.log('Notification subscription confirmed:', data);
    });
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`Attempting to reconnect notification service (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
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
    if (!this.socket?.connected) {
      console.warn('Cannot subscribe to notifications: not connected');
      return;
    }

    this.socket.emit('subscribe_notifications', options);
  }

  unsubscribeFromNotifications(): void {
    if (!this.socket?.connected) {
      console.warn('Cannot unsubscribe from notifications: not connected');
      return;
    }

    this.socket.emit('unsubscribe_notifications');
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
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/notifications?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Também enviar via WebSocket para sincronização em tempo real
    if (this.socket?.connected) {
      this.socket.emit('notification_read', { notificationId });
    }
  }

  async markAllAsRead(category?: string, moduleId?: string): Promise<number> {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ category, module_name: moduleId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.count;
  }

  async archiveNotification(notificationId: string): Promise<void> {
    const response = await fetch(`/api/notifications/${notificationId}/archive`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  async getStats(): Promise<NotificationStats> {
    const response = await fetch('/api/notifications/stats', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getPreferences(): Promise<NotificationPreference[]> {
    const response = await fetch('/api/notifications/preferences', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  }

  async updatePreferences(
    category: string,
    moduleId: string | null,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const response = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        category,
        module_name: moduleId,
        ...preferences
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
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
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    return 'connecting';
  }
}

export const NotificationService = new NotificationServiceClass();