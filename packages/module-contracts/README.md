# Module Contracts

Comprehensive module interface contracts and validation system for plataforma.app.

## Overview

This package defines the standard interfaces, types, and validation rules that all modules in the plataforma.app ecosystem must conform to for proper integration and interoperability.

## Features

- **🏗️ Core Contracts**: Fundamental interfaces all modules must implement
- **📝 Type System**: Specialized contracts for different module categories
- **📡 Communication**: Event-driven inter-module communication protocols
- **✅ Validation**: Comprehensive validation and compliance checking
- **🔍 Registry**: Module discovery and management interfaces
- **📋 JSON Schemas**: Machine-readable contract specifications

## Installation

```bash
npm install @plataforma/module-contracts
```

## Quick Start

### Creating a Module Manifest

```typescript
import { ModuleContractBuilder, ModuleCategory, ModuleType } from '@plataforma/module-contracts';

const { manifest, config } = new ModuleContractBuilder()
  .setId('my-business-module')
  .setName('My Business Module')
  .setVersion('1.0.0')
  .setDescription('A comprehensive business module for managing customer relationships')
  .setCategory('business')
  .setType('business-module')
  .setAuthor({ name: 'John Doe', email: 'john@example.com' })
  .setLicense('MIT')
  .addKeywords('business', 'crm', 'customers')
  .enableFeature('analytics')
  .build();
```

### Implementing a Basic Module

```typescript
import { BaseModule, ModuleContext } from '@plataforma/module-contracts';

class MyBusinessModule extends BaseModule {
  protected async onInitialize(context: ModuleContext): Promise<void> {
    // Initialize module resources
    this.logger.info('Initializing business module');
  }

  protected async onStart(): Promise<void> {
    // Start module services
    this.logger.info('Starting business module');
  }

  protected async onStop(): Promise<void> {
    // Stop module services
    this.logger.info('Stopping business module');
  }

  protected async onDispose(): Promise<void> {
    // Cleanup resources
    this.logger.info('Disposing business module');
  }

  protected async onConfigUpdate(config: Partial<ModuleConfig>): Promise<void> {
    // Handle configuration updates
    this.logger.info('Configuration updated', config);
  }
}
```

### Validating a Module Manifest

```typescript
import { ManifestValidator } from '@plataforma/module-contracts';

const validator = new ManifestValidator({
  level: 'standard',
  context: {
    platformVersion: '1.0.0',
    environment: 'production'
  }
});

const result = await validator.validate(manifest);

if (!result.valid) {
  console.error('Manifest validation failed:');
  result.errors.forEach(error => {
    console.error(`- ${error.message} (${error.field})`);
  });
}
```

## Module Types

The contract system supports different types of modules:

### Business Modules

```typescript
import { BusinessModule, BusinessDomain } from '@plataforma/module-contracts';

// For business logic and domain-specific functionality
class CRMModule implements BusinessModule {
  // Implement business-specific interfaces
}
```

### System Modules

```typescript
import { SystemModule, SystemFunction } from '@plataforma/module-contracts';

// For platform infrastructure and system services
class AuthenticationModule implements SystemModule {
  // Implement system-specific interfaces
}
```

### Plugin Modules

```typescript
import { PluginModule, PluginType } from '@plataforma/module-contracts';

// For extensible functionality and integrations
class DataVisualizationPlugin implements PluginModule {
  // Implement plugin-specific interfaces
}
```

### UI Modules

```typescript
import { UIModule, UIModuleType } from '@plataforma/module-contracts';

// For user interface components and themes
class DesignSystemModule implements UIModule {
  // Implement UI-specific interfaces
}
```

## Event System

### Emitting Events

```typescript
import { EventUtils, EventClassification, EventPriority } from '@plataforma/module-contracts';

const event = EventUtils.createEvent(
  'user.profile.updated',
  'user-management',
  { userId: '123', changes: { email: 'new@example.com' } },
  {
    classification: EventClassification.DOMAIN,
    priority: EventPriority.NORMAL,
    tags: ['user', 'profile']
  }
);

await context.eventBus.emit(event.type, event);
```

### Subscribing to Events

```typescript
// Subscribe to specific events
const unsubscribe = context.eventBus.subscribe('user.profile.updated', async (event) => {
  console.log('User profile updated:', event.data);
});

// Subscribe with patterns
const unsubscribePattern = context.eventBus.subscribePattern('user.*', async (eventType, data) => {
  console.log(`User event: ${eventType}`, data);
});
```

## Permission System

### Declaring Permissions

```typescript
import { SystemPermissions } from '@plataforma/module-contracts';

const manifest = {
  // ... other fields
  permissions: {
    system: [
      SystemPermissions.DATABASE_READ.id,
      SystemPermissions.UI_WINDOWS.id
    ],
    resources: [{
      resource: 'customer-data',
      actions: ['read', 'write'],
      scope: 'organization'
    }]
  }
};
```

### Checking Permissions

```typescript
// Check if permission is granted
const canAccessDatabase = await context.permissions.hasPermission(
  'database:read',
  { user: context.user, module: this.manifest }
);

if (canAccessDatabase) {
  // Access database
}
```

## Dependency Management

### Declaring Dependencies

```typescript
const manifest = {
  // ... other fields
  dependencies: {
    platform: '^1.0.0',
    peers: [{
      moduleId: 'user-management',
      versionRange: '^2.0.0',
      optional: false
    }],
    external: [{
      name: 'lodash',
      versionRange: '^4.17.21'
    }]
  }
};
```

