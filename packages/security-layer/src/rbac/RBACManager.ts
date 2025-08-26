import { 
  RBACConfig, 
  Role, 
  Permission, 
  RolePermission, 
  PermissionCondition, 
  SecurityContext,
  AuthorizationError 
} from '../types/index.js';

export class RBACManager {
  private config: RBACConfig;
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map(); // roleId -> Set<permissionId>
  private userRoles: Map<string, Set<string>> = new Map(); // userId -> Set<roleId>
  private roleHierarchy: Map<string, Set<string>> = new Map(); // roleId -> Set<inheritedRoleIds>

  constructor(config: RBACConfig) {
    this.config = config;
    this.initializeDefaults();
    this.buildRoleHierarchy();
  }

  /**
   * Initialize default roles and permissions
   */
  private initializeDefaults(): void {
    // Load roles
    this.config.roles.forEach(role => {
      this.roles.set(role.id, role);
    });

    // Load permissions
    this.config.permissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });

    // Load role-permission mappings
    this.config.rolePermissions.forEach(rp => {
      if (!this.rolePermissions.has(rp.roleId)) {
        this.rolePermissions.set(rp.roleId, new Set());
      }
      
      if (rp.granted) {
        this.rolePermissions.get(rp.roleId)!.add(rp.permissionId);
      }
    });
  }

  /**
   * Build role hierarchy for inheritance
   */
  private buildRoleHierarchy(): void {
    this.roles.forEach(role => {
      if (role.inheritsFrom && role.inheritsFrom.length > 0) {
        const inheritedRoles = new Set<string>();
        this.collectInheritedRoles(role.inheritsFrom, inheritedRoles);
        this.roleHierarchy.set(role.id, inheritedRoles);
      }
    });
  }

  /**
   * Recursively collect all inherited roles
   */
  private collectInheritedRoles(parentRoles: string[], collected: Set<string>): void {
    parentRoles.forEach(parentRoleId => {
      if (!collected.has(parentRoleId)) {
        collected.add(parentRoleId);
        
        const parentRole = this.roles.get(parentRoleId);
        if (parentRole && parentRole.inheritsFrom) {
          this.collectInheritedRoles(parentRole.inheritsFrom, collected);
        }
      }
    });
  }

  /**
   * Create a new role
   */
  public createRole(role: Omit<Role, 'id'>): Role {
    const newRole: Role = {
      ...role,
      id: this.generateId('role')
    };

    this.roles.set(newRole.id, newRole);
    
    // Update hierarchy if role has inheritance
    if (newRole.inheritsFrom && newRole.inheritsFrom.length > 0) {
      const inheritedRoles = new Set<string>();
      this.collectInheritedRoles(newRole.inheritsFrom, inheritedRoles);
      this.roleHierarchy.set(newRole.id, inheritedRoles);
    }

    return newRole;
  }

  /**
   * Update an existing role
   */
  public updateRole(roleId: string, updates: Partial<Role>): Role | null {
    const existingRole = this.roles.get(roleId);
    if (!existingRole) return null;

    const updatedRole = { ...existingRole, ...updates, id: roleId };
    this.roles.set(roleId, updatedRole);

    // Rebuild hierarchy if inheritance changed
    if (updates.inheritsFrom) {
      const inheritedRoles = new Set<string>();
      this.collectInheritedRoles(updates.inheritsFrom, inheritedRoles);
      this.roleHierarchy.set(roleId, inheritedRoles);
    }

    return updatedRole;
  }

  /**
   * Delete a role
   */
  public deleteRole(roleId: string): boolean {
    if (!this.roles.has(roleId)) return false;

    // Check if role is a system role
    const role = this.roles.get(roleId)!;
    if (role.isSystemRole) {
      throw new Error('Cannot delete system role');
    }

    // Remove role
    this.roles.delete(roleId);
    this.roleHierarchy.delete(roleId);
    this.rolePermissions.delete(roleId);

    // Remove role from all users
    this.userRoles.forEach((userRoles, userId) => {
      userRoles.delete(roleId);
    });

    return true;
  }

  /**
   * Create a new permission
   */
  public createPermission(permission: Omit<Permission, 'id'>): Permission {
    const newPermission: Permission = {
      ...permission,
      id: this.generateId('perm')
    };

    this.permissions.set(newPermission.id, newPermission);
    return newPermission;
  }

  /**
   * Update an existing permission
   */
  public updatePermission(permissionId: string, updates: Partial<Permission>): Permission | null {
    const existingPermission = this.permissions.get(permissionId);
    if (!existingPermission) return null;

    const updatedPermission = { ...existingPermission, ...updates, id: permissionId };
    this.permissions.set(permissionId, updatedPermission);
    return updatedPermission;
  }

  /**
   * Delete a permission
   */
  public deletePermission(permissionId: string): boolean {
    if (!this.permissions.has(permissionId)) return false;

    // Remove permission
    this.permissions.delete(permissionId);

    // Remove permission from all roles
    this.rolePermissions.forEach((permissions) => {
      permissions.delete(permissionId);
    });

    return true;
  }

  /**
   * Assign permission to role
   */
  public assignPermissionToRole(roleId: string, permissionId: string, conditions?: PermissionCondition[]): boolean {
    if (!this.roles.has(roleId) || !this.permissions.has(permissionId)) {
      return false;
    }

    if (!this.rolePermissions.has(roleId)) {
      this.rolePermissions.set(roleId, new Set());
    }

    this.rolePermissions.get(roleId)!.add(permissionId);

    // Store conditions if provided (would need separate storage)
    if (conditions && conditions.length > 0) {
      // In a real implementation, store conditions in a separate structure
      console.log(`Conditions for ${roleId}-${permissionId}:`, conditions);
    }

    return true;
  }

  /**
   * Remove permission from role
   */
  public removePermissionFromRole(roleId: string, permissionId: string): boolean {
    const rolePermissions = this.rolePermissions.get(roleId);
    if (!rolePermissions) return false;

    return rolePermissions.delete(permissionId);
  }

  /**
   * Assign role to user
   */
  public assignRoleToUser(userId: string, roleId: string): boolean {
    if (!this.roles.has(roleId)) return false;

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    this.userRoles.get(userId)!.add(roleId);
    return true;
  }

  /**
   * Remove role from user
   */
  public removeRoleFromUser(userId: string, roleId: string): boolean {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) return false;

    return userRoles.delete(roleId);
  }

  /**
   * Get all roles for a user (including inherited)
   */
  public getUserRoles(userId: string): Role[] {
    const userRoleIds = this.userRoles.get(userId) || new Set();
    const allRoleIds = new Set(userRoleIds);

    // Add inherited roles
    userRoleIds.forEach(roleId => {
      const inheritedRoles = this.roleHierarchy.get(roleId);
      if (inheritedRoles) {
        inheritedRoles.forEach(inheritedRoleId => allRoleIds.add(inheritedRoleId));
      }
    });

    return Array.from(allRoleIds)
      .map(roleId => this.roles.get(roleId))
      .filter((role): role is Role => role !== undefined);
  }

  /**
   * Get all permissions for a user
   */
  public getUserPermissions(userId: string): Permission[] {
    const userRoles = this.getUserRoles(userId);
    const permissionIds = new Set<string>();

    userRoles.forEach(role => {
      const rolePermissionIds = this.rolePermissions.get(role.id);
      if (rolePermissionIds) {
        rolePermissionIds.forEach(permId => permissionIds.add(permId));
      }
    });

    return Array.from(permissionIds)
      .map(permId => this.permissions.get(permId))
      .filter((perm): perm is Permission => perm !== undefined);
  }

  /**
   * Check if user has a specific permission
   */
  public hasPermission(
    userId: string, 
    resource: string, 
    action: string,
    context?: Record<string, any>
  ): boolean {
    const userPermissions = this.getUserPermissions(userId);
    
    return userPermissions.some(permission => {
      // Check basic permission match
      const matches = permission.resource === resource && permission.action === action;
      
      if (!matches) return false;

      // Check conditions if provided
      if (permission.conditions && permission.conditions.length > 0 && context) {
        return this.evaluateConditions(permission.conditions, context);
      }

      return true;
    });
  }

  /**
   * Check if user has a specific role
   */
  public hasRole(userId: string, roleId: string): boolean {
    const userRoles = this.getUserRoles(userId);
    return userRoles.some(role => role.id === roleId);
  }

  /**
   * Check if user has any of the specified roles
   */
  public hasAnyRole(userId: string, roleIds: string[]): boolean {
    return roleIds.some(roleId => this.hasRole(userId, roleId));
  }

  /**
   * Check if user has all specified roles
   */
  public hasAllRoles(userId: string, roleIds: string[]): boolean {
    return roleIds.every(roleId => this.hasRole(userId, roleId));
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(conditions: PermissionCondition[], context: Record<string, any>): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      
      switch (condition.operator) {
        case 'eq':
          return contextValue === condition.value;
        case 'ne':
          return contextValue !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'nin':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        case 'gt':
          return contextValue > condition.value;
        case 'lt':
          return contextValue < condition.value;
        case 'gte':
          return contextValue >= condition.value;
        case 'lte':
          return contextValue <= condition.value;
        case 'contains':
          return typeof contextValue === 'string' && contextValue.includes(condition.value);
        case 'startsWith':
          return typeof contextValue === 'string' && contextValue.startsWith(condition.value);
        case 'endsWith':
          return typeof contextValue === 'string' && contextValue.endsWith(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * Express middleware for role-based authorization
   */
  public requireRole(roleIds: string | string[], options: { 
    requireAll?: boolean; 
    userIdExtractor?: (req: any) => string;
  } = {}) {
    return (req: any, res: any, next: any) => {
      const userId = options.userIdExtractor ? 
        options.userIdExtractor(req) : 
        req.user?.id;

      if (!userId) {
        return next(new AuthorizationError('User not authenticated'));
      }

      const requiredRoles = Array.isArray(roleIds) ? roleIds : [roleIds];
      const hasRequiredRoles = options.requireAll ? 
        this.hasAllRoles(userId, requiredRoles) :
        this.hasAnyRole(userId, requiredRoles);

      if (!hasRequiredRoles) {
        return next(new AuthorizationError('Insufficient role permissions'));
      }

      next();
    };
  }

  /**
   * Express middleware for permission-based authorization
   */
  public requirePermission(
    resource: string, 
    action: string,
    options: {
      userIdExtractor?: (req: any) => string;
      contextExtractor?: (req: any) => Record<string, any>;
    } = {}
  ) {
    return (req: any, res: any, next: any) => {
      const userId = options.userIdExtractor ? 
        options.userIdExtractor(req) : 
        req.user?.id;

      if (!userId) {
        return next(new AuthorizationError('User not authenticated'));
      }

      const context = options.contextExtractor ? options.contextExtractor(req) : {};
      
      if (!this.hasPermission(userId, resource, action, context)) {
        return next(new AuthorizationError(`Permission denied for ${action} on ${resource}`));
      }

      next();
    };
  }

  /**
   * Get role by ID
   */
  public getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get permission by ID
   */
  public getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * Get all roles
   */
  public getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get all permissions
   */
  public getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get permissions for a role
   */
  public getRolePermissions(roleId: string): Permission[] {
    const permissionIds = this.rolePermissions.get(roleId) || new Set();
    return Array.from(permissionIds)
      .map(permId => this.permissions.get(permId))
      .filter((perm): perm is Permission => perm !== undefined);
  }

  /**
   * Search roles by criteria
   */
  public searchRoles(criteria: {
    name?: string;
    resource?: string;
    isSystemRole?: boolean;
  }): Role[] {
    return Array.from(this.roles.values()).filter(role => {
      if (criteria.name && !role.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.isSystemRole !== undefined && role.isSystemRole !== criteria.isSystemRole) {
        return false;
      }
      return true;
    });
  }

  /**
   * Search permissions by criteria
   */
  public searchPermissions(criteria: {
    name?: string;
    resource?: string;
    action?: string;
  }): Permission[] {
    return Array.from(this.permissions.values()).filter(permission => {
      if (criteria.name && !permission.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.resource && permission.resource !== criteria.resource) {
        return false;
      }
      if (criteria.action && permission.action !== criteria.action) {
        return false;
      }
      return true;
    });
  }

  /**
   * Export RBAC configuration
   */
  public exportConfig(): RBACConfig {
    const rolePermissions: RolePermission[] = [];
    
    this.rolePermissions.forEach((permissions, roleId) => {
      permissions.forEach(permissionId => {
        rolePermissions.push({
          roleId,
          permissionId,
          granted: true
        });
      });
    });

    return {
      enabled: this.config.enabled,
      defaultRole: this.config.defaultRole,
      superAdminRole: this.config.superAdminRole,
      roles: Array.from(this.roles.values()),
      permissions: Array.from(this.permissions.values()),
      rolePermissions
    };
  }

  /**
   * Import RBAC configuration
   */
  public importConfig(config: RBACConfig): void {
    this.config = config;
    this.roles.clear();
    this.permissions.clear();
    this.rolePermissions.clear();
    this.roleHierarchy.clear();

    this.initializeDefaults();
    this.buildRoleHierarchy();
  }

  /**
   * Generate unique ID for roles/permissions
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate role hierarchy (check for circular dependencies)
   */
  public validateRoleHierarchy(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (roleId: string): boolean => {
      if (recursionStack.has(roleId)) {
        errors.push(`Circular dependency detected involving role: ${roleId}`);
        return true;
      }

      if (visited.has(roleId)) {
        return false;
      }

      visited.add(roleId);
      recursionStack.add(roleId);

      const role = this.roles.get(roleId);
      if (role && role.inheritsFrom) {
        for (const parentRoleId of role.inheritsFrom) {
          if (detectCycle(parentRoleId)) {
            return true;
          }
        }
      }

      recursionStack.delete(roleId);
      return false;
    };

    // Check each role for circular dependencies
    this.roles.forEach((_, roleId) => {
      detectCycle(roleId);
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get RBAC statistics
   */
  public getStatistics(): {
    totalRoles: number;
    totalPermissions: number;
    totalUsers: number;
    systemRoles: number;
    customRoles: number;
  } {
    const systemRoles = Array.from(this.roles.values()).filter(r => r.isSystemRole).length;
    
    return {
      totalRoles: this.roles.size,
      totalPermissions: this.permissions.size,
      totalUsers: this.userRoles.size,
      systemRoles,
      customRoles: this.roles.size - systemRoles
    };
  }
}