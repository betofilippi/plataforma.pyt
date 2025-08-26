/**
 * Module Lifecycle Contract
 * 
 * Defines the standard lifecycle interface for modules, including
 * initialization, startup, shutdown, and resource management.
 */

import { ModuleEvent, ModuleEventResult, ModuleState } from './ModuleAPI';

/**
 * Module lifecycle interface that all modules must implement
 */
export interface ModuleLifecycle {
  /** Current lifecycle state */
  readonly state: ModuleLifecycleState;
  
  /** Lifecycle hooks */
  readonly hooks: ModuleLifecycleHooks;
  
  /** Load module resources */
  load(options?: ModuleLoadOptions): Promise<ModuleLifecycleResult>;
  
  /** Initialize module */
  initialize(options?: ModuleInitOptions): Promise<ModuleLifecycleResult>;
  
  /** Start module execution */
  start(options?: ModuleStartOptions): Promise<ModuleLifecycleResult>;
  
  /** Stop module execution */
  stop(options?: ModuleStopOptions): Promise<ModuleLifecycleResult>;
  
  /** Unload module and cleanup resources */
  unload(options?: ModuleUnloadOptions): Promise<ModuleLifecycleResult>;
  
  /** Handle lifecycle events */
  handleLifecycleEvent(event: ModuleLifecycleEvent): Promise<ModuleEventResult>;
  
  /** Get current lifecycle status */
  getLifecycleStatus(): Promise<ModuleLifecycleStatus>;
}

/**
 * Extended lifecycle states
 */
export enum ModuleLifecycleState {
  // Loading phase
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOAD_FAILED = 'load_failed',
  LOADED = 'loaded',
  
  // Initialization phase
  INITIALIZING = 'initializing',
  INIT_FAILED = 'init_failed',
  INITIALIZED = 'initialized',
  
  // Runtime phase
  STARTING = 'starting',
  START_FAILED = 'start_failed',
  RUNNING = 'running',
  PAUSED = 'paused',
  
  // Shutdown phase
  STOPPING = 'stopping',
  STOP_FAILED = 'stop_failed',
  STOPPED = 'stopped',
  
  // Cleanup phase
  UNLOADING = 'unloading',
  UNLOAD_FAILED = 'unload_failed',
  
  // Error states
  ERROR = 'error',
  CORRUPTED = 'corrupted'
}

/**
 * Lifecycle hooks for modules to implement
 */
export interface ModuleLifecycleHooks {
  /** Called before loading starts */
  beforeLoad?: (options?: ModuleLoadOptions) => Promise<void>;
  
  /** Called after successful loading */
  afterLoad?: () => Promise<void>;
  
  /** Called if loading fails */
  onLoadError?: (error: Error) => Promise<void>;
  
  /** Called before initialization starts */
  beforeInitialize?: (options?: ModuleInitOptions) => Promise<void>;
  
  /** Called after successful initialization */
  afterInitialize?: () => Promise<void>;
  
  /** Called if initialization fails */
  onInitializeError?: (error: Error) => Promise<void>;
  
  /** Called before starting */
  beforeStart?: (options?: ModuleStartOptions) => Promise<void>;
  
  /** Called after successful start */
  afterStart?: () => Promise<void>;
  
  /** Called if starting fails */
  onStartError?: (error: Error) => Promise<void>;
  
  /** Called before stopping */
  beforeStop?: (options?: ModuleStopOptions) => Promise<void>;
  
  /** Called after successful stop */
  afterStop?: () => Promise<void>;
  
  /** Called if stopping fails */
  onStopError?: (error: Error) => Promise<void>;
  
  /** Called before unloading */
  beforeUnload?: (options?: ModuleUnloadOptions) => Promise<void>;
  
  /** Called after successful unload */
  afterUnload?: () => Promise<void>;
  
  /** Called if unloading fails */
  onUnloadError?: (error: Error) => Promise<void>;
  
  /** Called on state changes */
  onStateChange?: (oldState: ModuleLifecycleState, newState: ModuleLifecycleState) => Promise<void>;
  
  /** Called on errors */
  onError?: (error: ModuleLifecycleError) => Promise<void>;
  
  /** Called for health checks */
  onHealthCheck?: () => Promise<ModuleHealthResult>;
}

/**
 * Module load options
 */
