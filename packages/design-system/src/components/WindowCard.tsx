import React from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';
import type { GlassmorphismConfig } from '@plataforma/types';

interface WindowCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'standard' | 'subtle' | 'strong' | 'window' | 'sidebar' | 'header';
  customGlassmorphism?: GlassmorphismConfig;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

/**
 * WindowCard - Cartão padronizado para conteúdo dentro das janelas
 * Segue o Design System do plataforma.app com glassmorphism
 */
export function WindowCard({ 
  title, 
  children, 
  className = '', 
  variant = 'standard',
  customGlassmorphism,
  headerActions,
  footer,
  padding = 'lg'
}: WindowCardProps) {
  // Generate glassmorphism classes
  const glassClasses = customGlassmorphism 
    ? `backdrop-blur-[${customGlassmorphism.blur}px] bg-white/[${customGlassmorphism.opacity}] border border-white/[${customGlassmorphism.borderOpacity}]`
    : createGlassmorphism(variant);

  // Combine all classes
  const cardClasses = `
    ${glassClasses}
    rounded-xl
    ${paddingClasses[padding]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClasses}>
      {/* Header with title and optional actions */}
      {(title || headerActions) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-white">
              {title}
            </h3>
          )}
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Optional footer */}
      {footer && (
        <div className="mt-6 pt-4 border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}

// Specialized card variants
export function WindowCardHeader({ children, className = '', ...props }: Omit<WindowCardProps, 'variant'>) {
  return (
    <WindowCard 
      {...props} 
      variant="header" 
      className={`bg-white/5 ${className}`}
      padding="md"
    >
      {children}
    </WindowCard>
  );
}

export function WindowCardSidebar({ children, className = '', ...props }: Omit<WindowCardProps, 'variant'>) {
  return (
    <WindowCard 
      {...props} 
      variant="sidebar" 
      className={`h-full ${className}`}
      padding="md"
    >
      {children}
    </WindowCard>
  );
}

export function WindowCardModal({ children, className = '', ...props }: Omit<WindowCardProps, 'variant'>) {
  return (
    <WindowCard 
      {...props} 
      variant="strong" 
      className={`max-w-md mx-auto ${className}`}
      padding="xl"
    >
      {children}
    </WindowCard>
  );
}

export default WindowCard;