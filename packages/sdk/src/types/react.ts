// React-specific types for Plataforma SDK

import React from 'react';

/**
 * Base props for all Plataforma module components
 */
export interface PlataformaComponentProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * Props for module container components
 */
export interface ModuleContainerProps extends PlataformaComponentProps {
  moduleId: string;
  windowId?: string;
  isActive?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * Window-specific props
 */
export interface WindowProps extends PlataformaComponentProps {
  title: string;
  icon?: React.ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  zIndex?: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onRestore?: () => void;
  onResize?: (width: number, height: number) => void;
  onMove?: (x: number, y: number) => void;
}

/**
 * Hook return types
 */
export interface UseModuleResult<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseWindowResult {
  windowRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  isResizing: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
}

/**
 * Context types
 */
export interface PlataformaContextValue {
  modules: Record<string, any>;
  windows: Record<string, WindowProps>;
  activeWindow: string | null;
  registerModule: (moduleId: string, module: any) => void;
  unregisterModule: (moduleId: string) => void;
  openWindow: (windowId: string, props: WindowProps) => void;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  maximizeWindow: (windowId: string) => void;
  restoreWindow: (windowId: string) => void;
}

/**
 * Component ref types
 */
export interface ModuleComponentRef {
  refresh: () => void;
  getData: () => any;
  setData: (data: any) => void;
  focus: () => void;
  blur: () => void;
}

export interface WindowComponentRef {
  focus: () => void;
  minimize: () => void;
  maximize: () => void;
  restore: () => void;
  close: () => void;
  setPosition: (x: number, y: number) => void;
  setSize: (width: number, height: number) => void;
  getPosition: () => { x: number; y: number };
  getSize: () => { width: number; height: number };
}

/**
 * Event handler types
 */
export type ModuleEventHandler<T = any> = (event: T) => void;
export type WindowEventHandler = (windowId: string, event?: any) => void;

/**
 * Render props types
 */
export interface ModuleRenderProps {
  data: any;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface WindowRenderProps {
  isActive: boolean;
  isFocused: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

/**
 * Higher-order component types
 */
export interface WithModuleProps {
  moduleConfig: any;
  moduleData: any;
  moduleActions: Record<string, Function>;
}

export interface WithWindowProps {
  windowProps: WindowProps;
  windowActions: {
    close: () => void;
    minimize: () => void;
    maximize: () => void;
    focus: () => void;
  };
}

/**
 * Component factory types
 */
export type ComponentFactory<P = {}> = (props: P) => React.ComponentType<P>;
export type ModuleComponentFactory = ComponentFactory<ModuleContainerProps>;
export type WindowComponentFactory = ComponentFactory<WindowProps>;

/**
 * Theme types
 */
export interface PlataformaTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: {
      light: string;
      medium: string;
      heavy: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  glassmorphism: {
    background: string;
    border: string;
    backdrop: string;
  };
}

/**
 * Animation types
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface TransitionProps {
  in: boolean;
  timeout?: number | { enter?: number; exit?: number };
  appear?: boolean;
  enter?: boolean;
  exit?: boolean;
  onEnter?: () => void;
  onEntering?: () => void;
  onEntered?: () => void;
  onExit?: () => void;
  onExiting?: () => void;
  onExited?: () => void;
}