export interface ModuleLoadOptions {
  /** Force reload if already loaded */
  readonly force?: boolean;
  
  /** Load dependencies automatically */
  readonly loadDependencies?: boolean;
  
  /** Timeout for loading operation */
  readonly timeout?: number;
  
  /** Retry configuration */
  readonly retry?: ModuleRetryConfig;
  
  /** Additional metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Module initialization options
 */
export interface ModuleInitOptions {
  /** Configuration overrides */
  readonly config?: Record<string, any>;
  
  /** Environment variables */
  readonly env?: Record<string, string>;
  
  /** Initialize dependencies */
  readonly initDependencies?: boolean;
  
  /** Timeout for initialization */
  readonly timeout?: number;
  
  /** Validation level */
  readonly validation?: 'strict' | 'normal' | 'minimal';
  
  /** Additional context */
  readonly context?: Record<string, any>;
}

/**
 * Module start options
 */
export interface ModuleStartOptions {
  /** Start mode */
  readonly mode?: 'normal' | 'safe' | 'debug' | 'production';
  
  /** Start dependencies */
  readonly startDependencies?: boolean;
  
  /** Timeout for startup */
  readonly timeout?: number;
  
  /** Health check configuration */
  readonly healthCheck?: ModuleHealthCheckOptions;
  
  /** Performance monitoring */
  readonly monitoring?: boolean;
}

/**
 * Module stop options
 */
export interface ModuleStopOptions {
  /** Graceful shutdown timeout */
  readonly gracefulTimeout?: number;
  
  /** Force stop if graceful fails */
  readonly force?: boolean;
  
  /** Stop dependents first */
  readonly stopDependents?: boolean;
  
  /** Save state before stopping */
  readonly saveState?: boolean;
  
  /** Reason for stopping */
  readonly reason?: string;
}

/**
 * Module unload options
 */
export interface ModuleUnloadOptions {
  /** Cleanup level */
  readonly cleanup?: 'minimal' | 'normal' | 'thorough';
  
  /** Preserve cache */
  readonly preserveCache?: boolean;
  
  /** Timeout for unload operation */
  readonly timeout?: number;
  
  /** Force unload if normal fails */
  readonly force?: boolean;
  
  /** Callback after unload */
  readonly onComplete?: () => Promise<void>;
}

/**
 * Retry configuration
 */
export interface ModuleRetryConfig {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  
  /** Delay between attempts (milliseconds) */
  readonly delay: number;
  
  /** Exponential backoff multiplier */
  readonly backoffMultiplier?: number;
  
  /** Maximum delay between attempts */
  readonly maxDelay?: number;
  
  /** Conditions for retry */
  readonly retryIf?: (error: Error) => boolean;
}

/**
 * Health check options
 */
export interface ModuleHealthCheckOptions {
  /** Enable health checking */
  readonly enabled: boolean;
  
  /** Check interval in milliseconds */
  readonly interval?: number;
  
  /** Timeout for each check */
  readonly timeout?: number;
  
  /** Number of failed checks before unhealthy */
  readonly failureThreshold?: number;
  
  /** Number of successful checks to become healthy */
  readonly successThreshold?: number;
}

/**
 * Lifecycle operation result
 */
export interface ModuleLifecycleResult {
  /** Whether operation succeeded */
  readonly success: boolean;
  
  /** New state after operation */
  readonly state: ModuleLifecycleState;
  
  /** Duration of operation in milliseconds */
  readonly duration: number;
  
  /** Error if operation failed */
  readonly error?: ModuleLifecycleError;
  
  /** Additional result data */
  readonly data?: any;
  
  /** Warnings from the operation */
  readonly warnings?: readonly string[];
}

/**
 * Lifecycle event
 */
export interface ModuleLifecycleEvent extends ModuleEvent {
  /** Lifecycle phase */
  readonly phase: 'load' | 'initialize' | 'start' | 'stop' | 'unload';
  
  /** Previous state */
  readonly previousState: ModuleLifecycleState;
  
  /** Current state */
  readonly currentState: ModuleLifecycleState;
  
  /** Operation duration */
  readonly duration?: number;
  
  /** Success/failure status */
  readonly success: boolean;
}

/**
 * Module lifecycle status
 */
export interface ModuleLifecycleStatus {
  /** Current state */
  readonly state: ModuleLifecycleState;
  
