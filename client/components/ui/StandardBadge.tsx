/**
 * StandardBadge - Badge padronizado para tema escuro
 * Resolve problema de tags sem fundo branco em AdminCards
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface StandardBadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'role' | 'permission' | 'module' | 'default';
  type?: 'active' | 'pending' | 'suspended' | 'rejected' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const getStatusColors = (type: string) => {
  const statusColors = {
    active: 'bg-green-400/20 text-green-300 border-green-400/30',
    pending: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    suspended: 'bg-orange-400/20 text-orange-300 border-orange-400/30',
    rejected: 'bg-red-400/20 text-red-300 border-red-400/30',
    success: 'bg-green-400/20 text-green-300 border-green-400/30',
    warning: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
    error: 'bg-red-400/20 text-red-300 border-red-400/30',
    info: 'bg-blue-400/20 text-blue-300 border-blue-400/30',
  };
  
  return statusColors[type as keyof typeof statusColors] || statusColors.info;
};

const getVariantColors = (variant: StandardBadgeProps['variant']) => {
  switch (variant) {
    case 'status':
      return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    case 'role':
      return 'bg-blue-400/20 text-blue-300 border-blue-400/30';
    case 'permission':
      return 'bg-purple-400/20 text-purple-300 border-purple-400/30';
    case 'module':
      return 'bg-indigo-400/20 text-indigo-300 border-indigo-400/30';
    default:
      return 'bg-white/20 text-white border-white/30';
  }
};

export function StandardBadge({ 
  children, 
  variant = 'default', 
  type, 
  className 
}: StandardBadgeProps) {
  const baseClasses = [
    'inline-flex items-center rounded-full border px-2.5 py-0.5',
    'text-xs font-semibold transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2'
  ];

  const variantClasses = type ? getStatusColors(type) : getVariantColors(variant);

  return (
    <span className={cn(baseClasses, variantClasses, className)}>
      {children}
    </span>
  );
}

// Badge especializado para status com ícone
interface StatusBadgeProps extends Omit<StandardBadgeProps, 'variant'> {
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

export function StatusBadge({ status, icon: Icon, children, className }: StatusBadgeProps) {
  return (
    <StandardBadge variant="status" type={status} className={className}>
      <div className="flex items-center gap-1">
        {Icon && <Icon size={12} />}
        {children || status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    </StandardBadge>
  );
}

// Badge para roles
interface RoleBadgeProps extends Omit<StandardBadgeProps, 'variant'> {
  role: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <StandardBadge variant="role" className={className}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </StandardBadge>
  );
}

// Badge para permissões
interface PermissionBadgeProps extends Omit<StandardBadgeProps, 'variant'> {
  permission: string;
}

export function PermissionBadge({ permission, className }: PermissionBadgeProps) {
  return (
    <StandardBadge variant="permission" className={className}>
      {permission}
    </StandardBadge>
  );
}

// Badge para módulos
interface ModuleBadgeProps extends Omit<StandardBadgeProps, 'variant'> {
  module: string;
}

export function ModuleBadge({ module, className }: ModuleBadgeProps) {
  return (
    <StandardBadge variant="module" className={className}>
      {module}
    </StandardBadge>
  );
}

export default StandardBadge;