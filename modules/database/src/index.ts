// Database Module - Main Exports
export { default as DatabaseModule } from './components/DatabaseModule';
export { default as TableEditorCanvas } from './components/TableEditorCanvas';
export { default as DatabaseContent } from './components/DatabaseContent';
export { default as TableEditorWithSchema } from './components/TableEditorWithSchema';

// Module metadata for marketplace
export const moduleInfo = {
  id: 'database',
  name: 'Database Module',
  version: '1.0.0',
  description: 'Complete database management system with table editor and schema management',
  author: 'Plataforma Team',
  category: 'core',
  tags: ['database', 'tables', 'schema', 'management'],
  permissions: [
    'database:read',
    'database:write',
    'database:schema',
    'database:admin'
  ],
  dependencies: [],
  icon: 'Database',
  color: '#6366f1',
  screenshots: [],
  documentation: './README.md'
};

// Federation configuration
export const federationConfig = {
  name: 'database_module',
  exposes: {
    './DatabaseModule': './src/components/DatabaseModule',
    './TableEditor': './src/components/TableEditorCanvas'
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'lucide-react': { singleton: true }
  }
};

export default DatabaseModule;