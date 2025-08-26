/**
 * Spacing tokens for the Plataforma Design System
 */

// Base spacing scale (in rem)
export const spacingScale = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
};

// Component-specific spacing
export const componentSpacing = {
  // Padding
  padding: {
    xs: spacingScale[2],      // 8px
    sm: spacingScale[3],      // 12px
    md: spacingScale[4],      // 16px
    lg: spacingScale[6],      // 24px
    xl: spacingScale[8],      // 32px
    '2xl': spacingScale[12],  // 48px
  },
  
  // Margin
  margin: {
    xs: spacingScale[1],      // 4px
    sm: spacingScale[2],      // 8px
    md: spacingScale[4],      // 16px
    lg: spacingScale[6],      // 24px
    xl: spacingScale[8],      // 32px
    '2xl': spacingScale[12],  // 48px
  },
  
  // Gap (for flex and grid)
  gap: {
    xs: spacingScale[1],      // 4px
    sm: spacingScale[2],      // 8px
    md: spacingScale[4],      // 16px
    lg: spacingScale[6],      // 24px
    xl: spacingScale[8],      // 32px
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',    // 2px
    default: '0.25rem', // 4px
    md: '0.375rem',     // 6px
    lg: '0.5rem',       // 8px
    xl: '0.75rem',      // 12px
    '2xl': '1rem',      // 16px
    '3xl': '1.5rem',    // 24px
    full: '9999px',
  },
};

// Layout spacing
export const layoutSpacing = {
  // Container padding
  container: {
    sm: spacingScale[4],   // 16px
    md: spacingScale[6],   // 24px
    lg: spacingScale[8],   // 32px
    xl: spacingScale[12],  // 48px
  },
  
  // Section spacing
  section: {
    sm: spacingScale[8],   // 32px
    md: spacingScale[12],  // 48px
    lg: spacingScale[16],  // 64px
    xl: spacingScale[24],  // 96px
  },
  
  // Content spacing (between elements)
  content: {
    xs: spacingScale[2],   // 8px
    sm: spacingScale[4],   // 16px
    md: spacingScale[6],   // 24px
    lg: spacingScale[8],   // 32px
    xl: spacingScale[12],  // 48px
  },
};

// Window-specific spacing
export const windowSpacing = {
  // Window padding
  window: {
    header: spacingScale[4],    // 16px
    content: spacingScale[6],   // 24px
    footer: spacingScale[4],    // 16px
  },
  
  // Window controls spacing
  controls: {
    gap: spacingScale[1],       // 4px
    padding: spacingScale[2],   // 8px
  },
  
  // Window margins
  margin: {
    fromEdge: spacingScale[4],  // 16px
    cascade: spacingScale[8],   // 32px
  },
};

// Form spacing
export const formSpacing = {
  // Field spacing
  field: {
    gap: spacingScale[4],       // 16px - Space between fields
    labelGap: spacingScale[2],  // 8px - Space between label and input
  },
  
  // Input padding
  input: {
    x: spacingScale[4],         // 16px
    y: spacingScale[2],         // 8px
  },
  
  // Button padding
  button: {
    sm: {
      x: spacingScale[3],       // 12px
      y: spacingScale[1.5],     // 6px
    },
    md: {
      x: spacingScale[4],       // 16px
      y: spacingScale[2],       // 8px
    },
    lg: {
      x: spacingScale[6],       // 24px
      y: spacingScale[3],       // 12px
    },
  },
  
  // Form sections
  section: {
    gap: spacingScale[8],       // 32px
  },
};

// Grid and flex utilities
export const gridSpacing = {
  // Grid gaps
  gap: {
    xs: spacingScale[1],        // 4px
    sm: spacingScale[2],        // 8px
    md: spacingScale[4],        // 16px
    lg: spacingScale[6],        // 24px
    xl: spacingScale[8],        // 32px
  },
  
  // Column gaps
  columnGap: {
    sm: spacingScale[4],        // 16px
    md: spacingScale[6],        // 24px
    lg: spacingScale[8],        // 32px
  },
  
  // Row gaps
  rowGap: {
    sm: spacingScale[2],        // 8px
    md: spacingScale[4],        // 16px
    lg: spacingScale[6],        // 24px
  },
};

// Export all spacing tokens
export const spacingTokens = {
  scale: spacingScale,
  component: componentSpacing,
  layout: layoutSpacing,
  window: windowSpacing,
  form: formSpacing,
  grid: gridSpacing,
};

export default spacingTokens;