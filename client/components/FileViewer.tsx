import React, { useState, useEffect, useRef } from 'react';
import { X, Download, ExternalLink, Maximize2, Minimize2, Minus, Square, Move, GripVertical } from 'lucide-react';
import { StoredFile } from '@/lib/supabase-storage';

interface FileViewerProps {
  file: StoredFile | any;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const dragState = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startPosX: number;
    startPosY: number;
  }>({ startX: 0, startY: 0, startWidth: 800, startHeight: 600, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMaximized) {
          setIsMaximized(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMaximized, onClose]);

  // Mouse handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      
      if (isResizing && !isMaximized) {
        const deltaX = e.clientX - dragState.current.startX;
        const deltaY = e.clientY - dragState.current.startY;
        
        let newWidth = dragState.current.startWidth;
        let newHeight = dragState.current.startHeight;
        let newX = dragState.current.startPosX;
        let newY = dragState.current.startPosY;

        if (resizeEdge?.includes('right')) {
          newWidth = Math.max(400, dragState.current.startWidth + deltaX);
        }
        if (resizeEdge?.includes('left')) {
          newWidth = Math.max(400, dragState.current.startWidth - deltaX);
          newX = dragState.current.startPosX + deltaX;
        }
        if (resizeEdge?.includes('bottom')) {
          newHeight = Math.max(300, dragState.current.startHeight + deltaY);
        }
        if (resizeEdge?.includes('top')) {
          newHeight = Math.max(300, dragState.current.startHeight - deltaY);
          newY = dragState.current.startPosY + deltaY;
        }

        setSize({ width: newWidth, height: newHeight });
        if (resizeEdge?.includes('left') || resizeEdge?.includes('top')) {
          setPosition({ x: newX, y: newY });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeEdge(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeEdge, isMaximized]);

  const handleTitleBarMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    setIsDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized) return;
    
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startPosX: position.x,
      startPosY: position.y
    };
    setResizeEdge(edge);
    setIsResizing(true);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const fileUrl = file?.url || file?.publicUrl || '';
  const fileName = file?.name || 'unknown';
  const fileMimeType = file?.mimeType || file?.type || '';
  const fileSize = file?.size || 0;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank');
  };

  const renderContent = () => {
    // Images
    if (fileMimeType.startsWith('image/')) {
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          onError={() => setError('Failed to load image')}
        />
      );
    }

    // Videos
    if (fileMimeType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|wmv|flv|mkv|webm|m4v|3gp)$/i)) {
      return (
        <video
          controls
          className="max-w-full max-h-full"
          preload="metadata"
          onError={() => setError('Failed to load video')}
          style={{ maxHeight: '100%' }}
        >
          <source src={fileUrl} type={fileMimeType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>
      );
    }

    // PDFs
    if (fileMimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title={fileName}
          onError={() => setError('Failed to load PDF')}
        />
      );
    }

    // Text files
    if (fileMimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.csv')) {
      return (
        <iframe
          src={fileUrl}
          className="w-full h-full bg-gray-900"
          title={fileName}
          onError={() => setError('Failed to load text file')}
        />
      );
    }

    // Office documents
    if (fileMimeType.includes('word') || fileMimeType.includes('excel') || fileMimeType.includes('powerpoint') ||
        fileMimeType.includes('spreadsheet') || fileMimeType.includes('document') || fileMimeType.includes('presentation') ||
        fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx|ods|odt|odp)$/i)) {
      
      const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full"
          title={fileName}
          onError={() => setError('Failed to load document')}
        />
      );
    }

    // Default: Download prompt
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <div className="text-6xl mb-4">📄</div>
        <h3 className="text-xl font-semibold mb-2">{fileName}</h3>
        <p className="text-gray-400 mb-4">This file type cannot be previewed</p>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download File
        </button>
      </div>
    );
  };

  // Don't render if minimized
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-lg p-2 flex items-center gap-2 shadow-2xl cursor-pointer hover:bg-gray-700/90 transition-colors"
        style={{ zIndex: 10000 }}
        onClick={toggleMinimize}
      >
        <span className="text-white text-sm truncate max-w-[200px]">{fileName}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-red-500/20 rounded transition-colors text-white/80 hover:text-red-400"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
        width: isMaximized ? '100vw' : size.width,
        height: isMaximized ? '100vh' : size.height,
        zIndex: 10000,
        minWidth: '400px',
        minHeight: '300px'
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 cursor-move select-none"
        onMouseDown={handleTitleBarMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-white/40" />
          <h3 className="text-white font-medium truncate max-w-md">{fileName}</h3>
          <span className="text-xs text-gray-400">
            {fileSize > 0 ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMinimize}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Square className="w-3 h-3" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors text-white/70 hover:text-red-400"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-black/20 p-4 flex items-center justify-center">
        {error ? (
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
            >
              Download Instead
            </button>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Resize Handles */}
      {!isMaximized && (
        <>
          {/* Corners */}
          <div
            className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize hover:bg-white/20"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div
            className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize hover:bg-white/20"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize hover:bg-white/20"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-white/20"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
          
          {/* Edges */}
          <div
            className="absolute top-0 left-3 right-3 h-1 cursor-ns-resize hover:bg-white/10"
            onMouseDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="absolute bottom-0 left-3 right-3 h-1 cursor-ns-resize hover:bg-white/10"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div
            className="absolute left-0 top-3 bottom-3 w-1 cursor-ew-resize hover:bg-white/10"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute right-0 top-3 bottom-3 w-1 cursor-ew-resize hover:bg-white/10"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
        </>
      )}
    </div>
  );
}