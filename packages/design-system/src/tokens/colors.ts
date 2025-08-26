/**
 * Color tokens for the Plataforma Design System
 * Based on module color system
 */

export interface ModuleColor {
  primary: string;
  gradient: string;
  hover: string;
  light: string;
  dark: string;
}

// Module-specific colors
export const moduleColors: Record<string, ModuleColor> = {
  // IA Module - Purple/Violet
  ia: {
    primary: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    hover: '#7C3AED',
    light: '#A78BFA',
    dark: '#6D28D9',
  },
  
  // Database - Blue
  database: {
    primary: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    hover: '#2563EB',
    light: '#60A5FA',
    dark: '#1E40AF',
  },
  
  // Sistema - Orange
  sistema: {
    primary: '#F97316',
    gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    hover: '#EA580C',
    light: '#FB923C',
    dark: '#C2410C',
  },
  
  // Estoque - Green
  estoque: {
    primary: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    hover: '#059669',
    light: '#34D399',
    dark: '#047857',
  },
  
  // Montagem - Amber
  montagem: {
    primary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    hover: '#D97706',
    light: '#FCD34D',
    dark: '#B45309',
  },
  
  // Vendas - Cyan
  vendas: {
    primary: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    hover: '#0891B2',
    light: '#22D3EE',
    dark: '#0E7490',
  },
  
  // Faturamento - Emerald
  faturamento: {
    primary: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    hover: '#059669',
    light: '#34D399',
    dark: '#047857',
  },
  
  // Expedição - Indigo
  expedicao: {
    primary: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    hover: '#4F46E5',
    light: '#818CF8',
    dark: '#3730A3',
  },
  
  // RH - Pink
  rh: {
    primary: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
    hover: '#DB2777',
    light: '#F472B6',
    dark: '#BE185D',
  },
  
  // Administrativo - Slate
  administrativo: {
    primary: '#64748B',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    hover: '#475569',
    light: '#94A3B8',
    dark: '#334155',
  },
  
  // Suporte - Teal
  suporte: {
    primary: '#14B8A6',
    gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
    hover: '#0D9488',
    light: '#2DD4BF',
    dark: '#0F766E',
  },
  
  // Comunicação - Lime
  comunicacao: {
    primary: '#84CC16',
    gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
    hover: '#65A30D',
    light: '#A3E635',
    dark: '#4D7C0F',
  },
  
  // Jurídico - Rose
  juridico: {
    primary: '#F43F5E',
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
    hover: '#E11D48',
    light: '#FB7185',
    dark: '#BE123C',
  },
  
  // Financeiro - Violet
  financeiro: {
    primary: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    hover: '#7C3AED',
    light: '#A78BFA',
    dark: '#6D28D9',
  },
  
  // Tributário - Yellow
  tributario: {
    primary: '#EAB308',
    gradient: 'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',
    hover: '#CA8A04',
    light: '#FACC15',
    dark: '#A16207',
  },
  
  // Marketing - Fuchsia
  marketing: {
    primary: '#D946EF',
    gradient: 'linear-gradient(135deg, #D946EF 0%, #C026D3 100%)',
    hover: '#C026D3',
    light: '#E879F9',
    dark: '#A21CAF',
  },
  
  // Produtos - Sky
  produtos: {
    primary: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    hover: '#0284C7',
    light: '#38BDF8',
    dark: '#0369A1',
  },
  
  // Lojas - Purple
  lojas: {
    primary: '#9333EA',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #7E22CE 100%)',
    hover: '#7E22CE',
    light: '#A855F7',
    dark: '#6B21A8',
  },
  
  // Cadastros - Gray
  cadastros: {
    primary: '#6B7280',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
    hover: '#4B5563',
    light: '#9CA3AF',
    dark: '#374151',
  },
  
  // Notificações - Red
  notificacoes: {
    primary: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    hover: '#DC2626',
    light: '#F87171',
    dark: '#B91C1C',
  },
};

// Helper function to get module color
export function getModuleColor(moduleName: string): ModuleColor {
  return moduleColors[moduleName.toLowerCase()] || moduleColors.sistema;
}

// Base palette colors
export const baseColors = {
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Transparency levels
  transparent: 'transparent',
  opacity: {
    5: 'rgba(255, 255, 255, 0.05)',
    10: 'rgba(255, 255, 255, 0.1)',
    20: 'rgba(255, 255, 255, 0.2)',
    30: 'rgba(255, 255, 255, 0.3)',
    40: 'rgba(255, 255, 255, 0.4)',
    50: 'rgba(255, 255, 255, 0.5)',
    60: 'rgba(255, 255, 255, 0.6)',
    70: 'rgba(255, 255, 255, 0.7)',
    80: 'rgba(255, 255, 255, 0.8)',
    90: 'rgba(255, 255, 255, 0.9)',
  },
};

// Semantic colors
export const semanticColors = {
  text: {
    primary: baseColors.white,
    secondary: baseColors.gray[400],
    tertiary: baseColors.gray[500],
    disabled: baseColors.gray[600],
    inverse: baseColors.gray[900],
  },
  
  background: {
    primary: baseColors.gray[900],
    secondary: baseColors.gray[800],
    tertiary: baseColors.gray[700],
    overlay: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(255, 255, 255, 0.1)',
  },
  
  border: {
    default: 'rgba(255, 255, 255, 0.2)',
    subtle: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.3)',
  },
  
  status: {
    success: baseColors.success,
    error: baseColors.error,
    warning: baseColors.warning,
    info: baseColors.info,
  },
};

// Export all color tokens
export const colorTokens = {
  module: moduleColors,
  base: baseColors,
  semantic: semanticColors,
};