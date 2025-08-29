/**
 * ====================================================================
 * PLATAFORMA.APP - UI STANDARDS
 * ====================================================================
 * Sistema de design unificado que integra:
 * - Module colors (cores por contexto)
 * - Design system (estrutura e padrões)  
 * - Component patterns (padrões reutilizáveis)
 * 
 * OBJETIVO: Consistência visual total em todo o sistema
 * ====================================================================
 */

import { getModuleColor, type ModuleColor } from './module-colors';
import { designSystem } from './design-system';

// ====================================================================
// HIERARQUIA DE CORES
// ====================================================================

export interface UIContext {
  module: string;          // Contexto do módulo (sistema, admin, etc.)
  function?: string;       // Função específica (se diferente do módulo)
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral';
}

export interface StandardColors {
  background: string;      // Cor de fundo
  foreground: string;      // Cor do texto/ícone
  border: string;          // Cor da borda
  hover: {
    background: string;
    foreground: string;
  };
  gradient: string;        // Gradiente CSS
}

/**
 * Resolve cores baseado no contexto
 * REGRA: Context (módulo) define fundo, Function (ferramenta) define foreground
 */
export function resolveColors(context: UIContext): StandardColors {
  const moduleColor = getModuleColor(context.module);
  const functionColor = context.function ? getModuleColor(context.function) : moduleColor;
  
  return {
    background: moduleColor.rgba.light,
    foreground: functionColor.primary,
    border: functionColor.rgba.medium,
    hover: {
      background: moduleColor.rgba.medium,
      foreground: functionColor.secondary,
    },
    gradient: functionColor.gradient
  };
}

// ====================================================================
// COMPONENT PATTERNS
// ====================================================================

export interface DesktopIconConfig {
  context: UIContext;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'normal' | 'hover' | 'active' | 'disabled';
}

export const ICON_SIZES = {
  sm: { container: 'w-12 h-12', icon: 20, text: 'text-xs' },
  md: { container: 'w-16 h-16', icon: 32, text: 'text-xs' },
  lg: { container: 'w-20 h-20', icon: 48, text: 'text-sm' },
  xl: { container: 'w-24 h-24', icon: 64, text: 'text-base' }
};

export function getDesktopIconStyles(config: DesktopIconConfig): {
  containerClass: string;
  iconSize: number;
  textClass: string;
  colors: StandardColors;
} {
  const size = ICON_SIZES[config.size || 'lg'];
  const colors = resolveColors(config.context);
  
  const containerClass = [
    size.container,
    'mx-auto mb-3 flex items-center justify-center',
    'group-hover:scale-110 transition-all duration-300',
    'drop-shadow-2xl hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.4)]'
  ].join(' ');
  
  return {
    containerClass,
    iconSize: size.icon,
    textClass: `${size.text} font-semibold leading-tight drop-shadow-lg block text-white text-center`,
    colors
  };
}

// ====================================================================
// WINDOW PATTERNS  
// ====================================================================

export interface WindowConfig {
  title: string;
  context: UIContext;
  size?: { width: number; height: number };
  position?: { x: number; y: number };
  resizable?: boolean;
  minimizable?: boolean;
}

export function getWindowStyles(config: WindowConfig) {
  const colors = resolveColors(config.context);
  
  return {
    window: {
      ...designSystem.window,
      // Override header color based on context
      header: {
        ...designSystem.window.header,
        background: `bg-gradient-to-r ${colors.gradient}`,
      }
    },
    defaultSize: config.size || { width: 1000, height: 700 },
    defaultPosition: config.position || { x: 100, y: 100 }
  };
}

// ====================================================================  
// CARD PATTERNS
// ====================================================================

export interface CardConfig {
  context: UIContext;
  variant?: 'default' | 'highlighted' | 'muted';
  padding?: 'sm' | 'md' | 'lg';
}

export function getCardStyles(config: CardConfig): string {
  const colors = resolveColors(config.context);
  const padding = config.padding === 'sm' ? 'p-4' : 
                  config.padding === 'lg' ? 'p-8' : 'p-6';
  
  const baseClasses = [
    designSystem.card.background,
    designSystem.card.border, 
    designSystem.card.rounded,
    padding
  ];
  
  if (config.variant === 'highlighted') {
    baseClasses.push(`border-[${colors.foreground}]/30`);
  }
  
  return baseClasses.join(' ');
}

