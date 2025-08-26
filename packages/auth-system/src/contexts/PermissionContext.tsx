import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  Permission, 
  Role, 
  UserPermissions, 
  PermissionCheck, 
  PermissionContextType 
} from '../types';

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
  module?: string; // If specified, only load permissions for this module
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
  children,
  module
}) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [maxLevel, setMaxLevel] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache for dynamic permission checks
  const [permissionCache, setPermissionCache] = useState<Map<string, PermissionCheck>>(new Map());

  const loadPermissions = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (module) params.append('module', module);

      const response = await fetch(`/api/my-permissions?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('plataforma_access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load permissions');
      }

      const result = await response.json();
      const userPermissions: UserPermissions = result.data;

      setPermissions(userPermissions.permissions);
      setRoles(userPermissions.roles);
      setMaxLevel(userPermissions.maxLevel);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [isAuthenticated, user, module]);

  // ===== LOCAL PERMISSION CHECKING =====

  const hasPermission = (permission: string, permissionModule?: string): boolean => {
    return permissions.some(p => {
      const nameMatch = p.name === permission;
      const moduleMatch = !permissionModule || !p.moduleName || p.moduleName === permissionModule;
      return nameMatch && moduleMatch;
    });
  };

  const hasAnyPermission = (permissionList: string[], permissionModule?: string): boolean => {
    return permissionList.some(permission => hasPermission(permission, permissionModule));
  };

  const hasAllPermissions = (permissionList: string[], permissionModule?: string): boolean => {
    return permissionList.every(permission => hasPermission(permission, permissionModule));
  };

  const hasRole = (role: string, roleModule?: string): boolean => {
    return roles.some(r => r.name === role);
  };

  const hasAnyRole = (roleList: string[], roleModule?: string): boolean => {
    return roleList.some(role => hasRole(role, roleModule));
  };

  const hasAllRoles = (roleList: string[], roleModule?: string): boolean => {
    return roleList.every(role => hasRole(role, roleModule));
  };

  const hasMinLevel = (level: number): boolean => {
    return maxLevel >= level;
  };

  const hasMaxLevel = (level: number): boolean => {
    return maxLevel <= level;
  };

  // ===== CONVENIENCE CHECKS =====

  const isAdmin = (): boolean => {
    return hasAnyRole(['admin', 'super_admin']);
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const isManager = (): boolean => {
    return hasMinLevel(300); // Manager level or above
  };

  const canManageUsers = (): boolean => {
    return hasAnyPermission([
      'system.users.admin',
      'system.users.update',
      'system.roles.update'
    ]);
  };

  // ===== DYNAMIC PERMISSION CHECKING =====

  const checkPermission = async (permission: string, permissionModule?: string): Promise<PermissionCheck> => {
    const cacheKey = `${permission}:${permissionModule || 'global'}`;
    
    // Check cache first
    if (permissionCache.has(cacheKey)) {
      return permissionCache.get(cacheKey)!;
    }

    try {
      const response = await fetch('/api/check-permission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plataforma_access_token')}`
        },
        body: JSON.stringify({
          permission,
          module: permissionModule
        })
      });

      if (!response.ok) {
        throw new Error('Permission check failed');
      }

      const result = await response.json();
      const check: PermissionCheck = {
        granted: result.data.granted,
        source: result.data.source,
        reason: result.data.reason
      };

      // Cache the result for 5 minutes
      setPermissionCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, check);
        // Simple cache cleanup - remove if over 100 entries
        if (newCache.size > 100) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        return newCache;
      });

      return check;
    } catch (error) {
      console.error('Error checking permission:', error);
      return { granted: false, source: 'denied', reason: 'Check failed' };
    }
  };

  const checkPermissions = async (permissionList: string[], permissionModule?: string): Promise<Record<string, PermissionCheck>> => {
    try {
      const response = await fetch('/api/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('plataforma_access_token')}`
        },
        body: JSON.stringify({
          permissions: permissionList,
          module: permissionModule
        })
      });

      if (!response.ok) {
        throw new Error('Permissions check failed');
      }

      const result = await response.json();
      return result.data.results;
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Return denied for all permissions
      const denied: Record<string, PermissionCheck> = {};
      permissionList.forEach(permission => {
        denied[permission] = { granted: false, source: 'denied', reason: 'Check failed' };
      });
      return denied;
    }
  };

  const refreshPermissions = async (): Promise<void> => {
    setPermissionCache(new Map()); // Clear cache
    await loadPermissions();
  };

  const contextValue: PermissionContextType = {
    // State
    permissions,
    roles,
    maxLevel,
    loading,
    error,
    
    // Permission checking
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Role checking
    hasRole,
    hasAnyRole,
    hasAllRoles,
    
    // Level checking
    hasMinLevel,
    hasMaxLevel,
    
    // Convenience checks
    isAdmin,
    isSuperAdmin,
    isManager,
    canManageUsers,
    
    // Dynamic checking
    checkPermission,
    checkPermissions,
    
    // Refresh
    refreshPermissions
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};