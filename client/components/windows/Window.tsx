import React, { useRef, useState, useEffect, useCallback } from "react";
import { Minus, Square, X, Maximize2, Minimize2, Columns, PanelLeft, PanelRight } from "lucide-react";
import { WindowState, useWindowManager } from "./WindowManager";

interface WindowProps {
  window: WindowState;
}

export function Window({ window }: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    focusWindow,
    updateWindow,
    snapWindowLeft,
    snapWindowRight,
  } = useWindowManager();
  
  // Ensure window has required properties
  if (!window.position) window.position = { x: 100, y: 100 };
  if (!window.size) window.size = { width: 800, height: 600 };

  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [showSnapMenu, setShowSnapMenu] = useState(false);

  // Handle window focus
  const handleFocus = useCallback(() => {
    focusWindow(window.id);
  }, [focusWindow, window.id]);

  // Drag functionality
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!window.canMove || window.isMaximized) return;

      setIsDragging(true);
      setDragStart({
        x: e.clientX - window.position.x,
        y: e.clientY - window.position.y,
      });
      handleFocus();
      e.preventDefault();
    },
    [window.canMove, window.isMaximized, window.position, handleFocus],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && window.canMove && !window.isMaximized) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Validate and constrain to viewport
        if (!isNaN(newX) && !isNaN(newY)) {
          const constrainedX = Math.max(
            0,
            Math.min(
              newX,
              (globalThis.window?.innerWidth || 1920) - window.size.width,
            ),
          );
          const constrainedY = Math.max(
            0,
            Math.min(
              newY,
              (globalThis.window?.innerHeight || 1080) - window.size.height,
            ),
          );

          if (!isNaN(constrainedX) && !isNaN(constrainedY)) {
            updateWindow(window.id, {
              position: { x: constrainedX, y: constrainedY },
            });
          }
        }
      }

      if (isResizing && window.canResize) {
        const newWidth = Math.max(
          300,
          resizeStart.width + (e.clientX - resizeStart.x),
        );
        const newHeight = Math.max(
          200,
          resizeStart.height + (e.clientY - resizeStart.y),
        );

        if (!isNaN(newWidth) && !isNaN(newHeight)) {
          updateWindow(window.id, {
            size: { width: newWidth, height: newHeight },
          });
        }
      }
    },
    [isDragging, isResizing, dragStart, resizeStart, window, updateWindow],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resize functionality
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!window.canResize || window.isMaximized) return;

      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: window.size.width,
        height: window.size.height,
      });
      handleFocus();
      e.preventDefault();
      e.stopPropagation();
    },
    [window.canResize, window.isMaximized, window.size, handleFocus],
  );

  // Global mouse events
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Window controls
  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("MINIMIZE BUTTON CLICKED - Window ID:", window.id);
    console.log("Current window state before minimize:", window);
    minimizeWindow(window.id);
  };
  
  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    maximizeWindow(window.id);
  };
  
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    closeWindow(window.id);
  };
  const handleSnapLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapWindowLeft(window.id);
    setShowSnapMenu(false);
  };
  const handleSnapRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    snapWindowRight(window.id);
    setShowSnapMenu(false);
  };

  // Double-click to maximize
  const handleDoubleClick = () => {
    if (window.canResize) {
      maximizeWindow(window.id);
    }
  };

  const { activeWindowId } = useWindowManager();

  // Check for snap shortcuts with keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!window.isMaximized && window.id === activeWindowId) {
        if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          snapWindowLeft(window.id);
        } else if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          snapWindowRight(window.id);
        }
      }
    };

    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [window.id, window.isMaximized, activeWindowId, snapWindowLeft, snapWindowRight]);

  return (
    <div
      ref={windowRef}
      className={`absolute bg-black/10 backdrop-blur-sm border border-white/10 rounded-lg shadow-2xl overflow-hidden ${
        isDragging ? "cursor-grabbing" : "cursor-default"
      }`}
      style={{
        display: window.isMinimized ? 'none' : 'block',
        left: isNaN(window.position.x) ? 100 : window.position.x,
        top: isNaN(window.position.y) ? 100 : window.position.y,
        width: isNaN(window.size.width) ? 800 : window.size.width,
        height: isNaN(window.size.height) ? 600 : window.size.height,
        zIndex: window.zIndex,
        transition: isDragging || isResizing ? "none" : "all 0.2s ease",
      }}
      onMouseDown={handleFocus}
    >
      {/* Window Header */}
      <div
        ref={headerRef}
        className={`h-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 flex items-center justify-between px-4 ${
          window.canMove ? "cursor-grab" : "cursor-default"
        } ${isDragging ? "cursor-grabbing" : ""}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {/* Empty space for symmetry */}
        <div className="w-20"></div>

        {/* Window Title */}
        <div className="flex-1 text-center">
          <span className="text-sm text-gray-200 font-medium truncate">
            {window.title}
          </span>
        </div>

        {/* Window Controls (right side) */}
        <div className="flex items-center space-x-2">
          {/* Snap Controls */}
          {window.canResize && !window.isMaximized && (
            <div className="flex items-center space-x-1 mr-2">
              <button
                onClick={handleSnapLeft}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                title="Ajustar à esquerda (Ctrl+←)"
              >
                <PanelLeft className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
              <button
                onClick={handleSnapRight}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                title="Ajustar à direita (Ctrl+→)"
              >
                <PanelRight className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>
          )}
          
          {/* Traffic Lights - Order: Red (close), Yellow (minimize), Green (maximize) */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm hover:shadow-md active:scale-95"
              title="Fechar janela"
              aria-label="Fechar janela"
            />
            <button
              type="button"
              onClick={handleMaximize}
              className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm hover:shadow-md active:scale-95"
              title={window.isMaximized ? "Restaurar janela" : "Maximizar janela"}
              aria-label={window.isMaximized ? "Restaurar janela" : "Maximizar janela"}
            />
          </div>
        </div>
      </div>

      {/* Window Content */}
      <div 
        className="h-[calc(100%-2.5rem)] overflow-auto window-content"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#6b7280 #1f2937',
          overscrollBehavior: 'contain'
        }}
      >
        {window.component}
      </div>

      {/* Resize Handle */}
      {window.canResize && !window.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute bottom-1 right-1 w-3 h-3">
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-gray-500 rounded-full" />
            <div className="absolute bottom-0 right-1 w-1 h-1 bg-gray-500 rounded-full" />
            <div className="absolute bottom-1 right-0 w-1 h-1 bg-gray-500 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
