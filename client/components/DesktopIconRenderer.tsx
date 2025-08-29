// ====================================================================
// DESKTOP ICON RENDERER - Sistema Automático de Renderização
// ====================================================================
// Renderiza ícones automaticamente baseado no desktop-registry.
// Aplica permissions, carrega components, executa ações automaticamente.
// ZERO configuração manual necessária.
// ====================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextMenu, useContextMenu, getStandardModuleContextOptions } from '@/components/ui';
import { getModuleColor } from '@/lib/module-colors';

// Registries
import { 
  DESKTOP_ICONS, 
  getVisibleIcons, 
  sortIconsByGrid, 
  type DesktopIcon 
} from '@/lib/desktop-registry';
import { 
  getComponent, 
  getIcon, 
  ComponentNotFound, 
  IconNotFound 
} from '@/lib/component-registry';

// Types
interface DesktopIconRendererProps {
  user: any;
  createWindow: (config: any) => void;
  className?: string;
}

interface DesktopIconItemProps {
  icon: DesktopIcon;
  user: any;
  createWindow: (config: any) => void;
  navigate: (path: string) => void;
  onClick: (icon: DesktopIcon) => void;
}

// ====================================================================
// COMPONENTE DE ÍCONE INDIVIDUAL 
// ====================================================================

const DesktopIconItem: React.FC<DesktopIconItemProps> = ({
  icon,
  user,
  createWindow,
  navigate,
  onClick
}) => {
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const IconComponent = getIcon(icon.icon);
  const moduleColor = getModuleColor(icon.id);

  // Context menu options
  const contextOptions = getStandardModuleContextOptions(
    icon.name,
    () => onClick(icon),
    () => {
      const info = [
        `Nome: ${icon.name}`,
        `ID: ${icon.id}`,
        `Tipo: ${icon.action.type}`,
        `Categoria: ${icon.category || 'N/A'}`,
        `Descrição: ${icon.description || 'N/A'}`,
      ];
      alert(`Propriedades do Ícone:\n\n${info.join("\n")}`);
    },
    () => window.location.reload()
  );

  return (
    <>
      <div
        onClick={() => onClick(icon)}
        onContextMenu={showContextMenu}
        className="group relative transition-all duration-300 cursor-pointer hover:scale-105"
        title={icon.description}
      >
        {/* Ícone */}
        <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-all duration-300 drop-shadow-2xl hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.4)]">
          {IconComponent ? (
            <IconComponent
              size={64}
              color={icon.color || moduleColor.primary}
              style={{
                filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
              }}
            />
          ) : (
            <IconNotFound iconName={icon.icon} size={64} />
          )}
        </div>
        
        {/* Nome */}
        <div className="w-44 text-center mx-auto">
          <span className="font-semibold text-xs leading-tight drop-shadow-lg block text-white">
            {icon.name}
          </span>
        </div>
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        show={contextMenu.show}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={hideContextMenu}
        options={contextOptions}
      />
    </>
  );
};

// ====================================================================
// RENDERER PRINCIPAL
// ====================================================================

const DesktopIconRenderer: React.FC<DesktopIconRendererProps> = ({
  user,
  createWindow,
  className = "grid grid-cols-4 gap-6"
}) => {
  const navigate = useNavigate();

  // Obter ícones visíveis baseado nas permissões do usuário
  const visibleIcons = getVisibleIcons(user);
  const sortedIcons = sortIconsByGrid(visibleIcons);

  // Debug logging
  console.log('🖥️ Desktop Icons:', {
    totalIcons: DESKTOP_ICONS.length,
    visibleIcons: visibleIcons.length,
    userRole: user?.role,
    userRoles: user?.roles,
    icons: sortedIcons.map(i => ({ id: i.id, name: i.name, requiredRole: i.requiredRole }))
  });

  // Handler para clique no ícone
  const handleIconClick = (icon: DesktopIcon) => {
    console.log('🖱️ Desktop Icon Clicked:', icon.id, icon.action);

    switch (icon.action.type) {
      case 'navigate':
        if (icon.action.to) {
          navigate(icon.action.to);
        }
        break;

      case 'window':
        if (icon.action.component) {
          const Component = getComponent(icon.action.component);
          
          if (Component) {
            createWindow({
              title: icon.windowConfig?.title || icon.name,
              component: <Component />,
              position: icon.windowConfig?.position || { x: 100, y: 100 },
              size: icon.windowConfig?.size || { width: 800, height: 600 },
              icon: icon.icon,
              canResize: icon.windowConfig?.canResize ?? true,
              canMove: icon.windowConfig?.canMove ?? true,
              canMinimize: icon.windowConfig?.canMinimize ?? true,
              canMaximize: icon.windowConfig?.canMaximize ?? false,
              isMinimized: false,
              isMaximized: false,
              isModal: icon.windowConfig?.isModal ?? false,
            });
          } else {
            createWindow({
              title: `Erro - ${icon.name}`,
              component: <ComponentNotFound componentName={icon.action.component} />,
              position: { x: 200, y: 200 },
              size: { width: 500, height: 300 },
              icon: "AlertTriangle",
              canResize: false,
              canMove: true,
            });
          }
        }
        break;

      case 'external':
        if (icon.action.url) {
          window.open(icon.action.url, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'function':
        if (icon.action.handler) {
          icon.action.handler(user, createWindow, navigate);
        }
        break;

      default:
        console.warn('🚨 Unknown action type:', icon.action.type);
    }
  };

  // Se não há ícones visíveis
  if (sortedIcons.length === 0) {
    return (
      <div className="text-white/70 text-center py-8">
        <div className="text-lg mb-2">Nenhum ícone disponível</div>
        <div className="text-sm">
          Verifique suas permissões ou entre em contato com o administrador.
        </div>
      </div>
    );
  }

  // Render dos ícones
  return (
    <div className={className}>
      {sortedIcons.map((icon) => (
        <DesktopIconItem
          key={icon.id}
          icon={icon}
          user={user}
          createWindow={createWindow}
          navigate={navigate}
          onClick={handleIconClick}
        />
      ))}
    </div>
  );
};

export default DesktopIconRenderer;

// ====================================================================
// 🎯 VANTAGENS DESTE SISTEMA:
// ====================================================================
// ✅ Renderização automática baseada em registry
// ✅ Permissions aplicadas automaticamente  
// ✅ Components carregados dinamicamente
// ✅ Error handling com fallbacks visuais
// ✅ Context menus automáticos
// ✅ Grid positioning automático
// ✅ Debug logging integrado
// ✅ Extensível e maintível
// ✅ Zero código duplicado
// ====================================================================
//
// 🚀 PARA USAR:
// <DesktopIconRenderer 
//   user={user} 
//   createWindow={createWindow} 
// />
// ====================================================================