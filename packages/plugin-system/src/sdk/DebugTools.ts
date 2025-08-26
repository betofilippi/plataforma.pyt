import type { Plugin, PluginInstance, PluginContext } from '../types';

/**
 * Debug Tools for Plugin Development
 * Provides debugging utilities, profiling, and development helpers
 */
export class PluginDebugTools {
  private static instance: PluginDebugTools;
  private debugSessions = new Map<string, DebugSession>();
  private profilers = new Map<string, ProfileSession>();
  private loggers = new Map<string, DebugLogger>();

  static getInstance(): PluginDebugTools {
    if (!PluginDebugTools.instance) {
      PluginDebugTools.instance = new PluginDebugTools();
    }
    return PluginDebugTools.instance;
  }

  /**
   * Start debugging a plugin
   */
  startDebugging(pluginId: string, options: DebugOptions = {}): DebugSession {
    if (this.debugSessions.has(pluginId)) {
      throw new Error(`Debug session for plugin '${pluginId}' already exists`);
    }

    const session = new DebugSession(pluginId, options);
    this.debugSessions.set(pluginId, session);
    
    console.log(`🐛 Started debugging plugin: ${pluginId}`);
    return session;
  }

  /**
   * Stop debugging a plugin
   */
  stopDebugging(pluginId: string): void {
    const session = this.debugSessions.get(pluginId);
    if (session) {
      session.stop();
      this.debugSessions.delete(pluginId);
      console.log(`🐛 Stopped debugging plugin: ${pluginId}`);
    }
  }

  /**
   * Get debug session for a plugin
   */
  getDebugSession(pluginId: string): DebugSession | undefined {
    return this.debugSessions.get(pluginId);
  }

  /**
   * Start profiling a plugin
   */
  startProfiling(pluginId: string, options: ProfileOptions = {}): ProfileSession {
    if (this.profilers.has(pluginId)) {
      throw new Error(`Profile session for plugin '${pluginId}' already exists`);
    }

    const session = new ProfileSession(pluginId, options);
    this.profilers.set(pluginId, session);
    
    console.log(`📊 Started profiling plugin: ${pluginId}`);
    return session;
  }

  /**
   * Stop profiling a plugin
   */
  stopProfiling(pluginId: string): ProfileReport | undefined {
    const session = this.profilers.get(pluginId);
    if (session) {
      const report = session.stop();
      this.profilers.delete(pluginId);
      console.log(`📊 Stopped profiling plugin: ${pluginId}`);
      return report;
    }
    return undefined;
  }

  /**
   * Get debug logger for a plugin
   */
  getLogger(pluginId: string): DebugLogger {
    if (!this.loggers.has(pluginId)) {
      this.loggers.set(pluginId, new DebugLogger(pluginId));
    }
    return this.loggers.get(pluginId)!;
  }

  /**
   * Inspect plugin state
   */
  inspectPlugin(plugin: Plugin | PluginInstance): PluginInspection {
    const inspection: PluginInspection = {
      id: plugin.id,
      manifest: plugin.manifest,
      state: 'state' in plugin ? plugin.state : 'unknown',
      hooks: plugin.hooks || {},
      extensions: 'extensions' in plugin ? plugin.extensions : {},
      metadata: 'metadata' in plugin ? plugin.metadata : undefined,
      memoryUsage: this.getMemoryUsage(plugin.id),
      eventListeners: this.getEventListeners(plugin.id),
      timestamp: new Date()
    };

    return inspection;
  }

  /**
   * Validate plugin structure
   */
  validatePlugin(plugin: Plugin): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required properties
    if (!plugin.id) errors.push('Plugin ID is required');
    if (!plugin.manifest) errors.push('Plugin manifest is required');
    if (!plugin.hooks) warnings.push('No hooks defined');

    // Check manifest structure
    if (plugin.manifest) {
      if (!plugin.manifest.name) errors.push('Plugin name is required in manifest');
      if (!plugin.manifest.version) errors.push('Plugin version is required in manifest');
      if (!plugin.manifest.description) warnings.push('Plugin description is recommended');
    }

