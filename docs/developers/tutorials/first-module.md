# Your First Module Tutorial

This tutorial will guide you through creating, developing, and deploying your first Plataforma.dev module in just 15 minutes. You'll build a simple "Hello World" module that demonstrates the core concepts of module development.

## 🎯 What You'll Learn

- How to set up the development environment
- Module structure and architecture
- Creating UI components with the design system
- Handling user interactions and state
- Building and deploying modules
- Testing your module

## 📋 Prerequisites

- Basic knowledge of React and TypeScript
- Node.js 18+ installed
- Plataforma.dev development environment set up
- Text editor (VS Code recommended)

## 🚀 Step 1: Create Your Module

### Install the Platform CLI

First, make sure you have the Platform CLI installed:

```bash
# Install globally
npm install -g @plataforma/cli

# Verify installation
plataforma --version
```

### Generate Module Scaffold

Create your first module using the CLI:

```bash
# Create new module
plataforma create hello-world-module --template basic

# Navigate to module directory
cd hello-world-module

# Install dependencies
npm install
```

This creates the following structure:

```
hello-world-module/
├── src/
│   ├── components/
│   │   └── HelloWorldModule.tsx
│   ├── hooks/
│   │   └── useModuleData.ts
│   ├── services/
│   │   └── api.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── assets/
├── package.json
├── module.json
├── tsconfig.json
└── README.md
```

## 🏗️ Step 2: Understand Module Structure

### Module Manifest (module.json)

This file defines your module's metadata and configuration:

```json
{
  "id": "hello-world-module",
  "name": "Hello World Module",
  "version": "1.0.0",
  "description": "My first Plataforma.dev module",
  "category": "utility",
  "icon": "wave",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "permissions": {
    "required": [],
    "optional": []
  },
  "dependencies": {
    "modules": [],
    "services": []
  }
}
```

### Package Configuration (package.json)

Standard Node.js package file with module-specific configurations:

```json
{
  "name": "hello-world-module",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "plataforma dev",
    "build": "plataforma build",
    "test": "jest",
    "lint": "eslint src/"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@plataforma/design-system": "^1.0.0"
  }
}
```

## 🎨 Step 3: Build the User Interface

### Create the Main Component

Edit `src/components/HelloWorldModule.tsx`:

```tsx
import React, { useState } from 'react';
import {
  WindowCard,
  WindowButton,
  WindowInput,
  WindowToggle
} from '@plataforma/design-system';
import { useModuleData } from '../hooks/useModuleData';

export default function HelloWorldModule() {
  const [name, setName] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { data, loading } = useModuleData();

  const handleSayHello = () => {
    setShowGreeting(true);
  };

  const handleReset = () => {
    setName('');
    setShowGreeting(false);
  };

  if (loading) {
    return (
      <WindowCard title="Hello World Module">
        <div className="flex items-center justify-center p-8">
          <div className="text-white/60">Loading...</div>
        </div>
      </WindowCard>
    );
  }

  return (
    <WindowCard 
      title="Hello World Module" 
      className={isDarkMode ? 'bg-black/20' : 'bg-white/5'}
    >
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to Plataforma.dev! 👋
          </h2>
          <p className="text-white/70">
            This is your first module. Let's make it interactive!
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-4">
          <WindowInput
            label="Your Name"
            placeholder="Enter your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex gap-3">
            <WindowButton 
              variant="primary" 
              onClick={handleSayHello}
              disabled={!name.trim()}
            >
              Say Hello
            </WindowButton>
            
            <WindowButton 
              variant="secondary" 
              onClick={handleReset}
            >
              Reset
            </WindowButton>
          </div>
        </div>

        {/* Greeting Section */}
        {showGreeting && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-green-400 mb-2">
                Hello, {name}! 🎉
              </h3>
              <p className="text-white/80">
                Welcome to the Plataforma.dev ecosystem!
              </p>
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="border-t border-white/10 pt-4">
          <WindowToggle
            label="Dark Mode"
            checked={isDarkMode}
            onChange={setIsDarkMode}
          />
        </div>

        {/* Stats Section */}
        {data && (
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-3">Module Stats</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Version:</span>
                <span className="text-white ml-2">{data.version}</span>
              </div>
              <div>
                <span className="text-white/60">Created:</span>
                <span className="text-white ml-2">{data.createdAt}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </WindowCard>
  );
}
```

### Create Custom Hook

Edit `src/hooks/useModuleData.ts`:

