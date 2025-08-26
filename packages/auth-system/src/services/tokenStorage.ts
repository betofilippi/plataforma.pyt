import { User, TokenStorage } from '../types';

const TOKEN_STORAGE_KEY = 'plataforma_access_token';
const TOKEN_EXPIRY_KEY = 'plataforma_token_expiry';
const USER_STORAGE_KEY = 'plataforma_user';

export function createTokenStorage(): TokenStorage {
  return {
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
}