/**
 * StandardIcon - Ícone padronizado que segue o design system
 * Resolve automaticamente cores baseado no contexto
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { resolveColors, type UIContext, type DesktopIconConfig, getDesktopIconStyles } from '@/lib/ui-standards';

interface StandardIconProps {
  Icon: LucideIcon;
  context: UIContext;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  onClick?: () => void;
  className?: string;
  state?: 'normal' | 'hover' | 'active' | 'disabled';
}

export function StandardIcon({ 
  Icon, 
  context, 
  size = 'lg', 
  label,
  onClick,
  className = '',
  state = 'normal'
}: StandardIconProps) {
  const config: DesktopIconConfig = { context, size, state };
  const styles = getDesktopIconStyles(config);
  const colors = resolveColors(context);

  const handleClick = () => {
    if (state !== 'disabled' && onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={`
        ${styles.containerClass}
        ${onClick && state !== 'disabled' ? 'cursor-pointer group' : ''}
        ${state === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <Icon 
          size={styles.iconSize} 
          className="drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
          style={{ color: colors.foreground }}
        />
        
        {label && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-full">
            <span className={styles.textClass}>
              {label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Variações especializadas para diferentes contextos

export function SystemIcon(props: Omit<StandardIconProps, 'context'>) {
  return <StandardIcon {...props} context={{ module: 'sistema' }} />;
}

export function AdminIcon(props: Omit<StandardIconProps, 'context'>) {
  return <StandardIcon {...props} context={{ module: 'sistema', function: 'admin' }} />;
}

export function PlatformIcon(props: Omit<StandardIconProps, 'context'>) {
  return <StandardIcon {...props} context={{ module: 'plataforma' }} />;
}

// Component especializado para ícones de módulo no desktop
interface ModuleIconProps {
  module: {
    id: string;
    name: string;
    icon: LucideIcon;
    contextModule?: string;  // Define o contexto (sistema, admin, etc.)
    contextFunction?: string; // Define a função específica
  };
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ModuleIcon({ module, onClick, size = 'lg' }: ModuleIconProps) {
  const context: UIContext = {
    module: module.contextModule || module.id,
    function: module.contextFunction
  };

  return (
    <StandardIcon
      Icon={module.icon}
      context={context}
      size={size}
      label={module.name}
      onClick={onClick}
    />
  );
}

export default StandardIcon;