/**
 * ModuleDesktop - Desktop isolado para cada módulo
 * Cada módulo tem seu próprio desktop com janelas independentes
 */

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { WindowManagerProvider, useWindowManager } from '../WindowManager';
import { windowFactory, WindowConfig, WindowInstance, useWindowFactory } from './WindowFactory';
import { Settings, Grid3x3, FileText, BarChart3, Users, Package } from 'lucide-react';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface ModuleDesktopConfig {
  moduleId: string;
  moduleName: string;
  moduleColor: string;
  moduleIcon: React.ComponentType<any>;
  backgroundColor?: string;
  backgroundImage?: string;
  desktopIcons?: DesktopIcon[];
  windowTemplates?: WindowTemplateConfig[];
  enableTaskbar?: boolean;
  enableContextMenu?: boolean;
  persistState?: boolean;
}

export interface DesktopIcon {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  position: { x: number; y: number };
  windowConfig?: Partial<WindowConfig>;
  action?: () => void;
}

export interface WindowTemplateConfig {
  templateId: string;
  config: Partial<WindowConfig>;
}

export interface ModuleDesktopState {
  moduleId: string;
  windows: WindowInstance[];
  activeWindowId?: string;
  desktopConfig: ModuleDesktopConfig;
}

// ============================================================================
// CONTEXT PARA DESKTOP DO MÓDULO
// ============================================================================

interface ModuleDesktopContextType {
  moduleId: string;
  moduleConfig: ModuleDesktopConfig;
  windows: WindowInstance[];
  activeWindowId?: string;
  createWindow: (config: Partial<WindowConfig>) => void;
  createFromTemplate: (templateId: string, config: Partial<WindowConfig>) => void;
  closeWindow: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  getModuleWindows: () => WindowInstance[];
  stats: {
    windowCount: number;
    memoryUsage: number;
  };
}

const ModuleDesktopContext = createContext<ModuleDesktopContextType | null>(null);

export function useModuleDesktop() {
  const context = useContext(ModuleDesktopContext);
  if (!context) {
    throw new Error('useModuleDesktop must be used within ModuleDesktopProvider');
  }
  return context;
}

// ============================================================================
// COMPONENTE DESKTOP ICON
// ============================================================================

interface DesktopIconComponentProps {
  icon: DesktopIcon;
  moduleColor: string;
  onDoubleClick: () => void;
}

function DesktopIconComponent({ icon, moduleColor, onDoubleClick }: DesktopIconComponentProps) {
  const [isSelected, setIsSelected] = useState(false);
  const IconComponent = icon.icon;
  
  return (
    <div
      className="absolute flex flex-col items-center justify-center w-20 h-20 cursor-pointer select-none group"
      style={{ 
        left: `${icon.position.x}px`, 
        top: `${icon.position.y}px` 
      }}
      onDoubleClick={onDoubleClick}
      onClick={() => setIsSelected(!isSelected)}
    >
      <div
        className={`
          w-16 h-16 rounded-xl flex items-center justify-center mb-1
          transition-all duration-200
          ${isSelected 
            ? 'bg-white/20 border-2' 
            : 'bg-white/5 hover:bg-white/10 border border-white/10'
          }
          group-hover:scale-105
        `}
        style={{
          borderColor: isSelected ? moduleColor : undefined,
          boxShadow: isSelected ? `0 0 20px ${moduleColor}40` : undefined
        }}
      >
        <IconComponent className="w-8 h-8 text-white" />
      </div>
      <span className="text-xs text-white text-center px-1 py-0.5 bg-black/40 backdrop-blur-sm rounded">
        {icon.name}
      </span>
    </div>
  );
}

// ============================================================================
// COMPONENTE MODULE DESKTOP
// ============================================================================

