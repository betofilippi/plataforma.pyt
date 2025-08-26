/**
 * Module cache implementation with in-memory cache, persistence, and version checking
 */

import { LRUCache } from 'lru-cache';
import * as semver from 'semver';
import type { ModuleCache, ModuleCacheEntry, ModuleCacheConfig } from '../types';

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<ModuleCacheConfig> = {
  maxSize: 100,
  defaultTtl: 24 * 60 * 60 * 1000, // 24 hours
  enablePersistence: true,
  storagePrefix: 'plataforma-module-cache',
  enableVersionCheck: true,
  enablePreloading: false
};

/**
 * Module cache implementation
 */
export class ModuleCacheImpl implements ModuleCache {
  private lruCache: LRUCache<string, ModuleCacheEntry>;
  private config: Required<ModuleCacheConfig>;

  constructor(config: ModuleCacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize LRU cache
    this.lruCache = new LRUCache<string, ModuleCacheEntry>({
      max: this.config.maxSize,
      ttl: this.config.defaultTtl,
      dispose: (value, key) => {
        // Clean up when item is removed from cache
        this.onDispose(key, value);
      },
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    // Restore from storage if enabled
    if (this.config.enablePersistence) {
      this.restore().catch(error => {
        console.warn('[ModuleCache] Failed to restore cache from storage:', error);
      });
    }
  }

  /**
   * Get cached module
   */
  get(name: string): ModuleCacheEntry | null {
    const entry = this.lruCache.get(name);
    
    if (!entry) {
      return null;
    }

    // Check TTL manually if needed (LRU cache handles this automatically, but we can add custom logic)
    if (entry.ttl && (Date.now() - entry.timestamp) > entry.ttl) {
      this.lruCache.delete(name);
      return null;
    }

    return entry;
  }

  /**
   * Set cached module
   */
  set(name: string, entry: ModuleCacheEntry): void {
    // Ensure timestamp is set
    if (!entry.timestamp) {
      entry.timestamp = Date.now();
    }

    // Set TTL if not provided
    if (!entry.ttl) {
      entry.ttl = this.config.defaultTtl;
    }

    // Store in LRU cache
    this.lruCache.set(name, entry, { ttl: entry.ttl });

    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      this.persistEntry(name, entry).catch(error => {
        console.warn(`[ModuleCache] Failed to persist entry "${name}":`, error);
      });
    }
  }

  /**
   * Remove cached module
   */
  delete(name: string): boolean {
    const existed = this.lruCache.has(name);
    this.lruCache.delete(name);

    // Remove from storage if enabled
    if (this.config.enablePersistence && existed) {
      this.removeFromStorage(name).catch(error => {
        console.warn(`[ModuleCache] Failed to remove "${name}" from storage:`, error);
      });
    }

    return existed;
  }

  /**
   * Check if module is cached
   */
  has(name: string): boolean {
    return this.lruCache.has(name);
  }

  /**
   * Clear all cached modules
   */
  clear(): void {
    this.lruCache.clear();

    // Clear storage if enabled
    if (this.config.enablePersistence) {
      this.clearStorage().catch(error => {
        console.warn('[ModuleCache] Failed to clear storage:', error);
      });
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.lruCache.size;
  }

  /**
   * Get all cached module names
   */
  keys(): string[] {
    return Array.from(this.lruCache.keys());
  }

  /**
   * Persist cache to storage
   */
  async persist(): Promise<void> {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const cacheData = {
        timestamp: Date.now(),
        entries: Object.fromEntries(this.lruCache.entries())
      };

      localStorage.setItem(
        `${this.config.storagePrefix}-data`,
        JSON.stringify(cacheData)
      );

      // Store metadata separately
      const metadata = {
        version: '1.0.0',
        config: this.config,
        size: this.lruCache.size
      };

      localStorage.setItem(
        `${this.config.storagePrefix}-meta`,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('[ModuleCache] Failed to persist cache:', error);
      throw error;
    }
  }

  /**
   * Load cache from storage
   */
  async restore(): Promise<void> {
    if (!this.config.enablePersistence || typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Load metadata first
      const metadataStr = localStorage.getItem(`${this.config.storagePrefix}-meta`);
      if (!metadataStr) {
        return;
      }

      const metadata = JSON.parse(metadataStr);
      
      // Validate cache version compatibility
      if (!this.isCompatibleVersion(metadata.version)) {
        console.warn('[ModuleCache] Incompatible cache version, clearing cache');
        await this.clearStorage();
        return;
      }

      // Load cache data
      const dataStr = localStorage.getItem(`${this.config.storagePrefix}-data`);
      if (!dataStr) {
        return;
      }

      const cacheData = JSON.parse(dataStr);
      const now = Date.now();

      // Restore entries, filtering expired ones
      let restoredCount = 0;
      for (const [name, entry] of Object.entries(cacheData.entries)) {
        const cacheEntry = entry as ModuleCacheEntry;
        
        // Check if entry is expired
        if (cacheEntry.ttl && (now - cacheEntry.timestamp) > cacheEntry.ttl) {
          continue;
        }

        // Check if module needs update based on version
        if (this.config.enableVersionCheck && this.needsUpdate(name, cacheEntry.version, cacheEntry.hash)) {
          continue;
        }

        this.lruCache.set(name, cacheEntry, { ttl: cacheEntry.ttl });
        restoredCount++;
      }

      console.log(`[ModuleCache] Restored ${restoredCount} modules from cache`);
    } catch (error) {
      console.error('[ModuleCache] Failed to restore cache:', error);
      // Clear corrupted cache
      await this.clearStorage();
    }
  }

  /**
   * Check if module needs update
   */
  needsUpdate(name: string, version: string, hash?: string): boolean {
    if (!this.config.enableVersionCheck) {
      return false;
    }

    const entry = this.get(name);
    if (!entry) {
      return true; // Not cached, needs to be loaded
    }

    // Compare versions using semver
    try {
      if (semver.valid(version) && semver.valid(entry.version)) {
        // If new version is greater, update is needed
        if (semver.gt(version, entry.version)) {
          return true;
        }
        
        // If versions are equal, check hash if available
        if (semver.eq(version, entry.version) && hash && entry.hash) {
          return hash !== entry.hash;
        }
      } else {
        // Fallback to string comparison
        return version !== entry.version || (hash && hash !== entry.hash);
      }
    } catch (error) {
      console.warn(`[ModuleCache] Error comparing versions for "${name}":`, error);
      return false;
    }

    return false;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.lruCache.entries());
    
    return {
      size: this.lruCache.size,
      maxSize: this.config.maxSize,
      hitRatio: this.lruCache.calculatedSize / this.lruCache.max,
      entries: entries.map(([name, entry]) => ({
        name,
        version: entry.version,
        age: now - entry.timestamp,
        size: this.estimateEntrySize(entry)
      })),
      totalSize: entries.reduce((sum, [, entry]) => sum + this.estimateEntrySize(entry), 0)
    };
  }

  /**
   * Preload modules
   */
  async preloadModules(modules: Array<{ name: string; url: string; version?: string }>): Promise<void> {
    if (!this.config.enablePreloading) {
      return;
    }

    const preloadPromises = modules.map(async ({ name, url, version = '1.0.0' }) => {
      try {
        // Check if already cached and up to date
        if (this.has(name) && !this.needsUpdate(name, version)) {
          return;
        }

        // Preload module (implementation would depend on the loader)
        console.log(`[ModuleCache] Preloading module "${name}" from ${url}`);
        
        // This would typically be handled by the module loader
        // For now, we just mark it as a placeholder
        const entry: ModuleCacheEntry = {
          name,
          version,
          module: null, // Will be loaded by the actual loader
          timestamp: Date.now(),
          ttl: this.config.defaultTtl,
          metadata: { preloaded: true, url }
        };

        this.set(name, entry);
      } catch (error) {
        console.warn(`[ModuleCache] Failed to preload module "${name}":`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [name, entry] of this.lruCache.entries()) {
      if (entry.ttl && (now - entry.timestamp) > entry.ttl) {
        keysToDelete.push(name);
      }
    }

    keysToDelete.forEach(key => this.lruCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[ModuleCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Handle entry disposal
   */
  private onDispose(key: string, entry: ModuleCacheEntry): void {
    // Cleanup module resources if needed
    if (entry.module && typeof entry.module.cleanup === 'function') {
      try {
        entry.module.cleanup();
      } catch (error) {
        console.warn(`[ModuleCache] Error during module cleanup for "${key}":`, error);
      }
    }
  }

  /**
   * Persist single entry to storage
   */
  private async persistEntry(name: string, entry: ModuleCacheEntry): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Don't persist the actual module instance, just metadata
      const persistData = {
        ...entry,
        module: null, // Remove module instance
        persisted: true
      };

      localStorage.setItem(
        `${this.config.storagePrefix}-entry-${name}`,
        JSON.stringify(persistData)
      );
    } catch (error) {
      console.warn(`[ModuleCache] Failed to persist entry "${name}":`, error);
    }
  }

  /**
   * Remove entry from storage
   */
  private async removeFromStorage(name: string): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(`${this.config.storagePrefix}-entry-${name}`);
    } catch (error) {
      console.warn(`[ModuleCache] Failed to remove "${name}" from storage:`, error);
    }
  }

  /**
   * Clear all storage
   */
  private async clearStorage(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.storagePrefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('[ModuleCache] Failed to clear storage:', error);
    }
  }

  /**
   * Check version compatibility
   */
  private isCompatibleVersion(version: string): boolean {
    // Simple version compatibility check
    // In practice, this would be more sophisticated
    const currentVersion = '1.0.0';
    try {
      return semver.major(version) === semver.major(currentVersion);
    } catch {
      return false;
    }
  }

  /**
   * Estimate entry size in bytes
   */
  private estimateEntrySize(entry: ModuleCacheEntry): number {
    try {
      // Rough estimation
      return JSON.stringify({ ...entry, module: null }).length * 2;
    } catch {
      return 1000; // Default estimate
    }
  }
}

/**
 * Create a module cache instance
 */
export function createModuleCache(config?: ModuleCacheConfig): ModuleCache {
  return new ModuleCacheImpl(config);
}