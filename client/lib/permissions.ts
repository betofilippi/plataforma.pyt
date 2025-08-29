/**
 * Permission and Module Management System
 * Provides utilities for managing user permissions and module access
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'delete' | 'admin' | 'system';
  module?: string;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string;
  is_active: boolean;
  permissions_required: string[];
  dependencies?: string[];
  version?: string;
  author?: string;
  settings?: Record<string, any>;
}

export interface UserPermissions {
  user_id: string;
  permissions: string[];
  modules: string[];
  roles: string[];
  granted_at: string;
  granted_by?: string;
  expires_at?: string;
}

// System-wide permissions
export const SYSTEM_PERMISSIONS: Permission[] = [
  // User management
  {
    id: 'read:users',
    name: 'View Users',
    description: 'Can view user profiles and information',
    category: 'read',
  },
  {
    id: 'write:users',
    name: 'Manage Users',
    description: 'Can create, edit, and update user information',
    category: 'write',
  },
  {
    id: 'delete:users',
    name: 'Delete Users',
    description: 'Can delete user accounts',
    category: 'delete',
  },

  // System administration
  {
    id: 'read:admin',
    name: 'View Admin Panel',
    description: 'Can access administrative interfaces',
    category: 'admin',
  },
  {
    id: 'write:admin',
    name: 'System Administration',
    description: 'Can modify system settings and configurations',
    category: 'admin',
  },
  {
    id: 'read:settings',
    name: 'View Settings',
    description: 'Can view system settings',
    category: 'read',
  },
  {
    id: 'write:settings',
    name: 'Modify Settings',
    description: 'Can modify system settings',
    category: 'write',
  },

  // Module management
  {
    id: 'read:modules',
    name: 'View Modules',
    description: 'Can view available modules',
    category: 'read',
  },
  {
    id: 'write:modules',
    name: 'Manage Modules',
    description: 'Can enable/disable modules and assign to users',
    category: 'write',
  },

  // Content management
  {
    id: 'read:documents',
    name: 'View Documents',
    description: 'Can view and download documents',
    category: 'read',
  },
  {
    id: 'write:documents',
    name: 'Manage Documents',
    description: 'Can upload, edit, and organize documents',
    category: 'write',
  },
  {
    id: 'delete:documents',
    name: 'Delete Documents',
    description: 'Can delete documents permanently',
    category: 'delete',
  },

  // Analytics and reporting
  {
    id: 'read:analytics',
    name: 'View Analytics',
    description: 'Can view reports and analytics',
    category: 'read',
  },
  {
    id: 'read:reports',
    name: 'View Reports',
    description: 'Can access and generate reports',
    category: 'read',
  },

  // Billing and finance
  {
    id: 'read:billing',
    name: 'View Billing',
    description: 'Can view billing information',
    category: 'read',
  },
  {
    id: 'write:billing',
    name: 'Manage Billing',
    description: 'Can modify billing settings and payments',
    category: 'write',
  },

  // Profile management
  {
    id: 'read:profile',
    name: 'View Profile',
    description: 'Can view own profile information',
    category: 'read',
  },
  {
    id: 'write:profile',
    name: 'Edit Profile',
    description: 'Can edit own profile information',
    category: 'write',
  },

  // System operations
  {
    id: 'system:backup',
    name: 'System Backup',
    description: 'Can perform system backups',
    category: 'system',
  },
  {
    id: 'system:logs',
    name: 'View System Logs',
    description: 'Can access system logs and audit trails',
    category: 'system',
  },
];

// Available modules in the system
export const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main system dashboard with overview and quick actions',
    category: 'Core',
    icon: 'LayoutDashboard',
    is_active: true,
    permissions_required: ['read:profile'],
    version: '1.0.0',
    author: 'System',
  },
  {
    id: 'documents',
    name: 'Document Management',
    description: 'Manage and organize company documents',
    category: 'Content',
    icon: 'FileText',
    is_active: true,
    permissions_required: ['read:documents'],
    version: '1.2.0',
    author: 'System',
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    description: 'View system analytics and generate reports',
    category: 'Analytics',
    icon: 'BarChart3',
    is_active: true,
    permissions_required: ['read:analytics', 'read:reports'],
    version: '1.1.0',
    author: 'System',
  },
  {
    id: 'settings',
    name: 'System Settings',
    description: 'Configure system preferences and options',
    category: 'Administration',
    icon: 'Settings',
    is_active: true,
    permissions_required: ['read:settings'],
    dependencies: ['dashboard'],
    version: '1.0.0',
    author: 'System',
  },
  {
    id: 'admin',
    name: 'Admin Panel',
    description: 'Administrative tools and user management',
    category: 'Administration',
    icon: 'Shield',
    is_active: true,
    permissions_required: ['read:admin', 'read:users'],
    dependencies: ['dashboard', 'settings'],
    version: '1.0.0',
    author: 'System',
  },
  {
    id: 'billing',
    name: 'Billing & Invoices',
    description: 'Manage billing, payments, and invoices',
    category: 'Finance',
    icon: 'CreditCard',
    is_active: false,
    permissions_required: ['read:billing'],
    version: '0.9.0',
    author: 'System',
  },
  {
    id: 'marketplace',
    name: 'Module Marketplace',
    description: 'Browse and install additional modules',
    category: 'System',
    icon: 'Store',
    is_active: false,
    permissions_required: ['read:modules', 'write:modules'],
    dependencies: ['admin'],
    version: '0.8.0',
    author: 'System',
  },
];

// Default role definitions
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  modules: string[];
  is_system_role: boolean;
  created_at: string;
}

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['*'], // Wildcard for all permissions
    modules: ['*'], // Wildcard for all modules
    is_system_role: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Administrative access to manage users and system',
    permissions: [
      'read:users',
      'write:users',
      'read:admin',
      'write:admin',
      'read:settings',
      'write:settings',
      'read:modules',
      'write:modules',
      'read:analytics',
      'read:reports',
      'system:logs',
    ],
    modules: ['dashboard', 'admin', 'settings', 'analytics', 'documents'],
    is_system_role: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Management level access with reporting capabilities',
    permissions: [
      'read:users',
      'read:analytics',
      'read:reports',
      'read:documents',
      'write:documents',
      'read:settings',
    ],
    modules: ['dashboard', 'analytics', 'documents', 'settings'],
    is_system_role: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user',
    name: 'User',
    description: 'Basic user access to core functionality',
    permissions: [
      'read:profile',
      'write:profile',
      'read:documents',
    ],
    modules: ['dashboard', 'documents'],
    is_system_role: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to basic information',
    permissions: [
      'read:profile',
      'read:documents',
    ],
    modules: ['dashboard'],
    is_system_role: true,
    created_at: new Date().toISOString(),
  },
];

/**
 * Permission checking utilities
 */
