import React from 'react';
import {
  WindowManagerProvider,
  WindowDesktop,
  useCreateWindow,
  useWindowManager,
} from "@/components/windows";
import { 
  WindowCard, 
  WindowButton, 
  WindowInput, 
  WindowSelect, 
  WindowToggle 
} from '@/components/ui';
import { LayoutDashboard as LayoutIcon } from "lucide-react";
import WindowTemplate from '@/components/windows/WindowTemplate';
import { TablesTemplate } from './windows/TablesTemplate';
import { FileExplorer } from './windows/FileExplorer';
import { STANDARD_ICON_CLASSES } from '@/lib/constants/icon-sizes';
import { ContextMenu, useContextMenu, getStandardModuleContextOptions } from '@/components/ui';
import { getModuleColor } from '@/lib/module-colors';
import DocumentExplorerReal from '@/components/DocumentExplorerReal';

// Configuration icon component with Material-UI icons
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
  const moduleColor = getModuleColor('sistema');

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
            className="w-16 h-16 drop-shadow-lg"
            style={{
              color: moduleColor.primary,
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

// Componente principal do desktop do sistema
function SistemaDesktopContent() {
  const createWindow = useCreateWindow();
  // Path específico do módulo sistema
  const rootPath = 'C:\\Users\\Beto\\OneDrive - NXT Indústria e Comércio Ltda\\dev\\plataforma.app\\sistema';

  const handleOpenTemplate = () => {
    createWindow(
      'Template de Janelas - Design System',
      <WindowTemplate />,
      {
        size: { width: 1000, height: 700 },
        position: { x: 150, y: 50 }
      }
    );
  };



  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons Grid */}
      <div className="absolute top-32 left-12">
        <div className="grid grid-cols-6 gap-6">
          {/* Template de Janelas Icon */}
          <ModuleIcon
            module={{
              id: "template-janelas",
              name: "TEMPLATE DE JANELAS",
              icon: LayoutIcon,
              color: getModuleColor('sistema').gradient,
            }}
            onClick={handleOpenTemplate}
          />
          
          
        </div>
      </div>
    </div>
  );
}

/**
 * SISTEMA - Módulo Principal
 * 
 * Módulo completo para configurações e administração do sistema
 * com desktop próprio e sistema de janelas independente
 */
export default function SistemaModule() {
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={true}
        backgroundColor="#1f2937"
        disableContextMenu={false}
      >
        <SistemaDesktopContent />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}