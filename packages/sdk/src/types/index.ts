import React from 'react';

// Module Configuration
export interface ModuleConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  category: string;
  template: string;
  icon?: string;
  color?: string;
  author: string | { name: string; email: string };
  license: string;
  
  features: {
    windowSystem: boolean;
    database: boolean;
    ai: boolean;
    realtime: boolean;
    [key: string]: any;
  };
  
  permissions: {
    read: string[];
    write: string[];
    execute: string[];
    [key: string]: any;
  };
  
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts: Record<string, string>;
  
  plataforma?: {
    version: string;
    minVersion: string;
    windowOptions?: WindowOptions;
  };
  
  database?: DatabaseConfig;
  ai?: AIConfig;
  
  [key: string]: any;
}

// Window Configuration
export interface WindowOptions {
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
  maximizable: boolean;
  minimizable?: boolean;
}

// Database Configuration
export interface DatabaseConfig {
  schema: string;
  tables: DatabaseTable[];
  migrations?: string[];
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  indexes?: DatabaseIndex[];
  rls?: RowLevelSecurity;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
  required?: boolean;
  default?: string;
  references?: string;
}

export interface DatabaseIndex {
  columns: string[];
  unique?: boolean;
  name?: string;
}

export interface RowLevelSecurity {
  enabled: boolean;
  policies: SecurityPolicy[];
}

export interface SecurityPolicy {
  name: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  condition: string;
}

// AI Configuration
export interface AIConfig {
  providers: AIProvider[];
  defaultProvider: string;
  defaultModel: string;
  maxTokens?: number;
  temperature?: number;
  features: {
    chat: AIFeature;
    analysis: AIFeature;
    generation: AIFeature;
  };
}

export interface AIProvider {
  name: string;
  models: string[];
  apiKey: string;
}

export interface AIFeature {
  enabled: boolean;
  types?: string[];
  contextWindow?: number;
  memoryEnabled?: boolean;
}

// Template System
export interface TemplateConfig {
  name: string;
  displayName: string;
  description: string;
  features: {
    database: boolean;
    ai: boolean;
    realtime: boolean;
    [key: string]: any;
  };
  files: TemplateFile[];
}

export interface TemplateFile {
  path: string;
  template: string;
  required: boolean;
}

// CLI Types
export interface CLIConfig {
  registryUrl?: string;
  apiKey?: string;
  defaultTemplate?: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface CreateModuleOptions {
  template?: string;
  category?: string;
  interactive?: boolean;
  features?: {
    database?: boolean;
    ai?: boolean;
    realtime?: boolean;
  };
}

export interface BuildOptions {
  watch?: boolean;
  minify?: boolean;
  mode?: 'development' | 'production';
  outDir?: string;
  sourcemap?: boolean;
}

export interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  testPattern?: string;
  bail?: boolean;
  updateSnapshots?: boolean;
}

export interface PublishOptions {
  dryRun?: boolean;
  tag?: string;
  access?: 'public' | 'private';
  registry?: string;
  skipTests?: boolean;
  skipBuild?: boolean;
}

export interface ValidateOptions {
  fix?: boolean;
  verbose?: boolean;
  checkDependencies?: boolean;
  checkSecurity?: boolean;
}

export interface DevServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  apiPort?: number;
  hotReload?: boolean;
  mock?: boolean;
}

// Module Runtime Types
export interface ModuleExports {
  config: ModuleConfig;
  Component: React.ComponentType<ModuleComponentProps>;
  hooks?: Record<string, any>;
  utils?: Record<string, any>;
  services?: Record<string, any>;
}

export interface ModuleComponentProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  windowId?: string;
  data?: any;
  [key: string]: any;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (config: ModuleConfig, context?: any) => ValidationResult;
}

// Registry Types
export interface RegistryConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface ModuleSearchResult {
  name: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
}

export interface PublishResult {
  success: boolean;
  version: string;
  registry: string;
  url: string;
  downloadUrl?: string;
  message?: string;
}

// Error Types
export class SDKError extends Error {
  code: string;
  
  constructor(message: string, code = 'SDK_ERROR') {
    super(message);
    this.name = 'SDKError';
    this.code = code;
  }
}

export class ValidationError extends SDKError {
  validationResult: ValidationResult;
  
  constructor(message: string, validationResult: ValidationResult) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.validationResult = validationResult;
  }
}

export class TemplateError extends SDKError {
  templateName: string;
  
  constructor(message: string, templateName: string) {
    super(message, 'TEMPLATE_ERROR');
    this.name = 'TemplateError';
    this.templateName = templateName;
  }
}

export class RegistryError extends SDKError {
  statusCode?: number;
  response?: any;
  
  constructor(message: string, statusCode?: number, response?: any) {
    super(message, 'REGISTRY_ERROR');
    this.name = 'RegistryError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event Types
export interface ModuleEvent {
  type: string;
  timestamp: Date;
  data?: any;
}

export interface ModuleLifecycleEvent extends ModuleEvent {
  type: 'created' | 'built' | 'tested' | 'published' | 'installed' | 'updated' | 'removed';
  module: string;
  version?: string;
}

// Hook Types for extensibility
export interface Hook<T = any> {
  name: string;
  handler: (data: T) => T | Promise<T>;
}

export interface HookSystem {
  register<T>(hookName: string, handler: Hook<T>['handler']): void;
  execute<T>(hookName: string, data: T): Promise<T>;
  remove(hookName: string, handler: Hook['handler']): void;
}

// Plugin Types
export interface Plugin {
  name: string;
  version: string;
  description?: string;
  hooks?: Record<string, Hook['handler']>;
  commands?: Record<string, Function>;
  templates?: TemplateConfig[];
  init?: (sdk: any) => void | Promise<void>;
  destroy?: () => void | Promise<void>;
}

// Re-export commonly used types
export * from './react';
export * from './node';