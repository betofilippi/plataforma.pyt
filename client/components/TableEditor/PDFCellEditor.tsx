/**
 * PDFCellEditor - Editor especializado para upload de PDFs em células
 * 
 * Permite selecionar e fazer upload de arquivos PDF para o Supabase Storage
 * e salvar a URL resultante na célula da tabela
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, X, Check } from 'lucide-react';
import { uploadPDF } from '@/lib/supabase-pdf';

interface PDFCellEditorProps {
  value: string | null;
  onSave: (value: string) => void;
  onCancel: () => void;
  columnName?: string;
  tableName?: string;
}

export const PDFCellEditor: React.FC<PDFCellEditorProps> = ({
  value,
  onSave,
  onCancel,
  columnName = 'pdf',
  tableName = 'documents'
}) => {
  const [currentValue, setCurrentValue] = useState(value || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus no input ao montar
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Handler para upload de arquivo
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      console.log('📤 Iniciando upload do PDF usando service_key...');

      // Usar a nova função uploadPDF com service_key
      const result = await uploadPDF(file, tableName, columnName);

      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido no upload');
      }

      if (!result.url) {
        throw new Error('URL do arquivo não foi gerada');
      }

      console.log('✅ Upload concluído com service_key:', result.url);

      // Atualizar valor e mostrar sucesso
      setCurrentValue(result.url);
      setUploadSuccess(true);
      
      // Auto-salvar após upload bem-sucedido
      setTimeout(() => {
        onSave(result.url!);
      }, 500);

    } catch (error) {
      console.error('❌ Erro no upload do PDF:', error);
      setUploadError(error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  // Handler para duplo clique - abre seletor de arquivo
  const handleDoubleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Handler para teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentValue) {
        onSave(currentValue);
      } else {
        fileInputRef.current?.click();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      ref={containerRef}
      className="pdf-cell-editor"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        padding: '0 2px'
      }}
    >
      {/* Input oculto para seleção de arquivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Input de URL (editável manualmente) */}
      <input
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onDoubleClick={handleDoubleClick}
        placeholder="Duplo clique ou botão PDF"
        disabled={isUploading}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          fontSize: '11px',
          fontFamily: 'Calibri, Arial, sans-serif',
          backgroundColor: 'transparent',
          color: uploadSuccess ? '#16a34a' : uploadError ? '#dc2626' : '#111827',
          padding: '0 2px'
        }}
      />

      {/* Botão de upload */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Selecionar arquivo PDF"
        style={{
          padding: '2px 4px',
          backgroundColor: isUploading ? '#e5e7eb' : uploadSuccess ? '#10b981' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '2px',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          minWidth: '30px',
          justifyContent: 'center'
        }}
      >
        {isUploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : uploadSuccess ? (
          <Check className="w-3 h-3" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
      </button>

      {/* Botão de salvar - removido, salvamento automático após upload */}

      {/* Botão de cancelar - mais discreto */}
      {!uploadSuccess && (
        <button
          onClick={onCancel}
          title="Cancelar (Esc)"
          style={{
            padding: '2px 4px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '10px',
            minWidth: '20px',
            justifyContent: 'center'
          }}
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Mensagem de erro */}
      {uploadError && (
        <div
          style={{
            position: 'absolute',
            bottom: '-24px',
            left: 0,
            right: 0,
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            border: '1px solid #fecaca',
            zIndex: 1001
          }}
        >
          {uploadError}
        </div>
      )}
    </div>
  );
};

export default PDFCellEditor;