### Dependency Injection

```typescript
class MyModule extends BaseModule {
  private userService: UserService;

  protected async onInitialize(context: ModuleContext): Promise<void> {
    // Dependencies are automatically injected based on manifest
    this.userService = context.registry.getModule('user-management').getExports().UserService;
  }
}
```

## Validation

### Manifest Validation

```typescript
import { ManifestValidator, ValidationLevel } from '@plataforma/module-contracts';

const validator = new ManifestValidator({
  level: ValidationLevel.STRICT,
  context: {
    platformVersion: '1.0.0',
    environment: 'production',
    availableModules: ['user-management', 'analytics']
  }
});

const result = await validator.validate(manifest);
console.log(`Validation score: ${result.score}/100`);
```

### Runtime Validation

```typescript
import { RuntimeValidator } from '@plataforma/module-contracts';

const runtimeValidator = new RuntimeValidator();
const healthResult = await runtimeValidator.validateHealth('my-module');

if (healthResult.status === 'unhealthy') {
  console.warn('Module health issues detected:', healthResult.checks);
}
```

## Module Registry

### Registering Modules

```typescript
import { RegistryClient } from '@plataforma/module-contracts';

const client = new RegistryClient({
  baseUrl: 'https://registry.plataforma.app',
  timeout: 30000
});

await client.authenticate({ apiKey: 'your-api-key' });

const result = await client.api.register({
  manifest,
  packageData: {
    package: packageTarball,
    checksum: 'sha256-...',
    size: 1024000
  },
  metadata: {
    publisher: {
      userId: 'user-123',
      userName: 'johndoe',
      email: 'john@example.com'
    },
    publishedAt: new Date().toISOString(),
    tags: ['latest', 'stable']
  }
});
```

### Discovering Modules

```typescript
import { ModuleDiscoveryAPI } from '@plataforma/module-contracts';

const discoveryResult = await discovery.discover({
  scope: {
    local: true,
    registry: true,
    includeDev: false
  },
  filters: {
    categories: ['business'],
    capabilities: ['data-export', 'reporting']
  },
  options: {
    includeManifests: true,
    sortBy: 'popularity',
    limit: 20
  }
});

console.log(`Found ${discoveryResult.modules.length} matching modules`);
```

## JSON Schemas

The package includes JSON schemas for validation:

```typescript
// Validate against JSON schema
import Ajv from 'ajv';
import manifestSchema from '@plataforma/module-contracts/schemas/module-manifest.json';

const ajv = new Ajv();
const validate = ajv.compile(manifestSchema);
const valid = validate(manifest);

if (!valid) {
  console.error('Schema validation errors:', validate.errors);
}
```

## Best Practices

### 1. Module Design

- Follow single responsibility principle
- Use semantic versioning
- Provide comprehensive documentation
- Include health checks
- Handle graceful shutdown

### 2. Error Handling

```typescript
class MyModule extends BaseModule {
  protected async onStart(): Promise<void> {
    try {
      await this.initializeServices();
    } catch (error) {
      this.logger.error('Failed to start module', error);
      throw error; // Let the platform handle the error
    }
  }
}
```

### 3. Configuration

```typescript
// Define configuration schema in manifest
const manifest = {
  // ... other fields
  configSchema: {
    type: 'object',
    properties: {
      apiUrl: {
        type: 'string',
        format: 'uri',
        description: 'External API URL'
      },
      timeout: {
        type: 'number',
        minimum: 1000,
        default: 30000,
        description: 'Request timeout in milliseconds'
      }
    },
    required: ['apiUrl']
  }
};
```

### 4. Testing

```typescript
import { ManifestValidator, ValidationLevel } from '@plataforma/module-contracts';

describe('Module Manifest', () => {
  it('should have valid manifest', async () => {
    const validator = new ManifestValidator({ level: ValidationLevel.STRICT });
    const result = await validator.validate(manifest);
    
    expect(result.valid).toBe(true);
    expect(result.score).toBeGreaterThan(80);
  });
});
```

## API Reference

### Core Interfaces

- `Module` - Base module interface
- `ModuleManifest` - Module metadata and configuration
- `ModuleContext` - Runtime context and services
- `ModuleLifecycle` - Lifecycle management interface

### Specialized Types

- `BusinessModule` - Business domain modules
- `SystemModule` - Platform infrastructure modules  
- `PluginModule` - Extensible functionality
- `UIModule` - User interface components

### Validation

- `ManifestValidator` - Validate module manifests
- `RuntimeValidator` - Runtime compliance checking
- `ContractValidator` - Contract compliance validation

### Communication

- `EventContract` - Event structure and types
- `EventBus` - Inter-module communication
- `EventStream` - Event streaming interface

### Registry

- `ModuleRegistryAPI` - Module registration and management
- `ModuleDiscoveryAPI` - Module discovery and recommendations

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-contract`
3. Make changes and add tests
4. Validate schemas: `npm run validate-schemas`
5. Run tests: `npm test`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://docs.plataforma.app/contracts)
- 💬 [Community Discord](https://discord.gg/plataforma)
- 🐛 [Issue Tracker](https://github.com/plataforma-app/module-contracts/issues)
- 📧 [Email Support](mailto:support@plataforma.app)