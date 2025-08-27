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

export interface WindowState {
  id: string;
  title: string;
  component: ReactNode;
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

  // Load persisted window states on mount
  useEffect(() => {
    const savedWindows = localStorage.getItem("planilha_windows_state");
    if (savedWindows) {
      try {
        const parsedWindows = JSON.parse(savedWindows);
        // Only restore position and size, not content
        setWindows((prev) =>
          prev.map((window) => {
            const saved = parsedWindows.find(
              (w: any) => w.title === window.title,
            );
            return saved
              ? {
                  ...window,
                  position: saved.position,
                  size: saved.size,
                  isMinimized: saved.isMinimized,
                }
              : window;
          }),
        );
      } catch (error) {
        console.warn("Failed to load window states:", error);
      }
    }
  }, []);

  // Save window states when they change
  useEffect(() => {
    if (windows.length > 0) {
      const windowStates = windows.map((w) => ({
        title: w.title,
        position: w.position,
        size: w.size,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
      }));
      localStorage.setItem(
        "planilha_windows_state",
        JSON.stringify(windowStates),
      );
    }
  }, [windows]);

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
