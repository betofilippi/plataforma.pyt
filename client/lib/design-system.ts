/**
 * PLATAFORMA.APP DESIGN SYSTEM
 * Padrões visuais unificados para todo o sistema de janelas
 */

// ===========================================
// CORES E TRANSPARÊNCIAS
// ===========================================

export const designSystem = {
  // Cores base das janelas (copiado do Window.tsx do planilha.app)
  window: {
    background: "bg-gray-900", // Fundo principal da janela
    border: "border border-gray-700", // Borda da janela
    header: {
      background: "bg-gray-900/95 backdrop-blur-md", // Fundo do header (mesma cor da toolbar)
      border: "border-b border-gray-700/50", // Borda do header
      text: "text-white", // Texto do título
    },
    content: {
      background: "bg-black/10 backdrop-blur-sm", // Fundo translúcido do conteúdo
      overlay: "bg-black/10 backdrop-blur-sm", // Overlay padrão
    },
    shadow: "shadow-2xl", // Sombra da janela
    rounded: "rounded-lg", // Bordas arredondadas
  },

  // Cards internos (seções dentro das janelas)
  card: {
    background: "bg-white/10 backdrop-blur-md", // Fundo translúcido
    border: "border border-white/20", // Borda sutil
    rounded: "rounded-xl", // Bordas mais arredondadas que a janela
    padding: "p-6", // Padding interno padrão
  },

  // Botões padronizados
  buttons: {
    primary: {
      className: "bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white",
      transition: "transition-all duration-200"
    },
    secondary: {
      className: "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white",
      transition: "transition-all duration-200"
    },
    success: {
      className: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white",
      transition: "transition-all duration-200"
    },
    danger: {
      className: "bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white",
      transition: "transition-all duration-200"
    },
    warning: {
      className: "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white",
      transition: "transition-all duration-200"
    }
  },

  // Inputs e formulários
  inputs: {
    base: "w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200",
    select: "w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
    textarea: "w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
  },

  // Labels e textos
  text: {
    title: "text-lg font-semibold text-white", // Títulos de seções
    label: "text-white", // Labels de campos
    description: "text-xs text-gray-400", // Descrições
    error: "text-red-300 text-sm", // Mensagens de erro
    success: "text-green-300 text-sm", // Mensagens de sucesso
  },

  // Tabs (abas)
  tabs: {
    container: "w-full",
    list: "grid w-full bg-white/10 rounded-xl p-1",
    trigger: "data-[state=active]:bg-purple-700 data-[state=active]:text-white rounded-lg transition-colors",
    content: "mt-6 space-y-6"
  },

  // Toggle switches
  toggle: {
    container: "w-12 h-6 rounded-full transition-colors cursor-pointer",
    active: "bg-purple-600",
    inactive: "bg-gray-600",
    thumb: "w-5 h-5 bg-white rounded-full transition-transform",
    thumbActive: "translate-x-6",
    thumbInactive: "translate-x-1"
  },

  // Espacamentos e layouts
  spacing: {
    section: "space-y-6", // Espaçamento entre seções
    cardContent: "space-y-4", // Espaçamento dentro dos cards
    buttonGroup: "flex space-x-2", // Grupo de botões
    gridCols2: "grid grid-cols-2 gap-4",
    gridCols3: "grid grid-cols-3 gap-4",
  },

  // Animações e transições
  animations: {
    fadeIn: "animate-in fade-in duration-200",
    slideIn: "animate-in slide-in-from-bottom duration-300",
    scaleIn: "animate-in scale-in duration-200",
  }
};

// ===========================================
// HELPERS PARA COMBINAR CLASSES
// ===========================================

export function createWindowCard(additionalClasses = "") {
  return `${designSystem.card.background} ${designSystem.card.border} ${designSystem.card.rounded} ${designSystem.card.padding} ${additionalClasses}`.trim();
}

export function createButton(type: keyof typeof designSystem.buttons, additionalClasses = "") {
  const buttonStyle = designSystem.buttons[type];
  
  // Se o tipo de botão não existir, usar o primary como fallback
  if (!buttonStyle) {
    console.warn(`Button type "${type}" not found in design system, using primary as fallback`);
    const fallbackStyle = designSystem.buttons.primary;
    return `${fallbackStyle.className} ${fallbackStyle.transition} ${additionalClasses}`.trim();
  }
  
  return `${buttonStyle.className} ${buttonStyle.transition} ${additionalClasses}`.trim();
}

export function createInput(additionalClasses = "") {
  return `${designSystem.inputs.base} ${additionalClasses}`.trim();
}

// ===========================================
// VARIÁVEIS CSS PERSONALIZADAS
// ===========================================

export const cssVariables = `
  --window-bg: rgb(17 24 39); /* gray-900 */
  --window-border: rgb(55 65 81); /* gray-700 */
  --window-header-bg: rgb(31 41 55); /* gray-800 */
  --card-bg: rgba(255, 255, 255, 0.1);
  --card-border: rgba(255, 255, 255, 0.2);
  --content-overlay: rgba(0, 0, 0, 0.1);
  
  --primary-gradient: linear-gradient(to right, rgb(126 34 206), rgb(107 33 168));
  --primary-gradient-hover: linear-gradient(to right, rgb(107 33 168), rgb(88 28 135));
  
  --secondary-gradient: linear-gradient(to right, rgb(75 85 99), rgb(55 65 81));
  --secondary-gradient-hover: linear-gradient(to right, rgb(55 65 81), rgb(31 41 55));
  
  --success-gradient: linear-gradient(to right, rgb(22 163 74), rgb(21 128 61));
  --danger-gradient: linear-gradient(to right, rgb(185 28 28), rgb(153 27 27));
`;

export default designSystem;