import { Request, Response } from 'express';
import { getDemoJWTService, DemoJWTService } from './demo-jwt';
import { Pool } from 'pg';

/**
 * Demo Authentication Controller
 * Works without database for demonstration purposes
 */
export class DemoAuthController {
  private jwtService: DemoJWTService;
  
  // Demo users for testing (with proper UUIDs)
  private demoUsers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'admin@plataforma.app',
      password: 'admin123',
      name: 'Administrador Demo',
      role: 'admin',
      is_active: true
    },
    {
      id: '22222222-2222-2222-2222-222222222222', 
      email: 'user@plataforma.app',
      password: 'user123',
      name: 'Usuário Demo',
      role: 'user',
      is_active: true
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'manager@plataforma.app', 
      password: 'manager123',
      name: 'Gerente Demo',
      role: 'manager',
      is_active: true
    }
  ];

  constructor(pool: Pool) {
    // Use demo JWT service that doesn't require database
    this.jwtService = getDemoJWTService();
  }

  /**
   * Demo login - accepts any email/password or uses demo users
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, rememberMe } = req.body;
      
      // For demo: accept any email/password combination
      // Or use one of the demo accounts
      let user = this.demoUsers.find(u => u.email === email);
      
      // If not a demo user, create a temporary user with provided credentials
      if (!user) {
        // Generate a random UUID v4
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        
        user = {
          id: uuid,
          email: email,
          password: password, // In demo, any password works
          name: email.split('@')[0].replace(/[._-]/g, ' '),
          role: 'user',
          is_active: true
        };
      }

      // Generate tokens
      const tokens = await this.jwtService.generateTokenPair(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
        req.ip || '127.0.0.1',
        req.headers['user-agent'] || '',
        rememberMe
      );

      // Set refresh token cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        path: '/'
      };

      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);

      // Send response
      res.json({
        success: true,
        message: 'Login successful (Demo Mode)',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          accessToken: tokens.accessToken,
          expiresIn: 900 // 15 minutes
        }
      });
    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get user profile (demo)
   */
  getProfile = async (req: any, res: Response): Promise<void> => {
    try {
      // Return the user from the JWT token
      if (req.user) {
        res.json({
          success: true,
          data: {
            id: req.user.userId,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user.name)}&background=8B5CF6&color=fff`,
            is_active: true,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile'
      });
    }
  };

  /**
   * Logout (clear cookies)
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken', { path: '/' });
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  };

  /**
   * Verify token (for auth check)
   */
  verifyToken = async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user) {
        res.json({
          success: true,
          valid: true,
          user: req.user
        });
      } else {
        res.json({
          success: false,
          valid: false
        });
      }
    } catch (error) {
      res.json({
        success: false,
        valid: false
      });
    }
  };

  /**
   * Refresh token
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.cookies;
      
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'No refresh token provided'
        });
        return;
      }

      // For demo: just generate a new access token
      const decoded = await this.jwtService.verifyToken(refreshToken);
      
      if (decoded && typeof decoded === 'object' && 'userId' in decoded) {
        const tokens = await this.jwtService.generateTokenPair(
          {
            userId: decoded.userId as string,
            email: decoded.email as string,
            role: decoded.role as string,
            name: decoded.name as string,
          },
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || '',
          false
        );

        res.json({
          success: true,
          data: {
            accessToken: tokens.accessToken,
            expiresIn: 900
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Failed to refresh token'
      });
    }
  };
}

export function createDemoAuthController(pool: Pool) {
  const controller = new DemoAuthController(pool);
  
  return {
    login: controller.login,
    logout: controller.logout,
    getProfile: controller.getProfile,
    verifyToken: controller.verifyToken,
    refresh: controller.refresh,
    // Stub methods for compatibility
    logoutAll: controller.logout,
    changePassword: async (req: Request, res: Response) => {
      res.json({ success: true, message: 'Demo mode - password change not implemented' });
    },
    getSessions: async (req: Request, res: Response) => {
      res.json({ success: true, data: [] });
    }
  };
}