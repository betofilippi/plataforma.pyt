/**
 * Shared dependencies configuration and management
 */

import type { SharedDependencies, SharedDependencyOptions } from './types.js';

// Default shared dependencies for plataforma.app
export const DEFAULT_SHARED_DEPS: SharedDependencies = {
  'react': {
    singleton: true,
    requiredVersion: '^18.0.0',
    eager: true
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.0.0',
    eager: true
  },
  'react-router-dom': {
    singleton: true,
    requiredVersion: '^6.0.0'
  },
  '@tanstack/react-query': {
    singleton: true,
    requiredVersion: '^5.0.0'
  },
  'lucide-react': {
    singleton: false,
    requiredVersion: '^0.400.0'
  },
  '@supabase/supabase-js': {
    singleton: true,
    requiredVersion: '^2.50.0'
  }
};

// Plataforma-specific packages that should be shared
export const PLATAFORMA_SHARED_DEPS: SharedDependencies = {
  '@plataforma/auth': {
    singleton: true,
    eager: true
  },
  '@plataforma/core': {
    singleton: true,
    eager: true
  },
  '@plataforma/design-system': {
    singleton: true,
    eager: true
  },
  '@plataforma/types': {
    singleton: true,
    eager: true
  },
  '@plataforma/core-window-system': {
    singleton: true,
    eager: true
  }
};

/**
 * Normalize shared dependency options
 */
export function normalizeSharedDependency(
  name: string,
  config: string | SharedDependencyOptions
): SharedDependencyOptions {
  if (typeof config === 'string') {
    return {
      version: config,
      singleton: false,
      eager: false
    };
  }
  
  return {
    singleton: false,
    eager: false,
    ...config
  };
}

/**
 * Merge shared dependencies configurations
 */
export function mergeSharedDependencies(
  ...configs: (SharedDependencies | undefined)[]
): SharedDependencies {
  const merged: SharedDependencies = {};
  
  for (const config of configs) {
    if (!config) continue;
    
    for (const [name, options] of Object.entries(config)) {
      merged[name] = normalizeSharedDependency(name, options);
    }
  }
  
  return merged;
}

/**
 * Generate shared dependencies for Vite build
 */
export function generateSharedConfig(shared: SharedDependencies): Record<string, any> {
  const config: Record<string, any> = {};
  
  for (const [name, options] of Object.entries(shared)) {
    const normalized = normalizeSharedDependency(name, options);
    
    config[name] = {
      packageName: normalized.packageName || name,
      singleton: normalized.singleton,
      strictVersion: normalized.strictVersion !== false,
      requiredVersion: normalized.requiredVersion,
      eager: normalized.eager
    };
  }
  
  return config;
}

/**
 * Create shared dependency resolver
 */
export function createSharedDependencyResolver(shared: SharedDependencies) {
  const resolvedDeps = new Map<string, any>();
  
  return {
    /**
     * Resolve a shared dependency
     */
    resolve(name: string, requiredVersion?: string): any {
      const config = shared[name];
      if (!config) {
        throw new Error(`Shared dependency "${name}" is not configured`);
      }
      
      const normalized = normalizeSharedDependency(name, config);
      
      // Check if already resolved and is singleton
      if (normalized.singleton && resolvedDeps.has(name)) {
        return resolvedDeps.get(name);
      }
      
      // Try to resolve from global scope or import
      let resolved;
      try {
        // In browser environment, try to get from window
        if (typeof window !== 'undefined') {
          const globalName = name.replace(/[@/-]/g, '_');
          resolved = (window as any)[globalName];
        }
        
        // If not found globally, try to import
        if (!resolved) {
          resolved = this.importDependency(name);
        }
        
        // Validate version if required
        if (normalized.requiredVersion && requiredVersion) {
          this.validateVersion(name, requiredVersion, normalized.requiredVersion);
        }
        
        // Cache if singleton
        if (normalized.singleton) {
          resolvedDeps.set(name, resolved);
        }
        
        return resolved;
      } catch (error) {
        throw new Error(`Failed to resolve shared dependency "${name}": ${error}`);
      }
    },
    
    /**
     * Import dependency dynamically
     */
    async importDependency(name: string): Promise<any> {
      try {
        return await import(name);
      } catch (error) {
        throw new Error(`Failed to import dependency "${name}": ${error}`);
      }
    },
    
    /**
     * Validate version compatibility
     */
    validateVersion(name: string, actual: string, required: string | false): boolean {
      if (required === false) return true;
      
      // Simple version validation - in production, use semver
      const actualVersion = actual.replace(/[^0-9.]/g, '');
      const requiredVersion = required.replace(/[^0-9.]/g, '');
      
      if (actualVersion !== requiredVersion) {
        console.warn(
          `Version mismatch for "${name}": required ${required}, got ${actual}`
        );
      }
      
      return true;
    },
    
    /**
     * Get all resolved dependencies
     */
    getResolved(): Map<string, any> {
      return new Map(resolvedDeps);
    },
    
    /**
     * Clear resolved dependencies
     */
    clear(): void {
      resolvedDeps.clear();
    }
  };
}

/**
 * Create shared dependencies runtime script
 */
export function generateSharedDepsScript(shared: SharedDependencies): string {
  return `
// Shared dependencies runtime for Module Federation
(function() {
  'use strict';
  
  const shared = ${JSON.stringify(shared, null, 2)};
  const resolvedDeps = new Map();
  
  // Create global shared dependencies registry
  if (typeof window !== 'undefined') {
    window.__PLATAFORMA_SHARED__ = {
      dependencies: shared,
      resolved: resolvedDeps,
      
      resolve(name, version) {
        const config = shared[name];
        if (!config) {
          throw new Error('Shared dependency "' + name + '" is not configured');
        }
        
        // Check if already resolved and is singleton
        if (config.singleton && resolvedDeps.has(name)) {
          return resolvedDeps.get(name);
        }
        
        // Try to resolve from global scope
        const globalName = name.replace(/[@\\/\\-]/g, '_');
        let resolved = window[globalName];
        
        if (!resolved) {
          throw new Error('Shared dependency "' + name + '" not found in global scope');
        }
        
        // Cache if singleton
        if (config.singleton) {
          resolvedDeps.set(name, resolved);
        }
        
        return resolved;
      },
      
      register(name, module) {
        const globalName = name.replace(/[@\\/\\-]/g, '_');
        window[globalName] = module;
        
        const config = shared[name];
        if (config && config.singleton) {
          resolvedDeps.set(name, module);
        }
      }
    };
  }
})();
`;
}