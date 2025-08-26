import React from 'react';
import {
  WindowManagerProvider,
  WindowDesktop,
  useCreateWindow,
} from "@/components/windows";
import { 
  WindowCard, 
  WindowButton, 
  WindowInput, 
  WindowSelect, 
  WindowToggle 
} from '@/components/ui';
import {
  ShoppingCart as VendasIcon,
  Users as ClientesIcon,
  FileText as PropostasIcon,
  TrendingUp as RelatoriosIcon,
  Package as ProdutosIcon,
  CreditCard as PagamentosIcon,
  Folder as FolderIcon,
  FileText as FileTextIcon,
} from "lucide-react";
import { STANDARD_ICON_CLASSES } from '@/lib/constants/icon-sizes';
import { ContextMenu, useContextMenu, getStandardModuleContextOptions } from '@/components/ui';
import { getModuleColor } from '@/lib/module-colors';
import DocumentExplorerReal from '@/components/DocumentExplorerReal';
import { FileExplorer } from '@/client/pages/windows/FileExplorer';
import TableEditorWithSchema from '@/client/pages/windows/TableEditorWithSchema';

// Module icon component with Material-UI icons
function ModuleIcon({
  module,
  onClick,
}: {
  module: {
    id: string;
    name: string;
    icon: React.ComponentType<any>;
    color: string;
  };
  onClick: () => void;
}) {
  const IconComponent = module.icon;
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const moduleColor = getModuleColor('vendas');

  const contextOptions = getStandardModuleContextOptions(
    module.name,
    onClick,
    () => console.log(`Informações sobre ${module.name}`),
    () => console.log(`Atualizando ${module.name}`)
  );

  return (
    <>
      <div
        onClick={onClick}
        onContextMenu={showContextMenu}
        className="group relative transition-all duration-300 cursor-pointer hover:scale-105"
      >
        <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
          <IconComponent
            size={64}
            color={moduleColor.primary}
            style={{
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            }}
          />
        </div>
        <div className="w-44 text-center mx-auto">
          <span
            className="font-semibold text-xs leading-tight drop-shadow-lg block text-white"
          >
            {module.name}
          </span>
        </div>
      </div>
      
      <ContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={hideContextMenu}
        options={contextOptions}
      />
    </>
  );
}

// Sales dashboard placeholder component
function SalesDashboard() {
  return (
    <WindowCard className="h-full p-6">
      <div className="text-center">
        <VendasIcon size={64} className="mx-auto mb-4 text-blue-500" />
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard de Vendas</h2>
        <p className="text-gray-400 mb-6">
          Módulo de vendas com CRM completo, gestão de propostas e relatórios.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">R$ 25.430</div>
            <div className="text-sm text-gray-400">Vendas do Mês</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">89</div>
            <div className="text-sm text-gray-400">Clientes Ativos</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">12</div>
            <div className="text-sm text-gray-400">Propostas Abertas</div>
          </div>
          <div className="bg-white/5 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">96%</div>
            <div className="text-sm text-gray-400">Taxa de Conversão</div>
          </div>
        </div>
      </div>
    </WindowCard>
  );
}

