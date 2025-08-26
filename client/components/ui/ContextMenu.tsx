/**
 * Context Menu padronizado para ícones de módulos
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Info, 
  Settings, 
  Trash2, 
  Copy, 
  RefreshCw,
  ExternalLink 
} from 'lucide-react';

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  onClose: () => void;
  options: {
    label: string;
    icon?: React.ComponentType<any>;
    action: () => void;
    type?: 'normal' | 'danger' | 'primary';
    separator?: boolean;
  }[];
}

export function ContextMenu({ show, x, y, onClose, options }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('contextmenu', (e) => e.preventDefault());
    };
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800/95 backdrop-blur-md border border-gray-600 rounded-lg shadow-xl min-w-48"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className="py-2">
        {options.map((option, index) => (
          <React.Fragment key={index}>
            {option.separator && (
              <div className="border-t border-gray-600 my-1" />
            )}
            <button
              onClick={() => {
                option.action();
                onClose();
              }}
              className={`
                w-full px-4 py-2 text-sm text-left flex items-center space-x-3
                transition-colors duration-150
                ${option.type === 'danger' 
                  ? 'text-red-300 hover:bg-red-900/30 hover:text-red-200' 
                  : option.type === 'primary'
                  ? 'text-blue-300 hover:bg-blue-900/30 hover:text-blue-200'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }
              `}
            >
              {option.icon && (
                <option.icon className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{option.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Hook para usar context menu facilmente
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
  }>({
    show: false,
    x: 0,
    y: 0,
  });

  const showContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const hideContextMenu = () => {
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
}

// Opções padrão para ícones de módulos
export const getStandardModuleContextOptions = (
  label: string,
  onOpen: () => void,
  onInfo?: () => void,
  onRefresh?: () => void
) => [
  {
    label: `Abrir ${label}`,
    icon: Play,
    action: onOpen,
    type: 'primary' as const,
  },
  {
    label: 'Abrir em Nova Aba',
    icon: ExternalLink,
    action: () => window.open(window.location.href, '_blank'),
  },
  {
    label: 'Atualizar',
    icon: RefreshCw,
    action: onRefresh || (() => window.location.reload()),
    separator: true,
  },
  {
    label: 'Informações',
    icon: Info,
    action: onInfo || (() => console.log(`Informações sobre ${label}`)),
  },
  {
    label: 'Configurações',
    icon: Settings,
    action: () => console.log(`Configurações de ${label}`),
  },
];

export default ContextMenu;