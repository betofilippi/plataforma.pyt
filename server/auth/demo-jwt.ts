import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT Configuration for demo mode
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-2025';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret-2025';
const JWT_EXPIRES_IN = '15m';
const JWT_REFRESH_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class DemoJWTService {
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
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    return jwt.sign(
      {
        userId,
        tokenId,
        type: 'refresh',
      },
      JWT_REFRESH_SECRET,
      {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'plataforma.app',
        audience: 'plataforma.app',
      }
    );
  }

  /**
   * Generate both access and refresh tokens (no database storage in demo mode)
   */
  async generateTokenPair(
    payload: Omit<JWTPayload, 'iat' | 'exp'>,
    ipAddress: string,
    userAgent: string,
    deviceInfo?: any
  ): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload.userId);

    // In demo mode, we don't store anything in database
    console.log(`🎫 Demo tokens generated for ${payload.email}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      refreshExpiresIn: 604800, // 7 days in seconds
    };
  }

  /**
   * Verify any token
   */
  async verifyToken(token: string, isRefresh = false): Promise<any> {
    try {
      const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
      const decoded = jwt.verify(token, secret, {
        issuer: 'plataforma.app',
        audience: 'plataforma.app',
      });
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// Singleton instance for demo mode
let demoJWTInstance: DemoJWTService | null = null;

export function getDemoJWTService(): DemoJWTService {
  if (!demoJWTInstance) {
    demoJWTInstance = new DemoJWTService();
  }
  return demoJWTInstance;
}