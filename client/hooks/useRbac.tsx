/**
 * RBAC React Hook - Complete permissions and role management for frontend
 * Provides reactive permission checking and role management
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pythonApiClient } from '@/lib/python-api-client';
import { 
  UserWithRoles, 
  Role, 
  Permission, 
  PermissionWithSource,
  RbacContext,
  SYSTEM_PERMISSIONS 
} from '../../types/rbac';

// =====================================================================
// RBAC CONTEXT
// =====================================================================

const RbacContext = createContext<RbacContext | undefined>(undefined);

export function RbacProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user permissions when user changes
  useEffect(() => {
    if (user && isAuthenticated) {
      loadUserPermissions(user.id);
    } else {
      setPermissions([]);
    }
  }, [user, isAuthenticated]);

  const loadUserPermissions = async (userId: string) => {
    setIsLoading(true);
    try {
      const data = await pythonApiClient.rbac.getUserPermissions(userId);
      setPermissions(data || []);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      // Fallback to checking user roles for basic permissions
      if (user?.roles) {
        const rolePermissions: string[] = [];
        user.roles.forEach(role => {
          // Map role names to basic permissions
          if (role.name === 'admin' || role.name === 'super_admin') {
            rolePermissions.push(...Object.values(SYSTEM_PERMISSIONS));
          } else if (role.name === 'manager') {
            rolePermissions.push(
              SYSTEM_PERMISSIONS.USERS_READ,
              SYSTEM_PERMISSIONS.DATA_READ,
              SYSTEM_PERMISSIONS.DATA_WRITE
            );
          } else if (role.name === 'user') {
            rolePermissions.push(
              SYSTEM_PERMISSIONS.DATA_READ
            );
          }
        });
        setPermissions(rolePermissions);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Permission checking functions
  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles.some(r => r.name === role) || false;
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return user?.roles.some(r => roles.includes(r.name)) || false;
  }, [user]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    const userRoles = user?.roles.map(r => r.name) || [];
    return roles.every(role => userRoles.includes(role));
  }, [user]);

  const canAccess = useCallback((resource: string, action: string): boolean => {
    const permission = `${resource}:${action}`;
    return hasPermission(permission);
  }, [hasPermission]);

  const contextValue: RbacContext = {
    user: user as UserWithRoles | null,
    permissions,
    roles: user?.roles.map(r => r.name) || [],
    isAuthenticated,
    isLoading,
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    canAccess
  };

  return (
    <RbacContext.Provider value={contextValue}>
      {children}
    </RbacContext.Provider>
  );
}

// =====================================================================
// MAIN RBAC HOOK
// =====================================================================

export function useRbac() {
  const context = useContext(RbacContext);
  
  if (!context) {
    throw new Error('useRbac must be used within RbacProvider');
  }
  
  return context;
}

// =====================================================================
// PERMISSION CHECKING HOOKS
// =====================================================================

/**
 * Hook to check if user has specific permission
 */
export function usePermission(permission: string) {
  const { hasPermission, isLoading } = useRbac();
  
  return {
    hasPermission: hasPermission(permission),
    isLoading
  };
}

/**
 * Hook to check if user has any of the provided permissions
 */
export function useAnyPermission(permissions: string[]) {
  const { hasPermission, isLoading } = useRbac();
  
  const hasAnyPermission = permissions.some(permission => hasPermission(permission));
  
  return {
    hasAnyPermission,
    isLoading
  };
}

/**
 * Hook to check if user has all of the provided permissions
 */
export function useAllPermissions(permissions: string[]) {
  const { hasPermission, isLoading } = useRbac();
  
  const hasAllPermissions = permissions.every(permission => hasPermission(permission));
  
  return {
    hasAllPermissions,
    isLoading
  };
}

/**
 * Hook to check if user has specific role
 */
export function useRole(role: string) {
  const { hasRole, isLoading } = useRbac();
  
  return {
    hasRole: hasRole(role),
    isLoading
  };
}

/**
 * Hook to check if user has any of the provided roles
 */
export function useAnyRole(roles: string[]) {
  const { hasAnyRole, isLoading } = useRbac();
  
  return {
    hasAnyRole: hasAnyRole(roles),
    isLoading
  };
}

// =====================================================================
// DATA ACCESS HOOKS
// =====================================================================

/**
 * Hook to check data access permissions
 */
export function useDataAccess(schema?: string, table?: string) {
  const { canAccess, isLoading } = useRbac();
  
  const resource = schema && table ? `data:${schema}:${table}` : 'data';
  
  return {
    canRead: canAccess(resource, 'read'),
    canWrite: canAccess(resource, 'write'),
    canDelete: canAccess(resource, 'delete'),
    isLoading
  };
}

/**
 * Hook to check module access permissions
 */
