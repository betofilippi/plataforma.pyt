/**
 * Sistema de Metadados de Tabelas - Type Hints
 * 
 * Este módulo gerencia os "type hints" que definem como 
 * campos TEXT devem ser interpretados e renderizados
 */

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type TypeHint = 
  | 'text'          // Texto livre
  | 'textarea'      // Texto multilinha
  | 'number'        // Número genérico
  | 'currency'      // Moeda (R$ 1.234,56)
  | 'percentage'    // Percentual (15%)
  | 'date'          // Data (15/01/2024)
  | 'datetime'      // Data e hora (15/01/2024 10:30)
  | 'time'          // Apenas hora (10:30)
  | 'boolean'       // Sim/Não (true/false)
  | 'select'        // Lista de opções
  | 'tags'          // Array de tags
  | 'rating'        // Avaliação (estrelas)
  | 'cpf'           // CPF brasileiro
  | 'cnpj'          // CNPJ brasileiro  
  | 'phone'         // Telefone
  | 'email'         // Email
  | 'url'           // URL/Link
  | 'cep'           // CEP brasileiro
  | 'color'         // Cor (#FF5733)
  | 'json'          // JSON estruturado
  | 'markdown'      // Markdown
  | 'code'          // Código
  | 'media'         // Arquivo/Mídia
  | 'location'      // Coordenadas geográficas
  | 'relation'      // Chave estrangeira
  | 'uuid'          // UUID
  | 'ip'            // Endereço IP
  | 'slug'          // Slug/URL amigável
  | 'pdf';          // PDF URL com thumbnail

export type EditorType =
  | 'text'              // Input simples
  | 'textarea'          // Textarea
  | 'number-input'      // Input numérico
  | 'currency-input'    // Input com máscara de moeda
  | 'percentage-input'  // Input de percentual
  | 'date-picker'       // Seletor de data
  | 'datetime-picker'   // Seletor de data/hora
  | 'time-picker'       // Seletor de hora
  | 'switch'            // Toggle switch
  | 'select'            // Dropdown
  | 'multiselect'       // Seleção múltipla
  | 'tags-input'        // Editor de tags
  | 'rating'            // Componente de avaliação
  | 'masked-input'      // Input com máscara
  | 'email-input'       // Input de email
  | 'url-input'         // Input de URL
  | 'color-picker'      // Seletor de cor
  | 'json-editor'       // Editor JSON
  | 'json-viewer'       // Visualizador JSON
  | 'markdown-editor'   // Editor Markdown
  | 'code-editor'       // Editor de código
  | 'file-upload'       // Upload de arquivo
  | 'location-picker'   // Seletor de localização
  | 'pdf-input'         // Input de URL de PDF
  | 'readonly';         // Apenas leitura

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface FormatOptions {
  // Opções gerais
  readonly?: boolean;
  placeholder?: string;
  pattern?: string;
  
  // Números e moeda
  decimals?: number;
  min?: number;
  max?: number;
  currency?: string;
  prefix?: string;
  suffix?: string;
  
  // Datas
  format?: string;
  minDate?: string;
  maxDate?: string;
  
  // Texto
  rows?: number;
  maxLength?: number;
  
  // Select e tags
  options?: SelectOption[];
  suggestions?: string[];
  multiple?: boolean;
  
  // Boolean
  trueLabel?: string;
  falseLabel?: string;
  
  // Rating
  showText?: boolean;
  
  // Máscaras
  mask?: string;
  
  // Arquivos
  accept?: string;
  maxSize?: number;
  
  // JSON
  prettify?: boolean;
  
  // Localização
  showMap?: boolean;
  zoom?: number;
  
  // Cores
  palette?: string[];
  
  // Outros
  [key: string]: any;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  validateEmail?: boolean;
  validateCPF?: boolean;
  validateCNPJ?: boolean;
  validateCEP?: boolean;
  validatePhone?: boolean;
  validateURL?: boolean;
  custom?: (value: string) => string | null; // Retorna erro ou null se válido
  [key: string]: any;
}

export interface ColumnMetadata {
  id?: string;
  schemaName: string;
  tableName: string;
  columnName: string;
  typeHint: TypeHint;
  formatOptions?: FormatOptions;
  validationRules?: ValidationRules;
  editorType?: EditorType;
  confidence?: number; // 0-1, confiança na detecção automática
  isAutoDetected?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  columns: Map<string, ColumnMetadata>;
  lastUpdated?: string;
  version?: number;
}

// =====================================================
// DETECÇÃO AUTOMÁTICA DE TIPOS
// =====================================================

