/**
 * StandardCard - Card padronizado que segue o design system
 * Usa cores contextuais baseadas no módulo/função
 */

import React, { ReactNode } from 'react';
import { getCardStyles, type UIContext, type CardConfig } from '@/lib/ui-standards';
import { designSystem } from '@/lib/design-system';

interface StandardCardProps {
  children: ReactNode;
  context: UIContext;
  variant?: 'default' | 'highlighted' | 'muted';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

export function StandardCard({
  children,
  context,
  variant = 'default',
  padding = 'md',
  className = '',
  title,
  subtitle,
  onClick
}: StandardCardProps) {
  const cardStyles = getCardStyles({ context, variant, padding });
  
  return (
    <div
      className={`
        ${cardStyles}
        ${onClick ? 'cursor-pointer hover:scale-[1.01] transition-transform duration-200' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="mb-4 border-b border-white/10 pb-3">
          {title && (
            <h3 className={designSystem.text.title}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p className={designSystem.text.description}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <div className={designSystem.spacing.cardContent}>
        {children}
      </div>
    </div>
  );
}

// Variações especializadas para diferentes contextos

export function SystemCard(props: Omit<StandardCardProps, 'context'>) {
  return <StandardCard {...props} context={{ module: 'sistema' }} />;
}

export function AdminCard(props: Omit<StandardCardProps, 'context'>) {
  return <StandardCard {...props} context={{ module: 'sistema', function: 'admin' }} />;
}

export function PlatformCard(props: Omit<StandardCardProps, 'context'>) {
  return <StandardCard {...props} context={{ module: 'plataforma' }} />;
}

// Card especializado para configurações
interface SettingsCardProps extends Omit<StandardCardProps, 'context'> {
  settingKey: string;
  settingName: string;
  description?: string;
}

export function SettingsCard({ 
  settingKey, 
  settingName, 
  description, 
  children, 
  ...props 
}: SettingsCardProps) {
  return (
    <SystemCard
      {...props}
      title={settingName}
      subtitle={description}
      variant="highlighted"
    >
      {children}
    </SystemCard>
  );
}

// Card para informações administrativas
interface InfoCardProps extends Omit<StandardCardProps, 'context'> {
  type: 'info' | 'warning' | 'success' | 'error';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export function InfoCard({ type, icon: Icon, children, ...props }: InfoCardProps) {
  const getContextForType = (type: InfoCardProps['type']): UIContext => {
    switch (type) {
      case 'warning':
        return { module: 'sistema', function: 'admin' };
      case 'success':
        return { module: 'plataforma' };
      case 'error':
        return { module: 'admin' };
      default:
        return { module: 'sistema' };
    }
  };

  return (
    <StandardCard
      {...props}
      context={getContextForType(type)}
      variant={type === 'info' ? 'default' : 'highlighted'}
    >
      {Icon && (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <Icon size={20} className="text-white/80" />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
      )}
      {!Icon && children}
    </StandardCard>
  );
}

export default StandardCard;