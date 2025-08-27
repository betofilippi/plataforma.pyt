/**
 * WindowFactory - Sistema centralizado para criação de janelas padronizadas
 * Garante que todas as janelas sigam o mesmo template e padrões
 */

import React, { ReactNode, ComponentType, LazyExoticComponent } from 'react';
import { WindowState } from '../WindowManager';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type WindowCategory = 'form' | 'table' | 'dashboard' | 'modal' | 'custom' | 'system';
export type WindowPriority = 'critical' | 'high' | 'normal' | 'low';

export interface WindowTemplate {
  id: string;
  name: string;
  category: WindowCategory;
  baseTemplate?: string; // Para herança de templates
  defaultConfig: Partial<WindowConfig>;
  contentSlots: string[];
  defaultActions?: WindowAction[];
  styling?: WindowStyling;
  behavior?: WindowBehavior;
}

export interface WindowConfig {
  // Identificação
  id?: string;
  title: string;
  moduleId: string;
  template?: string;
  
  // Conteúdo
  component?: ReactNode | ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  slots?: Record<string, ReactNode>;
  
  // Posicionamento
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  
  // Constraints
  constraints?: WindowConstraints;
  
  // Comportamento
  persistence?: PersistenceConfig;
  actions?: WindowAction[];
  
  // Performance
  priority?: WindowPriority;
  lazy?: boolean;
  preload?: boolean;
  
  // Metadados
  metadata?: Record<string, any>;
}

export interface WindowConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  movable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
}

export interface PersistenceConfig {
  enabled: boolean;
  saveState?: boolean;
  savePosition?: boolean;
  saveSize?: boolean;
  saveContent?: boolean;
}

export interface WindowAction {
  id: string;
  label: string;
  icon?: ReactNode;
  handler: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface WindowStyling {
  headerColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  opacity?: number;
  blur?: number;
  customClass?: string;
}

export interface WindowBehavior {
  autoFocus?: boolean;
  modal?: boolean;
  alwaysOnTop?: boolean;
  blockInteractions?: boolean;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
}

export interface WindowInstance {
  id: string;
  config: WindowConfig;
  state: WindowState;
  template?: WindowTemplate;
  createdAt: number;
  lastActivity: number;
  runtime: {
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
    memoryUsage?: number;
    renderTime?: number;
  };
}

// ============================================================================
// TEMPLATES PADRÃO
// ============================================================================

const DEFAULT_TEMPLATES: WindowTemplate[] = [
  {
    id: 'form-crud',
    name: 'Formulário CRUD',
    category: 'form',
    defaultConfig: {
      size: { width: 800, height: 600 },
      constraints: {
        minWidth: 600,
        minHeight: 400,
        resizable: true,
        movable: true,
        closable: true,
        minimizable: true,
        maximizable: true
      },
      persistence: {
        enabled: true,
        saveState: true,
        savePosition: true,
        saveSize: true
      }
    },
    contentSlots: ['header', 'form', 'actions'],
    defaultActions: [
      { id: 'save', label: 'Salvar', variant: 'primary', handler: () => {} },
      { id: 'cancel', label: 'Cancelar', variant: 'secondary', handler: () => {} }
    ]
  },
  {
    id: 'data-table',
    name: 'Tabela de Dados',
    category: 'table',
    defaultConfig: {
      size: { width: 1200, height: 700 },
      constraints: {
        minWidth: 800,
        minHeight: 400,
        resizable: true,
        maximizable: true
      }
    },
    contentSlots: ['toolbar', 'table', 'pagination'],
    behavior: {
      autoFocus: true
    }
  },
  {
    id: 'dashboard-analytics',
    name: 'Dashboard Analytics',
    category: 'dashboard',
    defaultConfig: {
      size: { width: 1400, height: 800 },
      constraints: {
        minWidth: 1000,
        minHeight: 600,
        maximizable: true
      }
    },
    contentSlots: ['header', 'metrics', 'charts', 'footer']
  },
  {
    id: 'modal-dialog',
    name: 'Modal Dialog',
    category: 'modal',
    defaultConfig: {
      size: { width: 600, height: 400 },
      constraints: {
        resizable: false,
        movable: true,
        closable: true,
        minimizable: false,
        maximizable: false
      }
    },
    contentSlots: ['title', 'content', 'actions'],
    behavior: {
      modal: true,
      alwaysOnTop: true,
      closeOnEscape: true,
      blockInteractions: true
    }
  },
  {
    id: 'system-settings',
    name: 'Configurações do Sistema',
    category: 'system',
    defaultConfig: {
      size: { width: 1000, height: 700 },
      constraints: {
        minWidth: 800,
        minHeight: 500
      },
      persistence: {
        enabled: true,
        saveState: true
      }
    },
    contentSlots: ['sidebar', 'content', 'actions']
  }
];

// ============================================================================
// WINDOW FACTORY CLASS
// ============================================================================

export class WindowFactory {
  private templates = new Map<string, WindowTemplate>();
  private instances = new Map<string, WindowInstance>();
  private idCounter = 0;
  
