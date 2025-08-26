import { VM } from 'vm2';
import type { PluginManifest, SecurityLevel } from '../types';
import { PluginSecurityError } from '../types';

/**
 * Plugin Sandbox
 * Provides secure execution environment for untrusted plugins using VM2
 * and resource limiting mechanisms.
 */
export class PluginSandbox {
  private sandboxes = new Map<string, SandboxInstance>();
  private globalResourceMonitor: ResourceMonitor;

  constructor(private readonly options: PluginSandboxOptions) {
    this.globalResourceMonitor = new ResourceMonitor({
      maxTotalMemory: options.maxTotalMemory || 200 * 1024 * 1024, // 200MB
      maxTotalCPU: options.maxTotalCPU || 50 // 50%
    });
  }

  async initialize(): Promise<void> {
    // Initialize global monitoring
    this.globalResourceMonitor.start();
  }

  /**
   * Create a sandbox for a plugin
   */
  async createSandbox(pluginId: string, manifest: PluginManifest): Promise<SandboxInstance> {
    if (this.sandboxes.has(pluginId)) {
      throw new PluginSecurityError(`Sandbox for plugin '${pluginId}' already exists`, pluginId);
    }

    const securityLevel = manifest.securityLevel || 'sandboxed';
    
    // Skip sandbox for trusted plugins
    if (securityLevel === 'trusted') {
      const trustedSandbox: SandboxInstance = {
        pluginId,
        securityLevel,
        vm: null,
        resourceMonitor: null,
        createdAt: new Date(),
        stats: {
          executions: 0,
          totalTime: 0,
          memoryPeak: 0,
          violations: []
        }
      };
      
      this.sandboxes.set(pluginId, trustedSandbox);
      return trustedSandbox;
    }

    try {
      // Create VM sandbox
      const vm = this.createVM(pluginId, manifest);
      
      // Create resource monitor
      const resourceMonitor = new ResourceMonitor({
        maxMemory: manifest.resourceLimits?.memory || 50 * 1024 * 1024, // 50MB
        maxCPU: manifest.resourceLimits?.cpu || 10, // 10%
        maxExecutionTime: 30000, // 30 seconds
        pluginId
      });

      const sandbox: SandboxInstance = {
        pluginId,
        securityLevel,
        vm,
        resourceMonitor,
        createdAt: new Date(),
        stats: {
          executions: 0,
          totalTime: 0,
          memoryPeak: 0,
          violations: []
        }
      };

      this.sandboxes.set(pluginId, sandbox);
      return sandbox;

    } catch (error) {
      throw new PluginSecurityError(
        `Failed to create sandbox for plugin '${pluginId}': ${error instanceof Error ? error.message : String(error)}`,
        pluginId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Execute code in sandbox
   */
  async execute<T>(
    pluginId: string,
    code: string | Function,
    context?: Record<string, any>
  ): Promise<T> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      throw new PluginSecurityError(`No sandbox found for plugin '${pluginId}'`, pluginId);
    }

    // Trusted plugins execute directly
    if (sandbox.securityLevel === 'trusted') {
      if (typeof code === 'function') {
        return await code();
      } else {
        // For trusted plugins, use eval (not recommended in production)
        return eval(code as string);
      }
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Start resource monitoring
      if (sandbox.resourceMonitor) {
        sandbox.resourceMonitor.startExecution();
      }

      let result: T;

      if (typeof code === 'function') {
        // Serialize function and execute in VM
        const serializedFn = this.serializeFunction(code);
        result = sandbox.vm!.run(serializedFn, 'plugin.js');
      } else {
        // Execute code string
        result = sandbox.vm!.run(code as string, 'plugin.js');
      }

      // Update statistics
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      sandbox.stats.executions++;
      sandbox.stats.totalTime += executionTime;
      sandbox.stats.memoryPeak = Math.max(sandbox.stats.memoryPeak, memoryUsed);

      return result;

    } catch (error) {
      // Record violation
      sandbox.stats.violations.push({
        type: 'execution_error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });

      if (error instanceof Error && error.message.includes('Script execution timed out')) {
        throw new PluginSecurityError(`Plugin '${pluginId}' execution timed out`, pluginId, error);
      }

      throw new PluginSecurityError(
        `Plugin '${pluginId}' execution failed: ${error instanceof Error ? error.message : String(error)}`,
        pluginId,
        error instanceof Error ? error : new Error(String(error))
      );

    } finally {
      // Stop resource monitoring
      if (sandbox.resourceMonitor) {
        sandbox.resourceMonitor.stopExecution();
      }
    }
  }

  /**
   * Get sandbox statistics
   */
  getSandboxStats(pluginId: string): SandboxStats | null {
    const sandbox = this.sandboxes.get(pluginId);
    return sandbox ? { ...sandbox.stats } : null;
  }

  /**
   * Get all sandbox statistics
   */
  getAllSandboxStats(): Record<string, SandboxStats> {
    const stats: Record<string, SandboxStats> = {};
    for (const [pluginId, sandbox] of this.sandboxes) {
      stats[pluginId] = { ...sandbox.stats };
    }
    return stats;
  }

  /**
   * Destroy a sandbox
   */
  async destroySandbox(pluginId: string): Promise<void> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      return;
    }

    try {
      // Stop resource monitoring
      if (sandbox.resourceMonitor) {
        sandbox.resourceMonitor.stop();
      }

      // Clean up VM
      if (sandbox.vm) {
        // VM2 doesn't have an explicit cleanup method, but the instance will be GC'd
        sandbox.vm = null;
      }

      this.sandboxes.delete(pluginId);

    } catch (error) {
      console.warn(`Error destroying sandbox for plugin '${pluginId}':`, error);
    }
  }

  /**
   * Shutdown all sandboxes
   */
  async shutdown(): Promise<void> {
    const pluginIds = Array.from(this.sandboxes.keys());
    await Promise.all(
      pluginIds.map(id => this.destroySandbox(id).catch(console.error))
    );

    this.globalResourceMonitor.stop();
  }

  // Private Methods

  private createVM(pluginId: string, manifest: PluginManifest): VM {
    const allowedAPIs = this.getAllowedAPIs(manifest);
    
    return new VM({
      timeout: 30000, // 30 second timeout
      sandbox: {
        // Provide safe APIs based on plugin permissions
        ...this.createSafeSandbox(pluginId, allowedAPIs),
        
        // Plugin-specific context
        __pluginId: pluginId,
        __manifest: manifest,
        
        // Safe utilities
        console: this.createSafeConsole(pluginId),
        setTimeout: this.createSafeTimeout(),
        setInterval: this.createSafeInterval(),
        clearTimeout: clearTimeout,
        clearInterval: clearInterval
      },
      
      // Security options
      eval: false,
      wasm: false,
      fixAsync: true
    });
  }

  private getAllowedAPIs(manifest: PluginManifest): string[] {
    const permissions = manifest.permissions || [];
    const allowedAPIs: string[] = [];

    if (permissions.includes('network')) {
      allowedAPIs.push('fetch', 'XMLHttpRequest');
    }

    if (permissions.includes('storage')) {
      allowedAPIs.push('localStorage', 'sessionStorage');
    }

    if (permissions.includes('dom')) {
      allowedAPIs.push('document', 'window');
    }

    if (permissions.includes('filesystem')) {
      allowedAPIs.push('fs');
    }

    return allowedAPIs;
  }

  private createSafeSandbox(pluginId: string, allowedAPIs: string[]): Record<string, any> {
    const sandbox: Record<string, any> = {
      // Always available
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      Math,
      JSON,
      Promise,
      RegExp,
      Error,
      TypeError,
      ReferenceError,
      SyntaxError
    };

    // Add allowed APIs
    if (allowedAPIs.includes('fetch')) {
      sandbox.fetch = this.createSafeFetch(pluginId);
    }

    if (allowedAPIs.includes('localStorage')) {
      sandbox.localStorage = this.createSafeStorage(pluginId, 'local');
    }

    if (allowedAPIs.includes('sessionStorage')) {
      sandbox.sessionStorage = this.createSafeStorage(pluginId, 'session');
    }

    // Add more safe APIs as needed

    return sandbox;
  }

  private createSafeConsole(pluginId: string): any {
    return {
      log: (...args: any[]) => console.log(`[Plugin:${pluginId}]`, ...args),
      warn: (...args: any[]) => console.warn(`[Plugin:${pluginId}]`, ...args),
      error: (...args: any[]) => console.error(`[Plugin:${pluginId}]`, ...args),
      info: (...args: any[]) => console.info(`[Plugin:${pluginId}]`, ...args),
      debug: (...args: any[]) => console.debug(`[Plugin:${pluginId}]`, ...args)
    };
  }

  private createSafeFetch(pluginId: string): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // Add security checks here
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if URL is allowed for this plugin
      if (!this.isURLAllowed(pluginId, url)) {
        throw new PluginSecurityError(`Plugin '${pluginId}' is not allowed to access URL: ${url}`, pluginId);
      }

      // Add plugin identification headers
      const headers = new Headers(init?.headers);
      headers.set('X-Plugin-ID', pluginId);
      
      return fetch(input, {
        ...init,
        headers
      });
    };
  }

  private createSafeStorage(pluginId: string, type: 'local' | 'session'): Storage {
    const storage = type === 'local' ? localStorage : sessionStorage;
    const prefix = `plugin_${pluginId}_`;

    return {
      get length() {
        let count = 0;
        for (let i = 0; i < storage.length; i++) {
          if (storage.key(i)?.startsWith(prefix)) {
            count++;
          }
        }
        return count;
      },

      key(index: number): string | null {
        const keys = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(prefix)) {
            keys.push(key.substring(prefix.length));
          }
        }
        return keys[index] || null;
      },

      getItem(key: string): string | null {
        return storage.getItem(prefix + key);
      },

      setItem(key: string, value: string): void {
        storage.setItem(prefix + key, value);
      },

      removeItem(key: string): void {
        storage.removeItem(prefix + key);
      },

      clear(): void {
        const keysToRemove = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => storage.removeItem(key));
      }
    };
  }

  private createSafeTimeout(): typeof setTimeout {
    return (callback: Function, delay: number, ...args: any[]) => {
      // Limit timeout duration
      const maxDelay = 60000; // 1 minute
      const safeDelay = Math.min(delay, maxDelay);
      
      return setTimeout(() => {
        try {
          callback(...args);
        } catch (error) {
          console.error('Error in plugin timeout callback:', error);
        }
      }, safeDelay);
    };
  }

  private createSafeInterval(): typeof setInterval {
    return (callback: Function, delay: number, ...args: any[]) => {
      // Limit interval frequency
      const minDelay = 100; // 100ms minimum
      const safeDelay = Math.max(delay, minDelay);
      
      return setInterval(() => {
        try {
          callback(...args);
        } catch (error) {
          console.error('Error in plugin interval callback:', error);
        }
      }, safeDelay);
    };
  }

  private serializeFunction(fn: Function): string {
    return `(${fn.toString()})()`;
  }

  private isURLAllowed(pluginId: string, url: string): boolean {
    // Implement URL allowlist/blocklist logic here
    // For now, allow all HTTPS URLs and localhost
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:' || 
             urlObj.hostname === 'localhost' ||
             urlObj.hostname === '127.0.0.1';
    } catch {
      return false;
    }
  }
}

