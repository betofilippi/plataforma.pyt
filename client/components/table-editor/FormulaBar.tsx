import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FunctionSquare,
  Calculator,
  Sigma,
  Hash,
  Type,
  Calendar,
  CheckSquare,
  ChevronDown,
  X,
  Check,
  Info
} from 'lucide-react';

// Funções disponíveis
const FUNCTIONS = {
  MATH: [
    { name: 'SOMA', syntax: 'SOMA(range)', description: 'Soma valores em um intervalo' },
    { name: 'MÉDIA', syntax: 'MÉDIA(range)', description: 'Calcula a média dos valores' },
    { name: 'MÍN', syntax: 'MÍN(range)', description: 'Retorna o menor valor' },
    { name: 'MÁX', syntax: 'MÁX(range)', description: 'Retorna o maior valor' },
    { name: 'CONT', syntax: 'CONT(range)', description: 'Conta células não vazias' },
    { name: 'ABS', syntax: 'ABS(número)', description: 'Valor absoluto' },
    { name: 'ARRED', syntax: 'ARRED(número, dígitos)', description: 'Arredonda um número' },
    { name: 'POTÊNCIA', syntax: 'POTÊNCIA(base, expoente)', description: 'Eleva à potência' },
    { name: 'RAIZ', syntax: 'RAIZ(número)', description: 'Raiz quadrada' }
  ],
  TEXT: [
    { name: 'CONCAT', syntax: 'CONCAT(texto1, texto2, ...)', description: 'Concatena textos' },
    { name: 'MAIÚSC', syntax: 'MAIÚSC(texto)', description: 'Converte para maiúsculas' },
    { name: 'MINÚSC', syntax: 'MINÚSC(texto)', description: 'Converte para minúsculas' },
    { name: 'ESQUERDA', syntax: 'ESQUERDA(texto, num)', description: 'Extrai caracteres da esquerda' },
    { name: 'DIREITA', syntax: 'DIREITA(texto, num)', description: 'Extrai caracteres da direita' },
    { name: 'SUBSTITUIR', syntax: 'SUBSTITUIR(texto, antigo, novo)', description: 'Substitui texto' }
  ],
  DATE: [
    { name: 'HOJE', syntax: 'HOJE()', description: 'Data atual' },
    { name: 'AGORA', syntax: 'AGORA()', description: 'Data e hora atual' },
    { name: 'DIA', syntax: 'DIA(data)', description: 'Extrai o dia' },
    { name: 'MÊS', syntax: 'MÊS(data)', description: 'Extrai o mês' },
    { name: 'ANO', syntax: 'ANO(data)', description: 'Extrai o ano' }
  ],
  LOGIC: [
    { name: 'SE', syntax: 'SE(condição, verdadeiro, falso)', description: 'Condicional' },
    { name: 'E', syntax: 'E(cond1, cond2, ...)', description: 'Todas as condições verdadeiras' },
    { name: 'OU', syntax: 'OU(cond1, cond2, ...)', description: 'Pelo menos uma condição verdadeira' },
    { name: 'NÃO', syntax: 'NÃO(condição)', description: 'Inverte o valor lógico' }
  ]
};

interface FormulaBarProps {
  selectedCell?: { row: number; col: string; value?: any } | null;
  onFormulaChange?: (formula: string) => void;
  onFormulaSubmit?: (formula: string) => void;
  className?: string;
}

