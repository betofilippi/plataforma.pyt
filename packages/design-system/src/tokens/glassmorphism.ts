import type { GlassmorphismConfig } from '@plataforma/types';

// Glassmorphism Presets
export const glassmorphismPresets: Record<string, GlassmorphismConfig> = {
  // Subtle glassmorphism for content areas
  subtle: {
    blur: 12,
    opacity: 0.05,
    borderOpacity: 0.1,
    shadowIntensity: 0.1,
  },
  
  // Standard glassmorphism for cards and components
  standard: {
    blur: 16,
    opacity: 0.1,
    borderOpacity: 0.2,
    shadowIntensity: 0.2,
  },
  
  // Strong glassmorphism for modals and overlays
  strong: {
    blur: 24,
    opacity: 0.15,
    borderOpacity: 0.3,
    shadowIntensity: 0.3,
  },
  
  // Window glassmorphism for main window frames
  window: {
    blur: 20,
    opacity: 0.1,
    borderOpacity: 0.2,
    shadowIntensity: 0.25,
  },
  
  // Sidebar glassmorphism for navigation elements
  sidebar: {
    blur: 16,
    opacity: 0.05,
    borderOpacity: 0.1,
    shadowIntensity: 0.15,
  },
  
  // Header glassmorphism for window headers
  header: {
    blur: 14,
    opacity: 0.05,
    borderOpacity: 0.1,
    shadowIntensity: 0.1,
  },
};

// Default glassmorphism config
export const glassmorphismConfig: GlassmorphismConfig = glassmorphismPresets.standard;

// CSS Generator for glassmorphism
export function generateGlassmorphismCSS(config: GlassmorphismConfig, baseColor = 'white'): string {
  const { blur, opacity, borderOpacity, shadowIntensity } = config;
  
  return `
    background: rgba(${baseColor === 'white' ? '255, 255, 255' : '0, 0, 0'}, ${opacity});
    backdrop-filter: blur(${blur}px);
    -webkit-backdrop-filter: blur(${blur}px);
    border: 1px solid rgba(${baseColor === 'white' ? '255, 255, 255' : '255, 255, 255'}, ${borderOpacity});
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, ${shadowIntensity});
  `.trim();
}

// Tailwind CSS classes for glassmorphism effects
export const glassmorphismTailwind: Record<string, { background: string; border: string; shadow: string; }> = {
  subtle: {
    background: 'bg-white/5 backdrop-blur-[12px]',
    border: 'border border-white/10',
    shadow: 'shadow-lg',
  },
  
  standard: {
    background: 'bg-white/10 backdrop-blur-xl',
    border: 'border border-white/20',
    shadow: 'shadow-xl',
  },
  
  strong: {
    background: 'bg-white/15 backdrop-blur-2xl',
    border: 'border border-white/30',
    shadow: 'shadow-2xl',
  },
  
  window: {
    background: 'bg-white/10 backdrop-blur-[20px]',
    border: 'border border-white/20',
    shadow: 'shadow-2xl',
  },
  
  sidebar: {
    background: 'bg-white/5 backdrop-blur-xl',
    border: 'border-r border-white/10',
    shadow: 'shadow-lg',
  },
  
  header: {
    background: 'bg-white/5 backdrop-blur-[14px]',
    border: 'border-b border-white/10',
    shadow: 'shadow-sm',
  },
};

// Helper to get glassmorphism Tailwind classes
export function getGlassmorphismClasses(preset: keyof typeof glassmorphismPresets = 'standard'): string {
  const classes = glassmorphismTailwind[preset] || glassmorphismTailwind.standard;
  return `${classes.background} ${classes.border} ${classes.shadow}`;
}

// Helper to combine glassmorphism with additional classes
export function createGlassmorphism(
  preset: keyof typeof glassmorphismPresets = 'standard',
  additionalClasses = ''
): string {
  const baseClasses = getGlassmorphismClasses(preset);
  return `${baseClasses} ${additionalClasses}`.trim();
}