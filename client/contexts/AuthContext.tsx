import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import pythonApiClient from '@/lib/python-api-client';
import type { ApiError } from '@/lib/python-api-client';
import { PYTHON_API_URLS } from '@/lib/api-config';
import { useSessionManager } from '@/lib/session-manager';

// Types - Updated to match Python backend response with backward compatibility
export interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  email_verified_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  preferences?: Record<string, any>;
  timezone?: string;
  language?: string;
  theme?: string;
  
  // Backward compatibility properties (computed from new fields)
  role: string; // Will be roles[0] or 'user'
  avatarUrl?: string; // Alias for avatar_url
  lastLogin?: string; // Alias for last_login_at
  createdAt: string; // Alias for created_at
  metadata?: Record<string, any>; // Alias for preferences
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  expiresAt: number | null;
  registrationSuccess?: boolean;
  emailVerificationRequired?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationCredentials {
  email: string;
  password: string;
  password_confirm: string;
  name: string;
  department?: string;
  job_title?: string;
  phone?: string;
  terms_accepted: boolean;
  privacy_policy_accepted: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    refresh_expires_in: number;
  };
  user?: User;
  mfa_required?: boolean;
  session_id?: string;
  warnings?: string[];
}

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string; expiresIn: number } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_TOKEN'; payload: { accessToken: string; refreshToken?: string; expiresIn: number } }
  | { type: 'AUTH_UPDATE_USER'; payload: User }
  | { type: 'REGISTRATION_SUCCESS'; payload: { emailVerificationRequired: boolean } }
  | { type: 'REGISTRATION_FAILURE'; payload: string };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false, // Start with loading FALSE to avoid initial check issues
  error: null,
  accessToken: null,
  expiresAt: null,
  registrationSuccess: false,
  emailVerificationRequired: false,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      const expiresAt = Date.now() + action.payload.expiresIn * 1000;
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        expiresAt,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        expiresAt: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        expiresAt: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case 'AUTH_CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'AUTH_UPDATE_TOKEN':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        expiresAt: Date.now() + action.payload.expiresIn * 1000,
      };

    case 'AUTH_UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'REGISTRATION_SUCCESS':
      return {
        ...state,
        registrationSuccess: true,
        emailVerificationRequired: action.payload.emailVerificationRequired,
        isLoading: false,
        error: null,
      };

    case 'REGISTRATION_FAILURE':
      return {
        ...state,
        registrationSuccess: false,
        emailVerificationRequired: false,
        isLoading: false,
        error: action.payload,
      };

    default:
      return state;
  }
}

// Context
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (userData: RegistrationCredentials) => Promise<{ success: boolean; message: string; emailVerificationRequired?: boolean }>;
  socialLogin: (provider: 'google' | 'github' | 'discord') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
  clearRegistrationState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Configuration - Using Python backend
const API_BASE_URL = PYTHON_API_URLS.auth;

// Storage utilities - Updated for Python backend
const TOKEN_STORAGE_KEY = 'pythonAccessToken';
const REFRESH_TOKEN_STORAGE_KEY = 'pythonRefreshToken';
const TOKEN_EXPIRY_KEY = 'pythonTokenExpiry';
const USER_STORAGE_KEY = 'pythonCurrentUser';

