import { useCallback, useEffect, useState } from 'react';
import { useWindowManager } from './useWindowManager';
import type { DesktopState, WindowState } from '@plataforma/types';

interface UseDesktopOptions {
  persistState?: boolean;
  storageKey?: string;
  maxWindows?: number;
}

export function useDesktop(options: UseDesktopOptions = {}) {
  const {
    persistState = true,
    storageKey = 'plataforma_desktop_state',
    maxWindows = 20,
  } = options;

  const { windows, activeWindowId } = useWindowManager();
  const [desktopSettings, setDesktopSettings] = useState({
    wallpaper: null as string | null,
    showDesktopIcons: true,
    taskbarPosition: 'bottom' as 'top' | 'bottom',
    theme: 'system' as 'light' | 'dark' | 'system',
  });

  // Calculate desktop state
  const desktopState: DesktopState = {
    windows: windows.map(w => ({
      id: w.id,
      title: w.title,
      isOpen: !w.isMinimized && w.isVisible,
      isMinimized: w.isMinimized,
      isMaximized: w.isMaximized,
      position: w.position,
      size: w.size,
      zIndex: w.zIndex,
      moduleId: w.moduleId || 'unknown',
      component: w.component,
      props: {}
    })),
    activeWindowId,
    nextZIndex: Math.max(...windows.map(w => w.zIndex), 1000) + 1,
  };

  // Load desktop settings from storage
  useEffect(() => {
    if (persistState) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const settings = JSON.parse(saved);
          setDesktopSettings(prev => ({ ...prev, ...settings }));
        }
      } catch (error) {
        console.warn('Failed to load desktop settings:', error);
      }
    }
  }, [persistState, storageKey]);

  // Save desktop settings to storage
  useEffect(() => {
    if (persistState) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(desktopSettings));
      } catch (error) {
        console.warn('Failed to save desktop settings:', error);
      }
    }
  }, [desktopSettings, persistState, storageKey]);

  // Update desktop settings
  const updateDesktopSettings = useCallback((updates: Partial<typeof desktopSettings>) => {
    setDesktopSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Get window statistics
  const getWindowStats = useCallback(() => {
    const totalWindows = windows.length;
    const openWindows = windows.filter(w => !w.isMinimized).length;
    const minimizedWindows = windows.filter(w => w.isMinimized).length;
    const maximizedWindows = windows.filter(w => w.isMaximized).length;

    return {
      total: totalWindows,
      open: openWindows,
      minimized: minimizedWindows,
      maximized: maximizedWindows,
      canCreateMore: totalWindows < maxWindows,
    };
  }, [windows, maxWindows]);

  // Check if desktop is busy (many windows open, high activity)
  const isDesktopBusy = useCallback(() => {
    const stats = getWindowStats();
    return stats.open > 5 || stats.total > 10;
  }, [getWindowStats]);

  // Get windows by module
  const getWindowsByModule = useCallback((moduleId: string) => {
    return windows.filter(w => w.moduleId === moduleId);
  }, [windows]);

  // Get available desktop space (not covered by windows)
  const getAvailableSpace = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Simple heuristic: find largest empty area
    // This is a simplified version - could be enhanced with more sophisticated algorithms
    const occupiedAreas = windows
      .filter(w => !w.isMinimized && !w.isMaximized)
      .map(w => ({
        x: w.position.x,
        y: w.position.y,
        width: w.size.width,
        height: w.size.height,
      }));

    // Find a good position for a new window
    let bestPosition = { x: 100, y: 100 };
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      const testX = Math.random() * (viewportWidth - 800);
      const testY = Math.random() * (viewportHeight - 600);
      
      // Check if this position overlaps with existing windows
      const overlaps = occupiedAreas.some(area => 
        testX < area.x + area.width &&
        testX + 800 > area.x &&
        testY < area.y + area.height &&
        testY + 600 > area.y
      );

      if (!overlaps) {
        bestPosition = { x: testX, y: testY };
        break;
      }
      
      attempts++;
    }

    return {
      recommendedPosition: bestPosition,
      availableWidth: viewportWidth,
      availableHeight: viewportHeight,
      occupancyRate: occupiedAreas.length / maxWindows,
    };
  }, [windows, maxWindows]);

  return {
    // State
    desktopState,
    desktopSettings,
    
    // Actions
    updateDesktopSettings,
    
    // Utilities
    getWindowStats,
    isDesktopBusy,
    getWindowsByModule,
    getAvailableSpace,
  };
}