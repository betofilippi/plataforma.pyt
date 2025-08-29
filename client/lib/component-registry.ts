// ====================================================================
// COMPONENT REGISTRY - Sistema de Carregamento Dinâmico
// ====================================================================
// Components são carregados automaticamente baseado no nome.
// Para adicionar novo component = ADICIONAR LINHA no registry.
// ====================================================================

import React from 'react';

// Import dos componentes existentes
import AdminPanel from '@/components/AdminPanel';
import UserManagement from '@/components/UserManagement';
import DesignSystemShowcase from '@/components/DesignSystemShowcase';
import WindowTemplate from '@/components/windows/WindowTemplate';

// Import de ícones Lucide React dinamicamente
import * as LucideIcons from 'lucide-react';

// ====================================================================
// REGISTRY DE COMPONENTES
// ====================================================================

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Componentes administrativos
  'AdminPanel': AdminPanel,
  'UserManagement': UserManagement,
  'DesignSystemShowcase': DesignSystemShowcase,
  'WindowTemplate': WindowTemplate,
  
  // Componente genérico para fallback
  'CustomComponent': ({ windowId, savedState, initialProps }) => React.createElement(
    'div',
    { className: 'p-4 text-center text-gray-500' },
    `Componente customizado (${windowId})`,
    savedState && React.createElement('pre', { className: 'mt-2 text-sm' }, 
      JSON.stringify(savedState, null, 2)
    )
  ),
  
  // ================================================================
  // ADICIONAR NOVOS COMPONENTES AQUI
  // ================================================================
  // 🚀 EXEMPLO - Para adicionar VendasPanel:
  // 'VendasPanel': lazy(() => import('@/components/VendasPanel')),
  
  // 🚀 EXEMPLO - Para adicionar InventoryPanel:
  // 'InventoryPanel': lazy(() => import('@/components/InventoryPanel')),
  
  // 🚀 EXEMPLO - Para adicionar ReportsPanel: 
  // 'ReportsPanel': lazy(() => import('@/components/ReportsPanel')),
};

// ====================================================================
// REGISTRY DE ÍCONES LUCIDE
// ====================================================================

export const ICON_REGISTRY: Record<string, React.ComponentType<any>> = {
  // Ícones do sistema
  Settings: LucideIcons.Settings,
  Shield: LucideIcons.Shield,
  Users: LucideIcons.Users,
  
  // Ícones de negócio
  DollarSign: LucideIcons.DollarSign,
  ShoppingCart: LucideIcons.ShoppingCart,
  FileText: LucideIcons.FileText,
  BarChart: LucideIcons.BarChart,
  Package: LucideIcons.Package,
  
  // Ícones de sistema
  Cog: LucideIcons.Cog,
  Database: LucideIcons.Database,
  Server: LucideIcons.Server,
  Monitor: LucideIcons.Monitor,
  
  // Ícones de comunicação
  Mail: LucideIcons.Mail,
  MessageSquare: LucideIcons.MessageSquare,
  Phone: LucideIcons.Phone,
  Video: LucideIcons.Video,
  
  // Ícones diversos
  Calendar: LucideIcons.Calendar,
  Clock: LucideIcons.Clock,
  Search: LucideIcons.Search,
  Filter: LucideIcons.Filter,
  Download: LucideIcons.Download,
  Upload: LucideIcons.Upload,
  
  // ================================================================
  // ADICIONAR NOVOS ÍCONES AQUI CONFORME NECESSÁRIO
  // ================================================================
};

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Obtém um componente do registry
 */
export const getComponent = (name: string): React.ComponentType<any> | null => {
  return COMPONENT_REGISTRY[name] || null;
};

/**
 * Obtém um ícone do registry
 */
export const getIcon = (name: string): React.ComponentType<any> | null => {
  return ICON_REGISTRY[name] || null;
};

/**
 * Verifica se um componente existe
 */
export const hasComponent = (name: string): boolean => {
  return name in COMPONENT_REGISTRY;
};

/**
 * Verifica se um ícone existe
 */
export const hasIcon = (name: string): boolean => {
  return name in ICON_REGISTRY;
};

