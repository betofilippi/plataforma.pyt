import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { ModuleConfig } from '../types';

export interface ModuleManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  author: string | { name: string; email: string };
  license: string;
  category: string;
  icon: string;
  color: string;
  
  // Runtime information
  main: string;
  types?: string;
  assets: string[];
  
  // Plataforma-specific
  plataforma: {
    version: string;
    minVersion: string;
    template: string;
    buildId: string;
    buildDate: string;
    checksum: string;
  };
  
  // Features and capabilities
  features: {
    windowSystem: boolean;
    database: boolean;
    ai: boolean;
    realtime: boolean;
    [key: string]: any;
  };
  
  // Permissions
  permissions: {
    read: string[];
    write: string[];
    execute: string[];
    [key: string]: any;
  };
  
  // Dependencies
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // Window configuration
  window?: {
    defaultWidth: number;
    defaultHeight: number;
    minWidth: number;
    minHeight: number;
    maxWidth?: number;
    maxHeight?: number;
    resizable: boolean;
    maximizable: boolean;
    minimizable?: boolean;
  };
  
  // Database schema (if applicable)
  database?: {
    schema: string;
    tables: any[];
    migrations?: string[];
  };
  
  // AI configuration (if applicable)
  ai?: {
    providers: Array<{
      name: string;
      models: string[];
      apiKey: string;
    }>;
    defaultProvider: string;
    defaultModel: string;
    features: {
      chat: boolean;
      analysis: boolean;
      generation: boolean;
    };
  };
}

export async function generateManifest(
  config: ModuleConfig, 
  outputDir: string
): Promise<ModuleManifest> {
  
  // Generate build ID and checksum
  const buildId = generateBuildId();
  const buildDate = new Date().toISOString();
  
  // Calculate checksum of all files
  const checksum = await calculateChecksum(outputDir);
  
  // Find assets
  const assets = await findAssets(outputDir);
  
  // Create manifest
  const manifest: ModuleManifest = {
    name: config.name,
    version: config.version,
    displayName: config.displayName,
    description: config.description,
    author: config.author || 'Unknown',
    license: config.license || 'MIT',
    category: config.category || 'custom',
    icon: config.icon || 'extension',
    color: config.color || '#3B82F6',
    
    // Runtime
    main: 'index.js',
    types: 'index.d.ts',
    assets,
    
    // Plataforma
    plataforma: {
      version: config.plataforma?.version || '2.0.0',
      minVersion: config.plataforma?.minVersion || '1.0.0',
      template: config.template || 'basic',
      buildId,
      buildDate,
      checksum
    },
    
    // Features
    features: {
      windowSystem: config.features?.windowSystem ?? true,
      database: config.features?.database ?? false,
      ai: config.features?.ai ?? false,
      realtime: config.features?.realtime ?? false,
      ...config.features
    },
    
    // Permissions
    permissions: config.permissions || {
      read: ['public'],
      write: ['admin'],
      execute: ['user', 'admin']
    },
    
    // Dependencies
    dependencies: config.dependencies || {},
    peerDependencies: config.peerDependencies || {}
  };
  
  // Add window configuration if present
  if (config.plataforma?.windowOptions) {
    manifest.window = config.plataforma.windowOptions;
  }
  
  // Add database configuration if present
  if (config.features?.database && config.database) {
    manifest.database = config.database;
  }
  
  // Add AI configuration if present
  if (config.features?.ai && config.ai) {
    manifest.ai = config.ai;
  }
  
  // Write manifest file
  const manifestPath = path.join(outputDir, 'manifest.json');
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });
  
  return manifest;
}

