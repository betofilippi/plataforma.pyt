/**
 * Session Manager - Sistema completo de persistência de sessão por usuário
 * Salva e restaura TUDO: janelas, posições, estados, componentes, rotas
 */

import { useCallback, useEffect, useRef } from 'react';
import pythonApiClient from './python-api-client';
import type { WindowState } from '@/components/windows/WindowManager';

// ====================================================================
// TYPES & INTERFACES
// ====================================================================

export interface WindowSessionData {
  id: string;
  componentType: WindowComponentType;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isVisible: boolean;
  componentData?: Record<string, any>; // Estado interno do componente
  icon?: string;
  canResize: boolean;
  canMove: boolean;
  snapPosition?: 'left' | 'right' | 'top' | 'bottom' | null;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  timestamp: number;
  version: string; // Para compatibilidade de versões
  currentRoute: string;
  windowsState: WindowSessionData[];
  appState: {
    activeWindowId: string | null;
    desktopView: 'dashboard' | 'sistema' | string;
    highestZIndex: number;
    userPreferences?: Record<string, any>;
  };
  metadata: {
    deviceInfo?: string;
    browserInfo?: string;
    screenResolution?: string;
    createdAt: number;
    updatedAt: number;
  };
}

export type WindowComponentType = 
  | 'UserManagement' 
  | 'DesignSystemShowcase' 
  | 'WindowTemplate'
  | 'CustomComponent';

export interface ComponentRegistryEntry {
  type: WindowComponentType;
  component: React.ComponentType<any>;
  defaultProps?: Record<string, any>;
  stateExtractor?: (component: any) => Record<string, any>;
  stateInjector?: (props: any, savedState: Record<string, any>) => any;
}

// ====================================================================
// COMPONENT REGISTRY
// ====================================================================

const componentRegistry = new Map<WindowComponentType, ComponentRegistryEntry>();

export function registerWindowComponent(entry: ComponentRegistryEntry) {
  componentRegistry.set(entry.type, entry);
}

export function getRegisteredComponent(type: WindowComponentType): ComponentRegistryEntry | undefined {
  return componentRegistry.get(type);
}

// ====================================================================
// SESSION STORAGE UTILITIES
// ====================================================================

const SESSION_STORAGE_KEY = 'plataforma_user_session';
const SESSION_VERSION = '1.0.0';
const AUTO_SAVE_DELAY = 3000; // 3 segundos de debounce
const MAX_SESSION_SIZE = 5 * 1024 * 1024; // 5MB max

class SessionStorage {
  // Local storage para cache rápido
  saveToLocal(session: UserSession): void {
    try {
      const compressed = this.compressSession(session);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(compressed));
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }

  loadFromLocal(): UserSession | null {
    try {
      const data = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!data) return null;
      
      const session = JSON.parse(data);
      return this.decompressSession(session);
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
      return null;
    }
  }

  // Backend storage para persistência completa
  async saveToBackend(session: UserSession): Promise<boolean> {
    try {
      const compressed = this.compressSession(session);
      const response = await pythonApiClient.post(
        `/api/users/${session.userId}/session`,
        compressed
      );
      return response.success;
    } catch (error) {
      console.error('Failed to save session to backend:', error);
      return false;
    }
  }

  async loadFromBackend(userId: string): Promise<UserSession | null> {
    try {
      const response = await pythonApiClient.get(`/api/users/${userId}/session`);
      if (!response.success || !response.data) return null;
      
      return this.decompressSession(response.data);
    } catch (error) {
      console.warn('Failed to load session from backend:', error);
      return null;
    }
  }

  async deleteFromBackend(userId: string): Promise<boolean> {
    try {
      const response = await pythonApiClient.delete(`/api/users/${userId}/session`);
      return response.success;
    } catch (error) {
      console.error('Failed to delete session from backend:', error);
      return false;
    }
  }

  // Compression para otimizar storage
  private compressSession(session: UserSession): any {
    // Remove dados desnecessários e compacta
    const compressed = {
      ...session,
      windowsState: session.windowsState.map(window => ({
        ...window,
        // Remove component React do estado
        component: undefined,
        // Mantém apenas dados essenciais
        componentData: window.componentData ? 
          this.sanitizeComponentData(window.componentData) : undefined
      }))
    };

    // Verifica tamanho
    const size = JSON.stringify(compressed).length;
    if (size > MAX_SESSION_SIZE) {
      console.warn(`Session size (${size}) exceeds maximum (${MAX_SESSION_SIZE})`);
      // Remove dados menos essenciais se muito grande
      compressed.windowsState = compressed.windowsState.map(w => ({
        ...w,
        componentData: undefined
      }));
    }

    return compressed;
  }

  private decompressSession(data: any): UserSession {
    return {
      ...data,
      version: data.version || SESSION_VERSION,
      metadata: {
        ...data.metadata,
        updatedAt: Date.now()
      }
    };
  }

  private sanitizeComponentData(data: Record<string, any>): Record<string, any> {
    // Remove funções, componentes React, objetos circulares
    const sanitized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && typeof value !== 'function' && typeof value !== 'undefined') {
        if (typeof value === 'object') {
          try {
            // Tenta serializar para detectar referências circulares
            JSON.stringify(value);
            sanitized[key] = value;
          } catch {
            // Ignora objetos com referências circulares
          }
        } else {
          sanitized[key] = value;
        }
      }
    });
    
    return sanitized;
  }

  clearLocal(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

// ====================================================================
// SESSION MANAGER HOOK
// ====================================================================

export function useSessionManager(userId: string | null) {
  const storage = useRef(new SessionStorage()).current;
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const currentSessionRef = useRef<UserSession | null>(null);

  // Cria sessão base
  const createEmptySession = useCallback((userId: string): UserSession => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      userId,
      sessionId,
      timestamp: Date.now(),
      version: SESSION_VERSION,
      currentRoute: window.location.pathname,
      windowsState: [],
      appState: {
        activeWindowId: null,
        desktopView: 'dashboard',
        highestZIndex: 1000,
        userPreferences: {}
      },
      metadata: {
        deviceInfo: navigator.userAgent,
        browserInfo: navigator.vendor,
        screenResolution: `${screen.width}x${screen.height}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    };
  }, []);

  // Salva sessão com debounce
  const saveSession = useCallback((session: UserSession, immediate = false) => {
    if (!session.userId) return;

    currentSessionRef.current = session;

    // Salva localmente imediatamente para cache
    storage.saveToLocal(session);

    // Salva no backend com debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const delay = immediate ? 0 : AUTO_SAVE_DELAY;
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await storage.saveToBackend(session);
        console.log('Session auto-saved to backend');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, delay);
  }, [storage]);

  // Carrega sessão (local primeiro, depois backend)
  const loadSession = useCallback(async (userId: string): Promise<UserSession | null> => {
    if (!userId) return null;

    // Tenta local primeiro (mais rápido)
    let session = storage.loadFromLocal();
    
    if (session && session.userId === userId) {
      console.log('Session loaded from localStorage');
      currentSessionRef.current = session;
      return session;
    }

    // Tenta backend se local não disponível ou diferente user
    session = await storage.loadFromBackend(userId);
    
    if (session) {
      console.log('Session loaded from backend');
      // Atualiza local cache
      storage.saveToLocal(session);
      currentSessionRef.current = session;
      return session;
    }

    console.log('No session found, creating new');
    return null;
  }, [storage, createEmptySession]);

  // Atualiza sessão atual
  const updateSession = useCallback((updates: Partial<UserSession>) => {
    if (!currentSessionRef.current || !userId) return;

    const updatedSession: UserSession = {
      ...currentSessionRef.current,
      ...updates,
      timestamp: Date.now(),
      metadata: {
        ...currentSessionRef.current.metadata,
        updatedAt: Date.now()
      }
    };

    saveSession(updatedSession);
  }, [userId, saveSession]);

  // Atualiza estado de janelas
  const updateWindowsState = useCallback((windows: WindowState[], activeWindowId: string | null, highestZIndex: number) => {
    if (!userId || !currentSessionRef.current) return;

    const windowsSessionData: WindowSessionData[] = windows.map(window => ({
      id: window.id,
      componentType: (window as any).componentType || 'CustomComponent',
      title: window.title,
      position: window.position,
      size: window.size,
      zIndex: window.zIndex,
      isMinimized: window.isMinimized,
      isMaximized: window.isMaximized,
      isVisible: window.isVisible,
      componentData: (window as any).componentData,
      icon: window.icon,
      canResize: window.canResize,
      canMove: window.canMove,
      snapPosition: window.snapPosition
    }));

    updateSession({
      windowsState: windowsSessionData,
      appState: {
        ...currentSessionRef.current.appState,
        activeWindowId,
        highestZIndex
      }
    });
  }, [userId, updateSession]);

  // Limpa sessão
  const clearSession = useCallback(async () => {
    if (!userId) return;

    storage.clearLocal();
    await storage.deleteFromBackend(userId);
    currentSessionRef.current = null;
  }, [userId, storage]);

  // Força salvamento imediato
  const forceSave = useCallback(() => {
    if (currentSessionRef.current) {
      saveSession(currentSessionRef.current, true);
    }
  }, [saveSession]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Salva uma última vez ao sair
      if (currentSessionRef.current) {
        storage.saveToBackend(currentSessionRef.current);
      }
    };
  }, [storage]);

  return {
    loadSession,
    updateSession,
    updateWindowsState,
    clearSession,
    forceSave,
    currentSession: currentSessionRef.current,
    createEmptySession
  };
}