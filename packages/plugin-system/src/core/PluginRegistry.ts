import type { 
  PluginInstance, 
  PluginConfig, 
  PluginManifest,
  PluginCategory,
  SecurityLevel 
} from '../types';

/**
 * Plugin Registry
 * Manages plugin registration, discovery, and metadata persistence.
 * Provides a central catalog of all available and installed plugins.
 */
export class PluginRegistry {
  private plugins = new Map<string, RegisteredPlugin>();
  private categories = new Map<PluginCategory, Set<string>>();
  private storageProvider: StorageProvider;
  private isInitialized = false;

  constructor(private readonly options: PluginRegistryOptions = {}) {
    this.storageProvider = options.storageProvider || new MemoryStorageProvider();
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('PluginRegistry is already initialized');
    }

    try {
      await this.storageProvider.initialize();
      await this.loadPersistedData();
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize PluginRegistry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register a plugin instance
   */
  async registerPlugin(instance: PluginInstance): Promise<void> {
    this.ensureInitialized();

    const pluginId = instance.id;
    const manifest = instance.manifest;

    // Create registry entry
    const registeredPlugin: RegisteredPlugin = {
      id: pluginId,
      manifest: manifest,
      config: instance.config,
      status: 'installed',
      installedAt: new Date(),
      lastUpdated: new Date(),
      metadata: {
        loadCount: 0,
        errorCount: instance.metadata.errorCount,
        totalRuntime: 0,
        averageLoadTime: 0
      }
    };

    // Store in memory
    this.plugins.set(pluginId, registeredPlugin);

    // Update category index
    this.addToCategory(manifest.category, pluginId);

    // Persist to storage
    await this.storageProvider.savePlugin(registeredPlugin);
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<void> {
    this.ensureInitialized();

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return; // Already unregistered
    }

    // Remove from category index
    this.removeFromCategory(plugin.manifest.category, pluginId);

    // Remove from memory
    this.plugins.delete(pluginId);

    // Remove from storage
    await this.storageProvider.removePlugin(pluginId);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): RegisteredPlugin | undefined {
    this.ensureInitialized();
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): RegisteredPlugin[] {
    this.ensureInitialized();
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: PluginCategory): RegisteredPlugin[] {
    this.ensureInitialized();
    
    const pluginIds = this.categories.get(category);
    if (!pluginIds) {
      return [];
    }

    return Array.from(pluginIds)
      .map(id => this.plugins.get(id))
      .filter((plugin): plugin is RegisteredPlugin => plugin !== undefined);
  }

  /**
   * Get plugins by security level
   */
  getPluginsBySecurityLevel(level: SecurityLevel): RegisteredPlugin[] {
    this.ensureInitialized();
    
    return this.getAllPlugins().filter(
      plugin => plugin.manifest.securityLevel === level
    );
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): RegisteredPlugin[] {
    this.ensureInitialized();
    
    return this.getAllPlugins().filter(
      plugin => plugin.config.enabled
    );
  }

  /**
   * Search plugins
   */
  searchPlugins(query: SearchQuery): RegisteredPlugin[] {
    this.ensureInitialized();

    let results = this.getAllPlugins();

    // Filter by text search
    if (query.text) {
      const searchText = query.text.toLowerCase();
      results = results.filter(plugin => 
        plugin.manifest.name.toLowerCase().includes(searchText) ||
        plugin.manifest.description.toLowerCase().includes(searchText) ||
        plugin.manifest.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchText)
        )
      );
    }

    // Filter by category
    if (query.category) {
      results = results.filter(plugin => 
        plugin.manifest.category === query.category
      );
    }

    // Filter by security level
    if (query.securityLevel) {
      results = results.filter(plugin => 
        plugin.manifest.securityLevel === query.securityLevel
      );
    }

