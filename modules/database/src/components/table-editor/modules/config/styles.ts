/**
 * Style and Border Configuration for TableEditorCanvas
 * Safe extraction - pure configuration values
 */

// Border style options
export const BORDER_STYLES = [
  { value: 'solid', label: 'Sólida' },
  { value: 'dashed', label: 'Tracejada' },
  { value: 'dotted', label: 'Pontilhada' },
  { value: 'double', label: 'Dupla' }
] as const;

export type BorderStyleType = 'solid' | 'dashed' | 'dotted' | 'double';

// Border width options
export const BORDER_WIDTHS = [
  { value: '1px', label: 'Fina' },
  { value: '2px', label: 'Média' },
  { value: '3px', label: 'Grossa' }
] as const;

// Default border configuration
export const DEFAULT_BORDER_CONFIG = {
  style: 'solid' as BorderStyleType,
  width: '1px',
  color: '#3B82F6',
  sides: {
    top: true,
    right: true,
    bottom: true,
    left: true
  }
} as const;

// Color picker defaults
export const DEFAULT_COLORS = {
  TEXT: '#000000',
  BACKGROUND: '#FFFFFF',
  BORDER: '#3B82F6',
  SELECTION: '#0070f3',
  RELATIONSHIP: '#8B5CF6',
  HOVER: 'rgba(255, 255, 255, 0.1)'
} as const;

// Table visual styles
export const TABLE_STYLES = {
  HEADER_BG: '#505050',
  HEADER_BORDER: '#404040',
  HEADER_TEXT: '#FFFFFF',
  CELL_BG: '#FFFFFF',
  CELL_BORDER: '#c0c0c0',
  ROW_NUMBER_BG: '#606060',
  ROW_NUMBER_BORDER: '#505050',
  COLUMN_SELECTED_BG: '#0070f3',
  COLUMN_DEFAULT_BG: '#d6d6d6',
  SELECTION_BORDER: '#808080'
} as const;

// Toolbar styles
export const TOOLBAR_STYLES = {
  BG: '#383838',
  BORDER: '#606060',
  TEXT: '#FFFFFF',
  HOVER: '#606060',
  ACTIVE: '#707070',
  SEPARATOR: '#707070'
} as const;

// Modal and dialog styles
export const MODAL_STYLES = {
  BACKDROP: 'rgba(0, 0, 0, 0.4)',
  BACKGROUND: '#d6d6d6',
  BORDER_RADIUS: '8px',
  PADDING: '24px',
  MAX_WIDTH: '90%',
  BOX_SHADOW: '0 4px 20px rgba(0, 0, 0, 0.15)'
} as const;

// Canvas grid styles
export const CANVAS_STYLES = {
  GRID_PATTERN: 'radial-gradient(circle 1px at center, rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
  GRID_SIZE: '20px 20px',
  GRID_POSITION: '0 0',
  BACKGROUND: '#2a2a2a'
} as const;

// Interaction states
export const INTERACTION_STYLES = {
  HOVER_OPACITY: 0.1,
  DRAG_OPACITY: 0.3,
  SELECTION_OPACITY: 0.1,
  RESIZE_CURSOR: 'col-resize'
} as const;

// Font options
export const FONT_OPTIONS = {
  FAMILIES: [
    'Arial',
    'Calibri',
    'Times New Roman',
    'Courier New',
    'Verdana'
  ],
  SIZES: [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32],
  DEFAULT_FAMILY: 'Calibri, Arial, sans-serif',
  DEFAULT_SIZE: 11
} as const;

/**
 * Utility function to generate border CSS
 */
export const generateBorderCSS = (
  sides: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean },
  width: string,
  style: BorderStyleType,
  color: string
) => {
  const borders: any = {};
  if (sides.top) borders.borderTop = `${width} ${style} ${color}`;
  if (sides.right) borders.borderRight = `${width} ${style} ${color}`;
  if (sides.bottom) borders.borderBottom = `${width} ${style} ${color}`;
  if (sides.left) borders.borderLeft = `${width} ${style} ${color}`;
  return borders;
};

/**
 * Format cell style object
 */
export const formatCellStyle = (formatting: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  align?: 'left' | 'center' | 'right';
}) => {
  const styles: any = {};
  
  if (formatting.bold) styles.fontWeight = 'bold';
  if (formatting.italic) styles.fontStyle = 'italic';
  if (formatting.underline) styles.textDecoration = 'underline';
  if (formatting.align) styles.textAlign = formatting.align;
  if (formatting.color) styles.color = formatting.color;
  if (formatting.backgroundColor) styles.backgroundColor = formatting.backgroundColor;
  if (formatting.fontSize) styles.fontSize = `${formatting.fontSize}px`;
  if (formatting.fontFamily) styles.fontFamily = formatting.fontFamily;
  
  return styles;
};