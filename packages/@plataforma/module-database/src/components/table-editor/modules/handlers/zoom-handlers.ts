/**
 * Zoom and view handlers for TableEditorCanvas
 * Safe extraction - simple state setters with no complex dependencies
 */

/**
 * Create zoom handlers for canvas manipulation
 * These are pure functions that only modify zoom and pan state
 */
export const createZoomHandlers = (
  setZoom: React.Dispatch<React.SetStateAction<number>>,
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) => {
  /**
   * Zoom in by 20% (max 3x)
   */
  const handleZoomIn = () => {
    setZoom((prev: number) => Math.min(prev * 1.2, 3));
  };

  /**
   * Zoom out by 20% (min 0.3x)
   */
  const handleZoomOut = () => {
    setZoom((prev: number) => Math.max(prev / 1.2, 0.3));
  };

  /**
   * Reset zoom to 100% and center the view
   */
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return {
    handleZoomIn,
    handleZoomOut,
    handleResetView
  };
};

/**
 * Zoom constants
 */
export const ZOOM_LIMITS = {
  MIN: 0.3,
  MAX: 3,
  STEP: 1.2,
  DEFAULT: 1
};

/**
 * Pan constants
 */
export const PAN_DEFAULTS = {
  x: 0,
  y: 0
};