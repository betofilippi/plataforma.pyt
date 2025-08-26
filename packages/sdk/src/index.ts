/**
 * Plataforma SDK - Main Export
 * 
 * SDK completo para desenvolvimento de módulos da Plataforma.app
 */

// Core exports
export * from './types';

// CLI exports (for programmatic usage)
export { createModule } from './cli/create-module';
export { buildModule } from './cli/build-module';
export { startDevServer } from './cli/dev-server';
export { testModule } from './cli/test-module';
export { publishModule } from './cli/publish-module';
export { validateModule } from './cli/validate-module';

// Utilities
export { 
  validateModuleName,
  validateModuleStructure,
  validateEnvironment
} from './utils/validator';

export {
  loadModuleConfig,
  saveModuleConfig,
  syncConfigurations,
  getModuleMetadata,
  createDefaultConfig
} from './utils/config-loader';

export {
  renderTemplate,
  getAvailableTemplates,
  getTemplateInfo,
  validateTemplateStructure
} from './utils/template-renderer';

export {
  generateManifest,
  validateManifest,
  compareManifests
} from './utils/manifest-generator';

// API clients
export { ModuleRegistryClient } from './api/registry-client';
export { ModuleDiscoveryService } from './api/module-discovery';

// SDK class for unified interface
export class PlataformaSDK {
  private registryClient: ModuleRegistryClient;
  private discoveryService: ModuleDiscoveryService;

  constructor(config: {
    registryUrl?: string;
    apiKey?: string;
  } = {}) {
    this.registryClient = new ModuleRegistryClient(config.registryUrl, {
      apiKey: config.apiKey
    });
    this.discoveryService = new ModuleDiscoveryService(
      config.registryUrl,
      config.apiKey
    );
  }

  // Module creation
  async createModule(name: string, options?: any) {
    const { createModule } = await import('./cli/create-module');
    return createModule(name, options);
  }

  // Module building
  async buildModule(options?: any) {
    const { buildModule } = await import('./cli/build-module');
    return buildModule(options);
  }

  // Development server
  async startDevServer(options?: any) {
    const { startDevServer } = await import('./cli/dev-server');
    return startDevServer(options);
  }

  // Testing
  async testModule(options?: any) {
    const { testModule } = await import('./cli/test-module');
    return testModule(options);
  }

  // Publishing
  async publishModule(options?: any) {
    const { publishModule } = await import('./cli/publish-module');
    return publishModule(options);
  }

  // Validation
  async validateModule(options?: any) {
    const { validateModule } = await import('./cli/validate-module');
    return validateModule(options);
  }

  // Registry operations
  get registry() {
    return this.registryClient;
  }

  // Discovery operations
  get discovery() {
    return this.discoveryService;
  }

  // Utilities
  get utils() {
    return {
      validator: {
        validateModuleName: require('./utils/validator').validateModuleName,
        validateModuleStructure: require('./utils/validator').validateModuleStructure,
        validateEnvironment: require('./utils/validator').validateEnvironment
      },
      config: {
        loadModuleConfig: require('./utils/config-loader').loadModuleConfig,
        saveModuleConfig: require('./utils/config-loader').saveModuleConfig,
        syncConfigurations: require('./utils/config-loader').syncConfigurations,
        getModuleMetadata: require('./utils/config-loader').getModuleMetadata,
        createDefaultConfig: require('./utils/config-loader').createDefaultConfig
      },
      template: {
        renderTemplate: require('./utils/template-renderer').renderTemplate,
        getAvailableTemplates: require('./utils/template-renderer').getAvailableTemplates,
        getTemplateInfo: require('./utils/template-renderer').getTemplateInfo,
        validateTemplateStructure: require('./utils/template-renderer').validateTemplateStructure
      },
      manifest: {
        generateManifest: require('./utils/manifest-generator').generateManifest,
        validateManifest: require('./utils/manifest-generator').validateManifest,
        compareManifests: require('./utils/manifest-generator').compareManifests
      }
    };
  }
}

// Default export
export default PlataformaSDK;

// Constants
export const SDK_VERSION = '1.0.0';
export const SUPPORTED_NODE_VERSION = '>=18.0.0';
export const DEFAULT_REGISTRY_URL = 'https://registry.plataforma.app';

// Template constants
export const AVAILABLE_TEMPLATES = ['basic', 'advanced', 'ai-powered'] as const;
export const AVAILABLE_CATEGORIES = [
  'administrativo',
  'financeiro', 
  'vendas',
  'estoque',
  'rh',
  'inteligencia-artificial',
  'sistema',
  'custom'
] as const;

// Feature flags
export const FEATURES = {
  TEMPLATE_VALIDATION: true,
  REGISTRY_INTEGRATION: true,
  HOT_RELOAD: true,
  AI_TEMPLATES: true,
  DATABASE_TEMPLATES: true,
  MOCK_SERVERS: true,
  TYPE_GENERATION: true,
  MANIFEST_VALIDATION: true
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_MODULE_NAME: 'E001',
  INVALID_MODULE_STRUCTURE: 'E002',
  TEMPLATE_NOT_FOUND: 'E003',
  REGISTRY_ERROR: 'E004',
  BUILD_FAILED: 'E005',
  TEST_FAILED: 'E006',
  VALIDATION_FAILED: 'E007',
  PUBLISH_FAILED: 'E008',
  DEPENDENCY_ERROR: 'E009',
  CONFIGURATION_ERROR: 'E010'
} as const;