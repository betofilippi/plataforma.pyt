import { createClient } from 'redis';
type Redis = ReturnType<typeof createClient>;

export interface RedisConfig {
  url: string;
  keyPrefix?: string;
  defaultTTL?: number;
}

export class RedisSessionStore {
  private redis: Redis | null;
  private keyPrefix: string;
  private defaultTTL: number;
  private subscriber?: Redis;
  private isConnected: boolean = false;
  private memoryStore: Map<string, { data: any; expiry: number }> = new Map();
  private redisEnabled: boolean;

  constructor(config: RedisConfig) {
    this.keyPrefix = config.keyPrefix || 'sso:';
    this.defaultTTL = config.defaultTTL || 86400; // 24 hours
    this.redisEnabled = process.env.DISABLE_REDIS !== 'true';

    if (this.redisEnabled) {
      try {
        this.redis = createClient({
          url: config.url,
          socket: {
            connectTimeout: 2000,
          }
        });
        this.setupEventHandlers();
      } catch (error) {
        console.warn('⚠️ Failed to create Redis client for SSO, using memory fallback:', error);
        this.redis = null;
        this.redisEnabled = false;
      }
    } else {
      this.redis = null;
      console.log('🚫 Redis disabled for SSO, using memory-only session store');
    }

    // Clean up memory store periodically
    setInterval(() => this.cleanupMemoryStore(), 60000);
  }

  /**
   * Clean up expired memory store entries
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiry < now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Initialize Redis connection and subscriber
   */
  async initialize(): Promise<void> {
    if (!this.redisEnabled || !this.redis) {
      console.log('ℹ️ SSO session store using memory-only mode');
      return;
    }

    try {
      if (!this.isConnected) {
        await this.redis.connect();
        this.isConnected = true;
        console.log('✅ Redis connected for SSO session store');
      }

      // Create subscriber for pub/sub
      if (!this.subscriber) {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.connect();
        console.log('✅ Redis subscriber connected for SSO events');
      }
    } catch (error) {
      console.error('❌ Redis connection failed, falling back to memory store:', error);
      this.redis = null;
      this.redisEnabled = false;
      this.isConnected = false;
      // Don't throw - allow fallback to memory store
    }
  }

  /**
   * Set up Redis event handlers
   */
  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on('error', (error) => {
      console.warn('⚠️ SSO Redis error, falling back to memory store:', error.message);
      this.isConnected = false;
    });

    this.redis.on('connect', () => {
      console.log('✅ SSO Redis connected');
      this.isConnected = true;
    });

