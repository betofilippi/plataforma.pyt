import { createClient } from 'redis';
type Redis = ReturnType<typeof createClient>;
import { Pool } from 'pg';
import { EventEmitter } from 'events';

export interface LogoutEvent {
  sessionId: string;
  userId: string;
  domains: string[];
  reason: 'manual' | 'expired' | 'security' | 'admin';
  timestamp: Date;
  initiatedBy?: string;
  metadata?: Record<string, any>;
}

export interface LogoutSyncConfig {
  redis: Redis;
  pool: Pool;
  eventEmitter?: EventEmitter;
  enableBroadcast?: boolean;
  enableWebhooks?: boolean;
  webhookEndpoints?: string[];
}

/**
 * Global Logout Synchronization Service
 * 
 * Ensures logout events are synchronized across all domains and sessions
 */
export class LogoutSyncService {
  private redis: Redis | null;
  private pool: Pool;
  private eventEmitter: EventEmitter;
  private enableBroadcast: boolean;
  private enableWebhooks: boolean;
  private webhookEndpoints: string[];
  private subscriber?: Redis;
  private isInitialized = false;
  private redisEnabled: boolean;

  constructor(config: LogoutSyncConfig) {
    this.redis = config.redis;
    this.pool = config.pool;
    this.eventEmitter = config.eventEmitter || new EventEmitter();
    this.enableBroadcast = config.enableBroadcast ?? true;
    this.enableWebhooks = config.enableWebhooks ?? false;
    this.webhookEndpoints = config.webhookEndpoints || [];
    this.redisEnabled = !!this.redis && process.env.DISABLE_REDIS !== 'true';
    
    if (!this.redisEnabled) {
      console.log('🚫 Logout sync service using database-only mode (Redis disabled)');
    }
  }

