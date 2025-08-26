import React, { useState } from 'react';
import { 
  FunctionSquare, 
  Calculator,
  Hash,
  Type,
  Calendar,
  Percent,
  TrendingUp,
  DollarSign,
  Binary,
  X
} from 'lucide-react';
import { WindowCard, WindowButton } from '@/components/ui';

interface FormulaHelperProps {
  onSelectFormula: (formula: string) => void;
  onClose?: () => void;
}

const excelFormulas = [
  { 
    name: 'SOMA', 
    syntax: '=SOMA(A1:A10)', 
    description: 'Soma um intervalo de células', 
    example: '=SOMA(B2:B10)',
    icon: Calculator,
    category: 'Matemática'
  },
  { 
    name: 'MÉDIA', 
    syntax: '=MÉDIA(A1:A10)', 
    description: 'Calcula a média de um intervalo', 
    example: '=MÉDIA(C2:C10)',
    icon: TrendingUp,
    category: 'Estatística'
  },
  { 
    name: 'MÁXIMO', 
    syntax: '=MÁXIMO(A1:A10)', 
    description: 'Retorna o maior valor', 
    example: '=MÁXIMO(D2:D10)',
    icon: TrendingUp,
    category: 'Estatística'
  },
  { 
    name: 'MÍNIMO', 
    syntax: '=MÍNIMO(A1:A10)', 
    description: 'Retorna o menor valor', 
    example: '=MÍNIMO(E2:E10)',
    icon: TrendingUp,
    category: 'Estatística'
  },
  { 
    name: 'CONT.NÚM', 
    syntax: '=CONT.NÚM(A1:A10)', 
    description: 'Conta células com números', 
    example: '=CONT.NÚM(F2:F10)',
    icon: Hash,
    category: 'Estatística'
  },
  { 
    name: 'CONT.VALORES', 
    syntax: '=CONT.VALORES(A1:A10)', 
    description: 'Conta células não vazias', 
    example: '=CONT.VALORES(G2:G10)',
    icon: Hash,
    category: 'Estatística'
  },
  { 
    name: 'SE', 
    syntax: '=SE(A1>10;"Sim";"Não")', 
    description: 'Retorna valores condicionais', 
    example: '=SE(H2>100;"Alto";"Baixo")',
    icon: Binary,
    category: 'Lógica'
  },
  { 
    name: 'PROCV', 
    syntax: '=PROCV(A1;B:D;3;FALSO)', 
    description: 'Procura valor na vertical', 
    example: '=PROCV(I2;A:C;2;0)',
    icon: FunctionSquare,
    category: 'Pesquisa'
  },
  { 
    name: 'CONCATENAR', 
    syntax: '=CONCATENAR(A1;" ";B1)', 
    description: 'Une textos de células', 
    example: '=CONCATENAR(J2;" - ";K2)',
    icon: Type,
    category: 'Texto'
  },
  { 
    name: 'HOJE', 
    syntax: '=HOJE()', 
    description: 'Retorna a data atual', 
    example: '=HOJE()',
    icon: Calendar,
    category: 'Data'
  }
];

export function FormulaHelper({ onSelectFormula, onClose }: FormulaHelperProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['Todas', ...Array.from(new Set(excelFormulas.map(f => f.category)))];
  
  const filteredFormulas = excelFormulas.filter(formula => {
    const matchesCategory = selectedCategory === 'Todas' || formula.category === selectedCategory;
    const matchesSearch = formula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          formula.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFormulaSelect = (formulaName: string) => {
    // Insere a fórmula completa com parênteses
    let formulaTemplate = `=${formulaName}()`;
    
    // Para fórmulas específicas, adiciona templates especiais
    if (formulaName === 'SE') {
      formulaTemplate = `=${formulaName}(;;)`;
    } else if (formulaName === 'PROCV') {
      formulaTemplate = `=${formulaName}(;;;)`;
    } else if (formulaName === 'CONCATENAR') {
      formulaTemplate = `=${formulaName}(;)`;
    } else if (formulaName === 'HOJE') {
      formulaTemplate = `=${formulaName}()`;
    }
    
    onSelectFormula(formulaTemplate);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FunctionSquare className="w-5 h-5 text-purple-400" />
            Assistente de Fórmulas
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Search */}
        <input
          type="text"
          placeholder="Buscar fórmula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        
        {/* Category Filter */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Formula List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid gap-3">
          {filteredFormulas.map((formula) => {
            const Icon = formula.icon;
            return (
              <WindowCard
                key={formula.name}
                className="cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleFormulaSelect(formula.name)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-white">{formula.name}</h4>
                      <span className="text-xs text-gray-500">{formula.category}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{formula.description}</p>
                    <div className="space-y-1">
                      <div className="font-mono text-xs bg-gray-800 px-2 py-1 rounded text-green-400">
                        {formula.syntax}
                      </div>
                      <div className="text-xs text-gray-500">
                        Exemplo: <span className="font-mono text-blue-400">{formula.example}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </WindowCard>
            );
          })}
        </div>
      </div>

      {/* Footer with tips */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="text-xs text-gray-400">
          <p className="mb-1">💡 Dica: Clique em uma fórmula para inseri-la na célula selecionada</p>
          <p>📝 Use TAB para navegar entre os argumentos da fórmula</p>
        </div>
      </div>
    </div>
  );
}