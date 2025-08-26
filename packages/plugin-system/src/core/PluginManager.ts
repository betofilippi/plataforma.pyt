import { EventEmitter } from 'eventemitter3';
import type {
  PluginInstance,
  PluginManifest,
  PluginConfig,
  PluginLifecycleState,
  PluginContext,
  PluginEvent,
  PluginError
} from '../types';
import { PluginLoader } from './PluginLoader';
import { PluginRegistry } from './PluginRegistry';
import { PermissionManager } from '../security/PermissionManager';
import { PluginSandbox } from './PluginSandbox';
import { PluginContextImpl } from '../api/PluginContext';

/**
 * Core Plugin Manager
 * Handles the complete lifecycle of plugins including loading, activation, 
 * deactivation, and resource management.
 */
export class PluginManager extends EventEmitter {
  private plugins = new Map<string, PluginInstance>();
  private pluginLoader: PluginLoader;
  private pluginRegistry: PluginRegistry;
  private permissionManager: PermissionManager;
  private sandbox: PluginSandbox;
  private isInitialized = false;

  constructor(
    private readonly options: PluginManagerOptions = {}
  ) {
    super();
    
    this.pluginLoader = new PluginLoader({
      baseUrl: options.pluginBaseUrl || '/plugins',
      timeout: options.loadTimeout || 30000
    });
    
    this.pluginRegistry = new PluginRegistry({
      storageProvider: options.storageProvider
    });
    
    this.permissionManager = new PermissionManager({
      strictMode: options.strictSecurity ?? true
    });
    
    this.sandbox = new PluginSandbox({
      enableSandbox: options.enableSandbox ?? true,
      resourceLimits: options.defaultResourceLimits
    });
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('PluginManager is already initialized');
    }

