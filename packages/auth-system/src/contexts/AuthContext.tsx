import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import { 
  User, 
  AuthState, 
  AuthAction, 
  AuthContextType, 
  LoginCredentials, 
  AuthResponse 
} from '../types';
import { createTokenStorage } from '../services/tokenStorage';
import { createAuthApi } from '../services/authApi';

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export function AuthProvider({ children, apiBaseUrl = '/api/auth' }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Create services
  const tokenStorage = createTokenStorage();
  const authApi = createAuthApi(apiBaseUrl);

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

  // Check authentication status on mount
  useEffect(() => {
    console.log("🔍 AuthContext - Checking auth status on mount");
    
    try {
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
        dispatch({ type: 'AUTH_FAILURE', payload: 'No valid session' });
      }
    } catch (error) {
      console.error("❌ Error checking auth status:", error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Failed to check authentication status' });
      tokenStorage.remove();
    }
  }, []);

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
    try {
      dispatch({ type: 'AUTH_START' });
      
      // This would need to be implemented based on your Supabase integration
      // For now, we'll throw an error indicating it needs implementation
      throw new Error('Social login needs to be implemented in the consuming application');
      
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
      const storedToken = tokenStorage.get();
      const storedExpiry = tokenStorage.getExpiry();
      
      console.log("📦 Stored token:", storedToken ? "exists" : "none");
      console.log("⏰ Stored expiry:", storedExpiry);

      if (!storedToken || !storedExpiry) {
        console.log("❌ No token or expiry, logging out");
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }

      if (Date.now() >= storedExpiry) {
        console.log("⏰ Token expired, clearing");
        dispatch({ type: 'AUTH_LOGOUT' });
        tokenStorage.remove();
        return;
      }

      authApi.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
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
    tokenStorage.setUser(user);
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

export { AuthContext };
export default AuthContext;