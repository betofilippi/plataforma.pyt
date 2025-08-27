// @plataforma/module-database
// Módulo principal de Base de Dados da Plataforma.app

// Exportações principais do módulo
export { default as DatabaseModule } from './components/DatabaseModule';
export { default as TableEditorCanvas } from './components/TableEditorCanvas';
export { default as TableEditorWithSchema } from './components/TableEditorWithSchema';
export { default as DatabaseContent } from './components/DatabaseContent';

// Export default para facilitar imports
export { default } from './components/DatabaseModule';

// Componentes específicos do table-editor
export * from './components/table-editor/modules/constants/types';
export * from './components/table-editor/modules/constants/constants';
export * from './components/table-editor/modules/constants/mappings';
export * from './components/table-editor/modules/utils/helpers';
export * from './components/table-editor/modules/utils/file-operations';
export * from './components/table-editor/modules/config/formulas';

// Types e interfaces
export type * from './types';

// Hooks
export * from './hooks';

// Services
export * from './services';

// Utils
export * from './utils';

// Versão do módulo
export const VERSION = '1.0.0';

// Metadados do módulo
export const MODULE_METADATA = {
  name: '@plataforma/module-database',
  version: '1.0.0',
  description: 'Módulo de Base de Dados da Plataforma.app',
  icon: 'Storage',
  category: 'core',
  permissions: [
    'database.read',
    'database.write',
    'database.create',
    'database.delete',
  ],
} as const;