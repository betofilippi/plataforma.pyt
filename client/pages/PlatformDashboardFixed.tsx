import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings as SistemaIcon,
  Table as TableIcon,
} from "lucide-react";
import {
  WindowManagerProvider,
  WindowDesktop,
  useCreateWindow,
} from "@/components/windows";
import { ContextMenu, useContextMenu, getStandardModuleContextOptions } from '@/components/ui';
import { FileExplorer } from './windows/FileExplorer';
import { getModuleColor } from '@/lib/module-colors';
import DocumentExplorerReal from '@/components/DocumentExplorerReal';

// Types for active modules
interface ModuleItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  href: string;
  position: { x: number; y: number };
}

// Module icon component with standardized context menu only
function ModuleIcon({
  module,
  onClick,
}: {
  module: ModuleItem;
  onClick: (module: ModuleItem) => void;
}) {
  const IconComponent = module.icon;
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const moduleColor = getModuleColor(module.id);

  const contextOptions = getStandardModuleContextOptions(
    module.name,
    () => onClick(module),
    () => {
      const info = [
        `Nome: ${module.name}`,
        `Posição: X:${module.position.x}, Y:${module.position.y}`,
        `ID: ${module.id}`,
      ];
      alert(`Propriedades do Módulo:\n\n${info.join("\n")}`);
    },
    () => window.location.reload()
  );

  return (
    <>
      <div
        onClick={() => onClick(module)}
        onContextMenu={showContextMenu}
        className="group relative transition-all duration-300 cursor-pointer hover:scale-105"
      >
        <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-all duration-300 drop-shadow-2xl hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.4)]">
          <IconComponent
            size={64}
            color={moduleColor.primary}
            style={{
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
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

function PlatformDashboardContent() {
  const navigate = useNavigate();
  const createWindow = useCreateWindow();
  const rootPath = 'C:\\Users\\Beto\\OneDrive - NXT Indústria e Comércio Ltda\\dev\\plataforma.app';

  // Apenas módulos essenciais
  const essentialModules: ModuleItem[] = [
    {
      id: "sistema",
      name: "SISTEMA", 
      icon: SistemaIcon,
      color: getModuleColor('sistema').gradient,
      href: "/sistema",
      position: { x: 250, y: 150 },
    },
  ];

  const handleModuleClick = (module: ModuleItem) => {
    if (module.href !== "#") {
      navigate(module.href);
    }
  };

  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons Grid - Apenas módulos essenciais */}
      <div className="absolute top-32 left-12">
        <div className="grid grid-cols-4 gap-6">
          {/* Módulos principais */}
          {essentialModules.map((module) => (
            <ModuleIcon
              key={module.id}
              module={{...module, position: { x: 0, y: 0 }}}
              onClick={handleModuleClick}
            />
          ))}
        </div>
        
      </div>
    </div>
  );
}

export default function PlatformDashboardFixed() {
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={true}
        backgroundColor="#1f2937"
        disableContextMenu={false}
      >
        <PlatformDashboardContent />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}