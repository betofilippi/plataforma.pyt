import React, { useState } from 'react';
import { createGlassmorphism } from '../tokens/glassmorphism';

interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  children?: SidebarItem[];
  badge?: string | number;
  disabled?: boolean;
}

interface WindowSidebarProps {
  items: SidebarItem[];
  activeItemId?: string;
  onItemClick?: (item: SidebarItem) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  glassmorphism?: boolean;
  variant?: 'left' | 'right';
}

/**
 * WindowSidebar - Sidebar navigation component
 * Segue o Design System do plataforma.app com glassmorphism
 */
export function WindowSidebar({
  items,
  activeItemId,
  onItemClick,
  collapsed = false,
  onCollapsedChange,
  header,
  footer,
  className = '',
  glassmorphism = true,
  variant = 'left',
}: WindowSidebarProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.disabled) return;
    
    if (item.children) {
      toggleExpanded(item.id);
    } else {
      if (item.onClick) {
        item.onClick();
      }
      if (onItemClick) {
        onItemClick(item);
      }
    }
  };

  const sidebarClasses = glassmorphism
    ? createGlassmorphism('sidebar')
    : 'bg-white/5';

  const borderClass = variant === 'left' 
    ? 'border-r border-white/10' 
    : 'border-l border-white/10';

  const renderItem = (item: SidebarItem, level = 0) => {
    const isActive = activeItemId === item.id;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const indent = collapsed ? 0 : level * 16;

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
          className={`
            w-full flex items-center justify-between
            px-3 py-2 rounded-lg
            transition-all duration-200
            ${isActive 
              ? 'bg-purple-600/30 text-white' 
              : 'text-white/70 hover:bg-white/10 hover:text-white'
            }
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{ paddingLeft: `${12 + indent}px` }}
          title={collapsed ? item.label : undefined}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {item.icon && (
              <span className="flex-shrink-0 w-5 h-5">
                {item.icon}
              </span>
            )}
            {!collapsed && (
              <span className="truncate">
                {item.label}
              </span>
            )}
          </div>
          
          {!collapsed && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              {item.badge && (
                <span className="px-2 py-0.5 text-xs bg-purple-600/50 text-white rounded-full">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <svg
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          )}
        </button>
        
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1">
            {item.children!.map((child) => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`
        ${sidebarClasses}
        ${borderClass}
        h-full flex flex-col
        transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
        ${className}
      `}
    >
      {/* Header */}
      {header && (
        <div className="p-4 border-b border-white/10">
          {header}
        </div>
      )}

      {/* Toggle button */}
      {onCollapsedChange && (
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={`
            p-3 text-white/60 hover:text-white hover:bg-white/10
            transition-colors duration-200
            ${variant === 'left' ? 'text-right' : 'text-left'}
          `}
        >
          <svg
            className={`w-5 h-5 inline-block transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {variant === 'left' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      )}

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => renderItem(item))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-white/10">
          {footer}
        </div>
      )}
    </div>
  );
}

// Sidebar section component for organizing items
interface WindowSidebarSectionProps {
  title?: string;
  children: React.ReactNode;
  collapsed?: boolean;
  className?: string;
}

export function WindowSidebarSection({
  title,
  children,
  collapsed = false,
  className = '',
}: WindowSidebarSectionProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {title && !collapsed && (
        <h3 className="px-3 mb-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

export default WindowSidebar;