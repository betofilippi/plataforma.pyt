import React from 'react';
import { createWindowCard } from '@/lib/design-system';

interface WindowCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Card padronizado para conteúdo dentro das janelas
 * Segue o Design System do plataforma.app
 */
export function WindowCard({ title, children, className = "" }: WindowCardProps) {
  return (
    <div className={createWindowCard(className)}>
      {title && (
        <h3 className="text-lg font-semibold text-white mb-4">
          {title}
        </h3>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

export default WindowCard;