import React, { useRef, useState, useEffect, useCallback } from "react";
import { Minus, Square, X, Maximize2, Minimize2, Columns, PanelLeft, PanelRight } from "lucide-react";
import { useWindowManager } from "./WindowManager";
import type { PlatformWindowState } from '@plataforma/types';

interface WindowFrameProps {
  window: PlatformWindowState;
  className?: string;
  style?: React.CSSProperties;
}

export function WindowFrame({ window, className = "", style = {} }: WindowFrameProps) {
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
    [
      isDragging,
      isResizing,
      dragStart,
      resizeStart,
      window.canMove,
      window.canResize,
      window.isMaximized,
      window.id,
      updateWindow,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

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

  // Resize handles
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!window.canResize) return;

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
    [window.canResize, window.size, handleFocus],
  );

  // Double-click to maximize/restore
  const handleDoubleClick = useCallback(() => {
    maximizeWindow(window.id);
  }, [maximizeWindow, window.id]);

  // Handle minimize
  const handleMinimize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log("MINIMIZE BUTTON CLICKED for ID:", window.id);
      minimizeWindow(window.id);
    },
    [minimizeWindow, window.id],
  );

  // Handle maximize/restore
  const handleMaximize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      maximizeWindow(window.id);
    },
    [maximizeWindow, window.id],
  );

  // Handle close
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      closeWindow(window.id);
    },
    [closeWindow, window.id],
  );

  // Don't render if minimized
  if (window.isMinimized) {
    return null;
  }

  const windowStyle: React.CSSProperties = {
    position: "absolute",
    left: window.position.x,
    top: window.position.y,
    width: window.size.width,
    height: window.size.height,
    zIndex: window.zIndex,
    ...style,
  };

  return (
    <div
      ref={windowRef}
      className={`
        bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl
        flex flex-col overflow-hidden resize-none
        ${className}
      `}
      style={windowStyle}
      onMouseDown={handleFocus}
    >
      {/* Window Header */}
      <div
        ref={headerRef}
        className={`
          flex items-center justify-between p-3 border-b border-white/10
          cursor-move select-none bg-white/5
          ${!window.canMove ? "cursor-default" : ""}
        `}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {window.icon && (
            <div className="text-white/80 flex-shrink-0">
              {typeof window.icon === 'string' ? (
                <img src={window.icon} alt="" className="w-4 h-4" />
              ) : (
                window.icon
              )}
            </div>
          )}
          <h3 className="text-white/90 font-medium truncate text-sm">
            {window.title}
          </h3>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1">
          {/* Snap Menu Button */}
          <div className="relative">
            <button
              className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/80"
              onClick={(e) => {
                e.stopPropagation();
                setShowSnapMenu(!showSnapMenu);
              }}
              title="Snap Window"
            >
              <Columns size={12} />
            </button>

            {showSnapMenu && (
              <div className="absolute right-0 top-full mt-1 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-1 z-50">
                <button
                  className="flex items-center space-x-2 px-2 py-1 hover:bg-white/10 rounded text-xs text-white/80 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapWindowLeft(window.id);
                    setShowSnapMenu(false);
                  }}
                >
                  <PanelLeft size={12} />
                  <span>Snap Left</span>
                </button>
                <button
                  className="flex items-center space-x-2 px-2 py-1 hover:bg-white/10 rounded text-xs text-white/80 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapWindowRight(window.id);
                    setShowSnapMenu(false);
                  }}
                >
                  <PanelRight size={12} />
                  <span>Snap Right</span>
                </button>
              </div>
            )}
          </div>

          {/* Minimize */}
          <button
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/80"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus size={12} />
          </button>

          {/* Maximize/Restore */}
          <button
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white/80"
            onClick={handleMaximize}
            title={window.isMaximized ? "Restore" : "Maximize"}
          >
            {window.isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          {/* Close */}
          <button
            className="p-1 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors text-white/60"
            onClick={handleClose}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-hidden bg-white/5">
        {window.component}
      </div>

      {/* Resize Handle */}
      {window.canResize && !window.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 hover:opacity-100 bg-white/20"
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  );
}