  /** State history */
  readonly stateHistory: readonly ModuleStateTransition[];
  
  /** Runtime statistics */
  readonly runtime: ModuleRuntimeStats;
  
  /** Health status */
  readonly health: ModuleHealthResult;
  
  /** Resource usage */
  readonly resources: ModuleResourceUsage;
  
  /** Dependencies status */
  readonly dependencies: readonly ModuleDependencyStatus[];
  
  /** Last operation */
  readonly lastOperation?: ModuleOperationInfo;
}

/**
 * State transition record
 */
export interface ModuleStateTransition {
  readonly from: ModuleLifecycleState;
  readonly to: ModuleLifecycleState;
  readonly timestamp: string;
  readonly duration: number;
  readonly trigger: string;
  readonly success: boolean;
  readonly error?: string;
}

/**
 * Module runtime statistics
 */
export interface ModuleRuntimeStats {
  /** Total uptime in milliseconds */
  readonly uptime: number;
  
  /** Number of restarts */
  readonly restarts: number;
  
  /** Number of errors */
  readonly errors: number;
  
  /** Last start time */
  readonly lastStart?: string;
  
  /** Last stop time */
  readonly lastStop?: string;
  
  /** Performance metrics */
  readonly performance: ModulePerformanceMetrics;
}

/**
 * Performance metrics
 */
export interface ModulePerformanceMetrics {
  /** Average response time in milliseconds */
  readonly avgResponseTime: number;
  
  /** Requests per second */
  readonly requestsPerSecond: number;
  
  /** Error rate percentage */
  readonly errorRate: number;
  
  /** CPU usage percentage */
  readonly cpuUsage: number;
  
  /** Memory usage in bytes */
  readonly memoryUsage: number;
}

/**
 * Health check result
 */
export interface ModuleHealthResult {
  /** Overall health status */
  readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  
  /** Health score (0-100) */
  readonly score: number;
  
  /** Individual check results */
  readonly checks: readonly ModuleHealthCheck[];
  
  /** Last check timestamp */
  readonly lastCheck: string;
  
  /** Next check timestamp */
  readonly nextCheck?: string;
  
  /** Health message */
  readonly message?: string;
}

/**
 * Individual health check
 */
export interface ModuleHealthCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly message?: string;
  readonly duration: number;
  readonly data?: any;
}

/**
 * Resource usage information
 */
export interface ModuleResourceUsage {
  /** Memory usage in bytes */
  readonly memory: number;
  
  /** CPU usage percentage */
  readonly cpu: number;
  
  /** Network I/O statistics */
  readonly network?: ModuleNetworkUsage;
  
  /** Disk I/O statistics */
  readonly disk?: ModuleDiskUsage;
  
  /** Database connections */
  readonly database?: ModuleDatabaseUsage;
  
  /** Open file handles */
  readonly fileHandles: number;
  
  /** Thread count */
  readonly threads: number;
}

export interface ModuleNetworkUsage {
  readonly bytesIn: number;
  readonly bytesOut: number;
  readonly connectionsActive: number;
  readonly connectionsTotal: number;
}

export interface ModuleDiskUsage {
  readonly bytesRead: number;
  readonly bytesWritten: number;
  readonly operations: number;
}

export interface ModuleDatabaseUsage {
  readonly connections: number;
  readonly queries: number;
  readonly transactions: number;
  readonly poolSize: number;
}

/**
 * Dependency status
 */
export interface ModuleDependencyStatus {
  readonly moduleId: string;
  readonly state: ModuleLifecycleState;
  readonly health: 'healthy' | 'unhealthy' | 'unknown';
  readonly version: string;
  readonly required: boolean;
  readonly lastCheck: string;
}

/**
 * Operation information
 */
export interface ModuleOperationInfo {
  readonly type: 'load' | 'initialize' | 'start' | 'stop' | 'unload' | 'restart' | 'health-check';
  readonly startTime: string;
  readonly endTime?: string;
  readonly duration?: number;
  readonly success?: boolean;
  readonly error?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Lifecycle error
 */
export interface ModuleLifecycleError {
  readonly code: string;
  readonly message: string;
  readonly phase: string;
  readonly state: ModuleLifecycleState;
  readonly cause?: Error;
  readonly retryable: boolean;
  readonly timestamp: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Lifecycle manager interface
 */
export interface ModuleLifecycleManager {
  /** Start lifecycle management for a module */
  manage(module: ModuleLifecycle): Promise<void>;
  
