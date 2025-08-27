/**
 * Formula configurations for TableEditorCanvas
 * Safe extraction - pure data structures
 */

/**
 * Excel-like formulas available in the formula helper
 */
export const EXCEL_FORMULAS = [
  { name: 'SOMA', syntax: '=SOMA(A1:A10)', description: 'Soma um intervalo de células', example: '=SOMA(B2:B10)' },
  { name: 'MÉDIA', syntax: '=MÉDIA(A1:A10)', description: 'Calcula a média de um intervalo', example: '=MÉDIA(C2:C10)' },
  { name: 'MÁXIMO', syntax: '=MÁXIMO(A1:A10)', description: 'Retorna o maior valor', example: '=MÁXIMO(D2:D10)' },
  { name: 'MÍNIMO', syntax: '=MÍNIMO(A1:A10)', description: 'Retorna o menor valor', example: '=MÍNIMO(E2:E10)' },
  { name: 'CONT.NÚM', syntax: '=CONT.NÚM(A1:A10)', description: 'Conta células com números', example: '=CONT.NÚM(F2:F10)' },
  { name: 'CONT.VALORES', syntax: '=CONT.VALORES(A1:A10)', description: 'Conta células não vazias', example: '=CONT.VALORES(G2:G10)' },
  { name: 'SE', syntax: '=SE(A1>10;"Maior";"Menor")', description: 'Retorna valor baseado em condição', example: '=SE(H2>100;"Alto";"Baixo")' },
  { name: 'PROCV', syntax: '=PROCV(A1;B:C;2;0)', description: 'Procura valor na vertical', example: '=PROCV(I2;J:K;2;FALSO)' },
  { name: 'CONCATENAR', syntax: '=CONCATENAR(A1;" ";B1)', description: 'Junta textos', example: '=CONCATENAR(L2;" - ";M2)' },
  { name: 'HOJE', syntax: '=HOJE()', description: 'Retorna a data atual', example: '=HOJE()' },
];

/**
 * Formula template mapping for auto-completion
 */
export const FORMULA_TEMPLATE_MAP: Record<string, string> = {
  'SOMA': '=SOMA()',
  'MÉDIA': '=MÉDIA()',
  'MÁXIMO': '=MÁXIMO()',
  'MÍNIMO': '=MÍNIMO()',
  'CONT.NÚM': '=CONT.NÚM()',
  'CONT.VALORES': '=CONT.VALORES()',
  'SE': '=SE(;"";"")',
  'PROCV': '=PROCV(;;2;FALSO)',
  'CONCATENAR': '=CONCATENAR(;)',
  'HOJE': '=HOJE()',
  'DEFAULT': '=FORMULA()'
};

/**
 * Formula window configuration
 */
export const FORMULA_WINDOW_CONFIG = {
  initialPosition: {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 450 : 100,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 300 : 100
  },
  dimensions: {
    width: 900,
    height: 600
  }
};

/**
 * Formula regex patterns
 */
export const FORMULA_PATTERNS = {
  cellReference: /([A-Z]+)(\d+)/g,
  rangeReference: /([A-Z]+)(\d+):([A-Z]+)(\d+)/g,
  formulaStart: /^=/,
};

/**
 * Formula UI messages
 */
export const FORMULA_MESSAGES = {
  noTableOpen: 'Abra uma tabela primeiro para usar fórmulas',
  promptText: 'Digite a fórmula (ex: =SUM(A1:A10), =AVERAGE(B1:B5))',
  placeholderText: 'Digite a fórmula (ex: =SUM(A1:A10) ou =A1+B1*2)',
  evaluationError: '#ERROR',
  invalidFormula: 'Fórmula inválida',
  circularReference: '#REF!',
};