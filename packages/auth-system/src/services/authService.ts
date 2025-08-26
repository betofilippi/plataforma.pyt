import { LoginCredentials, AuthResponse, RefreshTokenResponse, User } from '../types';
import { createAuthApi } from './authApi';

export class AuthService {
  private api;

  constructor(baseURL: string = '/api/auth') {
    this.api = createAuthApi(baseURL);
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Logout from current session
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/logout');
    } catch (error) {
      // Logout should always succeed locally even if API fails
      console.warn('Logout API call failed:', error);
    }
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(): Promise<void> {
    try {
      await this.api.post('/logout-all');
    } catch (error) {
      console.warn('Logout all API call failed:', error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const response = await this.api.post('/refresh');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<{ user: User }> {
    try {
      const response = await this.api.get('/profile');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    try {
      const response = await this.api.patch('/profile', updates);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> {
    try {
      await this.api.post('/change-password', data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(): Promise<any[]> {
    try {
      const response = await this.api.get('/sessions');
      return response.data.data.sessions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Verify current token
   */
  async verifyToken(): Promise<{ user: User }> {
    try {
      const response = await this.api.get('/verify');
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error('An unexpected error occurred');
  }
}

// Create default instance
export const authService = new AuthService();