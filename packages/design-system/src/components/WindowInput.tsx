import React, { forwardRef } from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';

// Base input styles
const inputBaseClasses = `
  w-full px-4 py-2 
  bg-white/10 border border-white/20 rounded-lg 
  text-white placeholder-gray-400 
  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent 
  transition-all duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

const textareaBaseClasses = `
  w-full px-4 py-3 
  bg-white/10 border border-white/20 rounded-lg 
  text-white placeholder-gray-400 
  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent 
  transition-all duration-200 resize-none
  disabled:opacity-50 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

const selectBaseClasses = `
  w-full px-4 py-2 
  bg-white/10 border border-white/20 rounded-lg 
  text-white focus:outline-none focus:ring-2 focus:ring-purple-500
  disabled:opacity-50 disabled:cursor-not-allowed
`.replace(/\s+/g, ' ').trim();

// Text styles
const textClasses = {
  label: 'text-white font-medium text-sm',
  description: 'text-xs text-gray-400',
  error: 'text-red-300 text-sm',
  success: 'text-green-300 text-sm',
};

interface WindowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  glassmorphism?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

interface WindowTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  glassmorphism?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

interface WindowSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
  glassmorphism?: boolean;
  variant?: 'default' | 'filled' | 'outlined';
}

// Get variant-specific classes
function getVariantClasses(
  variant: 'default' | 'filled' | 'outlined' = 'default', 
  glassmorphism = false,
  error = false,
  success = false
): string {
  let classes = '';
  
  switch (variant) {
    case 'filled':
      classes = 'bg-white/20 border-0';
      break;
    case 'outlined':
      classes = 'bg-transparent border-2 border-white/30';
      break;
    default:
      classes = 'bg-white/10 border border-white/20';
  }
  
  // Add glassmorphism if enabled
  if (glassmorphism) {
    classes += ` ${createGlassmorphism('subtle')}`;
  }
  
  // Add error/success states
  if (error) {
    classes += ' border-red-400 focus:ring-red-500';
  } else if (success) {
    classes += ' border-green-400 focus:ring-green-500';
  }
  
  return classes;
}

/**
 * WindowInput - Input padronizado para uso em janelas
 * Segue o Design System do plataforma.app
 */
export const WindowInput = forwardRef<HTMLInputElement, WindowInputProps>(({ 
  label, 
  description, 
  error, 
  success, 
  icon,
  glassmorphism = false,
  variant = 'default',
  className = '', 
  id,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const variantClasses = getVariantClasses(variant, glassmorphism, !!error, !!success);
  const finalClasses = `${inputBaseClasses} ${variantClasses} ${icon ? 'pl-10' : ''} ${className}`.trim();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className={textClasses.label}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="w-5 h-5 text-gray-400">{icon}</span>
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={finalClasses}
          {...props}
        />
      </div>
      {description && (
        <p className={textClasses.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={textClasses.error}>
          {error}
        </p>
      )}
      {success && (
        <p className={textClasses.success}>
          {success}
        </p>
      )}
    </div>
  );
});

WindowInput.displayName = 'WindowInput';

/**
 * WindowTextarea - Textarea padronizado para uso em janelas
 */
export const WindowTextarea = forwardRef<HTMLTextAreaElement, WindowTextareaProps>(({ 
  label, 
  description, 
  error, 
  success,
  glassmorphism = false,
  variant = 'default',
  className = '', 
  id,
  rows = 4,
  ...props 
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const variantClasses = getVariantClasses(variant, glassmorphism, !!error, !!success);
  const finalClasses = `${textareaBaseClasses} ${variantClasses} ${className}`.trim();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={textareaId} className={textClasses.label}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={finalClasses}
        {...props}
      />
      {description && (
        <p className={textClasses.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={textClasses.error}>
          {error}
        </p>
      )}
      {success && (
        <p className={textClasses.success}>
          {success}
        </p>
      )}
    </div>
  );
});

WindowTextarea.displayName = 'WindowTextarea';

/**
 * WindowSelect - Select padronizado para uso em janelas
 */
export const WindowSelect = forwardRef<HTMLSelectElement, WindowSelectProps>(({ 
  label, 
  description, 
  error, 
  success,
  children,
  glassmorphism = false,
  variant = 'default',
  className = '', 
  id,
  ...props 
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const variantClasses = getVariantClasses(variant, glassmorphism, !!error, !!success);
  const finalClasses = `${selectBaseClasses} ${variantClasses} ${className}`.trim();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className={textClasses.label}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={finalClasses}
        {...props}
      >
        {children}
      </select>
      {description && (
        <p className={textClasses.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={textClasses.error}>
          {error}
        </p>
      )}
      {success && (
        <p className={textClasses.success}>
          {success}
        </p>
      )}
    </div>
  );
});

WindowSelect.displayName = 'WindowSelect';

// Form field group component
interface WindowFieldGroupProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'vertical' | 'horizontal' | 'grid';
  columns?: 1 | 2 | 3 | 4;
}

export function WindowFieldGroup({ 
  children, 
  className = '',
  layout = 'vertical',
  columns = 2
}: WindowFieldGroupProps) {
  let layoutClasses = '';
  
  switch (layout) {
    case 'horizontal':
      layoutClasses = 'flex space-x-4';
      break;
    case 'grid':
      layoutClasses = `grid grid-cols-${columns} gap-4`;
      break;
    default:
      layoutClasses = 'space-y-4';
  }
  
  return (
    <div className={`${layoutClasses} ${className}`}>
      {children}
    </div>
  );
}

export default WindowInput;