  /** Stop lifecycle management */
  unmanage(moduleId: string): Promise<void>;
  
  /** Get lifecycle status for all managed modules */
  getStatus(): Promise<readonly ModuleLifecycleStatus[]>;
  
  /** Get status for specific module */
  getModuleStatus(moduleId: string): Promise<ModuleLifecycleStatus | null>;
  
  /** Perform health check on all modules */
  healthCheck(): Promise<ModuleSystemHealthResult>;
  
  /** Subscribe to lifecycle events */
  subscribe(callback: (event: ModuleLifecycleEvent) => void): () => void;
  
  /** Restart a module */
  restart(moduleId: string, options?: ModuleRestartOptions): Promise<ModuleLifecycleResult>;
  
  /** Shutdown all modules gracefully */
  shutdown(options?: ModuleShutdownOptions): Promise<ModuleShutdownResult>;
}

/**
 * System health result
 */
export interface ModuleSystemHealthResult {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy';
  readonly modules: readonly ModuleLifecycleStatus[];
  readonly summary: ModuleSystemHealthSummary;
  readonly timestamp: string;
}

export interface ModuleSystemHealthSummary {
  readonly total: number;
  readonly healthy: number;
  readonly degraded: number;
  readonly unhealthy: number;
  readonly unknown: number;
  readonly score: number;
}

/**
 * Module restart options
 */
export interface ModuleRestartOptions {
  /** Graceful shutdown timeout */
  readonly gracefulTimeout?: number;
  
  /** Force restart if graceful fails */
  readonly force?: boolean;
  
  /** Preserve state across restart */
  readonly preserveState?: boolean;
  
  /** Reason for restart */
  readonly reason?: string;
}

/**
 * System shutdown options
 */
export interface ModuleShutdownOptions {
  /** Shutdown timeout in milliseconds */
  readonly timeout?: number;
  
  /** Force shutdown after timeout */
  readonly force?: boolean;
  
  /** Save state before shutdown */
  readonly saveState?: boolean;
  
  /** Shutdown order strategy */
  readonly strategy?: 'dependency' | 'reverse-dependency' | 'parallel';
}

/**
 * System shutdown result
 */
export interface ModuleShutdownResult {
  readonly success: boolean;
  readonly duration: number;
  readonly modules: readonly ModuleShutdownModuleResult[];
  readonly error?: string;
}

export interface ModuleShutdownModuleResult {
  readonly moduleId: string;
  readonly success: boolean;
  readonly duration: number;
  readonly error?: string;
}

/**
 * Abstract base class for module lifecycle implementation
 */
export abstract class BaseModuleLifecycle implements ModuleLifecycle {
  protected _state: ModuleLifecycleState = ModuleLifecycleState.UNLOADED;
  protected _stateHistory: ModuleStateTransition[] = [];
  protected _hooks: ModuleLifecycleHooks = {};
  
  public get state(): ModuleLifecycleState {
    return this._state;
  }
  
  public get hooks(): ModuleLifecycleHooks {
    return this._hooks;
  }
  
  public async load(options?: ModuleLoadOptions): Promise<ModuleLifecycleResult> {
    return this.executeLifecycleOperation('load', async () => {
      await this.hooks.beforeLoad?.(options);
      await this.onLoad(options);
      await this.hooks.afterLoad?.();
      return ModuleLifecycleState.LOADED;
    }, options?.timeout);
  }
  
  public async initialize(options?: ModuleInitOptions): Promise<ModuleLifecycleResult> {
    return this.executeLifecycleOperation('initialize', async () => {
      await this.hooks.beforeInitialize?.(options);
      await this.onInitialize(options);
      await this.hooks.afterInitialize?.();
      return ModuleLifecycleState.INITIALIZED;
    }, options?.timeout);
  }
  
  public async start(options?: ModuleStartOptions): Promise<ModuleLifecycleResult> {
    return this.executeLifecycleOperation('start', async () => {
      await this.hooks.beforeStart?.(options);
      await this.onStart(options);
      await this.hooks.afterStart?.();
      return ModuleLifecycleState.RUNNING;
    }, options?.timeout);
  }
  
