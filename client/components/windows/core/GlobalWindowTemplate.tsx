/**
 * GlobalWindowTemplate - Template unificado que aplica mudanças em todas as janelas
 * Alterações aqui são refletidas em TODAS as janelas do sistema
 */

import React, { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { X, Minus, Maximize2, Minimize2, Settings, MoreVertical } from 'lucide-react';
import { useWindowManager } from '../WindowManager';
import { WindowStyling, WindowBehavior } from './WindowFactory';

// ============================================================================
// CONTEXTO GLOBAL DE TEMPLATE
// ============================================================================

interface GlobalTemplateConfig {
  // Estrutura da janela
  showHeader: boolean;
  showFooter: boolean;
  showActions: boolean;
  headerHeight: number;
  footerHeight: number;
  
  // Estilo visual
  styling: WindowStyling & {
    glassmorphism: boolean;
    shadowIntensity: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    animation: 'none' | 'fade' | 'slide' | 'scale';
  };
  
  // Comportamento
  behavior: WindowBehavior & {
    doubleClickMaximize: boolean;
    shakeToMinimize: boolean;
    snapToEdges: boolean;
    magneticBorders: boolean;
  };
  
  // Performance
  enableTransitions: boolean;
  enableShadows: boolean;
  enableBlur: boolean;
}

const DEFAULT_TEMPLATE_CONFIG: GlobalTemplateConfig = {
  showHeader: true,
  showFooter: false,
  showActions: true,
  headerHeight: 40,
  footerHeight: 32,
  
  styling: {
    glassmorphism: true,
    shadowIntensity: 'lg',
    borderRadius: 'lg',
    animation: 'scale',
    headerColor: 'rgba(31, 41, 55, 0.8)',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.98,
    blur: 12
  },
  
  behavior: {
    doubleClickMaximize: true,
    shakeToMinimize: false,
    snapToEdges: true,
    magneticBorders: true,
    autoFocus: true,
    modal: false,
    alwaysOnTop: false,
    closeOnEscape: false,
    closeOnClickOutside: false
  },
  
  enableTransitions: true,
  enableShadows: true,
  enableBlur: true
};

const GlobalTemplateContext = createContext<{
  config: GlobalTemplateConfig;
  updateConfig: (updates: Partial<GlobalTemplateConfig>) => void;
}>({
  config: DEFAULT_TEMPLATE_CONFIG,
  updateConfig: () => {}
});

export function useGlobalTemplate() {
  return useContext(GlobalTemplateContext);
}

// ============================================================================
// PROVIDER DO TEMPLATE GLOBAL
// ============================================================================

export function GlobalTemplateProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GlobalTemplateConfig>(() => {
    // Carregar configurações salvas
    const saved = localStorage.getItem('global-window-template');
    if (saved) {
      try {
        return { ...DEFAULT_TEMPLATE_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Erro ao carregar template global:', e);
      }
    }
    return DEFAULT_TEMPLATE_CONFIG;
  });
  
  // Salvar mudanças
  useEffect(() => {
    localStorage.setItem('global-window-template', JSON.stringify(config));
    // Emitir evento para atualizar janelas existentes
    window.dispatchEvent(new CustomEvent('global-template-updated', { detail: config }));
  }, [config]);
  
  const updateConfig = (updates: Partial<GlobalTemplateConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };
  
  return (
    <GlobalTemplateContext.Provider value={{ config, updateConfig }}>
      {children}
    </GlobalTemplateContext.Provider>
  );
}

// ============================================================================
// COMPONENTE WINDOW TEMPLATE
// ============================================================================

interface GlobalWindowProps {
  id: string;
  title: string;
  children: ReactNode;
  moduleColor?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
  isFocused?: boolean;
  className?: string;
}

export function GlobalWindowTemplate({
  id,
  title,
  children,
  moduleColor = '#3b82f6',
  actions,
  footer,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized = false,
  isFocused = false,
  className = ''
}: GlobalWindowProps) {
  const { config } = useGlobalTemplate();
  const [localMaximized, setLocalMaximized] = useState(isMaximized);
  const [isClosing, setIsClosing] = useState(false);
  
  // Escutar mudanças no template global
  useEffect(() => {
    const handleTemplateUpdate = (e: CustomEvent) => {
      // Force re-render quando template muda
      setLocalMaximized(m => m);
    };
    
    window.addEventListener('global-template-updated', handleTemplateUpdate as any);
    return () => {
      window.removeEventListener('global-template-updated', handleTemplateUpdate as any);
    };
  }, []);
  
  // Double click para maximizar
  const handleHeaderDoubleClick = () => {
    if (config.behavior.doubleClickMaximize) {
      handleMaximize();
    }
  };
  
  const handleClose = () => {
    if (config.styling.animation !== 'none') {
      setIsClosing(true);
      setTimeout(() => {
        onClose?.();
      }, 200);
    } else {
      onClose?.();
    }
  };
  
  const handleMaximize = () => {
    setLocalMaximized(!localMaximized);
    onMaximize?.();
  };
  
  // Construir classes do container
  const containerClasses = [
    'flex flex-col',
    'window-container',
    className
  ];
  
  // Adicionar classes de estilo
  if (config.styling.glassmorphism) {
    containerClasses.push('backdrop-blur-xl bg-white/5');
  }
  
  if (config.enableShadows) {
    const shadowMap = {
      none: '',
      sm: 'shadow-sm',
      md: 'shadow-md',
      lg: 'shadow-lg',
      xl: 'shadow-2xl'
    };
    containerClasses.push(shadowMap[config.styling.shadowIntensity]);
  }
  
  const radiusMap = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  };
  containerClasses.push(radiusMap[config.styling.borderRadius]);
  
  if (config.enableTransitions) {
    containerClasses.push('transition-all duration-200');
  }
  
  // Animação de entrada/saída
  if (config.styling.animation !== 'none' && !isClosing) {
    const animationMap = {
      fade: 'animate-fadeIn',
      slide: 'animate-slideIn',
      scale: 'animate-scaleIn'
    };
    containerClasses.push(animationMap[config.styling.animation]);
  }
  
  if (isClosing) {
    containerClasses.push('animate-fadeOut');
  }
  
  return (
    <div
      className={containerClasses.join(' ')}
      style={{
        backgroundColor: config.styling.backgroundColor,
        borderColor: config.styling.borderColor,
        opacity: config.styling.opacity,
        backdropFilter: config.enableBlur ? `blur(${config.styling.blur}px)` : undefined,
        border: `1px solid ${config.styling.borderColor}`,
        boxShadow: isFocused ? `0 0 40px ${moduleColor}40` : undefined
      }}
    >
      {/* Header */}
      {config.showHeader && (
        <div
          className="flex items-center justify-between px-4 select-none cursor-move"
          style={{
            height: `${config.headerHeight}px`,
            backgroundColor: config.styling.headerColor,
            borderBottom: `1px solid ${config.styling.borderColor}`
          }}
          onDoubleClick={handleHeaderDoubleClick}
        >
          {/* Título com indicador de módulo */}
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: moduleColor }}
            />
            <h3 className="text-sm font-medium text-white truncate">
              {title}
            </h3>
          </div>
          
          {/* Ações da janela */}
          <div className="flex items-center space-x-1">
            {config.showActions && actions && (
              <>
                {actions}
                <div className="w-px h-4 bg-white/20 mx-1" />
              </>
            )}
            
            {/* Botões de controle */}
            <button
              onClick={onMinimize}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Minimizar"
            >
              <Minus className="w-4 h-4 text-gray-400" />
            </button>
            
            <button
              onClick={handleMaximize}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title={localMaximized ? "Restaurar" : "Maximizar"}
            >
              {localMaximized ? (
                <Minimize2 className="w-4 h-4 text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
            
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
              title="Fechar"
            >
              <X className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {/* Footer */}
      {config.showFooter && footer && (
        <div
          className="px-4 flex items-center justify-between border-t"
          style={{
            height: `${config.footerHeight}px`,
            borderColor: config.styling.borderColor
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE DE CONFIGURAÇÃO DO TEMPLATE
// ============================================================================

export function TemplateConfigurator() {
  const { config, updateConfig } = useGlobalTemplate();
  
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold text-white mb-4">
        Configurar Template Global
      </h2>
      
      {/* Estrutura */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Estrutura
        </h3>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Mostrar Header</span>
          <input
            type="checkbox"
            checked={config.showHeader}
            onChange={(e) => updateConfig({ showHeader: e.target.checked })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Mostrar Footer</span>
          <input
            type="checkbox"
            checked={config.showFooter}
            onChange={(e) => updateConfig({ showFooter: e.target.checked })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Mostrar Ações</span>
          <input
            type="checkbox"
            checked={config.showActions}
            onChange={(e) => updateConfig({ showActions: e.target.checked })}
            className="rounded"
          />
        </label>
      </div>
      
      {/* Visual */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Visual
        </h3>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Glassmorphism</span>
          <input
            type="checkbox"
            checked={config.styling.glassmorphism}
            onChange={(e) => updateConfig({ 
              styling: { ...config.styling, glassmorphism: e.target.checked }
            })}
            className="rounded"
          />
        </label>
        
        <label className="flex flex-col space-y-1">
          <span className="text-sm text-gray-300">Intensidade da Sombra</span>
          <select
            value={config.styling.shadowIntensity}
            onChange={(e) => updateConfig({
              styling: { ...config.styling, shadowIntensity: e.target.value as any }
            })}
            className="bg-gray-800 text-white rounded px-3 py-2"
          >
            <option value="none">Nenhuma</option>
            <option value="sm">Pequena</option>
            <option value="md">Média</option>
            <option value="lg">Grande</option>
            <option value="xl">Extra Grande</option>
          </select>
        </label>
        
        <label className="flex flex-col space-y-1">
          <span className="text-sm text-gray-300">Raio da Borda</span>
          <select
            value={config.styling.borderRadius}
            onChange={(e) => updateConfig({
              styling: { ...config.styling, borderRadius: e.target.value as any }
            })}
            className="bg-gray-800 text-white rounded px-3 py-2"
          >
            <option value="none">Nenhum</option>
            <option value="sm">Pequeno</option>
            <option value="md">Médio</option>
            <option value="lg">Grande</option>
            <option value="xl">Extra Grande</option>
          </select>
        </label>
        
        <label className="flex flex-col space-y-1">
          <span className="text-sm text-gray-300">Animação</span>
          <select
            value={config.styling.animation}
            onChange={(e) => updateConfig({
              styling: { ...config.styling, animation: e.target.value as any }
            })}
            className="bg-gray-800 text-white rounded px-3 py-2"
          >
            <option value="none">Nenhuma</option>
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="scale">Scale</option>
          </select>
        </label>
      </div>
      
      {/* Performance */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Performance
        </h3>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Transições</span>
          <input
            type="checkbox"
            checked={config.enableTransitions}
            onChange={(e) => updateConfig({ enableTransitions: e.target.checked })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Sombras</span>
          <input
            type="checkbox"
            checked={config.enableShadows}
            onChange={(e) => updateConfig({ enableShadows: e.target.checked })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Blur</span>
          <input
            type="checkbox"
            checked={config.enableBlur}
            onChange={(e) => updateConfig({ enableBlur: e.target.checked })}
            className="rounded"
          />
        </label>
      </div>
      
      {/* Comportamento */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Comportamento
        </h3>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Double Click para Maximizar</span>
          <input
            type="checkbox"
            checked={config.behavior.doubleClickMaximize}
            onChange={(e) => updateConfig({
              behavior: { ...config.behavior, doubleClickMaximize: e.target.checked }
            })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Snap nas Bordas</span>
          <input
            type="checkbox"
            checked={config.behavior.snapToEdges}
            onChange={(e) => updateConfig({
              behavior: { ...config.behavior, snapToEdges: e.target.checked }
            })}
            className="rounded"
          />
        </label>
        
        <label className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Bordas Magnéticas</span>
          <input
            type="checkbox"
            checked={config.behavior.magneticBorders}
            onChange={(e) => updateConfig({
              behavior: { ...config.behavior, magneticBorders: e.target.checked }
            })}
            className="rounded"
          />
        </label>
      </div>
      
      <button
        onClick={() => updateConfig(DEFAULT_TEMPLATE_CONFIG)}
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
      >
        Restaurar Padrões
      </button>
    </div>
  );
}

// ============================================================================
// ANIMAÇÕES CSS
// ============================================================================

const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-fadeOut {
  animation: fadeOut 0.2s ease-out;
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.2s ease-out;
}
`;

// Injetar estilos no documento
if (typeof document !== 'undefined' && !document.getElementById('global-window-template-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'global-window-template-styles';
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default GlobalWindowTemplate;