export function ModuleDesktop({ config, children }: { config: ModuleDesktopConfig; children?: React.ReactNode }) {
  const { createWindow: createWindowManager } = useWindowManager();
  const { createFromTemplate, createWindow } = useWindowFactory();
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string>();
  
  // Carregar estado persistido
  useEffect(() => {
    if (config.persistState) {
      const savedState = localStorage.getItem(`module-desktop-${config.moduleId}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          // Restaurar janelas salvas
          parsed.windows?.forEach((w: any) => {
            handleCreateWindow(w.config);
          });
        } catch (error) {
          console.error('Erro ao restaurar estado do desktop:', error);
        }
      }
    }
  }, [config.moduleId]);
  
  // Salvar estado
  useEffect(() => {
    if (config.persistState) {
      const state = {
        windows: windows.map(w => ({
          config: w.config,
          state: w.state
        }))
      };
      localStorage.setItem(`module-desktop-${config.moduleId}`, JSON.stringify(state));
    }
  }, [windows, config.persistState]);
  
  // Criar janela
  const handleCreateWindow = useCallback((windowConfig: Partial<WindowConfig>) => {
    const finalConfig: WindowConfig = {
      ...windowConfig,
      moduleId: config.moduleId,
      title: windowConfig.title || 'Nova Janela'
    };
    
    const instance = createWindow(finalConfig);
    setWindows(prev => [...prev, instance]);
    setActiveWindowId(instance.id);
    
    // Criar janela no WindowManager
    if (windowConfig.component) {
      createWindowManager(
        instance.state.title,
        windowConfig.component,
        {
          size: { width: instance.state.width, height: instance.state.height },
          position: { x: instance.state.x, y: instance.state.y }
        }
      );
    }
    
    return instance;
  }, [config.moduleId, createWindow, createWindowManager]);
  
  // Criar janela a partir de template
  const handleCreateFromTemplate = useCallback((
    templateId: string, 
    windowConfig: Partial<WindowConfig>
  ) => {
    const finalConfig: Partial<WindowConfig> = {
      ...windowConfig,
      moduleId: config.moduleId
    };
    
    const instance = createFromTemplate(templateId, finalConfig);
    setWindows(prev => [...prev, instance]);
    setActiveWindowId(instance.id);
    
    return instance;
  }, [config.moduleId, createFromTemplate]);
  
  // Fechar janela
  const handleCloseWindow = useCallback((windowId: string) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
    windowFactory.destroyWindow(windowId);
    
    if (activeWindowId === windowId) {
      setActiveWindowId(undefined);
    }
  }, [activeWindowId]);
  
  // Focar janela
  const handleFocusWindow = useCallback((windowId: string) => {
    setActiveWindowId(windowId);
    // Atualizar z-index
    setWindows(prev => prev.map(w => ({
      ...w,
      state: {
        ...w.state,
        isFocused: w.id === windowId,
        zIndex: w.id === windowId ? 9999 : w.state.zIndex
      }
    })));
  }, []);
  
  // Obter janelas do módulo
  const getModuleWindows = useCallback(() => {
    return windowFactory.getModuleWindows(config.moduleId);
  }, [config.moduleId]);
  
  // Calcular estatísticas
  const stats = useMemo(() => {
    const windowCount = windows.length;
    const memoryUsage = windows.reduce((sum, w) => sum + (w.runtime.memoryUsage || 0), 0);
    return { windowCount, memoryUsage };
  }, [windows]);
  
  // Context value
  const contextValue: ModuleDesktopContextType = {
    moduleId: config.moduleId,
    moduleConfig: config,
    windows,
    activeWindowId,
    createWindow: handleCreateWindow,
    createFromTemplate: handleCreateFromTemplate,
    closeWindow: handleCloseWindow,
    focusWindow: handleFocusWindow,
    getModuleWindows,
    stats
  };
  
  // Ações dos ícones do desktop
  const handleIconDoubleClick = (icon: DesktopIcon) => {
    if (icon.action) {
      icon.action();
    } else if (icon.windowConfig) {
      handleCreateWindow(icon.windowConfig);
    }
  };
  
  return (
    <ModuleDesktopContext.Provider value={contextValue}>
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: config.backgroundColor || '#1f2937',
          backgroundImage: config.backgroundImage ? `url(${config.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Desktop Icons */}
        {config.desktopIcons && (
          <div className="absolute inset-0 pointer-events-none">
            {config.desktopIcons.map(icon => (
              <div key={icon.id} className="pointer-events-auto">
                <DesktopIconComponent
                  icon={icon}
                  moduleColor={config.moduleColor}
                  onDoubleClick={() => handleIconDoubleClick(icon)}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Status do Desktop (canto superior direito) */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-lg px-4 py-2">
          <div className="flex items-center space-x-4 text-white/80 text-sm">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>{config.moduleName}</span>
            </div>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center space-x-2">
              <Grid3x3 className="w-4 h-4" />
              <span>{stats.windowCount} janelas</span>
            </div>
            {stats.memoryUsage > 0 && (
              <>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>{Math.round(stats.memoryUsage)}MB</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Render children content */}
        {children}
      </div>
    </ModuleDesktopContext.Provider>
  );
}

// ============================================================================
// WRAPPER COM WINDOW MANAGER
// ============================================================================

export function ModuleDesktopWithManager({ config, children }: { config: ModuleDesktopConfig; children?: React.ReactNode }) {
  // Cada módulo tem seu próprio WindowManager isolado
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={config.enableTaskbar !== false}
        backgroundColor="transparent"
        disableContextMenu={!config.enableContextMenu}
      >
        <ModuleDesktop config={config}>
          {children}
        </ModuleDesktop>
      </WindowDesktop>
    </WindowManagerProvider>
  );
}

// ============================================================================
// CONFIGURAÇÕES PADRÃO PARA MÓDULOS
// ============================================================================

export const MODULE_DESKTOP_PRESETS = {
  vendas: {
    moduleId: 'vendas',
    moduleName: 'Vendas',
    moduleColor: '#10b981',
    moduleIcon: Users,
    backgroundColor: '#064e3b',
    desktopIcons: [
      {
        id: 'novo-pedido',
        name: 'Novo Pedido',
        icon: FileText,
        position: { x: 50, y: 50 },
        windowConfig: {
          title: 'Novo Pedido de Venda',
          template: 'form-crud',
          size: { width: 900, height: 700 }
        }
      },
      {
        id: 'clientes',
        name: 'Clientes',
        icon: Users,
        position: { x: 150, y: 50 },
        windowConfig: {
          title: 'Gestão de Clientes',
          template: 'data-table',
          size: { width: 1200, height: 700 }
        }
      },
      {
        id: 'relatorios',
        name: 'Relatórios',
        icon: BarChart3,
        position: { x: 250, y: 50 },
        windowConfig: {
          title: 'Relatórios de Vendas',
          template: 'dashboard-analytics',
          size: { width: 1400, height: 800 }
        }
      }
    ],
    persistState: true
  } as ModuleDesktopConfig,
  
  financeiro: {
    moduleId: 'financeiro',
    moduleName: 'Financeiro',
    moduleColor: '#f59e0b',
    moduleIcon: BarChart3,
    backgroundColor: '#451a03',
    persistState: true
  } as ModuleDesktopConfig,
  
  estoque: {
    moduleId: 'estoque',
    moduleName: 'Estoque',
    moduleColor: '#8b5cf6',
    moduleIcon: Package,
    backgroundColor: '#2e1065',
    persistState: true
  } as ModuleDesktopConfig
};

// ============================================================================
// EXPORTS
// ============================================================================

export default ModuleDesktop;