    // Filter by permissions
    if (query.permissions && query.permissions.length > 0) {
      results = results.filter(plugin =>
        query.permissions!.every(permission =>
          plugin.manifest.permissions?.includes(permission)
        )
      );
    }

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      results = results.filter(plugin =>
        query.capabilities!.every(capability =>
          plugin.manifest.capabilities?.includes(capability)
        )
      );
    }

    // Sort results
    if (query.sortBy) {
      results.sort((a, b) => {
        switch (query.sortBy) {
          case 'name':
            return a.manifest.name.localeCompare(b.manifest.name);
          case 'category':
            return a.manifest.category.localeCompare(b.manifest.category);
          case 'installedAt':
            return b.installedAt.getTime() - a.installedAt.getTime();
          case 'lastUpdated':
            return b.lastUpdated.getTime() - a.lastUpdated.getTime();
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Update plugin configuration
   */
  async updatePluginConfig(pluginId: string, config: PluginConfig): Promise<void> {
    this.ensureInitialized();

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' is not registered`);
    }

    // Update config
    plugin.config = { ...plugin.config, ...config };
    plugin.lastUpdated = new Date();

    // Persist changes
    await this.storageProvider.savePlugin(plugin);
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): PluginConfig | undefined {
    this.ensureInitialized();
    
    const plugin = this.plugins.get(pluginId);
    return plugin?.config;
  }

  /**
   * Update plugin metadata
   */
  async updatePluginMetadata(
    pluginId: string, 
    metadata: Partial<PluginMetadata>
  ): Promise<void> {
    this.ensureInitialized();

    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin '${pluginId}' is not registered`);
    }

    // Update metadata
    plugin.metadata = { ...plugin.metadata, ...metadata };
    plugin.lastUpdated = new Date();

    // Persist changes
    await this.storageProvider.savePlugin(plugin);
  }

  /**
   * Get registry statistics
   */
  getStatistics(): RegistryStatistics {
    this.ensureInitialized();

    const allPlugins = this.getAllPlugins();
    const categories = new Map<PluginCategory, number>();
    const securityLevels = new Map<SecurityLevel, number>();

    for (const plugin of allPlugins) {
      // Count by category
      const categoryCount = categories.get(plugin.manifest.category) || 0;
      categories.set(plugin.manifest.category, categoryCount + 1);

      // Count by security level
      const securityCount = securityLevels.get(plugin.manifest.securityLevel) || 0;
      securityLevels.set(plugin.manifest.securityLevel, securityCount + 1);
    }

    return {
      totalPlugins: allPlugins.length,
      enabledPlugins: this.getEnabledPlugins().length,
      categoriesCount: Object.fromEntries(categories),
      securityLevelsCount: Object.fromEntries(securityLevels),
      averageLoadTime: this.calculateAverageLoadTime(),
      totalErrors: allPlugins.reduce((sum, p) => sum + p.metadata.errorCount, 0)
    };
  }

  /**
   * Export registry data
   */
  async exportData(): Promise<RegistryExport> {
    this.ensureInitialized();

    return {
      version: '1.0.0',
      exportedAt: new Date(),
      plugins: this.getAllPlugins().map(plugin => ({
        ...plugin,
        // Don't export runtime metadata
        metadata: {
          loadCount: 0,
          errorCount: 0,
          totalRuntime: 0,
          averageLoadTime: 0
        }
      }))
    };
  }

  /**
   * Import registry data
   */
  async importData(data: RegistryExport): Promise<void> {
    this.ensureInitialized();

    // Validate import data
    if (!data.version || !data.plugins) {
      throw new Error('Invalid registry export format');
    }

    // Clear existing data
    this.plugins.clear();
    this.categories.clear();

    // Import plugins
    for (const plugin of data.plugins) {
      this.plugins.set(plugin.id, {
        ...plugin,
        lastUpdated: new Date()
      });
      
      this.addToCategory(plugin.manifest.category, plugin.id);
    }

    // Persist imported data
    await this.storageProvider.saveAll(this.getAllPlugins());
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(manifest: PluginManifest): DependencyValidation {
    this.ensureInitialized();

    const result: DependencyValidation = {
      isValid: true,
      missing: [],
      conflicts: [],
      warnings: []
    };

    // Check dependencies
    if (manifest.dependencies) {
      for (const [depId, version] of Object.entries(manifest.dependencies)) {
        const dependency = this.plugins.get(depId);
        
        if (!dependency) {
          result.isValid = false;
          result.missing.push({ id: depId, requiredVersion: version });
        } else if (!this.isVersionCompatible(dependency.manifest.version, version)) {
          result.conflicts.push({
            id: depId,
            requiredVersion: version,
            installedVersion: dependency.manifest.version
          });
        }
      }
    }

    // Check peer dependencies
    if (manifest.peerDependencies) {
      for (const [depId, version] of Object.entries(manifest.peerDependencies)) {
        const dependency = this.plugins.get(depId);
        
        if (dependency && !this.isVersionCompatible(dependency.manifest.version, version)) {
          result.warnings.push({
            id: depId,
            requiredVersion: version,
            installedVersion: dependency.manifest.version,
            message: `Peer dependency version mismatch for ${depId}`
          });
        }
      }
    }

    return result;
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    await this.storageProvider.shutdown();
    
    this.plugins.clear();
    this.categories.clear();
    this.isInitialized = false;
  }

  // Private Methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('PluginRegistry is not initialized');
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const plugins = await this.storageProvider.loadAll();
      
      for (const plugin of plugins) {
        this.plugins.set(plugin.id, plugin);
        this.addToCategory(plugin.manifest.category, plugin.id);
      }
    } catch (error) {
      console.warn('Failed to load persisted plugin data:', error);
    }
  }

  private addToCategory(category: PluginCategory, pluginId: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(pluginId);
  }

  private removeFromCategory(category: PluginCategory, pluginId: string): void {
    const categorySet = this.categories.get(category);
    if (categorySet) {
      categorySet.delete(pluginId);
      if (categorySet.size === 0) {
        this.categories.delete(category);
      }
    }
  }

  private isVersionCompatible(installed: string, required: string): boolean {
    // Simple semantic version checking
    // In a real implementation, use a proper semver library
    const installedParts = installed.split('.').map(Number);
    const requiredParts = required.replace(/[^\d.]/g, '').split('.').map(Number);
    
    // Major version must match
    if (installedParts[0] !== requiredParts[0]) {
      return false;
    }
    
    // Minor version must be >= required
    if (installedParts[1] < requiredParts[1]) {
      return false;
    }
    
    // Patch version must be >= required if minor versions match
    if (installedParts[1] === requiredParts[1] && installedParts[2] < requiredParts[2]) {
      return false;
    }
    
    return true;
  }

  private calculateAverageLoadTime(): number {
    const plugins = this.getAllPlugins();
    if (plugins.length === 0) return 0;
    
    const totalLoadTime = plugins.reduce((sum, p) => sum + p.metadata.averageLoadTime, 0);
    return totalLoadTime / plugins.length;
  }
}

// Storage Provider Interface and Implementations

export interface StorageProvider {
  initialize(): Promise<void>;
  savePlugin(plugin: RegisteredPlugin): Promise<void>;
  removePlugin(pluginId: string): Promise<void>;
  loadAll(): Promise<RegisteredPlugin[]>;
  saveAll(plugins: RegisteredPlugin[]): Promise<void>;
  shutdown(): Promise<void>;
}

export class MemoryStorageProvider implements StorageProvider {
  private plugins = new Map<string, RegisteredPlugin>();

  async initialize(): Promise<void> {
    // No initialization needed for memory storage
  }

  async savePlugin(plugin: RegisteredPlugin): Promise<void> {
    this.plugins.set(plugin.id, { ...plugin });
  }

  async removePlugin(pluginId: string): Promise<void> {
    this.plugins.delete(pluginId);
  }

  async loadAll(): Promise<RegisteredPlugin[]> {
    return Array.from(this.plugins.values());
  }

  async saveAll(plugins: RegisteredPlugin[]): Promise<void> {
    this.plugins.clear();
    for (const plugin of plugins) {
      this.plugins.set(plugin.id, { ...plugin });
    }
  }

  async shutdown(): Promise<void> {
    this.plugins.clear();
  }
}

export class LocalStorageProvider implements StorageProvider {
  private readonly storageKey = 'plugin_registry';

  async initialize(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      throw new Error('LocalStorage is not available');
    }
  }

  async savePlugin(plugin: RegisteredPlugin): Promise<void> {
    const plugins = await this.loadAll();
    const index = plugins.findIndex(p => p.id === plugin.id);
    
    if (index >= 0) {
      plugins[index] = plugin;
    } else {
      plugins.push(plugin);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(plugins));
  }

  async removePlugin(pluginId: string): Promise<void> {
    const plugins = await this.loadAll();
    const filtered = plugins.filter(p => p.id !== pluginId);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  async loadAll(): Promise<RegisteredPlugin[]> {
    const data = localStorage.getItem(this.storageKey);
    if (!data) return [];
    
    try {
      const parsed = JSON.parse(data);
      return parsed.map((p: any) => ({
        ...p,
        installedAt: new Date(p.installedAt),
        lastUpdated: new Date(p.lastUpdated)
      }));
    } catch {
      return [];
    }
  }

  async saveAll(plugins: RegisteredPlugin[]): Promise<void> {
    localStorage.setItem(this.storageKey, JSON.stringify(plugins));
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for localStorage
  }
}

// Types and Interfaces

export interface PluginRegistryOptions {
  storageProvider?: StorageProvider;
}

export interface RegisteredPlugin {
  id: string;
  manifest: PluginManifest;
  config: PluginConfig;
  status: 'installed' | 'disabled' | 'error';
  installedAt: Date;
  lastUpdated: Date;
  metadata: PluginMetadata;
}

export interface PluginMetadata {
  loadCount: number;
  errorCount: number;
  totalRuntime: number;
  averageLoadTime: number;
}

export interface SearchQuery {
  text?: string;
  category?: PluginCategory;
  securityLevel?: SecurityLevel;
  permissions?: string[];
  capabilities?: string[];
  sortBy?: 'name' | 'category' | 'installedAt' | 'lastUpdated';
  limit?: number;
}

export interface RegistryStatistics {
  totalPlugins: number;
  enabledPlugins: number;
  categoriesCount: Record<string, number>;
  securityLevelsCount: Record<string, number>;
  averageLoadTime: number;
  totalErrors: number;
}

export interface RegistryExport {
  version: string;
  exportedAt: Date;
  plugins: RegisteredPlugin[];
}

export interface DependencyValidation {
  isValid: boolean;
  missing: Array<{ id: string; requiredVersion: string }>;
  conflicts: Array<{ 
    id: string; 
    requiredVersion: string; 
    installedVersion: string; 
  }>;
  warnings: Array<{ 
    id: string; 
    requiredVersion: string; 
    installedVersion: string; 
    message: string;
  }>;
}