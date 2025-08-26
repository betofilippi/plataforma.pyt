// Design System - Main Entry Point

// Components
export { 
  WindowCard,
  WindowCardHeader,
  WindowCardSidebar,
  WindowCardModal 
} from './components/WindowCard';

export { 
  WindowButton,
  WindowButtonGroup,
  WindowButtonPrimary,
  WindowButtonSecondary,
  WindowButtonSuccess,
  WindowButtonDanger,
  WindowButtonWarning,
  WindowButtonGhost,
  WindowButtonOutline
} from './components/WindowButton';

export { 
  WindowInput,
  WindowTextarea,
  WindowSelect,
  WindowFieldGroup
} from './components/WindowInput';

export { 
  WindowToggle,
  WindowToggleGroup,
  WindowToggleSuccess,
  WindowToggleDanger
} from './components/WindowToggle';

export { 
  WindowModal,
  WindowConfirmModal
} from './components/WindowModal';

export { 
  WindowToast,
  WindowToastContainer,
  useToast
} from './components/WindowToast';

export { 
  WindowTable,
  WindowTablePagination
} from './components/WindowTable';

export { 
  WindowSidebar,
  WindowSidebarSection
} from './components/WindowSidebar';

// Design Tokens
export { 
  designTokens,
  colorTokens,
  shadowTokens,
  opacityTokens,
  getDesignToken,
  getTokenValue,
  getTokensByCategory
} from './tokens/designTokens';

export {
  glassmorphismConfig,
  glassmorphismPresets,
  glassmorphismTailwind,
  generateGlassmorphismCSS,
  getGlassmorphismClasses,
  createGlassmorphism
} from './tokens/glassmorphism';

export { 
  moduleColors,
  baseColors,
  semanticColors,
  getModuleColor
} from './tokens/colors';

export { spacingTokens } from './tokens/spacing';
export { typographyTokens } from './tokens/typography';

// Utilities
export { cn } from './utils/cn';
export * from './utils/glassmorphism';
export { 
  createVariant,
  buttonVariants,
  inputVariants,
  cardVariants
} from './utils/variants';

// Types (re-exported from @plataforma/types)
export type {
  DesignToken,
  GlassmorphismConfig
} from '@plataforma/types';