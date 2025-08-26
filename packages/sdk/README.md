# @plataforma/sdk

The official SDK for developing modules on the Plataforma.dev platform. This SDK provides everything you need to create, test, and deploy powerful modules for the AI-first enterprise platform.

## 🚀 Quick Start

### Installation

```bash
# Install globally for CLI access
npm install -g @plataforma/sdk

# Or install as a project dependency
npm install @plataforma/sdk
```

### Create Your First Module

```bash
# Create a new module
plataforma create my-awesome-module

# Navigate to the module
cd my-awesome-module

# Start development
npm run dev
```

## 📚 Features

### 🛠️ CLI Tools
- **Module Generator**: Scaffold new modules with templates
- **Development Server**: Hot reloading and debugging
- **Build System**: Optimized production builds
- **Deployment**: One-command deployment to the platform
- **Testing**: Integrated testing framework

### 📦 Core APIs
- **Platform Integration**: Access to core platform services
- **Real-time Communication**: WebSocket and event-based messaging  
- **Database Operations**: Type-safe database queries and mutations
- **File Storage**: Upload and manage files with the storage API
- **Authentication**: Secure user authentication and permissions

### 🎨 Development Tools
- **TypeScript Support**: Full type definitions included
- **Hot Reloading**: Instant feedback during development
- **Debugging Tools**: Advanced debugging and profiling
- **Component Library**: Pre-built UI components
- **Testing Utilities**: Comprehensive testing helpers

## 📖 CLI Reference

### Creating Modules

```bash
# Create basic module
plataforma create my-module

# Create with template
plataforma create my-module --template business
plataforma create my-module --template ai-powered
plataforma create my-module --template plugin

# Create with specific features
plataforma create my-module --database --realtime --auth
```

**Available Templates**:
- `basic` - Simple module structure
- `business` - Business logic with database integration
- `ai-powered` - AI/ML integration capabilities  
- `plugin` - Extensible plugin architecture
- `advanced` - All features enabled

### Development Commands

```bash
# Start development server
plataforma dev

# Start with specific port
plataforma dev --port 3001

# Start with debugging enabled
plataforma dev --debug

# Start with hot reloading disabled
plataforma dev --no-reload
```

### Building and Deployment

```bash
# Build for production
plataforma build

# Build with optimization
plataforma build --optimize

# Deploy to staging
plataforma deploy --env staging

# Deploy to production
plataforma deploy --env production

# Check deployment status
plataforma status
```

### Testing

```bash
# Run all tests
plataforma test

# Run tests in watch mode
plataforma test --watch

# Run with coverage
plataforma test --coverage

# Run specific test files
plataforma test --match "*.integration.test.*"
```

### Utility Commands

```bash
# Validate module structure
plataforma validate

# Generate TypeScript types from API
plataforma generate types

# Update SDK and dependencies
plataforma update

# Show module information
plataforma info

# List available templates
plataforma list templates
```

## 🔧 API Reference

### Platform SDK

```typescript
import { PlatformSDK } from '@plataforma/sdk';

// Initialize SDK
const platform = new PlatformSDK({
  apiUrl: 'https://api.plataforma.dev',
  token: 'your-auth-token'
});
```

### Authentication

```typescript
// Login user
const session = await platform.auth.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get current user
const user = await platform.auth.getCurrentUser();

// Check permissions
const hasPermission = await platform.auth.hasPermission('modules.create');

// Logout
await platform.auth.logout();
```

### Database Operations

```typescript
// Query data
const users = await platform.database.query({
  table: 'users',
  where: { active: true },
  limit: 10,
  orderBy: { created_at: 'desc' }
});

// Insert data
const newUser = await platform.database.insert('users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Update data
await platform.database.update('users', user.id, {
  last_login: new Date()
});

// Delete data
await platform.database.delete('users', user.id);

// Execute raw SQL
const result = await platform.database.raw(`
  SELECT COUNT(*) as total 
  FROM users 
  WHERE created_at >= $1
`, [new Date('2024-01-01')]);
```

### Real-time Features

```typescript
// Subscribe to table changes
platform.realtime.subscribe('users', (event) => {
  console.log('User updated:', event.data);
});

// Subscribe to custom events
platform.realtime.on('notification.received', (notification) => {
  showNotification(notification);
});

// Emit custom events
platform.realtime.emit('user.action', {
  action: 'profile_updated',
  userId: user.id
});

// Unsubscribe
platform.realtime.unsubscribe('users');
```

### File Storage