```typescript
import { useState, useEffect } from 'react';

interface ModuleData {
  version: string;
  createdAt: string;
  author: string;
}

export function useModuleData() {
  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const loadModuleData = async () => {
      try {
        setLoading(true);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data
        const moduleData: ModuleData = {
          version: '1.0.0',
          createdAt: new Date().toLocaleDateString(),
          author: 'You!'
        };
        
        setData(moduleData);
      } catch (err) {
        setError('Failed to load module data');
      } finally {
        setLoading(false);
      }
    };

    loadModuleData();
  }, []);

  return { data, loading, error };
}
```

### Define Types

Edit `src/types/index.ts`:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ModuleConfig {
  theme: 'light' | 'dark';
  showStats: boolean;
  autoGreet: boolean;
}

export interface HelloWorldProps {
  config?: ModuleConfig;
  onConfigChange?: (config: ModuleConfig) => void;
}

export type GreetingType = 'formal' | 'casual' | 'fun';

export interface GreetingOptions {
  type: GreetingType;
  includeTime: boolean;
  includeEmoji: boolean;
}
```

### Module Entry Point

Edit `src/index.ts`:

```typescript
import { ModuleDefinition } from '@plataforma/module-contracts';
import HelloWorldModule from './components/HelloWorldModule';

const moduleDefinition: ModuleDefinition = {
  id: 'hello-world-module',
  name: 'Hello World Module',
  version: '1.0.0',
  component: HelloWorldModule,
  
  // Module lifecycle
  async onActivate() {
    console.log('Hello World Module activated');
  },
  
  async onDeactivate() {
    console.log('Hello World Module deactivated');
  },
  
  // Public API for other modules
  api: {
    greet: (name: string) => `Hello, ${name}!`,
    getVersion: () => '1.0.0',
    
    // Event handlers
    on: (event: string, handler: Function) => {
      // Event subscription logic
      console.log(`Subscribed to ${event}`);
    },
    
    off: (event: string, handler: Function) => {
      // Event unsubscription logic
      console.log(`Unsubscribed from ${event}`);
    }
  },
  
  // Configuration schema
  config: {
    theme: {
      type: 'string',
      enum: ['light', 'dark'],
      default: 'light'
    },
    showStats: {
      type: 'boolean',
      default: true
    }
  }
};

export default moduleDefinition;
```

## 🧪 Step 4: Add Tests

Create `src/components/__tests__/HelloWorldModule.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelloWorldModule from '../HelloWorldModule';

