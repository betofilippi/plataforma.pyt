import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginHooks
} from '../types';

/**
 * Base Plugin Class
 * Provides a foundation for plugin development with common functionality
 */
export abstract class BasePlugin implements Plugin {
  public readonly id: string;
  public readonly manifest: PluginManifest;
  protected context?: PluginContext;
  private initialized = false;
  private active = false;

  constructor(manifest: PluginManifest) {
    this.id = manifest.id;
    this.manifest = manifest;
  }

  /**
   * Get plugin hooks - must be implemented by subclasses
   */
  abstract get hooks(): PluginHooks;

  /**
   * Get plugin extensions - can be overridden by subclasses
   */
  get extensions(): Record<string, any> {
    return {};
  }

  /**
   * Initialize the plugin
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) {
      throw new Error(`Plugin '${this.id}' is already initialized`);
    }

    this.context = context;
    
    try {
      // Register hooks
      this.registerHooks();
      
      // Register extensions
      this.registerExtensions();
      
      // Call custom initialization
      await this.onInitialize();
      
      this.initialized = true;
      this.log('info', 'Plugin initialized successfully');
    } catch (error) {
      this.log('error', 'Failed to initialize plugin', error);
      throw error;
    }
  }

  /**
   * Activate the plugin
   */
  async activate(): Promise<void> {
    if (!this.initialized) {
      throw new Error(`Plugin '${this.id}' is not initialized`);
    }

    if (this.active) {
      return; // Already active
    }

    try {
      await this.onActivate();
      this.active = true;
      this.log('info', 'Plugin activated successfully');
    } catch (error) {
      this.log('error', 'Failed to activate plugin', error);
      throw error;
    }
  }

  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    if (!this.active) {
      return; // Already inactive
    }

    try {
      await this.onDeactivate();
      this.active = false;
      this.log('info', 'Plugin deactivated successfully');
    } catch (error) {
      this.log('error', 'Failed to deactivate plugin', error);
      throw error;
    }
  }

  /**
   * Destroy the plugin
   */
  async destroy(): Promise<void> {
    try {
      // Deactivate if active
      if (this.active) {
        await this.deactivate();
      }

      // Unregister extensions
      this.unregisterExtensions();

      // Call custom cleanup
      await this.onDestroy();

      this.initialized = false;
      this.log('info', 'Plugin destroyed successfully');
    } catch (error) {
      this.log('error', 'Failed to destroy plugin', error);
      throw error;
    }
  }

  /**
   * Check if plugin is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if plugin is active
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Get plugin context
   */
  getContext(): PluginContext {
    if (!this.context) {
      throw new Error(`Plugin '${this.id}' is not initialized`);
    }
    return this.context;
  }

  // Protected methods for subclasses to override

  /**
   * Custom initialization logic
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Custom activation logic
   */
  protected async onActivate(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Custom deactivation logic
   */
  protected async onDeactivate(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Custom cleanup logic
   */
  protected async onDestroy(): Promise<void> {
    // Override in subclasses
  }

  // Utility methods for plugin development

  /**
   * Log a message with the plugin logger
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    if (!this.context) return;

    switch (level) {
      case 'debug':
        this.context.logger.debug(message, ...args);
        break;
      case 'info':
        this.context.logger.info(message, ...args);
        break;
      case 'warn':
        this.context.logger.warn(message, ...args);
        break;
      case 'error':
        this.context.logger.error(message, ...args);
        break;
    }
  }

  /**
   * Emit an event
   */
  protected emit(eventType: string, data?: any): void {
    if (!this.context) return;
    this.context.events.emit(eventType, data);
  }

  /**
   * Listen for an event
   */
  protected on(eventType: string, listener: (...args: any[]) => void): void {
    if (!this.context) return;
    this.context.events.on(eventType, listener);
  }

  /**
   * Listen for an event once
   */
  protected once(eventType: string, listener: (...args: any[]) => void): void {
    if (!this.context) return;
    this.context.events.once(eventType, listener);
  }

  /**
   * Remove event listener
   */
  protected off(eventType: string, listener?: (...args: any[]) => void): void {
    if (!this.context) return;
    if (listener) {
      this.context.events.off(eventType, listener);
    } else {
      this.context.events.removeAllListeners(eventType);
    }
  }

  /**
   * Get configuration value
   */
  protected getConfig<T = any>(key: string, defaultValue?: T): T {
    if (!this.context) {
      return defaultValue as T;
    }
    return this.context.config[key] ?? defaultValue;
  }

  /**
   * Check if plugin has permission
   */
  protected hasPermission(permission: string): boolean {
    if (!this.context) return false;
    return this.context.permissions.has(permission);
  }

  /**
   * Request permission
   */
  protected async requestPermission(permission: string): Promise<boolean> {
    if (!this.context) return false;
    return await this.context.permissions.request(permission);
  }

  /**
   * Store data
   */
  protected async store(key: string, value: any): Promise<void> {
    if (!this.context) return;
    await this.context.storage.set(key, value);
  }

  /**
   * Retrieve data
   */
  protected async retrieve<T = any>(key: string): Promise<T | undefined> {
    if (!this.context) return undefined;
    return await this.context.storage.get(key);
  }

  /**
   * Make HTTP request
   */
  protected async httpGet(url: string, options?: RequestInit): Promise<Response> {
    if (!this.context) throw new Error('Plugin not initialized');
    return await this.context.api.http.get(url, options);
  }

  /**
   * Make HTTP POST request
   */
  protected async httpPost(url: string, data?: any, options?: RequestInit): Promise<Response> {
    if (!this.context) throw new Error('Plugin not initialized');
    return await this.context.api.http.post(url, data, options);
  }

  /**
   * Show notification
   */
  protected showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    if (!this.context) return;
    this.context.ui.showNotification(message, type);
  }

  /**
   * Navigate to path
   */
  protected navigate(path: string): void {
    if (!this.context) return;
    this.context.ui.navigate(path);
  }

  /**
   * Register UI component
   */
  protected registerUIComponent(name: string, component: any): void {
    if (!this.context) return;
    this.context.ui.registerComponent(name, component);
  }

  /**
   * Register UI slot
   */
  protected registerUISlot(name: string, component: any): void {
    if (!this.context) return;
    this.context.ui.registerSlot(name, component);
  }

  // Private methods

  private registerHooks(): void {
    const hooks = this.hooks;
    if (!hooks || !this.context) return;

    // Register lifecycle hooks with the platform
    // This would integrate with the platform's hook system
    // Implementation depends on the platform's hook registration API
  }

  private registerExtensions(): void {
    const extensions = this.extensions;
    if (!extensions || !this.context) return;

    // Register extensions with the platform
    for (const [extensionPoint, extension] of Object.entries(extensions)) {
      this.context.extensions.registerExtension(extensionPoint, extension);
    }
  }

  private unregisterExtensions(): void {
    const extensions = this.extensions;
    if (!extensions || !this.context) return;

    // Unregister extensions from the platform
    for (const extensionPoint of Object.keys(extensions)) {
      this.context.extensions.unregisterExtension(extensionPoint, this.id);
    }
  }
}

