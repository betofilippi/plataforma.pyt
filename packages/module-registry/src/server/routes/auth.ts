import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { RegistryConfig, User, ApiResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  displayName: Joi.string().min(2).max(100).required()
});

export function createAuthRoutes(
  db: DatabaseConnection,
  config: RegistryConfig,
  logger: Logger
) {
  const router = express.Router();

  /**
   * User registration
   */
  router.post('/register', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'VALIDATION_ERROR', error.details[0].message);
    }

    const { username, email, password, displayName } = value;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new ApiError(409, 'USER_EXISTS', 'User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, display_name, role, is_verified, is_active, created_at`,
      [username, email, displayName, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        permissions: [],
        isVerified: user.is_verified
      },
      config.security.jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('User registered', {
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: req.ip
    });

    const response: ApiResponse<{
      user: Partial<User>;
      token: string;
    }> = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          isVerified: user.is_verified,
          isActive: user.is_active,
          createdAt: user.created_at
        },
        token
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
   * User login
   */
  router.post('/login', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'VALIDATION_ERROR', error.details[0].message);
    }

    const { email, password } = value;

    // Find user
    const result = await db.query(
      `SELECT id, username, email, display_name, password_hash, role, permissions, 
              is_verified, is_active, packages_published, total_downloads
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new ApiError(401, 'ACCOUNT_DISABLED', 'Account has been disabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        permissions: user.permissions,
        isVerified: user.is_verified
      },
      config.security.jwtSecret,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', {
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: req.ip
    });

    const response: ApiResponse<{
      user: Partial<User>;
      token: string;
    }> = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          permissions: user.permissions,
          isVerified: user.is_verified,
          isActive: user.is_active,
          packagesPublished: user.packages_published,
          totalDownloads: user.total_downloads
        },
        token
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
   * Token validation
   */
  router.post('/validate', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, 'MISSING_TOKEN', 'Token is required');
    }

    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as any;
      
      // Verify user still exists and is active
      const result = await db.query(
        'SELECT is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new ApiError(401, 'INVALID_TOKEN', 'User not found or inactive');
      }

      res.json({
        success: true,
        data: {
          valid: true,
          user: {
            id: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            displayName: decoded.displayName,
            role: decoded.role,
            isVerified: decoded.isVerified
          }
        }
      });
    } catch (jwtError) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token');
    }
  }));

  /**
   * Password reset request
   */
  router.post('/reset-password', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'MISSING_EMAIL', 'Email is required');
    }

    // Check if user exists
    const result = await db.query(
      'SELECT id, username FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      res.json({
        success: true,
        data: {
          message: 'If the email exists, a reset link has been sent'
        }
      });
      return;
    }

    const user = result.rows[0];

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      config.security.jwtSecret,
      { expiresIn: '1h' }
    );

    // TODO: Send email with reset link
    // For now, just log it
    logger.info('Password reset requested', {
      userId: user.id,
      username: user.username,
      email,
      resetToken,
      ip: req.ip
    });

    res.json({
      success: true,
      data: {
        message: 'If the email exists, a reset link has been sent'
      }
    });
  }));

  /**
   * Logout (token invalidation would require token blacklist)
   */
  router.post('/logout', asyncHandler(async (req: express.Request, res: express.Response) => {
    // TODO: Add token to blacklist/redis for invalidation
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      }
    });
  }));

  return router;
}