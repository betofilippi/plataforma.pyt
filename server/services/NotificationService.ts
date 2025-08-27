import { 
  Notification, 
  NotificationTemplate,
  NotificationPreference,
  NotificationChannel,
  NotificationEvent,
  NotificationStats,
  GetNotificationsParams,
  CreateNotificationParams,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  validateNotificationType,
  validateNotificationPriority,
  validateNotificationCategory,
  MAX_NOTIFICATIONS_PER_USER,
  MAX_NOTIFICATION_TITLE_LENGTH,
  MAX_NOTIFICATION_MESSAGE_LENGTH,
  NOTIFICATION_DEFAULT_TTL,
  CRITICAL_NOTIFICATION_TTL,
  CacheKeys
} from '../database/models';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
}

export class NotificationService {
  private redis: Redis;
  private db: DatabaseConnection;
  private realtimeServer?: any; // RealtimeServer instance

  constructor(db: DatabaseConnection, redis: Redis, realtimeServer?: any) {
    this.db = db;
    this.redis = redis;
    this.realtimeServer = realtimeServer;
  }

  // ===== OPERAÇÕES DE NOTIFICAÇÃO =====

  async createNotification(params: CreateNotificationParams): Promise<Notification[]> {
    const {
      user_id,
      title,
      message,
      type,
      priority,
      category,
      module_name,
      source_id,
      source_type,
      data,
      expires_at
    } = params;

    // Validações
    this.validateNotificationParams(params);

    const userIds = Array.isArray(user_id) ? user_id : [user_id];
    const notifications: Notification[] = [];

    for (const userId of userIds) {
      // Verificar limite de notificações por usuário
      await this.enforceUserNotificationLimit(userId);

      const notification: Notification = {
        id: uuidv4(),
        user_id: userId,
        title: title.substring(0, MAX_NOTIFICATION_TITLE_LENGTH),
        message: message.substring(0, MAX_NOTIFICATION_MESSAGE_LENGTH),
        type,
        priority,
        category,
        module_name,
        source_id,
        source_type,
        data,
        read: false,
        archived: false,
        expires_at: expires_at || new Date(Date.now() + (
          priority === 'critical' ? CRITICAL_NOTIFICATION_TTL : NOTIFICATION_DEFAULT_TTL
        )),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Inserir no banco de dados
      await this.insertNotification(notification);
      notifications.push(notification);

      // Invalidar cache
      await this.invalidateUserCache(userId);

      // Enviar notificação em tempo real
      await this.sendRealtimeNotification(notification, 'notification_created');
    }

    return notifications;
  }

  async getUserNotifications(params: GetNotificationsParams): Promise<{ notifications: Notification[], total: number }> {
    const {
      user_id,
      read,
      archived = false,
      category,
      type,
      priority,
      module_name,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params;

    // Tentar buscar do cache primeiro
    const cacheKey = this.buildNotificationsCacheKey(params);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Construir query
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 AND archived = $2
    `;
    const queryParams: any[] = [user_id, archived];
    let paramIndex = 3;

    if (read !== undefined) {
      query += ` AND read = $${paramIndex}`;
      queryParams.push(read);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (priority) {
      query += ` AND priority = $${paramIndex}`;
      queryParams.push(priority);
      paramIndex++;
    }

    if (module_name) {
      query += ` AND module_name = $${paramIndex}`;
      queryParams.push(module_name);
      paramIndex++;
    }

    // Filtrar notificações expiradas
    query += ` AND (expires_at IS NULL OR expires_at > NOW())`;

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) as filtered_notifications`;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Adicionar ordenação e paginação
    query += ` ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await this.db.query(query, queryParams);
    const notifications = result.rows as Notification[];

    const response = { notifications, total };

    // Cache por 1 minuto
    await this.redis.setex(cacheKey, 60, JSON.stringify(response));

    return response;
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET read = true, read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND read = false
      RETURNING *
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    
    if (result.rows.length > 0) {
      await this.invalidateUserCache(userId);
      const notification = result.rows[0] as Notification;
      await this.sendRealtimeNotification(notification, 'notification_read');
      return true;
    }

    return false;
  }

  async markAllAsRead(userId: string, category?: NotificationCategory, moduleId?: string): Promise<number> {
    let query = `
      UPDATE notifications 
      SET read = true, read_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND read = false AND archived = false
    `;
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (moduleId) {
      query += ` AND module_name = $${paramIndex}`;
      queryParams.push(moduleId);
      paramIndex++;
    }

    query += ` RETURNING id`;

    const result = await this.db.query(query, queryParams);
    
    if (result.rows.length > 0) {
      await this.invalidateUserCache(userId);
      
      // Enviar evento em tempo real para cada notificação
      for (const row of result.rows) {
        const notificationQuery = 'SELECT * FROM notifications WHERE id = $1';
        const notificationResult = await this.db.query(notificationQuery, [row.id]);
        if (notificationResult.rows.length > 0) {
          const notification = notificationResult.rows[0] as Notification;
          await this.sendRealtimeNotification(notification, 'notification_read');
        }
      }
    }

    return result.rows.length;
  }

  async archiveNotification(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications 
      SET archived = true, archived_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND archived = false
      RETURNING *
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    
    if (result.rows.length > 0) {
      await this.invalidateUserCache(userId);
      const notification = result.rows[0] as Notification;
      await this.sendRealtimeNotification(notification, 'notification_archived');
      return true;
    }

    return false;
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM notifications 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    
    if (result.rows.length > 0) {
      await this.invalidateUserCache(userId);
      const notification = result.rows[0] as Notification;
      await this.sendRealtimeNotification(notification, 'notification_deleted');
      return true;
    }

    return false;
  }

  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const cacheKey = CacheKeys.notificationStats(userId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN read = false THEN 1 END) as unread,
        type,
        category,
        priority
      FROM notifications 
      WHERE user_id = $1 AND archived = false AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY type, category, priority
    `;

    const result = await this.db.query(query, [userId]);
    
    const stats: NotificationStats = {
      user_id: userId,
      total: 0,
      unread: 0,
      by_type: {},
      by_category: {},
      by_priority: {},
      recent_activity: new Date()
    };

    for (const row of result.rows) {
      stats.total += parseInt(row.total);
      stats.unread += parseInt(row.unread);
      
      if (row.type) {
        stats.by_type[row.type] = (stats.by_type[row.type] || 0) + parseInt(row.total);
      }
      
      if (row.category) {
        stats.by_category[row.category] = (stats.by_category[row.category] || 0) + parseInt(row.total);
      }
      
      if (row.priority) {
        stats.by_priority[row.priority] = (stats.by_priority[row.priority] || 0) + parseInt(row.total);
      }
    }

    // Buscar atividade recente
    const recentQuery = `
      SELECT MAX(created_at) as recent_activity 
      FROM notifications 
      WHERE user_id = $1
    `;
    const recentResult = await this.db.query(recentQuery, [userId]);
    if (recentResult.rows.length > 0 && recentResult.rows[0].recent_activity) {
      stats.recent_activity = new Date(recentResult.rows[0].recent_activity);
    }

    // Cache por 5 minutos
    await this.redis.setex(cacheKey, 300, JSON.stringify(stats));

    return stats;
  }

  // ===== TEMPLATES DE NOTIFICAÇÃO =====

  async createNotificationFromTemplate(
    templateName: string, 
    userId: string | string[], 
    variables: Record<string, any> = {},
    overrides: Partial<CreateNotificationParams> = {}
  ): Promise<Notification[]> {
    const template = await this.getNotificationTemplate(templateName);
    if (!template) {
      throw new Error(`Template não encontrado: ${templateName}`);
    }

    const title = this.replaceVariables(template.title, variables);
    const message = this.replaceVariables(template.message, variables);

    const params: CreateNotificationParams = {
      user_id: userId,
      title,
      message,
      type: template.type,
      priority: template.priority,
      category: template.category,
      module_name: template.module_name,
      ...overrides
    };

    return this.createNotification(params);
  }

  async getNotificationTemplate(name: string): Promise<NotificationTemplate | null> {
    const query = 'SELECT * FROM notification_templates WHERE name = $1 AND is_active = true';
    const result = await this.db.query(query, [name]);
    
    return result.rows.length > 0 ? result.rows[0] as NotificationTemplate : null;
  }

  // ===== PREFERÊNCIAS DE USUÁRIO =====

  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    const cacheKey = CacheKeys.userPreferences(userId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
    const result = await this.db.query(query, [userId]);
    const preferences = result.rows as NotificationPreference[];

    // Cache por 30 minutos
    await this.redis.setex(cacheKey, 1800, JSON.stringify(preferences));

    return preferences;
  }

  async updateUserPreference(
    userId: string, 
    category: NotificationCategory, 
    moduleId: string | null,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const query = `
      INSERT INTO notification_preferences (
        id, user_id, category, module_name, enabled, email_enabled, 
        push_enabled, sound_enabled, desktop_enabled, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) ON CONFLICT (user_id, category, module_name) 
      DO UPDATE SET 
        enabled = $5,
        email_enabled = $6,
        push_enabled = $7,
        sound_enabled = $8,
        desktop_enabled = $9,
        updated_at = NOW()
      RETURNING *
    `;

    const preference = {
      enabled: true,
      email_enabled: true,
      push_enabled: true,
      sound_enabled: true,
      desktop_enabled: true,
      ...preferences
    };

    const result = await this.db.query(query, [
      uuidv4(),
      userId,
      category,
      moduleId,
      preference.enabled,
      preference.email_enabled,
      preference.push_enabled,
      preference.sound_enabled,
      preference.desktop_enabled
    ]);

    // Invalidar cache
    await this.redis.del(CacheKeys.userPreferences(userId));

    return result.rows[0] as NotificationPreference;
  }

  // ===== LIMPEZA E MANUTENÇÃO =====

  async cleanupExpiredNotifications(): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
      RETURNING user_id
    `;

    const result = await this.db.query(query);
    
    // Invalidar cache de usuários afetados
    const affectedUsers = [...new Set(result.rows.map(row => row.user_id))];
    for (const userId of affectedUsers) {
      await this.invalidateUserCache(userId);
    }

    return result.rows.length;
  }

  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING user_id
    `;

    const result = await this.db.query(query);
    
    // Invalidar cache de usuários afetados
    const affectedUsers = [...new Set(result.rows.map(row => row.user_id))];
    for (const userId of affectedUsers) {
      await this.invalidateUserCache(userId);
    }

    return result.rows.length;
  }

  // ===== MÉTODOS PRIVADOS =====

  private validateNotificationParams(params: CreateNotificationParams): void {
    if (!params.title || params.title.length === 0) {
      throw new Error('Título é obrigatório');
    }

    if (!params.message || params.message.length === 0) {
      throw new Error('Mensagem é obrigatória');
    }

    if (!validateNotificationType(params.type)) {
      throw new Error(`Tipo inválido: ${params.type}`);
    }

    if (!validateNotificationPriority(params.priority)) {
      throw new Error(`Prioridade inválida: ${params.priority}`);
    }

    if (!validateNotificationCategory(params.category)) {
      throw new Error(`Categoria inválida: ${params.category}`);
    }

    const userIds = Array.isArray(params.user_id) ? params.user_id : [params.user_id];
    if (userIds.length === 0) {
      throw new Error('Pelo menos um usuário deve ser especificado');
    }
  }

  private async insertNotification(notification: Notification): Promise<void> {
    const query = `
      INSERT INTO notifications (
        id, user_id, title, message, type, priority, category, 
        module_name, source_id, source_type, data, read, archived, 
        expires_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
    `;

    await this.db.query(query, [
      notification.id,
      notification.user_id,
      notification.title,
      notification.message,
      notification.type,
      notification.priority,
      notification.category,
      notification.module_name,
      notification.source_id,
      notification.source_type,
      JSON.stringify(notification.data),
      notification.read,
      notification.archived,
      notification.expires_at,
      notification.created_at,
      notification.updated_at
    ]);
  }

  private async enforceUserNotificationLimit(userId: string): Promise<void> {
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM notifications 
      WHERE user_id = $1 AND archived = false
    `;

    const result = await this.db.query(countQuery, [userId]);
    const total = parseInt(result.rows[0].total);

    if (total >= MAX_NOTIFICATIONS_PER_USER) {
      // Arquivar notificações mais antigas
      const archiveQuery = `
        UPDATE notifications 
        SET archived = true, archived_at = NOW(), updated_at = NOW()
        WHERE id IN (
          SELECT id FROM notifications 
          WHERE user_id = $1 AND archived = false 
          ORDER BY created_at ASC 
          LIMIT $2
        )
      `;

      const toArchive = total - MAX_NOTIFICATIONS_PER_USER + 1;
      await this.db.query(archiveQuery, [userId, toArchive]);
    }
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    const pattern = `*${userId}*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private buildNotificationsCacheKey(params: GetNotificationsParams): string {
    return `notifications:${params.user_id}:${JSON.stringify(params)}`;
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  private async sendRealtimeNotification(notification: Notification, eventType: NotificationEvent['type']): Promise<void> {
    if (!this.realtimeServer) return;

    try {
      // Usar o método broadcastNotification do RealtimeServer
      this.realtimeServer.broadcastNotification(notification, eventType);

      // Cache da notificação em tempo real
      const cacheKey = CacheKeys.liveNotifications(notification.user_id);
      const cached = await this.redis.get(cacheKey);
      const liveNotifications = cached ? JSON.parse(cached) : [];
      
      const event: NotificationEvent = {
        type: eventType,
        notification,
        user_id: notification.user_id,
        timestamp: new Date()
      };
      
      liveNotifications.unshift(event);
      
      // Manter apenas as últimas 100 notificações em tempo real
      if (liveNotifications.length > 100) {
        liveNotifications.splice(100);
      }
      
      await this.redis.setex(cacheKey, 3600, JSON.stringify(liveNotifications)); // Cache por 1 hora
    } catch (error) {
      console.error('Error sending real-time notification:', error);
    }
  }
}