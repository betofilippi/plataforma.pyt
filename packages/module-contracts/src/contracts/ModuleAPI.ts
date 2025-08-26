/**
 * Module API Contract
 * 
 * Defines standard API interfaces that modules must implement for
 * integration with the platform and other modules.
 */

import { ModuleManifest } from './ModuleManifest';

/**
 * Core module interface that all modules must implement
 */
export interface Module {
  /** Module manifest with metadata and configuration */
  readonly manifest: ModuleManifest;
  
  /** Current module state */
  readonly state: ModuleState;
  
  /** Module configuration */
  readonly config: ModuleConfig;
  
  /** Initialize the module */
  initialize(context: ModuleContext): Promise<void>;
  
  /** Start the module */
  start(): Promise<void>;
  
  /** Stop the module */
  stop(): Promise<void>;
  
  /** Cleanup module resources */
  dispose(): Promise<void>;
  
  /** Get module health status */
  getHealth(): Promise<ModuleHealthStatus>;
  
  /** Update module configuration */
  updateConfig(config: Partial<ModuleConfig>): Promise<void>;
  
  /** Handle incoming events */
  handleEvent(event: ModuleEvent): Promise<ModuleEventResult>;
  
  /** Export module functionality */
  getExports(): ModuleExports;
}

/**
 * Module execution states
 */
export enum ModuleState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  INITIALIZING = 'initializing',
  INITIALIZED = 'initialized',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
  DISPOSING = 'disposing',
  DISPOSED = 'disposed'
}

/**
 * Module configuration interface
 */
export interface ModuleConfig {
  /** Module-specific configuration */
  readonly [key: string]: any;
  
  /** Whether module is enabled */
  readonly enabled: boolean;
  
  /** Debug mode */
  readonly debug?: boolean;
  
  /** Log level */
  readonly logLevel?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  
  /** Feature flags */
  readonly features?: Record<string, boolean>;
  
  /** Environment variables */
  readonly env?: Record<string, string>;
}

/**
 * Module execution context
 */
export interface ModuleContext {
  /** Platform API */
  readonly platform: PlatformAPI;
  
  /** Module registry for discovering other modules */
  readonly registry: ModuleRegistry;
  
  /** Event bus for inter-module communication */
  readonly eventBus: EventBus;
  
  /** Logger instance */
  readonly logger: ModuleLogger;
  
  /** Configuration service */
  readonly config: ConfigService;
  
  /** Permission manager */
  readonly permissions: PermissionManager;
  
  /** Storage service */
  readonly storage: StorageService;
  
  /** Database access */
  readonly database?: DatabaseService;
  
  /** HTTP client */
  readonly http: HTTPClient;
  
  /** Module-specific context */
  readonly moduleContext: Record<string, any>;
}

/**
 * Platform API interface
 */
export interface PlatformAPI {
  /** Platform version */
  readonly version: string;
  
  /** Platform capabilities */
  readonly capabilities: PlatformCapabilities;
  
  /** Desktop integration */
  readonly desktop: DesktopAPI;
  
  /** Window management */
  readonly windows: WindowAPI;
  
  /** Notification system */
  readonly notifications: NotificationAPI;
  
  /** Theme management */
  readonly themes: ThemeAPI;
  
  /** User management */
  readonly users: UserAPI;
  
  /** Authentication */
  readonly auth: AuthAPI;
}

export interface PlatformCapabilities {
  readonly hasDesktop: boolean;
  readonly hasDatabase: boolean;
  readonly hasFileSystem: boolean;
  readonly hasNetwork: boolean;
  readonly hasNotifications: boolean;
  readonly hasRealtime: boolean;
  readonly supportedBrowsers: readonly string[];
  readonly supportedPlatforms: readonly string[];
}

export interface DesktopAPI {
  /** Register desktop icon */
  registerIcon(icon: DesktopIcon): Promise<void>;
  
  /** Remove desktop icon */
  removeIcon(id: string): Promise<void>;
  
  /** Get desktop state */
  getState(): Promise<DesktopState>;
}