export class PermissionManager {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }
    
    // Check for exact permission
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Check for category wildcard (e.g., 'read:*' for all read permissions)
    const [category] = requiredPermission.split(':');
    if (userPermissions.includes(`${category}:*`)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if user has all required permissions
   */
  static hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Check if user has any of the required permissions
   */
  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Check if user can access a specific module
   */
  static canAccessModule(userModules: string[], moduleId: string): boolean {
    // Check for wildcard access
    if (userModules.includes('*')) {
      return true;
    }
    
    // Check for specific module access
    return userModules.includes(moduleId);
  }

  /**
   * Get available modules for a user based on their permissions and assigned modules
   */
  static getAvailableModules(
    userPermissions: string[], 
    userModules: string[]
  ): ModuleDefinition[] {
    return AVAILABLE_MODULES.filter(module => {
      // Check if module is active
      if (!module.is_active) {
        return false;
      }
      
      // Check if user can access the module
      if (!this.canAccessModule(userModules, module.id)) {
        return false;
      }
      
      // Check if user has required permissions
      if (!this.hasAllPermissions(userPermissions, module.permissions_required)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Get permissions for a role
   */
  static getRolePermissions(roleId: string): string[] {
    const role = DEFAULT_ROLES.find(r => r.id === roleId);
    return role ? role.permissions : [];
  }

  /**
   * Get modules for a role
   */
  static getRoleModules(roleId: string): string[] {
    const role = DEFAULT_ROLES.find(r => r.id === roleId);
    return role ? role.modules : [];
  }

  /**
   * Merge permissions from multiple roles
   */
  static mergeRolePermissions(roleIds: string[]): string[] {
    const allPermissions = new Set<string>();
    
    roleIds.forEach(roleId => {
      const permissions = this.getRolePermissions(roleId);
      permissions.forEach(permission => allPermissions.add(permission));
    });
    
    return Array.from(allPermissions);
  }

  /**
   * Merge modules from multiple roles
   */
  static mergeRoleModules(roleIds: string[]): string[] {
    const allModules = new Set<string>();
    
    roleIds.forEach(roleId => {
      const modules = this.getRoleModules(roleId);
      modules.forEach(module => allModules.add(module));
    });
    
    return Array.from(allModules);
  }

  /**
   * Validate module dependencies
   */
  static validateModuleDependencies(moduleIds: string[]): {
    valid: boolean;
    missing: string[];
    suggestions: string[];
  } {
    const missing: string[] = [];
    const suggestions: string[] = [];
    
    moduleIds.forEach(moduleId => {
      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
      if (module && module.dependencies) {
        module.dependencies.forEach(depId => {
          if (!moduleIds.includes(depId)) {
            missing.push(depId);
            
            const depModule = AVAILABLE_MODULES.find(m => m.id === depId);
            if (depModule) {
              suggestions.push(`${module.name} requires ${depModule.name}`);
            }
          }
        });
      }
    });
    
    return {
      valid: missing.length === 0,
      missing: [...new Set(missing)],
      suggestions: [...new Set(suggestions)],
    };
  }
}

/**
 * Hook to use permissions in React components
 */
export function usePermissions(user: any) {
  const userPermissions = user?.permissions || [];
  const userModules = user?.modules_access || [];
  const userRoles = user?.roles || [];
  
  // Merge permissions from roles
  const rolePermissions = PermissionManager.mergeRolePermissions(userRoles);
  const allPermissions = [...new Set([...userPermissions, ...rolePermissions])];
  
  // Merge modules from roles
  const roleModules = PermissionManager.mergeRoleModules(userRoles);
  const allModules = [...new Set([...userModules, ...roleModules])];
  
  return {
    hasPermission: (permission: string) => 
      PermissionManager.hasPermission(allPermissions, permission),
    
    hasAllPermissions: (permissions: string[]) => 
      PermissionManager.hasAllPermissions(allPermissions, permissions),
    
    hasAnyPermission: (permissions: string[]) => 
      PermissionManager.hasAnyPermission(allPermissions, permissions),
    
    canAccessModule: (moduleId: string) => 
      PermissionManager.canAccessModule(allModules, moduleId),
    
    getAvailableModules: () => 
      PermissionManager.getAvailableModules(allPermissions, allModules),
    
    permissions: allPermissions,
    modules: allModules,
    roles: userRoles,
  };
}

export default PermissionManager;