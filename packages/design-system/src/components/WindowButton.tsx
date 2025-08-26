import React from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';

interface WindowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  glassmorphism?: boolean;
}

// Button variant styles
const buttonVariants = {
  primary: {
    solid: 'bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white shadow-lg',
    outline: 'border-2 border-purple-700 text-purple-300 hover:bg-purple-700 hover:text-white',
    ghost: 'text-purple-300 hover:bg-purple-700/20',
  },
  secondary: {
    solid: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg',
    outline: 'border-2 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white',
    ghost: 'text-gray-300 hover:bg-gray-600/20',
  },
  success: {
    solid: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg',
    outline: 'border-2 border-green-600 text-green-300 hover:bg-green-600 hover:text-white',
    ghost: 'text-green-300 hover:bg-green-600/20',
  },
  danger: {
    solid: 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white shadow-lg',
    outline: 'border-2 border-red-700 text-red-300 hover:bg-red-700 hover:text-white',
    ghost: 'text-red-300 hover:bg-red-700/20',
  },
  warning: {
    solid: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white shadow-lg',
    outline: 'border-2 border-yellow-600 text-yellow-300 hover:bg-yellow-600 hover:text-white',
    ghost: 'text-yellow-300 hover:bg-yellow-600/20',
  },
};

// Size configurations
const sizeClasses = {
  sm: {
    padding: 'px-3 py-1.5',
    text: 'text-xs',
    minHeight: 'min-h-[32px]',
    iconSize: 'w-3 h-3',
  },
  md: {
    padding: 'px-4 py-2',
    text: 'text-sm',
    minHeight: 'min-h-[40px]',
    iconSize: 'w-4 h-4',
  },
  lg: {
    padding: 'px-6 py-3',
    text: 'text-base',
    minHeight: 'min-h-[48px]',
    iconSize: 'w-5 h-5',
  },
  xl: {
    padding: 'px-8 py-4',
    text: 'text-lg',
    minHeight: 'min-h-[56px]',
    iconSize: 'w-6 h-6',
  },
};

/**
 * WindowButton - Botão padronizado para uso em janelas
 * Segue o Design System do plataforma.app com suporte a glassmorphism
 */
export function WindowButton({ 
  variant = 'primary',
  size = 'md',
  icon, 
  children, 
  fullWidth = false,
  loading = false,
  glassmorphism = false,
  className = '', 
  disabled,
  ...props 
}: WindowButtonProps) {
  // Map destructive to danger for backwards compatibility
  const mappedVariant = variant === 'destructive' ? 'danger' : variant;
  
  // Get style configuration
  const sizeConfig = sizeClasses[size];
  
  // Determine button style type
  let styleType: 'solid' | 'outline' | 'ghost' = 'solid';
  if (variant === 'outline') styleType = 'outline';
  if (variant === 'ghost') styleType = 'ghost';
  
  // Get variant styles
  const variantKey = mappedVariant === 'outline' || mappedVariant === 'ghost' 
    ? 'primary' 
    : mappedVariant as keyof typeof buttonVariants;
  
  const variantStyles = buttonVariants[variantKey] || buttonVariants.primary;
  const variantClasses = variantStyles[styleType];
  
  // Build class names
  const baseClasses = [
    // Core button styles
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Size classes
    sizeConfig.padding,
    sizeConfig.text,
    sizeConfig.minHeight,
    
    // Width
    fullWidth ? 'w-full' : '',
    
    // Variant styles
    variantClasses,
    
    // Glassmorphism
    glassmorphism ? createGlassmorphism('subtle') : '',
    
    // Custom classes
    className,
  ].filter(Boolean).join(' ');

  // Handle icon and text layout
  const hasTextAndIcon = icon && children;
  const iconOnly = icon && !children;
  
  return (
    <button 
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <div className="mr-2">
          <div className={`${sizeConfig.iconSize} animate-spin rounded-full border-2 border-transparent border-t-current`} />
        </div>
      )}
      
      {/* Icon */}
      {icon && !loading && (
        <span className={`${sizeConfig.iconSize} flex items-center justify-center flex-shrink-0 ${hasTextAndIcon ? 'mr-2' : ''}`}>
          {icon}
        </span>
      )}
      
      {/* Text content */}
      {children && (
        <span className="whitespace-nowrap">
          {children}
        </span>
      )}
    </button>
  );
}

// Button Group component for related actions
interface WindowButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClasses = {
  sm: { horizontal: 'space-x-1', vertical: 'space-y-1' },
  md: { horizontal: 'space-x-2', vertical: 'space-y-2' },
  lg: { horizontal: 'space-x-4', vertical: 'space-y-4' },
};

export function WindowButtonGroup({ 
  children, 
  className = '', 
  orientation = 'horizontal',
  spacing = 'md' 
}: WindowButtonGroupProps) {
  const spacingClass = spacingClasses[spacing][orientation];
  const flexDirection = orientation === 'vertical' ? 'flex-col' : 'flex-row';
  
  return (
    <div className={`flex ${flexDirection} ${spacingClass} ${className}`}>
      {children}
    </div>
  );
}

// Specialized button variants
export const WindowButtonPrimary = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="primary" />;

export const WindowButtonSecondary = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="secondary" />;

export const WindowButtonSuccess = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="success" />;

export const WindowButtonDanger = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="danger" />;

export const WindowButtonWarning = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="warning" />;

export const WindowButtonGhost = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="ghost" />;

export const WindowButtonOutline = (props: Omit<WindowButtonProps, 'variant'>) => 
  <WindowButton {...props} variant="outline" />;

export default WindowButton;