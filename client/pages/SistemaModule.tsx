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
  WindowToggle,
  ModuleIcon,
  ContextMenu, 
  useContextMenu, 
  getStandardModuleContextOptions 
} from '@/components/ui';
import { LayoutDashboard as LayoutIcon, Users as UsersIcon, Palette as PaletteIcon } from "lucide-react";
import UserManagement from '@/components/UserManagement';
import DesignSystemShowcase from '@/components/DesignSystemShowcase';
import { useAuth } from '@/contexts/AuthContext';
import WindowTemplate from '@/components/windows/WindowTemplate';
import { TablesTemplate } from './windows/TablesTemplate';
import { FileExplorer } from './windows/FileExplorer';
import { UI_CONTEXTS } from '@/lib/ui-standards';
import DocumentExplorerReal from '@/components/DocumentExplorerReal';

// Agora usando o ModuleIcon padronizado do design system

// Componente principal do desktop do sistema
function SistemaDesktopContent() {
  const createWindow = useCreateWindow();
  const { createWindowWithType } = useWindowManager();
  const { user } = useAuth();
  // Path específico do módulo sistema
  const rootPath = 'C:\\Users\\Beto\\OneDrive - NXT Indústria e Comércio Ltda\\dev\\plataforma.app\\sistema';

  // Verificar se usuário é admin
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');

  const handleOpenTemplate = () => {
    createWindowWithType(
      'Template de Janelas - Design System',
      <WindowTemplate />,
      'WindowTemplate',
      {
        size: { width: 1000, height: 700 },
        position: { x: 150, y: 50 },
        icon: 'LayoutDashboard'
      }
    );
  };

  const handleOpenUserManagement = () => {
    createWindowWithType(
      'Gerenciamento de Usuários',
      <UserManagement />,
      'UserManagement',
      {
        size: { width: 1200, height: 800 },
        position: { x: 100, y: 100 },
        icon: 'Users'
      }
    );
  };

  const handleOpenDesignSystem = () => {
    createWindowWithType(
      'Design System Showcase',
      <DesignSystemShowcase />,
      'DesignSystemShowcase',
      {
        size: { width: 1400, height: 900 },
        position: { x: 50, y: 50 },
        icon: 'Palette'
      }
    );
  };



  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons Grid */}
      <div className="absolute top-32 left-12">
        <div className="grid grid-cols-6 gap-6">
          {/* Template de Janelas Icon - Contexto sistema */}
          <ModuleIcon
            module={{
              id: "template-janelas",
              name: "TEMPLATE DE JANELAS",
              icon: LayoutIcon,
              contextModule: "sistema", // Define o contexto do módulo
            }}
            onClick={handleOpenTemplate}
          />

          {/* Design System Showcase Icon - Contexto sistema */}
          <ModuleIcon
            module={{
              id: "design-system",
              name: "DESIGN SYSTEM",
              icon: PaletteIcon,
              contextModule: "sistema",    // Background será do contexto sistema
            }}
            onClick={handleOpenDesignSystem}
          />
          
          {/* Users Management Icon - Só visível para admin - Contexto admin em sistema */}
          {isAdmin && (
            <ModuleIcon
              module={{
                id: "users",
                name: "USUÁRIOS",
                icon: UsersIcon,
                contextModule: "sistema",    // Background será do contexto sistema
                contextFunction: "admin",    // Foreground será da função admin
              }}
              onClick={handleOpenUserManagement}
            />
          )}
          
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