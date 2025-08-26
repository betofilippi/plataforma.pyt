// Client-side exports (browser-safe components only)
export * from '../types/index.js';

// Client-side security utilities
export const SecurityUtils = {
  /**
   * Generate a secure random string for client-side use
   */
  generateRandomString: (length: number = 32): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(length);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without crypto.getRandomValues
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  /**
   * Validate CSP nonce format
   */
  isValidNonce: (nonce: string): boolean => {
    return /^[A-Za-z0-9+/]{16,}={0,2}$/.test(nonce);
  },

  /**
   * Create CSP-safe inline script
   */
  createInlineScript: (code: string, nonce?: string): string => {
    const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
    return `<script${nonceAttr}>${code}</script>`;
  },

  /**
   * Create CSP-safe inline style
   */
  createInlineStyle: (css: string, nonce?: string): string => {
    const nonceAttr = nonce ? ` nonce="${nonce}"` : '';
    return `<style${nonceAttr}>${css}</style>`;
  },

  /**
   * Sanitize user input (basic XSS protection)
   */
  sanitizeInput: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Validate token format (client-side check only)
   */
  isValidTokenFormat: (token: string): boolean => {
    // Basic JWT format validation (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  },

  /**
   * Decode JWT payload (client-side, no verification)
   */
  decodeToken: (token: string): any | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if token is expired (client-side check)
   */
  isTokenExpired: (token: string): boolean => {
    const payload = SecurityUtils.decodeToken(token);
    if (!payload || !payload.exp) return true;
    
    return Date.now() >= payload.exp * 1000;
  },

  /**
   * Get token expiration date
   */
  getTokenExpiration: (token: string): Date | null => {
    const payload = SecurityUtils.decodeToken(token);
    if (!payload || !payload.exp) return null;
    
    return new Date(payload.exp * 1000);
  },

  /**
   * Validate URL against CSP rules (basic check)
   */
  validateUrl: (url: string, allowedDomains: string[]): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return allowedDomains.some(domain => {
        if (domain === '*') return true;
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          return hostname.endsWith(baseDomain);
        }
        return hostname === domain;
      });
    } catch {
      return false;
    }
  }
};

// Client-side token storage utilities
export const TokenStorage = {
  /**
   * Store token securely in localStorage
   */
  setToken: (token: string, key: string = 'auth_token'): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, token);
    }
  },

  /**
   * Get token from localStorage
   */
  getToken: (key: string = 'auth_token'): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  },

  /**
   * Remove token from localStorage
   */
  removeToken: (key: string = 'auth_token'): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  },

  /**
   * Store token securely in sessionStorage
   */
  setSessionToken: (token: string, key: string = 'session_token'): void => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(key, token);
    }
  },

  /**
   * Get token from sessionStorage
   */
  getSessionToken: (key: string = 'session_token'): string | null => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(key);
    }
    return null;
  },

  /**
   * Remove token from sessionStorage
   */
  removeSessionToken: (key: string = 'session_token'): void => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(key);
    }
  },

  /**
   * Clear all tokens
   */
  clearAll: (): void => {
    TokenStorage.removeToken();
    TokenStorage.removeSessionToken();
  }
};

// Client-side security context
export class ClientSecurityContext {
  private token: string | null = null;
  private user: any = null;
  private permissions: string[] = [];
  private roles: string[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token;
    TokenStorage.setToken(token);
    this.loadUserFromToken();
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && !SecurityUtils.isTokenExpired(this.token);
  }

  /**
   * Get current user
   */
  getUser(): any {
    return this.user;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /**
   * Get user permissions
   */
  getPermissions(): string[] {
    return [...this.permissions];
  }

  /**
   * Get user roles
   */
  getRoles(): string[] {
    return [...this.roles];
  }

  /**
   * Logout and clear all data
   */
  logout(): void {
    this.token = null;
    this.user = null;
    this.permissions = [];
    this.roles = [];
    TokenStorage.clearAll();
  }

  /**
   * Load context from storage
   */
  private loadFromStorage(): void {
    const token = TokenStorage.getToken();
    if (token && !SecurityUtils.isTokenExpired(token)) {
      this.token = token;
      this.loadUserFromToken();
    }
  }

  /**
   * Load user data from token
   */
  private loadUserFromToken(): void {
    if (!this.token) return;

    const payload = SecurityUtils.decodeToken(this.token);
    if (payload) {
      this.user = {
        id: payload.sub,
        roles: payload.roles || [],
        permissions: payload.permissions || []
      };
      this.roles = payload.roles || [];
      this.permissions = payload.permissions || [];
    }
  }
}