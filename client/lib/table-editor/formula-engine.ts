/**
 * Formula Engine for Excel-like formulas
 * Supports basic math, text, date, and logical functions
 */

// Cell reference utilities
export function cellToCoords(cell: string): { row: number; col: number } | null {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const col = match[1].split('').reduce((acc, char) => {
    return acc * 26 + (char.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
  }, 0) - 1;
  
  const row = parseInt(match[2]) - 1;
  return { row, col };
}

export function coordsToCell(row: number, col: number): string {
  let colStr = '';
  col += 1;
  while (col > 0) {
    col -= 1;
    colStr = String.fromCharCode('A'.charCodeAt(0) + (col % 26)) + colStr;
    col = Math.floor(col / 26);
  }
  return colStr + (row + 1);
}

// Parse range like A1:B10
export function parseRange(range: string): { start: { row: number; col: number }; end: { row: number; col: number } } | null {
  const parts = range.split(':');
  if (parts.length !== 2) return null;
  
  const start = cellToCoords(parts[0].trim());
  const end = cellToCoords(parts[1].trim());
  
  if (!start || !end) return null;
  return { start, end };
}

// Get all cells in a range
export function getCellsInRange(range: string): string[] {
  const parsed = parseRange(range);
  if (!parsed) return [];
  
  const cells: string[] = [];
  for (let row = parsed.start.row; row <= parsed.end.row; row++) {
    for (let col = parsed.start.col; col <= parsed.end.col; col++) {
      cells.push(coordsToCell(row, col));
    }
  }
  return cells;
}

// Formula functions implementation
export const FormulafFunctions = {
  // Math functions
  SOMA: (values: number[]): number => {
    return values.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
  },
  
  MÉDIA: (values: number[]): number => {
    const validValues = values.filter(v => !isNaN(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  },
  
  MÍN: (values: number[]): number => {
    const validValues = values.filter(v => !isNaN(v));
    if (validValues.length === 0) return 0;
    return Math.min(...validValues);
  },
  
  MÁX: (values: number[]): number => {
    const validValues = values.filter(v => !isNaN(v));
    if (validValues.length === 0) return 0;
    return Math.max(...validValues);
  },
  
  CONT: (values: any[]): number => {
    return values.filter(v => v !== null && v !== undefined && v !== '').length;
  },
  
  ABS: (value: number): number => {
    return Math.abs(value);
  },
  
  ARRED: (value: number, digits: number = 0): number => {
    const multiplier = Math.pow(10, digits);
    return Math.round(value * multiplier) / multiplier;
  },
  
  POTÊNCIA: (base: number, exponent: number): number => {
    return Math.pow(base, exponent);
  },
  
  RAIZ: (value: number): number => {
    return Math.sqrt(value);
  },
  
  // Text functions
  CONCAT: (...values: any[]): string => {
    return values.map(v => String(v || '')).join('');
  },
  
  MAIÚSC: (text: string): string => {
    return String(text || '').toUpperCase();
  },
  
  MINÚSC: (text: string): string => {
    return String(text || '').toLowerCase();
  },
  
  ESQUERDA: (text: string, num: number): string => {
    return String(text || '').substring(0, num);
  },
  
  DIREITA: (text: string, num: number): string => {
    const str = String(text || '');
    return str.substring(str.length - num);
  },
  
  SUBSTITUIR: (text: string, oldText: string, newText: string): string => {
    return String(text || '').replace(new RegExp(oldText, 'g'), newText);
  },
  
  COMPRIMENTO: (text: string): number => {
    return String(text || '').length;
  },
  
  // Date functions
  HOJE: (): Date => {
    return new Date();
  },
  
  AGORA: (): Date => {
    return new Date();
  },
  
  DIA: (date: Date): number => {
    return new Date(date).getDate();
  },
  
  MÊS: (date: Date): number => {
    return new Date(date).getMonth() + 1;
  },
  
  ANO: (date: Date): number => {
    return new Date(date).getFullYear();
  },
  
  // Logical functions
  SE: (condition: boolean, valueIfTrue: any, valueIfFalse: any): any => {
    return condition ? valueIfTrue : valueIfFalse;
  },
  
  E: (...conditions: boolean[]): boolean => {
    return conditions.every(c => Boolean(c));
  },
  
  OU: (...conditions: boolean[]): boolean => {
    return conditions.some(c => Boolean(c));
  },
  
  NÃO: (condition: boolean): boolean => {
    return !Boolean(condition);
  },
  
  SEERRO: (value: any, valueIfError: any): any => {
    try {
      if (value instanceof Error) return valueIfError;
      return value;
    } catch {
      return valueIfError;
    }
  }
};

// Formula parser
export class FormulaParser {
  private gridData: Map<string, any>;
  private dependencies: Map<string, Set<string>>;
  
  constructor() {
    this.gridData = new Map();
    this.dependencies = new Map();
  }
  
  // Set cell value
  setCellValue(cell: string, value: any) {
    this.gridData.set(cell, value);
    
    // If it's a formula, parse dependencies
    if (typeof value === 'string' && value.startsWith('=')) {
      this.parseDependencies(cell, value);
    }
  }
  
  // Get cell value
  getCellValue(cell: string): any {
    const value = this.gridData.get(cell);
    
    if (typeof value === 'string' && value.startsWith('=')) {
      return this.evaluateFormula(value);
    }
    
    return value;
  }
  
  // Parse dependencies from formula
  private parseDependencies(cell: string, formula: string) {
    const deps = new Set<string>();
    
    // Match cell references (A1, B2, etc.)
    const cellRefs = formula.match(/[A-Z]+\d+/g) || [];
    cellRefs.forEach(ref => deps.add(ref));
    
    // Match ranges (A1:B10)
    const ranges = formula.match(/[A-Z]+\d+:[A-Z]+\d+/g) || [];
    ranges.forEach(range => {
      getCellsInRange(range).forEach(cell => deps.add(cell));
    });
    
    this.dependencies.set(cell, deps);
  }
  
  // Get cells that depend on a given cell
  getDependents(cell: string): Set<string> {
    const dependents = new Set<string>();
    
    this.dependencies.forEach((deps, dependentCell) => {
      if (deps.has(cell)) {
        dependents.add(dependentCell);
      }
    });
    
    return dependents;
  }
  
  // Evaluate a formula
  evaluateFormula(formula: string): any {
    if (!formula.startsWith('=')) return formula;
    
    let expression = formula.substring(1);
    
    // Replace cell references with values
    const cellRefs = expression.match(/[A-Z]+\d+/g) || [];
    cellRefs.forEach(ref => {
      const value = this.gridData.get(ref);
      const processedValue = typeof value === 'string' && value.startsWith('=') 
        ? this.evaluateFormula(value)
        : value;
      
      expression = expression.replace(
        new RegExp(`\\b${ref}\\b`, 'g'),
        JSON.stringify(processedValue ?? 0)
      );
    });
    
    // Replace ranges with arrays
    const ranges = expression.match(/[A-Z]+\d+:[A-Z]+\d+/g) || [];
    ranges.forEach(range => {
      const cells = getCellsInRange(range);
      const values = cells.map(cell => {
        const value = this.gridData.get(cell);
        return typeof value === 'string' && value.startsWith('=')
          ? this.evaluateFormula(value)
          : value;
      });
      
      expression = expression.replace(range, JSON.stringify(values));
    });
    
    // Replace function calls
    Object.keys(FormulafFunctions).forEach(funcName => {
      const regex = new RegExp(`${funcName}\\s*\\(`, 'g');
      expression = expression.replace(regex, `FormulafFunctions.${funcName}(`);
    });
    
    try {
      // Evaluate the expression
      // In production, use a proper expression evaluator for security
      const result = new Function('FormulafFunctions', `return ${expression}`)(FormulafFunctions);
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERRO!';
    }
  }
  
  // Recalculate all formulas
  recalculateAll() {
    const formulaCells = Array.from(this.gridData.entries())
      .filter(([_, value]) => typeof value === 'string' && value.startsWith('='))
      .map(([cell]) => cell);
    
    // Sort by dependencies (topological sort)
    const sorted = this.topologicalSort(formulaCells);
    
    // Recalculate in order
    const results = new Map<string, any>();
    sorted.forEach(cell => {
      const formula = this.gridData.get(cell);
      if (formula) {
        results.set(cell, this.evaluateFormula(formula));
      }
    });
    
    return results;
  }
  
  // Topological sort for dependency resolution
  private topologicalSort(cells: string[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    
    const visit = (cell: string) => {
      if (visited.has(cell)) return;
      visited.add(cell);
      
      const deps = this.dependencies.get(cell) || new Set();
      deps.forEach(dep => {
        if (cells.includes(dep)) {
          visit(dep);
        }
      });
      
      result.push(cell);
    };
    
    cells.forEach(cell => visit(cell));
    return result;
  }
  
  // Clear all data
  clear() {
    this.gridData.clear();
    this.dependencies.clear();
  }
}

// Export singleton instance
export const formulaEngine = new FormulaParser();