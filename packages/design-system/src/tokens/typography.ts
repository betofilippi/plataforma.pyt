/**
 * Typography tokens for the Plataforma Design System
 */

// Font families
export const fontFamilies = {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    '"Noto Sans"',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
    '"Noto Color Emoji"',
  ].join(', '),
  
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    '"SF Mono"',
    'Menlo',
    'Monaco',
    'Consolas',
    '"Liberation Mono"',
    '"Courier New"',
    'monospace',
  ].join(', '),
};

// Font sizes
export const fontSizes = {
  xs: { size: '0.75rem', lineHeight: '1rem' },      // 12px / 16px
  sm: { size: '0.875rem', lineHeight: '1.25rem' },   // 14px / 20px
  base: { size: '1rem', lineHeight: '1.5rem' },      // 16px / 24px
  lg: { size: '1.125rem', lineHeight: '1.75rem' },   // 18px / 28px
  xl: { size: '1.25rem', lineHeight: '1.75rem' },    // 20px / 28px
  '2xl': { size: '1.5rem', lineHeight: '2rem' },     // 24px / 32px
  '3xl': { size: '1.875rem', lineHeight: '2.25rem' }, // 30px / 36px
  '4xl': { size: '2.25rem', lineHeight: '2.5rem' },  // 36px / 40px
  '5xl': { size: '3rem', lineHeight: '1' },          // 48px
  '6xl': { size: '3.75rem', lineHeight: '1' },       // 60px
  '7xl': { size: '4.5rem', lineHeight: '1' },        // 72px
  '8xl': { size: '6rem', lineHeight: '1' },          // 96px
  '9xl': { size: '8rem', lineHeight: '1' },          // 128px
};

// Font weights
export const fontWeights = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

// Line heights
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
  3: '.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
};

// Letter spacing
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

// Text styles (predefined combinations)
export const textStyles = {
  // Headings
  h1: {
    fontSize: fontSizes['5xl'].size,
    lineHeight: fontSizes['5xl'].lineHeight,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSizes['4xl'].size,
    lineHeight: fontSizes['4xl'].lineHeight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSizes['3xl'].size,
    lineHeight: fontSizes['3xl'].lineHeight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontSize: fontSizes['2xl'].size,
    lineHeight: fontSizes['2xl'].lineHeight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontSize: fontSizes.xl.size,
    lineHeight: fontSizes.xl.lineHeight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
  },
  h6: {
    fontSize: fontSizes.lg.size,
    lineHeight: fontSizes.lg.lineHeight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
  },
  
  // Body text
  body: {
    fontSize: fontSizes.base.size,
    lineHeight: fontSizes.base.lineHeight,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodyLarge: {
    fontSize: fontSizes.lg.size,
    lineHeight: fontSizes.lg.lineHeight,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontSize: fontSizes.sm.size,
    lineHeight: fontSizes.sm.lineHeight,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // UI text
  button: {
    fontSize: fontSizes.sm.size,
    lineHeight: fontSizes.sm.lineHeight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.wide,
    textTransform: 'none' as const,
  },
  label: {
    fontSize: fontSizes.sm.size,
    lineHeight: fontSizes.sm.lineHeight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
  },
  caption: {
    fontSize: fontSizes.xs.size,
    lineHeight: fontSizes.xs.lineHeight,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  overline: {
    fontSize: fontSizes.xs.size,
    lineHeight: fontSizes.xs.lineHeight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  
  // Code
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm.size,
    lineHeight: fontSizes.sm.lineHeight,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  codeBlock: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm.size,
    lineHeight: lineHeights.relaxed,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.normal,
  },
};

// Text decoration
export const textDecoration = {
  none: 'none',
  underline: 'underline',
  overline: 'overline',
  lineThrough: 'line-through',
};

// Text transform
export const textTransform = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
  normalCase: 'normal-case',
};

// Text alignment
export const textAlign = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'justify',
  start: 'start',
  end: 'end',
};

// Export all typography tokens
export const typographyTokens = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  textStyles,
  textDecoration,
  textTransform,
  textAlign,
};

export default typographyTokens;