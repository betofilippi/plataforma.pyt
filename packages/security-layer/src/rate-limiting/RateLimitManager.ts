import { RateLimitConfig, RateLimitError } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  get(key: string): Promise<{ hits: number; resetTime: number } | null>;
  set(key: string, value: { hits: number; resetTime: number }, ttl: number): Promise<void>;
  increment(key: string): Promise<{ hits: number; resetTime: number }>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryStore implements RateLimitStore {
  private store: Map<string, { hits: number; resetTime: number }> = new Map();

  async get(key: string): Promise<{ hits: number; resetTime: number } | null> {
    const data = this.store.get(key);
    if (!data) return null;

    // Check if expired
    if (Date.now() > data.resetTime) {
      this.store.delete(key);
      return null;
    }

    return data;
  }

  async set(key: string, value: { hits: number; resetTime: number }): Promise<void> {
    this.store.set(key, value);
  }

  async increment(key: string): Promise<{ hits: number; resetTime: number }> {
    const existing = await this.get(key);
    
    if (existing) {
      existing.hits++;
      this.store.set(key, existing);
      return existing;
    } else {
      const newData = {
        hits: 1,
        resetTime: Date.now() + (15 * 60 * 1000) // 15 minutes default
      };
      this.store.set(key, newData);
      return newData;
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export class RateLimitManager {
  private store: RateLimitStore;
  private configs: Map<string, RateLimitConfig> = new Map();
  private defaultConfig: RateLimitConfig;

  constructor(store?: RateLimitStore) {
    this.store = store || new MemoryStore();
    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    };
  }

  /**
   * Create rate limiter for a specific endpoint or module
   */
  public createLimiter(name: string, config: Partial<RateLimitConfig> = {}): RateLimitConfig {
    const limiterConfig = { ...this.defaultConfig, ...config };
    this.configs.set(name, limiterConfig);
    return limiterConfig;
  }

  /**
   * Create module-specific rate limiter
   */
  public createModuleLimiter(moduleId: string, config: Partial<RateLimitConfig> = {}): RateLimitConfig {
    const moduleLimiterConfig = {
      ...this.defaultConfig,
      windowMs: 5 * 60 * 1000, // 5 minutes for modules
      max: 50, // 50 requests per window for modules
      message: `Rate limit exceeded for module ${moduleId}`,
      ...config
    };

    this.configs.set(`module:${moduleId}`, moduleLimiterConfig);
    return moduleLimiterConfig;
  }

  /**
   * Generate rate limit key
   */
  private generateKey(identifier: string, limiterName: string = 'default'): string {
    return `rate_limit:${limiterName}:${identifier}`;
  }

  /**
   * Default key generator using IP address
   */
  private defaultKeyGenerator(req: Request): string {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Check if request should be rate limited
   */
  public async checkRateLimit(
    identifier: string,
    limiterName: string = 'default'
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  }> {
    const config = this.configs.get(limiterName) || this.defaultConfig;
    const key = this.generateKey(identifier, limiterName);

    try {
      const data = await this.store.increment(key);
      
      const limit = config.max;
      const remaining = Math.max(0, limit - data.hits);
      const resetTime = new Date(data.resetTime);
      const allowed = data.hits <= limit;

      let retryAfter: number | undefined;
      if (!allowed) {
        retryAfter = Math.ceil((data.resetTime - Date.now()) / 1000);
      }

      return {
        allowed,
        limit,
        remaining,
        resetTime,
        retryAfter
      };
    } catch (error) {
      // In case of store error, allow the request but log the error
      console.error('Rate limit check failed:', error);
      return {
        allowed: true,
        limit: config.max,
        remaining: config.max,
        resetTime: new Date(Date.now() + config.windowMs)
      };
    }
  }

  /**
   * Express middleware for rate limiting
   */
  public middleware(limiterName: string = 'default') {
    return async (req: Request, res: Response, next: NextFunction) => {
      const config = this.configs.get(limiterName) || this.defaultConfig;
      
      // Check if request should be skipped
      if (config.skip && config.skip(req)) {
        return next();
      }

      const identifier = config.keyGenerator ? 
        config.keyGenerator(req) : 
        this.defaultKeyGenerator(req);

      try {
        const result = await this.checkRateLimit(identifier, limiterName);

        // Set standard headers
        if (config.standardHeaders) {
          res.set({
            'RateLimit-Limit': result.limit.toString(),
            'RateLimit-Remaining': result.remaining.toString(),
            'RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString()
          });
        }

        // Set legacy headers
        if (config.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime.getTime() / 1000).toString()
          });
        }

        // Set retry after header if rate limited
        if (!result.allowed && result.retryAfter) {
          res.set('Retry-After', result.retryAfter.toString());
        }

        if (!result.allowed) {
          const error = new RateLimitError(config.message, {
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
            retryAfter: result.retryAfter
          });
          return next(error);
        }

        next();
      } catch (error) {
        // In case of any error, log and continue
        console.error('Rate limiting middleware error:', error);
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  public async resetRateLimit(identifier: string, limiterName: string = 'default'): Promise<void> {
    const key = this.generateKey(identifier, limiterName);
    await this.store.delete(key);
  }

  /**
   * Get current rate limit status
   */
  public async getRateLimitStatus(
    identifier: string, 
    limiterName: string = 'default'
  ): Promise<{
    hits: number;
    limit: number;
    remaining: number;
    resetTime: Date;
  } | null> {
    const config = this.configs.get(limiterName) || this.defaultConfig;
    const key = this.generateKey(identifier, limiterName);
    
    const data = await this.store.get(key);
    if (!data) return null;

    return {
      hits: data.hits,
      limit: config.max,
      remaining: Math.max(0, config.max - data.hits),
      resetTime: new Date(data.resetTime)
    };
  }

  /**
   * Update rate limiter configuration
   */
  public updateConfig(limiterName: string, config: Partial<RateLimitConfig>): void {
    const existingConfig = this.configs.get(limiterName) || this.defaultConfig;
    this.configs.set(limiterName, { ...existingConfig, ...config });
  }

  /**
   * Remove rate limiter
   */
  public removeLimiter(limiterName: string): void {
    this.configs.delete(limiterName);
  }

  /**
   * Get all configured limiters
   */
  public getLimiters(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Clear all rate limit data
   */
  public async clearAllRateLimits(): Promise<void> {
    await this.store.clear();
  }

  /**
   * Create adaptive rate limiter that adjusts based on load
   */
  public createAdaptiveLimiter(
    name: string,
    baseConfig: Partial<RateLimitConfig>,
    adaptiveConfig: {
      loadThreshold: number; // CPU/memory threshold to trigger adaptation
      adaptationFactor: number; // Factor to reduce limits by (0.5 = 50% reduction)
      recoveryTime: number; // Time to wait before increasing limits again
    }
  ): RateLimitConfig {
    const config = {
      ...this.defaultConfig,
      ...baseConfig,
      keyGenerator: (req: Request) => {
        // Include load-based adaptation in key generation
        const baseKey = baseConfig.keyGenerator ? 
          baseConfig.keyGenerator(req) : 
          this.defaultKeyGenerator(req);
        
        // Check current system load (simplified)
        const load = process.cpuUsage();
        const isHighLoad = (load.user + load.system) > adaptiveConfig.loadThreshold;
        
        return isHighLoad ? `high_load:${baseKey}` : baseKey;
      }
    };

    this.configs.set(name, config);
    return config;
  }

  /**
   * Create sliding window rate limiter
   */
  public createSlidingWindowLimiter(
    name: string,
    config: Partial<RateLimitConfig> & {
      windowSize: number; // Size of each sub-window
      subWindows: number; // Number of sub-windows
    }
  ): RateLimitConfig {
    const limiterConfig = {
      ...this.defaultConfig,
      ...config,
      // Custom key generator for sliding window
      keyGenerator: (req: Request) => {
        const baseKey = config.keyGenerator ? 
          config.keyGenerator(req) : 
          this.defaultKeyGenerator(req);
        
        // Add time-based sub-window to key
        const now = Date.now();
        const subWindowIndex = Math.floor(now / config.windowSize!) % config.subWindows!;
        
        return `${baseKey}:window:${subWindowIndex}`;
      }
    };

    this.configs.set(name, limiterConfig);
    return limiterConfig;
  }

  /**
   * Get rate limit statistics
   */
  public async getStatistics(): Promise<{
    totalRequests: number;
    blockedRequests: number;
    topConsumers: Array<{ identifier: string; requests: number }>;
  }> {
    // This would require enhanced store implementation to track statistics
    // For now, return basic structure
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topConsumers: []
    };
  }
}

// Export memory store for testing
export { MemoryStore };