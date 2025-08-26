# Marketplace Module

Module marketplace for discovering, installing, and managing platform modules

## Features

- **Module Discovery**: Browse available platform modules
- **Module Installation**: One-click module installation
- **Developer Dashboard**: Tools for module developers
- **Module Management**: Enable/disable installed modules
- **Version Control**: Manage module versions and updates
- **Module Publishing**: Publish modules to marketplace

## Components

### MarketplaceModule
Main module component providing marketplace interface.

### MarketplacePage
Full marketplace interface with module browsing and management.

### ModuleCard
Display component for individual modules with install/manage actions.

### DeveloperDashboard
Interface for module developers to manage their published modules.

### InstallModal
Modal for installing and configuring modules.

## Module Management

The marketplace handles:
- Module discovery and browsing
- Installation and configuration
- Dependency management
- Version updates
- Module permissions
- User authentication for marketplace access

## Usage

```tsx
import { MarketplaceModule } from '@plataforma/marketplace-module';

function App() {
  return <MarketplaceModule onClose={() => console.log('closed')} />;
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
│   └── MarketplaceModule.tsx
├── marketplace/         # Core marketplace logic
│   ├── components/
│   │   ├── ModuleCard.tsx
│   │   ├── DeveloperDashboard.tsx
│   │   ├── InstallModal.tsx
│   │   └── ModuleDetail.tsx
│   ├── hooks/
│   │   ├── useMarketplace.ts
│   │   └── useModuleInstaller.ts
│   ├── services/
│   │   ├── marketplace-api.ts
│   │   └── mock-data.ts
│   ├── types/
│   │   └── index.ts
│   ├── MarketplacePage.tsx
│   └── index.ts
├── hooks/               # Custom hooks
├── services/            # API services
├── utils/               # Utility functions
└── index.ts            # Module exports
```

## API Integration

The marketplace integrates with:
- Module registry API
- Installation services
- User authentication system
- Version control system
- Analytics and metrics

## Security

- Module verification and signing
- Permission-based access control
- Safe module sandboxing
- Dependency vulnerability scanning
- Automated security updates

## Dependencies

- React 18+
- React Router for navigation
- Lucide React icons
- Core platform components

## License

MIT