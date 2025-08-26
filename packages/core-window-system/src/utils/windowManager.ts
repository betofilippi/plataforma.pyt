import type { WindowState } from '@plataforma/types';

// Window management utilities
export const windowManager = {
  /**
   * Calculate optimal position for a new window
   */
  calculateOptimalPosition(
    existingWindows: WindowState[],
    size: { width: number; height: number },
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): { x: number; y: number } {
    const margin = 50;
    const cascade = 30;
    
    // Try cascade positioning first
    for (let i = 0; i < 10; i++) {
      const x = margin + (i * cascade);
      const y = margin + (i * cascade);
      
      // Check if this position would overlap with existing windows
      const overlaps = existingWindows.some(window => {
        if (window.isMinimized) return false;
        
        return (
          x < window.position.x + window.size.width &&
          x + size.width > window.position.x &&
          y < window.position.y + window.size.height &&
          y + size.height > window.position.y
        );
      });
      
      // If no overlap and within viewport, use this position
      if (!overlaps && 
          x + size.width <= viewport.width - margin && 
          y + size.height <= viewport.height - margin) {
        return { x, y };
      }
    }
    
    // Fallback to random position within viewport
    const maxX = Math.max(0, viewport.width - size.width - margin);
    const maxY = Math.max(0, viewport.height - size.height - margin);
    
    return {
      x: Math.random() * maxX + margin,
      y: Math.random() * maxY + margin,
    };
  },

  /**
   * Constrain window position to viewport
   */
  constrainToViewport(
    position: { x: number; y: number },
    size: { width: number; height: number },
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(position.x, viewport.width - size.width)),
      y: Math.max(0, Math.min(position.y, viewport.height - size.height - 60)), // Account for taskbar
    };
  },

  /**
   * Calculate window bounds for various snap positions
   */
  calculateSnapBounds(
    snapPosition: 'left' | 'right' | 'top' | 'bottom' | 'maximize',
    viewport = { 
      width: globalThis.window?.innerWidth || 1920, 
      height: globalThis.window?.innerHeight || 1080 
    }
  ): { position: { x: number; y: number }; size: { width: number; height: number } } {
    const taskbarHeight = 60;
    const availableHeight = viewport.height - taskbarHeight;
    
    switch (snapPosition) {
      case 'left':
        return {
          position: { x: 0, y: 0 },
          size: { width: viewport.width / 2, height: availableHeight },
        };
      
      case 'right':
        return {
          position: { x: viewport.width / 2, y: 0 },
          size: { width: viewport.width / 2, height: availableHeight },
        };
      
      case 'top':
        return {
          position: { x: 0, y: 0 },
          size: { width: viewport.width, height: availableHeight / 2 },
        };
      
      case 'bottom':
        return {
          position: { x: 0, y: availableHeight / 2 },
          size: { width: viewport.width, height: availableHeight / 2 },
        };
      
      case 'maximize':
        return {
          position: { x: 0, y: 0 },
          size: { width: viewport.width, height: availableHeight },
        };
      
      default:
        throw new Error(`Unknown snap position: ${snapPosition}`);
    }
  },

  /**
   * Generate unique window ID
   */
  generateWindowId(): string {
    return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate window state properties
   */
  validateWindowState(window: Partial<WindowState>): boolean {
    // Check required properties
    if (!window.id || !window.title) {
      return false;
    }

    // Validate position
    if (window.position) {
      if (isNaN(window.position.x) || isNaN(window.position.y)) {
        return false;
      }
    }

    // Validate size
    if (window.size) {
      if (isNaN(window.size.width) || isNaN(window.size.height)) {
        return false;
      }
      if (window.size.width <= 0 || window.size.height <= 0) {
        return false;
      }
    }

    // Validate zIndex
    if (window.zIndex !== undefined && (isNaN(window.zIndex) || window.zIndex < 0)) {
      return false;
    }

    return true;
  },

  /**
   * Get window center point
   */
  getWindowCenter(window: WindowState): { x: number; y: number } {
    return {
      x: window.position.x + window.size.width / 2,
      y: window.position.y + window.size.height / 2,
    };
  },

  /**
   * Check if two windows overlap
   */
  windowsOverlap(window1: WindowState, window2: WindowState): boolean {
    return (
      window1.position.x < window2.position.x + window2.size.width &&
      window1.position.x + window1.size.width > window2.position.x &&
      window1.position.y < window2.position.y + window2.size.height &&
      window1.position.y + window1.size.height > window2.position.y
    );
  },

  /**
   * Find windows within a specific area
   */
  findWindowsInArea(
    windows: WindowState[],
    area: { x: number; y: number; width: number; height: number }
  ): WindowState[] {
    return windows.filter(window => {
      if (window.isMinimized) return false;
      
      return (
        window.position.x < area.x + area.width &&
        window.position.x + window.size.width > area.x &&
        window.position.y < area.y + area.height &&
        window.position.y + window.size.height > area.y
      );
    });
  },

  /**
   * Sort windows by z-index (back to front)
   */
  sortWindowsByZIndex(windows: WindowState[]): WindowState[] {
    return [...windows].sort((a, b) => a.zIndex - b.zIndex);
  },
};