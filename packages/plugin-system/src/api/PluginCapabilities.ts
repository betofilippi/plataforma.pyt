import type { PluginManifest } from '../types';

/**
 * Plugin Capabilities System
 * Defines and manages what plugins can do within the platform
 */
export class PluginCapabilityManager {
  private capabilities = new Map<string, CapabilityDefinition>();
  private pluginCapabilities = new Map<string, Set<string>>();
  private capabilityProviders = new Map<string, CapabilityProvider>();

  constructor() {
    this.initializeBuiltInCapabilities();
  }

  /**
   * Define a new capability
   */
  defineCapability(definition: CapabilityDefinition): void {
    this.capabilities.set(definition.id, definition);
  }

  /**
   * Register capability provider
   */
  registerProvider(capabilityId: string, provider: CapabilityProvider): void {
    if (!this.capabilities.has(capabilityId)) {
      throw new Error(`Capability '${capabilityId}' is not defined`);
    }

    this.capabilityProviders.set(capabilityId, provider);
  }

  /**
   * Grant capabilities to a plugin
   */
  grantCapabilities(pluginId: string, capabilities: string[]): void {
    if (!this.pluginCapabilities.has(pluginId)) {
      this.pluginCapabilities.set(pluginId, new Set());
    }

    const pluginCaps = this.pluginCapabilities.get(pluginId)!;
    
    for (const capabilityId of capabilities) {
      if (!this.capabilities.has(capabilityId)) {
        throw new Error(`Capability '${capabilityId}' is not defined`);
      }
      
      pluginCaps.add(capabilityId);
    }
  }

  /**
   * Revoke capabilities from a plugin
   */
  revokeCapabilities(pluginId: string, capabilities: string[]): void {
    const pluginCaps = this.pluginCapabilities.get(pluginId);
    if (!pluginCaps) return;

    for (const capabilityId of capabilities) {
      pluginCaps.delete(capabilityId);
    }
  }

  /**
   * Check if plugin has capability
   */
  hasCapability(pluginId: string, capabilityId: string): boolean {
    const pluginCaps = this.pluginCapabilities.get(pluginId);
    return pluginCaps ? pluginCaps.has(capabilityId) : false;
  }

  /**
   * Get all capabilities for a plugin
   */
  getPluginCapabilities(pluginId: string): string[] {
    const pluginCaps = this.pluginCapabilities.get(pluginId);
    return pluginCaps ? Array.from(pluginCaps) : [];
  }