export interface DesktopIcon {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly action: string;
  readonly position?: { x: number; y: number };
}

export interface DesktopState {
  readonly icons: readonly DesktopIcon[];
  readonly wallpaper: string;
  readonly resolution: { width: number; height: number };
}

export interface WindowAPI {
  /** Open a new window */
  open(spec: WindowOpenSpec): Promise<WindowHandle>;
  
  /** Close a window */
  close(windowId: string): Promise<void>;
  
  /** Focus a window */
  focus(windowId: string): Promise<void>;
  
  /** Get all open windows */
  getAll(): Promise<readonly WindowHandle[]>;
  
  /** Subscribe to window events */
  subscribe(callback: (event: WindowEvent) => void): () => void;
}

export interface WindowOpenSpec {
  readonly id?: string;
  readonly title: string;
  readonly component: string;
  readonly props?: Record<string, any>;
  readonly size?: { width: number; height: number };
  readonly position?: { x: number; y: number };
  readonly modal?: boolean;
  readonly resizable?: boolean;
  readonly closable?: boolean;
  readonly singleton?: boolean;
}

export interface WindowHandle {
  readonly id: string;
  readonly title: string;
  readonly state: WindowState;
  readonly bounds: WindowBounds;
  
  /** Update window properties */
  update(updates: Partial<WindowOpenSpec>): Promise<void>;
  
  /** Close the window */
  close(): Promise<void>;
  
  /** Minimize the window */
  minimize(): Promise<void>;
  
  /** Maximize the window */
  maximize(): Promise<void>;
  
  /** Restore the window */
  restore(): Promise<void>;
  
  /** Send data to window */
  send(data: any): Promise<void>;
}

export enum WindowState {
  NORMAL = 'normal',
  MINIMIZED = 'minimized',
  MAXIMIZED = 'maximized',
  FULLSCREEN = 'fullscreen',
  CLOSED = 'closed'
}

export interface WindowBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowEvent {
  readonly type: 'open' | 'close' | 'focus' | 'blur' | 'resize' | 'move' | 'minimize' | 'maximize' | 'restore';
  readonly windowId: string;
  readonly data?: any;
}

/**
 * Module registry interface
 */
export interface ModuleRegistry {
  /** Get all registered modules */
  getAll(): Promise<readonly ModuleInfo[]>;
  
  /** Get module by ID */
  getModule(id: string): Promise<ModuleInfo | null>;
  
  /** Find modules by criteria */
  findModules(criteria: ModuleSearchCriteria): Promise<readonly ModuleInfo[]>;
  
  /** Check if module is available */
  isAvailable(id: string): Promise<boolean>;
  
  /** Subscribe to registry changes */
  subscribe(callback: (event: RegistryEvent) => void): () => void;
}

export interface ModuleInfo {
  readonly manifest: ModuleManifest;
  readonly state: ModuleState;
  readonly health: ModuleHealthStatus;
  readonly instance?: Module;
}

export interface ModuleSearchCriteria {
  readonly category?: string;
  readonly type?: string;
  readonly keywords?: readonly string[];
  readonly author?: string;
  readonly minVersion?: string;
  readonly maxVersion?: string;
  readonly state?: ModuleState;
}

export interface RegistryEvent {
  readonly type: 'added' | 'removed' | 'updated' | 'state-changed';
  readonly moduleId: string;
  readonly module: ModuleInfo;
}

/**
 * Event bus interface
 */
export interface EventBus {
  /** Emit an event */
  emit<T = any>(event: string, data: T): Promise<void>;
  
  /** Subscribe to events */
  subscribe<T = any>(event: string, handler: (data: T) => void): () => void;
  
  /** Subscribe to events with pattern */
  subscribePattern<T = any>(pattern: string, handler: (event: string, data: T) => void): () => void;
  
  /** Request-response pattern */
  request<TRequest, TResponse>(event: string, data: TRequest): Promise<TResponse>;
  
  /** Handle requests */
  handle<TRequest, TResponse>(event: string, handler: (data: TRequest) => Promise<TResponse>): () => void;
}

/**
 * Module health status
 */
