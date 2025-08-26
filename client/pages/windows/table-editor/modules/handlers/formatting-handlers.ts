/**
 * Formatting handlers for TableEditorCanvas
 * Safe extraction - pure formatting logic
 */

import { CellFormat } from '@/hooks/useTableSelection';

/**
 * Create formatting handlers for text styling
 */
export const createFormattingHandlers = (
  applyFormat: (format: Partial<CellFormat>) => void
) => {
  /**
   * Toggle bold formatting
   */
  const handleBold = () => {
    applyFormat({ bold: true });
  };

  /**
   * Toggle italic formatting
   */
  const handleItalic = () => {
    applyFormat({ italic: true });
  };

  /**
   * Toggle underline formatting
   */
  const handleUnderline = () => {
    applyFormat({ underline: true });
  };

  /**
   * Apply text color
   */
  const handleTextColor = (color: string) => {
    applyFormat({ color });
  };

  /**
   * Apply background color
   */
  const handleBackgroundColor = (color: string) => {
    applyFormat({ backgroundColor: color });
  };

  /**
   * Apply text alignment
   */
  const handleAlignment = (align: 'left' | 'center' | 'right') => {
    applyFormat({ align });
  };

  /**
   * Apply font size
   */
  const handleFontSize = (fontSize: number) => {
    applyFormat({ fontSize });
  };

  /**
   * Apply font family
   */
  const handleFontFamily = (fontFamily: string) => {
    applyFormat({ fontFamily });
  };

  /**
   * Clear all formatting
   */
  const handleClearFormatting = () => {
    applyFormat({
      bold: false,
      italic: false,
      underline: false,
      color: undefined,
      backgroundColor: undefined,
      align: 'left',
      fontSize: undefined,
      fontFamily: undefined,
      border: undefined
    });
  };

  return {
    handleBold,
    handleItalic,
    handleUnderline,
    handleTextColor,
    handleBackgroundColor,
    handleAlignment,
    handleFontSize,
    handleFontFamily,
    handleClearFormatting
  };
};

/**
 * Create border handlers
 */
export const createBorderHandlers = (
  applyFormat: (format: Partial<CellFormat>) => void
) => {
  /**
   * Apply border to selection
   */
  const handleApplyBorder = (border: {
    style: string;
    width: string;
    color: string;
    sides: {
      top?: boolean;
      right?: boolean;
      bottom?: boolean;
      left?: boolean;
    };
  }) => {
    const borderString = Object.entries(border.sides)
      .filter(([_, enabled]) => enabled)
      .map(([side]) => `${side}:${border.width} ${border.style} ${border.color}`)
      .join(';');
    
    applyFormat({ border: borderString });
  };

  /**
   * Remove all borders
   */
  const handleRemoveBorder = () => {
    applyFormat({ border: undefined });
  };

  return {
    handleApplyBorder,
    handleRemoveBorder
  };
};

/**
 * Check if cell has formatting
 */
export const hasFormatting = (format: CellFormat | undefined): boolean => {
  if (!format) return false;
  
  return !!(
    format.bold ||
    format.italic ||
    format.underline ||
    format.color ||
    format.backgroundColor ||
    format.align !== 'left' ||
    format.fontSize ||
    format.fontFamily ||
    format.border
  );
};

/**
 * Merge two cell formats
 */
export const mergeFormats = (
  base: CellFormat | undefined,
  overlay: Partial<CellFormat>
): CellFormat => {
  return {
    ...base,
    ...overlay,
    // Handle boolean toggles properly
    bold: overlay.bold !== undefined ? overlay.bold : base?.bold,
    italic: overlay.italic !== undefined ? overlay.italic : base?.italic,
    underline: overlay.underline !== undefined ? overlay.underline : base?.underline,
  };
};

/**
 * Convert format to CSS style object
 */
export const formatToCSS = (format: CellFormat): React.CSSProperties => {
  const styles: React.CSSProperties = {};

  if (format.bold) styles.fontWeight = 'bold';
  if (format.italic) styles.fontStyle = 'italic';
  if (format.underline) styles.textDecoration = 'underline';
  if (format.color) styles.color = format.color;
  if (format.backgroundColor) styles.backgroundColor = format.backgroundColor;
  if (format.align) styles.textAlign = format.align;
  if (format.fontSize) styles.fontSize = `${format.fontSize}px`;
  if (format.fontFamily) styles.fontFamily = format.fontFamily;

  // Parse border string if present
  if (format.border) {
    const borders = format.border.split(';');
    borders.forEach(border => {
      const [side, style] = border.split(':');
      if (side && style) {
        (styles as any)[`border${side.charAt(0).toUpperCase()}${side.slice(1)}`] = style;
      }
    });
  }

  return styles;
};

/**
 * Format constants for toolbar
 */
export const FORMATTING_TOOLBAR = {
  GROUPS: [
    {
      name: 'text',
      tools: ['bold', 'italic', 'underline']
    },
    {
      name: 'alignment',
      tools: ['align-left', 'align-center', 'align-right']
    },
    {
      name: 'colors',
      tools: ['text-color', 'background-color']
    },
    {
      name: 'borders',
      tools: ['border-picker']
    },
    {
      name: 'clear',
      tools: ['clear-formatting']
    }
  ]
};