// Auth System - Main Entry Point

// Client-side exports

// Contexts
export { AuthProvider, useAuth as useAuthContext, AuthContext } from './contexts/AuthContext';
export { PermissionProvider, usePermissions as usePermissionsContext } from './contexts/PermissionContext';

// Components
export { LoginForm } from './components/LoginForm';
export { AuthGuard } from './components/AuthGuard';
export { 
  ProtectedRoute, 
  AdminRoute, 
  ManagerRoute, 
  AuthOnly, 
  GuestOnly, 
  withProtectedRoute 
} from './components/ProtectedRoute';

// Hooks
export { useAuth, useAuthGuard, useUser } from './hooks/useAuth';
export { usePermissions } from './hooks/usePermissions';

// Services
export { AuthService, authService } from './services/authService';
export { PermissionService, permissionService } from './services/permissionService';
export { createAuthApi } from './services/authApi';
export { createTokenStorage } from './services/tokenStorage';

// Types
export type {
  User,
  AuthState,
  LoginCredentials,
  AuthResponse,
  RefreshTokenResponse,
  Permission,
  Role,
  UserPermissions,
  PermissionCheck,
  AuthAction,
  AuthContextType,
  PermissionContextType,
  ProtectedRouteProps,
  AuthOnlyProps,
  GuestOnlyProps,
  SocialAuthProvider,
  SocialAuthProps,
  LoginFormData,
  AuthApiConfig,
  TokenStorage
} from './types';

// Server-side exports (for backend integration)
export * as AuthServer from './server';