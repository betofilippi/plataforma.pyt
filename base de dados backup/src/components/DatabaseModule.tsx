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
  Table as TableIcon,
  Folder as FolderIcon,
  FileText as DocumentsIcon,
} from "lucide-react";
import TableEditorCanvas from './TableEditorCanvas';
// import { FileExplorer } from '@/client/pages/windows/FileExplorer'; // TODO: Move FileExplorer to core or implement within module
import { STANDARD_ICON_CLASSES } from '@/lib/constants/icon-sizes';
import { ContextMenu, useContextMenu, getStandardModuleContextOptions } from '@/components/ui';
import { getModuleColor } from '@/lib/module-colors';
import DocumentExplorerReal from '@/components/DocumentExplorerReal';

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
  const moduleColor = getModuleColor('database');

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

// Componente principal do desktop do database
function DatabaseDesktopContent() {
  const createWindow = useCreateWindow();
  // Path específico do módulo database
  const rootPath = 'C:\\Users\\Beto\\OneDrive - NXT Indústria e Comércio Ltda\\dev\\plataforma.app\\database';
  
  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons Grid */}
      <div className="absolute top-32 left-12">
        <div className="grid grid-cols-5 gap-6">
          <ModuleIcon
            module={{
              id: "tabelas",
              name: "TABELAS",
              icon: TableIcon,
              color: "from-purple-600 to-purple-700",
            }}
            onClick={() => {
              createWindow(
                'Tabelas - Acesso Total',
                <TableEditorCanvas />,
                {
                  size: { width: 1400, height: 900 },
                  position: { x: 50, y: 30 }
                }
              );
            }}
          />
          
          {/* Diretório Icon */}
          <ModuleIcon
            module={{
              id: "diretorio",
              name: "DIRETÓRIOS",
              icon: FolderIcon,
              color: "from-yellow-600 to-yellow-700",
            }}
            onClick={() => {
              // TODO: Implement FileExplorer within module or import from core
              console.log('FileExplorer functionality not yet implemented in module');
              // createWindow(
              //   'Diretórios - Database',
              //   <FileExplorer 
              //     initialPath={rootPath}
              //     title="Diretório - Database"
              //   />,
              //   {
              //     size: { width: 1000, height: 700 },
              //     position: { x: 100, y: 50 }
              //   }
              // );
            }}
          />
          
          {/* Documentos Icon */}
          <ModuleIcon
            module={{
              id: "documentos",
              name: "DOCUMENTOS",
              icon: DocumentsIcon,
              color: "from-blue-600 to-blue-700",
            }}
            onClick={() => {
              createWindow(
                'Documentos - Database',
                <DocumentExplorerReal 
                  moduleId="database"
                  initialPath=""
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
 * BASE DE DADOS - Módulo Principal
 * 
 * Sistema completo de gerenciamento de banco de dados
 * com desktop próprio e sistema de janelas independente
 */
export default function DatabaseModule() {
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={true}
        backgroundColor="#1f2937"
        disableContextMenu={false}
      >
        <DatabaseDesktopContent />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}