import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Pool } from 'pg';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token expires in 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class JWTService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generate access token with user information
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'plataforma.app',
      audience: 'plataforma.app',
    });
  }

  /**
   * Generate refresh token and store in database
   */
  async generateRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: Record<string, any>
  ): Promise<string> {
    const tokenId = crypto.randomUUID();
    const tokenPayload: RefreshTokenPayload = {
      userId,
      tokenId,
    };

    const refreshToken = jwt.sign(tokenPayload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'plataforma.app',
      audience: 'plataforma.app',
    });

    // Hash the token for storage
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Store in database
    await this.pool.query(`
      INSERT INTO plataforma_core.refresh_tokens (
        id, user_id, token_hash, expires_at, ip_address, user_agent, device_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [tokenId, userId, tokenHash, expiresAt, ipAddress, userAgent, deviceInfo || {}]);

    return refreshToken;
  }

  /**
   * Generate complete token pair (access + refresh)
   */
  async generateTokenPair(
    user: Omit<JWTPayload, 'iat' | 'exp'>,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: Record<string, any>
  ): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.userId, ipAddress, userAgent, deviceInfo);

    // Calculate expiration times in seconds
    const accessExpiresIn = this.getTokenExpirationTime(JWT_EXPIRES_IN);
    const refreshExpiresIn = this.getTokenExpirationTime(JWT_REFRESH_EXPIRES_IN);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn: refreshExpiresIn,
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'plataforma.app',
        audience: 'plataforma.app',
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_TOKEN');
      } else {
        throw new Error('TOKEN_VERIFICATION_FAILED');
      }
    }
  }

  /**
   * Verify refresh token and get payload
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      // Verify JWT signature and decode
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'plataforma.app',
        audience: 'plataforma.app',
      }) as RefreshTokenPayload;

      // Hash the token to check against database
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Check if token exists in database and is not revoked
      const result = await this.pool.query(`
        SELECT id, user_id, expires_at, is_active, revoked_at
        FROM plataforma_core.refresh_tokens
        WHERE id = $1 AND token_hash = $2 AND is_active = true
      `, [decoded.tokenId, tokenHash]);

      if (result.rows.length === 0) {
        throw new Error('REFRESH_TOKEN_NOT_FOUND');
      }

      const tokenRecord = result.rows[0];

      // Check if token is expired
      if (new Date(tokenRecord.expires_at) < new Date()) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      }

      // Check if token is revoked
      if (tokenRecord.revoked_at) {
        throw new Error('REFRESH_TOKEN_REVOKED');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('REFRESH_TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_REFRESH_TOKEN');
      } else {
        throw error;
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify refresh token
    const decoded = await this.verifyRefreshToken(refreshToken);

    // Get user information
    const userResult = await this.pool.query(`
      SELECT id, email, role, name, is_active
      FROM plataforma_core.users
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      throw new Error('USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const expiresIn = this.getTokenExpirationTime(JWT_EXPIRES_IN);

    return {
      accessToken,
      expiresIn,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await this.pool.query(`
      UPDATE plataforma_core.refresh_tokens
      SET is_active = false, revoked_at = NOW()
      WHERE token_hash = $1
    `, [tokenHash]);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.pool.query(`
      UPDATE plataforma_core.refresh_tokens
      SET is_active = false, revoked_at = NOW()
      WHERE user_id = $1 AND is_active = true
    `, [userId]);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT id, created_at, ip_address, user_agent, device_info, expires_at
      FROM plataforma_core.refresh_tokens
      WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows;
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.pool.query(`
      DELETE FROM plataforma_core.refresh_tokens
      WHERE expires_at < NOW() OR revoked_at IS NOT NULL
    `);

    return result.rowCount || 0;
  }

  /**
   * Convert time string to seconds
   */
  private getTokenExpirationTime(timeString: string): number {
    // Parse time strings like '15m', '7d', '1h', etc.
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // Default to 15 minutes
    }
  }

  /**
   * Generate secure random token for password reset
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password reset token
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  /**
   * Get token info without verification (for debugging)
   */
  decodeTokenWithoutVerification(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }
}

// Export singleton instance
let jwtServiceInstance: JWTService | null = null;

export function getJWTService(pool: Pool): JWTService {
  if (!jwtServiceInstance) {
    jwtServiceInstance = new JWTService(pool);
  }
  return jwtServiceInstance;
}

export default JWTService;