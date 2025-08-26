/**
 * Plugin System
 * 
 * A comprehensive plugin architecture system for Plataforma.dev
 * that provides secure, extensible, and manageable plugin functionality.
 * 
 * @version 1.0.0
 * @author Plataforma.dev Team
 * @license MIT
 */

// Core Types and Interfaces
export * from './types';

// Core Plugin System
export * from './core';

// Plugin API Layer
export * from './api';

// Security Layer
export * from './security';

// Extension Points
export * from './extensions';

// Plugin Development Kit (SDK)
export * from './sdk';

// Main Plugin Manager (Default Export)
export { PluginManager } from './core/PluginManager';

/**
 * Plugin System Version
 */
export const VERSION = '1.0.0';

/**
 * Default Plugin Manager Configuration
 */
export const DEFAULT_CONFIG = {
  pluginBaseUrl: '/plugins',
  loadTimeout: 30000,
  strictSecurity: true,
  enableSandbox: true,
  autoLoadPlugins: true,
  enableResourceMonitoring: true,
  defaultResourceLimits: {
    memory: 50 * 1024 * 1024, // 50MB
    cpu: 10, // 10%
    storage: 10 * 1024 * 1024, // 10MB
    network: true
  }
};

/**
 * Create a pre-configured plugin manager instance
 */
export function createPluginManager(options?: any) {
  const { PluginManager } = require('./core/PluginManager');
  return new PluginManager({ ...DEFAULT_CONFIG, ...options });
}

/**
 * Plugin System Information
 */
export const PLUGIN_SYSTEM_INFO = {
  name: '@plataforma/plugin-system',
  version: VERSION,
  description: 'Comprehensive Plugin Architecture System for Plataforma.dev',
  features: [
    'Secure plugin sandbox execution',
    'Comprehensive permission system',
    'Resource limits and monitoring',
    'Network access control',
    'UI extension points',
    'Data transformation hooks',
    'API endpoint extensions',
    'Workflow automation',
    'Plugin development SDK',
    'Testing framework',
    'Debug and profiling tools'
  ],
  securityLevels: ['trusted', 'sandboxed', 'restricted', 'untrusted'],
  supportedCategories: [
    'business-module',
    'ui-component', 
    'data-processor',
    'integration',
    'workflow',
    'security',
    'utility',
    'ai-extension'
  ]
};

/**
 * Quick Start Helper
 * Creates a basic plugin manager with sensible defaults
 */
export async function quickStart(options: {
  autoLoad?: boolean;
  pluginDirectory?: string;
  securityLevel?: 'strict' | 'moderate' | 'relaxed';
} = {}): Promise<any> {
  const { PluginManager } = require('./core/PluginManager');
  const { MemoryStorageProvider } = require('./core/PluginRegistry');
  
  const config = {
    ...DEFAULT_CONFIG,
    pluginBaseUrl: options.pluginDirectory || '/plugins',
    autoLoadPlugins: options.autoLoad !== false,
    strictSecurity: options.securityLevel !== 'relaxed',
    storageProvider: new MemoryStorageProvider()
  };

  // Adjust security based on level
  if (options.securityLevel === 'moderate') {
    config.enableSandbox = true;
    config.strictSecurity = false;
  } else if (options.securityLevel === 'relaxed') {
    config.enableSandbox = false;
    config.strictSecurity = false;
    config.defaultResourceLimits = {
      memory: 200 * 1024 * 1024, // 200MB
      cpu: 50, // 50%
      storage: 100 * 1024 * 1024, // 100MB
      network: true
    };
  }

  const manager = new PluginManager(config);
  await manager.initialize();
  
  return manager;
}

/**
 * Development Mode Helper
 * Creates a plugin manager optimized for development
 */
export async function developmentMode(): Promise<any> {
  const { PluginManager } = require('./core/PluginManager');
  const { MemoryStorageProvider } = require('./core/PluginRegistry');
  
  const config = {
    ...DEFAULT_CONFIG,
    strictSecurity: false,
    enableSandbox: false, // Disable sandbox for easier debugging
    enableResourceMonitoring: false, // Disable for performance
    autoLoadPlugins: false, // Manual control in development
    storageProvider: new MemoryStorageProvider()
  };

  const manager = new PluginManager(config);
  await manager.initialize();

  // Add development helpers
  (manager as any).dev = {
    loadPlugin: manager.loadPlugin.bind(manager),
    activatePlugin: manager.activatePlugin.bind(manager),
    deactivatePlugin: manager.deactivatePlugin.bind(manager),
    reloadPlugin: manager.reloadPlugin.bind(manager),
    inspectPlugin: (pluginId: string) => {
      const plugin = manager.getPlugin(pluginId);
      console.log('Plugin Inspection:', plugin);
      return plugin;
    },
    listPlugins: () => {
      const plugins = manager.getAllPlugins();
      console.table(plugins.map(p => ({
        id: p.id,
        name: p.manifest.name,
        version: p.manifest.version,
        state: p.state,
        category: p.manifest.category
      })));
      return plugins;
    }
  };

  console.log('🔧 Plugin System started in development mode');
  console.log('Available dev commands:', Object.keys((manager as any).dev));
  
  return manager;
}

/**
 * Production Mode Helper
 * Creates a plugin manager optimized for production
 */
export async function productionMode(options: {
  storageProvider?: any;
  pluginRegistry?: string;
} = {}): Promise<any> {
  const { PluginManager } = require('./core/PluginManager');
  const { LocalStorageProvider } = require('./core/PluginRegistry');
  
  const config = {
    ...DEFAULT_CONFIG,
    strictSecurity: true,
    enableSandbox: true,
    enableResourceMonitoring: true,
    autoLoadPlugins: true,
    storageProvider: options.storageProvider || new LocalStorageProvider(),
    registryUrl: options.pluginRegistry
  };

  const manager = new PluginManager(config);
  await manager.initialize();

  console.log('🚀 Plugin System started in production mode');
  
  return manager;
}

/**
 * Get system information
 */
export function getSystemInfo() {
  return {
    ...PLUGIN_SYSTEM_INFO,
    runtime: {
      isNode: typeof process !== 'undefined',
      isBrowser: typeof window !== 'undefined',
      nodeVersion: typeof process !== 'undefined' ? process.version : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    }
  };
}