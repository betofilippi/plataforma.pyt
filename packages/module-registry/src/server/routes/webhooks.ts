import express from 'express';
import crypto from 'crypto';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { ApiResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../middleware/auth';

export function createWebhookRoutes(
  db: DatabaseConnection,
  logger: Logger
) {
  const router = express.Router();

  /**
   * List user's webhooks
   */
  router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;

    const result = await db.query(`
      SELECT 
        id, url, events, is_active, last_triggered_at, 
        failures_count, created_at
      FROM webhooks
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const response: ApiResponse = {
      success: true,
      data: {
        webhooks: result.rows.map(row => ({
          id: row.id,
          url: row.url,
          events: row.events,
          isActive: row.is_active,
          lastTriggeredAt: row.last_triggered_at,
          failuresCount: row.failures_count,
          createdAt: row.created_at
        }))
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Create webhook
   */
  router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const { url, events } = req.body;

    // Validate input
    if (!url || !isValidUrl(url)) {
      throw new ApiError(400, 'INVALID_URL', 'Valid webhook URL is required');
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new ApiError(400, 'INVALID_EVENTS', 'At least one event type is required');
    }

    const validEvents = ['package.published', 'package.deprecated', 'package.unpublished', 'user.registered'];
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    
    if (invalidEvents.length > 0) {
      throw new ApiError(400, 'INVALID_EVENTS', `Invalid event types: ${invalidEvents.join(', ')}`);
    }

    // Check webhook limit (max 10 per user)
    const existingCount = await db.query(
      'SELECT COUNT(*) as count FROM webhooks WHERE user_id = $1',
      [userId]
    );

    if (parseInt(existingCount.rows[0]?.count || '0') >= 10) {
      throw new ApiError(400, 'WEBHOOK_LIMIT', 'Maximum 10 webhooks per user');
    }

    // Generate webhook secret
    const secret = generateWebhookSecret();

    const result = await db.query(`
      INSERT INTO webhooks (user_id, url, secret, events)
      VALUES ($1, $2, $3, $4)
      RETURNING id, url, events, is_active, created_at
    `, [userId, url, secret, JSON.stringify(events)]);

    logger.info('Webhook created', {
      webhookId: result.rows[0].id,
      userId,
      username: req.user!.username,
      url,
      events
    });

    const response: ApiResponse = {
      success: true,
      data: {
        webhook: {
          ...result.rows[0],
          secret
        }
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.status(201).json(response);
  }));

  /**
   * Update webhook
   */
  router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const webhookId = req.params.id;
    const { url, events, isActive } = req.body;

    // Check webhook ownership
    const existingWebhook = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, userId]
    );

    if (existingWebhook.rows.length === 0) {
      throw new ApiError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found');
    }

    const updates: any = {};

    if (url !== undefined) {
      if (!isValidUrl(url)) {
        throw new ApiError(400, 'INVALID_URL', 'Valid webhook URL is required');
      }
      updates.url = url;
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        throw new ApiError(400, 'INVALID_EVENTS', 'At least one event type is required');
      }

      const validEvents = ['package.published', 'package.deprecated', 'package.unpublished', 'user.registered'];
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      
      if (invalidEvents.length > 0) {
        throw new ApiError(400, 'INVALID_EVENTS', `Invalid event types: ${invalidEvents.join(', ')}`);
      }

      updates.events = JSON.stringify(events);
    }

    if (isActive !== undefined) {
      updates.is_active = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'NO_UPDATES', 'No valid updates provided');
    }

    const updateFields = Object.keys(updates).map((field, index) => `${field} = $${index + 3}`).join(', ');
    const updateValues = Object.values(updates);

    const result = await db.query(`
      UPDATE webhooks 
      SET ${updateFields}
      WHERE id = $1 AND user_id = $2
      RETURNING id, url, events, is_active, last_triggered_at, failures_count, created_at
    `, [webhookId, userId, ...updateValues]);

    logger.info('Webhook updated', {
      webhookId,
      userId,
      username: req.user!.username,
      updatedFields: Object.keys(updates)
    });

    const response: ApiResponse = {
      success: true,
      data: {
        webhook: result.rows[0]
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Delete webhook
   */
  router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const webhookId = req.params.id;

    const result = await db.query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
      [webhookId, userId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'WEBHOOK_NOT_FOUND', 'Webhook not found');
    }

    logger.info('Webhook deleted', {
      webhookId,
      userId,
      username: req.user!.username
    });

    res.json({
      success: true,
      data: {
        message: 'Webhook deleted successfully'
      }
    });
  }));

  /**
   * Test webhook
   */
  router.post('/:id/test', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const webhookId = req.params.id;

    const webhook = await db.query(
      'SELECT url, secret FROM webhooks WHERE id = $1 AND user_id = $2 AND is_active = true',
      [webhookId, userId]
    );

    if (webhook.rows.length === 0) {
      throw new ApiError(404, 'WEBHOOK_NOT_FOUND', 'Active webhook not found');
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Plataforma Module Registry'
      }
    };

    try {
      await triggerWebhook(webhook.rows[0].url, webhook.rows[0].secret, testPayload);
      
      logger.info('Webhook test triggered', {
        webhookId,
        userId,
        username: req.user!.username,
        url: webhook.rows[0].url
      });

      res.json({
        success: true,
        data: {
          message: 'Test webhook sent successfully'
        }
      });

    } catch (error) {
      logger.error('Webhook test failed', {
        webhookId,
        userId,
        error: error.message
      });

      throw new ApiError(500, 'WEBHOOK_TEST_FAILED', `Webhook test failed: ${error.message}`);
    }
  }));

  return router;
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

async function triggerWebhook(url: string, secret: string, payload: any): Promise<void> {
  const fetch = (await import('node-fetch')).default;
  
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Plataforma-Registry-Webhook/1.0',
      'X-Plataforma-Event': payload.event,
      'X-Plataforma-Signature-256': `sha256=${signature}`,
      'X-Plataforma-Delivery': crypto.randomUUID()
    },
    body,
    timeout: 30000 // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}