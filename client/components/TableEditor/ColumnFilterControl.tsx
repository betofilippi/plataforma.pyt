import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Filter,  // Still used in the Filter tab
  Type, 
  SortAsc, 
  CheckCircle,
  Columns,
  EyeOff,
  Edit3,
  Trash2,
  X
} from 'lucide-react';

export type TypeHint = 
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'time'
  | 'boolean'
  | 'cpf'
  | 'cnpj'
  | 'phone'
  | 'email'
  | 'url'
  | 'pdf'
  | 'cep';

export interface ColumnFilter {
  columnName: string;
  formatting?: {
    type: TypeHint;
    options?: any;
  };
  dataFilter?: {
    condition: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty';
    value?: string;
    caseSensitive?: boolean;
  };
  sorting?: {
    direction: 'asc' | 'desc' | null;
    priority?: number;
  };
  validation?: {
    required?: boolean;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

interface ColumnFilterControlProps {
  columnName: string;
  columnType: string;
  filter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter) => void;
  onClose?: () => void;
  onHideColumn?: (columnName: string) => void;
  onRenameColumn?: (columnName: string, newName: string) => void;
  onDeleteColumn?: (columnName: string) => void;
}

const TYPE_OPTIONS: { value: TypeHint; label: string; icon?: string }[] = [
  { value: 'text', label: 'Texto', icon: '📝' },
  { value: 'number', label: 'Número', icon: '🔢' },
  { value: 'currency', label: 'Moeda (R$)', icon: '💰' },
  { value: 'percentage', label: 'Percentual (%)', icon: '📊' },
  { value: 'date', label: 'Data', icon: '📅' },
  { value: 'datetime', label: 'Data e Hora', icon: '🕐' },
  { value: 'time', label: 'Hora', icon: '⏰' },
  { value: 'boolean', label: 'Sim/Não', icon: '✓' },
  { value: 'cpf', label: 'CPF', icon: '👤' },
  { value: 'cnpj', label: 'CNPJ', icon: '🏢' },
  { value: 'phone', label: 'Telefone', icon: '📱' },
  { value: 'email', label: 'E-mail', icon: '📧' },
  { value: 'url', label: 'URL/Link', icon: '🔗' },
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'cep', label: 'CEP', icon: '📍' },
];