  /**
   * Initialize the logout sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create Redis subscriber for logout events only if Redis is available
      if (this.redisEnabled && this.redis && this.enableBroadcast) {
        try {
          this.subscriber = this.redis.duplicate();
          await this.subscriber.connect();
          
          // Subscribe to logout events
          await this.subscriber.subscribe('sso:logout', this.handleLogoutEvent.bind(this));
          await this.subscriber.subscribe('sso:session:revoked', this.handleSessionRevoked.bind(this));
          await this.subscriber.subscribe('sso:user:banned', this.handleUserBanned.bind(this));
          
          console.log('✅ Logout sync Redis subscriber initialized');
        } catch (redisError) {
          console.warn('⚠️ Failed to initialize Redis subscriber, using database-only mode:', redisError);
          this.redis = null;
          this.redisEnabled = false;
        }
      } else {
        console.log('ℹ️ Logout sync service running in database-only mode');
      }

      this.isInitialized = true;
      console.log('✅ Logout sync service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize logout sync service:', error);
      // Don't throw - allow service to work in database-only mode
      this.isInitialized = true;
    }
  }

  /**
   * Initiate global logout for a user
   */
  async initiateGlobalLogout(
    userId: string,
    reason: LogoutEvent['reason'] = 'manual',
    initiatedBy?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Get all active sessions for the user
      const sessions = await this.getUserActiveSessions(userId);
      
      if (sessions.length === 0) {
        console.log(`No active sessions found for user ${userId}`);
        return;
      }

      // Create logout event for each session
      for (const session of sessions) {
        const logoutEvent: LogoutEvent = {
          sessionId: session.sessionId,
          userId,
          domains: session.domains,
          reason,
          timestamp: new Date(),
          initiatedBy,
          metadata,
        };

        await this.processLogoutEvent(logoutEvent);
      }

      console.log(`✅ Global logout initiated for user ${userId}, ${sessions.length} sessions affected`);
    } catch (error) {
      console.error('Failed to initiate global logout:', error);
      throw error;
    }
  }

  /**
   * Initiate logout for a specific session
   */
  async initiateSessionLogout(
    sessionId: string,
    reason: LogoutEvent['reason'] = 'manual',
    initiatedBy?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      let session: any = null;
      
      // Try to get session info from Redis first
      if (this.redis && this.redisEnabled) {
        try {
          const sessionData = await this.redis.get(`sso:session:${sessionId}`);
          if (sessionData) {
            session = JSON.parse(sessionData);
          }
        } catch (redisError) {
          console.warn('⚠️ Failed to get session from Redis, trying database:', redisError);
        }
      }
      
      // Fallback to database if Redis failed or session not found
      if (!session) {
        try {
          const result = await this.pool.query(`
            SELECT user_id, domains FROM plataforma_core.sso_sessions 
            WHERE session_id = $1 AND is_active = true
          `, [sessionId]);
          
          if (result.rows.length > 0) {
            const row = result.rows[0];
            session = {
              userId: row.user_id,
              domains: Array.isArray(row.domains) ? row.domains : JSON.parse(row.domains || '[]'),
            };
          }
        } catch (dbError) {
          console.error('Failed to get session from database:', dbError);
        }
      }
      
      if (!session) {
        console.log(`Session ${sessionId} not found or already expired`);
        return;
      }
      
      const logoutEvent: LogoutEvent = {
        sessionId,
        userId: session.userId,
        domains: session.domains || [],
        reason,
        timestamp: new Date(),
        initiatedBy,
        metadata,
      };

      await this.processLogoutEvent(logoutEvent);

      console.log(`✅ Session logout initiated for ${sessionId}`);
    } catch (error) {
      console.error('Failed to initiate session logout:', error);
      throw error;
    }
  }

  /**
   * Process a logout event
   */
  private async processLogoutEvent(event: LogoutEvent): Promise<void> {
    try {
      // 1. Store logout event in database
      await this.storeLogoutEvent(event);

      // 2. Invalidate session in Redis
      await this.invalidateSession(event.sessionId);

      // 3. Broadcast logout event
      if (this.enableBroadcast) {
        await this.broadcastLogoutEvent(event);
      }

      // 4. Emit local event
      this.eventEmitter.emit('logout', event);

      // 5. Send webhooks if enabled
      if (this.enableWebhooks && this.webhookEndpoints.length > 0) {
        await this.sendLogoutWebhooks(event);
      }

      // 6. Clean up related data
      await this.cleanupSessionData(event);

    } catch (error) {
      console.error('Failed to process logout event:', error);
      throw error;
    }
  }

  /**
   * Store logout event in database for auditing
   */
  private async storeLogoutEvent(event: LogoutEvent): Promise<void> {
    await this.pool.query(`
      INSERT INTO plataforma_core.sso_logout_events (
        session_id, user_id, domains, reason, timestamp, initiated_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      event.sessionId,
      event.userId,
      JSON.stringify(event.domains),
      event.reason,
      event.timestamp,
      event.initiatedBy,
      event.metadata || {}
    ]);
  }

  /**
   * Invalidate session in Redis and database
   */
  private async invalidateSession(sessionId: string): Promise<void> {
    // Remove from Redis if available
    if (this.redis && this.redisEnabled) {
      try {
        // Get session data first for user sessions cleanup
        const sessionData = await this.redis.get(`sso:session:${sessionId}`);
        
        // Remove session
        await this.redis.del(`sso:session:${sessionId}`);
        
        // Remove from user sessions set
        if (sessionData) {
          const session = JSON.parse(sessionData);
          await this.redis.sRem(`sso:user:${session.userId}:sessions`, sessionId);
        }
      } catch (redisError) {
        console.warn('⚠️ Failed to invalidate session in Redis:', redisError);
      }
    }
    
    // Mark as inactive in database (always do this)
    try {
      await this.pool.query(`
        UPDATE plataforma_core.sso_sessions
        SET is_active = false, destroyed_at = NOW()
        WHERE session_id = $1
      `, [sessionId]);
    } catch (dbError) {
      console.error('Failed to invalidate session in database:', dbError);
      throw dbError; // This is critical, so we throw
    }
  }

  /**
   * Broadcast logout event to all subscribers
   */
  private async broadcastLogoutEvent(event: LogoutEvent): Promise<void> {
    if (!this.redis || !this.redisEnabled) {
      console.log('📡 Broadcast disabled (Redis not available) - using local events only');
      return;
    }

    try {
      const message = {
        type: 'global_logout',
        event,
        timestamp: new Date().toISOString(),
      };

      await this.redis.publish('sso:logout', JSON.stringify(message));
    } catch (error) {
      console.warn('⚠️ Failed to broadcast logout event via Redis:', error);
    }
  }

  /**
   * Send webhook notifications
   */
  private async sendLogoutWebhooks(event: LogoutEvent): Promise<void> {
    const webhookPayload = {
      type: 'user.logout',
      data: event,
      timestamp: event.timestamp.toISOString(),
    };

    const webhookPromises = this.webhookEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Event-Type': 'sso.logout',
            'X-Timestamp': event.timestamp.toISOString(),
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          console.warn(`Webhook failed for ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        console.error(`Webhook error for ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(webhookPromises);
  }

  /**
   * Clean up session-related data
   */
  private async cleanupSessionData(event: LogoutEvent): Promise<void> {
    // Clean up any temporary tokens
    const tokenKeys = await this.redis.keys(`sso:token:*`);
    for (const tokenKey of tokenKeys) {
      const tokenData = await this.redis.get(tokenKey);
      if (tokenData) {
        const token = JSON.parse(tokenData);
        if (token.sessionId === event.sessionId) {
          await this.redis.del(tokenKey);
        }
      }
    }

    // Clean up any session-specific cache
    await this.redis.del(`sso:session:${event.sessionId}:cache`);
    await this.redis.del(`sso:session:${event.sessionId}:permissions`);
  }

  /**
   * Handle logout event from Redis pub/sub
   */
  private async handleLogoutEvent(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'global_logout' && data.event) {
        const event: LogoutEvent = data.event;
        
        // Emit local event for application handling
        this.eventEmitter.emit('remote-logout', event);
        
        // Log the remote logout
        console.log(`📡 Remote logout received for session ${event.sessionId}`);
      }
    } catch (error) {
      console.error('Failed to handle logout event:', error);
    }
  }

  /**
   * Handle session revoked event
   */
  private async handleSessionRevoked(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      if (data.sessionId) {
        await this.initiateSessionLogout(
          data.sessionId, 
          'security', 
          'system',
          { reason: 'session_revoked', ...data.metadata }
        );
      }
    } catch (error) {
      console.error('Failed to handle session revoked event:', error);
    }
  }

  /**
   * Handle user banned event
   */
  private async handleUserBanned(message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      
      if (data.userId) {
        await this.initiateGlobalLogout(
          data.userId,
          'security',
          data.bannedBy || 'system',
          { reason: 'user_banned', ...data.metadata }
        );
      }
    } catch (error) {
      console.error('Failed to handle user banned event:', error);
    }
  }

  /**
   * Get all active sessions for a user
   */
  private async getUserActiveSessions(userId: string): Promise<any[]> {
    const sessionIds = await this.redis.sMembers(`sso:user:${userId}:sessions`);
    const sessions = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`sso:session:${sessionId}`);
      if (sessionData) {
        sessions.push({
          sessionId,
          ...JSON.parse(sessionData),
        });
      }
    }

    return sessions;
  }

  /**
   * Get logout history for a user
   */
  async getUserLogoutHistory(userId: string, limit = 10): Promise<LogoutEvent[]> {
    const result = await this.pool.query(`
      SELECT session_id, user_id, domains, reason, timestamp, initiated_by, metadata
      FROM plataforma_core.sso_logout_events
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows.map(row => ({
      sessionId: row.session_id,
      userId: row.user_id,
      domains: JSON.parse(row.domains),
      reason: row.reason,
      timestamp: row.timestamp,
      initiatedBy: row.initiated_by,
      metadata: row.metadata,
    }));
  }

  /**
   * Get logout statistics
   */
  async getLogoutStats(timeframe = '24h'): Promise<{
    totalLogouts: number;
    logoutsByReason: Record<string, number>;
    affectedDomains: string[];
    topInitiators: Array<{ initiator: string; count: number }>;
  }> {
    const timeCondition = timeframe === '24h' ? 'timestamp > NOW() - INTERVAL \'24 hours\'' :
                         timeframe === '7d' ? 'timestamp > NOW() - INTERVAL \'7 days\'' :
                         'timestamp > NOW() - INTERVAL \'30 days\'';

    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as total_logouts,
        reason,
        domains,
        initiated_by,
        COUNT(*) OVER (PARTITION BY reason) as reason_count,
        COUNT(*) OVER (PARTITION BY initiated_by) as initiator_count
      FROM plataforma_core.sso_logout_events
      WHERE ${timeCondition}
      GROUP BY reason, domains, initiated_by, session_id
    `);

    const stats = {
      totalLogouts: 0,
      logoutsByReason: {} as Record<string, number>,
      affectedDomains: [] as string[],
      topInitiators: [] as Array<{ initiator: string; count: number }>,
    };

    const domainSet = new Set<string>();
    const initiatorCounts = new Map<string, number>();

    result.rows.forEach(row => {
      stats.totalLogouts = Math.max(stats.totalLogouts, parseInt(row.total_logouts));
      stats.logoutsByReason[row.reason] = parseInt(row.reason_count);
      
      if (row.domains) {
        const domains = JSON.parse(row.domains);
        domains.forEach((domain: string) => domainSet.add(domain));
      }
      
      if (row.initiated_by) {
        initiatorCounts.set(row.initiated_by, parseInt(row.initiator_count));
      }
    });

    stats.affectedDomains = Array.from(domainSet);
    stats.topInitiators = Array.from(initiatorCounts.entries())
      .map(([initiator, count]) => ({ initiator, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Add event listener
   */
  on(event: 'logout' | 'remote-logout', listener: (event: LogoutEvent) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: 'logout' | 'remote-logout', listener: (event: LogoutEvent) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Cleanup and disconnect
   */
  async destroy(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.disconnect();
        this.subscriber = undefined;
      }
      
      this.eventEmitter.removeAllListeners();
      this.isInitialized = false;
      
      console.log('✅ Logout sync service destroyed');
    } catch (error) {
      console.error('Error destroying logout sync service:', error);
    }
  }
}

export default LogoutSyncService;