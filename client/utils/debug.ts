/**
 * Debug utility - Centralizes all debug logging
 * Only logs in development mode
 */

const isDev = process.env.NODE_ENV === 'development';
const DEBUG_ENABLED = isDev && false; // Set to true to enable debug logs

export const debug = {
  log: (...args: any[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  },
  
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) console.warn(...args);
  },
  
  error: (...args: any[]) => {
    // Always log errors, but with better formatting
    console.error(...args);
  },
  
  table: (data: any) => {
    if (DEBUG_ENABLED) console.table(data);
  },
  
  group: (label: string) => {
    if (DEBUG_ENABLED) console.group(label);
  },
  
  groupEnd: () => {
    if (DEBUG_ENABLED) console.groupEnd();
  }
};

// Export categories for organized logging
export const debugCategories = {
  FILE: '📄',
  DATA: '📊',
  NETWORK: '🌐',
  UI: '🎨',
  ERROR: '❌',
  SUCCESS: '✅',
  INFO: 'ℹ️',
  WARNING: '⚠️'
};