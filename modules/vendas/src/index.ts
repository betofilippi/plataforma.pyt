// Vendas Module - Main Exports
export { default as VendasModule } from './components/VendasModule';

// Module metadata for marketplace
export const moduleInfo = {
  id: 'vendas',
  name: 'Vendas Module',
  version: '1.0.0',
  description: 'Complete sales management system with CRM, proposals, and reports',
  author: 'Plataforma Team',
  category: 'business',
  tags: ['vendas', 'sales', 'crm', 'proposals', 'reports'],
  permissions: [
    'vendas:read',
    'vendas:write',
    'vendas:admin',
    'vendas:reports'
  ],
  dependencies: [],
  icon: 'ShoppingCart',
  color: '#3b82f6',
  screenshots: [],
  documentation: './README.md'
};

// Federation configuration
export const federationConfig = {
  name: 'vendas_module',
  exposes: {
    './VendasModule': './src/components/VendasModule'
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
    'lucide-react': { singleton: true }
  }
};

export default VendasModule;