  public async stop(options?: ModuleStopOptions): Promise<ModuleLifecycleResult> {
    return this.executeLifecycleOperation('stop', async () => {
      await this.hooks.beforeStop?.(options);
      await this.onStop(options);
      await this.hooks.afterStop?.();
      return ModuleLifecycleState.STOPPED;
    }, options?.gracefulTimeout);
  }
  
  public async unload(options?: ModuleUnloadOptions): Promise<ModuleLifecycleResult> {
    return this.executeLifecycleOperation('unload', async () => {
      await this.hooks.beforeUnload?.(options);
      await this.onUnload(options);
      await this.hooks.afterUnload?.();
      return ModuleLifecycleState.UNLOADED;
    }, options?.timeout);
  }
  
  public async handleLifecycleEvent(event: ModuleLifecycleEvent): Promise<ModuleEventResult> {
    return { handled: false };
  }
  
  public async getLifecycleStatus(): Promise<ModuleLifecycleStatus> {
    return {
      state: this._state,
      stateHistory: [...this._stateHistory],
      runtime: await this.getRuntimeStats(),
      health: await this.getHealthResult(),
      resources: await this.getResourceUsage(),
      dependencies: await this.getDependenciesStatus()
    };
  }
  
  protected async executeLifecycleOperation(
    operation: string,
    executor: () => Promise<ModuleLifecycleState>,
    timeout?: number
  ): Promise<ModuleLifecycleResult> {
    const startTime = Date.now();
    const oldState = this._state;
    
    try {
      const newState = await this.withTimeout(executor(), timeout);
      const duration = Date.now() - startTime;
      
      this.transitionState(oldState, newState, operation, true, duration);
      
      return {
        success: true,
        state: newState,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorState = this.getErrorState(operation);
      
      this.transitionState(oldState, errorState, operation, false, duration);
      
      return {
        success: false,
        state: errorState,
        duration,
        error: this.createLifecycleError(error as Error, operation, oldState)
      };
    }
  }
  
  protected transitionState(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState,
    trigger: string,
    success: boolean,
    duration: number
  ): void {
    this._state = to;
    
    const transition: ModuleStateTransition = {
      from,
      to,
      timestamp: new Date().toISOString(),
      duration,
      trigger,
      success,
      error: success ? undefined : 'Operation failed'
    };
    
    this._stateHistory.push(transition);
    this.hooks.onStateChange?.(from, to);
  }
  
  protected async withTimeout<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) return promise;
    
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }
  
  protected getErrorState(operation: string): ModuleLifecycleState {
    switch (operation) {
      case 'load': return ModuleLifecycleState.LOAD_FAILED;
      case 'initialize': return ModuleLifecycleState.INIT_FAILED;
      case 'start': return ModuleLifecycleState.START_FAILED;
      case 'stop': return ModuleLifecycleState.STOP_FAILED;
      case 'unload': return ModuleLifecycleState.UNLOAD_FAILED;
      default: return ModuleLifecycleState.ERROR;
    }
  }
  
  protected createLifecycleError(
    error: Error,
    phase: string,
    state: ModuleLifecycleState
  ): ModuleLifecycleError {
    return {
      code: `LIFECYCLE_${phase.toUpperCase()}_FAILED`,
      message: error.message,
      phase,
      state,
      cause: error,
      retryable: true,
      timestamp: new Date().toISOString()
    };
  }
  
  // Abstract methods for subclasses
  protected abstract onLoad(options?: ModuleLoadOptions): Promise<void>;
  protected abstract onInitialize(options?: ModuleInitOptions): Promise<void>;
  protected abstract onStart(options?: ModuleStartOptions): Promise<void>;
  protected abstract onStop(options?: ModuleStopOptions): Promise<void>;
  protected abstract onUnload(options?: ModuleUnloadOptions): Promise<void>;
  protected abstract getRuntimeStats(): Promise<ModuleRuntimeStats>;
  protected abstract getHealthResult(): Promise<ModuleHealthResult>;
  protected abstract getResourceUsage(): Promise<ModuleResourceUsage>;
  protected abstract getDependenciesStatus(): Promise<readonly ModuleDependencyStatus[]>;
}