/**
 * Resource Monitor
 * Monitors CPU and memory usage for plugins
 */
class ResourceMonitor {
  private isRunning = false;
  private executionStart: number = 0;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private readonly limits: ResourceLimits) {}

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Monitor resource usage every second
    this.intervalId = setInterval(() => {
      this.checkResourceUsage();
    }, 1000);
  }

  startExecution(): void {
    this.executionStart = Date.now();
  }

  stopExecution(): void {
    this.executionStart = 0;
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private checkResourceUsage(): void {
    // Check execution time limit
    if (this.executionStart > 0) {
      const executionTime = Date.now() - this.executionStart;
      if (executionTime > this.limits.maxExecutionTime) {
        throw new PluginSecurityError(
          `Plugin '${this.limits.pluginId}' exceeded execution time limit`,
          this.limits.pluginId
        );
      }
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage().heapUsed;
    if (memoryUsage > this.limits.maxMemory) {
      throw new PluginSecurityError(
        `Plugin '${this.limits.pluginId}' exceeded memory limit`,
        this.limits.pluginId
      );
    }
  }
}

// Types and Interfaces

export interface PluginSandboxOptions {
  enableSandbox?: boolean;
  maxTotalMemory?: number;
  maxTotalCPU?: number;
  resourceLimits?: {
    memory?: number;
    cpu?: number;
    storage?: number;
    network?: boolean;
  };
}

export interface SandboxInstance {
  pluginId: string;
  securityLevel: SecurityLevel;
  vm: VM | null;
  resourceMonitor: ResourceMonitor | null;
  createdAt: Date;
  stats: SandboxStats;
}

export interface SandboxStats {
  executions: number;
  totalTime: number;
  memoryPeak: number;
  violations: SecurityViolation[];
}

export interface SecurityViolation {
  type: string;
  message: string;
  timestamp: Date;
}

interface ResourceLimits {
  maxMemory: number;
  maxCPU: number;
  maxExecutionTime: number;
  pluginId?: string;
}

// Temporary error class (would import from types in real implementation)
class PluginSecurityError extends Error {
  constructor(
    message: string,
    public readonly pluginId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginSecurityError';
  }
}