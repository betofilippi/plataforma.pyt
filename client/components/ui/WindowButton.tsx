import React from 'react';
import { createButton } from '@/lib/design-system';

interface WindowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Botão padronizado para uso em janelas
 * Segue o Design System do plataforma.app
 */
export function WindowButton({ 
  variant = 'primary',
  size = 'md',
  icon, 
  children, 
  fullWidth = false,
  className = "", 
  ...props 
}: WindowButtonProps) {
  // Mapear 'destructive' para 'danger' já que o design system usa 'danger'
  let mappedVariant = variant || 'primary';
  if (mappedVariant === 'destructive') {
    mappedVariant = 'danger';
  }
  
  // Garantir que variant seja um valor válido
  const safeVariant = mappedVariant as 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  const safeClassName = className || '';
  
  const baseClasses = createButton(safeVariant, safeClassName);
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Classes de tamanho
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-6 py-3 text-base min-h-[48px]'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Se só tem ícone, usar layout diferente
  const hasTextAndIcon = icon && children;
  const iconOnly = icon && !children;
  
  const finalClasses = `${baseClasses} ${widthClass} ${sizeClass} rounded-lg font-medium flex items-center justify-center ${hasTextAndIcon ? 'space-x-2' : ''}`.trim();

  return (
    <button 
      className={finalClasses}
      {...props}
    >
      {icon && (
        <span className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${iconOnly ? '' : ''}`} style={{fontSize: '16px'}}>
          {icon}
        </span>
      )}
      {children && <span className="whitespace-nowrap text-sm font-medium">{children}</span>}
    </button>
  );
}

export default WindowButton;