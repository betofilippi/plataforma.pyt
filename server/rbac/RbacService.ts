/**
 * RBAC Service - Core business logic for Role-Based Access Control
 * Handles permissions, roles, and user management with enterprise features
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { 
  User, 
  UserWithRoles, 
  Role, 
  RoleWithPermissions,
  Permission, 
  Organization,
  UserFilters,
  CreateUserRequest,
  UpdateUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  UserPermission,
  AuditLog,
  AuditAction,
  UserStats,
  SecurityStats,
  PaginatedResponse
} from '../../types/rbac';

export class RbacService {
  constructor(private pool: Pool) {}

  // =====================================================================
  // USER MANAGEMENT
  // =====================================================================

  /**
   * Get user by ID with roles and permissions
   */
  async getUserById(userId: string): Promise<UserWithRoles | null> {
    const userQuery = `
      SELECT 
        u.*,
        org.name as organization_name,
        org.display_name as organization_display_name,
        manager.name as manager_name
      FROM plataforma_rbac.users u
      JOIN plataforma_rbac.organizations org ON org.id = u.organization_id
      LEFT JOIN plataforma_rbac.users manager ON manager.id = u.manager_id
      WHERE u.id = $1 AND u.is_active = true
    `;
    
    const userResult = await this.pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) return null;

    const user = userResult.rows[0];
    
    // Get user roles
    const roles = await this.getUserRoles(userId);
    
    // Get user permissions
    const permissions = await this.getUserPermissions(userId);
    
    // Get effective permissions list
    const effectivePermissions = await this.getUserEffectivePermissions(userId);

    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.email_verified_at,
      name: user.name,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      department: user.department,
      jobTitle: user.job_title,
      managerId: user.manager_id,
      organizationId: user.organization_id,
      isActive: user.is_active,
      isLocked: user.is_locked,
      lockReason: user.lock_reason,
      mustChangePassword: user.must_change_password,
      failedLoginAttempts: user.failed_login_attempts,
      lastLoginAt: user.last_login_at,
      lastLoginIp: user.last_login_ip,
      lastPasswordChangeAt: user.last_password_change_at,
      mfaEnabled: user.mfa_enabled,
      timezone: user.timezone,
      language: user.language,
      theme: user.theme,
      preferences: user.preferences,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      createdBy: user.created_by,
      updatedBy: user.updated_by,
      roles,
      manager: user.manager_name ? {
        id: user.manager_id,
        name: user.manager_name,
        email: '', // Would need separate query for full manager data
        organizationId: user.organization_id,
        isActive: true,
        createdAt: ''
      } as User : undefined,
      permissions,
      effectivePermissions
    };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string, organizationId?: string): Promise<UserWithRoles | null> {
    let query = `
      SELECT u.* FROM plataforma_rbac.users u 
      WHERE u.email = $1 AND u.is_active = true
    `;
    const params: any[] = [email];
    
    if (organizationId) {
      query += ' AND u.organization_id = $2';
      params.push(organizationId);
    }
    
    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) return null;
    
    return this.getUserById(result.rows[0].id);
  }

  /**
   * Get paginated users list with filters
   */
  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<UserWithRoles>> {
    const {
      page = 1,
      limit = 50,
      search,
      role,
      department,
      isActive,
      isLocked,
      organizationId,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (organizationId) {
      whereClause += ` AND u.organization_id = $${paramIndex}`;
      params.push(organizationId);
      paramIndex++;
    }

    if (typeof isActive === 'boolean') {
      whereClause += ` AND u.is_active = $${paramIndex}`;
      params.push(isActive);
      paramIndex++;
    }

    if (typeof isLocked === 'boolean') {
      whereClause += ` AND u.is_locked = $${paramIndex}`;
      params.push(isLocked);
      paramIndex++;
    }

    if (department) {
      whereClause += ` AND u.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM plataforma_rbac.user_roles ur 
        JOIN plataforma_rbac.roles r ON r.id = ur.role_id 
        WHERE ur.user_id = u.id AND r.name = $${paramIndex}
      )`;
      params.push(role);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM plataforma_rbac.users u 
      ${whereClause}
    `;
    const countResult = await this.pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get users
    const usersQuery = `
      SELECT u.*, org.display_name as organization_name
      FROM plataforma_rbac.users u
      JOIN plataforma_rbac.organizations org ON org.id = u.organization_id
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const usersResult = await this.pool.query(usersQuery, params);
    
    // Enhance users with roles and permissions
    const users = await Promise.all(
      usersResult.rows.map(async (user) => {
        const roles = await this.getUserRoles(user.id);
        const permissions = await this.getUserPermissions(user.id);
        const effectivePermissions = await this.getUserEffectivePermissions(user.id);
        
        return {
          ...user,
          roles,
          permissions,
          effectivePermissions
        } as UserWithRoles;
      })
    );

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Create new user
   */
  async createUser(data: CreateUserRequest, createdBy?: string): Promise<UserWithRoles> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Hash password if provided
      let passwordHash: string | undefined;
      if (data.password) {
        passwordHash = await bcrypt.hash(data.password, 12);
      }

      // Get organization (use default if not specified)
      const orgQuery = `
        SELECT id FROM plataforma_rbac.organizations 
        WHERE name = 'plataforma' 
        LIMIT 1
      `;
      const orgResult = await client.query(orgQuery);
      const organizationId = orgResult.rows[0]?.id;

      if (!organizationId) {
        throw new Error('Default organization not found');
      }

      // Create user
      const userQuery = `
        INSERT INTO plataforma_rbac.users (
          email, name, first_name, last_name, phone, department, 
          job_title, manager_id, organization_id, password_hash,
          must_change_password, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const userResult = await client.query(userQuery, [
        data.email,
        data.name,
        data.firstName,
        data.lastName,
        data.phone,
        data.department,
        data.jobTitle,
        data.managerId,
        organizationId,
        passwordHash,
        data.mustChangePassword || false,
        createdBy
      ]);

      const user = userResult.rows[0];

      // Assign roles if provided
      if (data.roleIds?.length) {
        for (const roleId of data.roleIds) {
          await client.query(`
            INSERT INTO plataforma_rbac.user_roles (user_id, role_id, assigned_by)
            VALUES ($1, $2, $3)
          `, [user.id, roleId, createdBy]);
        }
      }

      // Log audit trail
      await this.logAudit(
        AuditAction.USER_CREATED,
        'user',
        user.id,
        null,
        { email: user.email, name: user.name },
        createdBy,
        client
      );

      await client.query('COMMIT');
      
      return this.getUserById(user.id) as Promise<UserWithRoles>;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserRequest, updatedBy?: string): Promise<UserWithRoles> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current user for audit
      const currentUser = await this.getUserById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbField = this.camelToSnake(key);
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_by and updated_at
      updateFields.push(`updated_by = $${paramIndex}`, `updated_at = NOW()`);
      params.push(updatedBy);
      paramIndex++;

      // Add user ID for WHERE clause
      params.push(userId);

      const updateQuery = `
        UPDATE plataforma_rbac.users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, params);
      const updatedUser = result.rows[0];

      // Log audit trail
      await this.logAudit(
        AuditAction.USER_UPDATED,
        'user',
        userId,
        this.extractAuditFields(currentUser),
        this.extractAuditFields(updatedUser),
        updatedBy,
        client
      );

      await client.query('COMMIT');
      
      return this.getUserById(userId) as Promise<UserWithRoles>;
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================================
  // ROLE MANAGEMENT
  // =====================================================================

  /**
   * Get all roles for organization
   */
  async getRoles(organizationId?: string): Promise<RoleWithPermissions[]> {
    let query = `
      SELECT r.*, 
        COUNT(ur.user_id) as user_count,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as permission_names
      FROM plataforma_rbac.roles r
      LEFT JOIN plataforma_rbac.user_roles ur ON ur.role_id = r.id AND ur.is_active = true
      LEFT JOIN plataforma_rbac.role_permissions rp ON rp.role_id = r.id
      LEFT JOIN plataforma_rbac.permissions p ON p.id = rp.permission_id
      WHERE r.is_active = true
    `;
    
    const params: any[] = [];
    
    if (organizationId) {
      query += ' AND r.organization_id = $1';
      params.push(organizationId);
    }
    
    query += `
      GROUP BY r.id, r.name, r.display_name, r.description, r.level, 
               r.parent_id, r.organization_id, r.is_system_role, 
               r.is_active, r.color, r.icon, r.created_at, r.updated_at
      ORDER BY r.level ASC, r.name ASC
    `;

    const result = await this.pool.query(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      level: row.level,
      parentId: row.parent_id,
      organizationId: row.organization_id,
      isSystemRole: row.is_system_role,
      isActive: row.is_active,
      color: row.color,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      permissions: [], // Would need separate query for full permission objects
      userCount: parseInt(row.user_count),
      children: [] // Would need recursive query for hierarchy
    }));
  }

  /**
   * Create new role
   */
  async createRole(data: CreateRoleRequest, organizationId: string, createdBy?: string): Promise<Role> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO plataforma_rbac.roles (
          name, display_name, description, level, parent_id, 
          organization_id, color, icon, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        data.name,
        data.displayName,
        data.description,
        data.level || 99,
        data.parentId,
        organizationId,
        data.color || '#6366f1',
        data.icon,
        createdBy
      ]);

      const role = result.rows[0];

      // Log audit trail
      await this.logAudit(
        'role.created' as AuditAction,
        'role',
        role.id,
        null,
        { name: role.name, displayName: role.display_name },
        createdBy,
        client
      );

      await client.query('COMMIT');
      
      return {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        level: role.level,
        parentId: role.parent_id,
        organizationId: role.organization_id,
        isSystemRole: role.is_system_role,
        isActive: role.is_active,
        color: role.color,
        icon: role.icon,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
        createdBy: role.created_by,
        updatedBy: role.updated_by
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================================
  // PERMISSION MANAGEMENT
  // =====================================================================

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    const query = `
      SELECT plataforma_rbac.user_has_permission($1, $2) as has_permission
    `;
    
    const result = await this.pool.query(query, [userId, permissionName]);
    return result.rows[0]?.has_permission || false;
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const query = `
      SELECT r.*
      FROM plataforma_rbac.roles r
      JOIN plataforma_rbac.user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1 
        AND ur.is_active = true 
        AND r.is_active = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ORDER BY r.level ASC
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      level: row.level,
      parentId: row.parent_id,
      organizationId: row.organization_id,
      isSystemRole: row.is_system_role,
      isActive: row.is_active,
      color: row.color,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by
    }));
  }

  /**
   * Get user's direct permissions
   */
  async getUserPermissions(userId: string): Promise<UserPermission[]> {
    const query = `
      SELECT up.*, p.name as permission_name, p.display_name as permission_display_name
      FROM plataforma_rbac.user_permissions up
      JOIN plataforma_rbac.permissions p ON p.id = up.permission_id
      WHERE up.user_id = $1
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
      ORDER BY p.name
    `;
    
    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      permissionId: row.permission_id,
      granted: row.granted,
      grantedAt: row.granted_at,
      grantedBy: row.granted_by,
      expiresAt: row.expires_at,
      reason: row.reason
    }));
  }

  /**
   * Get user's effective permissions (combined from roles and direct)
   */
  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const query = `
      SELECT permission_name, granted 
      FROM plataforma_rbac.get_user_permissions($1)
      WHERE granted = true
      ORDER BY permission_name
    `;
    
    const result = await this.pool.query(query, [userId]);
    return result.rows.map(row => row.permission_name);
  }

  /**
   * Assign role to user
   */
  async assignRole(data: AssignRoleRequest, assignedBy?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if assignment already exists
      const existingQuery = `
        SELECT id FROM plataforma_rbac.user_roles 
        WHERE user_id = $1 AND role_id = $2
      `;
      const existing = await client.query(existingQuery, [data.userId, data.roleId]);
      
      if (existing.rows.length > 0) {
        // Update existing assignment
        await client.query(`
          UPDATE plataforma_rbac.user_roles 
          SET is_active = true, expires_at = $3, assigned_by = $4, assigned_at = NOW()
          WHERE user_id = $1 AND role_id = $2
        `, [data.userId, data.roleId, data.expiresAt, assignedBy]);
      } else {
        // Create new assignment
        await client.query(`
          INSERT INTO plataforma_rbac.user_roles (user_id, role_id, expires_at, assigned_by)
          VALUES ($1, $2, $3, $4)
        `, [data.userId, data.roleId, data.expiresAt, assignedBy]);
      }

      // Log audit trail
      await this.logAudit(
        AuditAction.ROLE_ASSIGNED,
        'user_role',
        data.userId,
        null,
        { roleId: data.roleId, expiresAt: data.expiresAt },
        assignedBy,
        client
      );

      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================================
  // STATISTICS
  // =====================================================================

  /**
   * Get user statistics
   */
  async getUserStats(organizationId?: string): Promise<UserStats> {
    let whereClause = '';
    const params: any[] = [];
    
    if (organizationId) {
      whereClause = 'WHERE organization_id = $1';
      params.push(organizationId);
    }

    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_locked = true) as locked_users,
        COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as recent_logins,
        COUNT(*) FILTER (WHERE mfa_enabled = true) as users_with_mfa
      FROM plataforma_rbac.users
      ${whereClause}
    `;
    
    const result = await this.pool.query(query, params);
    const row = result.rows[0];
    
    return {
      totalUsers: parseInt(row.total_users),
      activeUsers: parseInt(row.active_users),
      lockedUsers: parseInt(row.locked_users),
      recentLogins: parseInt(row.recent_logins),
      usersWithMfa: parseInt(row.users_with_mfa)
    };
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Extract relevant fields for audit logging
   */
  private extractAuditFields(obj: any): Record<string, any> {
    const auditFields = ['name', 'email', 'isActive', 'isLocked', 'department', 'jobTitle'];
    const result: Record<string, any> = {};
    
    auditFields.forEach(field => {
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    });
    
    return result;
  }

  /**
   * Log audit trail
   */
  private async logAudit(
    action: AuditAction,
    resourceType: string,
    resourceId: string,
    oldValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    userId?: string,
    client?: any
  ): Promise<void> {
    const db = client || this.pool;
    
    await db.query(`
      INSERT INTO plataforma_rbac.audit_log (
        user_id, action, resource_type, resource_id, old_values, new_values
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, action, resourceType, resourceId, oldValues, newValues]);
  }
}