/**
 * Simple Plugin Class
 * For plugins that only need basic functionality
 */
export abstract class SimplePlugin extends BasePlugin {
  private pluginHooks: PluginHooks = {};

  /**
   * Set plugin hooks
   */
  protected setHooks(hooks: PluginHooks): void {
    this.pluginHooks = hooks;
  }

  get hooks(): PluginHooks {
    return this.pluginHooks;
  }
}

/**
 * Plugin Builder
 * Fluent interface for creating plugins
 */
export class PluginBuilder {
  private manifest: PluginManifest;
  private hooks: PluginHooks = {};
  private extensions: Record<string, any> = {};
  private initHandler?: () => Promise<void>;
  private activateHandler?: () => Promise<void>;
  private deactivateHandler?: () => Promise<void>;
  private destroyHandler?: () => Promise<void>;

  constructor(manifest: PluginManifest) {
    this.manifest = manifest;
  }

  /**
   * Add lifecycle hooks
   */
  withHooks(hooks: PluginHooks): PluginBuilder {
    this.hooks = { ...this.hooks, ...hooks };
    return this;
  }

  /**
   * Add extensions
   */
  withExtensions(extensions: Record<string, any>): PluginBuilder {
    this.extensions = { ...this.extensions, ...extensions };
    return this;
  }

  /**
   * Add initialization handler
   */
  withInitHandler(handler: () => Promise<void>): PluginBuilder {
    this.initHandler = handler;
    return this;
  }

  /**
   * Add activation handler
   */
  withActivateHandler(handler: () => Promise<void>): PluginBuilder {
    this.activateHandler = handler;
    return this;
  }

  /**
   * Add deactivation handler
   */
  withDeactivateHandler(handler: () => Promise<void>): PluginBuilder {
    this.deactivateHandler = handler;
    return this;
  }

  /**
   * Add destroy handler
   */
  withDestroyHandler(handler: () => Promise<void>): PluginBuilder {
    this.destroyHandler = handler;
    return this;
  }

  /**
   * Build the plugin
   */
  build(): Plugin {
    const plugin = new (class extends BasePlugin {
      get hooks() {
        return hooks;
      }

      get extensions() {
        return extensions;
      }

      protected async onInitialize() {
        if (initHandler) {
          await initHandler();
        }
      }

      protected async onActivate() {
        if (activateHandler) {
          await activateHandler();
        }
      }

      protected async onDeactivate() {
        if (deactivateHandler) {
          await deactivateHandler();
        }
      }

      protected async onDestroy() {
        if (destroyHandler) {
          await destroyHandler();
        }
      }
    })(this.manifest);

    // Capture variables for the anonymous class
    const { hooks, extensions, initHandler, activateHandler, deactivateHandler, destroyHandler } = this;

    return plugin;
  }
}

// Factory function for creating plugins
export function createPlugin(manifest: PluginManifest): PluginBuilder {
  return new PluginBuilder(manifest);
}