export interface ModuleHealthStatus {
  readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  readonly message?: string;
  readonly details?: Record<string, any>;
  readonly lastCheck: string;
  readonly nextCheck?: string;
}

/**
 * Module event interface
 */
export interface ModuleEvent {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly target?: string;
  readonly timestamp: string;
  readonly data: any;
  readonly metadata?: Record<string, any>;
}

export interface ModuleEventResult {
  readonly handled: boolean;
  readonly result?: any;
  readonly error?: string;
}

/**
 * Module exports interface
 */
export interface ModuleExports {
  /** Public functions */
  readonly functions?: Record<string, Function>;
  
  /** Public constants */
  readonly constants?: Record<string, any>;
  
  /** React components */
  readonly components?: Record<string, React.ComponentType<any>>;
  
  /** Hooks */
  readonly hooks?: Record<string, Function>;
  
  /** Services */
  readonly services?: Record<string, any>;
  
  /** Types */
  readonly types?: Record<string, any>;
}

/**
 * Logger interface
 */
export interface ModuleLogger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  trace(message: string, meta?: any): void;
}

/**
 * Configuration service interface
 */
export interface ConfigService {
  get<T = any>(key: string, defaultValue?: T): T;
  set<T = any>(key: string, value: T): Promise<void>;
  has(key: string): boolean;
  remove(key: string): Promise<void>;
  getAll(): Record<string, any>;
  subscribe(key: string, callback: (value: any) => void): () => void;
}

/**
 * Permission manager interface
 */
export interface PermissionManager {
  check(permission: string): Promise<boolean>;
  request(permission: string): Promise<boolean>;
  revoke(permission: string): Promise<void>;
  getAll(): Promise<readonly string[]>;
  subscribe(callback: (permissions: readonly string[]) => void): () => void;
}

/**
 * Storage service interface
 */
export interface StorageService {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<readonly string[]>;
  size(): Promise<number>;
}

/**
 * Database service interface
 */
export interface DatabaseService {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number }>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  subscribe(table: string, callback: (event: DatabaseEvent) => void): () => void;
}

export interface DatabaseTransaction {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface DatabaseEvent {
  readonly type: 'insert' | 'update' | 'delete';
  readonly table: string;
  readonly schema?: string;
  readonly row: any;
  readonly oldRow?: any;
}

/**
 * HTTP client interface
 */
export interface HTTPClient {
  get<T = any>(url: string, config?: HTTPConfig): Promise<HTTPResponse<T>>;
  post<T = any>(url: string, data?: any, config?: HTTPConfig): Promise<HTTPResponse<T>>;
  put<T = any>(url: string, data?: any, config?: HTTPConfig): Promise<HTTPResponse<T>>;
  delete<T = any>(url: string, config?: HTTPConfig): Promise<HTTPResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: HTTPConfig): Promise<HTTPResponse<T>>;
}

export interface HTTPConfig {
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly retries?: number;
  readonly validateStatus?: (status: number) => boolean;
}

export interface HTTPResponse<T = any> {
  readonly data: T;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
}

/**
 * Notification API interface
 */
export interface NotificationAPI {
  show(notification: NotificationSpec): Promise<string>;
  hide(id: string): Promise<void>;
  hideAll(): Promise<void>;
  subscribe(callback: (event: NotificationEvent) => void): () => void;
}

export interface NotificationSpec {
  readonly title: string;
  readonly message: string;
  readonly type?: 'info' | 'success' | 'warning' | 'error';
  readonly duration?: number;
  readonly persistent?: boolean;
  readonly actions?: readonly NotificationAction[];
  readonly data?: any;
}

export interface NotificationAction {
  readonly id: string;
  readonly label: string;
  readonly action: string;
}

export interface NotificationEvent {
  readonly type: 'shown' | 'hidden' | 'clicked' | 'action';
  readonly notificationId: string;
  readonly actionId?: string;
  readonly data?: any;
}

/**
 * Theme API interface
 */
export interface ThemeAPI {
  getCurrent(): Promise<ThemeInfo>;
  getAvailable(): Promise<readonly ThemeInfo[]>;
  apply(themeId: string): Promise<void>;
  subscribe(callback: (theme: ThemeInfo) => void): () => void;
}