    this.redis.on('disconnect', () => {
      console.log('🔌 SSO Redis disconnected');
      this.isConnected = false;
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 SSO Redis reconnecting...');
    });
  }

  /**
   * Store session data
   */
  async setSession(sessionId: string, data: any, ttl?: number): Promise<void> {
    const key = this.getKey('session', sessionId);
    const value = JSON.stringify(data);
    const expiry = ttl || this.defaultTTL;

    // Try Redis first
    if (this.redis && this.isConnected) {
      try {
        await this.redis.setEx(key, expiry, value);
        return;
      } catch (error) {
        console.warn('⚠️ Redis setSession failed, using memory fallback:', error);
      }
    }

    // Fallback to memory store
    const expiryTime = Date.now() + (expiry * 1000);
    this.memoryStore.set(key, { data, expiry: expiryTime });
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = this.getKey('session', sessionId);

    // Try Redis first
    if (this.redis && this.isConnected) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          try {
            return JSON.parse(data);
          } catch (error) {
            console.error('Error parsing Redis session data:', error);
          }
        }
      } catch (error) {
        console.warn('⚠️ Redis getSession failed, trying memory fallback:', error);
      }
    }

    // Fallback to memory store
    const entry = this.memoryStore.get(key);
    if (entry) {
      if (entry.expiry > Date.now()) {
        return entry.data;
      } else {
        this.memoryStore.delete(key); // Clean up expired entry
      }
    }

    return null;
  }

  /**
   * Check if session exists
   */
  async hasSession(sessionId: string): Promise<boolean> {
    const key = this.getKey('session', sessionId);

    // Try Redis first
    if (this.redis && this.isConnected) {
      try {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } catch (error) {
        console.warn('⚠️ Redis hasSession failed, trying memory fallback:', error);
      }
    }

    // Fallback to memory store
    const entry = this.memoryStore.get(key);
    if (entry && entry.expiry > Date.now()) {
      return true;
    } else if (entry) {
      this.memoryStore.delete(key); // Clean up expired entry
    }

    return false;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const key = this.getKey('session', sessionId);
    let deleted = false;

    // Try Redis first
    if (this.redis && this.isConnected) {
      try {
        const result = await this.redis.del(key);
        deleted = result === 1;
      } catch (error) {
        console.warn('⚠️ Redis deleteSession failed, trying memory fallback:', error);
      }
    }

    // Always check/delete from memory store
    const hadInMemory = this.memoryStore.has(key);
    this.memoryStore.delete(key);

    return deleted || hadInMemory;
  }

  /**
   * Update session TTL
   */
  async touchSession(sessionId: string, ttl?: number): Promise<boolean> {
    const key = this.getKey('session', sessionId);
    const expiry = ttl || this.defaultTTL;
    const result = await this.redis.expire(key, expiry);
    return result === 1;
  }

  /**
   * Store SSO token
   */
  async setToken(tokenId: string, data: any, ttl: number = 300): Promise<void> {
    const key = this.getKey('token', tokenId);
    const value = JSON.stringify(data);
    await this.redis.setEx(key, ttl, value);
  }

  /**
   * Get and consume SSO token (single use)
   */
  async consumeToken(tokenId: string): Promise<any | null> {
    const key = this.getKey('token', tokenId);
    
    // Use Lua script for atomic get and delete
    const lua = `
      local value = redis.call('GET', KEYS[1])
      if value then
        redis.call('DEL', KEYS[1])
        return value
      else
        return nil
      end
    `;

    const result = await this.redis.eval(lua, 1, key) as string | null;

    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result);
    } catch (error) {
      console.error('Error parsing token data:', error);
      return null;
    }
  }

  /**
   * Add session to user's session set
   */
  async addUserSession(userId: string, sessionId: string, ttl?: number): Promise<void> {
    const key = this.getKey('user', userId, 'sessions');
    await this.redis.sAdd(key, sessionId);
    
    if (ttl) {
      await this.redis.expire(key, ttl);
    }
  }

  /**
   * Remove session from user's session set
   */
  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getKey('user', userId, 'sessions');
    await this.redis.sRem(key, sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const key = this.getKey('user', userId, 'sessions');
    return await this.redis.sMembers(key);
  }

  /**
   * Clear all sessions for a user
   */
  async clearUserSessions(userId: string): Promise<void> {
    const key = this.getKey('user', userId, 'sessions');
    const sessionIds = await this.redis.sMembers(key);
    
    // Delete all sessions
    const pipeline = this.redis.multi();
    for (const sessionId of sessionIds) {
      const sessionKey = this.getKey('session', sessionId);
      pipeline.del(sessionKey);
    }
    
    // Clear the set
    pipeline.del(key);
    
    await pipeline.exec();
  }

  /**
   * Cache module registration
   */
  async setModule(moduleId: string, data: any, ttl: number = 3600): Promise<void> {
    const key = this.getKey('module', moduleId);
    const value = JSON.stringify(data);
    await this.redis.setEx(key, ttl, value);
  }

  /**
   * Get cached module registration
   */
  async getModule(moduleId: string): Promise<any | null> {
    const key = this.getKey('module', moduleId);
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing module data:', error);
      return null;
    }
  }

  /**
   * Publish logout event
   */
  async publishLogout(sessionId: string, userId: string, domains: string[]): Promise<void> {
    const event = {
      type: 'logout',
      sessionId,
      userId,
      domains,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish('sso:logout', JSON.stringify(event));
  }

  /**
   * Subscribe to logout events
   */
  async subscribeToLogout(callback: (event: any) => void): Promise<void> {
    if (!this.subscriber) {
      await this.initialize();
    }

    await this.subscriber!.subscribe('sso:logout', (message) => {
      try {
        const event = JSON.parse(message);
        callback(event);
      } catch (error) {
        console.error('Error parsing logout event:', error);
      }
    });
  }

  /**
   * Publish session update event
   */
  async publishSessionUpdate(sessionId: string, data: any): Promise<void> {
    const event = {
      type: 'session_update',
      sessionId,
      data,
      timestamp: new Date().toISOString(),
    };

    await this.redis.publish('sso:session', JSON.stringify(event));
  }

  /**
   * Subscribe to session events
   */
  async subscribeToSessions(callback: (event: any) => void): Promise<void> {
    if (!this.subscriber) {
      await this.initialize();
    }

    await this.subscriber!.subscribe('sso:session', (message) => {
      try {
        const event = JSON.parse(message);
        callback(event);
      } catch (error) {
        console.error('Error parsing session event:', error);
      }
    });
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalSessions: number;
    totalUsers: number;
    totalTokens: number;
    totalModules: number;
  }> {
    const sessionPattern = this.getKey('session', '*');
    const userPattern = this.getKey('user', '*', 'sessions');
    const tokenPattern = this.getKey('token', '*');
    const modulePattern = this.getKey('module', '*');

    const [sessions, users, tokens, modules] = await Promise.all([
      this.redis.keys(sessionPattern),
      this.redis.keys(userPattern),
      this.redis.keys(tokenPattern),
      this.redis.keys(modulePattern),
    ]);

    return {
      totalSessions: sessions.length,
      totalUsers: users.length,
      totalTokens: tokens.length,
      totalModules: modules.length,
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    // Redis automatically handles TTL expiration, but we can do additional cleanup if needed
    console.log('Running Redis SSO cleanup...');
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.disconnect();
        this.subscriber = undefined;
      }

      if (this.isConnected) {
        await this.redis.disconnect();
        this.isConnected = false;
      }

      console.log('✅ Redis SSO store disconnected');
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      // Memory store is always "healthy"
      return true;
    }

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.warn('Redis health check failed, falling back to memory store:', error);
      return true; // Memory fallback is still functional
    }
  }

  /**
   * Generate Redis key with prefix
   */
  private getKey(...parts: string[]): string {
    return this.keyPrefix + parts.join(':');
  }

  /**
   * Get Redis instance (for advanced operations)
   */
  getRedis(): Redis {
    return this.redis;
  }

  /**
   * Check if store is ready (Redis or memory fallback)
   */
  isReady(): boolean {
    return this.isConnected || !this.redisEnabled; // Ready if Redis connected OR using memory fallback
  }
}