# Database Module

Complete database management system for plataforma.app

## Features

- **Table Editor**: Advanced table editing with glassmorphism design
- **Schema Management**: Full PostgreSQL schema support
- **Multi-Schema Support**: Module-specific database schemas
- **Visual Interface**: Excel-like editing experience
- **Type System**: Text-based storage with rich type hints
- **Real-time Sync**: Instant synchronization with Supabase

## Components

### DatabaseModule
Main module component with desktop interface and window management.

### TableEditorCanvas
Advanced table editor with full functionality:
- Cell editing with type hints
- Column management
- Row operations
- Schema switching
- Export/Import capabilities

### TableEditorWithSchema
Schema-filtered table editor for module-specific data.

### DatabaseContent
Content window for database operations.

## Usage

```tsx
import { DatabaseModule } from '@plataforma/database-module';

function App() {
  return <DatabaseModule />;
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
│   ├── DatabaseModule.tsx
│   ├── TableEditorCanvas.tsx
│   └── table-editor/     # Modular table editor
├── hooks/               # Custom hooks
├── services/            # API services
├── utils/               # Utility functions
└── index.ts            # Module exports
```

## Configuration

The module supports the following configuration options:

- `schemaFilter`: Filter tables by schema
- `permissions`: Access control settings
- `theme`: Visual theme customization
- `features`: Enable/disable specific features

## Dependencies

- React 18+
- Supabase client
- Lucide React icons
- Core platform components

## License

MIT