  constructor() {
    // Registrar templates padrão
    DEFAULT_TEMPLATES.forEach(template => {
      this.registerTemplate(template);
    });
  }
  
  /**
   * Registra um novo template de janela
   */
  registerTemplate(template: WindowTemplate): void {
    this.templates.set(template.id, template);
    console.log(`[WindowFactory] Template registrado: ${template.id}`);
  }
  
  /**
   * Cria uma janela a partir de um template
   */
  createFromTemplate(templateId: string, config: Partial<WindowConfig>): WindowInstance {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template não encontrado: ${templateId}`);
    }
    
    // Merge config with template defaults
    const finalConfig: WindowConfig = {
      ...template.defaultConfig,
      ...config,
      id: config.id || this.generateId(),
      template: templateId,
      constraints: {
        ...template.defaultConfig.constraints,
        ...config.constraints
      },
      persistence: {
        ...template.defaultConfig.persistence,
        ...config.persistence
      }
    };
    
    // Aplicar comportamento do template
    if (template.behavior) {
      finalConfig.metadata = {
        ...finalConfig.metadata,
        behavior: template.behavior
      };
    }
    
    // Aplicar estilo do template
    if (template.styling) {
      finalConfig.metadata = {
        ...finalConfig.metadata,
        styling: template.styling
      };
    }
    
    return this.createWindowInstance(finalConfig, template);
  }
  
  /**
   * Cria uma janela customizada sem template
   */
  createWindow(config: WindowConfig): WindowInstance {
    const finalConfig: WindowConfig = {
      ...config,
      id: config.id || this.generateId()
    };
    
    return this.createWindowInstance(finalConfig);
  }
  
  /**
   * Cria uma instância de janela
   */
  private createWindowInstance(
    config: WindowConfig, 
    template?: WindowTemplate
  ): WindowInstance {
    const now = Date.now();
    
    const instance: WindowInstance = {
      id: config.id!,
      config,
      template,
      createdAt: now,
      lastActivity: now,
      state: {
        id: config.id!,
        title: config.title,
        x: config.position?.x || 100,
        y: config.position?.y || 100,
        width: config.size?.width || 800,
        height: config.size?.height || 600,
        isMinimized: false,
        isMaximized: false,
        isFocused: false,
        zIndex: 1000 + this.instances.size,
        moduleId: config.moduleId
      },
      runtime: {
        isLoading: false,
        hasError: false
      }
    };
    
    this.instances.set(instance.id, instance);
    console.log(`[WindowFactory] Janela criada: ${instance.id} (${config.title})`);
    
    return instance;
  }
  
  /**
   * Obtém uma instância de janela
   */
  getInstance(id: string): WindowInstance | undefined {
    return this.instances.get(id);
  }
  
  /**
   * Lista todas as janelas de um módulo
   */
  getModuleWindows(moduleId: string): WindowInstance[] {
    return Array.from(this.instances.values())
      .filter(instance => instance.config.moduleId === moduleId);
  }
  
  /**
   * Atualiza metadados de uma janela
   */
  updateWindowMetadata(id: string, metadata: Partial<WindowInstance['runtime']>): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.runtime = {
        ...instance.runtime,
        ...metadata
      };
      instance.lastActivity = Date.now();
    }
  }
  
  /**
   * Remove uma instância de janela
   */
  destroyWindow(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      this.instances.delete(id);
      console.log(`[WindowFactory] Janela destruída: ${id}`);
    }
  }
  
  /**
   * Lista todos os templates disponíveis
   */
  getTemplates(): WindowTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * Obtém um template específico
   */
  getTemplate(id: string): WindowTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * Gera ID único para janela
   */
  private generateId(): string {
    return `window-${Date.now()}-${++this.idCounter}`;
  }
  
  /**
   * Estatísticas do factory
   */
  getStats() {
    return {
      templatesCount: this.templates.size,
      instancesCount: this.instances.size,
      instancesByModule: this.getInstancesByModule(),
      memoryUsage: this.getTotalMemoryUsage()
    };
  }
  
  private getInstancesByModule(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.instances.forEach(instance => {
      const moduleId = instance.config.moduleId;
      counts[moduleId] = (counts[moduleId] || 0) + 1;
    });
    return counts;
  }
  
  private getTotalMemoryUsage(): number {
    let total = 0;
    this.instances.forEach(instance => {
      total += instance.runtime.memoryUsage || 0;
    });
    return total;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const windowFactory = new WindowFactory();

// ============================================================================
// REACT HOOKS
// ============================================================================

export function useWindowFactory() {
  return {
    createFromTemplate: (templateId: string, config: Partial<WindowConfig>) =>
      windowFactory.createFromTemplate(templateId, config),
    createWindow: (config: WindowConfig) =>
      windowFactory.createWindow(config),
    getTemplates: () => windowFactory.getTemplates(),
    getStats: () => windowFactory.getStats()
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default windowFactory;