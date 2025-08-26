/**
 * Sistema de Cores dos Módulos
 * Cada módulo tem sua cor única que é usada em todos os seus componentes
 */

export interface ModuleColor {
  primary: string;      // Cor principal (hex)
  secondary: string;    // Cor secundária
  accent: string;       // Cor de destaque
  gradient: string;     // Gradiente para backgrounds
  rgba: {
    light: string;      // RGBA com transparência leve (0.1)
    medium: string;     // RGBA com transparência média (0.3)
    strong: string;     // RGBA com transparência forte (0.5)
  };
}

export const MODULE_COLORS: Record<string, ModuleColor> = {
  // Core Principal - Roxo
  plataforma: {
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    accent: '#A78BFA',
    gradient: 'from-purple-600 to-purple-700',
    rgba: {
      light: 'rgba(139, 92, 246, 0.1)',
      medium: 'rgba(139, 92, 246, 0.3)',
      strong: 'rgba(139, 92, 246, 0.5)'
    }
  },
  
  // Database - Verde Esmeralda
  database: {
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399',
    gradient: 'from-emerald-600 to-emerald-700',
    rgba: {
      light: 'rgba(16, 185, 129, 0.1)',
      medium: 'rgba(16, 185, 129, 0.3)',
      strong: 'rgba(16, 185, 129, 0.5)'
    }
  },
  
  
  // Sistema - Laranja
  sistema: {
    primary: '#F97316',
    secondary: '#EA580C',
    accent: '#FB923C',
    gradient: 'from-orange-600 to-orange-700',
    rgba: {
      light: 'rgba(249, 115, 22, 0.1)',
      medium: 'rgba(249, 115, 22, 0.3)',
      strong: 'rgba(249, 115, 22, 0.5)'
    }
  },
  
  // Public - Cinza Azulado (neutro)
  public: {
    primary: '#64748B',
    secondary: '#475569',
    accent: '#94A3B8',
    gradient: 'from-slate-600 to-slate-700',
    rgba: {
      light: 'rgba(100, 116, 139, 0.1)',
      medium: 'rgba(100, 116, 139, 0.3)',
      strong: 'rgba(100, 116, 139, 0.5)'
    }
  },
  
  // Futuras cores para outros módulos
  administrativo: {
    primary: '#EF4444',
    secondary: '#DC2626',
    accent: '#F87171',
    gradient: 'from-red-600 to-red-700',
    rgba: {
      light: 'rgba(239, 68, 68, 0.1)',
      medium: 'rgba(239, 68, 68, 0.3)',
      strong: 'rgba(239, 68, 68, 0.5)'
    }
  },
  
  estoques: {
    primary: '#14B8A6',
    secondary: '#0D9488',
    accent: '#2DD4BF',
    gradient: 'from-teal-600 to-teal-700',
    rgba: {
      light: 'rgba(20, 184, 166, 0.1)',
      medium: 'rgba(20, 184, 166, 0.3)',
      strong: 'rgba(20, 184, 166, 0.5)'
    }
  },
  
  faturamento: {
    primary: '#84CC16',
    secondary: '#65A30D',
    accent: '#A3E635',
    gradient: 'from-lime-600 to-lime-700',
    rgba: {
      light: 'rgba(132, 204, 22, 0.1)',
      medium: 'rgba(132, 204, 22, 0.3)',
      strong: 'rgba(132, 204, 22, 0.5)'
    }
  },
  
  loja: {
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    gradient: 'from-pink-600 to-pink-700',
    rgba: {
      light: 'rgba(236, 72, 153, 0.1)',
      medium: 'rgba(236, 72, 153, 0.3)',
      strong: 'rgba(236, 72, 153, 0.5)'
    }
  },
  
  produtos: {
    primary: '#A855F7',
    secondary: '#9333EA',
    accent: '#C084FC',
    gradient: 'from-violet-600 to-violet-700',
    rgba: {
      light: 'rgba(168, 85, 247, 0.1)',
      medium: 'rgba(168, 85, 247, 0.3)',
      strong: 'rgba(168, 85, 247, 0.5)'
    }
  },
  
  suporte: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    accent: '#818CF8',
    gradient: 'from-indigo-600 to-indigo-700',
    rgba: {
      light: 'rgba(99, 102, 241, 0.1)',
      medium: 'rgba(99, 102, 241, 0.3)',
      strong: 'rgba(99, 102, 241, 0.5)'
    }
  },
  
  transportadora: {
    primary: '#FACC15',
    secondary: '#EAB308',
    accent: '#FDE047',
    gradient: 'from-yellow-600 to-yellow-700',
    rgba: {
      light: 'rgba(250, 204, 21, 0.1)',
      medium: 'rgba(250, 204, 21, 0.3)',
      strong: 'rgba(250, 204, 21, 0.5)'
    }
  },
  
  juridico: {
    primary: '#78716C',
    secondary: '#57534E',
    accent: '#A8A29E',
    gradient: 'from-stone-600 to-stone-700',
    rgba: {
      light: 'rgba(120, 113, 108, 0.1)',
      medium: 'rgba(120, 113, 108, 0.3)',
      strong: 'rgba(120, 113, 108, 0.5)'
    }
  },
  
  // Novos módulos criados
  ia: {
    primary: '#22C55E',
    secondary: '#16A34A',
    accent: '#4ADE80',
    gradient: 'from-green-600 to-green-700',
    rgba: {
      light: 'rgba(34, 197, 94, 0.1)',
      medium: 'rgba(34, 197, 94, 0.3)',
      strong: 'rgba(34, 197, 94, 0.5)'
    }
  },
  
  montagem: {
    primary: '#FF6B35',
    secondary: '#E55A2B',
    accent: '#FF8A5B',
    gradient: 'from-orange-500 to-orange-600',
    rgba: {
      light: 'rgba(255, 107, 53, 0.1)',
      medium: 'rgba(255, 107, 53, 0.3)',
      strong: 'rgba(255, 107, 53, 0.5)'
    }
  },
  
  vendas: {
    primary: '#E91E63',
    secondary: '#C2185B',
    accent: '#F06292',
    gradient: 'from-pink-600 to-pink-700',
    rgba: {
      light: 'rgba(233, 30, 99, 0.1)',
      medium: 'rgba(233, 30, 99, 0.3)',
      strong: 'rgba(233, 30, 99, 0.5)'
    }
  },
  
  rh: {
    primary: '#DC2626',
    secondary: '#B91C1C',
    accent: '#EF4444',
    gradient: 'from-red-600 to-red-700',
    rgba: {
      light: 'rgba(220, 38, 38, 0.1)',
      medium: 'rgba(220, 38, 38, 0.3)',
      strong: 'rgba(220, 38, 38, 0.5)'
    }
  },
  
  financeiro: {
    primary: '#166534',
    secondary: '#14532D',
    accent: '#22C55E',
    gradient: 'from-green-800 to-green-900',
    rgba: {
      light: 'rgba(22, 101, 52, 0.1)',
      medium: 'rgba(22, 101, 52, 0.3)',
      strong: 'rgba(22, 101, 52, 0.5)'
    }
  },
  
  expedicao: {
    primary: '#F59E0B',
    secondary: '#D97706',
    accent: '#FCD34D',
    gradient: 'from-amber-500 to-amber-600',
    rgba: {
      light: 'rgba(245, 158, 11, 0.1)',
      medium: 'rgba(245, 158, 11, 0.3)',
      strong: 'rgba(245, 158, 11, 0.5)'
    }
  },
  
  tributario: {
    primary: '#6B7280',
    secondary: '#4B5563',
    accent: '#9CA3AF',
    gradient: 'from-gray-500 to-gray-600',
    rgba: {
      light: 'rgba(107, 114, 128, 0.1)',
      medium: 'rgba(107, 114, 128, 0.3)',
      strong: 'rgba(107, 114, 128, 0.5)'
    }
  },
  
  marketing: {
    primary: '#06B6D4',
    secondary: '#0891B2',
    accent: '#22D3EE',
    gradient: 'from-cyan-500 to-cyan-600',
    rgba: {
      light: 'rgba(6, 182, 212, 0.1)',
      medium: 'rgba(6, 182, 212, 0.3)',
      strong: 'rgba(6, 182, 212, 0.5)'
    }
  },
  
  cadastros: {
    primary: '#1E40AF',
    secondary: '#1E3A8A',
    accent: '#3B82F6',
    gradient: 'from-blue-800 to-blue-900',
    rgba: {
      light: 'rgba(30, 64, 175, 0.1)',
      medium: 'rgba(30, 64, 175, 0.3)',
      strong: 'rgba(30, 64, 175, 0.5)'
    }
  },
  
  // estoque usa a cor teal já existente
  estoque: {
    primary: '#14B8A6',
    secondary: '#0D9488',
    accent: '#2DD4BF',
    gradient: 'from-teal-600 to-teal-700',
    rgba: {
      light: 'rgba(20, 184, 166, 0.1)',
      medium: 'rgba(20, 184, 166, 0.3)',
      strong: 'rgba(20, 184, 166, 0.5)'
    }
  },
  
  // lojas usa a cor existente loja
  lojas: {
    primary: '#EC4899',
    secondary: '#DB2777',
    accent: '#F472B6',
    gradient: 'from-pink-600 to-pink-700',
    rgba: {
      light: 'rgba(236, 72, 153, 0.1)',
      medium: 'rgba(236, 72, 153, 0.3)',
      strong: 'rgba(236, 72, 153, 0.5)'
    }
  },

  comunicacao: {
    primary: '#0EA5E9',
    secondary: '#0284C7',
    accent: '#38BDF8',
    gradient: 'from-sky-600 to-sky-700',
    rgba: {
      light: 'rgba(14, 165, 233, 0.1)',
      medium: 'rgba(14, 165, 233, 0.3)',
      strong: 'rgba(14, 165, 233, 0.5)'
    }
  }
};

/**
 * Retorna a cor do módulo baseado no nome do schema ou módulo
 */
export function getModuleColor(moduleOrSchema: string): ModuleColor {
  // Remove sufixos como _app se houver
  const normalizedName = moduleOrSchema.toLowerCase().replace(/_app$/, '');
  
  return MODULE_COLORS[normalizedName] || MODULE_COLORS.plataforma;
}

/**
 * Retorna apenas a cor primária do módulo
 */
export function getModulePrimaryColor(moduleOrSchema: string): string {
  return getModuleColor(moduleOrSchema).primary;
}

/**
 * Hook para usar as cores do módulo atual
 */
export function useModuleColors(moduleOrSchema: string) {
  return getModuleColor(moduleOrSchema);
}