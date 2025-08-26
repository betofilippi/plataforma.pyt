import { Pool } from 'pg';
import { createClient } from 'redis';
type Redis = ReturnType<typeof createClient>;
import crypto from 'crypto';
import { JWTService, JWTPayload } from '../auth/jwt';

export interface SSOSession {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  domains: string[];
  createdAt: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: Record<string, any>;
  expiresAt: Date;
}

export interface SSOToken {
  token: string;
  sessionId: string;
  moduleId: string;
  domain: string;
  expiresAt: Date;
}

export interface ModuleRegistration {
  moduleId: string;
  domain: string;
  allowedOrigins: string[];
  publicKey?: string;
  isActive: boolean;
  registeredAt: Date;
  lastSeen: Date;
}

export class SSOService {
  private pool: Pool;
  private redis: Redis;
  private jwtService: JWTService;
  private sessionTTL = 24 * 60 * 60; // 24 hours in seconds
  private tokenTTL = 5 * 60; // 5 minutes for SSO tokens

  constructor(pool: Pool, redis: Redis, jwtService: JWTService) {
    this.pool = pool;
    this.redis = redis;
    this.jwtService = jwtService;
  }

  /**
   * Create a new SSO session when user logs in
   */
  async createSession(user: JWTPayload, ipAddress: string, userAgent: string, deviceInfo?: Record<string, any>): Promise<SSOSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.sessionTTL * 1000));

    const session: SSOSession = {
      sessionId,
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      domains: ['plataforma.app'], // Start with main domain
      createdAt: now,
      lastActivity: now,
      ipAddress,
      userAgent,
      deviceInfo,
      expiresAt,
    };

    // Store in Redis with expiration
    const sessionKey = `sso:session:${sessionId}`;
    await this.redis.setEx(sessionKey, this.sessionTTL, JSON.stringify(session));

    // Store user session mapping
    const userSessionKey = `sso:user:${user.userId}:sessions`;
    await this.redis.sAdd(userSessionKey, sessionId);
    await this.redis.expire(userSessionKey, this.sessionTTL);

    // Store in database for persistence
    await this.pool.query(`
      INSERT INTO plataforma_core.sso_sessions (
        session_id, user_id, domains, ip_address, user_agent, device_info, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (session_id) DO UPDATE SET
        domains = EXCLUDED.domains,
        last_activity = NOW(),
        expires_at = EXCLUDED.expires_at
    `, [sessionId, user.userId, JSON.stringify(session.domains), ipAddress, userAgent, deviceInfo || {}, expiresAt]);

    return session;
  }

  /**
   * Get session by session ID
   */
  async getSession(sessionId: string): Promise<SSOSession | null> {
    const sessionKey = `sso:session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      // Try to load from database if not in Redis
      return await this.loadSessionFromDB(sessionId);
    }

    const session = JSON.parse(sessionData) as SSOSession;
    
    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      await this.destroySession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session activity and add domain if needed
   */
  async updateSessionActivity(sessionId: string, domain?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.lastActivity = new Date();
    
    // Add domain to session if not already present
    if (domain && !session.domains.includes(domain)) {
      session.domains.push(domain);
    }

    // Update in Redis
    const sessionKey = `sso:session:${sessionId}`;
    await this.redis.setEx(sessionKey, this.sessionTTL, JSON.stringify(session));

    // Update in database
    await this.pool.query(`
      UPDATE plataforma_core.sso_sessions
      SET domains = $1, last_activity = NOW()
      WHERE session_id = $2
    `, [JSON.stringify(session.domains), sessionId]);
  }

  /**
   * Generate SSO token for cross-domain authentication
   */
  async generateSSOToken(sessionId: string, moduleId: string, targetDomain: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Verify module is registered
    const module = await this.getModule(moduleId);
    if (!module || !module.isActive) {
      throw new Error('Module not registered or inactive');
    }

    // Check if domain is allowed
    if (!module.allowedOrigins.includes(targetDomain) && !module.allowedOrigins.includes('*')) {
      throw new Error('Domain not allowed for this module');
    }

    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (this.tokenTTL * 1000));

    const ssoToken: SSOToken = {
      token: tokenId,
      sessionId,
      moduleId,
      domain: targetDomain,
      expiresAt,
    };

    // Store token in Redis with short TTL
    const tokenKey = `sso:token:${tokenId}`;
    await this.redis.setEx(tokenKey, this.tokenTTL, JSON.stringify(ssoToken));

    return tokenId;
  }

  /**
   * Validate and consume SSO token
   */
  async validateSSOToken(token: string): Promise<{ session: SSOSession; module: ModuleRegistration } | null> {
    const tokenKey = `sso:token:${token}`;
    const tokenData = await this.redis.get(tokenKey);

    if (!tokenData) {
      return null;
    }

    const ssoToken = JSON.parse(tokenData) as SSOToken;

    // Check if token is expired
    if (new Date() > new Date(ssoToken.expiresAt)) {
      await this.redis.del(tokenKey);
      return null;
    }

    // Get session
    const session = await this.getSession(ssoToken.sessionId);
    if (!session) {
      await this.redis.del(tokenKey);
      return null;
    }

    // Get module
    const module = await this.getModule(ssoToken.moduleId);
    if (!module || !module.isActive) {
      await this.redis.del(tokenKey);
      return null;
    }

    // Consume token (single use)
    await this.redis.del(tokenKey);

    // Update session activity with new domain
    await this.updateSessionActivity(ssoToken.sessionId, ssoToken.domain);

    return { session, module };
  }

  /**
   * Register a module for SSO
   */
  async registerModule(moduleId: string, domain: string, allowedOrigins: string[], publicKey?: string): Promise<void> {
    const now = new Date();

    await this.pool.query(`
      INSERT INTO plataforma_core.sso_modules (
        module_id, domain, allowed_origins, public_key, is_active, registered_at, last_seen
      ) VALUES ($1, $2, $3, $4, true, $5, $5)
      ON CONFLICT (module_id) DO UPDATE SET
        domain = EXCLUDED.domain,
        allowed_origins = EXCLUDED.allowed_origins,
        public_key = EXCLUDED.public_key,
        last_seen = EXCLUDED.last_seen,
        is_active = true
    `, [moduleId, domain, JSON.stringify(allowedOrigins), publicKey, now]);

    // Cache module registration
    const moduleKey = `sso:module:${moduleId}`;
    const module: ModuleRegistration = {
      moduleId,
      domain,
      allowedOrigins,
      publicKey,
      isActive: true,
      registeredAt: now,
      lastSeen: now,
    };
    await this.redis.setEx(moduleKey, 3600, JSON.stringify(module)); // Cache for 1 hour
  }

  /**
   * Get module registration
   */
  async getModule(moduleId: string): Promise<ModuleRegistration | null> {
    const moduleKey = `sso:module:${moduleId}`;
    const moduleData = await this.redis.get(moduleKey);

    if (moduleData) {
      return JSON.parse(moduleData) as ModuleRegistration;
    }

    // Load from database
    const result = await this.pool.query(`
      SELECT module_id, domain, allowed_origins, public_key, is_active, registered_at, last_seen
      FROM plataforma_core.sso_modules
      WHERE module_id = $1 AND is_active = true
    `, [moduleId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const module: ModuleRegistration = {
      moduleId: row.module_id,
      domain: row.domain,
      allowedOrigins: JSON.parse(row.allowed_origins),
      publicKey: row.public_key,
      isActive: row.is_active,
      registeredAt: row.registered_at,
      lastSeen: row.last_seen,
    };

    // Cache the module
    await this.redis.setEx(moduleKey, 3600, JSON.stringify(module));

    return module;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SSOSession[]> {
    const userSessionKey = `sso:user:${userId}:sessions`;
    const sessionIds = await this.redis.sMembers(userSessionKey);

    const sessions: SSOSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Destroy a specific session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    // Remove from Redis
    const sessionKey = `sso:session:${sessionId}`;
    await this.redis.del(sessionKey);

    if (session) {
      // Remove from user sessions set
      const userSessionKey = `sso:user:${session.userId}:sessions`;
      await this.redis.sRem(userSessionKey, sessionId);

      // Publish logout event
      await this.publishLogoutEvent(sessionId, session.domains);
    }

    // Mark as inactive in database
    await this.pool.query(`
      UPDATE plataforma_core.sso_sessions
      SET is_active = false, destroyed_at = NOW()
      WHERE session_id = $1
    `, [sessionId]);
  }

  /**
   * Destroy all sessions for a user (global logout)
   */
  async destroyUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const session of sessions) {
      await this.destroySession(session.sessionId);
    }

    // Clear user sessions set
    const userSessionKey = `sso:user:${userId}:sessions`;
    await this.redis.del(userSessionKey);
  }

  /**
   * Publish logout event for session synchronization
   */
  private async publishLogoutEvent(sessionId: string, domains: string[]): Promise<void> {
    const logoutEvent = {
      type: 'logout',
      sessionId,
      domains,
      timestamp: new Date().toISOString(),
    };

    // Publish to Redis pub/sub for real-time updates
    await this.redis.publish('sso:logout', JSON.stringify(logoutEvent));
  }

  /**
   * Load session from database and cache in Redis
   */
  private async loadSessionFromDB(sessionId: string): Promise<SSOSession | null> {
    const result = await this.pool.query(`
      SELECT s.session_id, s.user_id, s.domains, s.ip_address, s.user_agent, 
             s.device_info, s.created_at, s.last_activity, s.expires_at,
             u.email, u.name, u.role
      FROM plataforma_core.sso_sessions s
      JOIN plataforma_core.users u ON s.user_id = u.id
      WHERE s.session_id = $1 AND s.is_active = true AND s.expires_at > NOW()
    `, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const session: SSOSession = {
      sessionId: row.session_id,
      userId: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      domains: JSON.parse(row.domains),
      createdAt: row.created_at,
      lastActivity: row.last_activity,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceInfo: row.device_info || {},
      expiresAt: row.expires_at,
    };

    // Cache in Redis
    const sessionKey = `sso:session:${sessionId}`;
    const ttl = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
    if (ttl > 0) {
      await this.redis.setEx(sessionKey, ttl, JSON.stringify(session));
    }

    return session;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Clean up database
    const result = await this.pool.query(`
      UPDATE plataforma_core.sso_sessions
      SET is_active = false, destroyed_at = NOW()
      WHERE expires_at < NOW() AND is_active = true
    `);

    return result.rowCount || 0;
  }

  /**
   * Get SSO statistics
   */
  async getStats(): Promise<{
    activeSessions: number;
    totalModules: number;
    activeModules: number;
  }> {
    const sessionCount = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM plataforma_core.sso_sessions
      WHERE is_active = true AND expires_at > NOW()
    `);

    const moduleStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total_modules,
        COUNT(*) FILTER (WHERE is_active = true) as active_modules
      FROM plataforma_core.sso_modules
    `);

    return {
      activeSessions: parseInt(sessionCount.rows[0].count),
      totalModules: parseInt(moduleStats.rows[0].total_modules || 0),
      activeModules: parseInt(moduleStats.rows[0].active_modules || 0),
    };
  }
}