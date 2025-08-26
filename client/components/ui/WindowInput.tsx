import React from 'react';
import { createInput, designSystem } from '@/lib/design-system';

interface WindowInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
}

interface WindowTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
}

interface WindowSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}

/**
 * Input padronizado para uso em janelas
 */
export function WindowInput({ 
  label, 
  description, 
  error, 
  success, 
  icon,
  className = "", 
  ...props 
}: WindowInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className={designSystem.text.label}>
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
          className={createInput(`${icon ? 'pl-10' : ''} ${className}`)}
          {...props}
        />
      </div>
      {description && (
        <p className={designSystem.text.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={designSystem.text.error}>
          {error}
        </p>
      )}
      {success && (
        <p className={designSystem.text.success}>
          {success}
        </p>
      )}
    </div>
  );
}

/**
 * Textarea padronizado para uso em janelas
 */
export function WindowTextarea({ 
  label, 
  description, 
  error, 
  className = "", 
  ...props 
}: WindowTextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className={designSystem.text.label}>
          {label}
        </label>
      )}
      <textarea
        className={`${designSystem.inputs.textarea} ${className}`}
        {...props}
      />
      {description && (
        <p className={designSystem.text.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={designSystem.text.error}>
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Select padronizado para uso em janelas
 */
export function WindowSelect({ 
  label, 
  description, 
  error, 
  children,
  className = "", 
  ...props 
}: WindowSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className={designSystem.text.label}>
          {label}
        </label>
      )}
      <select
        className={`${designSystem.inputs.select} ${className}`}
        {...props}
      >
        {children}
      </select>
      {description && (
        <p className={designSystem.text.description}>
          {description}
        </p>
      )}
      {error && (
        <p className={designSystem.text.error}>
          {error}
        </p>
      )}
    </div>
  );
}