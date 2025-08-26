// Authentication System Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  expiresAt: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
  code?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
  };
}

// Permission System Types
export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  moduleName?: string;
  resource: string;
  action: string;
  isSystem: boolean;
  isActive: boolean;
  metadata?: any;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  metadata?: any;
}

export interface UserPermissions {
  permissions: Permission[];
  roles: Role[];
  maxLevel: number;
}

export interface PermissionCheck {
  granted: boolean;
  source?: 'role' | 'direct' | 'denied';
  reason?: string;
}

// Auth Action Types
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string; expiresIn: number } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_TOKEN'; payload: { accessToken: string; expiresIn: number } }
  | { type: 'AUTH_UPDATE_USER'; payload: User };

// Context Types
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  socialLogin: (provider: 'google' | 'github' | 'discord') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
}

export interface PermissionContextType {
  // State
  permissions: Permission[];
  roles: Role[];
  maxLevel: number;
  loading: boolean;
  error: string | null;
  
  // Permission checking
  hasPermission: (permission: string, module?: string) => boolean;
  hasAnyPermission: (permissions: string[], module?: string) => boolean;
  hasAllPermissions: (permissions: string[], module?: string) => boolean;
  
  // Role checking
  hasRole: (role: string, module?: string) => boolean;
  hasAnyRole: (roles: string[], module?: string) => boolean;
  hasAllRoles: (roles: string[], module?: string) => boolean;
  
  // Level checking
  hasMinLevel: (level: number) => boolean;
  hasMaxLevel: (level: number) => boolean;
  
  // Convenience checks
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isManager: () => boolean;
  canManageUsers: () => boolean;
  
  // Dynamic permission checking (with API call)
  checkPermission: (permission: string, module?: string) => Promise<PermissionCheck>;
  checkPermissions: (permissions: string[], module?: string) => Promise<Record<string, PermissionCheck>>;
  
  // Refresh permissions
  refreshPermissions: () => Promise<void>;
}

// Protected Route Types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  showLoading?: boolean;
}

export interface AuthOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  roles?: string | string[];
  permissions?: string[];
}

export interface GuestOnlyProps {
  children: React.ReactNode;
  redirectTo?: string;
}

// Social Auth Types
export interface SocialAuthProvider {
  id: 'google' | 'github' | 'discord';
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

export interface SocialAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// Server-side Types
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}

// JWT and Token Types
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo?: any;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isRevoked: boolean;
}

// Storage Types
export interface TokenStorage {
  get: () => string | null;
  set: (token: string) => void;
  remove: () => void;
  getExpiry: () => number | null;
  setExpiry: (timestamp: number) => void;
  getUser: () => User | null;
  setUser: (user: User) => void;
}

// Login Form Types
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// API Configuration Types
export interface AuthApiConfig {
  baseURL: string;
  timeout: number;
  withCredentials: boolean;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: any;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests?: boolean;
  skip?: (req: any, res: any) => boolean;
}