import express from 'express';
import { NotificationService } from '../services/NotificationService';
import { requireAuth } from '../auth/middleware';
import { 
  GetNotificationsParams, 
  CreateNotificationParams,
  validateNotificationType,
  validateNotificationPriority,
  validateNotificationCategory
} from '../database/models';

export function createNotificationRoutes(notificationService: NotificationService, dbPool: any) {
  const router = express.Router();

  // Middleware de autenticação para todas as rotas
  router.use(requireAuth(dbPool));

  // ===== ROTAS DE NOTIFICAÇÕES =====

  /**
   * GET /api/notifications
   * Buscar notificações do usuário com filtros
   */
  router.get('/', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        read,
        archived,
        category,
        type,
        priority,
        module_name,
        limit,
        offset,
        sort_by,
        sort_order
      } = req.query;

      const params: GetNotificationsParams = {
        user_id: userId,
        ...(read !== undefined && { read: read === 'true' }),
        ...(archived !== undefined && { archived: archived === 'true' }),
        ...(category && { category: category as any }),
        ...(type && { type: type as any }),
        ...(priority && { priority: priority as any }),
        ...(module_name && { module_name: module_name as string }),
        ...(limit && { limit: parseInt(limit as string) }),
        ...(offset && { offset: parseInt(offset as string) }),
        ...(sort_by && { sort_by: sort_by as any }),
        ...(sort_order && { sort_order: sort_order as any })
      };

      const result = await notificationService.getUserNotifications(params);

      res.json({
        success: true,
        data: result.notifications,
        total: result.total,
        pagination: {
          limit: params.limit || 50,
          offset: params.offset || 0,
          has_more: result.total > (params.offset || 0) + (params.limit || 50)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  });

  /**
   * POST /api/notifications
   * Criar nova notificação (admin ou sistema)
   */
  router.post('/', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

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
      } = req.body;

      // Validações básicas
      if (!user_id || !title || !message || !type || !priority || !category) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: user_id, title, message, type, priority, category' 
        });
      }

      if (!validateNotificationType(type)) {
        return res.status(400).json({ error: 'Tipo de notificação inválido' });
      }

      if (!validateNotificationPriority(priority)) {
        return res.status(400).json({ error: 'Prioridade de notificação inválida' });
      }

      if (!validateNotificationCategory(category)) {
        return res.status(400).json({ error: 'Categoria de notificação inválida' });
      }

      const params: CreateNotificationParams = {
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
        ...(expires_at && { expires_at: new Date(expires_at) })
      };

      const notifications = await notificationService.createNotification(params);

      res.status(201).json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      res.status(500).json({ 
        error: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * POST /api/notifications/template/:templateName
   * Criar notificação a partir de template
   */
  router.post('/template/:templateName', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { templateName } = req.params;
      const { user_id, variables = {}, overrides = {} } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id é obrigatório' });
      }

      const notifications = await notificationService.createNotificationFromTemplate(
        templateName,
        user_id,
        variables,
        overrides
      );

      res.status(201).json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      console.error('Erro ao criar notificação por template:', error);
      
      if (error.message.includes('Template não encontrado')) {
        return res.status(404).json({ error: error.message });
      }

      res.status(500).json({ 
        error: error.message || 'Erro interno do servidor'
      });
    }
  });

  /**
   * PUT /api/notifications/:id/read
   * Marcar notificação como lida
   */
  router.put('/:id/read', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      const success = await notificationService.markAsRead(id, userId);

      if (!success) {
        return res.status(404).json({ error: 'Notificação não encontrada ou já lida' });
      }

      res.json({ success: true, message: 'Notificação marcada como lida' });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * PUT /api/notifications/read-all
   * Marcar todas as notificações como lidas
   */
  router.put('/read-all', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { category, module_name } = req.body;

      const count = await notificationService.markAllAsRead(userId, category, module_name);

      res.json({ 
        success: true, 
        message: `${count} notificação(ões) marcada(s) como lida(s)`,
        count 
      });
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * PUT /api/notifications/:id/archive
   * Arquivar notificação
   */
  router.put('/:id/archive', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      const success = await notificationService.archiveNotification(id, userId);

      if (!success) {
        return res.status(404).json({ error: 'Notificação não encontrada ou já arquivada' });
      }

      res.json({ success: true, message: 'Notificação arquivada' });
    } catch (error) {
      console.error('Erro ao arquivar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * DELETE /api/notifications/:id
   * Excluir notificação
   */
  router.delete('/:id', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { id } = req.params;
      const success = await notificationService.deleteNotification(id, userId);

      if (!success) {
        return res.status(404).json({ error: 'Notificação não encontrada' });
      }

      res.json({ success: true, message: 'Notificação excluída' });
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * GET /api/notifications/stats
   * Obter estatísticas de notificações do usuário
   */
  router.get('/stats', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const stats = await notificationService.getNotificationStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas de notificações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * GET /api/notifications/preferences
   * Obter preferências de notificação do usuário
   */
  router.get('/preferences', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const preferences = await notificationService.getUserPreferences(userId);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * PUT /api/notifications/preferences
   * Atualizar preferências de notificação do usuário
   */
  router.put('/preferences', async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const {
        category,
        module_name,
        enabled,
        email_enabled,
        push_enabled,
        sound_enabled,
        desktop_enabled
      } = req.body;

      if (!category) {
        return res.status(400).json({ error: 'Categoria é obrigatória' });
      }

      if (!validateNotificationCategory(category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
      }

      const preferences = {
        ...(enabled !== undefined && { enabled }),
        ...(email_enabled !== undefined && { email_enabled }),
        ...(push_enabled !== undefined && { push_enabled }),
        ...(sound_enabled !== undefined && { sound_enabled }),
        ...(desktop_enabled !== undefined && { desktop_enabled })
      };

      const updatedPreference = await notificationService.updateUserPreference(
        userId,
        category,
        module_name || null,
        preferences
      );

      res.json({
        success: true,
        data: updatedPreference
      });
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // ===== ROTAS ADMINISTRATIVAS =====

  /**
   * POST /api/notifications/cleanup/expired
   * Limpar notificações expiradas (admin)
   */
  router.post('/cleanup/expired', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const deletedCount = await notificationService.cleanupExpiredNotifications();

      res.json({
        success: true,
        message: `${deletedCount} notificação(ões) expirada(s) removida(s)`
      });
    } catch (error) {
      console.error('Erro na limpeza de notificações expiradas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  /**
   * POST /api/notifications/cleanup/old
   * Limpar notificações antigas (admin)
   */
  router.post('/cleanup/old', async (req, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { days = 90 } = req.body;
      const deletedCount = await notificationService.cleanupOldNotifications(days);

      res.json({
        success: true,
        message: `${deletedCount} notificação(ões) antiga(s) removida(s)`
      });
    } catch (error) {
      console.error('Erro na limpeza de notificações antigas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  return router;
}