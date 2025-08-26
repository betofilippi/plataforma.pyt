import React, { forwardRef } from 'react';

interface WindowToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'danger';
  className?: string;
  id?: string;
}

// Size configurations
const sizeClasses = {
  sm: {
    container: 'w-10 h-5',
    thumb: 'w-4 h-4',
    translateActive: 'translate-x-5',
    translateInactive: 'translate-x-0.5',
  },
  md: {
    container: 'w-12 h-6',
    thumb: 'w-5 h-5',
    translateActive: 'translate-x-6',
    translateInactive: 'translate-x-1',
  },
  lg: {
    container: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translateActive: 'translate-x-7',
    translateInactive: 'translate-x-1',
  },
};

// Variant colors
const variantColors = {
  default: {
    active: 'bg-purple-600',
    inactive: 'bg-gray-600',
  },
  success: {
    active: 'bg-green-600',
    inactive: 'bg-gray-600',
  },
  danger: {
    active: 'bg-red-600',
    inactive: 'bg-gray-600',
  },
};

/**
 * WindowToggle - Toggle switch padronizado para uso em janelas
 * Segue o Design System do plataforma.app
 */
export const WindowToggle = forwardRef<HTMLInputElement, WindowToggleProps>(({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  variant = 'default',
  className = '',
  id,
}, ref) => {
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;
  const sizeConfig = sizeClasses[size];
  const colorConfig = variantColors[variant];

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      <div className="flex items-center">
        <input
          ref={ref}
          id={toggleId}
          type="checkbox"
          checked={checked}
          onChange={handleToggle}
          disabled={disabled}
          className="sr-only"
        />
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? `${toggleId}-label` : undefined}
          disabled={disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className={`
            ${sizeConfig.container}
            rounded-full transition-colors duration-200 cursor-pointer
            ${checked ? colorConfig.active : colorConfig.inactive}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
            relative
          `}
        >
          <span
            className={`
              ${sizeConfig.thumb}
              bg-white rounded-full transition-transform duration-200
              absolute top-0.5
              ${checked ? sizeConfig.translateActive : sizeConfig.translateInactive}
            `}
          />
        </button>
      </div>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              id={`${toggleId}-label`}
              htmlFor={toggleId}
              className={`
                text-white text-sm font-medium
                ${disabled ? 'opacity-50' : 'cursor-pointer'}
              `}
              onClick={handleToggle}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

WindowToggle.displayName = 'WindowToggle';

// Group component for multiple toggles
interface WindowToggleGroupProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  orientation?: 'vertical' | 'horizontal';
}

export function WindowToggleGroup({
  children,
  className = '',
  title,
  orientation = 'vertical',
}: WindowToggleGroupProps) {
  const orientationClasses = orientation === 'vertical' 
    ? 'space-y-4' 
    : 'flex flex-wrap gap-6';

  return (
    <div className={className}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">
          {title}
        </h3>
      )}
      <div className={orientationClasses}>
        {children}
      </div>
    </div>
  );
}

// Specialized toggle variants
export const WindowToggleSuccess = (props: Omit<WindowToggleProps, 'variant'>) =>
  <WindowToggle {...props} variant="success" />;

export const WindowToggleDanger = (props: Omit<WindowToggleProps, 'variant'>) =>
  <WindowToggle {...props} variant="danger" />;

export default WindowToggle;