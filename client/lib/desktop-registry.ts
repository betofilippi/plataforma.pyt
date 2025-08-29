// ====================================================================
// DESKTOP ICON REGISTRY - Sistema Revolucionário
// ====================================================================
// Para adicionar um ícone novo = ADICIONAR 1 LINHA neste arquivo. FIM.
// Todas as permissions, components, routing são gerenciados automaticamente.
// ====================================================================

import type { LucideIcon } from 'lucide-react';

export interface DesktopIcon {
  id: string;
  name: string;
  icon: string; // Nome do ícone Lucide React (ex: 'Settings', 'Shield', 'Users')
  
  // PERMISSIONS - Sistema automático
  requiredRole?: string | string[] | null; // null = todos podem ver
  requiredPermission?: string | null;
  visible?: (user: any) => boolean; // Função customizada para visibilidade
  
  // POSITION - Sistema automático de grid
  position?: { x: number; y: number }; // Manual override (opcional)
  gridPosition?: number; // Auto-positioning no grid (0, 1, 2...)
  
  // ACTION - O que acontece ao clicar
  action: {
    type: 'navigate' | 'window' | 'external' | 'function';
    
    // Para navigate
    to?: string;
    
    // Para window  
    component?: string; // Nome no component registry
    
    // Para external
    url?: string;
    
    // Para function
    handler?: (user: any, createWindow: any, navigate: any) => void;
  };
  
  // WINDOW CONFIG - Para action.type === 'window'
  windowConfig?: {
    title: string;
    size: { width: number; height: number };
    position?: { x: number; y: number };
    canResize?: boolean;
    canMove?: boolean;
    canMinimize?: boolean;
    canMaximize?: boolean;
    isModal?: boolean;
  };
  
  // UI CONFIG
  color?: string; // Override da cor padrão
  description?: string; // Tooltip
  category?: string; // Para agrupamento futuro
}

// ====================================================================
// REGISTRY DE ÍCONES - CONFIGURAÇÃO CENTRAL  
// ====================================================================
// 🚀 ADICIONAR NOVO ÍCONE = ADICIONAR LINHA AQUI
// ====================================================================

export const DESKTOP_ICONS: DesktopIcon[] = [
  // ================================================================
  // ÍCONES DO SISTEMA (sempre visíveis)
  // ================================================================
  {
    id: "sistema",
    name: "CONFIGURAÇÕES",
    icon: "Settings",
    requiredRole: null, // Todos podem ver
    gridPosition: 0,
    action: {
      type: "navigate",
      to: "/sistema"
    },
    description: "Configurações do sistema",
    category: "system"
  },
  
  // ================================================================
  // ÍCONES ADMINISTRATIVOS - MOVIDOS PARA /sistema (configurações)
  // ================================================================
  // Admin Panel e Users agora aparecem APENAS na desktop de configurações
  // Removidos daqui para não duplicar no dashboard principal
  
  // ================================================================
  // ADICIONAR NOVOS ÍCONES AQUI
  // ================================================================
  // 🚀 EXEMPLO - Para adicionar ícone "VENDAS":
  /*
  {
    id: "vendas",
    name: "VENDAS", 
    icon: "DollarSign",
    requiredRole: ["admin", "manager", "sales"],
    gridPosition: 3,
    action: {
      type: "window",
      component: "VendasPanel"
    },
    windowConfig: {
      title: "Sistema de Vendas",
      size: { width: 1000, height: 600 },
      canResize: true,
      canMove: true
    },
    description: "Sistema de gestão de vendas",
    category: "business"
  },
  */
  
  // 🚀 EXEMPLO - Para adicionar ícone "DOCS" (link externo):
  /*
  {
    id: "docs",
    name: "DOCUMENTAÇÃO",
    icon: "FileText",
    requiredRole: null, // Todos podem ver
    gridPosition: 4,
    action: {
      type: "external", 
      url: "https://docs.plataforma.app"
    },
    description: "Documentação do sistema",
    category: "help"
  },
  */
];

// ====================================================================
// HELPER FUNCTIONS - Sistema automático
// ====================================================================

export const getVisibleIcons = (user: any): DesktopIcon[] => {
  return DESKTOP_ICONS.filter(icon => {
    // Função customizada de visibilidade
    if (icon.visible) {
      return icon.visible(user);
    }
    
    // Verificação de role
    if (icon.requiredRole) {
      if (Array.isArray(icon.requiredRole)) {
        return icon.requiredRole.some(role => 
          user?.role === role || user?.roles?.includes(role)
        );
      } else {
        return user?.role === icon.requiredRole || user?.roles?.includes(icon.requiredRole);
      }
    }
    
    // Verificação de permission
    if (icon.requiredPermission) {
      return user?.permissions?.includes(icon.requiredPermission);
    }
    
    // Se não tem restricões, é visível
    return true;
  });
};

export const getIconByPosition = (position: number): DesktopIcon | undefined => {
  return DESKTOP_ICONS.find(icon => icon.gridPosition === position);
};

export const sortIconsByGrid = (icons: DesktopIcon[]): DesktopIcon[] => {
  return icons.sort((a, b) => {
    const posA = a.gridPosition ?? 999;
    const posB = b.gridPosition ?? 999;
    return posA - posB;
  });
};

// ====================================================================
// 🎯 COMO USAR ESTE SISTEMA:
// ====================================================================
// 1. Para ADICIONAR um ícone: Adicione objeto no array DESKTOP_ICONS
// 2. Para REMOVER um ícone: Remova linha do array
// 3. Para MUDAR permissão: Altere requiredRole/requiredPermission  
// 4. Para MUDAR ação: Altere object action
// 5. Componentes são carregados automaticamente do component-registry
// 6. Permissions são aplicadas automaticamente
// 7. Grid positioning é automático
// ====================================================================