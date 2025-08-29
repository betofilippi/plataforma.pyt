import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  memo,
  ReactNode,
} from "react";
import { usePerformanceTracking, performanceMonitor } from '@/lib/performance-utils';
import { useSessionManager, WindowSessionData } from '@/lib/session-manager';
import { useAuth } from '@/contexts/AuthContext';
import { createComponentFromSession } from '@/lib/component-registry';

export interface WindowState {
  id: string;
  title: string;
  component: ReactNode;
  componentType?: string; // Type identifier for session restoration
  componentData?: Record<string, any>; // Component state for session persistence
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isVisible: boolean;
  icon?: string;
  canResize: boolean;
  canMove: boolean;
  previousPosition?: { x: number; y: number };
  previousSize?: { width: number; height: number };
  snapPosition?: 'left' | 'right' | 'top' | 'bottom' | null;
}

export interface WindowManagerContextType {
  windows: WindowState[];
  activeWindowId: string | null;
  createWindow: (
    config: Omit<WindowState, "id" | "zIndex" | "isVisible">,
  ) => string;
  createWindowWithType: (
    title: string,
    component: ReactNode,
    componentType: string,
    options?: {
      position?: { x: number; y: number };
      size?: { width: number; height: number };
      icon?: string;
      canResize?: boolean;
      canMove?: boolean;
      componentData?: Record<string, any>;
    }
  ) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindow: (id: string, updates: Partial<WindowState>) => void;
  getNextZIndex: () => number;
  snapWindowLeft: (id: string) => void;
  snapWindowRight: (id: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(
  null,
);

interface WindowManagerProviderProps {
  children: ReactNode;
}

export const WindowManagerProvider = memo(function WindowManagerProvider({
  children,
}: WindowManagerProviderProps) {
  usePerformanceTracking('WindowManagerProvider');
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [highestZIndex, setHighestZIndex] = useState(1000);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  
  const { user } = useAuth();
  const sessionManager = useSessionManager(user?.id || null);

  // Load session data when user is available
  useEffect(() => {
    if (!user?.id || sessionLoaded) return;
    
    const loadUserSession = async () => {
      try {
        const session = await sessionManager.loadSession(user.id);
        if (session) {
          console.log('Loading user session:', session);
          
          // Restore windows from session with recreated components
          const restoredWindows: WindowState[] = session.windowsState.map((windowData: WindowSessionData) => {
            // Recreate the React component from session data
            const restoredComponent = createComponentFromSession(
              windowData.componentType,
              {
                windowId: windowData.id,
                savedState: windowData.componentData,
                initialProps: {}
              }
            );

            return {
              id: windowData.id,
              title: windowData.title,
              component: restoredComponent,
              componentType: windowData.componentType,
              componentData: windowData.componentData,
              position: windowData.position,
              size: windowData.size,
              zIndex: windowData.zIndex,
              isMinimized: windowData.isMinimized,
              isMaximized: windowData.isMaximized,
              isVisible: windowData.isVisible,
              icon: windowData.icon,
              canResize: windowData.canResize,
              canMove: windowData.canMove,
              snapPosition: windowData.snapPosition,
            };
          });
          
          // Only set non-empty windows to avoid clearing current state unnecessarily
          if (restoredWindows.length > 0) {
            setWindows(restoredWindows);
          }
          
          setActiveWindowId(session.appState.activeWindowId);
          setHighestZIndex(session.appState.highestZIndex);
        }
        setSessionLoaded(true);
      } catch (error) {
        console.error('Failed to load user session:', error);
        setSessionLoaded(true);
      }
    };
    
    loadUserSession();
  }, [user?.id, sessionLoaded, sessionManager]);

  // Save window states using session manager when they change
  useEffect(() => {
    if (!user?.id || !sessionLoaded || windows.length === 0) return;
    
    // Use session manager to save window states
    sessionManager.updateWindowsState(windows, activeWindowId, highestZIndex);
  }, [windows, activeWindowId, highestZIndex, user?.id, sessionLoaded, sessionManager]);

  const getNextZIndex = useCallback(() => {
    setHighestZIndex((prev) => prev + 1);
    return highestZIndex + 1;
  }, [highestZIndex]);

  const createWindow = useCallback(
    (config: Omit<WindowState, "id" | "zIndex" | "isVisible">) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newWindow: WindowState = {
        ...config,
        id,
        zIndex: getNextZIndex(),
        isVisible: true,
      };
      
      console.log("Creating window:", newWindow);
      setWindows((prev) => {
        const updated = [...prev, newWindow];
        console.log("Windows after create:", updated.length);
        return updated;
      });
      setActiveWindowId(id);
      return id;
    },
    [getNextZIndex],
  );

  const createWindowWithType = useCallback(
    (title: string, component: ReactNode, componentType: string, options = {}) => {
      const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newWindow: WindowState = {
        id,
        title,
        component,
        componentType,
        componentData: options.componentData || {},
        position: options.position || { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
        size: options.size || { width: 800, height: 600 },
        zIndex: getNextZIndex(),
        isMinimized: false,
        isMaximized: false,
        isVisible: true,
        icon: options.icon,
        canResize: options.canResize ?? true,
        canMove: options.canMove ?? true,
      };
      
      console.log("Creating window with type:", newWindow);
      setWindows((prev) => {
        const updated = [...prev, newWindow];
        console.log("Windows after create:", updated.length);
        return updated;
      });
      setActiveWindowId(id);
      return id;
    },
    [getNextZIndex],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setActiveWindowId((prev) => (prev === id ? null : prev));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    console.log("MINIMIZE FUNCTION CALLED for ID:", id);
    setWindows((prev) => {
      const updated = prev.map((w) =>
        w.id === id 
          ? { 
              ...w, 
              isMinimized: true, 
              previousPosition: w.position, 
              previousSize: w.size 
            }
          : w
      );
      console.log("Windows after minimize:", updated);
      return updated;
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              isMaximized: !w.isMaximized,
              previousPosition: w.isMaximized ? w.previousPosition : w.position,
              previousSize: w.isMaximized ? w.previousSize : w.size,
              position: w.isMaximized 
                ? (w.previousPosition || { x: 100, y: 100 }) 
                : { x: 0, y: 0 },
              size: w.isMaximized
                ? (w.previousSize || { width: 800, height: 600 })
                : { width: window.innerWidth, height: window.innerHeight - 60 },
              snapPosition: null,
              isMinimized: false,
            }
          : w,
      ),
    );
  }, []);

  const restoreWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id 
          ? { 
              ...w, 
              isMinimized: false,
              position: w.previousPosition || w.position,
              size: w.previousSize || w.size,
              zIndex: getNextZIndex(),
            } 
          : w,
      ),
    );
    setActiveWindowId(id);
  }, [getNextZIndex]);

  const snapWindowLeft = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              position: { x: 0, y: 0 },
              size: { width: window.innerWidth / 2, height: window.innerHeight - 60 },
              isMaximized: false,
              snapPosition: 'left',
              previousPosition: w.snapPosition ? w.previousPosition : w.position,
              previousSize: w.snapPosition ? w.previousSize : w.size,
            }
          : w,
      ),
    );
  }, []);

  const snapWindowRight = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? {
              ...w,
              position: { x: window.innerWidth / 2, y: 0 },
              size: { width: window.innerWidth / 2, height: window.innerHeight - 60 },
              isMaximized: false,
              snapPosition: 'right',
              previousPosition: w.snapPosition ? w.previousPosition : w.position,
              previousSize: w.snapPosition ? w.previousSize : w.size,
            }
          : w,
      ),
    );
  }, []);

  const focusWindow = useCallback(
    (id: string) => {
      const newZIndex = getNextZIndex();
      setWindows((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, zIndex: newZIndex, isMinimized: false } : w,
        ),
      );
      setActiveWindowId(id);
    },
    [getNextZIndex],
  );

  const updateWindow = useCallback(
    (id: string, updates: Partial<WindowState>) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      );
    },
    [],
  );

  const value: WindowManagerContextType = useMemo(() => ({
    windows,
    activeWindowId,
    createWindow,
    createWindowWithType,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindow,
    getNextZIndex,
    snapWindowLeft,
    snapWindowRight,
  }), [
    windows,
    activeWindowId,
    createWindow,
    createWindowWithType,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindow,
    getNextZIndex,
    snapWindowLeft,
    snapWindowRight,
  ]);

  return (
    <WindowManagerContext.Provider value={value}>
      {children}
    </WindowManagerContext.Provider>
  );
});

