/**
 * CellRenderer Inteligente - Sistema TEXT + Type Hints
 * 
 * Renderiza células baseado no type hint, mantendo compatibilidade
 * total com valores TEXT do Supabase
 */

import React from 'react';
import { 
  Check, X, Star, ExternalLink, FileText
} from 'lucide-react';
import { ColumnMetadata, TypeHint, validateValue } from '@/lib/table-metadata';

// =====================================================
// PROPS E INTERFACES
// =====================================================

export interface CellRendererProps {
  value: string | null;
  columnMetadata?: ColumnMetadata;
  isSelected?: boolean;
  isEditing?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPDFClick?: (url: string) => void; // Callback para abrir PDF no visualizador interno
  className?: string;
  showRawData?: boolean; // When true, shows raw data without formatting
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const CellRenderer: React.FC<CellRendererProps> = ({
  value,
  columnMetadata,
  isSelected = false,
  isEditing = false,
  onClick,
  onDoubleClick,
  onPDFClick,
  className = '',
  showRawData = false
}) => {
  
  // Se está editando, não renderizar (editor assume controle)
  if (isEditing) {
    return null;
  }

  // Se showRawData é true, NÃO aplicar formatação de type hints
  if (showRawData) {
    // Apenas retornar o valor sem formatação, mas identificando NULL e empty
    return (
      <div
        className={className}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          padding: '4px 8px',
          fontSize: '14px',
          fontFamily: 'Calibri, Arial, sans-serif'
        }}
      >
        {value === null || value === undefined ? 
          'NULL' : 
          value === '' ? 
            '(vazio)' : 
            value}
      </div>
    );
  }
  
  // Valor vazio quando NÃO está em raw mode
  if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
    return (
      <div 
        className={`cell-empty ${className}`}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        style={{
          color: '#9CA3AF',
          fontStyle: 'italic',
          fontSize: '14px', // Manter consistente com fonte padrão
          fontFamily: 'Calibri, Arial, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '4px 8px'
        }}
      >
        {value === null ? 'null' : value === '' ? '(empty)' : '-'}
      </div>
    );
  }
  
  // Usar type hint se disponível, senão assumir text
  const typeHint = columnMetadata?.typeHint || 'text';
  const formatOptions = columnMetadata?.formatOptions || {};
  const validationRules = columnMetadata?.validationRules || {};
  
  // Validar valor
  const error = validateValue(value, typeHint, validationRules);
  const hasError = error !== null;
  
  // Classes base
  const baseClasses = `
    cell-renderer 
    ${className} 
    ${isSelected ? 'cell-selected' : ''} 
    ${hasError ? 'cell-error' : ''}
  `.trim();
  
  // Props comuns
  const commonProps = {
    className: baseClasses,
    onClick,
    onDoubleClick,
    title: hasError ? error : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '4px 8px',
      cursor: 'cell',
      fontSize: '14px',
      fontFamily: 'Calibri, Arial, sans-serif',
      ...(hasError && {
        backgroundColor: '#FEF2F2',
        borderLeft: '3px solid #EF4444',
        color: '#DC2626'
      })
    }
  };
  
  // Renderizar baseado no tipo
  return (
    <div {...commonProps}>
      {renderByType(typeHint, value, formatOptions, onPDFClick)}
    </div>
  );
};

// =====================================================
// RENDERIZADORES POR TIPO
// =====================================================

function renderByType(
  typeHint: TypeHint, 
  value: string, 
  options: any,
  onPDFClick?: (url: string) => void
): React.ReactNode {
  
  switch (typeHint) {
    
    case 'currency':
      return renderCurrency(value, options);
      
    case 'percentage':
      return renderPercentage(value, options);
      
    case 'number':
      return renderNumber(value, options);
      
    case 'date':
      return renderDate(value, options);
      
    case 'datetime':
      return renderDateTime(value, options);
      
    case 'time':
      return renderTime(value, options);
      
    case 'boolean':
      return renderBoolean(value, options);
      
    case 'select':
      return renderSelect(value, options);
      
    case 'tags':
      return renderTags(value, options);
      
    case 'rating':
      return renderRating(value, options);
      
    case 'cpf':
      return renderCPF(value);
      
    case 'cnpj':
      return renderCNPJ(value);
      
    case 'phone':
      return renderPhone(value);
      
    case 'email':
      return renderEmail(value);
      
    case 'url':
      return renderURL(value);
      
    case 'pdf':
      return renderPDF(value, onPDFClick);
      
    case 'cep':
      return renderCEP(value);
      
    case 'color':
      return renderColor(value);
      
    case 'json':
      return renderJSON(value, options);
      
    case 'media':
      return renderMedia(value);
      
    case 'location':
      return renderLocation(value);
      
    case 'uuid':
      return renderUUID(value);
      
    case 'textarea':
    case 'markdown':
    case 'code':
      return renderMultilineText(value, typeHint);
      
    default:
      return renderText(value);
  }
}

