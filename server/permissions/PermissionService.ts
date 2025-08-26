import { Pool } from 'pg';
import { Redis } from 'ioredis';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  moduleName?: string;
  resource: string;
  action: string;
  isSystem: boolean;
  isActive: boolean;
  metadata?: any;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  metadata?: any;
}

export interface UserPermissions {
  permissions: Permission[];
  roles: Role[];
  maxLevel: number;
}

export interface PermissionCheck {
  granted: boolean;
  source?: 'role' | 'direct' | 'denied';
  reason?: string;
}

export class PermissionService {
  private pool: Pool;
  private redis?: Redis;
  private cachePrefix = 'rbac:';
  private cacheTTL = 300; // 5 minutes

  constructor(pool: Pool, redis?: Redis) {
    this.pool = pool;
    this.redis = redis;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string, 
    permissionName: string, 
    moduleName?: string
  ): Promise<PermissionCheck> {
    try {
      // Try cache first
      const cacheKey = `${this.cachePrefix}perm:${userId}:${permissionName}:${moduleName || 'global'}`;
      
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Query database
      const result = await this.pool.query(`
        SELECT plataforma_core.user_has_permission($1, $2, $3) as has_permission
      `, [userId, permissionName, moduleName]);

      const granted = result.rows[0]?.has_permission || false;
      
      // Get source of permission for debugging
      let source: 'role' | 'direct' | 'denied' = 'denied';
      if (granted) {
        // Check if from direct permission
        const directCheck = await this.pool.query(`
          SELECT up.granted
          FROM plataforma_core.user_permissions up
          JOIN plataforma_core.permissions p ON up.permission_id = p.id
          WHERE up.user_id = $1 
            AND p.name = $2
            AND up.is_active = true
            AND (up.expires_at IS NULL OR up.expires_at > NOW())
        `, [userId, permissionName]);

        source = directCheck.rows.length > 0 ? 'direct' : 'role';
      }

      const result_obj: PermissionCheck = { granted, source };

      // Cache result
      if (this.redis) {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result_obj));
      }

