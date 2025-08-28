import React, { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  showLoading?: boolean;
}

/**
 * ProtectedRoute component that handles authentication and authorization
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermissions,
  fallbackPath = '/login',
  showLoading = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, clearError } = useAuth();
  const location = useLocation();

  // Clear any auth errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Return null while checking authentication (no visual loader)
  if (isLoading && showLoading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={fallbackPath}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role requirements
  if (requiredRole && !checkUserRole(user.role, requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Role necessária: {Array.isArray(requiredRole) ? requiredRole.join(' ou ') : requiredRole}
            <br />
            Seu role: {user.role}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <Navigate to="/platform" replace />
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements (if implemented in the future)
  if (requiredPermissions && !checkUserPermissions(user, requiredPermissions)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Permissão Insuficiente
          </h2>
          <p className="text-gray-600 mb-4">
            Você não tem as permissões necessárias para acessar esta funcionalidade.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Permissões necessárias: {requiredPermissions.join(', ')}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Voltar
            </button>
            <Navigate to="/platform" replace />
          </div>
        </div>
      </div>
    );
  }

  // All checks passed, render the protected content
  return <>{children}</>;
}

/**
 * Convenience component for admin-only routes
 */
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole={['admin', 'super_admin']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Convenience component for manager-level routes
 */
export function ManagerRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute requiredRole={['admin', 'super_admin', 'manager']} {...props}>
      {children}
    </ProtectedRoute>
  );
}

/**
 * Component that only shows content to authenticated users
 */
interface AuthOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  roles?: string | string[];
  permissions?: string[];
}

export function AuthOnly({ children, fallback = null, roles, permissions }: AuthOnlyProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (roles && !checkUserRole(user.role, roles)) {
    return <>{fallback}</>;
  }

  // Check permission requirements
  if (permissions && !checkUserPermissions(user, permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component that shows content only to guests (non-authenticated users)
 */
interface GuestOnlyProps {
  children: ReactNode;
  redirectTo?: string;
}

export function GuestOnly({ children, redirectTo = '/platform' }: GuestOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Return null while loading (no visual loader)
  if (isLoading) {
    return null;
  }

  // Redirect if authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting routes
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook for conditional rendering based on authentication and roles
 */
export function useAuthGuard() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const hasRole = (roles: string | string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return checkUserRole(user.role, roles);
  };

  const hasPermission = (permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return checkUserPermissions(user, permissions);
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

// Helper functions

/**
 * Check if user has required role
 */
function checkUserRole(userRole: string, requiredRole: string | string[]): boolean {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

/**
 * Check if user has required permissions (placeholder for future implementation)
 */
function checkUserPermissions(user: any, requiredPermissions: string[]): boolean {
  // Placeholder implementation
  // In a real application, you would check user.permissions against requiredPermissions
  // For now, we'll assume all authenticated users have all permissions
  
  // Example of what this might look like:
  /*
  if (!user.permissions) return false;
  return requiredPermissions.every(permission => 
    user.permissions.includes(permission)
  );
  */
  
  return true;
}

export default ProtectedRoute;