    // Check method implementations
    if (typeof plugin.initialize !== 'function') {
      errors.push('Plugin must implement initialize method');
    }
    if (typeof plugin.activate !== 'function') {
      warnings.push('Plugin should implement activate method');
    }
    if (typeof plugin.deactivate !== 'function') {
      warnings.push('Plugin should implement deactivate method');
    }
    if (typeof plugin.destroy !== 'function') {
      warnings.push('Plugin should implement destroy method');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(errors, warnings)
    };
  }

  /**
   * Create plugin performance monitor
   */
  createPerformanceMonitor(pluginId: string): PerformanceMonitor {
    return new PerformanceMonitor(pluginId);
  }

  // Private methods

  private getMemoryUsage(pluginId: string): number {
    // In a real implementation, this would measure actual memory usage
    return Math.random() * 50 * 1024 * 1024; // Mock value
  }

  private getEventListeners(pluginId: string): string[] {
    // In a real implementation, this would return actual event listeners
    return ['plugin:loaded', 'plugin:activated']; // Mock values
  }

  private calculateValidationScore(errors: string[], warnings: string[]): number {
    const errorPenalty = errors.length * 20;
    const warningPenalty = warnings.length * 5;
    return Math.max(0, 100 - errorPenalty - warningPenalty);
  }
}

/**
 * Debug Session
 */
export class DebugSession {
  private breakpoints = new Set<string>();
  private watchedVariables = new Map<string, any>();
  private callStack: CallStackFrame[] = [];
  private isActive = true;
  private startTime = Date.now();

  constructor(
    private pluginId: string,
    private options: DebugOptions
  ) {}

  /**
   * Add a breakpoint
   */
  addBreakpoint(location: string): void {
    this.breakpoints.add(location);
    console.log(`🔴 Breakpoint added at: ${location}`);
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(location: string): void {
    this.breakpoints.delete(location);
    console.log(`⚪ Breakpoint removed from: ${location}`);
  }

  /**
   * Watch a variable
   */
  watch(variable: string, value: any): void {
    const oldValue = this.watchedVariables.get(variable);
    this.watchedVariables.set(variable, value);
    
    if (oldValue !== undefined && oldValue !== value) {
      console.log(`👁️ Variable '${variable}' changed:`, { oldValue, newValue: value });
    }
  }

  /**
   * Log debug information
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.isActive) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${this.pluginId}] ${timestamp}`;
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix} 🐛 ${message}`, data);
        break;
      case 'info':
        console.info(`${prefix} ℹ️ ${message}`, data);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${message}`, data);
        break;
      case 'error':
        console.error(`${prefix} ❌ ${message}`, data);
        break;
    }
  }

  /**
   * Push frame to call stack
   */
  pushFrame(frame: CallStackFrame): void {
    this.callStack.push(frame);
  }

  /**
   * Pop frame from call stack
   */
  popFrame(): CallStackFrame | undefined {
    return this.callStack.pop();
  }

  /**
   * Get current call stack
   */
  getCallStack(): CallStackFrame[] {
    return [...this.callStack];
  }

  /**
   * Stop the debug session
   */
  stop(): DebugReport {
    this.isActive = false;
    const endTime = Date.now();
    
    return {
      pluginId: this.pluginId,
      duration: endTime - this.startTime,
      breakpoints: Array.from(this.breakpoints),
      watchedVariables: Object.fromEntries(this.watchedVariables),
      maxCallStackDepth: this.callStack.length,
      endedAt: new Date()
    };
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.isActive;
  }
}

/**
 * Profile Session
 */
export class ProfileSession {
  private measurements: PerformanceMeasurement[] = [];
  private startTime = Date.now();
  private currentTimer?: NodeJS.Timeout;

  constructor(
    private pluginId: string,
    private options: ProfileOptions
  ) {
    // Start periodic measurements
    this.currentTimer = setInterval(() => {
      this.takeMeasurement();
    }, this.options.interval || 100);
  }

  /**
   * Record a custom measurement
   */
  measure(name: string, value: number, unit: string = 'ms'): void {
    this.measurements.push({
      name,
      value,
      unit,
      timestamp: Date.now() - this.startTime,
      type: 'custom'
    });
  }

  /**
   * Start timing an operation
   */
  startTiming(operationName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.measure(operationName, endTime - startTime, 'ms');
    };
  }