```typescript
// Upload file
const upload = await platform.storage.upload(file, {
  bucket: 'documents',
  path: 'user-uploads/',
  metadata: {
    uploadedBy: user.id,
    tags: ['document', 'pdf']
  }
});

// List files
const files = await platform.storage.list({
  bucket: 'documents',
  prefix: 'user-uploads/',
  limit: 50
});

// Download file
const downloadUrl = await platform.storage.getDownloadUrl(fileId);

// Delete file
await platform.storage.delete(fileId);
```

### Module Management

```typescript
// List available modules
const modules = await platform.modules.list();

// Install module
await platform.modules.install('sales-module', {
  version: '1.2.0',
  config: {
    currency: 'USD',
    notifications: true
  }
});

// Get module API
const salesAPI = platform.modules.getAPI('sales-module');
const customers = await salesAPI.getCustomers();

// Update module configuration
await platform.modules.updateConfig('sales-module', {
  currency: 'EUR'
});
```

## 🏗️ Module Development

### Module Structure

```typescript
// src/index.ts - Module entry point
import { ModuleDefinition } from '@plataforma/sdk';
import MyModuleComponent from './components/MyModuleComponent';

const module: ModuleDefinition = {
  id: 'my-module',
  name: 'My Awesome Module',
  version: '1.0.0',
  component: MyModuleComponent,
  
  // Lifecycle hooks
  async onActivate(platform) {
    console.log('Module activated');
    // Initialize module
  },
  
  async onDeactivate() {
    console.log('Module deactivated');
    // Cleanup resources
  },
  
  // Public API
  api: {
    getData: async () => {
      // Return module data
    },
    
    processAction: async (action: string) => {
      // Handle actions
    }
  },
  
  // Configuration schema
  config: {
    theme: {
      type: 'string',
      enum: ['light', 'dark'],
      default: 'light'
    },
    maxItems: {
      type: 'number',
      default: 100,
      minimum: 1,
      maximum: 1000
    }
  }
};

export default module;
```

### Component Development

```tsx
// src/components/MyModuleComponent.tsx
import React, { useState, useEffect } from 'react';
import { 
  WindowCard, 
  WindowButton, 
  WindowInput 
} from '@plataforma/design-system';
import { usePlatform } from '@plataforma/sdk';

export default function MyModuleComponent() {
  const platform = usePlatform();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await platform.database.query({
        table: 'my_data',
        limit: 50
      });
      setData(result.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      await platform.database.insert('actions', {
        type: 'button_clicked',
        timestamp: new Date()
      });
      
      // Emit event for other modules
      platform.realtime.emit('action.performed', {
        module: 'my-module',
        action: 'button_clicked'
      });
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  if (loading) {
    return (
      <WindowCard title="My Module">
        <div className="p-4">Loading...</div>
      </WindowCard>
    );
  }

  return (
    <WindowCard title="My Awesome Module">
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item) => (
            <div key={item.id} className="bg-white/5 p-3 rounded-lg">
              <h3 className="font-medium text-white">{item.name}</h3>
              <p className="text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <WindowButton 
            variant="primary" 
            onClick={handleAction}
          >
            Perform Action
          </WindowButton>
          
          <WindowButton 
            variant="secondary" 
            onClick={loadData}
          >
            Refresh
          </WindowButton>
        </div>
      </div>
    </WindowCard>
  );
}
```

### Custom Hooks

```tsx
// src/hooks/useModuleData.ts
import { useState, useEffect } from 'react';
import { usePlatform } from '@plataforma/sdk';

interface ModuleData {
  items: any[];
  loading: boolean;
  error: string | null;
}

export function useModuleData(filters?: object): ModuleData {
  const platform = usePlatform();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await platform.database.query({
        table: 'module_data',
        where: filters,
        orderBy: { created_at: 'desc' }
      });
      
      setItems(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, error };
}
```

## 🧪 Testing

### Unit Testing

