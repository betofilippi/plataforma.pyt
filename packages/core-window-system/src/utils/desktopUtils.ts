import type { DesktopState, WindowState } from '@plataforma/types';

// Desktop utility functions
export const desktopUtils = {
  /**
   * Create empty desktop state
   */
  createEmptyDesktop(): DesktopState {
    return {
      windows: [],
      activeWindowId: null,
      nextZIndex: 1000,
    };
  },

  /**
   * Calculate desktop statistics
   */
  calculateDesktopStats(desktop: DesktopState) {
    const windows = desktop.windows;
    const openWindows = windows.filter(w => w.isOpen);
    const minimizedWindows = windows.filter(w => w.isMinimized);
    const maximizedWindows = windows.filter(w => w.isMaximized);
    
    return {
      total: windows.length,
      open: openWindows.length,
      minimized: minimizedWindows.length,
      maximized: maximizedWindows.length,
      active: desktop.activeWindowId,
      highestZIndex: Math.max(...windows.map(w => w.zIndex), 0),
    };
  },

  /**
   * Get desktop occupancy rate (0-1)
   */
  getDesktopOccupancy(
    desktop: DesktopState,
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): number {
    const openWindows = desktop.windows.filter(w => w.isOpen && !w.isMinimized);
    const totalDesktopArea = viewport.width * viewport.height;
    
    const occupiedArea = openWindows.reduce((total, window) => {
      return total + (window.size.width * window.size.height);
    }, 0);
    
    return Math.min(1, occupiedArea / totalDesktopArea);
  },

  /**
   * Find optimal position for new window avoiding overlaps
   */
  findOptimalWindowPosition(
    desktop: DesktopState,
    windowSize: { width: number; height: number },
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): { x: number; y: number } {
    const margin = 50;
    const step = 40;
    const openWindows = desktop.windows.filter(w => w.isOpen && !w.isMinimized);
    
    // Try grid positions
    for (let y = margin; y <= viewport.height - windowSize.height - margin; y += step) {
      for (let x = margin; x <= viewport.width - windowSize.width - margin; x += step) {
        const testPosition = { x, y };
        
        // Check if this position overlaps with any existing window
        const overlaps = openWindows.some(window => {
          return (
            testPosition.x < window.position.x + window.size.width &&
            testPosition.x + windowSize.width > window.position.x &&
            testPosition.y < window.position.y + window.size.height &&
            testPosition.y + windowSize.height > window.position.y
          );
        });
        
        if (!overlaps) {
          return testPosition;
        }
      }
    }
    
    // Fallback to cascade positioning
    const cascadeOffset = openWindows.length * 30;
    return {
      x: margin + cascadeOffset,
      y: margin + cascadeOffset,
    };
  },

  /**
   * Get windows grouped by module
   */
  getWindowsByModule(desktop: DesktopState): Record<string, WindowState[]> {
    const windowsByModule: Record<string, WindowState[]> = {};
    
    desktop.windows.forEach(window => {
      const moduleId = window.moduleId || 'unknown';
      if (!windowsByModule[moduleId]) {
        windowsByModule[moduleId] = [];
      }
      windowsByModule[moduleId].push(window);
    });
    
    return windowsByModule;
  },

  /**
   * Check if desktop is cluttered (too many windows)
   */
  isDesktopCluttered(desktop: DesktopState): boolean {
    const stats = this.calculateDesktopStats(desktop);
    const occupancy = this.getDesktopOccupancy(desktop);
    
    return stats.open > 8 || occupancy > 0.7;
  },

  /**
   * Suggest window management actions
   */
  suggestWindowActions(desktop: DesktopState): Array<{
    type: 'minimize' | 'close' | 'tile' | 'organize';
    windowIds?: string[];
    reason: string;
  }> {
    const suggestions = [];
    const stats = this.calculateDesktopStats(desktop);
    
    // Too many open windows
    if (stats.open > 10) {
      const oldestWindows = desktop.windows
        .filter(w => w.isOpen)
        .sort((a, b) => a.zIndex - b.zIndex)
        .slice(0, stats.open - 8)
        .map(w => w.id);
      
      suggestions.push({
        type: 'minimize' as const,
        windowIds: oldestWindows,
        reason: 'Too many open windows. Consider minimizing older windows.',
      });
    }
    
    // High occupancy rate
    const occupancy = this.getDesktopOccupancy(desktop);
    if (occupancy > 0.8) {
      suggestions.push({
        type: 'tile' as const,
        reason: 'Desktop is crowded. Consider using window tiling.',
      });
    }
    
    // Overlapping windows
    const overlappingPairs = this.findOverlappingWindows(desktop);
    if (overlappingPairs.length > 3) {
      suggestions.push({
        type: 'organize' as const,
        reason: 'Many windows are overlapping. Consider reorganizing the desktop.',
      });
    }
    
    return suggestions;
  },

  /**
   * Find overlapping window pairs
   */
  findOverlappingWindows(desktop: DesktopState): Array<[WindowState, WindowState]> {
    const openWindows = desktop.windows.filter(w => w.isOpen && !w.isMinimized && !w.isMaximized);
    const overlappingPairs: Array<[WindowState, WindowState]> = [];
    
    for (let i = 0; i < openWindows.length; i++) {
      for (let j = i + 1; j < openWindows.length; j++) {
        const window1 = openWindows[i];
        const window2 = openWindows[j];
        
        // Check if windows overlap
        if (
          window1.position.x < window2.position.x + window2.size.width &&
          window1.position.x + window1.size.width > window2.position.x &&
          window1.position.y < window2.position.y + window2.size.height &&
          window1.position.y + window1.size.height > window2.position.y
        ) {
          overlappingPairs.push([window1, window2]);
        }
      }
    }
    
    return overlappingPairs;
  },

  /**
   * Auto-arrange windows in a grid
   */
  autoArrangeWindows(
    desktop: DesktopState,
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): Array<{ windowId: string; position: { x: number; y: number }; size: { width: number; height: number } }> {
    const openWindows = desktop.windows.filter(w => w.isOpen && !w.isMinimized);
    
    if (openWindows.length === 0) return [];
    
    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(openWindows.length));
    const rows = Math.ceil(openWindows.length / cols);
    
    const taskbarHeight = 60;
    const margin = 10;
    const availableWidth = viewport.width - (margin * (cols + 1));
    const availableHeight = viewport.height - taskbarHeight - (margin * (rows + 1));
    
    const windowWidth = Math.floor(availableWidth / cols);
    const windowHeight = Math.floor(availableHeight / rows);
    
    const arrangements: Array<{ windowId: string; position: { x: number; y: number }; size: { width: number; height: number } }> = [];
    
    openWindows.forEach((window, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const x = margin + (col * (windowWidth + margin));
      const y = margin + (row * (windowHeight + margin));
      
      arrangements.push({
        windowId: window.id,
        position: { x, y },
        size: { width: windowWidth, height: windowHeight },
      });
    });
    
    return arrangements;
  },

  /**
   * Save desktop state to storage
   */
  saveDesktopState(desktop: DesktopState, key = 'plataforma_desktop_state'): boolean {
    try {
      const stateToSave = {
        windows: desktop.windows.map(w => ({
          id: w.id,
          title: w.title,
          moduleId: w.moduleId,
          position: w.position,
          size: w.size,
          isMinimized: w.isMinimized,
          isMaximized: w.isMaximized,
          zIndex: w.zIndex,
        })),
        activeWindowId: desktop.activeWindowId,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(key, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.warn('Failed to save desktop state:', error);
      return false;
    }
  },

  /**
   * Load desktop state from storage
   */
  loadDesktopState(key = 'plataforma_desktop_state'): Partial<DesktopState> | null {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // Validate the loaded state
      if (!parsed.windows || !Array.isArray(parsed.windows)) {
        return null;
      }
      
      return {
        windows: parsed.windows,
        activeWindowId: parsed.activeWindowId,
        nextZIndex: Math.max(...parsed.windows.map((w: any) => w.zIndex || 0), 1000) + 1,
      };
    } catch (error) {
      console.warn('Failed to load desktop state:', error);
      return null;
    }
  },
};