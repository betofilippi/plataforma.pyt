/**
 * Python Backend API Client
 * 
 * Comprehensive API client for the FastAPI Python backend with:
 * - JWT token management
 * - Request/response interceptors  
 * - Error handling and retry logic
 * - TypeScript types
 * - WebSocket support
 * - Development logging
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import { 
  PYTHON_API_URLS, 
  PYTHON_API_CONFIG, 
  getPythonAuthHeaders, 
  DEBUG_CONFIG, 
  WEBSOCKET_CONFIG,
  getEnvironment 
} from './api-config';
import type {
  // Authentication types
  UserLoginRequest,
  UserLoginResponse,
  UserRegistrationRequest,
  UserRegistrationResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  TokenValidationRequest,
  TokenValidationResponse,
  LogoutRequest,
  LogoutResponse,
  PasswordChangeRequest,
  PasswordResetRequest,
  PasswordResetResponse,
  PasswordStrengthCheck,
  PasswordStrengthResponse,
  MFASetupRequest,
  MFASetupResponse,
  MFAVerifyRequest,
  MFAVerifyResponse,
  MFADisableRequest,
  MFADisableResponse,
  MFABackupCodesResponse,
  
  // User management types
  UserCreate,
  UserUpdate,
  UserResponse,
  UserProfile,
  UserListParams,
  UserListResponse,
  UserStatistics,
  UserActivityLog,
  UserBulkOperation,
  UserBulkOperationResponse,
  UserPreferencesUpdate,
  UserPreferences,
  UserProfileDetail,
  UserProfileUpdateRequest,
  
  // Dashboard types
  DashboardCreate,
  DashboardUpdate,
  DashboardResponse,
  DashboardDetail,
  DashboardListParams,
  DashboardListResponse,
  DashboardStatistics,
  WidgetCreate,
  WidgetUpdate,
  WidgetResponse,
  KPIResponse,
  ChartResponse,
  SystemHealth,
  
  // Session management types
  SessionListResponse,
  SessionRevokeRequest,
  SessionRevokeResponse,
  
  // Common types
  StandardApiResponse,
  PaginatedResponse,
  ErrorResponse,
  ApiError,
  RequestOptions,
  HealthCheckResponse,
  MetricsResponse,
  
  // WebSocket types
  WebSocketMessage,
  WebSocketAuthMessage,
  WebSocketStatusMessage,
} from '../types/api-types';

// ================================
// API CLIENT CLASS
// ================================

class PythonApiClient {
  private axiosInstance: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;
  private websocket: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private wsHeartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
    
    if (DEBUG_CONFIG.enabled) {
      console.log('🔧 PythonApiClient initialized', {
        baseURL: PYTHON_API_URLS.base,
        environment: getEnvironment()
      });
    }
  }

  // ================================
  // INSTANCE CREATION AND SETUP
  // ================================

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: PYTHON_API_URLS.base,
      timeout: PYTHON_API_CONFIG.timeout,
      headers: PYTHON_API_CONFIG.headers,
      withCredentials: PYTHON_API_CONFIG.withCredentials,
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add auth headers
        const authHeaders = getPythonAuthHeaders();
        config.headers = { ...config.headers, ...authHeaders };

        // Add request ID for tracking (store in headers instead of metadata)
        const requestId = Math.random().toString(36).substr(2, 9);
        config.headers['X-Request-ID'] = requestId;
        config.headers['X-Request-Start'] = Date.now().toString();

        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logRequests) {
          console.log(`📤 API Request [${requestId}]`, {
            method: config.method?.toUpperCase(),
            url: config.url,
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error: AxiosError) => {
        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logErrors) {
          console.error('❌ Request interceptor error:', error);
        }
        return Promise.reject(this.createApiError(error));
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.headers?.['X-Request-ID'];
        const startTime = parseInt(response.config.headers?.['X-Request-Start'] || '0');
        const duration = Date.now() - startTime;

        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logResponses) {
          console.log(`📥 API Response [${requestId}] (${duration}ms)`, {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'];
        const startTime = parseInt(error.config?.headers?.['X-Request-Start'] || '0');
        const duration = Date.now() - startTime;

        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logErrors) {
          console.error(`❌ API Error [${requestId}] (${duration}ms)`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data,
          });
        }

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !error.config?.headers?.['X-Is-Retry']) {
          return this.handleUnauthorizedError(error);
        }

        return Promise.reject(this.createApiError(error));
      }
    );
  }

  // ================================
  // ERROR HANDLING
  // ================================

  private createApiError(error: AxiosError): ApiError {
    const apiError: ApiError = new Error(error.message) as ApiError;
    apiError.name = 'ApiError';
    apiError.status = error.response?.status;
    apiError.response = error.response?.data;
    apiError.originalMessage = error.message;

    // Extract error details from FastAPI response
    if (error.response?.data) {
      const data = error.response.data as any;
      if (data.message) {
        apiError.message = data.message;
      }
      if (data.code) {
        apiError.code = data.code;
      }
    }

    return apiError;
  }

  private async handleUnauthorizedError(error: AxiosError): Promise<AxiosResponse> {
    const refreshToken = localStorage.getItem('pythonRefreshToken');
    
    if (!refreshToken) {
      // No refresh token available, redirect to login
      this.clearTokens();
      window.dispatchEvent(new CustomEvent('python-auth:logout'));
      return Promise.reject(this.createApiError(error));
    }

    try {
      // Prevent multiple refresh attempts
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken(refreshToken);
      }

      const newAccessToken = await this.refreshPromise;
      this.refreshPromise = null;

      if (newAccessToken) {
        // Retry the original request with new token
        const originalRequest = error.config!;
        originalRequest.headers!.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers!['X-Is-Retry'] = 'true';
        
        return this.axiosInstance(originalRequest);
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      this.clearTokens();
      window.dispatchEvent(new CustomEvent('python-auth:logout'));
    }

    return Promise.reject(this.createApiError(error));
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const response = await axios.post(
        `${PYTHON_API_URLS.auth}/refresh`,
        { refresh_token: refreshToken },
        { 
          headers: PYTHON_API_CONFIG.headers,
          timeout: PYTHON_API_CONFIG.timeout 
        }
      );

      const { tokens } = response.data as TokenRefreshResponse;
      if (tokens?.access_token) {
        localStorage.setItem('pythonAccessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('pythonRefreshToken', tokens.refresh_token);
        }
        return tokens.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  private clearTokens(): void {
    localStorage.removeItem('pythonAccessToken');
    localStorage.removeItem('pythonRefreshToken');
  }

  // ================================
  // REQUEST METHODS WITH RETRY
  // ================================

  private async request<T = any>(
    config: AxiosRequestConfig,
    options: RequestOptions = {}
  ): Promise<T> {
    const { retries = PYTHON_API_CONFIG.retries, ...axiosConfig } = options;
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance({
          ...config,
          ...axiosConfig,
          signal: options.signal,
        });
        
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain status codes
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;
          
          if (status && (status < 500 || status === 501 || status === 503)) {
            throw this.createApiError(axiosError);
          }
        }
        
        // Don't retry on last attempt
        if (attempt === retries) {
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => 
          setTimeout(resolve, PYTHON_API_CONFIG.retryDelay * Math.pow(2, attempt))
        );
      }
    }
    
    throw this.createApiError(lastError);
  }

  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'GET', url }, options);
  }

  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'POST', url, data }, options);
  }

  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data }, options);
  }

  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data }, options);
  }

  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', url }, options);
  }

  // ================================
  // AUTHENTICATION ENDPOINTS
  // ================================

  async login(credentials: UserLoginRequest, options?: RequestOptions): Promise<UserLoginResponse> {
    console.log('🔐 Attempting login to:', '/api/v1/auth/login');
    console.log('📦 Credentials:', { email: credentials.email, password: '***' });
    
    // The Python backend returns the response directly, not wrapped in StandardApiResponse
    const response = await this.post<any>(
      '/api/v1/auth/login', 
      credentials, 
      options
    );
    
    console.log('📥 Login response:', response);
    
    // The Python backend returns tokens directly, not wrapped in data
    // Check if response has the expected structure
    if (response.access_token && response.refresh_token) {
      // Transform response to expected format
      const transformedResponse: UserLoginResponse = {
        success: true,
        message: 'Login successful',
        tokens: {
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in,
        },
        user: response.user,
      };
      
      localStorage.setItem('pythonAccessToken', response.access_token);
      localStorage.setItem('pythonRefreshToken', response.refresh_token);
      
      // Emit auth event
      window.dispatchEvent(new CustomEvent('python-auth:login', { 
        detail: transformedResponse 
      }));
      
      return transformedResponse;
    }
    
    // If response already has correct structure
    if (response.data?.tokens) {
      localStorage.setItem('pythonAccessToken', response.data.tokens.access_token);
      localStorage.setItem('pythonRefreshToken', response.data.tokens.refresh_token);
      
      // Emit auth event
      window.dispatchEvent(new CustomEvent('python-auth:login', { 
        detail: response.data 
      }));
      
      return response.data!;
    }
    
    // Fallback for unexpected format
    throw new Error('Unexpected login response format');
  }

  async register(userData: UserRegistrationRequest, options?: RequestOptions): Promise<UserRegistrationResponse> {
    const response = await this.post<StandardApiResponse<UserRegistrationResponse>>(
      '/api/v1/auth/register', 
      userData, 
      options
    );
    return response.data!;
  }

  async logout(logoutData?: LogoutRequest, options?: RequestOptions): Promise<LogoutResponse> {
    try {
      const refreshToken = localStorage.getItem('pythonRefreshToken');
      const response = await this.post<StandardApiResponse<LogoutResponse>>(
        '/api/v1/auth/logout', 
        { ...logoutData, refresh_token: refreshToken }, 
        options
      );
      
      this.clearTokens();
      this.disconnectWebSocket();
      window.dispatchEvent(new CustomEvent('python-auth:logout'));
      
      return response.data!;
    } catch (error) {
      // Clear tokens even if logout fails
      this.clearTokens();
      this.disconnectWebSocket();
      window.dispatchEvent(new CustomEvent('python-auth:logout'));
      throw error;
    }
  }

  async refreshToken(refreshData: TokenRefreshRequest, options?: RequestOptions): Promise<TokenRefreshResponse> {
    const response = await this.post<StandardApiResponse<TokenRefreshResponse>>(
      '/api/v1/auth/refresh', 
      refreshData, 
      options
    );
    
    if (response.data?.tokens) {
      localStorage.setItem('pythonAccessToken', response.data.tokens.access_token);
      localStorage.setItem('pythonRefreshToken', response.data.tokens.refresh_token);
    }
    
    return response.data!;
  }

  async validateToken(tokenData: TokenValidationRequest, options?: RequestOptions): Promise<TokenValidationResponse> {
    const response = await this.post<StandardApiResponse<TokenValidationResponse>>(
      '/api/v1/auth/validate', 
      tokenData, 
      options
    );
    return response.data!;
  }

  async changePassword(passwordData: PasswordChangeRequest, options?: RequestOptions): Promise<StandardApiResponse> {
    return this.post('/api/v1/auth/change-password', passwordData, options);
  }

  async resetPassword(resetData: PasswordResetRequest, options?: RequestOptions): Promise<PasswordResetResponse> {
    const response = await this.post<StandardApiResponse<PasswordResetResponse>>(
      '/api/v1/auth/reset-password', 
      resetData, 
      options
    );
    return response.data!;
  }

  async checkPasswordStrength(passwordData: PasswordStrengthCheck, options?: RequestOptions): Promise<PasswordStrengthResponse> {
    const response = await this.post<StandardApiResponse<PasswordStrengthResponse>>(
      '/api/v1/auth/password-strength', 
      passwordData, 
      options
    );
    return response.data!;
  }

  // ================================
  // MFA ENDPOINTS
  // ================================

  async setupMFA(mfaData: MFASetupRequest, options?: RequestOptions): Promise<MFASetupResponse> {
    const response = await this.post<StandardApiResponse<MFASetupResponse>>(
      '/api/v1/auth/mfa/setup', 
      mfaData, 
      options
    );
    return response.data!;
  }

  async verifyMFA(verifyData: MFAVerifyRequest, options?: RequestOptions): Promise<MFAVerifyResponse> {
    const response = await this.post<StandardApiResponse<MFAVerifyResponse>>(
      '/api/v1/auth/mfa/verify', 
      verifyData, 
      options
    );
    return response.data!;
  }

  async disableMFA(disableData: MFADisableRequest, options?: RequestOptions): Promise<MFADisableResponse> {
    const response = await this.post<StandardApiResponse<MFADisableResponse>>(
      '/api/v1/auth/mfa/disable', 
      disableData, 
      options
    );
    return response.data!;
  }

  async generateMFABackupCodes(options?: RequestOptions): Promise<MFABackupCodesResponse> {
    const response = await this.post<StandardApiResponse<MFABackupCodesResponse>>(
      '/api/v1/auth/mfa/backup-codes', 
      {}, 
      options
    );
    return response.data!;
  }

  // ================================
  // USER PROFILE ENDPOINTS
  // ================================

  async getProfile(options?: RequestOptions): Promise<UserProfileDetail> {
    const response = await this.get<StandardApiResponse<UserProfileDetail>>(
      '/api/v1/auth/profile', 
      options
    );
    return response.data!;
  }

  async updateProfile(profileData: UserProfileUpdateRequest, options?: RequestOptions): Promise<UserProfileDetail> {
    const response = await this.put<StandardApiResponse<UserProfileDetail>>(
      '/api/v1/auth/profile', 
      profileData, 
      options
    );
    return response.data!;
  }

  async getUserPreferences(options?: RequestOptions): Promise<UserPreferences> {
    const response = await this.get<StandardApiResponse<UserPreferences>>(
      '/api/v1/auth/preferences', 
      options
    );
    return response.data!;
  }

  async updateUserPreferences(preferencesData: UserPreferencesUpdate, options?: RequestOptions): Promise<UserPreferences> {
    const response = await this.put<StandardApiResponse<UserPreferences>>(
      '/api/v1/auth/preferences', 
      preferencesData, 
      options
    );
    return response.data!;
  }

  // ================================
  // SESSION MANAGEMENT ENDPOINTS
  // ================================

  async getSessions(options?: RequestOptions): Promise<SessionListResponse> {
    const response = await this.get<StandardApiResponse<SessionListResponse>>(
      '/api/v1/auth/sessions', 
      options
    );
    return response.data!;
  }

  async revokeSessions(revokeData: SessionRevokeRequest, options?: RequestOptions): Promise<SessionRevokeResponse> {
    const response = await this.post<StandardApiResponse<SessionRevokeResponse>>(
      '/api/v1/auth/sessions/revoke', 
      revokeData, 
      options
    );
    return response.data!;
  }

  // ================================
  // USER MANAGEMENT ENDPOINTS (ADMIN)
  // ================================

  async getUsers(params?: UserListParams, options?: RequestOptions): Promise<UserListResponse> {
    const response = await this.get<StandardApiResponse<UserListResponse>>(
      '/api/v1/users', 
      { ...options, params }
    );
    return response.data!;
  }

  async getUser(userId: string, options?: RequestOptions): Promise<UserResponse> {
    const response = await this.get<StandardApiResponse<UserResponse>>(
      `/api/v1/users/${userId}`, 
      options
    );
    return response.data!;
  }

  async createUser(userData: UserCreate, options?: RequestOptions): Promise<UserResponse> {
    const response = await this.post<StandardApiResponse<UserResponse>>(
      '/api/v1/users', 
      userData, 
      options
    );
    return response.data!;
  }

  async updateUser(userId: string, userData: UserUpdate, options?: RequestOptions): Promise<UserResponse> {
    const response = await this.put<StandardApiResponse<UserResponse>>(
      `/api/v1/users/${userId}`, 
      userData, 
      options
    );
    return response.data!;
  }

  async deleteUser(userId: string, options?: RequestOptions): Promise<StandardApiResponse> {
    return this.delete(`/api/v1/users/${userId}`, options);
  }

  async getUserStatistics(options?: RequestOptions): Promise<UserStatistics> {
    const response = await this.get<StandardApiResponse<UserStatistics>>(
      '/api/v1/users/statistics', 
      options
    );
    return response.data!;
  }

  async bulkUserOperation(operation: UserBulkOperation, options?: RequestOptions): Promise<UserBulkOperationResponse> {
    const response = await this.post<StandardApiResponse<UserBulkOperationResponse>>(
      '/api/v1/users/bulk', 
      operation, 
      options
    );
    return response.data!;
  }

  // ================================
  // DASHBOARD ENDPOINTS
  // ================================

  async getDashboards(params?: DashboardListParams, options?: RequestOptions): Promise<DashboardListResponse> {
    const response = await this.get<StandardApiResponse<DashboardListResponse>>(
      '/api/v1/dashboard', 
      { ...options, params }
    );
    return response.data!;
  }

  async getDashboard(dashboardId: string, options?: RequestOptions): Promise<DashboardDetail> {
    const response = await this.get<StandardApiResponse<DashboardDetail>>(
      `/api/v1/dashboard/${dashboardId}`, 
      options
    );
    return response.data!;
  }

  async createDashboard(dashboardData: DashboardCreate, options?: RequestOptions): Promise<DashboardResponse> {
    const response = await this.post<StandardApiResponse<DashboardResponse>>(
      '/api/v1/dashboard', 
      dashboardData, 
      options
    );
    return response.data!;
  }

  async updateDashboard(dashboardId: string, dashboardData: DashboardUpdate, options?: RequestOptions): Promise<DashboardResponse> {
    const response = await this.put<StandardApiResponse<DashboardResponse>>(
      `/api/v1/dashboard/${dashboardId}`, 
      dashboardData, 
      options
    );
    return response.data!;
  }

  async deleteDashboard(dashboardId: string, options?: RequestOptions): Promise<StandardApiResponse> {
    return this.delete(`/api/v1/dashboard/${dashboardId}`, options);
  }

  async getDashboardStatistics(options?: RequestOptions): Promise<DashboardStatistics> {
    const response = await this.get<StandardApiResponse<DashboardStatistics>>(
      '/api/v1/dashboard/statistics', 
      options
    );
    return response.data!;
  }

  async getDashboardKPIs(dashboardId: string, options?: RequestOptions): Promise<KPIResponse> {
    const response = await this.get<StandardApiResponse<KPIResponse>>(
      `/api/v1/dashboard/${dashboardId}/kpis`, 
      options
    );
    return response.data!;
  }

  async getDashboardChart(dashboardId: string, chartType: string, options?: RequestOptions): Promise<ChartResponse> {
    const response = await this.get<StandardApiResponse<ChartResponse>>(
      `/api/v1/dashboard/${dashboardId}/chart/${chartType}`, 
      options
    );
    return response.data!;
  }

  // ================================
  // WIDGET ENDPOINTS
  // ================================

  async createWidget(widgetData: WidgetCreate, options?: RequestOptions): Promise<WidgetResponse> {
    const response = await this.post<StandardApiResponse<WidgetResponse>>(
      '/api/v1/dashboard/widgets', 
      widgetData, 
      options
    );
    return response.data!;
  }

  async updateWidget(widgetId: string, widgetData: WidgetUpdate, options?: RequestOptions): Promise<WidgetResponse> {
    const response = await this.put<StandardApiResponse<WidgetResponse>>(
      `/api/v1/dashboard/widgets/${widgetId}`, 
      widgetData, 
      options
    );
    return response.data!;
  }

  async deleteWidget(widgetId: string, options?: RequestOptions): Promise<StandardApiResponse> {
    return this.delete(`/api/v1/dashboard/widgets/${widgetId}`, options);
  }

  // ================================
  // HEALTH CHECK ENDPOINTS
  // ================================

  async getHealth(options?: RequestOptions): Promise<HealthCheckResponse> {
    return this.get('/health', options);
  }

  async getDetailedHealth(options?: RequestOptions): Promise<HealthCheckResponse> {
    return this.get('/health/detailed', options);
  }

  async getMetrics(options?: RequestOptions): Promise<MetricsResponse> {
    return this.get('/metrics', options);
  }

  async getSystemHealth(options?: RequestOptions): Promise<SystemHealth> {
    const response = await this.get<StandardApiResponse<SystemHealth>>(
      '/api/v1/system/health', 
      options
    );
    return response.data!;
  }

  // ================================
  // WEBSOCKET CONNECTION
  // ================================

  connectWebSocket(onMessage?: (message: WebSocketMessage) => void, onStatusChange?: (status: WebSocketStatusMessage) => void): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const token = localStorage.getItem('pythonAccessToken');
    if (!token) {
      console.warn('No access token available for WebSocket connection');
      return;
    }

    const wsUrl = `${PYTHON_API_URLS.websocket}?token=${token}`;
    
    try {
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        this.wsReconnectAttempts = 0;
        this.startHeartbeat();
        
        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logWebSocket) {
          console.log('🔗 WebSocket connected to Python backend');
        }
        
        onStatusChange?.({ 
          status: 'connected', 
          message: 'Connected to Python backend' 
        });
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logWebSocket) {
            console.log('📨 WebSocket message:', message);
          }
          
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      this.websocket.onclose = (event) => {
        this.stopHeartbeat();
        
        if (DEBUG_CONFIG.enabled && DEBUG_CONFIG.logWebSocket) {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        }
        
        onStatusChange?.({ 
          status: 'disconnected', 
          message: `WebSocket disconnected: ${event.reason || 'Unknown reason'}` 
        });
        
        // Attempt reconnection
        if (this.wsReconnectAttempts < WEBSOCKET_CONFIG.reconnectAttempts) {
          this.wsReconnectAttempts++;
          setTimeout(() => {
            this.connectWebSocket(onMessage, onStatusChange);
          }, WEBSOCKET_CONFIG.reconnectDelay);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatusChange?.({ 
          status: 'error', 
          message: 'WebSocket connection error' 
        });
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      onStatusChange?.({ 
        status: 'error', 
        message: 'Failed to create WebSocket connection' 
      });
    }
  }

  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.stopHeartbeat();
  }

  sendWebSocketMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  private startHeartbeat(): void {
    this.wsHeartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }));
      }
    }, WEBSOCKET_CONFIG.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.wsHeartbeatInterval) {
      clearInterval(this.wsHeartbeatInterval);
      this.wsHeartbeatInterval = null;
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  isAuthenticated(): boolean {
    return !!localStorage.getItem('pythonAccessToken');
  }

  getCurrentUser(): UserProfileSummary | null {
    const userStr = localStorage.getItem('pythonCurrentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  setCurrentUser(user: UserProfileSummary | null): void {
    if (user) {
      localStorage.setItem('pythonCurrentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('pythonCurrentUser');
    }
  }

  getTokenExpirationTime(): Date | null {
    const token = localStorage.getItem('pythonAccessToken');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const expTime = this.getTokenExpirationTime();
    return expTime ? expTime.getTime() <= Date.now() : true;
  }

  // Get the axios instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// ================================
// SINGLETON INSTANCE
// ================================

export const pythonApiClient = new PythonApiClient();
export default pythonApiClient;

// ================================
// CONVENIENCE EXPORTS
// ================================

export {
  PythonApiClient,
  type UserLoginRequest,
  type UserLoginResponse,
  type UserRegistrationRequest,
  type UserRegistrationResponse,
  type UserProfileDetail,
  type DashboardResponse,
  type DashboardDetail,
  type StandardApiResponse,
  type ApiError,
  type RequestOptions,
};