import { Permission, Role, UserPermissions, PermissionCheck } from '../types';
import { createAuthApi } from './authApi';

export class PermissionService {
  private api;

  constructor(baseURL: string = '/api/permissions') {
    this.api = createAuthApi(baseURL);
  }

  /**
   * Get current user permissions
   */
  async getMyPermissions(module?: string): Promise<UserPermissions> {
    try {
      const params = new URLSearchParams();
      if (module) params.append('module', module);
      
      const response = await this.api.get(`/my-permissions?${params}`);
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check a single permission
   */
  async checkPermission(permission: string, module?: string): Promise<PermissionCheck> {
    try {
      const response = await this.api.post('/check-permission', {
        permission,
        module
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check multiple permissions
   */
  async checkPermissions(permissions: string[], module?: string): Promise<Record<string, PermissionCheck>> {
    try {
      const response = await this.api.post('/check-permissions', {
        permissions,
        module
      });
      return response.data.data.results;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const response = await this.api.get('/permissions');
      return response.data.data.permissions;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const response = await this.api.get('/roles');
      return response.data.data.roles;
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
export const permissionService = new PermissionService();