```tsx
// tests/components/MyModuleComponent.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockPlatform } from '@plataforma/sdk/testing';
import MyModuleComponent from '../src/components/MyModuleComponent';

describe('MyModuleComponent', () => {
  let mockPlatform;

  beforeEach(() => {
    mockPlatform = createMockPlatform({
      database: {
        query: jest.fn().mockResolvedValue({
          data: [
            { id: 1, name: 'Test Item', description: 'Test description' }
          ]
        })
      }
    });
  });

  test('renders module correctly', async () => {
    render(<MyModuleComponent />, {
      wrapper: ({ children }) => (
        <PlatformProvider platform={mockPlatform}>
          {children}
        </PlatformProvider>
      )
    });

    expect(screen.getByText('My Awesome Module')).toBeInTheDocument();
    
    // Wait for data to load
    await screen.findByText('Test Item');
    
    expect(mockPlatform.database.query).toHaveBeenCalledWith({
      table: 'my_data',
      limit: 50
    });
  });

  test('handles action correctly', async () => {
    render(<MyModuleComponent />);
    
    const actionButton = screen.getByText('Perform Action');
    fireEvent.click(actionButton);
    
    expect(mockPlatform.database.insert).toHaveBeenCalledWith('actions', {
      type: 'button_clicked',
      timestamp: expect.any(Date)
    });
  });
});
```

### Integration Testing

```typescript
// tests/integration/module.integration.test.ts
import { createTestEnvironment } from '@plataforma/sdk/testing';
import myModule from '../src/index';

describe('Module Integration', () => {
  let testEnv;

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
    await testEnv.installModule(myModule);
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  test('module lifecycle works correctly', async () => {
    // Test activation
    await testEnv.activateModule('my-module');
    expect(testEnv.getModuleState('my-module').active).toBe(true);

    // Test API functionality
    const api = testEnv.getModuleAPI('my-module');
    const data = await api.getData();
    expect(data).toBeDefined();

    // Test deactivation
    await testEnv.deactivateModule('my-module');
    expect(testEnv.getModuleState('my-module').active).toBe(false);
  });

  test('inter-module communication', async () => {
    // Install another test module
    const otherModule = createTestModule('other-module');
    await testEnv.installModule(otherModule);
    
    // Test event communication
    const eventPromise = testEnv.waitForEvent('action.performed');
    await testEnv.triggerModuleAction('my-module', 'performAction');
    
    const event = await eventPromise;
    expect(event.data.module).toBe('my-module');
  });
});
```

## 🎯 Advanced Features

### Custom Module Types

```typescript
// Define custom module type
import { ModuleDefinition } from '@plataforma/sdk';

interface BusinessModuleAPI {
  getReports(): Promise<Report[]>;
  generateReport(type: string): Promise<Report>;
  exportData(format: 'pdf' | 'excel'): Promise<Blob>;
}

const businessModule: ModuleDefinition<BusinessModuleAPI> = {
  id: 'business-module',
  name: 'Business Intelligence',
  version: '2.0.0',
  
  api: {
    async getReports() {
      // Implementation
    },
    
    async generateReport(type: string) {
      // Implementation
    },
    
    async exportData(format) {
      // Implementation
    }
  }
};
```

### Plugin System

```typescript
// Create extensible modules with plugins
import { createPluginSystem } from '@plataforma/sdk';

const plugins = createPluginSystem({
  hooks: {
    beforeDataLoad: [],
    afterDataLoad: [],
    onDataChange: []
  }
});

// Register plugin
plugins.registerPlugin('data-validator', {
  beforeDataLoad: async (data) => {
    return validateData(data);
  }
});

// Use in module
const data = await plugins.executeHook('beforeDataLoad', rawData);
```

### Performance Optimization

```typescript
// Lazy loading and code splitting
import { lazy, Suspense } from 'react';
import { WindowCard } from '@plataforma/design-system';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function OptimizedModule() {
  return (
    <WindowCard title="Optimized Module">
      <Suspense fallback={<div>Loading component...</div>}>
        <HeavyComponent />
      </Suspense>
    </WindowCard>
  );
}

// Memoization for expensive operations
import { useMemo, useCallback } from 'react';

function DataVisualization({ data }) {
  const processedData = useMemo(() => {
    return expensiveDataProcessing(data);
  }, [data]);

  const handleClick = useCallback((item) => {
    // Handle click
  }, []);

  return <Chart data={processedData} onClick={handleClick} />;
}
```

## 🔍 Debugging

### Development Tools

```typescript
// Enable debug mode
const platform = new PlatformSDK({
  debug: true,
  logLevel: 'verbose'
});

// Access debug information
console.log('Module state:', platform.debug.getModuleState());
console.log('API calls:', platform.debug.getAPICallHistory());
console.log('Events:', platform.debug.getEventHistory());
```

### Error Handling

