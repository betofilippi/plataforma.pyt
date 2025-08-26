/**
 * Default templates for table editor
 */

export interface TableTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  columns: Array<{
    name: string;
    type: string;
    default?: any;
  }>;
  sampleData: Array<Record<string, any>>;
}

export const defaultTemplates: TableTemplate[] = [
  {
    id: 'users',
    name: 'Users',
    description: 'Basic user management table',
    category: 'Core',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'created_at', type: 'datetime' }
    ],
    sampleData: [
      { id: 1, name: 'John Doe', email: 'john@example.com', created_at: new Date().toISOString() },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: new Date().toISOString() }
    ]
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Product catalog management',
    category: 'E-commerce',
    columns: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'text' },
      { name: 'price', type: 'number' },
      { name: 'category', type: 'text' },
      { name: 'in_stock', type: 'boolean' }
    ],
    sampleData: [
      { id: 1, name: 'Laptop', price: 999.99, category: 'Electronics', in_stock: true },
      { id: 2, name: 'Book', price: 29.99, category: 'Education', in_stock: true }
    ]
  }
];

// Alternative export names for compatibility
export const DEFAULT_TEMPLATES = defaultTemplates;

export interface AITemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  category: string;
}

export const TEMPLATE_CATEGORIES = [
  'Core',
  'E-commerce',
  'CRM',
  'Finance',
  'HR',
  'Custom'
];

export const TEMPLATE_COSTS = {
  free: 0,
  basic: 5,
  premium: 15,
  enterprise: 50
};

export const TEMPLATE_DIFFICULTIES = [
  'Beginner',
  'Intermediate', 
  'Advanced',
  'Expert'
];

// Helper functions
export const getTemplatesByCategory = (category: string) => {
  return defaultTemplates.filter(template => template.category === category);
};

export const searchTemplates = (query: string) => {
  return defaultTemplates.filter(template => 
    template.name.toLowerCase().includes(query.toLowerCase()) ||
    template.description.toLowerCase().includes(query.toLowerCase())
  );
};

export const getTopRatedTemplates = () => {
  return defaultTemplates.slice(0, 5); // Mock: return first 5 as "top rated"
};

export const getMostUsedTemplates = () => {
  return defaultTemplates.slice(0, 3); // Mock: return first 3 as "most used"
};

export default defaultTemplates;