// =====================================================
// RENDERIZADORES ESPECÍFICOS
// =====================================================

function renderCurrency(value: string, options: any): React.ReactNode {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: options.currency || 'BRL',
    minimumFractionDigits: options.decimals || 2,
    maximumFractionDigits: options.decimals || 2
  }).format(num);
  
  return (
    <span className="font-mono text-right font-medium">
      {formatted}
    </span>
  );
}

function renderPercentage(value: string, options: any): React.ReactNode {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  // Converter para percentual se necessário
  const percentage = num > 1 ? num : num * 100;
  const decimals = options.decimals || 1;
  
  return (
    <span className="font-mono">
      {percentage.toFixed(decimals)}%
    </span>
  );
}

function renderNumber(value: string, options: any): React.ReactNode {
  const num = parseFloat(value);
  
  if (isNaN(num)) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: options.decimals || 0,
    maximumFractionDigits: options.decimals || 2
  }).format(num);
  
  return (
    <span className="font-mono text-right">{formatted}</span>
  );
}

function renderDate(value: string, options: any): React.ReactNode {
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  const formatted = date.toLocaleDateString('pt-BR');
  
  return (
    <span className="text-gray-700">{formatted}</span>
  );
}

function renderDateTime(value: string, options: any): React.ReactNode {
  const date = new Date(value);
  
  if (isNaN(date.getTime())) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  const formatted = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
  
  return (
    <span className="text-gray-700 text-xs">{formatted}</span>
  );
}

function renderTime(value: string, options: any): React.ReactNode {
  return (
    <span className="font-mono">{value}</span>
  );
}

function renderBoolean(value: string, options: any): React.ReactNode {
  const isTrue = ['true', '1', 'sim', 'yes'].includes(value.toLowerCase());
  const trueLabel = options.trueLabel || 'Sim';
  const falseLabel = options.falseLabel || 'Não';
  
  return (
    <div className="flex items-center justify-center gap-1">
      {isTrue ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-green-700 text-xs font-medium">{trueLabel}</span>
        </>
      ) : (
        <>
          <X className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 text-xs">{falseLabel}</span>
        </>
      )}
    </div>
  );
}

function renderSelect(value: string, options: any): React.ReactNode {
  const option = options.options?.find((o: any) => o.value === value);
  
  if (!option) {
    return <span>{value}</span>;
  }
  
  return (
    <span 
      className={`px-2 py-1 rounded-full text-xs font-medium bg-${option.color}-100 text-${option.color}-800`}
      style={{
        backgroundColor: getColorHex(option.color, '100'),
        color: getColorHex(option.color, '800')
      }}
    >
      {option.label || value}
    </span>
  );
}

function renderTags(value: string, options: any): React.ReactNode {
  try {
    const tags = JSON.parse(value);
    
    if (!Array.isArray(tags)) {
      return <span>{value}</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 3).map((tag: string, index: number) => (
          <span 
            key={index}
            className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
          >
            {tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="text-xs text-gray-500">+{tags.length - 3}</span>
        )}
      </div>
    );
  } catch {
    return <span style={{ color: '#EF4444' }}>Tags inválidas</span>;
  }
}

