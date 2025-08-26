// Re-export useAuth from AuthContext for consistency
export { useAuth } from '../contexts/AuthContext';

// Additional auth-related hooks can be added here
import { useAuth as useAuthContext } from '../contexts/AuthContext';
import { useCallback } from 'react';

/**
 * Hook for conditional rendering based on authentication and roles
 */
export function useAuthGuard() {
  const { isAuthenticated, user, isLoading } = useAuthContext();

  const hasRole = (roles: string | string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasPermission = (permissions: string[]): boolean => {
    // Placeholder implementation
    // In a real application, you would check user.permissions against required permissions
    if (!isAuthenticated || !user) return false;
    return true;
  };

  const isAdmin = (): boolean => {
    return hasRole(['admin', 'super_admin']);
  };

  const isManager = (): boolean => {
    return hasRole(['admin', 'super_admin', 'manager']);
  };

  return {
    isAuthenticated,
    user,
    isLoading,
    hasRole,
    hasPermission,
    isAdmin,
    isManager,
  };
}

/**
 * Hook for getting current user information
 */
export function useUser() {
  const { user, isAuthenticated, isLoading, updateUser } = useAuthContext();

  const updateProfile = useCallback((updates: Partial<typeof user>) => {
    if (user && updates) {
      updateUser({ ...user, ...updates });
    }
  }, [user, updateUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    updateProfile,
  };
}