// ====================================================================
// BUTTON PATTERNS
// ====================================================================

export interface ButtonConfig {
  context: UIContext;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function getButtonStyles(config: ButtonConfig): string {
  const colors = resolveColors(config.context);
  const size = config.size === 'sm' ? 'px-3 py-1.5 text-sm' :
               config.size === 'lg' ? 'px-6 py-3 text-base' : 
               'px-4 py-2 text-sm';
  
  const baseClasses = [
    'font-semibold rounded-lg transition-all duration-200',
    size
  ];
  
  switch (config.variant) {
    case 'primary':
      baseClasses.push(`bg-gradient-to-r ${colors.gradient}`, 'text-white');
      break;
    case 'secondary':
      baseClasses.push('bg-white/10 text-white border border-white/20');
      break;
    case 'outline':
      baseClasses.push(`border-2 border-[${colors.foreground}] text-[${colors.foreground}]`);
      break;
    case 'ghost':
      baseClasses.push(`text-[${colors.foreground}] hover:bg-white/10`);
      break;
    default:
      baseClasses.push(`bg-gradient-to-r ${colors.gradient}`, 'text-white');
  }
  
  return baseClasses.join(' ');
}

// ====================================================================
// CONTEXT DEFINITIONS (PADRÕES PRINCIPAIS)
// ====================================================================

export const UI_CONTEXTS = {
  // Contextos principais
  SISTEMA: { module: 'sistema' } as UIContext,
  ADMIN_IN_SISTEMA: { module: 'sistema', function: 'admin' } as UIContext,  
  USERS_IN_SISTEMA: { module: 'sistema', function: 'admin' } as UIContext,
  
  // Contextos de função pura
  ADMIN: { module: 'admin' } as UIContext,
  USERS: { module: 'admin' } as UIContext,
  
  // Contextos base
  PLATFORM: { module: 'plataforma' } as UIContext,
  PUBLIC: { module: 'public' } as UIContext,
} as const;

// ====================================================================
// USAGE EXAMPLES & HELPERS
// ====================================================================

/**
 * Helper para ícones de desktop
 * Exemplo: getDesktopIcon(UI_CONTEXTS.ADMIN_IN_SISTEMA, 'lg')
 */
export function getDesktopIcon(context: UIContext, size: 'sm' | 'md' | 'lg' | 'xl' = 'lg') {
  return getDesktopIconStyles({ context, size });
}

/**
 * Helper para janelas
 * Exemplo: getWindow('Admin Panel', UI_CONTEXTS.ADMIN_IN_SISTEMA)  
 */
export function getWindow(title: string, context: UIContext, options?: Partial<WindowConfig>) {
  return getWindowStyles({ title, context, ...options });
}

/**
 * Helper para cards
 * Exemplo: getCard(UI_CONTEXTS.SISTEMA, 'highlighted')
 */
export function getCard(context: UIContext, variant?: CardConfig['variant']) {
  return getCardStyles({ context, variant });
}

/**
 * Helper para botões
 * Exemplo: getButton(UI_CONTEXTS.ADMIN_IN_SISTEMA, 'primary')
 */
export function getButton(context: UIContext, variant?: ButtonConfig['variant']) {
  return getButtonStyles({ context, variant });
}

// ====================================================================
// VALIDATION & DEBUGGING
// ====================================================================

/**
 * Debug helper - mostra as cores resolvidas para um contexto
 */
export function debugContext(context: UIContext) {
  const colors = resolveColors(context);
  console.log(`🎨 UI Context Debug:`, {
    context,
    resolved: colors,
    moduleColor: getModuleColor(context.module),
    functionColor: context.function ? getModuleColor(context.function) : 'same as module'
  });
  return colors;
}

export default {
  resolveColors,
  getDesktopIcon,
  getWindow,
  getCard,
  getButton,
  UI_CONTEXTS,
  debugContext
};