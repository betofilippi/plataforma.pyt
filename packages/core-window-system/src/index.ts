// Core Window System - Main Entry Point

// Components
export { WindowManagerProvider, useCreateWindow } from './components/WindowManager';
export { WindowFrame } from './components/WindowFrame';
export { DesktopCanvas } from './components/DesktopCanvas';

// Hooks
export { useWindowManager } from './hooks/useWindowManager';
export { useDesktop } from './hooks/useDesktop';
export { useWindowState } from './hooks/useWindowState';

// Utilities
export { windowManager } from './utils/windowManager';
export { desktopUtils } from './utils/desktopUtils';

// Types (re-exported from @plataforma/types)
export type {
  WindowState,
  PlatformWindowState,
  DesktopState,
  WindowEvent
} from '@plataforma/types';