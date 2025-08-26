import fs from 'fs-extra';
import path from 'path';
import { ModuleConfig } from '../types';

/**
 * Load module configuration from module.json
 */
export async function loadModuleConfig(moduleDir: string): Promise<ModuleConfig | null> {
  const configPath = path.join(moduleDir, 'module.json');
  
  try {
    if (!await fs.pathExists(configPath)) {
      return null;
    }
    
    const config = await fs.readJson(configPath);
    
    // Validate required fields
    if (!config.name || !config.version || !config.displayName) {
      throw new Error('module.json is missing required fields (name, version, displayName)');
    }
    
    // Set defaults for missing optional fields
    return {
      name: config.name,
      displayName: config.displayName,
      description: config.description || '',
      version: config.version,
      category: config.category || 'custom',
      template: config.template || 'basic',
      icon: config.icon || 'extension',
      color: config.color || '#3B82F6',
      author: config.author || { name: 'Unknown', email: '' },
      license: config.license || 'MIT',
      features: {
        windowSystem: config.features?.windowSystem ?? true,
        database: config.features?.database ?? false,
        ai: config.features?.ai ?? false,
        realtime: config.features?.realtime ?? false,
        ...config.features
      },
      permissions: config.permissions || {
        read: ['public'],
        write: ['admin'],
        execute: ['user', 'admin']
      },
      dependencies: config.dependencies || {},
      devDependencies: config.devDependencies || {},
      scripts: config.scripts || {},
      plataforma: config.plataforma || {
        version: '2.0.0',
        minVersion: '1.0.0'
      },
      ...config
    };
    
  } catch (error) {
    throw new Error(`Failed to load module configuration: ${error.message}`);
  }
}

/**
 * Save module configuration to module.json
 */
export async function saveModuleConfig(moduleDir: string, config: ModuleConfig): Promise<void> {
  const configPath = path.join(moduleDir, 'module.json');
  
  try {
    await fs.writeJson(configPath, config, { spaces: 2 });
  } catch (error) {
    throw new Error(`Failed to save module configuration: ${error.message}`);
  }
}

/**
 * Load package.json
 */
export async function loadPackageJson(moduleDir: string): Promise<any> {
  const packagePath = path.join(moduleDir, 'package.json');
  
  try {
    if (!await fs.pathExists(packagePath)) {
      return null;
    }
    
    return await fs.readJson(packagePath);
  } catch (error) {
    throw new Error(`Failed to load package.json: ${error.message}`);
  }
}

/**
 * Save package.json
 */
export async function savePackageJson(moduleDir: string, packageData: any): Promise<void> {
  const packagePath = path.join(moduleDir, 'package.json');
  
  try {
    await fs.writeJson(packagePath, packageData, { spaces: 2 });
  } catch (error) {
    throw new Error(`Failed to save package.json: ${error.message}`);
  }
}

/**
 * Sync module.json and package.json
 */
export async function syncConfigurations(moduleDir: string): Promise<void> {
  const moduleConfig = await loadModuleConfig(moduleDir);
  const packageJson = await loadPackageJson(moduleDir);
  
  if (!moduleConfig || !packageJson) {
    throw new Error('Both module.json and package.json must exist to sync');
  }
  
  // Sync basic fields
  if (packageJson.name !== moduleConfig.name) {
    packageJson.name = moduleConfig.name;
  }
  
  if (packageJson.version !== moduleConfig.version) {
    packageJson.version = moduleConfig.version;
  }
  
  if (packageJson.description !== moduleConfig.description) {
    packageJson.description = moduleConfig.description;
  }
  
  // Sync author
  if (moduleConfig.author) {
    if (typeof moduleConfig.author === 'object') {
      packageJson.author = `${moduleConfig.author.name} <${moduleConfig.author.email}>`;
    } else {
      packageJson.author = moduleConfig.author;
    }
  }
  
  // Sync license
  if (moduleConfig.license) {
    packageJson.license = moduleConfig.license;
  }
  
  // Sync dependencies
  if (moduleConfig.dependencies) {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      ...moduleConfig.dependencies
    };
  }
  
  if (moduleConfig.devDependencies) {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...moduleConfig.devDependencies
    };
  }
  
  // Sync scripts
  if (moduleConfig.scripts) {
    packageJson.scripts = {
      ...packageJson.scripts,
      ...moduleConfig.scripts
    };
  }
  
  await savePackageJson(moduleDir, packageJson);
}

/**
 * Get module metadata for display
 */
export async function getModuleMetadata(moduleDir: string): Promise<{
  config: ModuleConfig;
  packageJson: any;
  stats: {
    size: string;
    files: number;
    lastModified: Date;
  };
}> {
  const [config, packageJson] = await Promise.all([
    loadModuleConfig(moduleDir),
    loadPackageJson(moduleDir)
  ]);
  
  if (!config) {
    throw new Error('Module configuration not found');
  }
  
  // Calculate directory stats
  const stats = await calculateDirectoryStats(moduleDir);
  
  return {
    config,
    packageJson,
    stats
  };
}

async function calculateDirectoryStats(dir: string): Promise<{
  size: string;
  files: number;
  lastModified: Date;
}> {
  let totalSize = 0;
  let fileCount = 0;
  let lastModified = new Date(0);
  
  async function walkDir(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      // Skip node_modules and other large directories
      if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else {
        const stat = await fs.stat(fullPath);
        totalSize += stat.size;
        fileCount++;
        
        if (stat.mtime > lastModified) {
          lastModified = stat.mtime;
        }
      }
    }
  }
  
  try {
    await walkDir(dir);
  } catch (error) {
    // Handle errors gracefully
  }
  
  return {
    size: formatBytes(totalSize),
    files: fileCount,
    lastModified
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create default module configuration
 */
export function createDefaultConfig(name: string, template = 'basic'): ModuleConfig {
  return {
    name,
    displayName: name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
    description: `Módulo ${name} para plataforma.app`,
    version: '1.0.0',
    category: 'custom',
    template,
    icon: template === 'ai-powered' ? 'brain' : template === 'advanced' ? 'database' : 'extension',
    color: template === 'ai-powered' ? '#8B5CF6' : template === 'advanced' ? '#10B981' : '#3B82F6',
    author: {
      name: 'Desenvolvedor',
      email: 'dev@example.com'
    },
    license: 'MIT',
    features: {
      windowSystem: true,
      database: template === 'advanced',
      ai: template === 'ai-powered',
      realtime: false
    },
    permissions: {
      read: ['public'],
      write: ['admin'],
      execute: ['user', 'admin']
    },
    dependencies: {},
    devDependencies: {},
    scripts: {},
    plataforma: {
      version: '2.0.0',
      minVersion: '1.0.0'
    }
  };
}