export interface TypeDetectionPattern {
  hint: TypeHint;
  confidence: number;
  patterns: {
    name?: RegExp[];     // Padrões no nome da coluna
    value?: RegExp[];    // Padrões nos valores
    exact?: string[];    // Valores exatos
  };
}

// Padrões para detecção automática
export const TYPE_DETECTION_PATTERNS: TypeDetectionPattern[] = [
  // CPF
  {
    hint: 'cpf',
    confidence: 0.95,
    patterns: {
      name: [/cpf/i],
      value: [/^\d{11}$/, /^\d{3}\.\d{3}\.\d{3}-\d{2}$/]
    }
  },
  
  // CNPJ  
  {
    hint: 'cnpj',
    confidence: 0.95,
    patterns: {
      name: [/cnpj/i],
      value: [/^\d{14}$/, /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/]
    }
  },
  
  // Email
  {
    hint: 'email',
    confidence: 0.9,
    patterns: {
      name: [/email|e-mail|mail/i],
      value: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/]
    }
  },
  
  // Telefone
  {
    hint: 'phone',
    confidence: 0.85,
    patterns: {
      name: [/telefone|phone|cel|celular|fone/i],
      value: [/^\d{10,11}$/, /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/]
    }
  },
  
  // CEP
  {
    hint: 'cep',
    confidence: 0.9,
    patterns: {
      name: [/cep|postal/i],
      value: [/^\d{8}$/, /^\d{5}-?\d{3}$/]
    }
  },
  
  // Data
  {
    hint: 'date',
    confidence: 0.8,
    patterns: {
      name: [/data|date|dt_|nascimento|vencimento/i],
      value: [/^\d{4}-\d{2}-\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/]
    }
  },
  
  // Datetime
  {
    hint: 'datetime',
    confidence: 0.85,
    patterns: {
      name: [/created_at|updated_at|timestamp|horario/i],
      value: [/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/]
    }
  },
  
  // Moeda
  {
    hint: 'currency',
    confidence: 0.8,
    patterns: {
      name: [/preco|valor|total|price|amount|custo|R\$/i],
      value: [/^\d+\.?\d{0,2}$/, /^R\$\s?\d+[.,]\d{2}$/]
    }
  },
  
  // Percentual
  {
    hint: 'percentage',
    confidence: 0.8,
    patterns: {
      name: [/desconto|percent|taxa|comissao|%/i],
      value: [/^0?\.\d+$/, /^\d{1,3}%$/, /^0\.\d+$/]
    }
  },
  
  // Boolean
  {
    hint: 'boolean',
    confidence: 0.85,
    patterns: {
      name: [/ativo|active|enabled|pago|entregue|bool/i],
      value: [/^(true|false)$/i, /^(1|0)$/],
      exact: ['true', 'false', '1', '0', 'sim', 'não', 'yes', 'no']
    }
  },
  
  // URL
  {
    hint: 'url',
    confidence: 0.9,
    patterns: {
      name: [/url|link|website|site/i],
      value: [/^https?:\/\/[^\s]+$/]
    }
  },
  
  // PDF
  {
    hint: 'pdf',
    confidence: 0.95,
    patterns: {
      name: [/pdf|documento|doc|arquivo/i],
      value: [/^https?:\/\/[^\s]+\.pdf$/i]
    }
  },
  
  // Cor
  {
    hint: 'color',
    confidence: 0.95,
    patterns: {
      name: [/cor|color|bg_|background/i],
      value: [/^#[0-9A-Fa-f]{6}$/, /^rgb\(/]
    }
  },
  
  // JSON
  {
    hint: 'json',
    confidence: 0.9,
    patterns: {
      name: [/config|metadata|json|dados/i],
      value: [/^[\[{].*[\]}]$/]
    }
  },
  
  // UUID
  {
    hint: 'uuid',
    confidence: 0.95,
    patterns: {
      name: [/id$/i],
      value: [/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i]
    }
  },
  
  // Números
  {
    hint: 'number',
    confidence: 0.6,
    patterns: {
      name: [/quantidade|qtd|num|count|idade/i],
      value: [/^-?\d+\.?\d*$/]
    }
  }
];

// =====================================================
// FUNÇÕES DE DETECÇÃO
// =====================================================

/**
 * Detecta automaticamente o tipo de uma coluna baseado no nome e valores
 */
