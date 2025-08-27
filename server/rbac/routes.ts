/**
 * RBAC Routes - Complete REST API routes for RBAC system
 * Integrates with existing auth system and provides enterprise features
 */

import express from 'express';
import { Pool } from 'pg';
import { RbacController } from './controller';
import { RbacService } from './RbacService';
import { RbacMiddleware, createRbacMiddleware, COMMON_PERMISSIONS, COMMON_ROLES } from './middleware';
import { requireAuth } from '../auth/middleware';

/**
 * Create RBAC routes with all endpoints
 */
export function createRbacRoutes(pool: Pool): express.Router {
  const router = express.Router();
  
  // Initialize services
  const rbacService = new RbacService(pool);
  const rbacController = new RbacController(rbacService);
  const rbac = createRbacMiddleware(pool);

  // Apply common middleware to all RBAC routes
  router.use(requireAuth(pool)); // Ensure user is authenticated
  router.use(rbac.requireActiveAccount()); // Ensure account is active
  router.use(rbac.requireSameOrganization()); // Add organization context
  router.use(rbac.auditLog('rbac')); // Audit logging

  // =====================================================================
  // USER MANAGEMENT ROUTES
  // =====================================================================

  /**
   * GET /api/rbac/users
   * Get paginated users list with filters
   * Required: users:read permission
   */
  router.get('/users', 
    rbac.requirePermission(COMMON_PERMISSIONS.USERS_READ[0]),
    rbacController.getUsers
  );

  /**
   * GET /api/rbac/users/:id
   * Get user by ID with roles and permissions
   * Required: users:read permission OR ownership
   */
  router.get('/users/:id',
    rbac.requireOwnershipOrPermission(COMMON_PERMISSIONS.USERS_READ[0], 'id'),
    rbacController.getUserById
  );

  /**
   * POST /api/rbac/users
   * Create new user
   * Required: users:create permission
   */
  router.post('/users',
    rbac.requirePermission(COMMON_PERMISSIONS.USERS_CREATE[0]),
    rbacController.createUser
  );

  /**
   * PUT /api/rbac/users/:id
   * Update user
   * Required: users:update permission OR ownership (limited fields)
   */
  router.put('/users/:id',
    rbac.requireOwnershipOrPermission(COMMON_PERMISSIONS.USERS_UPDATE[0], 'id'),
    rbacController.updateUser
  );

  /**
   * DELETE /api/rbac/users/:id
   * Deactivate user (soft delete)
   * Required: users:delete permission
   */
  router.delete('/users/:id',
    rbac.requirePermission(COMMON_PERMISSIONS.USERS_DELETE[0]),
    rbacController.deactivateUser
  );

  // =====================================================================
  // ROLE MANAGEMENT ROUTES
  // =====================================================================

  /**
   * GET /api/rbac/roles
   * Get all roles
   * Required: roles:read permission
   */
  router.get('/roles',
    rbac.requirePermission('roles:read'),
    rbacController.getRoles
  );

  /**
   * POST /api/rbac/roles
   * Create new role
   * Required: roles:create permission
   */
  router.post('/roles',
    rbac.requirePermission('roles:create'),
    rbacController.createRole
  );

  // =====================================================================
  // ROLE ASSIGNMENT ROUTES
  // =====================================================================

  /**
   * POST /api/rbac/users/:userId/roles
   * Assign role to user
   * Required: users:manage_roles permission
   */
  router.post('/users/:userId/roles',
    rbac.requirePermission('users:manage_roles'),
    rbacController.assignRole
  );

  /**
   * DELETE /api/rbac/users/:userId/roles/:roleId
   * Remove role from user
   * Required: users:manage_roles permission
   */
  router.delete('/users/:userId/roles/:roleId',
    rbac.requirePermission('users:manage_roles'),
    rbacController.removeRole
  );

  // =====================================================================
  // PERMISSION ROUTES
  // =====================================================================

  /**
   * GET /api/rbac/users/:id/permissions
   * Get user's effective permissions
   * Required: users:read permission OR ownership
   */
  router.get('/users/:id/permissions',
    rbac.requireOwnershipOrPermission(COMMON_PERMISSIONS.USERS_READ[0], 'id'),
    rbacController.getUserPermissions
  );

  /**
   * POST /api/rbac/check-permission
   * Check if current user has specific permission
   * No additional permission required (users can check their own permissions)
   */
  router.post('/check-permission',
    rbacController.checkPermission
  );

  // =====================================================================
  // STATISTICS ROUTES
  // =====================================================================

  /**
   * GET /api/rbac/stats/users
   * Get user statistics
   * Required: system:admin_panel permission
   */
  router.get('/stats/users',
    rbac.requirePermission('system:admin_panel'),
    rbacController.getUserStats
  );

  // =====================================================================
  // BULK OPERATIONS ROUTES
  // =====================================================================

  /**
   * POST /api/rbac/users/bulk-assign-role
   * Assign role to multiple users
   * Required: users:manage_roles permission
   */
  router.post('/users/bulk-assign-role',
    rbac.requirePermission('users:manage_roles'),
    rbacController.bulkAssignRole
  );

  /**
   * POST /api/rbac/users/bulk-update-status
   * Update status of multiple users
   * Required: users:update permission
   */
  router.post('/users/bulk-update-status',
    rbac.requirePermission(COMMON_PERMISSIONS.USERS_UPDATE[0]),
    rbacController.bulkUpdateUserStatus
  );

  // =====================================================================
  // DATA ACCESS ROUTES (Dynamic permissions for modules)
  // =====================================================================

  /**
   * GET /api/rbac/data/:schema/:table
   * Check data access permission for specific schema/table
   * Required: Dynamic data permission based on schema/table
   */
  router.get('/data/:schema/:table/check',
    rbac.requireDataAccess('read'),
    (req, res) => {
      res.json({
        success: true,
        message: 'Data access granted',
        data: {
          schema: req.params.schema,
          table: req.params.table,
          access: 'read'
        }
      });
    }
  );

  /**
   * POST /api/rbac/data/:schema/:table/check
   * Check data write permission for specific schema/table
   * Required: Dynamic data permission based on schema/table
   */
  router.post('/data/:schema/:table/check',
    rbac.requireDataAccess('write'),
    (req, res) => {
      res.json({
        success: true,
        message: 'Data write access granted',
        data: {
          schema: req.params.schema,
          table: req.params.table,
          access: 'write'
        }
      });
    }
  );

  /**
   * DELETE /api/rbac/data/:schema/:table/check
   * Check data delete permission for specific schema/table
   * Required: Dynamic data permission based on schema/table
   */
  router.delete('/data/:schema/:table/check',
    rbac.requireDataAccess('delete'),
    (req, res) => {
      res.json({
        success: true,
        message: 'Data delete access granted',
        data: {
          schema: req.params.schema,
          table: req.params.table,
          access: 'delete'
        }
      });
    }
  );

  // =====================================================================
  // MODULE INTEGRATION ROUTES
  // =====================================================================

  /**
   * GET /api/rbac/modules/:moduleId/permissions
   * Get permissions for a specific module
   * Required: modules:configure permission
   */
  router.get('/modules/:moduleId/permissions',
    rbac.requirePermission('modules:configure'),
    async (req, res) => {
      try {
        const { moduleId } = req.params;
        
        // Get module-specific permissions
        const query = `
          SELECT p.*
          FROM plataforma_rbac.permissions p
          WHERE p.resource LIKE $1 OR p.name LIKE $1
          ORDER BY p.category, p.name
        `;
        
        const result = await pool.query(query, [`%${moduleId}%`]);
        
        res.json({
          success: true,
          message: 'Module permissions retrieved successfully',
          data: result.rows
        });
      } catch (error) {
        console.error('Get module permissions error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve module permissions',
          code: 'GET_MODULE_PERMISSIONS_ERROR'
        });
      }
    }
  );

  /**
   * POST /api/rbac/modules/:moduleId/install-permissions
   * Install permissions for a module
   * Required: modules:install permission
   */
  router.post('/modules/:moduleId/install-permissions',
    rbac.requirePermission('modules:install'),
    async (req, res) => {
      try {
        const { moduleId } = req.params;
        const { permissions } = req.body;

        if (!permissions || !Array.isArray(permissions)) {
          return res.status(400).json({
            success: false,
            message: 'Permissions array is required',
            code: 'VALIDATION_ERROR'
          });
        }

        const client = await pool.connect();
        
        try {
          await client.query('BEGIN');

          // Install each permission
          for (const permission of permissions) {
            await client.query(`
              INSERT INTO plataforma_rbac.permissions (
                name, display_name, description, category, resource, action
              ) VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (name) DO NOTHING
            `, [
              permission.name,
              permission.displayName,
              permission.description,
              'module_management',
              moduleId,
              permission.action
            ]);
          }

          await client.query('COMMIT');

          res.json({
            success: true,
            message: `Installed ${permissions.length} permissions for module ${moduleId}`,
            data: { moduleId, permissionsCount: permissions.length }
          });
          
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      } catch (error) {
        console.error('Install module permissions error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to install module permissions',
          code: 'INSTALL_PERMISSIONS_ERROR'
        });
      }
    }
  );

  // =====================================================================
  // ADMIN ROUTES (Highest level permissions)
  // =====================================================================

  /**
   * GET /api/rbac/admin/health
   * RBAC system health check
   * Required: Super Admin role
   */
  router.get('/admin/health',
    rbac.requireRole('super_admin'),
    async (req, res) => {
      try {
        // Check database connectivity and basic stats
        const stats = await Promise.all([
          pool.query('SELECT COUNT(*) as users FROM plataforma_rbac.users WHERE is_active = true'),
          pool.query('SELECT COUNT(*) as roles FROM plataforma_rbac.roles WHERE is_active = true'),
          pool.query('SELECT COUNT(*) as permissions FROM plataforma_rbac.permissions'),
          pool.query('SELECT COUNT(*) as active_sessions FROM plataforma_rbac.user_sessions WHERE is_active = true AND expires_at > NOW()')
        ]);

        res.json({
          success: true,
          message: 'RBAC system is healthy',
          data: {
            timestamp: new Date().toISOString(),
            activeUsers: parseInt(stats[0].rows[0].users),
            activeRoles: parseInt(stats[1].rows[0].roles),
            totalPermissions: parseInt(stats[2].rows[0].permissions),
            activeSessions: parseInt(stats[3].rows[0].active_sessions),
            version: '1.0.0'
          }
        });
      } catch (error) {
        console.error('RBAC health check error:', error);
        res.status(500).json({
          success: false,
          message: 'RBAC system health check failed',
          code: 'HEALTH_CHECK_ERROR'
        });
      }
    }
  );

  /**
   * POST /api/rbac/admin/cleanup
   * Cleanup expired tokens and sessions
   * Required: Super Admin role
   */
  router.post('/admin/cleanup',
    rbac.requireRole('super_admin'),
    async (req, res) => {
      try {
        const cleanupResults = await Promise.all([
          pool.query(`
            UPDATE plataforma_rbac.user_sessions 
            SET is_active = false, revoked_at = NOW(), revoked_reason = 'expired'
            WHERE is_active = true AND expires_at <= NOW()
          `),
          pool.query(`
            UPDATE plataforma_rbac.user_permissions
            SET granted = false
            WHERE expires_at IS NOT NULL AND expires_at <= NOW()
          `),
          pool.query(`
            UPDATE plataforma_rbac.user_roles
            SET is_active = false
            WHERE expires_at IS NOT NULL AND expires_at <= NOW()
          `)
        ]);

        const expiredSessions = cleanupResults[0].rowCount || 0;
        const expiredPermissions = cleanupResults[1].rowCount || 0;
        const expiredRoles = cleanupResults[2].rowCount || 0;

        res.json({
          success: true,
          message: 'Cleanup completed successfully',
          data: {
            expiredSessions,
            expiredPermissions,
            expiredRoles,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('RBAC cleanup error:', error);
        res.status(500).json({
          success: false,
          message: 'Cleanup failed',
          code: 'CLEANUP_ERROR'
        });
      }
    }
  );

  return router;
}

// =====================================================================
// RBAC INTEGRATION HELPERS
// =====================================================================

/**
 * Helper to create permission-checking middleware for routes
 */
export function rbacProtected(pool: Pool, permission: string) {
  const rbac = createRbacMiddleware(pool);
  return [
    requireAuth(pool),
    rbac.requireActiveAccount(),
    rbac.requirePermission(permission)
  ];
}

/**
 * Helper to create role-checking middleware for routes
 */
export function roleProtected(pool: Pool, roles: string | string[]) {
  const rbac = createRbacMiddleware(pool);
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return [
    requireAuth(pool),
    rbac.requireActiveAccount(),
    rbac.requireAnyRole(roleArray)
  ];
}

/**
 * Helper to create data access middleware for module routes
 */
export function dataAccessProtected(pool: Pool, action: 'read' | 'write' | 'delete' = 'read') {
  const rbac = createRbacMiddleware(pool);
  return [
    requireAuth(pool),
    rbac.requireActiveAccount(),
    rbac.requireDataAccess(action)
  ];
}

/**
 * Create module-specific RBAC router
 */
export function createModuleRbacRouter(pool: Pool, moduleId: string) {
  const router = express.Router();
  const rbac = createRbacMiddleware(pool);

  // All routes in this router require authentication
  router.use(requireAuth(pool));
  router.use(rbac.requireActiveAccount());

  // Add module-specific permission check
  router.use((req, res, next) => {
    req.moduleId = moduleId;
    next();
  });

  return router;
}

export default createRbacRoutes;