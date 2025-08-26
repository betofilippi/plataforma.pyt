import { Router, Response } from 'express';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { PermissionService } from './PermissionService';
import { PermissionRequest, createCommonMiddleware } from './middleware';

export function createPermissionRoutes(pool: Pool, redis?: Redis): Router {
  const router = Router();
  const permissionService = new PermissionService(pool, redis);
  const middleware = createCommonMiddleware(pool, redis);

  // ===== PERMISSION ENDPOINTS =====

  /**
   * GET /api/permissions - Get all permissions
   */
  router.get('/permissions', 
    middleware.hasPermission('system.permissions.read'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { module, include_inactive } = req.query;
        const permissions = await permissionService.getPermissions(
          module as string,
          include_inactive === 'true'
        );

        res.json({
          success: true,
          data: permissions,
          total: permissions.length
        });
      } catch (error) {
        console.error('Error getting permissions:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve permissions'
        });
      }
    }
  );

  /**
   * POST /api/permissions - Create new permission
   */
  router.post('/permissions',
    middleware.hasPermission('system.permissions.create'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { name, displayName, resource, action, moduleName, description } = req.body;

        // Validate required fields
        if (!name || !displayName || !resource || !action) {
          res.status(400).json({
            success: false,
            message: 'Missing required fields: name, displayName, resource, action'
          });
          return;
        }

        const permission = await permissionService.createPermission(
          name,
          displayName,
          resource,
          action,
          moduleName,
          description
        );

        if (!permission) {
          res.status(400).json({
            success: false,
            message: 'Failed to create permission - possibly duplicate name'
          });
          return;
        }

        res.status(201).json({
          success: true,
          data: permission,
          message: 'Permission created successfully'
        });
      } catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create permission'
        });
      }
    }
  );

  /**
   * PUT /api/permissions/:id - Update permission (not implemented for system permissions)
   */
  router.put('/permissions/:id',
    middleware.hasPermission('system.permissions.update'),
    async (req: PermissionRequest, res: Response) => {
      res.status(501).json({
        success: false,
        message: 'Permission updates not implemented for security reasons'
      });
    }
  );

  /**
   * DELETE /api/permissions/:id - Delete permission
   */
  router.delete('/permissions/:id',
    middleware.hasPermission('system.permissions.delete'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { id } = req.params;

        // Check if it's a system permission
        const result = await pool.query(`
          SELECT is_system FROM plataforma_core.permissions WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Permission not found'
          });
          return;
        }

        if (result.rows[0].is_system) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete system permissions'
          });
          return;
        }

        await pool.query(`
          UPDATE plataforma_core.permissions 
          SET is_active = false 
          WHERE id = $1
        `, [id]);

        res.json({
          success: true,
          message: 'Permission deactivated successfully'
        });
      } catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to delete permission'
        });
      }
    }
  );

  // ===== ROLE ENDPOINTS =====

  /**
   * GET /api/roles - Get all roles
   */
  router.get('/roles',
    middleware.hasPermission('system.roles.read'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { include_inactive } = req.query;
        const roles = await permissionService.getRoles(include_inactive === 'true');

        res.json({
          success: true,
          data: roles,
          total: roles.length
        });
      } catch (error) {
        console.error('Error getting roles:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve roles'
        });
      }
    }
  );

  /**
   * POST /api/roles - Create new role
   */
  router.post('/roles',
    middleware.hasPermission('system.roles.create'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { name, displayName, description, level } = req.body;

        if (!name || !displayName) {
          res.status(400).json({
            success: false,
            message: 'Missing required fields: name, displayName'
          });
          return;
        }

        const role = await permissionService.createRole(
          name,
          displayName,
          description,
          level || 100,
          req.user?.userId
        );

        if (!role) {
          res.status(400).json({
            success: false,
            message: 'Failed to create role - possibly duplicate name'
          });
          return;
        }

        res.status(201).json({
          success: true,
          data: role,
          message: 'Role created successfully'
        });
      } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create role'
        });
      }
    }
  );

  /**
   * GET /api/roles/:id/permissions - Get role permissions
   */
  router.get('/roles/:id/permissions',
    middleware.hasPermission('system.roles.read'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { id } = req.params;
        const permissions = await permissionService.getRolePermissions(id);

        res.json({
          success: true,
          data: permissions,
          total: permissions.length
        });
      } catch (error) {
        console.error('Error getting role permissions:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve role permissions'
        });
      }
    }
  );

  /**
   * POST /api/roles/:id/permissions - Assign permission to role
   */
  router.post('/roles/:id/permissions',
    middleware.hasPermission('system.roles.update'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { id: roleId } = req.params;
        const { permissionId, permissions } = req.body;

        // Handle single permission or array
        const permissionIds = permissions || [permissionId];
        
        if (!permissionIds || permissionIds.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Permission ID(s) required'
          });
          return;
        }

        const results = await Promise.all(
          permissionIds.map((pId: string) => 
            permissionService.assignPermissionToRole(roleId, pId, req.user?.userId)
          )
        );

        const successful = results.filter(r => r).length;

        res.json({
          success: true,
          message: `Assigned ${successful}/${permissionIds.length} permissions to role`,
          assigned: successful,
          total: permissionIds.length
        });
      } catch (error) {
        console.error('Error assigning permission to role:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to assign permission to role'
        });
      }
    }
  );

  /**
   * DELETE /api/roles/:id/permissions/:permissionId - Remove permission from role
   */
  router.delete('/roles/:id/permissions/:permissionId',
    middleware.hasPermission('system.roles.update'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { id: roleId, permissionId } = req.params;

        const success = await permissionService.revokePermissionFromRole(roleId, permissionId);

        if (!success) {
          res.status(400).json({
            success: false,
            message: 'Failed to revoke permission from role'
          });
          return;
        }

        res.json({
          success: true,
          message: 'Permission revoked from role successfully'
        });
      } catch (error) {
        console.error('Error revoking permission from role:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to revoke permission from role'
        });
      }
    }
  );

  // ===== USER ROLE MANAGEMENT =====

  /**
   * GET /api/users/:userId/permissions - Get user permissions
   */
  router.get('/users/:userId/permissions',
    middleware.selfOrAdmin('userId'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const { module } = req.query;

        const userPermissions = await permissionService.getUserPermissions(
          userId,
          module as string
        );

        res.json({
          success: true,
          data: userPermissions
        });
      } catch (error) {
        console.error('Error getting user permissions:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve user permissions'
        });
      }
    }
  );

  /**
   * POST /api/users/:userId/roles - Assign role to user
   */
  router.post('/users/:userId/roles',
    middleware.canManageUser(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const { roleId, moduleName, expiresAt, reason } = req.body;

        if (!roleId) {
          res.status(400).json({
            success: false,
            message: 'Role ID is required'
          });
          return;
        }

        // Check if assigning user can assign this role level
        const canManage = await permissionService.canManageUser(
          req.user!.userId, 
          userId
        );

        if (!canManage) {
          res.status(403).json({
            success: false,
            message: 'Cannot assign roles to users with equal or higher privileges'
          });
          return;
        }

        const assignmentId = await permissionService.assignRole(
          userId,
          roleId,
          moduleName,
          req.user?.userId,
          expiresAt ? new Date(expiresAt) : undefined,
          reason
        );

        if (!assignmentId) {
          res.status(400).json({
            success: false,
            message: 'Failed to assign role to user'
          });
          return;
        }

        res.json({
          success: true,
          message: 'Role assigned to user successfully',
          assignmentId
        });
      } catch (error) {
        console.error('Error assigning role to user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to assign role to user'
        });
      }
    }
  );

  /**
   * DELETE /api/users/:userId/roles/:roleId - Revoke role from user
   */
  router.delete('/users/:userId/roles/:roleId',
    middleware.canManageUser(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId, roleId } = req.params;
        const { moduleName, reason } = req.body;

        const success = await permissionService.revokeRole(
          userId,
          roleId,
          moduleName,
          req.user?.userId,
          reason
        );

        if (!success) {
          res.status(400).json({
            success: false,
            message: 'Failed to revoke role from user'
          });
          return;
        }

        res.json({
          success: true,
          message: 'Role revoked from user successfully'
        });
      } catch (error) {
        console.error('Error revoking role from user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to revoke role from user'
        });
      }
    }
  );

  /**
   * POST /api/users/:userId/permissions - Grant direct permission to user
   */
  router.post('/users/:userId/permissions',
    middleware.canManageUser(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId } = req.params;
        const { permissionId, expiresAt, reason } = req.body;

        if (!permissionId) {
          res.status(400).json({
            success: false,
            message: 'Permission ID is required'
          });
          return;
        }

        const success = await permissionService.grantPermission(
          userId,
          permissionId,
          req.user?.userId,
          expiresAt ? new Date(expiresAt) : undefined,
          reason
        );

        if (!success) {
          res.status(400).json({
            success: false,
            message: 'Failed to grant permission to user'
          });
          return;
        }

        res.json({
          success: true,
          message: 'Permission granted to user successfully'
        });
      } catch (error) {
        console.error('Error granting permission to user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to grant permission to user'
        });
      }
    }
  );

  /**
   * DELETE /api/users/:userId/permissions/:permissionId - Revoke direct permission from user
   */
  router.delete('/users/:userId/permissions/:permissionId',
    middleware.canManageUser(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId, permissionId } = req.params;
        const { reason } = req.body;

        const success = await permissionService.revokePermission(
          userId,
          permissionId,
          req.user?.userId,
          reason
        );

        if (!success) {
          res.status(400).json({
            success: false,
            message: 'Failed to revoke permission from user'
          });
          return;
        }

        res.json({
          success: true,
          message: 'Permission revoked from user successfully'
        });
      } catch (error) {
        console.error('Error revoking permission from user:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to revoke permission from user'
        });
      }
    }
  );

  // ===== PERMISSION CHECKING ENDPOINTS =====

  /**
   * POST /api/check-permission - Check if user has specific permission
   */
  router.post('/check-permission',
    middleware.userOrAbove(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { permission, module, userId } = req.body;
        
        // Use current user if not specified (and if not admin checking others)
        const targetUserId = userId || req.user!.userId;

        // If checking another user, require admin permissions
        if (targetUserId !== req.user!.userId) {
          const hasAdminAccess = await req.permissions!.hasPermission('system.users.read');
          if (!hasAdminAccess) {
            res.status(403).json({
              success: false,
              message: 'Cannot check permissions for other users'
            });
            return;
          }
        }

        if (!permission) {
          res.status(400).json({
            success: false,
            message: 'Permission name is required'
          });
          return;
        }

        const result = await permissionService.hasPermission(targetUserId, permission, module);

        res.json({
          success: true,
          data: {
            userId: targetUserId,
            permission,
            module,
            granted: result.granted,
            source: result.source,
            reason: result.reason
          }
        });
      } catch (error) {
        console.error('Error checking permission:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to check permission'
        });
      }
    }
  );

  /**
   * POST /api/check-permissions - Check multiple permissions
   */
  router.post('/check-permissions',
    middleware.userOrAbove(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { permissions, module, userId } = req.body;
        
        const targetUserId = userId || req.user!.userId;

        if (targetUserId !== req.user!.userId) {
          const hasAdminAccess = await req.permissions!.hasPermission('system.users.read');
          if (!hasAdminAccess) {
            res.status(403).json({
              success: false,
              message: 'Cannot check permissions for other users'
            });
            return;
          }
        }

        if (!permissions || !Array.isArray(permissions)) {
          res.status(400).json({
            success: false,
            message: 'Permissions array is required'
          });
          return;
        }

        const results = await permissionService.hasPermissions(targetUserId, permissions, module);

        res.json({
          success: true,
          data: {
            userId: targetUserId,
            module,
            results
          }
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to check permissions'
        });
      }
    }
  );

  // ===== AUDIT ENDPOINTS =====

  /**
   * GET /api/permission-audit - Get permission audit log
   */
  router.get('/permission-audit',
    middleware.hasPermission('system.audit.read'),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { userId, limit = 100, offset = 0 } = req.query;

        const auditLog = await permissionService.getPermissionAudit(
          userId as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );

        res.json({
          success: true,
          data: auditLog,
          pagination: {
            limit: parseInt(limit as string),
            offset: parseInt(offset as string),
            count: auditLog.length
          }
        });
      } catch (error) {
        console.error('Error getting permission audit:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve audit log'
        });
      }
    }
  );

  // ===== UTILITY ENDPOINTS =====

  /**
   * GET /api/my-permissions - Get current user's permissions (convenience endpoint)
   */
  router.get('/my-permissions',
    middleware.userOrAbove(),
    async (req: PermissionRequest, res: Response) => {
      try {
        const { module } = req.query;
        
        const userPermissions = await permissionService.getUserPermissions(
          req.user!.userId,
          module as string
        );

        res.json({
          success: true,
          data: userPermissions
        });
      } catch (error) {
        console.error('Error getting user permissions:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve permissions'
        });
      }
    }
  );

  /**
   * GET /api/permission-matrix - Get complete permission matrix for admin UI
   */
  router.get('/permission-matrix',
    middleware.hasPermission('system.permissions.read'),
    async (req: PermissionRequest, res: Response) => {
      try {
        // Get all roles and permissions
        const [roles, permissions] = await Promise.all([
          permissionService.getRoles(),
          permissionService.getPermissions()
        ]);

        // Get role-permission mappings
        const matrix: Record<string, Record<string, boolean>> = {};
        
        for (const role of roles) {
          const rolePermissions = await permissionService.getRolePermissions(role.id);
          matrix[role.id] = {};
          
          for (const permission of permissions) {
            matrix[role.id][permission.id] = rolePermissions.some(rp => rp.id === permission.id);
          }
        }

        res.json({
          success: true,
          data: {
            roles,
            permissions,
            matrix
          }
        });
      } catch (error) {
        console.error('Error getting permission matrix:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to retrieve permission matrix'
        });
      }
    }
  );

  return router;
}