export interface ThemeInfo {
  readonly id: string;
  readonly name: string;
  readonly type: 'light' | 'dark' | 'auto';
  readonly colors: Record<string, string>;
  readonly variables: Record<string, string>;
}

/**
 * User API interface
 */
export interface UserAPI {
  getCurrent(): Promise<UserInfo | null>;
  getById(id: string): Promise<UserInfo | null>;
  subscribe(callback: (user: UserInfo | null) => void): () => void;
}

export interface UserInfo {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatar?: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly metadata: Record<string, any>;
}

/**
 * Authentication API interface
 */
export interface AuthAPI {
  isAuthenticated(): Promise<boolean>;
  getToken(): Promise<string | null>;
  login(credentials: AuthCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refresh(): Promise<AuthResult>;
  subscribe(callback: (state: AuthState) => void): () => void;
}

export interface AuthCredentials {
  readonly email?: string;
  readonly password?: string;
  readonly token?: string;
  readonly provider?: string;
  readonly [key: string]: any;
}

export interface AuthResult {
  readonly success: boolean;
  readonly token?: string;
  readonly user?: UserInfo;
  readonly error?: string;
}

export interface AuthState {
  readonly authenticated: boolean;
  readonly user?: UserInfo;
  readonly token?: string;
}

/**
 * Abstract base class for modules
 */
export abstract class BaseModule implements Module {
  public readonly manifest: ModuleManifest;
  public readonly config: ModuleConfig;
  protected context?: ModuleContext;
  protected _state: ModuleState = ModuleState.UNLOADED;
  
  constructor(manifest: ModuleManifest, config: ModuleConfig = { enabled: true }) {
    this.manifest = manifest;
    this.config = config;
  }
  
  public get state(): ModuleState {
    return this._state;
  }
  
  public async initialize(context: ModuleContext): Promise<void> {
    this._state = ModuleState.INITIALIZING;
    this.context = context;
    
    try {
      await this.onInitialize(context);
      this._state = ModuleState.INITIALIZED;
    } catch (error) {
      this._state = ModuleState.ERROR;
      throw error;
    }
  }
  
  public async start(): Promise<void> {
    if (this._state !== ModuleState.INITIALIZED) {
      throw new Error(`Cannot start module in state: ${this._state}`);
    }
    
    this._state = ModuleState.STARTING;
    
    try {
      await this.onStart();
      this._state = ModuleState.RUNNING;
    } catch (error) {
      this._state = ModuleState.ERROR;
      throw error;
    }
  }
  
  public async stop(): Promise<void> {
    if (this._state !== ModuleState.RUNNING) {
      return;
    }
    
    this._state = ModuleState.STOPPING;
    
    try {
      await this.onStop();
      this._state = ModuleState.STOPPED;
    } catch (error) {
      this._state = ModuleState.ERROR;
      throw error;
    }
  }
  
  public async dispose(): Promise<void> {
    this._state = ModuleState.DISPOSING;
    
    try {
      await this.onDispose();
      this._state = ModuleState.DISPOSED;
    } catch (error) {
      this._state = ModuleState.ERROR;
      throw error;
    }
  }
  
  public async getHealth(): Promise<ModuleHealthStatus> {
    return {
      status: this._state === ModuleState.RUNNING ? 'healthy' : 'unhealthy',
      lastCheck: new Date().toISOString()
    };
  }
  
  public async updateConfig(config: Partial<ModuleConfig>): Promise<void> {
    Object.assign(this.config, config);
    await this.onConfigUpdate(config);
  }
  
  public async handleEvent(event: ModuleEvent): Promise<ModuleEventResult> {
    return { handled: false };
  }
  
  public getExports(): ModuleExports {
    return {};
  }
  
  // Abstract methods for subclasses to implement
  protected abstract onInitialize(context: ModuleContext): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onDispose(): Promise<void>;
  protected abstract onConfigUpdate(config: Partial<ModuleConfig>): Promise<void>;
}