function generateBuildId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}-${random}`;
}

async function calculateChecksum(dir: string): Promise<string> {
  const hash = createHash('sha256');
  const files: string[] = [];
  
  // Collect all files
  async function walkDir(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else {
        files.push(relativePath);
      }
    }
  }
  
  await walkDir(dir);
  
  // Sort files for consistent hash
  files.sort();
  
  // Hash each file
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath);
    hash.update(file); // Include filename in hash
    hash.update(content);
  }
  
  return hash.digest('hex');
}

async function findAssets(dir: string): Promise<string[]> {
  const assets: string[] = [];
  const assetExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',  // Images
    '.ico', '.icns',                                    // Icons
    '.woff', '.woff2', '.ttf', '.otf',                 // Fonts
    '.css', '.scss', '.sass', '.less',                 // Styles
    '.json', '.xml', '.yaml', '.yml',                  // Data
    '.md', '.txt'                                      // Docs
  ];
  
  async function walkDir(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);
        
        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walkDir(fullPath);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (assetExtensions.includes(ext)) {
            assets.push(relativePath.replace(/\\/g, '/')); // Normalize path separators
          }
        }
      }
    } catch (error) {
      // Ignore errors accessing directories
    }
  }
  
  await walkDir(dir);
  return assets.sort();
}

export async function validateManifest(manifestPath: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    if (!await fs.pathExists(manifestPath)) {
      errors.push('Manifest file not found');
      return { isValid: false, errors };
    }
    
    const manifest = await fs.readJson(manifestPath);
    
    // Required fields
    const requiredFields = [
      'name', 'version', 'displayName', 'main', 'plataforma'
    ];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate plataforma object
    if (manifest.plataforma) {
      const requiredPlataformaFields = ['version', 'buildId', 'buildDate'];
      for (const field of requiredPlataformaFields) {
        if (!manifest.plataforma[field]) {
          errors.push(`Missing required plataforma.${field}`);
        }
      }
    }
    
    // Validate version format
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      errors.push('Invalid version format (must be semver)');
    }
    
    // Validate features object
    if (manifest.features) {
      const requiredFeatures = ['windowSystem', 'database', 'ai'];
      for (const feature of requiredFeatures) {
        if (typeof manifest.features[feature] !== 'boolean') {
          errors.push(`Feature ${feature} must be boolean`);
        }
      }
    }
    
    // Validate main file exists
    if (manifest.main) {
      const mainPath = path.resolve(path.dirname(manifestPath), manifest.main);
      if (!await fs.pathExists(mainPath)) {
        errors.push(`Main file not found: ${manifest.main}`);
      }
    }
    
    // Validate types file if specified
    if (manifest.types) {
      const typesPath = path.resolve(path.dirname(manifestPath), manifest.types);
      if (!await fs.pathExists(typesPath)) {
        errors.push(`Types file not found: ${manifest.types}`);
      }
    }
    
    // Validate assets exist
    if (manifest.assets && Array.isArray(manifest.assets)) {
      for (const asset of manifest.assets) {
        const assetPath = path.resolve(path.dirname(manifestPath), asset);
        if (!await fs.pathExists(assetPath)) {
          errors.push(`Asset not found: ${asset}`);
        }
      }
    }
    
  } catch (error) {
    errors.push(`Invalid manifest JSON: ${error.message}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function compareManifests(
  manifest1Path: string, 
  manifest2Path: string
): Promise<{
  same: boolean;
  differences: string[];
}> {
  const differences: string[] = [];
  
  try {
    const [manifest1, manifest2] = await Promise.all([
      fs.readJson(manifest1Path),
      fs.readJson(manifest2Path)
    ]);
    
    // Compare key fields
    const fieldsToCompare = [
      'name', 'version', 'displayName', 'main', 'checksum'
    ];
    
    for (const field of fieldsToCompare) {
      if (manifest1[field] !== manifest2[field]) {
        differences.push(`${field}: "${manifest1[field]}" vs "${manifest2[field]}"`);
      }
    }
    
    // Compare features
    const features1 = manifest1.features || {};
    const features2 = manifest2.features || {};
    
    const allFeatures = new Set([
      ...Object.keys(features1),
      ...Object.keys(features2)
    ]);
    
    for (const feature of allFeatures) {
      if (features1[feature] !== features2[feature]) {
        differences.push(`features.${feature}: ${features1[feature]} vs ${features2[feature]}`);
      }
    }
    
  } catch (error) {
    differences.push(`Error comparing manifests: ${error.message}`);
  }
  
  return {
    same: differences.length === 0,
    differences
  };
}