export function useModuleAccess(moduleId: string) {
  const { canAccess, hasPermission, isLoading } = useRbac();
  
  return {
    canInstall: hasPermission(SYSTEM_PERMISSIONS.MODULES_INSTALL),
    canConfigure: hasPermission(SYSTEM_PERMISSIONS.MODULES_CONFIGURE),
    canUninstall: hasPermission(SYSTEM_PERMISSIONS.MODULES_UNINSTALL),
    canAccess: canAccess('modules', 'access'),
    isLoading
  };
}

// =====================================================================
// USER MANAGEMENT HOOKS
// =====================================================================

/**
 * Hook for user management operations
 */
export function useUserManagement() {
  const { hasPermission, user } = useRbac();
  
  return {
    canViewUsers: hasPermission(SYSTEM_PERMISSIONS.USERS_READ),
    canCreateUsers: hasPermission(SYSTEM_PERMISSIONS.USERS_CREATE),
    canUpdateUsers: hasPermission(SYSTEM_PERMISSIONS.USERS_UPDATE),
    canDeleteUsers: hasPermission(SYSTEM_PERMISSIONS.USERS_DELETE),
    canManageRoles: hasPermission(SYSTEM_PERMISSIONS.USERS_MANAGE_ROLES),
    canAccessAdminPanel: hasPermission(SYSTEM_PERMISSIONS.SYSTEM_ADMIN_PANEL),
    isAdmin: user?.roles.some(r => ['super_admin', 'admin'].includes(r.name)) || false,
    isSuperAdmin: user?.roles.some(r => r.name === 'super_admin') || false
  };
}

/**
 * Hook for role management operations
 */
export function useRoleManagement() {
  const { hasPermission } = useRbac();
  
  return {
    canViewRoles: hasPermission('roles:read'),
    canCreateRoles: hasPermission('roles:create'),
    canUpdateRoles: hasPermission('roles:update'),
    canDeleteRoles: hasPermission('roles:delete'),
    canManagePermissions: hasPermission('roles:manage_permissions')
  };
}

// =====================================================================
// PERMISSION VALIDATION HOOK
// =====================================================================

/**
 * Hook to validate permissions against API
 */
export function usePermissionValidation() {
  const { permissions } = useRbac();
  const [validationCache, setValidationCache] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validatePermission = useCallback(async (permission: string): Promise<boolean> => {
    // Check cache first
    if (validationCache[permission] !== undefined) {
      return validationCache[permission];
    }

    setIsValidating(true);
    
    try {
      const hasPermission = await pythonApiClient.rbac.checkPermission(permission);
      
      // Update cache
      setValidationCache(prev => ({
        ...prev,
        [permission]: hasPermission
      }));
      
      return hasPermission;
    } catch (error) {
      console.error('Permission validation error:', error);
      // Fallback to local permission check
      return permissions.includes(permission);
    } finally {
      setIsValidating(false);
    }
  }, [validationCache, permissions]);

  return {
    validatePermission,
    isValidating,
    clearCache: () => setValidationCache({})
  };
}

// =====================================================================
// UTILITY HOOKS
// =====================================================================

/**
 * Hook to get user's role hierarchy level
 */
export function useRoleLevel() {
  const { user } = useRbac();
  
  const highestRole = user?.roles.reduce((highest, role) => {
    return !highest || role.level < highest.level ? role : highest;
  }, null as Role | null);

  return {
    level: highestRole?.level || 999,
    roleName: highestRole?.name || 'none',
    roleDisplayName: highestRole?.displayName || 'No Role'
  };
}

/**
 * Hook to check if user can manage another user
 */
export function useCanManageUser() {
  const { user, hasPermission } = useRbac();
  const { level: currentUserLevel } = useRoleLevel();
  
  const canManageUser = useCallback((targetUser: UserWithRoles): boolean => {
    // Must have user management permission
    if (!hasPermission(SYSTEM_PERMISSIONS.USERS_UPDATE)) {
      return false;
    }
    
    // Cannot manage yourself for certain operations
    if (targetUser.id === user?.id) {
      return false;
    }
    
    // Must have higher or equal role level to manage
    const targetUserLevel = targetUser.roles.reduce((highest, role) => {
      return highest === null || role.level < highest ? role.level : highest;
    }, null as number | null);
    
    return targetUserLevel === null || currentUserLevel <= targetUserLevel;
  }, [hasPermission, user, currentUserLevel]);

  return canManageUser;
}

// =====================================================================
// LOADING AND ERROR STATES
// =====================================================================

/**
 * Hook to handle RBAC loading states
 */
export function useRbacLoading() {
  const { isLoading } = useRbac();
  const [additionalLoading, setAdditionalLoading] = useState(false);
  
  return {
    isLoading: isLoading || additionalLoading,
    setLoading: setAdditionalLoading
  };
}

export default useRbac;