```typescript
// Global error handler
platform.onError((error, context) => {
  console.error('Platform error:', error);
  console.log('Context:', context);
  
  // Report to monitoring service
  reportError(error, context);
});

// Module-specific error boundaries
import { ErrorBoundary } from '@plataforma/sdk';

function MyModule() {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <WindowCard title="Error">
          <p>Something went wrong: {error.message}</p>
        </WindowCard>
      )}
      onError={(error, errorInfo) => {
        // Log error
        console.error('Module error:', error, errorInfo);
      }}
    >
      <MyModuleContent />
    </ErrorBoundary>
  );
}
```

## 📚 Examples

### Business Dashboard Module

```typescript
// Complete example of a business dashboard module
import React, { useState } from 'react';
import { 
  WindowCard, 
  WindowButton, 
  WindowTable 
} from '@plataforma/design-system';
import { usePlatform, useRealtime } from '@plataforma/sdk';

export default function BusinessDashboard() {
  const platform = usePlatform();
  const [metrics, setMetrics] = useState({});
  const [transactions, setTransactions] = useState([]);

  // Real-time updates
  useRealtime('transactions', (event) => {
    if (event.type === 'insert') {
      setTransactions(prev => [event.data, ...prev]);
      updateMetrics();
    }
  });

  const updateMetrics = async () => {
    const result = await platform.database.raw(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_transaction
      FROM transactions 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    
    setMetrics(result.data[0]);
  };

  const exportReport = async () => {
    const data = await platform.database.query({
      table: 'transactions',
      where: {
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const blob = await generateExcelReport(data);
    const url = await platform.storage.upload(blob, {
      bucket: 'reports',
      filename: `transactions_${new Date().toISOString()}.xlsx`
    });

    platform.notifications.success('Report generated successfully!');
  };

  return (
    <WindowCard title="Business Dashboard">
      <div className="p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 p-4 rounded-lg">
            <h3 className="text-white/70">Total Transactions</h3>
            <p className="text-2xl font-bold text-white">
              {metrics.total_transactions || 0}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <h3 className="text-white/70">Total Revenue</h3>
            <p className="text-2xl font-bold text-white">
              ${metrics.total_revenue || 0}
            </p>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <h3 className="text-white/70">Average Transaction</h3>
            <p className="text-2xl font-bold text-white">
              ${metrics.avg_transaction || 0}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <WindowButton variant="primary" onClick={exportReport}>
            Export Report
          </WindowButton>
          <WindowButton variant="secondary" onClick={updateMetrics}>
            Refresh
          </WindowButton>
        </div>

        {/* Transactions Table */}
        <WindowTable
          data={transactions}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'amount', label: 'Amount', format: 'currency' },
            { key: 'customer', label: 'Customer' },
            { key: 'created_at', label: 'Date', format: 'date' }
          ]}
          pagination={{
            pageSize: 20,
            total: transactions.length
          }}
        />
      </div>
    </WindowCard>
  );
}
```

## 📝 Configuration

### Environment Variables

```bash
# .env
PLATAFORMA_API_URL=https://api.plataforma.dev
PLATAFORMA_TOKEN=your-auth-token
PLATAFORMA_DEBUG=true
PLATAFORMA_LOG_LEVEL=verbose
```

### Module Configuration

```json
// module.json
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "description": "Description of my module",
  "category": "business",
  "icon": "chart-bar",
  "permissions": {
    "required": ["data.read", "data.write"],
    "optional": ["files.upload", "notifications.send"]
  },
  "dependencies": {
    "modules": ["auth-system", "database-system"],
    "services": ["notification-service"]
  },
  "config": {
    "theme": {
      "type": "string",
      "enum": ["light", "dark"],
      "default": "light"
    },
    "refreshInterval": {
      "type": "number",
      "default": 30000,
      "minimum": 1000,
      "maximum": 300000
    }
  }
}
```

## 🤝 Contributing

We welcome contributions to the Plataforma SDK! Please see our [Contributing Guide](./CONTRIBUTING.md).

### Development Setup

```bash
# Clone the repository
git clone https://github.com/plataforma-dev/sdk

# Install dependencies
npm install

# Run tests
npm test

# Build the SDK
npm run build

# Start development
npm run dev
```

## 📄 License

MIT © [Plataforma.app Team](https://github.com/plataforma-dev)

## 🔗 Resources

- [Documentation](https://docs.plataforma.dev)
- [API Reference](https://api-docs.plataforma.dev)
- [Examples](https://github.com/plataforma-dev/examples)
- [Discord Community](https://discord.gg/plataforma)
- [GitHub Issues](https://github.com/plataforma-dev/sdk/issues)

---

**Need help?** Check our [FAQ](./FAQ.md) or join our [Discord community](https://discord.gg/plataforma) for real-time support!