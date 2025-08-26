// Module Registry - Central registry for all platform modules
import type { ModuleInfo, FederationConfig } from '../client/types/module-federation';

// Import module metadata
import { moduleInfo as databaseInfo, federationConfig as databaseFederation } from './database/src/index';
import { moduleInfo as sistemaInfo, federationConfig as sistemaFederation } from './sistema/src/index';
import { moduleInfo as marketplaceInfo, federationConfig as marketplaceFederation } from './marketplace/src/index';
import { moduleInfo as vendasInfo, federationConfig as vendasFederation } from './vendas/src/index';

// Module registry interface
export interface ModuleRegistryEntry {
  info: ModuleInfo;
  federation: FederationConfig;
  path: string;
  status: 'installed' | 'available' | 'error';
  loadedAt?: Date;
}

// Central module registry
export const moduleRegistry: Record<string, ModuleRegistryEntry> = {
  database: {
    info: databaseInfo,
    federation: databaseFederation,
    path: './modules/database',
    status: 'installed'
  },
  sistema: {
    info: sistemaInfo,
    federation: sistemaFederation,
    path: './modules/sistema', 
    status: 'installed'
  },
  marketplace: {
    info: marketplaceInfo,
    federation: marketplaceFederation,
    path: './modules/marketplace',
    status: 'installed'
  },
  vendas: {
    info: vendasInfo,
    federation: vendasFederation,
    path: './modules/vendas',
    status: 'installed'
  }
};

// Utility functions for module registry
export const getModule = (id: string): ModuleRegistryEntry | undefined => {
  return moduleRegistry[id];
};

export const getAllModules = (): ModuleRegistryEntry[] => {
  return Object.values(moduleRegistry);
};

export const getModulesByCategory = (category: string): ModuleRegistryEntry[] => {
  return getAllModules().filter(module => module.info.category === category);
};

export const isModuleInstalled = (id: string): boolean => {
  const module = getModule(id);
  return module?.status === 'installed';
};

// Dynamic module loader (for future federation support)
export const loadModule = async (id: string): Promise<any> => {
  const module = getModule(id);
  if (!module) {
    throw new Error(`Module ${id} not found in registry`);
  }
  
  try {
    // For now, return static imports - will be replaced with federation later
    switch (id) {
      case 'database':
        return import('./database/src/index');
      case 'sistema':
        return import('./sistema/src/index');
      case 'marketplace':
        return import('./marketplace/src/index');
      case 'vendas':
        return import('./vendas/src/index');
      default:
        throw new Error(`Module ${id} has no loader`);
    }
  } catch (error) {
    console.error(`Failed to load module ${id}:`, error);
    moduleRegistry[id].status = 'error';
    throw error;
  }
};

export default moduleRegistry;