const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.warn('Failed to store access token:', error);
    }
  },
  
  getRefreshToken: () => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  
  setRefreshToken: (token: string) => {
    try {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.warn('Failed to store refresh token:', error);
    }
  },
  
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to remove tokens from storage:', error);
    }
  },

  getExpiry: (): number | null => {
    try {
      const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
      return expiry ? parseInt(expiry, 10) : null;
    } catch {
      return null;
    }
  },

  setExpiry: (timestamp: number) => {
    try {
      localStorage.setItem(TOKEN_EXPIRY_KEY, timestamp.toString());
    } catch (error) {
      console.warn('Failed to store token expiry:', error);
    }
  },
  
  getUser: (): User | null => {
    try {
      const userStr = localStorage.getItem(USER_STORAGE_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.warn('Failed to get user from storage:', error);
      return null;
    }
  },
  
  setUser: (user: User) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user:', error);
    }
  },
  
  // Helper to ensure backward compatibility when getting user
  getUserWithCompatibility: (): User | null => {
    try {
      const userStr = localStorage.getItem(USER_STORAGE_KEY);
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      
      // Ensure backward compatibility properties exist
      if (user && !user.role && user.roles) {
        user.role = user.roles[0] || 'user';
      }
      // CRUCIAL: Ensure roles array exists (for admin detection)
      if (user && !user.roles && user.role) {
        user.roles = [user.role];
      }
      if (user && !user.avatarUrl && user.avatar_url) {
        user.avatarUrl = user.avatar_url;
      }
      if (user && !user.lastLogin && user.last_login_at) {
        user.lastLogin = user.last_login_at;
      }
      if (user && !user.createdAt && user.created_at) {
        user.createdAt = user.created_at;
      }
      if (user && !user.metadata && user.preferences) {
        user.metadata = user.preferences;
      }
      
      return user;
    } catch (error) {
      console.warn('Failed to get user from storage:', error);
      return null;
    }
  }
};

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Session manager for user session persistence
  const sessionManager = useSessionManager(state.user?.id || null);

  // Python API client handles token management automatically
  // No need for manual interceptor setup

  // Check authentication status on mount - Updated for Python backend
  useEffect(() => {
    console.log("🔍 AuthContext - Checking auth status on mount");
    
    // Add try-catch to prevent white screen on errors
    try {
      // Try to restore session from localStorage
      const storedToken = tokenStorage.get();
      const storedRefreshToken = tokenStorage.getRefreshToken();
      const storedUser = tokenStorage.getUserWithCompatibility();
      const storedExpiry = tokenStorage.getExpiry();
      
      if (storedToken && storedRefreshToken && storedUser && storedExpiry) {
        if (Date.now() < storedExpiry) {
          // Token is still valid
          console.log("✅ Restoring valid session for user:", storedUser.email);
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: storedUser,
              accessToken: storedToken,
              refreshToken: storedRefreshToken,
              expiresIn: Math.floor((storedExpiry - Date.now()) / 1000),
            },
          });
        } else {
          // Token expired, try to refresh
          console.log("⏰ Token expired, attempting refresh for user:", storedUser.email);
          refreshToken().then((success) => {
            if (!success) {
              console.log("❌ Token refresh failed, clearing session");
              dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
            }
          }).catch(() => {
            console.log("❌ Token refresh error, clearing session");
            dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
          });
        }
      } else {
        console.log("⚠️ No valid stored session found, user needs to login");
        // Ensure auth failure is properly dispatched so login screen shows
        dispatch({ type: 'AUTH_FAILURE', payload: 'No valid session' });
        // Clean up any partial data
        tokenStorage.remove();
      }
    } catch (error) {
      console.error("❌ Error checking auth status:", error);
      // On error, ensure user sees login screen, not white screen
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to check authentication status' });
      // Clean up any partial data
      tokenStorage.remove();
    }
  }, []); // Only run once on mount

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!state.expiresAt || !state.accessToken) return;

    const refreshTime = state.expiresAt - Date.now() - 60000; // Refresh 1 minute before expiry
    
    if (refreshTime <= 0) {
      refreshToken();
      return;
    }

    const timer = setTimeout(() => {
      refreshToken();
    }, refreshTime);

    return () => clearTimeout(timer);
  }, [state.expiresAt, state.accessToken]);

  // Login function - Updated for Python backend
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await pythonApiClient.login({
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.rememberMe || false,
      });

      if (response.success && response.tokens && response.user) {
        console.log("🔐 AuthContext - Login successful, user:", response.user.email);
        
        // Create backward-compatible user object
        const compatibleUser: User = {
          ...response.user,
          role: response.user.role || response.user.roles?.[0] || 'user',
          roles: response.user.roles || [response.user.role || 'user'],
          avatarUrl: response.user.avatar_url,
          lastLogin: response.user.last_login_at,
          createdAt: response.user.created_at,
          metadata: response.user.preferences,
        };
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: compatibleUser,
            accessToken: response.tokens.access_token,
            refreshToken: response.tokens.refresh_token,
            expiresIn: response.tokens.expires_in,
          },
        });
        
        // Store tokens and user in localStorage
        tokenStorage.set(response.tokens.access_token);
        tokenStorage.setRefreshToken(response.tokens.refresh_token);
        tokenStorage.setExpiry(Date.now() + response.tokens.expires_in * 1000);
        tokenStorage.setUser(compatibleUser);
        
        console.log("💾 Tokens and user saved to localStorage");
        
        // Create or load user session for window state persistence
        try {
          const existingSession = await sessionManager.loadSession(compatibleUser.id);
          if (!existingSession) {
            // Create a new empty session for first-time users
            const newSession = sessionManager.createEmptySession(compatibleUser.id);
            console.log("🆕 Created new user session:", newSession.sessionId);
          } else {
            console.log("📁 Loaded existing user session:", existingSession.sessionId);
          }
        } catch (error) {
          console.warn("Failed to load user session, but login continues:", error);
        }
        
        return {
          success: response.success,
          message: response.message,
          tokens: response.tokens,
          user: response.user,
          mfa_required: response.mfa_required,
          session_id: response.session_id,
          warnings: response.warnings,
        };
      } else {
        const error = response.message || 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: error });
        return {
          success: false,
          message: error,
          mfa_required: response.mfa_required,
        };
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, []);

  // Social Login function - Removed for Python backend (not implemented yet)
  const socialLogin = useCallback(async (provider: 'google' | 'github' | 'discord'): Promise<void> => {
    dispatch({ type: 'AUTH_FAILURE', payload: 'Social login not implemented in Python backend yet' });
    throw new Error('Social login not implemented in Python backend yet');
  }, []);

  // Logout function - Updated for Python backend
  const logout = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      await pythonApiClient.logout({
        refresh_token: refreshToken || undefined,
        logout_all_sessions: false,
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Force save current session before logout
      try {
        if (state.user?.id) {
          await sessionManager.forceSave();
          console.log("💾 Session saved before logout");
        }
      } catch (error) {
        console.warn("Failed to save session before logout:", error);
      }
      
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, [state.user?.id, sessionManager]);

  // Logout from all devices - Updated for Python backend
  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      await pythonApiClient.logout({
        refresh_token: refreshToken || undefined,
        logout_all_sessions: true,
      });
    } catch (error) {
      console.error('Logout all API call failed:', error);
    } finally {
      // Clear session when logging out from all devices
      try {
        if (state.user?.id) {
          await sessionManager.clearSession();
          console.log("🗑️ Session cleared for logout all");
        }
      } catch (error) {
        console.warn("Failed to clear session during logout all:", error);
      }
      
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, [state.user?.id, sessionManager]);

  // Refresh token function - Updated for Python backend
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        console.error('No refresh token available');
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return false;
      }

      const response = await pythonApiClient.refreshToken({
        refresh_token: refreshToken,
      });
      
      if (response.success && response.tokens) {
        const { access_token, refresh_token, expires_in } = response.tokens;
        
        dispatch({
          type: 'AUTH_UPDATE_TOKEN',
          payload: { 
            accessToken: access_token, 
            refreshToken: refresh_token,
            expiresIn: expires_in 
          },
        });

        // Update stored tokens
        tokenStorage.set(access_token);
        if (refresh_token) {
          tokenStorage.setRefreshToken(refresh_token);
        }
        tokenStorage.setExpiry(Date.now() + expires_in * 1000);

        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
      return false;
    }
  }, []);

  // Check auth status (used on app initialization) - Updated for Python backend
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    console.log("🔍 checkAuthStatus called");
    
    try {
      // Check if we have stored tokens
      const storedToken = tokenStorage.get();
      const storedRefreshToken = tokenStorage.getRefreshToken();
      const storedExpiry = tokenStorage.getExpiry();
      
      console.log("📦 Stored access token:", storedToken ? "exists" : "none");
      console.log("📦 Stored refresh token:", storedRefreshToken ? "exists" : "none");
      console.log("⏰ Stored expiry:", storedExpiry);

      if (!storedToken || !storedRefreshToken || !storedExpiry) {
        console.log("❌ Missing tokens or expiry, logging out");
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return;
      }

      // Check if token is expired
      if (Date.now() >= storedExpiry) {
        console.log("⏰ Token expired, attempting refresh");
        const refreshed = await refreshToken();
        if (!refreshed) {
          console.log("❌ Token refresh failed, clearing session");
          dispatch({ type: 'AUTH_LOGOUT' });
          tokenStorage.remove();
        }
        return;
      }
      
      // Get the saved user from localStorage with compatibility
      const savedUser = tokenStorage.getUserWithCompatibility();
      
      if (!savedUser) {
        console.log("⚠️ Token exists but no user data, clearing session");
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return;
      }
      
      console.log("✅ Valid tokens and user found, restoring session");
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: savedUser,
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          expiresIn: Math.floor((storedExpiry - Date.now()) / 1000),
        },
      });
      
      console.log("✅ Session restored successfully with user:", savedUser.email);
    } catch (error) {
      console.error('Auth status check failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, [refreshToken]);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // Clear registration state function
  const clearRegistrationState = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // Update user function
  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'AUTH_UPDATE_USER', payload: user });
    tokenStorage.setUser(user);
  }, []);

  // Register function - Updated for proper integration
  const register = useCallback(async (userData: RegistrationCredentials): Promise<{ success: boolean; message: string; emailVerificationRequired?: boolean }> => {
    dispatch({ type: 'AUTH_START' });

    try {
      console.log('🔐 AuthContext - Attempting registration for:', userData.email);
      
      const response = await pythonApiClient.register({
        email: userData.email,
        password: userData.password,
        password_confirm: userData.password_confirm,
        name: userData.name,
        department: userData.department,
        job_title: userData.job_title,
        phone: userData.phone,
        terms_accepted: userData.terms_accepted,
        privacy_policy_accepted: userData.privacy_policy_accepted,
      });

      if (response.success) {
        console.log('✅ Registration successful for:', userData.email);
        
        dispatch({ 
          type: 'REGISTRATION_SUCCESS', 
          payload: { 
            emailVerificationRequired: response.email_verification_required || false 
          } 
        });
        
        return {
          success: true,
          message: response.message,
          emailVerificationRequired: response.email_verification_required,
        };
      } else {
        const error = response.message || 'Registration failed';
        dispatch({ type: 'REGISTRATION_FAILURE', payload: error });
        return {
          success: false,
          message: error,
        };
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('❌ Registration error:', errorMessage);
      dispatch({ type: 'REGISTRATION_FAILURE', payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
      };
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    socialLogin,
    logout,
    logoutAll,
    refreshToken,
    clearError,
    updateUser,
    checkAuthStatus,
    clearRegistrationState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Utility function to extract error messages from Python API
function getErrorMessage(error: any): string {
  // Check if it's an ApiError from the Python client
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as ApiError;
    
    // Use the error message if available
    if (apiError.message) {
      return apiError.message;
    }
    
    // Fall back to status-based messages
    switch (apiError.status) {
      case 401:
        return 'Invalid credentials or session expired';
      case 403:
        return 'Access forbidden';
      case 404:
        return 'Service not found';
      case 422:
        return 'Invalid input data';
      case 429:
        return 'Too many requests. Please try again later';
      case 500:
        return 'Internal server error';
      default:
        return 'Network error. Please check your connection';
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

// Export Python API client for use in other parts of the app
export { pythonApiClient };

export default AuthContext;