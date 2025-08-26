// Sistema Module - Main Exports
export { default as SistemaModule } from './components/SistemaModule';
export { default as WindowTemplate } from './components/WindowTemplate';
export { default as TaskbarTemplate } from './components/TaskbarTemplate';
export { TablesTemplate } from './components/TablesTemplate';

// Module metadata for marketplace
export const moduleInfo = {
  id: 'sistema',
  name: 'Sistema Module',
  version: '1.0.0',
  description: 'System administration and configuration module with templates and utilities',
  author: 'Plataforma Team',
  category: 'core',
  tags: ['system', 'administration', 'templates', 'configuration'],
  permissions: [
    'system:read',
    'system:write',
    'system:admin',
    'system:config'
  ],
  dependencies: [],
  icon: 'Settings',
  color: '#10b981',
  screenshots: [],
  documentation: './README.md'
};

// Federation configuration
export const federationConfig = {
  name: 'sistema_module',
  exposes: {
    './SistemaModule': './src/components/SistemaModule',
    './Templates': './src/components/WindowTemplate'
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'lucide-react': { singleton: true }
  }
};

export default SistemaModule;