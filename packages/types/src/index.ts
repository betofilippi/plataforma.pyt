// Core Window System Types
export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  moduleId: string;
  component: any; // React.ComponentType<any> | React.ReactNode
  props?: Record<string, any>;
}

// Extended WindowState with platform-specific properties
export interface PlatformWindowState extends WindowState {
  icon?: string;
  canResize: boolean;
  canMove: boolean;
  previousPosition?: { x: number; y: number };
  previousSize?: { width: number; height: number };
  snapPosition?: 'left' | 'right' | 'top' | 'bottom' | null;
  isVisible: boolean;
}

export interface DesktopState {
  windows: WindowState[];
  activeWindowId: string | null;
  nextZIndex: number;
}

// Module System Types
export interface ModuleConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  icon: string;
  category: ModuleCategory;
  permissions: Permission[];
  dependencies: string[];
  entryPoint: string;
  author: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
}

export type ModuleCategory = 
  | 'ia' 
  | 'core' 
  | 'business' 
  | 'admin' 
  | 'support' 
  | 'custom';

// Design System Types
export interface DesignToken {
  name: string;
  value: string | number;
  category: 'color' | 'spacing' | 'typography' | 'shadow' | 'opacity';
}

export interface GlassmorphismConfig {
  blur: number;
  opacity: number;
  borderOpacity: number;
  shadowIntensity: number;
}

// Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: Role[];
  permissions: Permission[];
  preferences: UserPreferences;
  lastLogin: Date;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: Permission[];
  isSystem: boolean;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'admin';
  conditions?: Record<string, any>;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  dateFormat: string;
  timezone: string;
  desktopSettings: {
    wallpaper?: string;
    taskbarPosition: 'top' | 'bottom';
    showDesktopIcons: boolean;
  };
}

// Database Types
export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnDefinition[];
  primaryKey?: string;
  foreignKeys?: ForeignKey[];
  indexes?: Index[];
  metadata?: TableMetadata;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  default?: any;
  isPrimary: boolean;
  isUnique: boolean;
  typeHint?: TypeHint;
  ordinalPosition: number;
}

export type TypeHint = 
  | 'text' 
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'datetime' 
  | 'boolean' 
  | 'email' 
  | 'phone' 
  | 'cpf' 
  | 'cnpj' 
  | 'color' 
  | 'url' 
  | 'json';

export interface ForeignKey {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'RESTRICT' | 'SET NULL';
  onUpdate: 'CASCADE' | 'RESTRICT' | 'SET NULL';
}

export interface Index {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  isUnique: boolean;
}

export interface TableMetadata {
  displayName?: string;
  description?: string;
  icon?: string;
  isSystemTable?: boolean;
  columnOrder?: string[];
}

// API Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// SDK Types
export interface ModuleTemplate {
  name: string;
  description: string;
  category: ModuleCategory;
  files: TemplateFile[];
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface BuildConfig {
  entry: string;
  output: {
    path: string;
    filename: string;
    library: string;
  };
  externals: string[];
  optimization: {
    minimize: boolean;
    splitChunks: boolean;
  };
}

// Event Types
export interface WindowEvent {
  type: 'open' | 'close' | 'minimize' | 'maximize' | 'restore' | 'move' | 'resize' | 'focus';
  windowId: string;
  data?: any;
}

export interface ModuleEvent {
  type: 'install' | 'uninstall' | 'enable' | 'disable' | 'update';
  moduleId: string;
  data?: any;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;

export type EventHandler<T = any> = (event: T) => void | Promise<void>;