function renderRating(value: string, options: any): React.ReactNode {
  const rating = parseInt(value);
  const max = options.max || 5;
  
  if (isNaN(rating)) {
    return <span style={{ color: '#EF4444' }}>{value}</span>;
  }
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <Star 
          key={i}
          className={`w-3 h-3 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      {options.showText && (
        <span className="text-xs text-gray-600 ml-1">{rating}/{max}</span>
      )}
    </div>
  );
}

function renderCPF(value: string): React.ReactNode {
  // Limpar e formatar CPF
  const cleaned = value.replace(/\D/g, '');
  const formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  
  return (
    <span className="font-mono text-sm text-gray-700">
      {formatted}
    </span>
  );
}

function renderCNPJ(value: string): React.ReactNode {
  const cleaned = value.replace(/\D/g, '');
  const formatted = cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  
  return (
    <span className="font-mono text-sm text-gray-700">
      {formatted}
    </span>
  );
}

function renderPhone(value: string): React.ReactNode {
  const cleaned = value.replace(/\D/g, '');
  let formatted = value;
  
  if (cleaned.length === 11) {
    formatted = cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    formatted = cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return (
    <span className="font-mono text-sm">{formatted}</span>
  );
}

function renderEmail(value: string): React.ReactNode {
  return (
    <span className="text-blue-700 text-sm truncate">{value}</span>
  );
}

function renderURL(value: string): React.ReactNode {
  return (
    <div className="flex items-center gap-1">
      <ExternalLink className="w-3 h-3 text-blue-600" />
      <a 
        href={value} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-600 text-sm truncate hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {value.replace(/^https?:\/\//, '')}
      </a>
    </div>
  );
}

function renderPDF(value: string, onPDFClick?: (url: string) => void): React.ReactNode {
  const fileName = value.split('/').pop()?.replace('.pdf', '') || 'Documento';
  
  return (
    <div className="flex items-center gap-1">
      <FileText className="w-3 h-3 text-red-600" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onPDFClick) {
            onPDFClick(value);
          } else {
            // Fallback: abrir em nova aba se não há callback
            window.open(value, '_blank', 'noopener,noreferrer');
          }
        }}
        className="text-red-600 text-sm truncate hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
        title={`Abrir PDF: ${fileName}`}
      >
        PDF: {fileName}
      </button>
    </div>
  );
}

function renderCEP(value: string): React.ReactNode {
  const cleaned = value.replace(/\D/g, '');
  const formatted = cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  
  return (
    <span className="font-mono text-sm text-gray-700">
      {formatted}
    </span>
  );
}

function renderColor(value: string): React.ReactNode {
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-4 h-4 rounded border border-gray-300"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-xs text-gray-600">{value}</span>
    </div>
  );
}

function renderJSON(value: string, options: any): React.ReactNode {
  try {
    const parsed = JSON.parse(value);
    const preview = Array.isArray(parsed) 
      ? `[${parsed.length} items]`
      : `{${Object.keys(parsed).length} keys}`;
    
    return (
      <div className="flex items-center gap-1">
        <FileText className="w-3 h-3 text-orange-600" />
        <span className="font-mono text-xs text-orange-700">{preview}</span>
      </div>
    );
  } catch {
    return <span style={{ color: '#EF4444' }}>JSON inválido</span>;
  }
}

function renderMedia(value: string): React.ReactNode {
  if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    return (
      <div className="flex items-center gap-2">
        <Image className="w-3 h-3 text-purple-600" />
        <img 
          src={value} 
          alt="Preview"
          className="w-6 h-6 object-cover rounded"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="text-xs text-gray-600 truncate">
          {value.split('/').pop()}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1">
      <FileText className="w-3 h-3 text-blue-600" />
      <span className="text-xs text-blue-700 truncate">
        {value.split('/').pop() || 'Arquivo'}
      </span>
    </div>
  );
}

function renderLocation(value: string): React.ReactNode {
  try {
    const location = JSON.parse(value);
    
    if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      return (
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-600" />
          <span className="text-xs text-gray-700">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        </div>
      );
    }
  } catch {}
  
  return <span style={{ color: '#EF4444' }}>Localização inválida</span>;
}

function renderUUID(value: string): React.ReactNode {
  return (
    <span className="font-mono text-xs text-gray-500 truncate">
      {value.slice(0, 8)}...
    </span>
  );
}

function renderMultilineText(value: string, type: TypeHint): React.ReactNode {
  const preview = value.length > 50 
    ? value.substring(0, 50) + '...'
    : value;
    
  return (
    <span className="text-sm text-gray-700 truncate">
      {preview}
    </span>
  );
}

function renderText(value: string): React.ReactNode {
  return (
    <span className="text-sm text-gray-900">
      {value}
    </span>
  );
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function getColorHex(colorName: string, shade: string): string {
  // Mapeamento simples de cores Tailwind
  const colors: Record<string, Record<string, string>> = {
    gray: { '100': '#F3F4F6', '800': '#1F2937' },
    red: { '100': '#FEE2E2', '800': '#991B1B' },
    orange: { '100': '#FED7AA', '800': '#9A3412' },
    yellow: { '100': '#FEF3C7', '800': '#92400E' },
    green: { '100': '#D1FAE5', '800': '#065F46' },
    blue: { '100': '#DBEAFE', '800': '#1E40AF' },
    purple: { '100': '#E9D5FF', '800': '#5B21B6' },
    pink: { '100': '#FCE7F3', '800': '#BE185D' }
  };
  
  return colors[colorName]?.[shade] || '#F3F4F6';
}

export default CellRenderer;