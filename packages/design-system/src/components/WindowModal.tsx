import React, { useEffect, useRef } from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';
import { WindowButton } from './WindowButton';

interface WindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

// Size configurations
const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * WindowModal - Modal dialog padronizado para uso em janelas
 * Segue o Design System do plataforma.app com glassmorphism
 */
export function WindowModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
}: WindowModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modalElement = modalRef.current;
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modalElement.addEventListener('keydown', handleTab);
    return () => modalElement.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative z-10 w-full ${sizeClasses[size]}
          ${createGlassmorphism('strong')}
          rounded-2xl shadow-2xl
          transform transition-all duration-300
          animate-in fade-in zoom-in-95
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            {title && (
              <h2 id="modal-title" className="text-xl font-semibold text-white">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-2 rounded-lg
                  text-white/60 hover:text-white hover:bg-white/10
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                "
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 pt-0 border-t border-white/10 mt-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmation modal component
interface WindowConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function WindowConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: WindowConfirmModalProps) {
  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <WindowModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
      showCloseButton={!loading}
      footer={
        <div className="flex space-x-2 justify-end">
          <WindowButton
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </WindowButton>
          <WindowButton
            variant={confirmButtonVariant}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </WindowButton>
        </div>
      }
    >
      <p className="text-white/90">{message}</p>
    </WindowModal>
  );
}

export default WindowModal;