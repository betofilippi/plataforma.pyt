import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { getJWTService, JWTService } from './jwt';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

export class AuthController {
  private pool: Pool;
  private jwtService: JWTService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.jwtService = getJWTService(pool);
  }

  /**
   * Login endpoint
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const { email, password, rememberMe } = loginSchema.parse(req.body);
      
      const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || '';

      // Check rate limiting
      const canAttempt = await this.checkLoginRateLimit(email, clientIp);
      if (!canAttempt) {
        await this.recordLoginAttempt(email, clientIp, false, userAgent, 'RATE_LIMITED');
        res.status(429).json({
          success: false,
          message: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED'
        });
        return;
      }

      // Find user by email
      const userResult = await this.pool.query(`
        SELECT id, email, name, password_hash, role, is_active, last_login
        FROM plataforma_core.users
        WHERE email = $1
      `, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        await this.recordLoginAttempt(email, clientIp, false, userAgent, 'USER_NOT_FOUND');
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      const user = userResult.rows[0];

      // Check if user is active
      if (!user.is_active) {
        await this.recordLoginAttempt(email, clientIp, false, userAgent, 'USER_INACTIVE');
        res.status(401).json({
          success: false,
          message: 'Account is disabled. Please contact administrator.',
          code: 'ACCOUNT_DISABLED'
        });
        return;
      }

      // Check if password hash exists (for first-time setup)
      if (!user.password_hash) {
        res.status(200).json({
          success: false,
          message: 'Account setup required. Please set your password.',
          code: 'PASSWORD_SETUP_REQUIRED',
          setupToken: await this.generateSetupToken(user.id)
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.recordLoginAttempt(email, clientIp, false, userAgent, 'INVALID_PASSWORD');
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Generate tokens
      const deviceInfo = {
        userAgent,
        ip: clientIp,
        rememberMe,
        loginTime: new Date().toISOString()
      };

      const tokens = await this.jwtService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        clientIp,
        userAgent,
        deviceInfo
      );

      // Record successful login
      await this.recordLoginAttempt(email, clientIp, true, userAgent);

      // Set secure HTTP-only cookie for refresh token
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: tokens.refreshExpiresIn * 1000, // Convert to milliseconds
        path: '/api/auth'
      };

      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      // Return response without refresh token in body
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            lastLogin: user.last_login
          },
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  };

  /**
   * Refresh token endpoint
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get refresh token from cookie or body
      let refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        const body = refreshSchema.parse(req.body);
        refreshToken = body.refreshToken;
      }

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token not provided',
          code: 'REFRESH_TOKEN_MISSING'
        });
        return;
      }

      // Refresh access token
      const result = await this.jwtService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          expiresIn: result.expiresIn,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);

      let message = 'Failed to refresh token';
      let code = 'REFRESH_FAILED';

      if (error instanceof Error) {
        switch (error.message) {
          case 'REFRESH_TOKEN_NOT_FOUND':
          case 'INVALID_REFRESH_TOKEN':
            message = 'Invalid refresh token';
            code = 'INVALID_REFRESH_TOKEN';
            break;
          case 'REFRESH_TOKEN_EXPIRED':
            message = 'Refresh token expired';
            code = 'REFRESH_TOKEN_EXPIRED';
            break;
          case 'REFRESH_TOKEN_REVOKED':
            message = 'Refresh token revoked';
            code = 'REFRESH_TOKEN_REVOKED';
            break;
          case 'USER_NOT_FOUND':
            message = 'User not found';
            code = 'USER_NOT_FOUND';
            break;
        }
      }

      // Clear refresh token cookie on error
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.status(401).json({
        success: false,
        message,
        code
      });
    }
  };

  /**
   * Logout endpoint
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        // Revoke the refresh token
        await this.jwtService.revokeRefreshToken(refreshToken);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);

      // Even if there's an error, clear the cookie and respond success
      res.clearCookie('refreshToken', { path: '/api/auth' });
      
      res.status(200).json({
        success: true,
        message: 'Logout completed'
      });
    }
  };

  /**
   * Logout from all devices
   */
  logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Revoke all refresh tokens for the user
      await this.jwtService.revokeAllUserTokens(req.user.userId);

      // Clear refresh token cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices'
      });

    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout from all devices'
      });
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get fresh user data
      const userResult = await this.pool.query(`
        SELECT id, email, name, role, avatar_url, created_at, last_login, metadata
        FROM plataforma_core.users
        WHERE id = $1 AND is_active = true
      `, [req.user.userId]);

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatar_url,
            createdAt: user.created_at,
            lastLogin: user.last_login,
            metadata: user.metadata
          }
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user profile'
      });
    }
  };

  /**
   * Change password
   */
  changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Get current password hash
      const userResult = await this.pool.query(`
        SELECT password_hash FROM plataforma_core.users WHERE id = $1
      `, [req.user.userId]);

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const user = userResult.rows[0];

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await this.pool.query(`
        UPDATE plataforma_core.users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, req.user.userId]);

      // Revoke all existing tokens (force re-login)
      await this.jwtService.revokeAllUserTokens(req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.'
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  };

  /**
   * Get user sessions
   */
  getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const sessions = await this.jwtService.getUserSessions(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          sessions: sessions.map(session => ({
            id: session.id,
            createdAt: session.created_at,
            ipAddress: session.ip_address,
            userAgent: session.user_agent,
            deviceInfo: session.device_info,
            expiresAt: session.expires_at
          }))
        }
      });

    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user sessions'
      });
    }
  };

  /**
   * Verify token (health check)
   */
  verifyToken = async (req: AuthRequest, res: Response): Promise<void> => {
    // If middleware passed, token is valid
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });
  };

  // Helper methods

  /**
   * Check login rate limiting
   */
  private async checkLoginRateLimit(email: string, ipAddress: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT plataforma_core.check_login_attempts($1, $2, $3, $4) as can_attempt
    `, [email, ipAddress, 15, 5]); // 5 attempts in 15 minutes

    return result.rows[0]?.can_attempt || false;
  }

  /**
   * Record login attempt
   */
  private async recordLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    await this.pool.query(`
      SELECT plataforma_core.record_login_attempt($1, $2, $3, $4, $5)
    `, [email, ipAddress, success, userAgent, failureReason]);
  }

  /**
   * Generate setup token for password setup
   */
  private async generateSetupToken(userId: string): Promise<string> {
    // Generate a temporary token for password setup
    const token = this.jwtService.generateSecureToken();
    const tokenHash = this.jwtService.hashToken(token);
    
    // Store in password reset tokens table (reused for setup)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.pool.query(`
      INSERT INTO plataforma_core.password_reset_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `, [userId, tokenHash, expiresAt]);

    return token;
  }
}

// Export factory function
export function createAuthController(pool: Pool): AuthController {
  return new AuthController(pool);
}