// Componente principal do desktop do vendas
function VendasDesktopContent() {
  const createWindow = useCreateWindow();
  // Path específico do módulo vendas
  const rootPath = 'C:\\Users\\Beto\\OneDrive - NXT Indústria e Comércio Ltda\\dev\\plataforma.app\\vendas';
  
  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons Grid */}
      <div className="absolute top-32 left-12">
        <div className="grid grid-cols-6 gap-6">
          <ModuleIcon
            module={{
              id: "dashboard",
              name: "DASHBOARD",
              icon: VendasIcon,
              color: "from-blue-600 to-blue-700",
            }}
            onClick={() => {
              createWindow(
                'Dashboard de Vendas',
                <SalesDashboard />,
                {
                  size: { width: 1200, height: 800 },
                  position: { x: 50, y: 30 }
                }
              );
            }}
          />
          
          <ModuleIcon
            module={{
              id: "clientes",
              name: "CLIENTES",
              icon: ClientesIcon,
              color: "from-green-600 to-green-700",
            }}
            onClick={() => {
              createWindow(
                'Gestão de Clientes',
                <TableEditorWithSchema schemaFilter="vendas" tableName="clientes" />,
                {
                  size: { width: 1400, height: 900 },
                  position: { x: 50, y: 30 }
                }
              );
            }}
          />
          
          <ModuleIcon
            module={{
              id: "propostas",
              name: "PROPOSTAS",
              icon: PropostasIcon,
              color: "from-yellow-600 to-yellow-700",
            }}
            onClick={() => {
              createWindow(
                'Gestão de Propostas',
                <TableEditorWithSchema schemaFilter="vendas" tableName="propostas" />,
                {
                  size: { width: 1400, height: 900 },
                  position: { x: 100, y: 50 }
                }
              );
            }}
          />
          
          <ModuleIcon
            module={{
              id: "produtos",
              name: "PRODUTOS",
              icon: ProdutosIcon,
              color: "from-purple-600 to-purple-700",
            }}
            onClick={() => {
              createWindow(
                'Catálogo de Produtos',
                <TableEditorWithSchema schemaFilter="vendas" tableName="produtos" />,
                {
                  size: { width: 1400, height: 900 },
                  position: { x: 150, y: 70 }
                }
              );
            }}
          />
          
          <ModuleIcon
            module={{
              id: "pagamentos",
              name: "PAGAMENTOS",
              icon: PagamentosIcon,
              color: "from-red-600 to-red-700",
            }}
            onClick={() => {
              createWindow(
                'Gestão de Pagamentos',
                <TableEditorWithSchema schemaFilter="vendas" tableName="pagamentos" />,
                {
                  size: { width: 1200, height: 800 },
                  position: { x: 200, y: 90 }
                }
              );
            }}
          />
          
          <ModuleIcon
            module={{
              id: "relatorios",
              name: "RELATÓRIOS",
              icon: RelatoriosIcon,
              color: "from-indigo-600 to-indigo-700",
            }}
            onClick={() => {
              createWindow(
                'Relatórios de Vendas',
                <WindowCard className="p-6 text-center">
                  <TrendingUp size={48} className="mx-auto mb-4 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white mb-2">Relatórios de Vendas</h3>
                  <p className="text-gray-400">Relatórios e analytics em desenvolvimento</p>
                </WindowCard>,
                {
                  size: { width: 800, height: 600 },
                  position: { x: 250, y: 110 }
                }
              );
            }}
          />
        </div>
        
        {/* Segunda linha - Utilitários */}
        <div className="grid grid-cols-6 gap-6 mt-8">
          {/* Diretório Icon */}
          <ModuleIcon
            module={{
              id: "diretorio",
              name: "DIRETÓRIOS",
              icon: FolderIcon,
              color: getModuleColor('vendas').gradient,
            }}
            onClick={() => {
              createWindow(
                'Diretórios - Vendas',
                <FileExplorer 
                  initialPath={rootPath}
                  title="Diretório - Vendas"
                />,
                {
                  size: { width: 1000, height: 700 },
                  position: { x: 100, y: 50 }
                }
              );
            }}
          />
          
          {/* Documentos Icon */}
          <ModuleIcon
            module={{
              id: "documentos",
              name: "DOCUMENTOS",
              icon: FileTextIcon,
              color: getModuleColor('vendas').gradient,
            }}
            onClick={() => {
              createWindow(
                'Documentos - Vendas',
                <DocumentExplorerReal 
                  moduleId="vendas"
                  initialPath="/documents"
                  allowUpload={true}
                  allowDelete={true}
                  viewMode="grid"
                />,
                {
                  size: { width: 1000, height: 700 },
                  position: { x: 150, y: 100 }
                }
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * VENDAS - Módulo Principal
 * 
 * Sistema completo de gestão comercial e CRM
 * com desktop próprio e sistema de janelas independente
 */
export default function VendasModule() {
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={true}
        backgroundColor="#1f2937"
        disableContextMenu={false}
      >
        <VendasDesktopContent />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}