    try {
      await this.pluginRegistry.initialize();
      await this.permissionManager.initialize();
      await this.sandbox.initialize();
      
      this.isInitialized = true;
      this.emit('manager:initialized');
      
      // Auto-load enabled plugins
      if (this.options.autoLoadPlugins !== false) {
        await this.loadEnabledPlugins();
      }
      
    } catch (error) {
      this.emit('manager:error', error);
      throw error;
    }
  }

  /**
   * Load and register a plugin
   */
  async loadPlugin(
    pluginId: string, 
    config?: Partial<PluginConfig>
  ): Promise<PluginInstance> {
    this.ensureInitialized();
    
    if (this.plugins.has(pluginId)) {
      throw new PluginError(
        `Plugin '${pluginId}' is already loaded`,
        'PLUGIN_ALREADY_LOADED',
        pluginId
      );
    }

    try {
      // Create plugin instance with loading state
      const instance: PluginInstance = {
        id: pluginId,
        manifest: {} as PluginManifest, // Will be populated by loader
        config: {} as PluginConfig,     // Will be populated below
        state: PluginLifecycleState.LOADING,
        module: null,
        context: {} as PluginContext,   // Will be created below
        metadata: {
          loadedAt: new Date(),
          lastActivity: new Date(),
          errorCount: 0,
          resourceUsage: {
            memory: 0,
            cpu: 0
          }
        }
      };

      this.plugins.set(pluginId, instance);
      this.emitPluginEvent('plugin:loading', pluginId);

      // Load plugin manifest and module
      const { manifest, module } = await this.pluginLoader.loadPlugin(pluginId);
      
      // Validate manifest
      await this.validatePluginManifest(manifest);
      
      // Create plugin configuration
      const pluginConfig = await this.createPluginConfig(manifest, config);
      
      // Check permissions
      await this.permissionManager.validatePermissions(
        pluginId, 
        manifest.permissions || []
      );
      
      // Create plugin context
      const context = this.createPluginContext(instance, manifest, pluginConfig);
      
      // Update instance
      instance.manifest = manifest;
      instance.config = pluginConfig;
      instance.module = module;
      instance.context = context;
      instance.state = PluginLifecycleState.LOADED;
      
      // Initialize plugin in sandbox if required
      if (manifest.securityLevel !== 'trusted') {
        instance.sandbox = await this.sandbox.createSandbox(pluginId, manifest);
      }
      
      // Register with registry
      await this.pluginRegistry.registerPlugin(instance);
      
      this.emitPluginEvent('plugin:loaded', pluginId, { manifest });
      
      return instance;
      
    } catch (error) {
      // Clean up on error
      this.plugins.delete(pluginId);
      this.emitPluginEvent('plugin:error', pluginId, { error });
      throw error;
    }
  }

  /**
   * Activate a loaded plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);
    
    if (instance.state === PluginLifecycleState.ACTIVE) {
      return; // Already active
    }
    
    if (instance.state !== PluginLifecycleState.LOADED && 
        instance.state !== PluginLifecycleState.INACTIVE) {
      throw new PluginError(
        `Cannot activate plugin '${pluginId}' in state '${instance.state}'`,
        'INVALID_STATE',
        pluginId
      );
    }

    try {
      instance.state = PluginLifecycleState.INITIALIZING;
      this.emitPluginEvent('plugin:activating', pluginId);
      
      // Initialize plugin
      if (instance.module.initialize) {
        await this.executeInSandbox(
          instance,
          () => instance.module.initialize(instance.context)
        );
      }
      
      // Call activation hook
      if (instance.context.hooks?.onActivate) {
        await this.executeInSandbox(
          instance,
          () => instance.context.hooks!.onActivate!()
        );
      }
      
      instance.state = PluginLifecycleState.ACTIVE;
      instance.metadata.lastActivity = new Date();
      
      this.emitPluginEvent('plugin:activated', pluginId);
      
    } catch (error) {
      instance.state = PluginLifecycleState.ERROR;
      instance.metadata.errorCount++;
      this.emitPluginEvent('plugin:error', pluginId, { error });
      throw error;
    }
  }

  /**
   * Deactivate an active plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const instance = this.getPluginInstance(pluginId);
    
    if (instance.state !== PluginLifecycleState.ACTIVE) {
      return; // Not active
    }

    try {
      this.emitPluginEvent('plugin:deactivating', pluginId);
      
      // Call deactivation hook
      if (instance.context.hooks?.onDeactivate) {
        await this.executeInSandbox(
          instance,
          () => instance.context.hooks!.onDeactivate!()
        );
      }
      
      // Deactivate plugin
      if (instance.module.deactivate) {
        await this.executeInSandbox(
          instance,
          () => instance.module.deactivate()
        );
      }
      
      instance.state = PluginLifecycleState.INACTIVE;
      this.emitPluginEvent('plugin:deactivated', pluginId);
      
    } catch (error) {
      instance.state = PluginLifecycleState.ERROR;
      instance.metadata.errorCount++;
      this.emitPluginEvent('plugin:error', pluginId, { error });
      throw error;
    }
  }

  /**
   * Unload a plugin completely
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return; // Already unloaded
    }

    try {
      // Deactivate first if active
      if (instance.state === PluginLifecycleState.ACTIVE) {
        await this.deactivatePlugin(pluginId);
      }
      
      instance.state = PluginLifecycleState.UNLOADING;
      this.emitPluginEvent('plugin:unloading', pluginId);
      
      // Call unload hook
      if (instance.context.hooks?.onUnload) {
        await this.executeInSandbox(
          instance,
          () => instance.context.hooks!.onUnload!()
        );
      }
      
      // Destroy plugin
      if (instance.module.destroy) {
        await this.executeInSandbox(
          instance,
          () => instance.module.destroy()
        );
      }
      
      // Clean up sandbox
      if (instance.sandbox) {
        await this.sandbox.destroySandbox(pluginId);
      }
      
      // Unregister from registry
      await this.pluginRegistry.unregisterPlugin(pluginId);
      
      // Remove from memory
      this.plugins.delete(pluginId);
      
      this.emitPluginEvent('plugin:unloaded', pluginId);
      
    } catch (error) {
      instance.state = PluginLifecycleState.ERROR;
      instance.metadata.errorCount++;
      this.emitPluginEvent('plugin:error', pluginId, { error });
      throw error;
    }
  }

  /**
   * Get plugin instance
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginLifecycleState): PluginInstance[] {
    return this.getAllPlugins().filter(plugin => plugin.state === state);
  }

  /**
   * Get active plugins
   */
  getActivePlugins(): PluginInstance[] {
    return this.getPluginsByState(PluginLifecycleState.ACTIVE);
  }

  /**
   * Check if plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if plugin is active
   */
  isPluginActive(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return plugin?.state === PluginLifecycleState.ACTIVE;
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<PluginInstance> {
    await this.unloadPlugin(pluginId);
    return await this.loadPlugin(pluginId);
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(
    pluginId: string, 
    config: Partial<PluginConfig>
  ): Promise<void> {
    const instance = this.getPluginInstance(pluginId);
    
    // Merge with existing config
    instance.config = {
      ...instance.config,
      ...config
    };
    
    // Persist configuration
    await this.pluginRegistry.updatePluginConfig(pluginId, instance.config);
    
    this.emitPluginEvent('plugin:config:updated', pluginId, { config: instance.config });
  }

  /**
   * Get plugin resource usage
   */
  getPluginResourceUsage(pluginId: string): any {
    const instance = this.getPluginInstance(pluginId);
    return {
      memory: instance.metadata.resourceUsage.memory,
      cpu: instance.metadata.resourceUsage.cpu,
      uptime: Date.now() - instance.metadata.loadedAt.getTime(),
      errorCount: instance.metadata.errorCount,
      lastActivity: instance.metadata.lastActivity
    };
  }

  /**
   * Shutdown the plugin manager
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Unload all plugins
    const pluginIds = Array.from(this.plugins.keys());
    await Promise.all(
      pluginIds.map(id => this.unloadPlugin(id).catch(console.error))
    );
    
    // Shutdown components
    await this.sandbox.shutdown();
    await this.pluginRegistry.shutdown();
    
    this.isInitialized = false;
    this.emit('manager:shutdown');
  }

  // Private Methods
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PluginManager is not initialized');
    }
  }

  private getPluginInstance(pluginId: string): PluginInstance {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new PluginError(
        `Plugin '${pluginId}' is not loaded`,
        'PLUGIN_NOT_LOADED',
        pluginId
      );
    }
    return instance;
  }

  private async validatePluginManifest(manifest: PluginManifest): Promise<void> {
    // Validate against schema
    const result = PluginManifestSchema.safeParse(manifest);
    if (!result.success) {
      throw new PluginError(
        `Invalid plugin manifest: ${result.error.message}`,
        'INVALID_MANIFEST',
        manifest.id
      );
    }
  }

  private async createPluginConfig(
    manifest: PluginManifest,
    overrides?: Partial<PluginConfig>
  ): Promise<PluginConfig> {
    // Get stored config
    const storedConfig = await this.pluginRegistry.getPluginConfig(manifest.id);
    
    return {
      id: manifest.id,
      enabled: true,
      autoStart: true,
      config: { ...manifest.config, ...storedConfig?.config, ...overrides?.config },
      permissions: manifest.permissions || [],
      resourceLimits: {
        memory: 50 * 1024 * 1024, // 50MB default
        cpu: 10, // 10% CPU
        storage: 10 * 1024 * 1024, // 10MB storage
        network: true,
        ...this.options.defaultResourceLimits,
        ...overrides?.resourceLimits
      },
      ...overrides
    };
  }

  private createPluginContext(
    instance: PluginInstance,
    manifest: PluginManifest,
    config: PluginConfig
  ): PluginContext {
    return new PluginContextImpl({
      pluginId: instance.id,
      manifest,
      config,
      pluginManager: this,
      permissionManager: this.permissionManager
    });
  }

  private async executeInSandbox<T>(
    instance: PluginInstance,
    fn: () => Promise<T> | T
  ): Promise<T> {
    if (instance.sandbox) {
      return await this.sandbox.execute(instance.id, fn);
    } else {
      return await fn();
    }
  }

  private async loadEnabledPlugins(): Promise<void> {
    try {
      const enabledPlugins = await this.pluginRegistry.getEnabledPlugins();
      
      for (const pluginConfig of enabledPlugins) {
        try {
          const instance = await this.loadPlugin(pluginConfig.id, pluginConfig);
          
          if (pluginConfig.autoStart) {
            await this.activatePlugin(instance.id);
          }
        } catch (error) {
          console.error(`Failed to load plugin '${pluginConfig.id}':`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load enabled plugins:', error);
    }
  }

  private setupEventHandlers(): void {
    // Monitor resource usage
    if (this.options.enableResourceMonitoring !== false) {
      setInterval(() => {
        this.updateResourceUsage();
      }, 5000);
    }
  }

  private updateResourceUsage(): void {
    for (const instance of this.plugins.values()) {
      if (instance.state === PluginLifecycleState.ACTIVE) {
        // Update memory and CPU usage
        // In a real implementation, this would use actual system metrics
        instance.metadata.resourceUsage.memory = process.memoryUsage().heapUsed;
        instance.metadata.resourceUsage.cpu = process.cpuUsage().user;
      }
    }
  }

  private emitPluginEvent(type: string, pluginId: string, data?: any): void {
    const event: PluginEvent = {
      type,
      pluginId,
      timestamp: new Date(),
      data
    };
    
    this.emit(type, event);
    this.emit('plugin:event', event);
  }
}

// Configuration Interface
export interface PluginManagerOptions {
  pluginBaseUrl?: string;
  loadTimeout?: number;
  storageProvider?: any;
  strictSecurity?: boolean;
  enableSandbox?: boolean;
  autoLoadPlugins?: boolean;
  enableResourceMonitoring?: boolean;
  defaultResourceLimits?: {
    memory?: number;
    cpu?: number;
    storage?: number;
    network?: boolean;
  };
}

// Error class import
class PluginError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly pluginId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

// Schema import (would be imported from types in real implementation)
const PluginManifestSchema = { safeParse: (obj: any) => ({ success: true, data: obj }) } as any;