export function useWindowManager() {
  const context = useContext(WindowManagerContext);
  if (!context) {
    throw new Error(
      "useWindowManager must be used within a WindowManagerProvider",
    );
  }
  return context;
}

// Hook para criação simplificada de janelas
export function useCreateWindow() {
  const { createWindow } = useWindowManager();

  return useCallback(
    (
      title: string,
      component: ReactNode,
      options?: Partial<
        Pick<
          WindowState,
          "position" | "size" | "canResize" | "canMove" | "icon"
        >
      >,
    ) => {
      // Ensure position values are valid numbers
      const defaultPosition = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      };
      const position = options?.position || defaultPosition;
      const safePosition = {
        x: isNaN(position.x) ? defaultPosition.x : position.x,
        y: isNaN(position.y) ? defaultPosition.y : position.y,
      };

      // Ensure size values are valid numbers
      const defaultSize = { width: 800, height: 600 };
      const size = options?.size || defaultSize;
      const safeSize = {
        width: isNaN(size.width) ? defaultSize.width : size.width,
        height: isNaN(size.height) ? defaultSize.height : size.height,
      };

      return createWindow({
        title,
        component,
        position: safePosition,
        size: safeSize,
        isMinimized: false,
        isMaximized: false,
        canResize: options?.canResize ?? true,
        canMove: options?.canMove ?? true,
        icon: options?.icon,
      });
    },
    [createWindow],
  );
}
