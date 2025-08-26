import React from 'react';
import { useWindowManager } from './WindowManager';
import { WindowFrame } from './WindowFrame';

interface DesktopCanvasProps {
  className?: string;
  style?: React.CSSProperties;
  backgroundImage?: string;
  backgroundGradient?: string;
  children?: React.ReactNode;
}

export function DesktopCanvas({ 
  className = "", 
  style = {}, 
  backgroundImage,
  backgroundGradient = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  children 
}: DesktopCanvasProps) {
  const { windows } = useWindowManager();
  
  // Filter out minimized windows for rendering
  const visibleWindows = windows.filter(window => !window.isMinimized);
  
  const desktopStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    background: backgroundImage 
      ? `url(${backgroundImage}) center/cover no-repeat`
      : backgroundGradient,
    ...style,
  };

  return (
    <div 
      className={`desktop-canvas ${className}`} 
      style={desktopStyle}
    >
      {/* Background overlay for glass effect */}
      <div 
        className="absolute inset-0 bg-black/10" 
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Desktop content (shortcuts, widgets, etc.) */}
      {children}
      
      {/* Render all visible windows */}
      {visibleWindows.map((window) => (
        <WindowFrame key={window.id} window={window} />
      ))}
    </div>
  );
}