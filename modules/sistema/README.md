# Sistema Module

System administration and configuration module for plataforma.app

## Features

- **Window Templates**: Standardized window components and patterns
- **Taskbar Templates**: Taskbar design system and templates
- **Table Templates**: Table layout and styling templates
- **System Configuration**: Platform-wide system settings
- **Module Templates**: Base templates for creating new modules

## Components

### SistemaModule
Main module component with desktop interface for system administration.

### WindowTemplate
Template component showcasing the window design system with all standard components.

### TaskbarTemplate
Template for taskbar implementation with standard patterns.

### TablesTemplate
Visual template for table styling and layout patterns.

## Usage

```tsx
import { SistemaModule } from '@plataforma/sistema-module';

function App() {
  return <SistemaModule />;
}
```

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build module
npm run build

# Type checking
npm run typecheck
```

## Module Structure

```
src/
├── components/           # React components
│   ├── SistemaModule.tsx
│   ├── WindowTemplate.tsx
│   ├── TaskbarTemplate.tsx
│   └── TablesTemplate.tsx
├── hooks/               # Custom hooks
├── services/            # API services
├── utils/               # Utility functions
└── index.ts            # Module exports
```

## Templates

This module provides essential templates for:

- **Window Components**: Standard window patterns
- **UI Components**: Button, Input, Card, etc.
- **Layout Patterns**: Desktop, grid, flex layouts
- **Style Guidelines**: Colors, typography, spacing
- **Module Structure**: How to create new modules

## Dependencies

- React 18+
- Lucide React icons
- Core platform components

## License

MIT