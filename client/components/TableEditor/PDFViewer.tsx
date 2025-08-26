/**
 * PDFViewer - Visualizador de PDF integrado ao sistema de janelas
 * 
 * Abre PDFs em uma janela WindowCard dentro do TableEditor
 * ao invés de abrir em nova aba do navegador
 */

import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { WindowCard } from '@/components/ui';

interface PDFViewerProps {
  url: string;
  fileName?: string;
  onClose: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  url,
  fileName = 'documento.pdf',
  onClose
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Handler para download do PDF
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
  };

  // Handlers de zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  return (
    <div
      style={{
        position: 'fixed',
        top: isMaximized ? '0' : '50px',
        left: isMaximized ? '0' : '50px',
        right: isMaximized ? '0' : '50px',
        bottom: isMaximized ? '0' : '50px',
        width: isMaximized ? '100vw' : 'auto',
        height: isMaximized ? '100vh' : 'auto',
        maxWidth: isMaximized ? '100vw' : '90vw',
        maxHeight: isMaximized ? '100vh' : '90vh',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <WindowCard
        title={`PDF: ${fileName}`}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Header com controles */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Controles de zoom */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              title="Diminuir zoom"
              style={{
                padding: '4px 8px',
                backgroundColor: zoom <= 50 ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: zoom <= 50 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            
            <span style={{ 
              fontSize: '12px', 
              color: '#374151',
              minWidth: '50px',
              textAlign: 'center'
            }}>
              {zoom}%
            </span>
            
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              title="Aumentar zoom"
              style={{
                padding: '4px 8px',
                backgroundColor: zoom >= 200 ? '#6b7280' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: zoom >= 200 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Controles da janela */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDownload}
              title="Download do PDF"
              style={{
                padding: '4px 8px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px'
              }}
            >
              <Download className="w-3 h-3" />
              Download
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
              style={{
                padding: '4px 8px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isMaximized ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </button>

            <button
              onClick={onClose}
              title="Fechar PDF"
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Visualizador do PDF */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            backgroundColor: '#f3f4f6'
          }}
        >
          <iframe
            src={`${url}#zoom=${zoom}`}
            style={{
              width: `${zoom}%`,
              height: `${zoom * 8}px`, // Altura estimada baseada no zoom
              minHeight: '600px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            title={`PDF: ${fileName}`}
          />
        </div>

        {/* Footer com informações */}
        <div
          style={{
            padding: '6px 12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'rgba(255, 255, 255, 0.1)',
            fontSize: '11px',
            color: '#6b7280',
            textAlign: 'center'
          }}
        >
          📄 {fileName} • Clique e arraste para navegar • Use os controles de zoom
        </div>
      </WindowCard>
    </div>
  );
};

export default PDFViewer;