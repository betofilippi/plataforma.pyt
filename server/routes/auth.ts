import express from 'express';
import { Pool } from 'pg';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { createAuthController } from '../auth/controller';
import { createDemoAuthController } from '../auth/demo-controller';
import {
  requireAuth,
  optionalAuth,
  requireAdmin,
  authErrorHandler,
  createLoginRateLimit,
  authLogger,
  securityHeaders,
} from '../auth/middleware';

/**
 * Create auth routes with all endpoints
 */
export function createAuthRoutes(pool: Pool): express.Router {
  const router = express.Router();
  
  // Use demo controller for now (no database required)
  const USE_DEMO_AUTH = true; // Toggle this to switch between demo and real auth
  const authController = USE_DEMO_AUTH 
    ? createDemoAuthController(pool)
    : createAuthController(pool);

  // Apply middleware to all auth routes
  router.use(cookieParser());
  router.use(securityHeaders);
  router.use(authLogger);

  // Rate limiting for login attempts
  const loginRateLimitConfig = createLoginRateLimit();
  const loginRateLimit = rateLimit(loginRateLimitConfig);

  // ===== PUBLIC ROUTES (No authentication required) =====

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  router.post('/login', loginRateLimit, authController.login);

  /**
   * POST /api/auth/refresh
   * Refresh access token using refresh token
   */
  router.post('/refresh', authController.refresh);

  /**
   * POST /api/auth/logout
   * Logout current session (clears refresh token)
   */
  router.post('/logout', authController.logout);

  // ===== PROTECTED ROUTES (Authentication required) =====

  /**
   * GET /api/auth/profile
   * Get current user profile
   */
  router.get('/profile', requireAuth(pool), authController.getProfile);

  /**
   * POST /api/auth/logout-all
   * Logout from all devices (revoke all refresh tokens)
   */
  router.post('/logout-all', requireAuth(pool), authController.logoutAll);

  /**
   * PUT /api/auth/change-password
   * Change user password
   */
  router.put('/change-password', requireAuth(pool), authController.changePassword);

  /**
   * GET /api/auth/sessions
   * Get user active sessions
   */
  router.get('/sessions', requireAuth(pool), authController.getSessions);

  /**
   * GET /api/auth/verify
   * Verify token validity (health check)
   */
  router.get('/verify', requireAuth(pool), authController.verifyToken);

  // ===== ADMIN ROUTES =====

  /**
   * GET /api/auth/admin/users
   * Get all users (admin only)
   */
  router.get('/admin/users', requireAdmin(pool), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          id, email, name, role, is_active, created_at, last_login, metadata,
          (SELECT COUNT(*) FROM plataforma_core.refresh_tokens 
           WHERE user_id = u.id AND is_active = true AND expires_at > NOW()) as active_sessions
        FROM plataforma_core.users u
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        data: {
          users: result.rows.map(user => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at,
            lastLogin: user.last_login,
            metadata: user.metadata,
            activeSessions: parseInt(user.active_sessions),
          })),
          total: result.rows.length
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users'
      });
    }
  });

  /**
   * PUT /api/auth/admin/users/:userId/status
   * Enable/disable user account (admin only)
   */
  router.put('/admin/users/:userId/status', requireAdmin(pool), async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean'
        });
        return;
      }

      const result = await pool.query(`
        UPDATE plataforma_core.users
        SET is_active = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, name, is_active
      `, [isActive, userId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // If disabling user, revoke all their tokens
      if (!isActive) {
        await pool.query(`
          UPDATE plataforma_core.refresh_tokens
          SET is_active = false, revoked_at = NOW()
          WHERE user_id = $1 AND is_active = true
        `, [userId]);
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
        data: {
          user: result.rows[0]
        }
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status'
      });
    }
  });

  /**
   * GET /api/auth/admin/login-attempts
   * Get recent login attempts (admin only)
   */
  router.get('/admin/login-attempts', requireAdmin(pool), async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const result = await pool.query(`
        SELECT id, email, ip_address, success, attempted_at, user_agent, failure_reason
        FROM plataforma_core.login_attempts
        ORDER BY attempted_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const countResult = await pool.query(`
        SELECT COUNT(*) as total FROM plataforma_core.login_attempts
      `);

      res.json({
        success: true,
        data: {
          attempts: result.rows,
          pagination: {
            page,
            limit,
            total: parseInt(countResult.rows[0].total),
            pages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get login attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get login attempts'
      });
    }
  });

  /**
   * POST /api/auth/admin/cleanup-tokens
   * Cleanup expired tokens (admin only)
   */
  router.post('/admin/cleanup-tokens', requireAdmin(pool), async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT plataforma_core.cleanup_expired_tokens() as deleted_count
      `);

      const deletedCount = result.rows[0].deleted_count;

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired tokens`,
        data: {
          deletedCount
        }
      });
    } catch (error) {
      console.error('Cleanup tokens error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup tokens'
      });
    }
  });

  // ===== ERROR HANDLING =====
  router.use(authErrorHandler);

  return router;
}

/**
 * Create database pool for authentication
 * This should match your existing database configuration
 */
export function createDatabasePool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:6543/postgres?pgbouncer=true',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // How long to wait for a connection
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client:', err);
  });

  return pool;
}

export default createAuthRoutes;