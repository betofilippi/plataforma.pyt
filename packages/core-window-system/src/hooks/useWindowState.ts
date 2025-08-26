import { useState, useCallback, useEffect, useRef } from 'react';
import { useWindowManager } from './useWindowManager';
import type { WindowState } from '@plataforma/types';

interface UseWindowStateOptions {
  windowId: string;
  autoFocus?: boolean;
  autoSave?: boolean;
}

interface WindowStateManager {
  // Current window state
  window: WindowState | null;
  isActive: boolean;
  
  // Actions
  focus: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
  move: (position: { x: number; y: number }) => void;
  resize: (size: { width: number; height: number }) => void;
  
  // Utilities
  bringToFront: () => void;
  sendToBack: () => void;
  center: () => void;
  snapToEdge: (edge: 'left' | 'right' | 'top' | 'bottom') => void;
}

export function useWindowState(options: UseWindowStateOptions): WindowStateManager {
  const { windowId, autoFocus = false, autoSave = true } = options;
  
  const {
    windows,
    activeWindowId,
    focusWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    closeWindow,
    updateWindow,
    snapWindowLeft,
    snapWindowRight,
    getNextZIndex,
  } = useWindowManager();

  const previousStateRef = useRef<WindowState | null>(null);
  const [localState, setLocalState] = useState<Partial<WindowState>>({});

  // Find the current window
  const window = windows.find(w => w.id === windowId) || null;
  const isActive = activeWindowId === windowId;

  // Auto-focus when window is created
  useEffect(() => {
    if (autoFocus && window && !isActive) {
      focusWindow(windowId);
    }
  }, [autoFocus, window, isActive, focusWindow, windowId]);

  // Save state changes
  useEffect(() => {
    if (autoSave && window && previousStateRef.current) {
      const prev = previousStateRef.current;
      const curr = window;
      
      // Check if position or size changed significantly
      const positionChanged = 
        Math.abs(curr.position.x - prev.position.x) > 5 ||
        Math.abs(curr.position.y - prev.position.y) > 5;
      
      const sizeChanged = 
        Math.abs(curr.size.width - prev.size.width) > 10 ||
        Math.abs(curr.size.height - prev.size.height) > 10;

      if (positionChanged || sizeChanged) {
        // Could emit events or save to external storage here
        console.debug('Window state changed:', {
          windowId,
          position: curr.position,
          size: curr.size,
        });
      }
    }
    
    previousStateRef.current = window;
  }, [window, autoSave, windowId]);

  // Actions
  const focus = useCallback(() => {
    focusWindow(windowId);
  }, [focusWindow, windowId]);

  const minimize = useCallback(() => {
    minimizeWindow(windowId);
  }, [minimizeWindow, windowId]);

  const maximize = useCallback(() => {
    maximizeWindow(windowId);
  }, [maximizeWindow, windowId]);

  const restore = useCallback(() => {
    restoreWindow(windowId);
  }, [restoreWindow, windowId]);

  const close = useCallback(() => {
    closeWindow(windowId);
  }, [closeWindow, windowId]);

  const move = useCallback((position: { x: number; y: number }) => {
    updateWindow(windowId, { position });
  }, [updateWindow, windowId]);

  const resize = useCallback((size: { width: number; height: number }) => {
    updateWindow(windowId, { size });
  }, [updateWindow, windowId]);

  const bringToFront = useCallback(() => {
    const newZIndex = getNextZIndex();
    updateWindow(windowId, { zIndex: newZIndex });
  }, [updateWindow, windowId, getNextZIndex]);

  const sendToBack = useCallback(() => {
    // Set z-index to a low value
    updateWindow(windowId, { zIndex: 100 });
  }, [updateWindow, windowId]);

  const center = useCallback(() => {
    if (!window) return;
    
    const viewport = {
      width: globalThis.window?.innerWidth || 1920,
      height: globalThis.window?.innerHeight || 1080,
    };
    
    const centerX = (viewport.width - window.size.width) / 2;
    const centerY = (viewport.height - window.size.height) / 2;
    
    move({ 
      x: Math.max(0, centerX), 
      y: Math.max(0, centerY) 
    });
  }, [window, move]);

  const snapToEdge = useCallback((edge: 'left' | 'right' | 'top' | 'bottom') => {
    if (!window) return;

    const viewport = {
      width: globalThis.window?.innerWidth || 1920,
      height: globalThis.window?.innerHeight || 1080,
    };

    switch (edge) {
      case 'left':
        snapWindowLeft(windowId);
        break;
      case 'right':
        snapWindowRight(windowId);
        break;
      case 'top':
        move({ x: window.position.x, y: 0 });
        break;
      case 'bottom':
        move({ 
          x: window.position.x, 
          y: viewport.height - window.size.height - 60 // Account for taskbar
        });
        break;
    }
  }, [window, windowId, snapWindowLeft, snapWindowRight, move]);

  return {
    // State
    window,
    isActive,
    
    // Actions
    focus,
    minimize,
    maximize,
    restore,
    close,
    move,
    resize,
    
    // Utilities
    bringToFront,
    sendToBack,
    center,
    snapToEdge,
  };
}