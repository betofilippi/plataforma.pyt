import React, { useEffect, useState } from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface WindowToastProps {
  toast: Toast;
  onClose: (id: string) => void;
  position?: ToastPosition;
}

// Toast icons
const toastIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Toast colors
const toastColors = {
  success: 'text-green-300 border-green-400/30',
  error: 'text-red-300 border-red-400/30',
  warning: 'text-yellow-300 border-yellow-400/30',
  info: 'text-blue-300 border-blue-400/30',
};

/**
 * WindowToast - Toast notification component
 * Segue o Design System do plataforma.app com glassmorphism
 */
export function WindowToast({ toast, onClose, position = 'top-right' }: WindowToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-close after duration
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const colorClass = toastColors[toast.type];
  const icon = toastIcons[toast.type];

  return (
    <div
      className={`
        ${createGlassmorphism('standard')}
        rounded-lg shadow-xl border ${colorClass}
        max-w-sm w-full p-4
        transform transition-all duration-300
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${colorClass}`}>
          {icon}
        </div>
        <div className="ml-3 flex-1">
          {toast.title && (
            <p className="text-sm font-medium text-white">
              {toast.title}
            </p>
          )}
          <p className={`text-sm ${toast.title ? 'mt-1' : ''} text-white/80`}>
            {toast.message}
          </p>
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="mt-2 text-sm font-medium text-purple-300 hover:text-purple-200 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleClose}
          className="ml-4 flex-shrink-0 text-white/40 hover:text-white/60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Toast container component
interface WindowToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
  position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
};

export function WindowToastContainer({ toasts, onClose, position = 'top-right' }: WindowToastContainerProps) {
  const positionClass = positionClasses[position];

  return (
    <div className={`fixed ${positionClass} z-[10000] space-y-2`}>
      {toasts.map((toast) => (
        <WindowToast key={toast.id} toast={toast} onClose={onClose} position={position} />
      ))}
    </div>
  );
}

// Toast hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };
    
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  // Helper methods
  const success = (message: string, title?: string, duration?: number) =>
    addToast({ type: 'success', message, title, duration });

  const error = (message: string, title?: string, duration?: number) =>
    addToast({ type: 'error', message, title, duration });

  const warning = (message: string, title?: string, duration?: number) =>
    addToast({ type: 'warning', message, title, duration });

  const info = (message: string, title?: string, duration?: number) =>
    addToast({ type: 'info', message, title, duration });

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
  };
}

export default WindowToast;