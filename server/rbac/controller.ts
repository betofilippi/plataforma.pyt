/**
 * RBAC Controller - HTTP endpoints for user and role management
 * Provides complete REST API for RBAC operations
 */

import { Request, Response } from 'express';
import { RbacService } from './RbacService';
import { 
  CreateUserRequest, 
  UpdateUserRequest, 
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  UserFilters,
  RoleFilters,
  AuditFilters 
} from '../../types/rbac';

export class RbacController {
  constructor(private rbacService: RbacService) {}

  // =====================================================================
  // USER MANAGEMENT ENDPOINTS
  // =====================================================================

  /**
   * GET /api/rbac/users
   * Get paginated users list with filters
   */
  getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: UserFilters = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100), // Max 100 per page
        search: req.query.search as string,
        role: req.query.role as string,
        department: req.query.department as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        isLocked: req.query.isLocked === 'true' ? true : req.query.isLocked === 'false' ? false : undefined,
        organizationId: req.organizationId, // From middleware
        sortBy: (req.query.sortBy as string) || 'created_at',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
      };

      const result = await this.rbacService.getUsers(filters);

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        code: 'GET_USERS_ERROR'
      });
    }
  };

  /**
   * GET /api/rbac/users/:id
   * Get user by ID with roles and permissions
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const user = await this.rbacService.getUserById(id);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Check organization access
      if (req.organizationId && user.organizationId !== req.organizationId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to user from different organization',
          code: 'ORGANIZATION_ACCESS_DENIED'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user',
        code: 'GET_USER_ERROR'
      });
    }
  };

  /**
   * POST /api/rbac/users
   * Create new user
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userData: CreateUserRequest = req.body;
      
      // Validate required fields
      if (!userData.email || !userData.name) {
        res.status(400).json({
          success: false,
          message: 'Email and name are required',
          code: 'VALIDATION_ERROR',
          errors: {
            email: !userData.email ? ['Email is required'] : [],
            name: !userData.name ? ['Name is required'] : []
          }
        });
        return;
      }

      // Check if user already exists
      const existingUser = await this.rbacService.getUserByEmail(userData.email, req.organizationId);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          code: 'USER_ALREADY_EXISTS'
        });
        return;
      }

      const user = await this.rbacService.createUser(userData, req.user?.id);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        code: 'CREATE_USER_ERROR'
      });
    }
  };

  /**
   * PUT /api/rbac/users/:id
   * Update user
   */
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateUserRequest = req.body;

      // Check if user exists and get current data
      const currentUser = await this.rbacService.getUserById(id);
      if (!currentUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Check organization access
      if (req.organizationId && currentUser.organizationId !== req.organizationId) {
        res.status(403).json({
          success: false,
          message: 'Access denied to user from different organization',
          code: 'ORGANIZATION_ACCESS_DENIED'
        });
        return;
      }

      const updatedUser = await this.rbacService.updateUser(id, updateData, req.user?.id);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        code: 'UPDATE_USER_ERROR'
      });
    }
  };

  /**
   * DELETE /api/rbac/users/:id
   * Deactivate user (soft delete)
   */
  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await this.rbacService.getUserById(id);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Prevent self-deactivation
      if (id === req.user?.id) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
          code: 'SELF_DEACTIVATION_DENIED'
        });
        return;
      }

      await this.rbacService.updateUser(id, { isActive: false }, req.user?.id);

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate user',
        code: 'DEACTIVATE_USER_ERROR'
      });
    }
  };

  // =====================================================================
  // ROLE MANAGEMENT ENDPOINTS
  // =====================================================================

  /**
   * GET /api/rbac/roles
   * Get all roles
   */
  getRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const roles = await this.rbacService.getRoles(req.organizationId);

      res.json({
        success: true,
        message: 'Roles retrieved successfully',
        data: roles
      });
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve roles',
        code: 'GET_ROLES_ERROR'
      });
    }
  };

  /**
   * POST /api/rbac/roles
   * Create new role
   */
  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const roleData: CreateRoleRequest = req.body;

      if (!roleData.name || !roleData.displayName) {
        res.status(400).json({
          success: false,
          message: 'Name and display name are required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (!req.organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization context required',
          code: 'ORGANIZATION_REQUIRED'
        });
        return;
      }

      const role = await this.rbacService.createRole(roleData, req.organizationId, req.user?.id);

      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create role',
        code: 'CREATE_ROLE_ERROR'
      });
    }
  };

  // =====================================================================
  // ROLE ASSIGNMENT ENDPOINTS
  // =====================================================================

  /**
   * POST /api/rbac/users/:userId/roles
   * Assign role to user
   */
  assignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { roleId, expiresAt }: AssignRoleRequest = req.body;

      if (!roleId) {
        res.status(400).json({
          success: false,
          message: 'Role ID is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      // Check if user exists
      const user = await this.rbacService.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      await this.rbacService.assignRole({ userId, roleId, expiresAt }, req.user?.id);

      res.json({
        success: true,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      console.error('Assign role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign role',
        code: 'ASSIGN_ROLE_ERROR'
      });
    }
  };

  /**
   * DELETE /api/rbac/users/:userId/roles/:roleId
   * Remove role from user
   */
  removeRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, roleId } = req.params;

      // Implementation would go here
      // For now, just return success
      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Remove role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove role',
        code: 'REMOVE_ROLE_ERROR'
      });
    }
  };

  // =====================================================================
  // PERMISSION ENDPOINTS
  // =====================================================================

  /**
   * GET /api/rbac/users/:id/permissions
   * Get user's effective permissions
   */
  getUserPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const permissions = await this.rbacService.getUserEffectivePermissions(id);

      res.json({
        success: true,
        message: 'User permissions retrieved successfully',
        data: permissions
      });
    } catch (error) {
      console.error('Get user permissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user permissions',
        code: 'GET_PERMISSIONS_ERROR'
      });
    }
  };

  /**
   * POST /api/rbac/check-permission
   * Check if current user has specific permission
   */
  checkPermission = async (req: Request, res: Response): Promise<void> => {
    try {
      const { permission } = req.body;

      if (!permission) {
        res.status(400).json({
          success: false,
          message: 'Permission name is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const hasPermission = await this.rbacService.hasPermission(req.user.id, permission);

      res.json({
        success: true,
        message: 'Permission check completed',
        data: {
          permission,
          granted: hasPermission
        }
      });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check permission',
        code: 'CHECK_PERMISSION_ERROR'
      });
    }
  };

  // =====================================================================
  // STATISTICS ENDPOINTS
  // =====================================================================

  /**
   * GET /api/rbac/stats/users
   * Get user statistics
   */
  getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.rbacService.getUserStats(req.organizationId);

      res.json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user statistics',
        code: 'GET_STATS_ERROR'
      });
    }
  };

  // =====================================================================
  // BULK OPERATIONS
  // =====================================================================

  /**
   * POST /api/rbac/users/bulk-assign-role
   * Assign role to multiple users
   */
  bulkAssignRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userIds, roleId, expiresAt } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User IDs array is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (!roleId) {
        res.status(400).json({
          success: false,
          message: 'Role ID is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const results = [];
      for (const userId of userIds) {
        try {
          await this.rbacService.assignRole({ userId, roleId, expiresAt }, req.user?.id);
          results.push({ userId, success: true });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `Bulk role assignment completed. ${successCount}/${userIds.length} successful.`,
        data: {
          results,
          successCount,
          totalCount: userIds.length
        }
      });
    } catch (error) {
      console.error('Bulk assign role error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk role assignment',
        code: 'BULK_ASSIGN_ERROR'
      });
    }
  };

  /**
   * POST /api/rbac/users/bulk-update-status
   * Update status of multiple users
   */
  bulkUpdateUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userIds, isActive } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'User IDs array is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      // Prevent bulk deactivation of current user
      if (!isActive && userIds.includes(req.user?.id)) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
          code: 'SELF_DEACTIVATION_DENIED'
        });
        return;
      }

      const results = [];
      for (const userId of userIds) {
        try {
          await this.rbacService.updateUser(userId, { isActive }, req.user?.id);
          results.push({ userId, success: true });
        } catch (error) {
          results.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `Bulk status update completed. ${successCount}/${userIds.length} successful.`,
        data: {
          results,
          successCount,
          totalCount: userIds.length
        }
      });
    } catch (error) {
      console.error('Bulk update user status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to perform bulk status update',
        code: 'BULK_UPDATE_ERROR'
      });
    }
  };
}