import express from 'express';
import { Pool } from 'pg';
import { supabase } from '../../client/lib/supabase';

export function createOAuthRoutes(pool: Pool): express.Router {
  const router = express.Router();

  /**
   * GET /api/oauth/providers
   * Get available OAuth providers configuration
   */
  router.get('/providers', async (req, res) => {
    try {
      const providers = [
        {
          id: 'google',
          name: 'Google',
          enabled: true,
          icon: 'mail',
          description: 'Continue com sua conta Google'
        },
        {
          id: 'github',
          name: 'GitHub',
          enabled: true,
          icon: 'github',
          description: 'Continue com sua conta GitHub'
        },
        {
          id: 'discord',
          name: 'Discord',
          enabled: true,
          icon: 'message-circle',
          description: 'Continue com sua conta Discord'
        }
      ];

      res.json({
        success: true,
        data: { providers }
      });
    } catch (error: any) {
      console.error('Error getting OAuth providers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get OAuth providers',
        error: error.message
      });
    }
  });

  /**
   * POST /api/oauth/callback
   * Handle OAuth callback and sync with our auth system
   */
  router.post('/callback', async (req, res) => {
    try {
      const { access_token, refresh_token, user, provider } = req.body;

      if (!access_token || !user) {
        return res.status(400).json({
          success: false,
          message: 'Missing required OAuth data'
        });
      }

      // Check if user already exists in our database
      const existingUserQuery = `
        SELECT id, email, name, role, created_at, metadata
        FROM plataforma_core.users 
        WHERE email = $1 OR (metadata->>'oauth_provider_id') = $2
      `;
      
      const existingUserResult = await pool.query(existingUserQuery, [
        user.email,
        user.id
      ]);

      let userData;

      if (existingUserResult.rows.length > 0) {
        // Update existing user
        const updateQuery = `
          UPDATE plataforma_core.users 
          SET 
            last_login = NOW(),
            metadata = jsonb_set(
              COALESCE(metadata, '{}'),
              '{oauth_tokens}',
              jsonb_build_object(
                'access_token', $1,
                'refresh_token', $2,
                'provider', $3,
                'updated_at', NOW()
              )
            )
          WHERE email = $4
          RETURNING id, email, name, role, created_at, last_login, metadata
        `;

        const updateResult = await pool.query(updateQuery, [
          access_token,
          refresh_token,
          provider,
          user.email
        ]);

        userData = updateResult.rows[0];
      } else {
        // Create new user
        const insertQuery = `
          INSERT INTO plataforma_core.users (
            email, 
            name, 
            role, 
            created_at, 
            last_login,
            metadata
          ) VALUES (
            $1, 
            $2, 
            'user', 
            NOW(), 
            NOW(),
            jsonb_build_object(
              'oauth_provider', $3,
              'oauth_provider_id', $4,
              'oauth_tokens', jsonb_build_object(
                'access_token', $5,
                'refresh_token', $6,
                'provider', $3,
                'created_at', NOW()
              ),
              'avatar_url', $7
            )
          )
          RETURNING id, email, name, role, created_at, last_login, metadata
        `;

        const insertResult = await pool.query(insertQuery, [
          user.email,
          user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          provider,
          user.id,
          access_token,
          refresh_token,
          user.user_metadata?.avatar_url
        ]);

        userData = insertResult.rows[0];
      }

      res.json({
        success: true,
        message: 'OAuth login successful',
        data: {
          user: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            avatarUrl: userData.metadata?.avatar_url,
            lastLogin: userData.last_login,
            createdAt: userData.created_at,
            metadata: userData.metadata
          }
        }
      });

    } catch (error: any) {
      console.error('OAuth callback error:', error);
      res.status(500).json({
        success: false,
        message: 'OAuth callback failed',
        error: error.message
      });
    }
  });

  /**
   * POST /api/oauth/unlink/:provider
   * Unlink OAuth provider from user account
   */
  router.post('/unlink/:provider', async (req, res) => {
    try {
      const { provider } = req.params;
      const userId = req.user?.id; // From auth middleware

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const updateQuery = `
        UPDATE plataforma_core.users 
        SET metadata = metadata - 'oauth_tokens'
        WHERE id = $1 AND (metadata->>'oauth_provider') = $2
        RETURNING id, email, name, metadata
      `;

      const result = await pool.query(updateQuery, [userId, provider]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'OAuth provider not linked to this account'
        });
      }

      res.json({
        success: true,
        message: `${provider} account unlinked successfully`,
        data: { user: result.rows[0] }
      });

    } catch (error: any) {
      console.error('OAuth unlink error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unlink OAuth provider',
        error: error.message
      });
    }
  });

  return router;
}

export default createOAuthRoutes;