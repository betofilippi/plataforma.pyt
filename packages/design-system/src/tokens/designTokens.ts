/**
 * PLATAFORMA.APP DESIGN TOKENS
 * Core design tokens for the Plataforma design system
 */

import type { DesignToken } from '@plataforma/types';

// Color Tokens
export const colorTokens: DesignToken[] = [
  // Window Colors
  { name: 'window-background', value: 'rgb(17 24 39)', category: 'color' }, // gray-900
  { name: 'window-border', value: 'rgb(55 65 81)', category: 'color' }, // gray-700
  { name: 'window-header-bg', value: 'rgb(31 41 55)', category: 'color' }, // gray-800
  
  // Card Colors
  { name: 'card-background', value: 'rgba(255, 255, 255, 0.1)', category: 'color' },
  { name: 'card-border', value: 'rgba(255, 255, 255, 0.2)', category: 'color' },
  
  // Content Colors
  { name: 'content-overlay', value: 'rgba(0, 0, 0, 0.1)', category: 'color' },
  
  // Brand Colors
  { name: 'primary-gradient', value: 'linear-gradient(to right, rgb(126 34 206), rgb(107 33 168))', category: 'color' },
  { name: 'primary-gradient-hover', value: 'linear-gradient(to right, rgb(107 33 168), rgb(88 28 135))', category: 'color' },
  { name: 'secondary-gradient', value: 'linear-gradient(to right, rgb(75 85 99), rgb(55 65 81))', category: 'color' },
  { name: 'secondary-gradient-hover', value: 'linear-gradient(to right, rgb(55 65 81), rgb(31 41 55))', category: 'color' },
  { name: 'success-gradient', value: 'linear-gradient(to right, rgb(22 163 74), rgb(21 128 61))', category: 'color' },
  { name: 'danger-gradient', value: 'linear-gradient(to right, rgb(185 28 28), rgb(153 27 27))', category: 'color' },
  { name: 'warning-gradient', value: 'linear-gradient(to right, rgb(217 119 6), rgb(180 83 9))', category: 'color' },
  
  // Text Colors
  { name: 'text-primary', value: 'rgb(255 255 255)', category: 'color' },
  { name: 'text-secondary', value: 'rgb(156 163 175)', category: 'color' }, // gray-400
  { name: 'text-error', value: 'rgb(252 165 165)', category: 'color' }, // red-300
  { name: 'text-success', value: 'rgb(134 239 172)', category: 'color' }, // green-300
];

// Spacing Tokens
export const spacingTokens: DesignToken[] = [
  { name: 'spacing-xs', value: '0.25rem', category: 'spacing' }, // 4px
  { name: 'spacing-sm', value: '0.5rem', category: 'spacing' }, // 8px
  { name: 'spacing-md', value: '1rem', category: 'spacing' }, // 16px
  { name: 'spacing-lg', value: '1.5rem', category: 'spacing' }, // 24px
  { name: 'spacing-xl', value: '2rem', category: 'spacing' }, // 32px
  { name: 'spacing-2xl', value: '3rem', category: 'spacing' }, // 48px
  
  // Component Spacing
  { name: 'card-padding', value: '1.5rem', category: 'spacing' }, // 24px
  { name: 'section-spacing', value: '1.5rem', category: 'spacing' }, // 24px
  { name: 'button-padding-x', value: '1rem', category: 'spacing' }, // 16px
  { name: 'button-padding-y', value: '0.5rem', category: 'spacing' }, // 8px
  { name: 'input-padding-x', value: '1rem', category: 'spacing' }, // 16px
  { name: 'input-padding-y', value: '0.5rem', category: 'spacing' }, // 8px
];

// Typography Tokens
export const typographyTokens: DesignToken[] = [
  { name: 'font-size-xs', value: '0.75rem', category: 'typography' }, // 12px
  { name: 'font-size-sm', value: '0.875rem', category: 'typography' }, // 14px
  { name: 'font-size-base', value: '1rem', category: 'typography' }, // 16px
  { name: 'font-size-lg', value: '1.125rem', category: 'typography' }, // 18px
  { name: 'font-size-xl', value: '1.25rem', category: 'typography' }, // 20px
  { name: 'font-size-2xl', value: '1.5rem', category: 'typography' }, // 24px
  { name: 'font-size-3xl', value: '1.875rem', category: 'typography' }, // 30px
  
  { name: 'font-weight-normal', value: '400', category: 'typography' },
  { name: 'font-weight-medium', value: '500', category: 'typography' },
  { name: 'font-weight-semibold', value: '600', category: 'typography' },
  { name: 'font-weight-bold', value: '700', category: 'typography' },
  
  { name: 'line-height-tight', value: '1.25', category: 'typography' },
  { name: 'line-height-normal', value: '1.5', category: 'typography' },
  { name: 'line-height-relaxed', value: '1.75', category: 'typography' },
];

// Shadow Tokens
export const shadowTokens: DesignToken[] = [
  { name: 'shadow-sm', value: '0 1px 2px 0 rgb(0 0 0 / 0.05)', category: 'shadow' },
  { name: 'shadow-md', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', category: 'shadow' },
  { name: 'shadow-lg', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', category: 'shadow' },
  { name: 'shadow-xl', value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', category: 'shadow' },
  { name: 'shadow-2xl', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)', category: 'shadow' },
  
  // Window Shadows
  { name: 'window-shadow', value: '0 25px 50px -12px rgb(0 0 0 / 0.25)', category: 'shadow' },
  { name: 'card-shadow', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', category: 'shadow' },
];

// Opacity Tokens
export const opacityTokens: DesignToken[] = [
  { name: 'opacity-0', value: '0', category: 'opacity' },
  { name: 'opacity-5', value: '0.05', category: 'opacity' },
  { name: 'opacity-10', value: '0.1', category: 'opacity' },
  { name: 'opacity-20', value: '0.2', category: 'opacity' },
  { name: 'opacity-25', value: '0.25', category: 'opacity' },
  { name: 'opacity-30', value: '0.3', category: 'opacity' },
  { name: 'opacity-40', value: '0.4', category: 'opacity' },
  { name: 'opacity-50', value: '0.5', category: 'opacity' },
  { name: 'opacity-60', value: '0.6', category: 'opacity' },
  { name: 'opacity-70', value: '0.7', category: 'opacity' },
  { name: 'opacity-75', value: '0.75', category: 'opacity' },
  { name: 'opacity-80', value: '0.8', category: 'opacity' },
  { name: 'opacity-90', value: '0.9', category: 'opacity' },
  { name: 'opacity-95', value: '0.95', category: 'opacity' },
  { name: 'opacity-100', value: '1', category: 'opacity' },
];

// Combined Design Tokens
export const designTokens: DesignToken[] = [
  ...colorTokens,
  ...spacingTokens,
  ...typographyTokens,
  ...shadowTokens,
  ...opacityTokens,
];

// Token lookup helper
export function getDesignToken(name: string): DesignToken | undefined {
  return designTokens.find(token => token.name === name);
}

// Token value helper
export function getTokenValue(name: string): string | number | undefined {
  const token = getDesignToken(name);
  return token?.value;
}

// Get tokens by category
export function getTokensByCategory(category: DesignToken['category']): DesignToken[] {
  return designTokens.filter(token => token.category === category);
}