export const ColumnFilterControl: React.FC<ColumnFilterControlProps> = ({
  columnName,
  columnType,
  filter,
  onFilterChange,
  onClose,
  onHideColumn,
  onRenameColumn,
  onDeleteColumn
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'format' | 'filter' | 'sort' | 'column' | 'validate'>('format');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Estado local do filtro
  const [localFilter, setLocalFilter] = useState<ColumnFilter>(filter || {
    columnName,
    formatting: undefined,
    dataFilter: undefined,
    sorting: undefined,
    validation: undefined
  });

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFormatChange = (type: TypeHint) => {
    const newFilter = {
      ...localFilter,
      formatting: type === 'text' ? undefined : { type, options: {} }
    };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleDataFilterChange = (condition: string, value?: string) => {
    const newFilter = {
      ...localFilter,
      dataFilter: condition ? {
        condition: condition as any,
        value,
        caseSensitive: localFilter.dataFilter?.caseSensitive || false
      } : undefined
    };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  const handleSortingChange = (direction: 'asc' | 'desc' | null) => {
    const newFilter = {
      ...localFilter,
      sorting: direction ? { direction } : undefined
    };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearAllFilters = () => {
    const newFilter = {
      columnName,
      formatting: undefined,
      dataFilter: undefined,
      sorting: undefined,
      validation: undefined
    };
    setLocalFilter(newFilter);
    onFilterChange(newFilter);
  };

  // Verificar se há algum filtro ativo
  const hasActiveFilter = localFilter.formatting || localFilter.dataFilter || localFilter.sorting || localFilter.validation;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Toggle - Estilo Excel */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          height: '24px',
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          fontSize: '10px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: hasActiveFilter ? '#f0f0f0' : 'transparent',
          color: hasActiveFilter ? '#333' : '#666',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = hasActiveFilter ? '#f0f0f0' : 'transparent';
        }}
      >
        <span style={{ fontSize: '12px', flexShrink: 0 }}>
          {localFilter.formatting 
            ? TYPE_OPTIONS.find(t => t.value === localFilter.formatting?.type)?.icon || '📝'
            : '📝'}
        </span>
        <span style={{ 
          flex: 1, 
          textAlign: 'left', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: hasActiveFilter ? '600' : '400'
        }}>
          {localFilter.formatting 
            ? TYPE_OPTIONS.find(t => t.value === localFilter.formatting?.type)?.label 
            : columnType.toUpperCase()}
        </span>
        <ChevronDown style={{ 
          width: '8px', 
          height: '8px', 
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0
        }} />
      </button>

      {/* Dropdown Menu - Estilo Excel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '2px',
          width: '320px',
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
          borderRadius: '2px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10000,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f5f5f5'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: '500', color: '#333', fontFamily: 'inherit' }}>{columnName}</span>
              <span style={{ fontSize: '10px', color: '#666', fontFamily: 'inherit' }}>{columnType}</span>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {hasActiveFilter && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    color: '#d32f2f'
                  }}
                  title="Limpar todos os filtros"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X style={{ width: '14px', height: '14px' }} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  color: '#666'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
            <button
              onClick={() => setActiveTab('format')}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: activeTab === 'format' ? '#fff' : '#fafafa',
                color: activeTab === 'format' ? '#333' : '#666',
                border: 'none',
                borderBottom: activeTab === 'format' ? '2px solid #666' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'format' ? '600' : '400'
              }}
            >
              <Type style={{ width: '11px', height: '11px' }} />
              <span>Formato</span>
            </button>
            <button
              onClick={() => setActiveTab('filter')}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: activeTab === 'filter' ? '#fff' : '#fafafa',
                color: activeTab === 'filter' ? '#333' : '#666',
                border: 'none',
                borderBottom: activeTab === 'filter' ? '2px solid #666' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'filter' ? '600' : '400'
              }}
            >
              <Filter style={{ width: '11px', height: '11px' }} />
              <span>Filtrar</span>
            </button>
            <button
              onClick={() => setActiveTab('sort')}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: activeTab === 'sort' ? '#fff' : '#fafafa',
                color: activeTab === 'sort' ? '#333' : '#666',
                border: 'none',
                borderBottom: activeTab === 'sort' ? '2px solid #666' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'sort' ? '600' : '400'
              }}
            >
              <SortAsc style={{ width: '11px', height: '11px' }} />
              <span>Ordenar</span>
            </button>
            <button
              onClick={() => setActiveTab('column')}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: activeTab === 'column' ? '#fff' : '#fafafa',
                color: activeTab === 'column' ? '#333' : '#666',
                border: 'none',
                borderBottom: activeTab === 'column' ? '2px solid #666' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'column' ? '600' : '400'
              }}
            >
              <Columns style={{ width: '11px', height: '11px' }} />
              <span>Coluna</span>
            </button>
            <button
              onClick={() => setActiveTab('validate')}
              style={{
                flex: 1,
                padding: '6px 4px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: activeTab === 'validate' ? '#fff' : '#fafafa',
                color: activeTab === 'validate' ? '#333' : '#666',
                border: 'none',
                borderBottom: activeTab === 'validate' ? '2px solid #666' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'validate' ? '600' : '400'
              }}
            >
              <CheckCircle style={{ width: '11px', height: '11px' }} />
              <span>Validar</span>
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ 
            padding: '10px', 
            maxHeight: '280px', 
            overflowY: 'auto',
            backgroundColor: '#fff',
            fontFamily: 'inherit'
          }}>
            {/* Formato Tab */}
            {activeTab === 'format' && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  Escolha como exibir os dados:
                </div>
                {TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFormatChange(option.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      marginBottom: '2px',
                      textAlign: 'left',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: localFilter.formatting?.type === option.value ? '#f0f0f0' : 'transparent',
                      color: '#333',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (localFilter.formatting?.type !== option.value) {
                        e.currentTarget.style.backgroundColor = '#f8f8f8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (localFilter.formatting?.type !== option.value) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{option.icon}</span>
                    <span>{option.label}</span>
                    {localFilter.formatting?.type === option.value && (
                      <span style={{ marginLeft: 'auto', color: '#666' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Filtrar Tab */}
            {activeTab === 'filter' && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  Filtrar dados da coluna:
                </div>
                <select 
                  style={{
                    width: '100%',
                    padding: '4px 6px',
                    fontSize: '12px',
                    backgroundColor: '#fff',
                    color: '#333',
                    border: '1px solid #d0d0d0',
                    borderRadius: '2px',
                    marginBottom: '8px'
                  }}
                  value={localFilter.dataFilter?.condition || ''}
                  onChange={(e) => handleDataFilterChange(e.target.value, localFilter.dataFilter?.value)}
                >
                  <option value="">Sem filtro</option>
                  <option value="contains">Contém</option>
                  <option value="equals">Igual a</option>
                  <option value="startsWith">Começa com</option>
                  <option value="endsWith">Termina com</option>
                  <option value="empty">Está vazio</option>
                  <option value="notEmpty">Não está vazio</option>
                </select>
                
                {localFilter.dataFilter?.condition && 
                 localFilter.dataFilter.condition !== 'empty' && 
                 localFilter.dataFilter.condition !== 'notEmpty' && (
                  <>
                    <input
                      type="text"
                      placeholder="Valor do filtro..."
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '12px',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: '1px solid #d0d0d0',
                        borderRadius: '2px'
                      }}
                      value={localFilter.dataFilter?.value || ''}
                      onChange={(e) => handleDataFilterChange(localFilter.dataFilter!.condition, e.target.value)}
                    />
                    
                    {/* Toggle Case Sensitive */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      marginTop: '6px',
                      fontSize: '11px'
                    }}>
                      <input
                        type="checkbox"
                        id={`caseSensitive-${columnName}`}
                        checked={localFilter.dataFilter?.caseSensitive || false}
                        onChange={(e) => {
                          const newFilter = {
                            ...localFilter,
                            dataFilter: {
                              ...localFilter.dataFilter!,
                              caseSensitive: e.target.checked
                            }
                          };
                          setLocalFilter(newFilter);
                          onFilterChange(newFilter);
                        }}
                        style={{
                          width: '12px',
                          height: '12px'
                        }}
                      />
                      <label htmlFor={`caseSensitive-${columnName}`} style={{ 
                        color: '#666',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}>
                        Diferenciar maiúsculas/minúsculas
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Ordenar Tab */}
            {activeTab === 'sort' && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  Ordenar coluna:
                </div>
                <button
                  onClick={() => handleSortingChange(localFilter.sorting?.direction === 'asc' ? null : 'asc')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '2px',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: localFilter.sorting?.direction === 'asc' ? '#f0f0f0' : 'transparent',
                    color: '#333',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (localFilter.sorting?.direction !== 'asc') {
                      e.currentTarget.style.backgroundColor = '#f8f8f8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localFilter.sorting?.direction !== 'asc') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>↑</span>
                  <span>Crescente (A → Z)</span>
                </button>
                <button
                  onClick={() => handleSortingChange(localFilter.sorting?.direction === 'desc' ? null : 'desc')}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: localFilter.sorting?.direction === 'desc' ? '#f0f0f0' : 'transparent',
                    color: '#333',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (localFilter.sorting?.direction !== 'desc') {
                      e.currentTarget.style.backgroundColor = '#f8f8f8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (localFilter.sorting?.direction !== 'desc') {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span>↓</span>
                  <span>Decrescente (Z → A)</span>
                </button>
              </div>
            )}

            {/* Coluna Tab */}
            {activeTab === 'column' && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  Ações da coluna:
                </div>
                <button
                  onClick={() => {
                    if (onHideColumn) {
                      onHideColumn(columnName);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '2px',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'transparent',
                    color: '#333',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <EyeOff style={{ width: '12px', height: '12px' }} />
                  <span>Ocultar coluna</span>
                </button>
                <button
                  onClick={() => {
                    if (onRenameColumn) {
                      const newName = prompt(`Renomear coluna "${columnName}" para:`, columnName);
                      if (newName && newName !== columnName) {
                        onRenameColumn(columnName, newName);
                        setIsOpen(false);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '2px',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'transparent',
                    color: '#333',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Edit3 style={{ width: '12px', height: '12px' }} />
                  <span>Renomear coluna</span>
                </button>
                <button
                  onClick={() => {
                    if (onDeleteColumn && confirm(`Deseja realmente excluir a coluna "${columnName}"?`)) {
                      onDeleteColumn(columnName);
                      setIsOpen(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '2px',
                    textAlign: 'left',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'transparent',
                    color: '#d32f2f',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Trash2 style={{ width: '12px', height: '12px' }} />
                  <span>Excluir coluna</span>
                </button>
              </div>
            )}

            {/* Validar Tab - IMPLEMENTAÇÃO REAL */}
            {activeTab === 'validate' && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  Regras de validação:
                </div>
                
                {/* Campo Obrigatório */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={localFilter.validation?.required || false}
                      onChange={(e) => {
                        const newFilter = {
                          ...localFilter,
                          validation: {
                            ...localFilter.validation,
                            required: e.target.checked
                          }
                        };
                        setLocalFilter(newFilter);
                        onFilterChange(newFilter);
                      }}
                      style={{
                        width: '12px',
                        height: '12px'
                      }}
                    />
                    <span>Campo obrigatório</span>
                  </label>
                </div>
                
                {/* Validação por Regex */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>
                    Padrão (Regex):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ^[0-9]{11}$ (CPF)"
                    style={{
                      width: '100%',
                      padding: '4px 6px',
                      fontSize: '12px',
                      backgroundColor: '#fff',
                      color: '#333',
                      border: '1px solid #d0d0d0',
                      borderRadius: '2px'
                    }}
                    value={localFilter.validation?.pattern || ''}
                    onChange={(e) => {
                      const newFilter = {
                        ...localFilter,
                        validation: {
                          ...localFilter.validation,
                          pattern: e.target.value || undefined
                        }
                      };
                      setLocalFilter(newFilter);
                      onFilterChange(newFilter);
                    }}
                  />
                </div>
                
                {/* Valores Min/Max para números */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>
                      Valor mínimo:
                    </label>
                    <input
                      type="number"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '12px',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: '1px solid #d0d0d0',
                        borderRadius: '2px'
                      }}
                      value={localFilter.validation?.min || ''}
                      onChange={(e) => {
                        const newFilter = {
                          ...localFilter,
                          validation: {
                            ...localFilter.validation,
                            min: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        };
                        setLocalFilter(newFilter);
                        onFilterChange(newFilter);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#666', marginBottom: '4px', display: 'block' }}>
                      Valor máximo:
                    </label>
                    <input
                      type="number"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '12px',
                        backgroundColor: '#fff',
                        color: '#333',
                        border: '1px solid #d0d0d0',
                        borderRadius: '2px'
                      }}
                      value={localFilter.validation?.max || ''}
                      onChange={(e) => {
                        const newFilter = {
                          ...localFilter,
                          validation: {
                            ...localFilter.validation,
                            max: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        };
                        setLocalFilter(newFilter);
                        onFilterChange(newFilter);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnFilterControl;