/**
 * Module Registry - Exemplos de Uso
 * Como usar o sistema de Module Registry na prática
 */

import React, { Suspense } from 'react';
import { moduleRegistry, useModule, useModules, useModuleRegistry } from './moduleRegistry';
import type { ModuleConfig } from './types/module-types';

// ============================================================================
// EXEMPLO 1: Uso básico do useModule
// ============================================================================

function ModuleExample() {
  const { 
    component: IAComponent, 
    isLoading, 
    isError, 
    error,
    loadModule,
    reloadModule 
  } = useModule('ia');

  if (isLoading) {
    return <div className="animate-spin">Carregando módulo IA...</div>;
  }

  if (isError) {
    return (
      <div className="text-red-500">
        <p>Erro ao carregar módulo: {error?.message}</p>
        <button onClick={loadModule} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={reloadModule} className="mb-4 px-3 py-1 bg-gray-500 text-white rounded text-sm">
        🔄 Recarregar Módulo
      </button>
      {IAComponent && <IAComponent />}
    </div>
  );
}

// ============================================================================
// EXEMPLO 2: Carregamento com Suspense
// ============================================================================

function SuspenseExample() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">
          ⏳ Carregando módulo...
        </div>
      </div>
    }>
      <LazyModuleComponent />
    </Suspense>
  );
}

function LazyModuleComponent() {
  const { component: VendasComponent } = useModule('vendas', { 
    suspense: true 
  });
  
  return VendasComponent ? <VendasComponent /> : null;
}

// ============================================================================
// EXEMPLO 3: Múltiplos módulos
// ============================================================================

function MultipleModulesExample() {
  const { modules, loading, isAllLoaded, hasErrors } = useModules([
    'estoque', 
    'vendas', 
    'faturamento'
  ]);

  return (
    <div>
      <h2>Dashboard de Módulos</h2>
      
      {!isAllLoaded && (
        <div className="mb-4 p-3 bg-blue-100 rounded">
          Carregando módulos... ({Object.values(loading).filter(Boolean).length} restantes)
        </div>
      )}

      {hasErrors && (
        <div className="mb-4 p-3 bg-red-100 rounded">
          ⚠️ Alguns módulos falharam ao carregar
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(modules).map(([id, module]) => (
          <div key={id} className="border p-4 rounded">
            <h3>{module?.config.name || id}</h3>
            {loading[id] ? (
              <div>Carregando...</div>
            ) : module?.status === 'loaded' ? (
              <div className="text-green-500">✅ Carregado</div>
            ) : (
              <div className="text-red-500">❌ Erro</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 4: Registry Management
// ============================================================================

function ModuleManagementPanel() {
  const { 
    stats, 
    refreshStats,
    registerModule,
    getAllModules,
    clearCache 
  } = useModuleRegistry();

  const handleRegisterCustomModule = () => {
    const customModule: ModuleConfig = {
      id: 'custom_module',
      name: 'Módulo Customizado',
      icon: 'Extension',
      component: '/components/CustomModule',
      category: 'external',
      lazy: true,
      hotReload: true,
      description: 'Módulo criado dinamicamente'
    };

    registerModule(customModule);
    refreshStats();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Gerenciamento de Módulos</h2>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalModules}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.loadedModules}</div>
          <div className="text-sm text-gray-600">Carregados</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.errorModules}</div>
          <div className="text-sm text-gray-600">Com Erro</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.loadingModules}</div>
          <div className="text-sm text-gray-600">Carregando</div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={refreshStats}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔄 Atualizar
        </button>
        <button 
          onClick={clearCache}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          🧹 Limpar Cache
        </button>
        <button 
          onClick={handleRegisterCustomModule}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          ➕ Registrar Módulo
        </button>
      </div>

      {/* Lista de Módulos por Categoria */}
      <div>
        <h3 className="font-semibold mb-2">Módulos por Categoria</h3>
        {stats.categories.map(category => (
          <div key={category} className="mb-2">
            <span className="inline-block w-32 text-sm font-medium capitalize">
              {category}:
            </span>
            <span className="text-sm text-gray-600">
              {getAllModules().filter(m => m.category === category).length} módulos
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Registro de módulo customizado em runtime
// ============================================================================

async function registerExternalModule() {
  // Registrar um novo módulo dinamicamente
  const externalModule: ModuleConfig = {
    id: 'external_crm',
    name: 'CRM Externo',
    icon: 'Groups',
    component: '/external/CRMModule',
    category: 'business',
    lazy: true,
    dependencies: ['database', 'auth'],
    description: 'Integração com CRM externo via API',
    version: '1.0.0'
  };

  moduleRegistry.registerModule(externalModule);
  
  // Carregar imediatamente
  const loadedModule = await moduleRegistry.loadModule('external_crm');
  
  if (loadedModule?.status === 'loaded') {
    console.log('✅ Módulo externo carregado com sucesso!');
  }
}

// ============================================================================
// EXEMPLO 6: Error Boundary para módulos
// ============================================================================

class ModuleErrorBoundary extends React.Component<
  { children: React.ReactNode; moduleId: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Module Error (${this.props.moduleId}):`, error, errorInfo);
    
    // Log para sistema de monitoramento
    this.logModuleError(error);
  }

  logModuleError(error: Error) {
    // Aqui você poderia enviar para um serviço de monitoramento
    console.log('Logging module error to monitoring service...');
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-2 border-dashed border-red-300 p-6 text-center">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Módulo com Problemas
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            ID: {this.props.moduleId}
          </p>
          <p className="text-xs text-red-500 bg-red-50 p-2 rounded">
            {this.state.error?.message}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// EXEMPLO 7: Higher-Order Component
// ============================================================================

function PageWithModule() {
  const EnhancedPage = withModule('financeiro', {
    autoLoad: true,
    retryOnError: true
  })(({ moduleData }: any) => {
    const { component: FinanceiroComponent, isLoading, error } = moduleData;

    if (isLoading) return <div>Carregando módulo financeiro...</div>;
    if (error) return <div>Erro: {error.message}</div>;
    
    return (
      <div>
        <h1>Página Financeira</h1>
        {FinanceiroComponent && <FinanceiroComponent />}
      </div>
    );
  });

  return <EnhancedPage />;
}

// ============================================================================
// EXEMPLO 8: Uso completo em um dashboard
// ============================================================================

function ModularDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Modular</h1>
      
      {/* Painel de gerenciamento */}
      <ModuleManagementPanel />
      
      {/* Módulos em grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Módulo IA */}
        <ModuleErrorBoundary moduleId="ia">
          <div className="border rounded-lg p-4 bg-white shadow">
            <h3 className="font-semibold mb-2">Inteligência Artificial</h3>
            <ModuleExample />
          </div>
        </ModuleErrorBoundary>
        
        {/* Módulo Vendas com Suspense */}
        <div className="border rounded-lg p-4 bg-white shadow">
          <h3 className="font-semibold mb-2">Vendas</h3>
          <SuspenseExample />
        </div>
        
        {/* Módulos múltiplos */}
        <div className="col-span-full">
          <MultipleModulesExample />
        </div>
        
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT DOS EXEMPLOS
// ============================================================================

export {
  ModuleExample,
  SuspenseExample,
  MultipleModulesExample,
  ModuleManagementPanel,
  ModularDashboard,
  ModuleErrorBoundary,
  registerExternalModule
};

// HOW TO USE:
// 1. Import the hook: import { useModule } from '@/lib/useModule';
// 2. Use in component: const { component, isLoading, error } = useModule('module-id');
// 3. Handle loading/error states
// 4. Render the component when loaded