// Mock the design system components
jest.mock('@plataforma/design-system', () => ({
  WindowCard: ({ children, title }: any) => (
    <div data-testid="window-card">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  WindowButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  WindowInput: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  WindowToggle: ({ checked, onChange, label }: any) => (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}));

// Mock the custom hook
jest.mock('../hooks/useModuleData', () => ({
  useModuleData: () => ({
    data: {
      version: '1.0.0',
      createdAt: '2024-08-26',
      author: 'Test User'
    },
    loading: false,
    error: null
  })
}));

describe('HelloWorldModule', () => {
  test('renders welcome message', () => {
    render(<HelloWorldModule />);
    
    expect(screen.getByText('Welcome to Plataforma.dev! 👋')).toBeInTheDocument();
    expect(screen.getByText('This is your first module. Let\'s make it interactive!')).toBeInTheDocument();
  });

  test('shows greeting when name is entered and button clicked', async () => {
    render(<HelloWorldModule />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    const sayHelloButton = screen.getByText('Say Hello');
    
    // Enter name
    fireEvent.change(nameInput, { target: { value: 'John' } });
    
    // Click button
    fireEvent.click(sayHelloButton);
    
    // Check greeting appears
    await waitFor(() => {
      expect(screen.getByText('Hello, John! 🎉')).toBeInTheDocument();
    });
  });

  test('reset button clears name and greeting', async () => {
    render(<HelloWorldModule />);
    
    const nameInput = screen.getByPlaceholderText('Enter your name...');
    const sayHelloButton = screen.getByText('Say Hello');
    const resetButton = screen.getByText('Reset');
    
    // Enter name and show greeting
    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.click(sayHelloButton);
    
    await waitFor(() => {
      expect(screen.getByText('Hello, John! 🎉')).toBeInTheDocument();
    });
    
    // Reset
    fireEvent.click(resetButton);
    
    // Check name is cleared and greeting is hidden
    expect(nameInput).toHaveValue('');
    expect(screen.queryByText('Hello, John! 🎉')).not.toBeInTheDocument();
  });

  test('say hello button is disabled when name is empty', () => {
    render(<HelloWorldModule />);
    
    const sayHelloButton = screen.getByText('Say Hello');
    
    expect(sayHelloButton).toBeDisabled();
  });

  test('dark mode toggle works', () => {
    render(<HelloWorldModule />);
    
    const darkModeToggle = screen.getByLabelText('Dark Mode');
    const card = screen.getByTestId('window-card');
    
    // Toggle dark mode
    fireEvent.click(darkModeToggle);
    
    // Note: In a real test, you'd check the className change
    expect(darkModeToggle).toBeChecked();
  });

  test('displays module stats', () => {
    render(<HelloWorldModule />);
    
    expect(screen.getByText('Module Stats')).toBeInTheDocument();
    expect(screen.getByText('Version:')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
  });
});
```

## 🔧 Step 5: Local Development

### Start Development Server

```bash
# Start the development server
npm run dev
```

This will:
- Start the development server with hot reloading
- Open your module in the platform development environment
- Enable debugging and live editing

### Test Your Module

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Lint and Format Code

```bash
# Check code quality
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 📦 Step 6: Build and Deploy

### Build for Production

```bash
# Build optimized version
npm run build
```

This creates:
- `dist/index.js` - CommonJS build
- `dist/index.esm.js` - ES modules build
- `dist/index.d.ts` - TypeScript definitions
- `dist/assets/` - Static assets

### Deploy to Platform

```bash
# Deploy to staging environment
plataforma deploy --env staging

# Deploy to production
plataforma deploy --env production

# Check deployment status
plataforma status
```

## 🎉 Step 7: Test in Platform

### Access Your Module

1. Open the platform in your browser
2. Navigate to the module marketplace
3. Find your "Hello World Module"
4. Install and activate it
5. Open the module from the desktop

### Verify Functionality

Test all the features you built:
- [ ] Module loads correctly
- [ ] Name input works
- [ ] "Say Hello" button shows greeting
- [ ] "Reset" button clears data
- [ ] Dark mode toggle works
- [ ] Module stats display
- [ ] Responsive design works

## 🚀 Next Steps

Congratulations! You've created your first Plataforma.dev module. Here are some ideas to extend it:

### Add More Features
- **Persistence**: Save user preferences to localStorage
- **Internationalization**: Support multiple languages
- **Themes**: Add more color themes
- **Animations**: Add smooth transitions
- **Sound Effects**: Play sounds for interactions

### Improve User Experience
- **Form Validation**: Add input validation
- **Error Handling**: Handle edge cases gracefully
- **Loading States**: Add skeleton screens
- **Accessibility**: Improve keyboard navigation
- **Mobile Optimization**: Enhance mobile experience

### Add Advanced Functionality
- **API Integration**: Connect to external services
- **Database Storage**: Persist data server-side
- **Real-time Updates**: Add live synchronization
- **User Authentication**: Add user-specific features
- **File Upload**: Handle file operations

### Example Extension: Weather Widget

```tsx
import React, { useState, useEffect } from 'react';
import { WindowCard, WindowButton } from '@plataforma/design-system';

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
}

function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      // Call weather API
      const response = await fetch('/api/weather');
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className="bg-blue-500/20 rounded-lg p-4 mt-4">
      <h3 className="font-semibold mb-2">Weather Widget</h3>
      
      {loading ? (
        <div>Loading weather...</div>
      ) : weather ? (
        <div>
          <div className="text-2xl font-bold">{weather.temperature}°C</div>
          <div className="text-sm opacity-80">{weather.condition}</div>
          <div className="text-xs opacity-60">{weather.location}</div>
        </div>
      ) : (
        <div>Weather not available</div>
      )}
      
      <WindowButton 
        size="sm" 
        onClick={fetchWeather}
        className="mt-2"
      >
        Refresh
      </WindowButton>
    </div>
  );
}
```

## 📚 Additional Resources

- **[Module Development Guide](../../MODULE_DEVELOPMENT.md)** - Comprehensive development guide
- **[API Reference](../../API_REFERENCE.md)** - Complete API documentation
- **[Design System](../api/ui-components.md)** - UI component reference
- **[Testing Guide](../guides/testing-strategies.md)** - Advanced testing strategies
- **[Performance Guide](../guides/performance-optimization.md)** - Optimization techniques

## 🤝 Community & Support

- **Discord**: Join our developer community
- **GitHub**: Report issues and contribute
- **Documentation**: Browse comprehensive docs
- **Blog**: Read latest tutorials and updates

---

**Congratulations!** You've successfully created, developed, and deployed your first Plataforma.dev module. You're now ready to build more complex and powerful modules for the platform ecosystem.

Ready for the next challenge? Try the [Database Integration Tutorial](./database-integration.md) to learn how to build data-driven modules!