  /**
   * Execute capability
   */
  async executeCapability(
    pluginId: string,
    capabilityId: string,
    context: CapabilityContext
  ): Promise<CapabilityResult> {
    // Check if plugin has capability
    if (!this.hasCapability(pluginId, capabilityId)) {
      throw new Error(`Plugin '${pluginId}' does not have capability '${capabilityId}'`);
    }

    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability '${capabilityId}' is not defined`);
    }

    const provider = this.capabilityProviders.get(capabilityId);
    if (!provider) {
      throw new Error(`No provider found for capability '${capabilityId}'`);
    }

    // Validate context
    if (capability.contextValidator && !capability.contextValidator(context)) {
      throw new Error(`Invalid context for capability '${capabilityId}'`);
    }

    try {
      const result = await provider.execute(context);
      
      return {
        success: true,
        data: result,
        capabilityId,
        pluginId,
        executedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        capabilityId,
        pluginId,
        executedAt: new Date()
      };
    }
  }

  /**
   * Get capability definition
   */
  getCapabilityDefinition(capabilityId: string): CapabilityDefinition | undefined {
    return this.capabilities.get(capabilityId);
  }

  /**
   * Get all capability definitions
   */
  getAllCapabilities(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Validate plugin capabilities against manifest
   */
  validatePluginCapabilities(manifest: PluginManifest): CapabilityValidationResult {
    const result: CapabilityValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!manifest.capabilities) {
      return result;
    }

    for (const capabilityId of manifest.capabilities) {
      const capability = this.capabilities.get(capabilityId);
      
      if (!capability) {
        result.valid = false;
        result.errors.push(`Unknown capability: ${capabilityId}`);
        continue;
      }

      // Check required permissions
      if (capability.requiredPermissions) {
        const missingPermissions = capability.requiredPermissions.filter(
          permission => !manifest.permissions?.includes(permission)
        );
        
        if (missingPermissions.length > 0) {
          result.valid = false;
          result.errors.push(
            `Capability '${capabilityId}' requires permissions: ${missingPermissions.join(', ')}`
          );
        }
      }

      // Check security level requirements
      if (capability.minSecurityLevel) {
        const securityLevels = ['untrusted', 'restricted', 'sandboxed', 'trusted'];
        const manifestLevel = manifest.securityLevel || 'sandboxed';
        const requiredLevel = capability.minSecurityLevel;
        
        if (securityLevels.indexOf(manifestLevel) < securityLevels.indexOf(requiredLevel)) {
          result.warnings.push(
            `Capability '${capabilityId}' recommends security level '${requiredLevel}' but plugin uses '${manifestLevel}'`
          );
        }
      }
    }

    return result;
  }

  /**
   * Get plugins that have a specific capability
   */
  getPluginsWithCapability(capabilityId: string): string[] {
    const plugins: string[] = [];
    
    for (const [pluginId, capabilities] of this.pluginCapabilities) {
      if (capabilities.has(capabilityId)) {
        plugins.push(pluginId);
      }
    }
    
    return plugins;
  }

  /**
   * Create capability proxy for plugin
   */
  createCapabilityProxy(pluginId: string): PluginCapabilityProxy {
    return new PluginCapabilityProxy(this, pluginId);
  }

  // Private Methods

  private initializeBuiltInCapabilities(): void {
    // UI Capabilities
    this.defineCapability({
      id: 'ui.component.register',
      name: 'Register UI Component',
      description: 'Register custom UI components',
      category: 'ui',
      requiredPermissions: ['ui'],
      contextValidator: (context) => typeof context.componentName === 'string' && context.component
    });

    this.defineCapability({
      id: 'ui.slot.register',
      name: 'Register UI Slot',
      description: 'Register components in UI slots',
      category: 'ui',
      requiredPermissions: ['ui'],
      contextValidator: (context) => typeof context.slotName === 'string'
    });

    this.defineCapability({
      id: 'ui.notification.show',
      name: 'Show Notifications',
      description: 'Display notifications to users',
      category: 'ui',
      requiredPermissions: ['ui']
    });

    this.defineCapability({
      id: 'ui.modal.show',
      name: 'Show Modals',
      description: 'Display modal dialogs',
      category: 'ui',
      requiredPermissions: ['ui']
    });

    // Data Capabilities
    this.defineCapability({
      id: 'data.query',
      name: 'Query Database',
      description: 'Execute database queries',
      category: 'data',
      requiredPermissions: ['database'],
      minSecurityLevel: 'sandboxed'
    });

    this.defineCapability({
      id: 'data.modify',
      name: 'Modify Database',
      description: 'Insert, update, or delete database records',
      category: 'data',
      requiredPermissions: ['database'],
      minSecurityLevel: 'trusted'
    });

    this.defineCapability({
      id: 'data.schema.modify',
      name: 'Modify Database Schema',
      description: 'Create or modify database tables and schemas',
      category: 'data',
      requiredPermissions: ['database', 'admin'],
      minSecurityLevel: 'trusted'
    });

    // Network Capabilities
    this.defineCapability({
      id: 'network.http.request',
      name: 'HTTP Requests',
      description: 'Make HTTP requests to external services',
      category: 'network',
      requiredPermissions: ['network']
    });

    this.defineCapability({
      id: 'network.websocket.connect',
      name: 'WebSocket Connections',
      description: 'Establish WebSocket connections',
      category: 'network',
      requiredPermissions: ['network']
    });

    // Storage Capabilities
    this.defineCapability({
      id: 'storage.local.access',
      name: 'Local Storage Access',
      description: 'Read and write to local storage',
      category: 'storage',
      requiredPermissions: ['storage']
    });

    this.defineCapability({
      id: 'storage.file.access',
      name: 'File System Access',
      description: 'Read and write files',
      category: 'storage',
      requiredPermissions: ['filesystem'],
      minSecurityLevel: 'trusted'
    });

    // System Capabilities
    this.defineCapability({
      id: 'system.module.invoke',
      name: 'Invoke System Modules',
      description: 'Call methods on system modules',
      category: 'system',
      requiredPermissions: ['system'],
      minSecurityLevel: 'sandboxed'
    });

    this.defineCapability({
      id: 'system.extension.register',
      name: 'Register Extensions',
      description: 'Register extension points',
      category: 'system',
      requiredPermissions: ['extensions']
    });

    // AI Capabilities
    this.defineCapability({
      id: 'ai.llm.invoke',
      name: 'Invoke LLM',
      description: 'Call Large Language Model APIs',
      category: 'ai',
      requiredPermissions: ['ai', 'network']
    });

    this.defineCapability({
      id: 'ai.ocr.process',
      name: 'OCR Processing',
      description: 'Extract text from images',
      category: 'ai',
      requiredPermissions: ['ai']
    });

    // Security Capabilities
    this.defineCapability({
      id: 'security.permission.request',
      name: 'Request Permissions',
      description: 'Request additional permissions',
      category: 'security',
      requiredPermissions: []
    });

    this.defineCapability({
      id: 'security.encrypt.data',
      name: 'Encrypt Data',
      description: 'Encrypt sensitive data',
      category: 'security',
      requiredPermissions: ['crypto']
    });
  }
}

/**
 * Plugin Capability Proxy
 * Provides easy access to capabilities for a specific plugin
 */
export class PluginCapabilityProxy {
  constructor(
    private capabilityManager: PluginCapabilityManager,
    private pluginId: string
  ) {}

  /**
   * Check if plugin has capability
   */
  has(capabilityId: string): boolean {
    return this.capabilityManager.hasCapability(this.pluginId, capabilityId);
  }

  /**
   * Execute capability
   */
  async execute(capabilityId: string, context: CapabilityContext): Promise<CapabilityResult> {
    return this.capabilityManager.executeCapability(this.pluginId, capabilityId, context);
  }

  /**
   * Get all capabilities for this plugin
   */
  list(): string[] {
    return this.capabilityManager.getPluginCapabilities(this.pluginId);
  }

  /**
   * UI Capabilities
   */
  ui = {
    registerComponent: (name: string, component: any) =>
      this.execute('ui.component.register', { componentName: name, component }),
    
    registerSlot: (name: string, component: any) =>
      this.execute('ui.slot.register', { slotName: name, component }),
    
    showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') =>
      this.execute('ui.notification.show', { message, type }),
    
    showModal: (component: any, props?: any) =>
      this.execute('ui.modal.show', { component, props })
  };

  /**
   * Data Capabilities
   */
  data = {
    query: (sql: string, params?: any[]) =>
      this.execute('data.query', { sql, params }),
    
    modify: (sql: string, params?: any[]) =>
      this.execute('data.modify', { sql, params }),
    
    modifySchema: (sql: string) =>
      this.execute('data.schema.modify', { sql })
  };

  /**
   * Network Capabilities
   */
  network = {
    httpRequest: (url: string, options?: RequestInit) =>
      this.execute('network.http.request', { url, options }),
    
    websocketConnect: (url: string) =>
      this.execute('network.websocket.connect', { url })
  };

  /**
   * Storage Capabilities
   */
  storage = {
    localAccess: (operation: 'get' | 'set' | 'delete', key: string, value?: any) =>
      this.execute('storage.local.access', { operation, key, value }),
    
    fileAccess: (operation: 'read' | 'write' | 'delete', path: string, data?: any) =>
      this.execute('storage.file.access', { operation, path, data })
  };

  /**
   * System Capabilities
   */
  system = {
    invokeModule: (moduleId: string, method: string, args?: any[]) =>
      this.execute('system.module.invoke', { moduleId, method, args }),
    
    registerExtension: (point: string, extension: any) =>
      this.execute('system.extension.register', { point, extension })
  };

  /**
   * AI Capabilities
   */
  ai = {
    invokeLLM: (prompt: string, options?: any) =>
      this.execute('ai.llm.invoke', { prompt, options }),
    
    processOCR: (image: string | Buffer) =>
      this.execute('ai.ocr.process', { image })
  };

  /**
   * Security Capabilities
   */
  security = {
    requestPermission: (permission: string) =>
      this.execute('security.permission.request', { permission }),
    
    encryptData: (data: any, algorithm?: string) =>
      this.execute('security.encrypt.data', { data, algorithm })
  };
}

// Default instance
export const pluginCapabilities = new PluginCapabilityManager();

// Types and Interfaces

export interface CapabilityDefinition {
  id: string;
  name: string;
  description: string;
  category: 'ui' | 'data' | 'network' | 'storage' | 'system' | 'ai' | 'security';
  requiredPermissions?: string[];
  minSecurityLevel?: 'untrusted' | 'restricted' | 'sandboxed' | 'trusted';
  contextValidator?: (context: CapabilityContext) => boolean;
  metadata?: Record<string, any>;
}

export interface CapabilityProvider {
  execute(context: CapabilityContext): Promise<any>;
}

export interface CapabilityContext {
  [key: string]: any;
}

export interface CapabilityResult {
  success: boolean;
  data?: any;
  error?: string;
  capabilityId: string;
  pluginId: string;
  executedAt: Date;
}

export interface CapabilityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}