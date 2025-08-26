/**
 * Constantes padronizadas para tamanhos de ícones em módulos
 * Usar estas constantes para garantir consistência visual em todos os módulos
 */

// Tamanhos padrão para ícones de desktop dos módulos
export const MODULE_ICON_SIZES = {
  // Container do ícone (fundo colorido)
  CONTAINER_SIZE: 'w-20 h-20', // 80px - tamanho padrão balanceado
  
  // Ícone interno
  ICON_SIZE: 'w-10 h-10', // 40px - proporcional ao container
  
  // Padding do container
  CONTAINER_PADDING: 'p-4',
  
  // Border radius
  CONTAINER_RADIUS: 'rounded-2xl',
  
  // Espaçamento inferior
  CONTAINER_MARGIN: 'mb-3'
} as const;

// Layout padrão para grids de ícones
export const MODULE_LAYOUT = {
  // Grid configuration
  GRID_COLS: 'grid-cols-4', // 4 colunas padrão
  GRID_GAP: 'gap-6', // Espaçamento maior para melhor organização
  
  // Positioning
  DESKTOP_TOP: 'top-32', // Posição vertical padrão
  DESKTOP_LEFT: 'left-12', // Posição horizontal padrão
  
  // Container classes
  DESKTOP_CONTAINER: 'absolute grid',
  
  // Hover effects
  HOVER_BG: 'hover:bg-white/10',
  HOVER_SCALE: 'group-hover:scale-110',
  
  // Transitions
  TRANSITION: 'transition-all duration-200'
} as const;

// Comportamentos de interação padrão
export const MODULE_INTERACTIONS = {
  // Click behavior
  CLICK_TYPE: 'onClick', // Padrão: clique simples (não duplo)
  
  // Context menu (right-click) behavior
  CONTEXT_MENU: true, // Habilitar menu de contexto
  
  // Cursor
  CURSOR: 'cursor-pointer',
  
  // Selection
  SELECTABLE: true // Permitir seleção visual
} as const;

// Tamanhos para texto dos labels
export const MODULE_TEXT_SIZES = {
  LABEL_SIZE: 'text-sm',
  LABEL_WEIGHT: 'font-medium',
  LABEL_COLOR: 'text-white/90',
  LABEL_ALIGNMENT: 'text-center'
} as const;

// Tamanhos para headers dos módulos
export const MODULE_HEADER_SIZES = {
  LOGO_SIZE: 'w-12 h-12',
  TITLE_SIZE: 'text-3xl',
  SUBTITLE_SIZE: 'text-sm'
} as const;

// Classes completas para fácil uso
export const STANDARD_ICON_CLASSES = {
  // Container do ícone
  CONTAINER: `${MODULE_ICON_SIZES.CONTAINER_SIZE} ${MODULE_ICON_SIZES.CONTAINER_RADIUS} flex items-center justify-center ${MODULE_ICON_SIZES.CONTAINER_MARGIN} ${MODULE_LAYOUT.HOVER_SCALE} transition-transform shadow-lg`,
  
  // Ícone interno
  ICON: `${MODULE_ICON_SIZES.ICON_SIZE} text-white`,
  
  // Label do ícone
  LABEL: `${MODULE_TEXT_SIZES.LABEL_SIZE} ${MODULE_TEXT_SIZES.LABEL_COLOR} ${MODULE_TEXT_SIZES.LABEL_ALIGNMENT} ${MODULE_TEXT_SIZES.LABEL_WEIGHT}`,
  
  // Container principal do ícone
  WRAPPER: `flex flex-col items-center ${MODULE_ICON_SIZES.CONTAINER_PADDING} rounded-xl ${MODULE_LAYOUT.HOVER_BG} ${MODULE_LAYOUT.TRANSITION} ${MODULE_INTERACTIONS.CURSOR} group`,
  
  // Grid layout
  DESKTOP_GRID: `${MODULE_LAYOUT.DESKTOP_CONTAINER} ${MODULE_LAYOUT.DESKTOP_TOP} ${MODULE_LAYOUT.DESKTOP_LEFT} ${MODULE_LAYOUT.GRID_COLS} ${MODULE_LAYOUT.GRID_GAP}`
} as const;

export default MODULE_ICON_SIZES;