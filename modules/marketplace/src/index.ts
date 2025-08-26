// Marketplace Module - Main Exports
export { default as MarketplaceModule } from './components/MarketplaceModule';
export { MarketplacePage } from './marketplace';

// Re-export marketplace components
export * from './marketplace/components';
export * from './marketplace/hooks';
export * from './marketplace/services';
export * from './marketplace/types';

// Module metadata for marketplace
export const moduleInfo = {
  id: 'marketplace',
  name: 'Marketplace Module',
  version: '1.0.0',
  description: 'Module marketplace for discovering, installing, and managing platform modules',
  author: 'Plataforma Team',
  category: 'core',
  tags: ['marketplace', 'modules', 'installer', 'manager'],
  permissions: [
    'marketplace:read',
    'marketplace:install',
    'marketplace:admin'
  ],
  dependencies: [],
  icon: 'Store',
  color: '#8b5cf6',
  screenshots: [],
  documentation: './README.md'
};

// Federation configuration
export const federationConfig = {
  name: 'marketplace_module',
  exposes: {
    './MarketplaceModule': './src/components/MarketplaceModule',
    './MarketplacePage': './src/marketplace/MarketplacePage'
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'lucide-react': { singleton: true },
    'react-router-dom': { singleton: true }
  }
};

export default MarketplaceModule;