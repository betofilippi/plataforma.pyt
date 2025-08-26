import { EventEmitter } from 'eventemitter3';
import type { PluginHooks, DataChangeEvent } from '../types';

/**
 * Plugin Hook System
 * Manages extension points and hooks that plugins can register to
 * extend platform functionality.
 */
export class PluginHookSystem extends EventEmitter {
  private hooks = new Map<string, HookRegistry>();
  private globalHooks: Set<string> = new Set();

  constructor() {
    super();
    this.initializeBuiltInHooks();
  }

  /**
   * Register a hook handler
   */
  registerHook<T = any>(
    hookName: string,
    pluginId: string,
    handler: HookHandler<T>,
    options: HookOptions = {}
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, {
        name: hookName,
        handlers: new Map(),
        options: { async: true, priority: false }
      });
    }

    const registry = this.hooks.get(hookName)!;
    
    const hookHandler: RegisteredHookHandler<T> = {
      pluginId,
      handler,
      priority: options.priority || 0,
      async: options.async ?? true,
      condition: options.condition,
      registeredAt: new Date()
    };

    registry.handlers.set(pluginId, hookHandler);

    // Sort by priority
    if (options.priority) {
      this.sortHandlersByPriority(registry);
    }

    this.emit('hook:registered', { hookName, pluginId, options });
  }

  /**
   * Unregister a hook handler
   */
  unregisterHook(hookName: string, pluginId: string): void {
    const registry = this.hooks.get(hookName);
    if (registry) {
      registry.handlers.delete(pluginId);
      this.emit('hook:unregistered', { hookName, pluginId });
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPluginHooks(pluginId: string): void {
    for (const [hookName, registry] of this.hooks) {
      if (registry.handlers.has(pluginId)) {
        registry.handlers.delete(pluginId);
        this.emit('hook:unregistered', { hookName, pluginId });
      }
    }
  }

  /**
   * Execute a hook synchronously
   */
  executeSync<T = any>(hookName: string, context: HookContext<T>): HookResult<T> {
    const registry = this.hooks.get(hookName);
    if (!registry) {
      return { results: [], errors: [] };
    }

    const results: T[] = [];
    const errors: HookError[] = [];

    for (const [pluginId, hookHandler] of registry.handlers) {
      try {
        // Check condition if provided
        if (hookHandler.condition && !hookHandler.condition(context)) {
          continue;
        }

        const result = hookHandler.handler(context);
        
        if (result !== undefined) {
          results.push(result);
        }
      } catch (error) {
        errors.push({
          pluginId,
          hookName,
          error: error instanceof Error ? error : new Error(String(error))
        });
        
        this.emit('hook:error', { hookName, pluginId, error });
      }
    }

    return { results, errors };
  }

  /**
   * Execute a hook asynchronously
   */
  async executeAsync<T = any>(hookName: string, context: HookContext<T>): Promise<HookResult<T>> {
    const registry = this.hooks.get(hookName);
    if (!registry) {
      return { results: [], errors: [] };
    }

    const results: T[] = [];
    const errors: HookError[] = [];

    const promises = Array.from(registry.handlers.entries()).map(
      async ([pluginId, hookHandler]) => {
        try {
          // Check condition if provided
          if (hookHandler.condition && !hookHandler.condition(context)) {
            return;
          }

          const result = await hookHandler.handler(context);
          
          if (result !== undefined) {
            results.push(result);
          }
        } catch (error) {
          errors.push({
            pluginId,
            hookName,
            error: error instanceof Error ? error : new Error(String(error))
          });
          
          this.emit('hook:error', { hookName, pluginId, error });
        }
      }
    );

    await Promise.all(promises);

    return { results, errors };
  }

  /**
   * Execute hook with automatic sync/async detection
   */
  async execute<T = any>(hookName: string, context: HookContext<T>): Promise<HookResult<T>> {
    const registry = this.hooks.get(hookName);
    if (!registry || registry.options.async === false) {
      return this.executeSync(hookName, context);
    } else {
      return this.executeAsync(hookName, context);
    }
  }

  /**
   * Check if a hook exists
   */
  hasHook(hookName: string): boolean {
    return this.hooks.has(hookName);
  }

  /**
   * Get hook information
   */
  getHookInfo(hookName: string): HookInfo | undefined {
    const registry = this.hooks.get(hookName);
    if (!registry) {
      return undefined;
    }

    return {
      name: hookName,
      handlerCount: registry.handlers.size,
      handlers: Array.from(registry.handlers.entries()).map(([pluginId, handler]) => ({
        pluginId,
        priority: handler.priority,
        async: handler.async,
        registeredAt: handler.registeredAt
      })),
      options: registry.options
    };
  }

  /**
   * Get all available hooks
   */
  getAllHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get hooks for a specific plugin
   */
  getPluginHooks(pluginId: string): string[] {
    const pluginHooks: string[] = [];
    
    for (const [hookName, registry] of this.hooks) {
      if (registry.handlers.has(pluginId)) {
        pluginHooks.push(hookName);
      }
    }
    
    return pluginHooks;
  }

  /**
   * Create a hook filter
   */
  createFilter<T>(hookName: string): HookFilter<T> {
    return {
      apply: async (value: T, ...args: any[]) => {
        const context: HookContext<T> = {
          value,
          args,
          timestamp: new Date(),
          metadata: {}
        };
        
        const result = await this.execute(hookName, context);
        
        // Return the last result or original value
        return result.results.length > 0 ? result.results[result.results.length - 1] : value;
      }
    };
  }

  /**
   * Create a hook action
   */
  createAction(hookName: string): HookAction {
    return {
      trigger: async (...args: any[]) => {
        const context: HookContext<void> = {
          value: undefined,
          args,
          timestamp: new Date(),
          metadata: {}
        };
        
        await this.execute(hookName, context);
      }
    };
  }

  // Built-in Hook Implementations

  /**
   * Data change hook
   */
  async onDataChange(event: DataChangeEvent): Promise<void> {
    await this.execute('data:change', {
      value: event,
      args: [event],
      timestamp: new Date(),
      metadata: { table: event.table, operation: event.operation }
    });
  }

  /**
   * Query execution hook
   */
  async onQueryExecuted(query: string, results: any): Promise<void> {
    await this.execute('data:query', {
      value: { query, results },
      args: [query, results],
      timestamp: new Date(),
      metadata: { queryLength: query.length, resultCount: Array.isArray(results) ? results.length : 1 }
    });
  }

  /**
   * UI event hook
   */
  async onUIEvent(event: UIEvent): Promise<void> {
    await this.execute('ui:event', {
      value: event,
      args: [event],
      timestamp: new Date(),
      metadata: { eventType: event.type }
    });
  }

  /**
   * Route change hook
   */
  async onRouteChange(route: string): Promise<void> {
    await this.execute('ui:route:change', {
      value: route,
      args: [route],
      timestamp: new Date(),
      metadata: { route }
    });
  }

  /**
   * System ready hook
   */
  async onSystemReady(): Promise<void> {
    await this.execute('system:ready', {
      value: undefined,
      args: [],
      timestamp: new Date(),
      metadata: {}
    });
  }

  /**
   * Module loaded hook
   */
  async onModuleLoaded(moduleId: string): Promise<void> {
    await this.execute('system:module:loaded', {
      value: moduleId,
      args: [moduleId],
      timestamp: new Date(),
      metadata: { moduleId }
    });
  }

  // Private Methods

  private initializeBuiltInHooks(): void {
    const builtInHooks = [
      // Lifecycle hooks
      'plugin:load',
      'plugin:activate',
      'plugin:deactivate',
      'plugin:unload',
      
      // System hooks
      'system:ready',
      'system:module:loaded',
      
      // Data hooks
      'data:change',
      'data:query',
      'data:transaction:start',
      'data:transaction:commit',
      'data:transaction:rollback',
      
      // UI hooks
      'ui:event',
      'ui:route:change',
      'ui:window:open',
      'ui:window:close',
      'ui:component:mount',
      'ui:component:unmount',
      
      // Security hooks
      'security:permission:request',
      'security:permission:grant',
      'security:permission:deny',
      
      // Network hooks
      'network:request:start',
      'network:request:complete',
      'network:request:error'
    ];

    for (const hookName of builtInHooks) {
      this.hooks.set(hookName, {
        name: hookName,
        handlers: new Map(),
        options: { async: true, priority: true }
      });
      this.globalHooks.add(hookName);
    }
  }

  private sortHandlersByPriority(registry: HookRegistry): void {
    const sortedEntries = Array.from(registry.handlers.entries())
      .sort(([, a], [, b]) => b.priority - a.priority);
    
    registry.handlers.clear();
    
    for (const [pluginId, handler] of sortedEntries) {
      registry.handlers.set(pluginId, handler);
    }
  }
}

// Default instance
export const pluginHooks = new PluginHookSystem();

// Helper Functions

/**
 * Create plugin hooks interface for a specific plugin
 */
export function createPluginHooks(
  pluginId: string, 
  hookSystem: PluginHookSystem = pluginHooks
): PluginHooks {
  return {
    // Lifecycle hooks
    onLoad: undefined,
    onActivate: undefined,
    onDeactivate: undefined,
    onUnload: undefined,

    // System hooks
    onSystemReady: undefined,
    onModuleLoaded: undefined,

    // Data hooks
    onDataChange: undefined,
    onQueryExecuted: undefined,

    // UI hooks
    onUIEvent: undefined,
    onRouteChange: undefined
  };
}

/**
 * Register standard plugin hooks
 */
export function registerPluginHooks(
  pluginId: string,
  hooks: PluginHooks,
  hookSystem: PluginHookSystem = pluginHooks
): void {
  if (hooks.onLoad) {
    hookSystem.registerHook('plugin:load', pluginId, () => hooks.onLoad!());
  }

  if (hooks.onActivate) {
    hookSystem.registerHook('plugin:activate', pluginId, () => hooks.onActivate!());
  }

  if (hooks.onDeactivate) {
    hookSystem.registerHook('plugin:deactivate', pluginId, () => hooks.onDeactivate!());
  }

  if (hooks.onUnload) {
    hookSystem.registerHook('plugin:unload', pluginId, () => hooks.onUnload!());
  }

  if (hooks.onSystemReady) {
    hookSystem.registerHook('system:ready', pluginId, () => hooks.onSystemReady!());
  }

  if (hooks.onModuleLoaded) {
    hookSystem.registerHook('system:module:loaded', pluginId, 
      (context) => hooks.onModuleLoaded!(context.value)
    );
  }

  if (hooks.onDataChange) {
    hookSystem.registerHook('data:change', pluginId,
      (context) => hooks.onDataChange!(context.value)
    );
  }

  if (hooks.onQueryExecuted) {
    hookSystem.registerHook('data:query', pluginId,
      (context) => hooks.onQueryExecuted!(context.value.query, context.value.results)
    );
  }

  if (hooks.onUIEvent) {
    hookSystem.registerHook('ui:event', pluginId,
      (context) => hooks.onUIEvent!(context.value)
    );
  }

  if (hooks.onRouteChange) {
    hookSystem.registerHook('ui:route:change', pluginId,
      (context) => hooks.onRouteChange!(context.value)
    );
  }
}

// Types and Interfaces

export interface HookRegistry {
  name: string;
  handlers: Map<string, RegisteredHookHandler>;
  options: { async: boolean; priority: boolean };
}

export interface RegisteredHookHandler<T = any> {
  pluginId: string;
  handler: HookHandler<T>;
  priority: number;
  async: boolean;
  condition?: (context: HookContext<T>) => boolean;
  registeredAt: Date;
}

export type HookHandler<T = any> = (context: HookContext<T>) => T | Promise<T> | void | Promise<void>;

export interface HookContext<T = any> {
  value: T;
  args: any[];
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface HookOptions {
  priority?: number;
  async?: boolean;
  condition?: (context: HookContext) => boolean;
}

export interface HookResult<T = any> {
  results: T[];
  errors: HookError[];
}

export interface HookError {
  pluginId: string;
  hookName: string;
  error: Error;
}

export interface HookInfo {
  name: string;
  handlerCount: number;
  handlers: Array<{
    pluginId: string;
    priority: number;
    async: boolean;
    registeredAt: Date;
  }>;
  options: { async: boolean; priority: boolean };
}

export interface HookFilter<T> {
  apply(value: T, ...args: any[]): Promise<T>;
}

export interface HookAction {
  trigger(...args: any[]): Promise<void>;
}