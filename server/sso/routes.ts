import express from 'express';
import { Pool } from 'pg';
import { createClient } from 'redis';
type Redis = ReturnType<typeof createClient>;
import { SSOService } from './service';
import { JWTService } from '../auth/jwt';
import { requireAuth } from '../auth/middleware';

export function createSSORoutes(pool: Pool, redis: Redis, jwtService: JWTService): express.Router {
  const router = express.Router();
  const ssoService = new SSOService(pool, redis, jwtService);

  /**
   * Initialize SSO session after login
   * POST /api/sso/init
   */
  router.post('/init', requireAuth(pool), async (req, res) => {
    try {
      const user = req.user!;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const deviceInfo = {
        platform: req.body.platform || 'unknown',
        browser: req.body.browser || 'unknown',
        os: req.body.os || 'unknown',
      };

      const session = await ssoService.createSession(
        user,
        ipAddress,
        userAgent,
        deviceInfo
      );

      // Set SSO session cookie
      res.cookie('sso_session', session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.app' : 'localhost',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.json({
        success: true,
        sessionId: session.sessionId,
        domains: session.domains,
      });
    } catch (error) {
      console.error('SSO init error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initialize SSO session',
      });
    }
  });

  /**
   * Generate SSO token for cross-domain authentication
   * POST /api/sso/token
   */
  router.post('/token', async (req, res) => {
    try {
      const { moduleId, targetDomain } = req.body;
      const sessionId = req.cookies.sso_session;

      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'No SSO session found',
          code: 'NO_SSO_SESSION',
        });
      }

      if (!moduleId || !targetDomain) {
        return res.status(400).json({
          success: false,
          message: 'Module ID and target domain are required',
          code: 'MISSING_PARAMETERS',
        });
      }

      const token = await ssoService.generateSSOToken(sessionId, moduleId, targetDomain);

      res.json({
        success: true,
        token,
        expiresIn: 5 * 60, // 5 minutes
      });
    } catch (error: any) {
      console.error('SSO token generation error:', error);
      
      if (error.message === 'Session not found') {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired SSO session',
          code: 'INVALID_SESSION',
        });
      }

      if (error.message === 'Module not registered or inactive') {
        return res.status(403).json({
          success: false,
          message: 'Module not authorized',
          code: 'MODULE_NOT_AUTHORIZED',
        });
      }

      if (error.message === 'Domain not allowed for this module') {
        return res.status(403).json({
          success: false,
          message: 'Domain not allowed',
          code: 'DOMAIN_NOT_ALLOWED',
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to generate SSO token',
        code: 'TOKEN_GENERATION_FAILED',
      });
    }
  });

  /**
   * Validate SSO token and get user session
   * POST /api/sso/validate
   */
  router.post('/validate', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'SSO token is required',
          code: 'MISSING_TOKEN',
        });
      }

      const validation = await ssoService.validateSSOToken(token);

      if (!validation) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired SSO token',
          code: 'INVALID_TOKEN',
        });
      }

      const { session, module } = validation;

      // Generate new access token for the module
      const accessToken = jwtService.generateAccessToken({
        userId: session.userId,
        email: session.email,
        role: session.role,
        name: session.name,
      });

      res.json({
        success: true,
        user: {
          id: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
        },
        accessToken,
        sessionId: session.sessionId,
        module: {
          id: module.moduleId,
          domain: module.domain,
        },
      });
    } catch (error) {
      console.error('SSO token validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate SSO token',
        code: 'VALIDATION_FAILED',
      });
    }
  });

  /**
   * Check SSO session status
   * GET /api/sso/session
   */
  router.get('/session', async (req, res) => {
    try {
      const sessionId = req.cookies.sso_session;

      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'No SSO session found',
          code: 'NO_SESSION',
        });
      }

      const session = await ssoService.getSession(sessionId);

      if (!session) {
        // Clear invalid session cookie
        res.clearCookie('sso_session', {
          domain: process.env.NODE_ENV === 'production' ? '.app' : 'localhost',
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid or expired SSO session',
          code: 'INVALID_SESSION',
        });
      }

      res.json({
        success: true,
        session: {
          id: session.sessionId,
          userId: session.userId,
          email: session.email,
          name: session.name,
          role: session.role,
          domains: session.domains,
          lastActivity: session.lastActivity,
          expiresAt: session.expiresAt,
        },
      });
    } catch (error) {
      console.error('SSO session check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check SSO session',
        code: 'SESSION_CHECK_FAILED',
      });
    }
  });

  /**
   * Update session activity
   * POST /api/sso/ping
   */
  router.post('/ping', async (req, res) => {
    try {
      const sessionId = req.cookies.sso_session;
      const { domain } = req.body;

      if (!sessionId) {
        return res.status(401).json({
          success: false,
          message: 'No SSO session found',
          code: 'NO_SESSION',
        });
      }

      await ssoService.updateSessionActivity(sessionId, domain);

      res.json({
        success: true,
        message: 'Session activity updated',
      });
    } catch (error) {
      console.error('SSO ping error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session activity',
      });
    }
  });

  /**
   * Register a module for SSO
   * POST /api/sso/register-module
   */
  router.post('/register-module', requireAuth(pool), async (req, res) => {
    try {
      // Only admins can register modules
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          code: 'ADMIN_REQUIRED',
        });
      }

      const { moduleId, domain, allowedOrigins, publicKey } = req.body;

      if (!moduleId || !domain || !allowedOrigins) {
        return res.status(400).json({
          success: false,
          message: 'Module ID, domain, and allowed origins are required',
          code: 'MISSING_PARAMETERS',
        });
      }

      await ssoService.registerModule(moduleId, domain, allowedOrigins, publicKey);

      res.json({
        success: true,
        message: 'Module registered successfully',
        moduleId,
      });
    } catch (error) {
      console.error('Module registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register module',
        code: 'REGISTRATION_FAILED',
      });
    }
  });

  /**
   * Global logout - destroy all user sessions
   * POST /api/sso/logout
   */
  router.post('/logout', async (req, res) => {
    try {
      const sessionId = req.cookies.sso_session;

      if (sessionId) {
        const session = await ssoService.getSession(sessionId);
        if (session) {
          await ssoService.destroyUserSessions(session.userId);
        }
      }

      // Clear SSO session cookie
      res.clearCookie('sso_session', {
        domain: process.env.NODE_ENV === 'production' ? '.app' : 'localhost',
      });

      res.json({
        success: true,
        message: 'Logged out from all sessions',
      });
    } catch (error) {
      console.error('SSO logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to logout',
        code: 'LOGOUT_FAILED',
      });
    }
  });

  /**
   * Get user's active sessions
   * GET /api/sso/sessions
   */
  router.get('/sessions', requireAuth(pool), async (req, res) => {
    try {
      const userId = req.user!.userId;
      const sessions = await ssoService.getUserSessions(userId);

      res.json({
        success: true,
        sessions: sessions.map(session => ({
          id: session.sessionId,
          domains: session.domains,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          deviceInfo: session.deviceInfo,
          expiresAt: session.expiresAt,
        })),
      });
    } catch (error) {
      console.error('Get sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions',
        code: 'GET_SESSIONS_FAILED',
      });
    }
  });

  /**
   * Revoke a specific session
   * DELETE /api/sso/sessions/:sessionId
   */
  router.delete('/sessions/:sessionId', requireAuth(pool), async (req, res) => {
    try {
      const userId = req.user!.userId;
      const sessionId = req.params.sessionId;

      // Verify session belongs to user
      const session = await ssoService.getSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        });
      }

      await ssoService.destroySession(sessionId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      console.error('Revoke session error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke session',
        code: 'REVOKE_FAILED',
      });
    }
  });

  /**
   * Get SSO statistics (admin only)
   * GET /api/sso/stats
   */
  router.get('/stats', requireAuth(pool), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
          code: 'ADMIN_REQUIRED',
        });
      }

      const stats = await ssoService.getStats();

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Get SSO stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get SSO statistics',
        code: 'STATS_FAILED',
      });
    }
  });

  return router;
}