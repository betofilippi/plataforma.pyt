import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  JWTConfig, 
  User, 
  AuthToken, 
  Session, 
  AuthenticationError, 
  SecurityContext 
} from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

interface TokenPayload {
  sub: string; // Subject (user ID)
  iat: number; // Issued at
  exp: number; // Expiration time
  aud: string; // Audience
  iss: string; // Issuer
  jti: string; // JWT ID
  roles: string[];
  permissions: string[];
  sessionId: string;
  type: 'access' | 'refresh';
}

interface RefreshTokenData {
  userId: string;
  sessionId: string;
  expiresAt: Date;
  isRevoked: boolean;
  deviceInfo?: string;
}

export class JWTManager {
  private config: JWTConfig;
  private refreshTokens: Map<string, RefreshTokenData> = new Map();
  private revokedTokens: Set<string> = new Set(); // JTI of revoked tokens
  private sessions: Map<string, Session> = new Map();

  constructor(config: JWTConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  /**
   * Generate access and refresh tokens for a user
   */
  public async generateTokens(
    user: User, 
    ipAddress: string, 
    userAgent: string,
    additionalClaims: Record<string, any> = {}
  ): Promise<AuthToken> {
    const sessionId = uuidv4();
    const accessTokenId = uuidv4();
    const refreshTokenId = uuidv4();

    // Create session
    const session: Session = {
      id: sessionId,
      userId: user.id,
      token: refreshTokenId,
      expiresAt: new Date(Date.now() + this.parseTimeString(this.config.refreshTokenExpiresIn)),
      ipAddress,
      userAgent,
      metadata: additionalClaims,
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    // Create access token payload
    const accessPayload: TokenPayload = {
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.parseTimeString(this.config.expiresIn)) / 1000),
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: accessTokenId,
      roles: user.roles,
      permissions: user.permissions || [],
      sessionId,
      type: 'access'
    };

    // Create refresh token payload
    const refreshPayload: TokenPayload = {
      sub: user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.parseTimeString(this.config.refreshTokenExpiresIn)) / 1000),
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: refreshTokenId,
      roles: user.roles,
      permissions: user.permissions || [],
      sessionId,
      type: 'refresh'
    };

    // Store refresh token data
    this.refreshTokens.set(refreshTokenId, {
      userId: user.id,
      sessionId,
      expiresAt: new Date(refreshPayload.exp * 1000),
      isRevoked: false,
      deviceInfo: userAgent
    });

    // Sign tokens
    const accessToken = jwt.sign(accessPayload, this.config.secret, {
      algorithm: this.config.algorithm
    });

    const refreshToken = jwt.sign(refreshPayload, this.config.secret, {
      algorithm: this.config.algorithm
    });

    const expiresIn = this.parseTimeString(this.config.expiresIn) / 1000; // Convert to seconds

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn
    };
  }

  /**
   * Verify and decode a JWT token
   */
  public async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        algorithms: [this.config.algorithm],
        audience: this.config.audience,
        issuer: this.config.issuer
      }) as TokenPayload;

      // Check if token is revoked
      if (this.revokedTokens.has(decoded.jti)) {
        throw new AuthenticationError('Token has been revoked');
      }

      // Check if session is still valid
      const session = this.sessions.get(decoded.sessionId);
      if (!session) {
        throw new AuthenticationError('Session not found');
      }

      if (session.expiresAt < new Date()) {
        throw new AuthenticationError('Session expired');
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh an access token using a refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<AuthToken> {
    try {
      const decoded = await this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token');
      }

      const refreshData = this.refreshTokens.get(decoded.jti);
      if (!refreshData || refreshData.isRevoked) {
        throw new AuthenticationError('Refresh token not found or revoked');
      }

      const session = this.sessions.get(decoded.sessionId);
      if (!session) {
        throw new AuthenticationError('Session not found');
      }

      // Generate new access token
      const accessTokenId = uuidv4();
      const accessPayload: TokenPayload = {
        sub: decoded.sub,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + this.parseTimeString(this.config.expiresIn)) / 1000),
        aud: this.config.audience,
        iss: this.config.issuer,
        jti: accessTokenId,
        roles: decoded.roles,
        permissions: decoded.permissions,
        sessionId: decoded.sessionId,
        type: 'access'
      };

      const accessToken = jwt.sign(accessPayload, this.config.secret, {
        algorithm: this.config.algorithm
      });

      const expiresIn = this.parseTimeString(this.config.expiresIn) / 1000;

      return {
        accessToken,
        refreshToken, // Return the same refresh token
        tokenType: 'Bearer',
        expiresIn
      };
    } catch (error) {
      throw new AuthenticationError('Failed to refresh token');
    }
  }

  /**
   * Revoke a token (add to revocation list)
   */
  public async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (decoded && decoded.jti) {
        this.revokedTokens.add(decoded.jti);

        // If it's a refresh token, mark it as revoked
        if (decoded.type === 'refresh') {
          const refreshData = this.refreshTokens.get(decoded.jti);
          if (refreshData) {
            refreshData.isRevoked = true;
          }
        }

        // Remove session if revoking refresh token
        if (decoded.sessionId) {
          this.sessions.delete(decoded.sessionId);
        }
      }
    } catch (error) {
      // Token might be malformed, but we'll still consider it revoked
      console.warn('Error revoking token:', error);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  public async revokeAllUserTokens(userId: string): Promise<void> {
    // Revoke all refresh tokens for the user
    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.userId === userId) {
        tokenData.isRevoked = true;
        this.revokedTokens.add(tokenId);
      }
    }

    // Remove all sessions for the user
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get user sessions
   */
  public getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  /**
   * Revoke a specific session
   */
  public async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Revoke the refresh token associated with this session
      const refreshData = this.refreshTokens.get(session.token);
      if (refreshData) {
        refreshData.isRevoked = true;
        this.revokedTokens.add(session.token);
      }

      this.sessions.delete(sessionId);
    }
  }

  /**
   * Express middleware for JWT authentication
   */
  public middleware(options: {
    required?: boolean;
    roles?: string[];
    permissions?: string[];
    skipPaths?: string[];
  } = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip authentication for certain paths
      if (options.skipPaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (options.required !== false) {
          return next(new AuthenticationError('Authorization header missing'));
        }
        return next();
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return next(new AuthenticationError('Invalid authorization header format'));
      }

      const token = parts[1];

      try {
        const payload = await this.verifyToken(token);
        
        // Check role requirements
        if (options.roles && options.roles.length > 0) {
          const hasRequiredRole = options.roles.some(role => payload.roles.includes(role));
          if (!hasRequiredRole) {
            return next(new AuthenticationError('Insufficient role permissions'));
          }
        }

        // Check permission requirements
        if (options.permissions && options.permissions.length > 0) {
          const hasRequiredPermission = options.permissions.some(permission => 
            payload.permissions.includes(permission)
          );
          if (!hasRequiredPermission) {
            return next(new AuthenticationError('Insufficient permissions'));
          }
        }

        // Add decoded token data to request
        (req as any).user = {
          id: payload.sub,
          roles: payload.roles,
          permissions: payload.permissions
        };
        (req as any).sessionId = payload.sessionId;
        (req as any).tokenPayload = payload;

        next();
      } catch (error) {
        if (options.required !== false) {
          next(error);
        } else {
          next();
        }
      }
    };
  }

  /**
   * Create security context from request
   */
  public createSecurityContext(req: Request): SecurityContext {
    const tokenPayload = (req as any).tokenPayload as TokenPayload;
    const session = tokenPayload ? this.sessions.get(tokenPayload.sessionId) : undefined;

    return {
      user: (req as any).user,
      session,
      permissions: tokenPayload?.permissions || [],
      roles: tokenPayload?.roles || [],
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      requestId: uuidv4(),
      timestamp: new Date()
    };
  }

  /**
   * Generate a secure password hash
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token
   */
  public generateSecureToken(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Parse time string to milliseconds
   */
  private parseTimeString(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,          // seconds
      m: 60 * 1000,     // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000 // days
    };

    return value * (multipliers[unit] || 1000);
  }

  /**
   * Start cleanup interval for expired tokens and sessions
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up expired tokens and sessions
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();

    // Clean up expired refresh tokens
    for (const [tokenId, tokenData] of this.refreshTokens.entries()) {
      if (tokenData.expiresAt < now || tokenData.isRevoked) {
        this.refreshTokens.delete(tokenId);
        this.revokedTokens.delete(tokenId);
      }
    }

    // Clean up expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
      }
    }

    // Clean up old revoked tokens (keep for 24 hours after expiration)
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    this.revokedTokens.forEach(jti => {
      try {
        const decoded = jwt.decode(jti) as any;
        if (decoded && decoded.exp && (decoded.exp * 1000) < cutoffTime) {
          this.revokedTokens.delete(jti);
        }
      } catch (error) {
        // If we can't decode, remove it
        this.revokedTokens.delete(jti);
      }
    });
  }

  /**
   * Get JWT statistics
   */
  public getStatistics(): {
    activeSessions: number;
    activeRefreshTokens: number;
    revokedTokens: number;
  } {
    return {
      activeSessions: this.sessions.size,
      activeRefreshTokens: Array.from(this.refreshTokens.values()).filter(t => !t.isRevoked).length,
      revokedTokens: this.revokedTokens.size
    };
  }

  /**
   * Update JWT configuration
   */
  public updateConfig(newConfig: Partial<JWTConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration (without secret)
   */
  public getConfig(): Omit<JWTConfig, 'secret'> {
    const { secret, ...configWithoutSecret } = this.config;
    return configWithoutSecret;
  }
}