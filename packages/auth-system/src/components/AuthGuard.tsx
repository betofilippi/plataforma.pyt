import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  roles?: string | string[];
  permissions?: string[];
}

/**
 * AuthGuard component for conditionally rendering content based on auth state
 */
export function AuthGuard({ 
  children, 
  fallback = null, 
  requireAuth = true,
  roles,
  permissions 
}: AuthGuardProps) {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Check authentication requirement
  if (requireAuth && (!isAuthenticated || !user)) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (roles && user) {
    const hasRole = Array.isArray(roles) 
      ? roles.includes(user.role)
      : user.role === roles;
    
    if (!hasRole) {
      return <>{fallback}</>;
    }
  }

  // Check permission requirements (placeholder implementation)
  if (permissions && user) {
    // This would need to be implemented with actual permission checking logic
    // For now, we'll assume all authenticated users have all permissions
  }

  return <>{children}</>;
}