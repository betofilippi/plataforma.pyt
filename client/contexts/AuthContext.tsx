import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { API_URLS } from '@/lib/api-config';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
  metadata?: Record<string, any>;
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

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string; expiresIn: number } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_TOKEN'; payload: { accessToken: string; expiresIn: number } }
  | { type: 'AUTH_UPDATE_USER'; payload: User };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false, // Start with loading FALSE to avoid initial check issues
  error: null,
  accessToken: null,
  expiresAt: null,
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

    default:
      return state;
  }
}

// Context
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  socialLogin: (provider: 'google' | 'github' | 'discord') => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API Configuration
const API_BASE_URL = API_URLS.auth;

// Create axios instance with interceptors
const authApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for HTTP-only cookies
  timeout: 10000,
});

// Storage utilities
const TOKEN_STORAGE_KEY = 'plataforma_access_token';
const TOKEN_EXPIRY_KEY = 'plataforma_token_expiry';
const USER_STORAGE_KEY = 'plataforma_user';

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
  
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  }
};

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor to add token
    const requestInterceptor = authApi.interceptors.request.use(
      (config) => {
        if (state.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    const responseInterceptor = authApi.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If token expired, try to refresh
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          state.accessToken
        ) {
          originalRequest._retry = true;

          try {
            const refreshed = await refreshToken();
            if (refreshed && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${state.accessToken}`;
              return authApi(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            dispatch({ type: 'AUTH_LOGOUT' });
            tokenStorage.remove();
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      authApi.interceptors.request.eject(requestInterceptor);
      authApi.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken]);

  // Check authentication status on mount - SIMPLIFIED WITH ERROR HANDLING
  useEffect(() => {
    console.log("🔍 AuthContext - Checking auth status on mount");
    
    // Add try-catch to prevent white screen on errors
    try {
      // Try to restore session from localStorage
      const storedToken = tokenStorage.get();
      const storedUser = tokenStorage.getUser();
      const storedExpiry = tokenStorage.getExpiry();
      
      if (storedToken && storedUser && storedExpiry && Date.now() < storedExpiry) {
        console.log("✅ Restoring session for user:", storedUser.email);
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: storedUser,
            accessToken: storedToken,
            expiresIn: Math.floor((storedExpiry - Date.now()) / 1000),
          },
        });
      } else {
        console.log("⚠️ No valid stored session found, user needs to login");
        // Ensure auth failure is properly dispatched so login screen shows
        dispatch({ type: 'AUTH_FAILURE', payload: 'No valid session' });
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

  // Login function
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await authApi.post<AuthResponse>('/login', credentials);
      const { data } = response.data;

      if (response.data.success && data) {
        console.log("🔐 AuthContext - Login successful, user:", data.user);
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: data.user,
            accessToken: data.accessToken,
            expiresIn: data.expiresIn,
          },
        });

        // Store token and user in localStorage
        tokenStorage.set(data.accessToken);
        tokenStorage.setExpiry(Date.now() + data.expiresIn * 1000);
        tokenStorage.setUser(data.user);
        
        console.log("💾 Token and user saved to localStorage");
        
        // Set the token in axios default headers immediately
        authApi.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        
        // No need to verify profile in demo mode - we already have the user data
        
        return response.data;
      } else {
        const error = response.data.message || 'Login failed';
        dispatch({ type: 'AUTH_FAILURE', payload: error });
        return response.data;
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
        code: 'LOGIN_ERROR'
      };
    }
  }, []);

  // Social Login function
  const socialLogin = useCallback(async (provider: 'google' | 'github' | 'discord'): Promise<void> => {
    const { supabase } = await import('@/lib/supabase');
    
    try {
      dispatch({ type: 'AUTH_START' });
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }

      // OAuth redirect will happen automatically
      // No need to handle response here as the user will be redirected
      
    } catch (error: any) {
      console.error('Social login error:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: error.message || `Failed to login with ${provider}` });
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.post('/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, []);

  // Logout from all devices
  const logoutAll = useCallback(async (): Promise<void> => {
    try {
      await authApi.post('/logout-all');
    } catch (error) {
      console.error('Logout all API call failed:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.post<AuthResponse>('/refresh');
      
      if (response.data.success && response.data.data) {
        const { accessToken, expiresIn } = response.data.data;
        
        dispatch({
          type: 'AUTH_UPDATE_TOKEN',
          payload: { accessToken, expiresIn },
        });

        // Update stored token
        tokenStorage.set(accessToken);
        tokenStorage.setExpiry(Date.now() + expiresIn * 1000);
        
        // Update axios default headers
        authApi.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

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

  // Check auth status (used on app initialization)
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    console.log("🔍 checkAuthStatus called");
    
    try {
      // Check if we have a stored token
      const storedToken = tokenStorage.get();
      const storedExpiry = tokenStorage.getExpiry();
      
      console.log("📦 Stored token:", storedToken ? "exists" : "none");
      console.log("⏰ Stored expiry:", storedExpiry);

      if (!storedToken || !storedExpiry) {
        console.log("❌ No token or expiry, logging out");
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }

      // Check if token is expired
      if (Date.now() >= storedExpiry) {
        console.log("⏰ Token expired, clearing");
        // Token expired, clear it
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return;
      }

      // Token is valid! Set it in the header
      authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      // Get the saved user from localStorage
      const savedUser = tokenStorage.getUser();
      
      if (!savedUser) {
        console.log("⚠️ Token exists but no user data, clearing session");
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return;
      }
      
      console.log("✅ Valid token and user found, restoring session");
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: savedUser,
          accessToken: storedToken,
          expiresIn: Math.floor((storedExpiry - Date.now()) / 1000),
        },
      });
      
      console.log("✅ Session restored successfully with user:", savedUser.email);
    } catch (error) {
      console.error('Auth status check failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
      tokenStorage.remove();
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // Update user function
  const updateUser = useCallback((user: User) => {
    dispatch({ type: 'AUTH_UPDATE_USER', payload: user });
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    socialLogin,
    logout,
    logoutAll,
    refreshToken,
    clearError,
    updateUser,
    checkAuthStatus,
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

// Utility function to extract error messages
function getErrorMessage(error: any): string {
  if (axios.isAxiosError(error)) {
    const response = error.response;
    
    if (response?.data?.message) {
      return response.data.message;
    }
    
    switch (response?.status) {
      case 401:
        return 'Invalid credentials or session expired';
      case 403:
        return 'Access forbidden';
      case 404:
        return 'Service not found';
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

// Export auth API instance for use in other parts of the app
export { authApi };

export default AuthContext;