  /**
   * Stop profiling and generate report
   */
  stop(): ProfileReport {
    if (this.currentTimer) {
      clearInterval(this.currentTimer);
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Generate statistics
    const stats = this.generateStatistics();

    return {
      pluginId: this.pluginId,
      duration,
      measurements: [...this.measurements],
      statistics: stats,
      generatedAt: new Date()
    };
  }

  private takeMeasurement(): void {
    // Record memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.measurements.push({
        name: 'memory.heapUsed',
        value: memory.heapUsed,
        unit: 'bytes',
        timestamp: Date.now() - this.startTime,
        type: 'memory'
      });
    }

    // Record CPU usage (mock for browser environment)
    this.measurements.push({
      name: 'cpu.usage',
      value: Math.random() * 100,
      unit: 'percent',
      timestamp: Date.now() - this.startTime,
      type: 'cpu'
    });
  }

  private generateStatistics(): ProfileStatistics {
    const memoryMeasurements = this.measurements.filter(m => m.type === 'memory');
    const cpuMeasurements = this.measurements.filter(m => m.type === 'cpu');
    const customMeasurements = this.measurements.filter(m => m.type === 'custom');

    return {
      memory: {
        peak: Math.max(...memoryMeasurements.map(m => m.value)),
        average: memoryMeasurements.reduce((sum, m) => sum + m.value, 0) / memoryMeasurements.length,
        samples: memoryMeasurements.length
      },
      cpu: {
        peak: Math.max(...cpuMeasurements.map(m => m.value)),
        average: cpuMeasurements.reduce((sum, m) => sum + m.value, 0) / cpuMeasurements.length,
        samples: cpuMeasurements.length
      },
      operations: customMeasurements.length,
      totalSamples: this.measurements.length
    };
  }
}

/**
 * Debug Logger
 */
export class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs: number;

  constructor(
    private pluginId: string,
    options: LoggerOptions = {}
  ) {
    this.maxLogs = options.maxLogs || 1000;
  }

  debug(message: string, data?: any): void {
    this.addLog('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.addLog('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.addLog('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.addLog('error', message, data);
  }

  getLogs(filter?: LogFilter): LogEntry[] {
    let logs = [...this.logs];

    if (filter?.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter?.since) {
      logs = logs.filter(log => log.timestamp >= filter.since!);
    }

    if (filter?.search) {
      const search = filter.search.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(search) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(search))
      );
    }

    return logs;
  }

  clear(): void {
    this.logs.length = 0;
  }

  private addLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.logs.push({
      level,
      message,
      data,
      timestamp: new Date(),
      pluginId: this.pluginId
    });

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  constructor(private pluginId: string) {}

  /**
   * Start monitoring a metric
   */
  startMetric(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      samples: [],
      isActive: true
    });
  }

  /**
   * End monitoring a metric
   */
  endMetric(name: string): number | undefined {
    const metric = this.metrics.get(name);
    if (!metric || !metric.isActive) return undefined;

    const duration = performance.now() - metric.startTime;
    metric.samples.push(duration);
    metric.isActive = false;

    return duration;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string): MetricStatistics | undefined {
    const metric = this.metrics.get(name);
    if (!metric || metric.samples.length === 0) return undefined;

    const samples = metric.samples;
    const sum = samples.reduce((a, b) => a + b, 0);
    const sorted = [...samples].sort((a, b) => a - b);

    return {
      name,
      count: samples.length,
      min: Math.min(...samples),
      max: Math.max(...samples),
      average: sum / samples.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): MetricStatistics[] {
    return Array.from(this.metrics.keys())
      .map(name => this.getMetricStats(name))
      .filter((stats): stats is MetricStatistics => stats !== undefined);
  }
}

// Export singleton instance
export const debugTools = PluginDebugTools.getInstance();

// Types and Interfaces

export interface DebugOptions {
  breakOnStart?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  captureCallStack?: boolean;
}

export interface ProfileOptions {
  interval?: number;
  captureMemory?: boolean;
  captureCPU?: boolean;
}

export interface LoggerOptions {
  maxLogs?: number;
}

export interface CallStackFrame {
  function: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface DebugReport {
  pluginId: string;
  duration: number;
  breakpoints: string[];
  watchedVariables: Record<string, any>;
  maxCallStackDepth: number;
  endedAt: Date;
}

export interface PerformanceMeasurement {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  type: 'memory' | 'cpu' | 'custom';
}

export interface ProfileStatistics {
  memory: {
    peak: number;
    average: number;
    samples: number;
  };
  cpu: {
    peak: number;
    average: number;
    samples: number;
  };
  operations: number;
  totalSamples: number;
}

export interface ProfileReport {
  pluginId: string;
  duration: number;
  measurements: PerformanceMeasurement[];
  statistics: ProfileStatistics;
  generatedAt: Date;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  timestamp: Date;
  pluginId: string;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  since?: Date;
  search?: string;
}

export interface PluginInspection {
  id: string;
  manifest: any;
  state: string;
  hooks: any;
  extensions: any;
  metadata?: any;
  memoryUsage: number;
  eventListeners: string[];
  timestamp: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface PerformanceMetric {
  name: string;
  startTime: number;
  samples: number[];
  isActive: boolean;
}

export interface MetricStatistics {
  name: string;
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
}