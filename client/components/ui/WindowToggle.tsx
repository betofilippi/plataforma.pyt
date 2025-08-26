import React from 'react';
import { designSystem } from '@/lib/design-system';

interface WindowToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

/**
 * Toggle Switch padronizado para uso em janelas
 * Segue o Design System do plataforma.app
 */
export function WindowToggle({ 
  checked, 
  onChange, 
  disabled = false, 
  label, 
  description 
}: WindowToggleProps) {
  const toggleClasses = `
    ${designSystem.toggle.container} 
    ${checked ? designSystem.toggle.active : designSystem.toggle.inactive}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `.trim();

  const thumbClasses = `
    ${designSystem.toggle.thumb}
    ${checked ? designSystem.toggle.thumbActive : designSystem.toggle.thumbInactive}
  `.trim();

  const ToggleComponent = () => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={toggleClasses}
      role="switch"
      aria-checked={checked}
    >
      <div className={thumbClasses} />
    </button>
  );

  // Se não tem label, retorna apenas o toggle
  if (!label) {
    return <ToggleComponent />;
  }

  // Com label, retorna o layout completo
  return (
    <div className="flex items-center justify-between">
      <div>
        <label className={designSystem.text.label}>
          {label}
        </label>
        {description && (
          <p className={designSystem.text.description}>
            {description}
          </p>
        )}
      </div>
      <ToggleComponent />
    </div>
  );
}

export default WindowToggle;