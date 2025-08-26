import { Pool } from 'pg';
import { Permission, Role } from './PermissionService';

export interface ModulePermissionDefinition {
  name: string;
  displayName: string;
  description?: string;
  resource: string;
  action: string;
  isRequired?: boolean; // If true, this permission should always exist for the module
}

export interface ModuleRoleDefinition {
  name: string;
  displayName: string;
  description?: string;
  level: number;
  permissions: string[]; // Permission names this role should have
  isRequired?: boolean;
}

export interface ModulePermissionConfig {
  moduleName: string;
  displayName: string;
  description?: string;
  version: string;
  permissions: ModulePermissionDefinition[];
  roles: ModuleRoleDefinition[];
  defaultUserRole?: string; // Default role for new users in this module
  adminRole?: string; // Admin role for this module
}

export class ModulePermissionManager {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Register or update permissions for a module
   */
  async registerModule(config: ModulePermissionConfig): Promise<void> {
    console.log(`Registering permissions for module: ${config.moduleName}`);

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Register the module if not exists
      await client.query(`
        INSERT INTO plataforma_core.modules (name, display_name, description, version)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          display_name = $2,
          description = $3,
          version = $4,
          updated_at = NOW()
      `, [config.moduleName, config.displayName, config.description, config.version]);

      // 2. Register permissions
      for (const permissionDef of config.permissions) {
        const fullPermissionName = `${config.moduleName}.${permissionDef.name}`;
        
        await client.query(`
          INSERT INTO plataforma_core.permissions (
            name, display_name, description, module_name, resource, action, is_system
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (name) DO UPDATE SET
            display_name = $2,
            description = $3,
            resource = $5,
            action = $6,
            updated_at = NOW()
        `, [
          fullPermissionName,
          permissionDef.displayName,
          permissionDef.description,
          config.moduleName,
          permissionDef.resource,
          permissionDef.action,
          permissionDef.isRequired || false
        ]);
      }

      // 3. Register module-specific roles
      for (const roleDef of config.roles) {
        const fullRoleName = `${config.moduleName}_${roleDef.name}`;
        
        // Insert role
        const roleResult = await client.query(`
          INSERT INTO plataforma_core.roles (
            name, display_name, description, level, is_system
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            display_name = $2,
            description = $3,
            level = $4,
            updated_at = NOW()
          RETURNING id
        `, [
          fullRoleName,
          roleDef.displayName,
          roleDef.description,
          roleDef.level,
          roleDef.isRequired || false
        ]);

        const roleId = roleResult.rows[0].id;

        // Assign permissions to role
        for (const permissionName of roleDef.permissions) {
          const fullPermissionName = permissionName.includes('.') 
            ? permissionName // Already full name
            : `${config.moduleName}.${permissionName}`; // Add module prefix

          await client.query(`
            INSERT INTO plataforma_core.role_permissions (role_id, permission_id)
            SELECT $1, p.id
            FROM plataforma_core.permissions p
            WHERE p.name = $2
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              is_active = true
          `, [roleId, fullPermissionName]);
        }
      }

      await client.query('COMMIT');
      console.log(`Successfully registered module: ${config.moduleName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error registering module ${config.moduleName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Unregister a module and its permissions
   */
  async unregisterModule(moduleName: string, removeData = false): Promise<void> {
    console.log(`Unregistering module: ${moduleName}`);

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      if (removeData) {
        // Remove all user roles for this module
        await client.query(`
          DELETE FROM plataforma_core.user_roles
          WHERE module_name = $1
        `, [moduleName]);

        // Deactivate role-permissions for module-specific roles
        await client.query(`
          UPDATE plataforma_core.role_permissions
          SET is_active = false
          WHERE role_id IN (
            SELECT id FROM plataforma_core.roles 
            WHERE name LIKE $1 OR name LIKE $2
          )
        `, [`${moduleName}_%`, `%_${moduleName}`]);

        // Deactivate module-specific roles
        await client.query(`
          UPDATE plataforma_core.roles
          SET is_active = false
          WHERE name LIKE $1 OR name LIKE $2
        `, [`${moduleName}_%`, `%_${moduleName}`]);

        // Deactivate module permissions
        await client.query(`
          UPDATE plataforma_core.permissions
          SET is_active = false
          WHERE module_name = $1
        `, [moduleName]);
      }

      // Update module status
      await client.query(`
        UPDATE plataforma_core.modules
        SET status = 'inactive', updated_at = NOW()
        WHERE name = $1
      `, [moduleName]);

      await client.query('COMMIT');
      console.log(`Successfully unregistered module: ${moduleName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error unregistering module ${moduleName}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get module permissions configuration
   */
  async getModuleConfig(moduleName: string): Promise<ModulePermissionConfig | null> {
    try {
      // Get module info
      const moduleResult = await this.pool.query(`
        SELECT name, display_name, description, version
        FROM plataforma_core.modules
        WHERE name = $1
      `, [moduleName]);

      if (moduleResult.rows.length === 0) {
        return null;
      }

      const module = moduleResult.rows[0];

      // Get permissions
      const permissionsResult = await this.pool.query(`
        SELECT name, display_name, description, resource, action, is_system
        FROM plataforma_core.permissions
        WHERE module_name = $1 AND is_active = true
        ORDER BY name
      `, [moduleName]);

      const permissions: ModulePermissionDefinition[] = permissionsResult.rows.map(row => ({
        name: row.name.replace(`${moduleName}.`, ''), // Remove module prefix
        displayName: row.display_name,
        description: row.description,
        resource: row.resource,
        action: row.action,
        isRequired: row.is_system
      }));

      // Get module-specific roles
      const rolesResult = await this.pool.query(`
        SELECT r.name, r.display_name, r.description, r.level, r.is_system,
               array_agg(p.name) as permission_names
        FROM plataforma_core.roles r
        LEFT JOIN plataforma_core.role_permissions rp ON r.id = rp.role_id AND rp.is_active = true
        LEFT JOIN plataforma_core.permissions p ON rp.permission_id = p.id
        WHERE (r.name LIKE $1 OR r.name LIKE $2) AND r.is_active = true
        GROUP BY r.id, r.name, r.display_name, r.description, r.level, r.is_system
        ORDER BY r.level DESC
      `, [`${moduleName}_%`, `%_${moduleName}`]);

      const roles: ModuleRoleDefinition[] = rolesResult.rows.map(row => ({
        name: row.name.replace(`${moduleName}_`, ''), // Remove module prefix
        displayName: row.display_name,
        description: row.description,
        level: row.level,
        permissions: row.permission_names ? row.permission_names.filter(Boolean) : [],
        isRequired: row.is_system
      }));

      return {
        moduleName,
        displayName: module.display_name,
        description: module.description,
        version: module.version,
        permissions,
        roles
      };
    } catch (error) {
      console.error(`Error getting module config for ${moduleName}:`, error);
      return null;
    }
  }

  /**
   * Get all registered modules with their permission status
   */
  async getRegisteredModules(): Promise<Array<{
    name: string;
    displayName: string;
    version: string;
    status: string;
    permissionCount: number;
    roleCount: number;
  }>> {
    try {
      const result = await this.pool.query(`
        SELECT 
          m.name,
          m.display_name,
          m.version,
          m.status,
          COUNT(DISTINCT p.id) as permission_count,
          COUNT(DISTINCT r.id) as role_count
        FROM plataforma_core.modules m
        LEFT JOIN plataforma_core.permissions p ON m.name = p.module_name AND p.is_active = true
        LEFT JOIN plataforma_core.roles r ON (r.name LIKE CONCAT(m.name, '_%') OR r.name LIKE CONCAT('%_', m.name)) AND r.is_active = true
        GROUP BY m.name, m.display_name, m.version, m.status
        ORDER BY m.name
      `);

      return result.rows.map(row => ({
        name: row.name,
        displayName: row.display_name,
        version: row.version,
        status: row.status,
        permissionCount: parseInt(row.permission_count) || 0,
        roleCount: parseInt(row.role_count) || 0
      }));
    } catch (error) {
      console.error('Error getting registered modules:', error);
      return [];
    }
  }

  /**
   * Assign default module role to user
   */
  async assignDefaultRoleToUser(
    userId: string, 
    moduleName: string, 
    assignedBy?: string
  ): Promise<boolean> {
    try {
      const config = await this.getModuleConfig(moduleName);
      if (!config?.defaultUserRole) {
        return false; // No default role configured
      }

      const fullRoleName = `${moduleName}_${config.defaultUserRole}`;

      // Get role ID
      const roleResult = await this.pool.query(`
        SELECT id FROM plataforma_core.roles
        WHERE name = $1 AND is_active = true
      `, [fullRoleName]);

      if (roleResult.rows.length === 0) {
        console.error(`Default role ${fullRoleName} not found for module ${moduleName}`);
        return false;
      }

      const roleId = roleResult.rows[0].id;

      // Assign role to user
      await this.pool.query(`
        INSERT INTO plataforma_core.user_roles (user_id, role_id, module_name, granted_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, role_id, module_name) DO UPDATE SET
          is_active = true,
          granted_at = NOW(),
          granted_by = $4
      `, [userId, roleId, moduleName, assignedBy]);

      return true;
    } catch (error) {
      console.error(`Error assigning default role for module ${moduleName}:`, error);
      return false;
    }
  }

  /**
   * Check if user has access to module
   */
  async userHasModuleAccess(userId: string, moduleName: string): Promise<boolean> {
    try {
      const result = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM plataforma_core.user_roles ur
        JOIN plataforma_core.roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 
          AND ur.is_active = true
          AND r.is_active = true
          AND (ur.module_name = $2 OR ur.module_name IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      `, [userId, moduleName]);

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error(`Error checking module access for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Sync permissions from module definition file
   */
  async syncModulePermissions(moduleName: string, configPath: string): Promise<void> {
    try {
      // This would typically load from a JSON or YAML file
      // For now, we'll implement a placeholder
      console.log(`Syncing permissions for module ${moduleName} from ${configPath}`);
      
      // In a real implementation, you would:
      // 1. Load the config file
      // 2. Parse the permission definitions
      // 3. Call registerModule with the loaded config
      
      throw new Error('Module config sync not implemented yet');
    } catch (error) {
      console.error(`Error syncing module permissions for ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Validate module permissions consistency
   */
  async validateModulePermissions(moduleName: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if module exists
      const moduleResult = await this.pool.query(`
        SELECT id FROM plataforma_core.modules WHERE name = $1
      `, [moduleName]);

      if (moduleResult.rows.length === 0) {
        issues.push(`Module ${moduleName} is not registered`);
        return { valid: false, issues };
      }

      // Check for orphaned permissions
      const orphanedPerms = await this.pool.query(`
        SELECT name FROM plataforma_core.permissions
        WHERE module_name = $1 
          AND id NOT IN (
            SELECT DISTINCT permission_id 
            FROM plataforma_core.role_permissions 
            WHERE permission_id IS NOT NULL
          )
      `, [moduleName]);

      if (orphanedPerms.rows.length > 0) {
        issues.push(`Found ${orphanedPerms.rows.length} orphaned permissions: ${orphanedPerms.rows.map(r => r.name).join(', ')}`);
      }

      // Check for roles without permissions
      const emptyRoles = await this.pool.query(`
        SELECT r.name FROM plataforma_core.roles r
        WHERE (r.name LIKE $1 OR r.name LIKE $2)
          AND r.is_active = true
          AND r.id NOT IN (
            SELECT DISTINCT role_id 
            FROM plataforma_core.role_permissions 
            WHERE is_active = true
          )
      `, [`${moduleName}_%`, `%_${moduleName}`]);

      if (emptyRoles.rows.length > 0) {
        issues.push(`Found ${emptyRoles.rows.length} roles without permissions: ${emptyRoles.rows.map(r => r.name).join(', ')}`);
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error(`Error validating module permissions for ${moduleName}:`, error);
      issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { valid: false, issues };
    }
  }
}

// Export pre-defined module configurations
export const CORE_MODULE_CONFIG: ModulePermissionConfig = {
  moduleName: 'core',
  displayName: 'Core System',
  description: 'Core platform permissions and roles',
  version: '1.0.0',
  permissions: [
    {
      name: 'users.read',
      displayName: 'View Users',
      description: 'View user information',
      resource: 'users',
      action: 'read'
    },
    {
      name: 'users.create',
      displayName: 'Create Users',
      description: 'Create new users',
      resource: 'users',
      action: 'create'
    },
    {
      name: 'users.update',
      displayName: 'Update Users',
      description: 'Update user information',
      resource: 'users',
      action: 'update'
    },
    {
      name: 'users.delete',
      displayName: 'Delete Users',
      description: 'Delete users',
      resource: 'users',
      action: 'delete'
    }
  ],
  roles: [
    {
      name: 'admin',
      displayName: 'System Administrator',
      description: 'Full system access',
      level: 500,
      permissions: ['users.read', 'users.create', 'users.update'],
      isRequired: true
    },
    {
      name: 'user',
      displayName: 'Regular User',
      description: 'Basic user access',
      level: 100,
      permissions: ['users.read'],
      isRequired: true
    }
  ],
  defaultUserRole: 'user',
  adminRole: 'admin'
};

export default ModulePermissionManager;