export default function FormulaBar({
  selectedCell,
  onFormulaChange,
  onFormulaSubmit,
  className = ''
}: FormulaBarProps) {
  const [formula, setFormula] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showFunctionHelper, setShowFunctionHelper] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cellReference, setCellReference] = useState('');

  useEffect(() => {
    if (selectedCell) {
      setCellReference(`${selectedCell.col}${selectedCell.row}`);
      
      // If cell has a formula, show it; otherwise show the value
      if (typeof selectedCell.value === 'string' && selectedCell.value.startsWith('=')) {
        setFormula(selectedCell.value);
      } else {
        setFormula(selectedCell.value?.toString() || '');
      }
    } else {
      setCellReference('');
      setFormula('');
    }
  }, [selectedCell]);

  // Auto-suggest functions as user types
  useEffect(() => {
    if (formula.startsWith('=')) {
      const searchTerm = formula.slice(1).toUpperCase();
      if (searchTerm.length > 0) {
        const allFunctions = [
          ...FUNCTIONS.MATH,
          ...FUNCTIONS.TEXT,
          ...FUNCTIONS.DATE,
          ...FUNCTIONS.LOGIC
        ];
        
        const filtered = allFunctions.filter(fn =>
          fn.name.startsWith(searchTerm)
        );
        
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  }, [formula]);

  const handleFormulaChange = (value: string) => {
    setFormula(value);
    onFormulaChange?.(value);
  };

  const handleSubmit = () => {
    if (formula) {
      onFormulaSubmit?.(formula);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (suggestions[selectedSuggestion]) {
          e.preventDefault();
          insertFunction(suggestions[selectedSuggestion]);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setFormula(selectedCell?.value?.toString() || '');
    }
  };

  const insertFunction = (fn: any) => {
    const baseFormula = formula.startsWith('=') ? '=' : '=';
    setFormula(`${baseFormula}${fn.name}()`);
    setShowSuggestions(false);
    
    // Move cursor inside parentheses
    setTimeout(() => {
      if (inputRef.current) {
        const pos = formula.length + fn.name.length + 1;
        inputRef.current.setSelectionRange(pos, pos);
        inputRef.current.focus();
      }
    }, 0);
  };

  const getCellTypeIcon = () => {
    if (!selectedCell?.value) return null;
    
    const value = selectedCell.value;
    if (typeof value === 'string' && value.startsWith('=')) {
      return <FunctionSquare className="w-4 h-4 text-cyan-400" />;
    } else if (typeof value === 'number') {
      return <Hash className="w-4 h-4 text-green-400" />;
    } else if (typeof value === 'boolean') {
      return <CheckSquare className="w-4 h-4 text-purple-400" />;
    } else if (value instanceof Date) {
      return <Calendar className="w-4 h-4 text-orange-400" />;
    } else {
      return <Type className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/10 backdrop-blur-sm">
        {/* Cell Reference */}
        <div className="flex items-center gap-2 min-w-[100px]">
          {getCellTypeIcon()}
          <input
            type="text"
            value={cellReference}
            readOnly
            className="w-20 px-2 py-1 bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white text-center font-mono"
            placeholder="--"
          />
        </div>

        {/* Function Button */}
        <button
          onClick={() => setShowFunctionHelper(!showFunctionHelper)}
          className="p-1.5 hover:bg-white/[0.075] rounded-lg transition-colors"
          title="Inserir Função"
        >
          <FunctionSquare className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="w-px h-6 bg-white/10" />

        {/* Formula Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={formula}
            onChange={(e) => handleFormulaChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCell ? "Digite uma fórmula ou valor" : "Selecione uma célula"}
            disabled={!selectedCell}
            className="w-full px-3 py-1.5 bg-white/[0.05] border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 font-mono focus:outline-none focus:border-cyan-400/40 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          
          {/* Clear button */}
          {formula && (
            <button
              onClick={() => setFormula('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* Submit/Cancel */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSubmit}
            disabled={!formula}
            className="p-1.5 hover:bg-green-600/20 rounded-lg transition-colors disabled:opacity-50"
            title="Aplicar (Enter)"
          >
            <Check className="w-4 h-4 text-green-400" />
          </button>
          <button
            onClick={() => setFormula(selectedCell?.value?.toString() || '')}
            className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
            title="Cancelar (Esc)"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Function Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-[140px] mt-1 w-96 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((fn, index) => (
              <div
                key={fn.name}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  index === selectedSuggestion
                    ? 'bg-cyan-600/20 border-l-2 border-cyan-400'
                    : 'hover:bg-white/[0.05]'
                }`}
                onClick={() => insertFunction(fn)}
              >
                <div className="flex items-start gap-2">
                  <FunctionSquare className="w-4 h-4 text-cyan-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white font-mono">
                      {fn.syntax}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {fn.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Function Helper Panel */}
      {showFunctionHelper && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/20 rounded-xl shadow-2xl z-40 backdrop-blur-md">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Funções Disponíveis</h3>
              <button
                onClick={() => setShowFunctionHelper(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(FUNCTIONS).map(([category, functions]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-cyan-400 mb-2">
                    {category === 'MATH' ? 'Matemática' :
                     category === 'TEXT' ? 'Texto' :
                     category === 'DATE' ? 'Data/Hora' : 'Lógica'}
                  </h4>
                  <div className="space-y-1">
                    {functions.slice(0, 4).map(fn => (
                      <button
                        key={fn.name}
                        onClick={() => {
                          insertFunction(fn);
                          setShowFunctionHelper(false);
                        }}
                        className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.05] rounded transition-colors font-mono"
                      >
                        ={fn.name}()
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-3 h-3" />
                <span>Use = para iniciar uma fórmula. Ex: =SOMA(A1:A10)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}