/**
 * Lista todos os componentes disponíveis
 */
export const listComponents = (): string[] => {
  return Object.keys(COMPONENT_REGISTRY);
};

/**
 * Lista todos os ícones disponíveis
 */
export const listIcons = (): string[] => {
  return Object.keys(ICON_REGISTRY);
};

// ====================================================================
// ERROR FALLBACKS
// ====================================================================

/**
 * Componente fallback para quando um componente não é encontrado
 */
export const ComponentNotFound: React.FC<{ componentName: string }> = ({ componentName }) => 
  React.createElement('div', {
    className: 'flex items-center justify-center h-64 bg-red-50 border-2 border-red-200 rounded-lg'
  },
    React.createElement('div', { className: 'text-center' },
      React.createElement('div', { className: 'text-red-600 text-xl mb-2' }, '⚠️ Componente não encontrado'),
      React.createElement('div', { className: 'text-red-500 text-sm' }, 
        `Component "${componentName}" não existe no registry.`
      ),
      React.createElement('div', { className: 'text-red-400 text-xs mt-2' }, 
        'Adicione-o em component-registry.ts'
      )
    )
  );

/**
 * Ícone fallback para quando um ícone não é encontrado
 */
export const IconNotFound: React.FC<{ iconName: string; size?: number }> = ({ 
  iconName, 
  size = 24 
}) => 
  React.createElement('div', {
    className: 'flex items-center justify-center bg-gray-200 rounded text-gray-500 text-xs font-mono',
    style: { width: size, height: size },
    title: `Ícone "${iconName}" não encontrado`
  }, '?');

// ====================================================================
// SESSION RESTORATION FUNCTIONS - Para restaurar janelas de sessão
// ====================================================================

import type { WindowComponentType } from './session-manager';

/**
 * Interface para props de componentes restaurados de sessão
 */
export interface SessionComponentProps {
  windowId: string;
  savedState?: Record<string, any>;
  initialProps?: Record<string, any>;
}

/**
 * Cria um componente React a partir de dados de sessão
 */
export const createComponentFromSession = (
  type: WindowComponentType,
  props: SessionComponentProps
): React.ReactNode | null => {
  const ComponentClass = COMPONENT_REGISTRY[type];
  
  if (!ComponentClass) {
    console.warn(`Component type '${type}' not found in registry`);
    return React.createElement(ComponentNotFound, { componentName: type });
  }

  try {
    // Combina props iniciais com estado salvo
    const combinedProps = {
      ...props.initialProps,
      ...props.savedState,
      windowId: props.windowId,
    };

    return React.createElement(ComponentClass, combinedProps);
  } catch (error) {
    console.error(`Failed to create component '${type}':`, error);
    return React.createElement(ComponentNotFound, { componentName: type });
  }
};

/**
 * Verifica se um componente pode ser restaurado da sessão
 */
export const canRestoreComponent = (type: WindowComponentType): boolean => {
  return type in COMPONENT_REGISTRY;
};

/**
 * Lista todos os tipos de componentes disponíveis para janelas
 */
export const listWindowComponentTypes = (): WindowComponentType[] => {
  return Object.keys(COMPONENT_REGISTRY) as WindowComponentType[];
};

/**
 * Obtém informações de um componente por tipo
 */
export const getComponentInfo = (type: WindowComponentType) => {
  const ComponentClass = COMPONENT_REGISTRY[type];
  if (!ComponentClass) return null;
  
  return {
    type,
    name: ComponentClass.displayName || ComponentClass.name || type,
    exists: true
  };
};

// ====================================================================
// 🎯 COMO USAR ESTE SISTEMA:
// ====================================================================
// 1. Para ADICIONAR componente: Import + adicionar no COMPONENT_REGISTRY
// 2. Para ADICIONAR ícone: Import do Lucide + adicionar no ICON_REGISTRY
// 3. DesktopIconRenderer usa estes registries automaticamente
// 4. Components são carregados sob demanda
// 5. Erros são tratados com fallbacks informativos
// 6. SESSION RESTORATION: Use createComponentFromSession() para restaurar janelas
// ====================================================================