      return result_obj;
    } catch (error) {
      console.error('Error checking permission:', error);
      return { granted: false, source: 'denied', reason: 'Service error' };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async hasPermissions(
    userId: string, 
    permissions: string[], 
    moduleName?: string
  ): Promise<Record<string, PermissionCheck>> {
    const results: Record<string, PermissionCheck> = {};
    
    // Check permissions in parallel
    const checks = permissions.map(async (permission) => {
      const result = await this.hasPermission(userId, permission, moduleName);
      results[permission] = result;
    });

    await Promise.all(checks);
    return results;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string, moduleName?: string): Promise<UserPermissions> {
    try {
      // Try cache first
      const cacheKey = `${this.cachePrefix}user_perms:${userId}:${moduleName || 'global'}`;
      
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Get permissions
      const permissionsResult = await this.pool.query(`
        SELECT * FROM plataforma_core.get_user_permissions($1, $2)
      `, [userId, moduleName]);

      const permissions: Permission[] = permissionsResult.rows.map(row => ({
        id: '', // Function doesn't return ID, would need separate query
        name: row.permission_name,
        displayName: row.permission_display_name,
        moduleName: row.module_name,
        resource: row.resource,
        action: row.action,
        isSystem: false, // Would need separate query
        isActive: true,
      }));

      // Get user roles
      const rolesResult = await this.pool.query(`
        SELECT r.id, r.name, r.display_name, r.description, r.level, 
               r.is_system, r.is_active, r.metadata
        FROM plataforma_core.user_roles ur
        JOIN plataforma_core.roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
          AND ur.is_active = true
          AND r.is_active = true
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND ($2 IS NULL OR ur.module_name IS NULL OR ur.module_name = $2)
      `, [userId, moduleName]);

      const roles: Role[] = rolesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        level: row.level,
        isSystem: row.is_system,
        isActive: row.is_active,
        metadata: row.metadata,
      }));

      // Get max role level
      const maxLevelResult = await this.pool.query(`
        SELECT plataforma_core.get_user_max_role_level($1, $2) as max_level
      `, [userId, moduleName]);

      const maxLevel = maxLevelResult.rows[0]?.max_level || 0;

      const userPermissions: UserPermissions = { permissions, roles, maxLevel };

      // Cache result
      if (this.redis) {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(userPermissions));
      }

      return userPermissions;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return { permissions: [], roles: [], maxLevel: 0 };
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    roleId: string,
    moduleName?: string,
    assignedBy?: string,
    expiresAt?: Date,
    reason?: string
  ): Promise<string | null> {
    try {
      const result = await this.pool.query(`
        SELECT plataforma_core.assign_user_role($1, $2, $3, $4, $5, $6) as assignment_id
      `, [userId, roleId, moduleName, assignedBy, expiresAt, reason]);

      const assignmentId = result.rows[0]?.assignment_id;

      if (assignmentId) {
        // Invalidate cache
        await this.invalidateUserCache(userId);
      }

      return assignmentId;
    } catch (error) {
      console.error('Error assigning role:', error);
      return null;
    }
  }

  /**
   * Revoke role from user
   */
  async revokeRole(
    userId: string,
    roleId: string,
    moduleName?: string,
    revokedBy?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT plataforma_core.revoke_user_role($1, $2, $3, $4, $5) as revoked
      `, [userId, roleId, moduleName, revokedBy, reason]);

      const revoked = result.rows[0]?.revoked || false;

      if (revoked) {
        // Invalidate cache
        await this.invalidateUserCache(userId);
      }

      return revoked;
    } catch (error) {
      console.error('Error revoking role:', error);
      return false;
    }
  }

  /**
   * Grant direct permission to user
   */
  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy?: string,
    expiresAt?: Date,
    reason?: string
  ): Promise<boolean> {
    try {
      await this.pool.query(`
        INSERT INTO plataforma_core.user_permissions 
        (user_id, permission_id, granted, granted_by, expires_at, reason)
        VALUES ($1, $2, true, $3, $4, $5)
        ON CONFLICT (user_id, permission_id) DO UPDATE SET
          granted = true,
          granted_by = $3,
          expires_at = $4,
          reason = $5,
          granted_at = NOW(),
          is_active = true
      `, [userId, permissionId, grantedBy, expiresAt, reason]);

      // Log audit
      await this.logPermissionChange(
        'permission_granted', 
        grantedBy, 
        userId, 
        permissionId, 
        reason
      );

      // Invalidate cache
      await this.invalidateUserCache(userId);

      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      return false;
    }
  }

  /**
   * Revoke direct permission from user
   */
  async revokePermission(
    userId: string,
    permissionId: string,
    revokedBy?: string,
    reason?: string
  ): Promise<boolean> {
    try {
      await this.pool.query(`
        UPDATE plataforma_core.user_permissions
        SET is_active = false, granted = false
        WHERE user_id = $1 AND permission_id = $2
      `, [userId, permissionId]);

      // Log audit
      await this.logPermissionChange(
        'permission_revoked', 
        revokedBy, 
        userId, 
        permissionId, 
        reason
      );

      // Invalidate cache
      await this.invalidateUserCache(userId);

      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  /**
   * Get all available roles
   */
  async getRoles(includeInactive = false): Promise<Role[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, display_name, description, level, is_system, is_active, metadata
        FROM plataforma_core.roles
        WHERE is_active = true OR $1 = true
        ORDER BY level DESC, name
      `, [includeInactive]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        level: row.level,
        isSystem: row.is_system,
        isActive: row.is_active,
        metadata: row.metadata,
      }));
    } catch (error) {
      console.error('Error getting roles:', error);
      return [];
    }
  }

  /**
   * Get all available permissions
   */
  async getPermissions(moduleName?: string, includeInactive = false): Promise<Permission[]> {
    try {
      const result = await this.pool.query(`
        SELECT id, name, display_name, description, module_name, resource, action, 
               is_system, is_active, metadata
        FROM plataforma_core.permissions
        WHERE (is_active = true OR $2 = true)
          AND ($1 IS NULL OR module_name = $1 OR module_name IS NULL)
        ORDER BY module_name NULLS FIRST, resource, action
      `, [moduleName, includeInactive]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        moduleName: row.module_name,
        resource: row.resource,
        action: row.action,
        isSystem: row.is_system,
        isActive: row.is_active,
        metadata: row.metadata,
      }));
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  }

  /**
   * Create a new role
   */
  async createRole(
    name: string,
    displayName: string,
    description?: string,
    level = 100,
    createdBy?: string
  ): Promise<Role | null> {
    try {
      const result = await this.pool.query(`
        INSERT INTO plataforma_core.roles 
        (name, display_name, description, level, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, display_name, description, level, is_system, is_active, metadata
      `, [name, displayName, description, level, createdBy]);

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        displayName: result.rows[0].display_name,
        description: result.rows[0].description,
        level: result.rows[0].level,
        isSystem: result.rows[0].is_system,
        isActive: result.rows[0].is_active,
        metadata: result.rows[0].metadata,
      };
    } catch (error) {
      console.error('Error creating role:', error);
      return null;
    }
  }

  /**
   * Create a new permission
   */
  async createPermission(
    name: string,
    displayName: string,
    resource: string,
    action: string,
    moduleName?: string,
    description?: string
  ): Promise<Permission | null> {
    try {
      const result = await this.pool.query(`
        INSERT INTO plataforma_core.permissions 
        (name, display_name, description, module_name, resource, action)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, display_name, description, module_name, resource, action, 
                  is_system, is_active, metadata
      `, [name, displayName, description, moduleName, resource, action]);

      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        displayName: result.rows[0].display_name,
        description: result.rows[0].description,
        moduleName: result.rows[0].module_name,
        resource: result.rows[0].resource,
        action: result.rows[0].action,
        isSystem: result.rows[0].is_system,
        isActive: result.rows[0].is_active,
        metadata: result.rows[0].metadata,
      };
    } catch (error) {
      console.error('Error creating permission:', error);
      return null;
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    grantedBy?: string
  ): Promise<boolean> {
    try {
      await this.pool.query(`
        INSERT INTO plataforma_core.role_permissions (role_id, permission_id, granted_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (role_id, permission_id) DO UPDATE SET
          is_active = true, granted_at = NOW(), granted_by = $3
      `, [roleId, permissionId, grantedBy]);

      // Invalidate all user caches (since role permissions changed)
      if (this.redis) {
        const pattern = `${this.cachePrefix}user_perms:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      return true;
    } catch (error) {
      console.error('Error assigning permission to role:', error);
      return false;
    }
  }

  /**
   * Revoke permission from role
   */
  async revokePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<boolean> {
    try {
      await this.pool.query(`
        UPDATE plataforma_core.role_permissions
        SET is_active = false
        WHERE role_id = $1 AND permission_id = $2
      `, [roleId, permissionId]);

      // Invalidate all user caches
      if (this.redis) {
        const pattern = `${this.cachePrefix}user_perms:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      return true;
    } catch (error) {
      console.error('Error revoking permission from role:', error);
      return false;
    }
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const result = await this.pool.query(`
        SELECT p.id, p.name, p.display_name, p.description, p.module_name, 
               p.resource, p.action, p.is_system, p.is_active, p.metadata
        FROM plataforma_core.role_permissions rp
        JOIN plataforma_core.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND rp.is_active = true AND p.is_active = true
        ORDER BY p.module_name NULLS FIRST, p.resource, p.action
      `, [roleId]);

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        moduleName: row.module_name,
        resource: row.resource,
        action: row.action,
        isSystem: row.is_system,
        isActive: row.is_active,
        metadata: row.metadata,
      }));
    } catch (error) {
      console.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Get permission audit log
   */
  async getPermissionAudit(
    userId?: string,
    limit = 100,
    offset = 0
  ): Promise<any[]> {
    try {
      const result = await this.pool.query(`
        SELECT pa.*, 
               u.name as user_name, u.email as user_email,
               tu.name as target_user_name, tu.email as target_user_email,
               r.name as role_name, r.display_name as role_display_name,
               p.name as permission_name, p.display_name as permission_display_name
        FROM plataforma_core.permission_audit pa
        LEFT JOIN plataforma_core.users u ON pa.user_id = u.id
        LEFT JOIN plataforma_core.users tu ON pa.target_user_id = tu.id
        LEFT JOIN plataforma_core.roles r ON pa.role_id = r.id
        LEFT JOIN plataforma_core.permissions p ON pa.permission_id = p.id
        WHERE ($1 IS NULL OR pa.target_user_id = $1)
        ORDER BY pa.performed_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      console.error('Error getting permission audit:', error);
      return [];
    }
  }

  /**
   * Invalidate user cache
   */
  private async invalidateUserCache(userId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const patterns = [
        `${this.cachePrefix}perm:${userId}:*`,
        `${this.cachePrefix}user_perms:${userId}:*`
      ];

      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  /**
   * Log permission change for audit
   */
  private async logPermissionChange(
    action: string,
    performedBy?: string,
    targetUserId?: string,
    permissionId?: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO plataforma_core.permission_audit 
        (action, user_id, target_user_id, permission_id, reason)
        VALUES ($1, $2, $3, $4, $5)
      `, [action, performedBy, targetUserId, permissionId, reason]);
    } catch (error) {
      console.error('Error logging permission change:', error);
    }
  }

  /**
   * Check if user can manage target user (based on role hierarchy)
   */
  async canManageUser(managerId: string, targetUserId: string): Promise<boolean> {
    try {
      const [managerPerms, targetPerms] = await Promise.all([
        this.getUserPermissions(managerId),
        this.getUserPermissions(targetUserId)
      ]);

      // Super admin can manage anyone
      if (managerPerms.roles.some(r => r.name === 'super_admin')) {
        return true;
      }

      // Manager level must be higher than target
      return managerPerms.maxLevel > targetPerms.maxLevel;
    } catch (error) {
      console.error('Error checking user management permission:', error);
      return false;
    }
  }
}