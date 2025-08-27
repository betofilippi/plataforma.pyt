/**
 * Custom hook for border picker functionality
 * Safe extraction - isolated state management
 */

import { useState, useCallback } from 'react';
import { DEFAULT_BORDER_CONFIG, BorderStyleType } from '../config/styles';

export interface BorderConfig {
  style: BorderStyleType;
  width: string;
  color: string;
  sides: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
}

export interface UseBorderPickerReturn {
  // State
  showBorderPicker: boolean;
  borderConfig: BorderConfig;
  
  // Actions
  openBorderPicker: () => void;
  closeBorderPicker: () => void;
  toggleBorderPicker: () => void;
  setBorderStyle: (style: BorderStyleType) => void;
  setBorderWidth: (width: string) => void;
  setBorderColor: (color: string) => void;
  toggleBorderSide: (side: 'top' | 'right' | 'bottom' | 'left') => void;
  setBorderSides: (sides: Partial<BorderConfig['sides']>) => void;
  resetBorderConfig: () => void;
  applyBorder: () => BorderConfig;
}

/**
 * Hook for managing border picker state and actions
 */
export const useBorderPicker = (
  onApply?: (config: BorderConfig) => void
): UseBorderPickerReturn => {
  const [showBorderPicker, setShowBorderPicker] = useState(false);
  const [borderConfig, setBorderConfig] = useState<BorderConfig>(DEFAULT_BORDER_CONFIG);

  // Show/hide actions
  const openBorderPicker = useCallback(() => {
    setShowBorderPicker(true);
  }, []);

  const closeBorderPicker = useCallback(() => {
    setShowBorderPicker(false);
  }, []);

  const toggleBorderPicker = useCallback(() => {
    setShowBorderPicker(prev => !prev);
  }, []);

  // Border configuration actions
  const setBorderStyle = useCallback((style: BorderStyleType) => {
    setBorderConfig(prev => ({ ...prev, style }));
  }, []);

  const setBorderWidth = useCallback((width: string) => {
    setBorderConfig(prev => ({ ...prev, width }));
  }, []);

  const setBorderColor = useCallback((color: string) => {
    setBorderConfig(prev => ({ ...prev, color }));
  }, []);

  const toggleBorderSide = useCallback((side: 'top' | 'right' | 'bottom' | 'left') => {
    setBorderConfig(prev => ({
      ...prev,
      sides: {
        ...prev.sides,
        [side]: !prev.sides[side]
      }
    }));
  }, []);

  const setBorderSides = useCallback((sides: Partial<BorderConfig['sides']>) => {
    setBorderConfig(prev => ({
      ...prev,
      sides: {
        ...prev.sides,
        ...sides
      }
    }));
  }, []);

  const resetBorderConfig = useCallback(() => {
    setBorderConfig(DEFAULT_BORDER_CONFIG);
  }, []);

  const applyBorder = useCallback(() => {
    if (onApply) {
      onApply(borderConfig);
    }
    closeBorderPicker();
    return borderConfig;
  }, [borderConfig, onApply, closeBorderPicker]);

  return {
    // State
    showBorderPicker,
    borderConfig,
    
    // Actions
    openBorderPicker,
    closeBorderPicker,
    toggleBorderPicker,
    setBorderStyle,
    setBorderWidth,
    setBorderColor,
    toggleBorderSide,
    setBorderSides,
    resetBorderConfig,
    applyBorder
  };
};