export function autoDetectColumnType(
  columnName: string,
  sampleValues: string[]
): { hint: TypeHint; confidence: number } {
  
  // Filtrar valores não nulos/vazios
  const validValues = sampleValues.filter(v => v && v.trim() !== '');
  
  if (validValues.length === 0) {
    return { hint: 'text', confidence: 0.5 };
  }
  
  let bestMatch = { hint: 'text' as TypeHint, confidence: 0 };
  
  for (const pattern of TYPE_DETECTION_PATTERNS) {
    let confidence = 0;
    
    // Verificar nome da coluna
    if (pattern.patterns.name) {
      for (const nameRegex of pattern.patterns.name) {
        if (nameRegex.test(columnName)) {
          confidence += 0.4;
          break;
        }
      }
    }
    
    // Verificar valores exatos
    if (pattern.patterns.exact) {
      const exactMatches = validValues.filter(v => 
        pattern.patterns.exact!.some(exact => 
          v.toLowerCase() === exact.toLowerCase()
        )
      );
      if (exactMatches.length > 0) {
        confidence += (exactMatches.length / validValues.length) * 0.8;
      }
    }
    
    // Verificar padrões de valor
    if (pattern.patterns.value) {
      let matches = 0;
      for (const value of validValues) {
        if (pattern.patterns.value.some(regex => regex.test(value))) {
          matches++;
        }
      }
      
      if (matches > 0) {
        confidence += (matches / validValues.length) * 0.8;
      }
    }
    
    // Aplicar confiança base do padrão
    confidence *= pattern.confidence;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = { hint: pattern.hint, confidence };
    }
  }
  
  return bestMatch;
}

/**
 * Sugere opções para um campo select baseado nos valores únicos
 */
export function suggestSelectOptions(values: string[]): SelectOption[] {
  const uniqueValues = [...new Set(values.filter(v => v && v.trim() !== ''))];
  
  return uniqueValues.map(value => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
    color: generateColorForValue(value)
  }));
}

/**
 * Gera uma cor baseada em um valor (para consistency visual)
 */
function generateColorForValue(value: string): string {
  const colors = [
    'gray', 'red', 'orange', 'yellow', 'green', 
    'teal', 'blue', 'indigo', 'purple', 'pink'
  ];
  
  // Hash simples baseado no valor
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) & 0xffffffff;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Valida se um valor está de acordo com o type hint
 */
export function validateValue(
  value: string,
  hint: TypeHint,
  rules?: ValidationRules
): string | null {
  if (!value && rules?.required) {
    return 'Campo obrigatório';
  }
  
  if (!value) return null; // Válido se não obrigatório
  
  // Validações por tipo
  switch (hint) {
    case 'email':
      if (rules?.validateEmail !== false && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Email inválido';
      }
      break;
      
    case 'cpf':
      if (rules?.validateCPF !== false && !isValidCPF(value)) {
        return 'CPF inválido';
      }
      break;
      
    case 'cnpj':
      if (rules?.validateCNPJ !== false && !isValidCNPJ(value)) {
        return 'CNPJ inválido';
      }
      break;
      
    case 'number':
    case 'currency':
      const num = parseFloat(value);
      if (isNaN(num)) {
        return 'Deve ser um número válido';
      }
      if (rules?.min !== undefined && num < rules.min) {
        return `Valor mínimo: ${rules.min}`;
      }
      if (rules?.max !== undefined && num > rules.max) {
        return `Valor máximo: ${rules.max}`;
      }
      break;
      
    case 'url':
      if (rules?.validateURL !== false) {
        try {
          new URL(value);
        } catch {
          return 'URL inválida';
        }
      }
      break;
      
    case 'pdf':
      if (rules?.validateURL !== false) {
        try {
          const url = new URL(value);
          if (!value.toLowerCase().endsWith('.pdf')) {
            return 'URL deve terminar com .pdf';
          }
        } catch {
          return 'URL inválida';
        }
      }
      break;
  }
  
  // Validações gerais
  if (rules?.minLength && value.length < rules.minLength) {
    return `Mínimo ${rules.minLength} caracteres`;
  }
  
  if (rules?.maxLength && value.length > rules.maxLength) {
    return `Máximo ${rules.maxLength} caracteres`;
  }
  
  if (rules?.pattern) {
    const regex = typeof rules.pattern === 'string' 
      ? new RegExp(rules.pattern) 
      : rules.pattern;
    if (!regex.test(value)) {
      return 'Formato inválido';
    }
  }
  
  // Validação customizada
  if (rules?.custom) {
    return rules.custom(value);
  }
  
  return null;
}

// =====================================================
// UTILITÁRIOS DE VALIDAÇÃO
// =====================================================

function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  
  return digit === parseInt(cleaned.charAt(10));
}

function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  
  let digit = sum % 11;
  if (digit > 1) digit = 11 - digit;
  else digit = 0;
  if (digit !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  
  digit = sum % 11;
  if (digit > 1) digit = 11 - digit;
  else digit = 0;
  
  return digit === parseInt(cleaned.charAt(13));
}