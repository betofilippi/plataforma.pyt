/**
 * OSAdvancedTaskbar - Toolbar avançada estilo OS
 * Suporta 20+ módulos com indicadores de janelas, performance e notificações
 */

import React, { useState, useEffect, useMemo } from "react";
import { useWindowManager } from "./WindowManager";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Home, ChevronRight, Bell, Wifi, WifiOff, RefreshCw,
  Cpu, HardDrive, Monitor, Package, Users, FileSpreadsheet,
  BarChart3, Settings, Grid3x3, X, Minus, Square, CheckSquare
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getModuleColor } from "@/lib/module-colors";
import { CurrentUserAvatar } from "@/components/ui/CurrentUserAvatar";
import { windowFactory } from "./core/WindowFactory";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface SystemStats {
  totalWindows: number;
  activeModule: string;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  networkStatus: 'online' | 'offline' | 'syncing';
  uptime: string;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  module?: string;
  read: boolean;
}

interface NotificationCenter {
  unreadCount: number;
  categories: {
    system: NotificationItem[];
    modules: NotificationItem[];
    updates: NotificationItem[];
    errors: NotificationItem[];
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
}

interface OSWindowState {
  id: string;
  title: string;
  moduleId: string;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  hasUnsavedChanges?: boolean;
  processingStatus?: 'idle' | 'loading' | 'error' | 'processing';
  memoryUsage?: number;
  networkActivity?: boolean;
}

// ============================================================================
// MÓDULOS DISPONÍVEIS (MOCK PARA DEMONSTRAÇÃO)
// ============================================================================

const AVAILABLE_MODULES = [
  { id: 'sistema', name: 'Sistema', color: '#3b82f6' },
  { id: 'vendas', name: 'Vendas', color: '#10b981' },
  { id: 'financeiro', name: 'Financeiro', color: '#f59e0b' },
  { id: 'estoque', name: 'Estoque', color: '#8b5cf6' },
  { id: 'rh', name: 'RH', color: '#ef4444' }
];

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function getWindowIcon(title: string) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('config') || lowerTitle.includes('setting')) return Settings;
  if (lowerTitle.includes('user') || lowerTitle.includes('cliente')) return Users;
  if (lowerTitle.includes('product') || lowerTitle.includes('estoque')) return Package;
  if (lowerTitle.includes('report') || lowerTitle.includes('relat')) return BarChart3;
  if (lowerTitle.includes('table') || lowerTitle.includes('tabela')) return FileSpreadsheet;
  return Monitor;
}

function getCurrentModule(pathname: string) {
  const path = pathname.split('/')[1];
  if (!path || path === 'platform') return null;
  
  const module = AVAILABLE_MODULES.find(m => m.id === path);
  if (module) {
    return {
      name: module.name,
      color: module.color
    };
  }
  
  return null;
}

function formatUptime(startTime: number): string {
  const now = Date.now();
  const diff = now - startTime;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ============================================================================
// COMPONENTE WINDOW INDICATOR
// ============================================================================

interface WindowIndicatorProps {
  window: OSWindowState;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function WindowIndicator({ window, isActive, onClick, onClose }: WindowIndicatorProps) {
  const moduleColor = getModuleColor(window.moduleId || 'sistema');
  const Icon = getWindowIcon(window.title);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={`
        relative group cursor-pointer
        flex items-center px-3 py-2 rounded-lg
        transition-all duration-200
        ${isActive 
          ? `bg-white/20 backdrop-blur-sm border border-white/30` 
          : `bg-white/5 hover:bg-white/10 border border-white/10`
        }
        ${window.isMinimized ? 'opacity-60' : ''}
      `}
      style={{
        borderColor: isActive ? moduleColor.primary : undefined,
        boxShadow: isActive ? `0 0 8px ${moduleColor.rgba?.medium || moduleColor.primary}40` : undefined
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicador de Módulo */}
      <div 
        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
        style={{ backgroundColor: moduleColor.primary }}
      />
      
      {/* Ícone da Janela */}
      <Icon className="w-4 h-4 text-gray-300 mr-2" />
      
      {/* Título Truncado */}
      <span className="text-sm text-gray-200 truncate max-w-[120px] font-medium">
        {window.title}
      </span>
      
      {/* Indicadores de Status */}
      <div className="flex items-center ml-2 space-x-1">
        {window.hasUnsavedChanges && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Não salvo" />
        )}
        {window.processingStatus === 'loading' && (
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
        {window.processingStatus === 'error' && (
          <div className="w-2 h-2 bg-red-500 rounded-full" title="Erro" />
        )}
        {window.networkActivity && (
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Sincronizando" />
        )}
      </div>
      
      {/* Botão de fechar (visível no hover) */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
        </button>
      )}

      {/* Tooltip com Info Detalhada */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap shadow-lg">
          <div className="font-semibold">{window.title}</div>
          <div className="text-gray-400">
            Módulo: {window.moduleId} | {window.isMinimized ? 'Minimizada' : 'Ativa'}
          </div>
          {window.memoryUsage && (
            <div className="text-gray-400">Memória: {window.memoryUsage}MB</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE NOTIFICATION CENTER
// ============================================================================

interface NotificationCenterProps {
  notifications: NotificationCenter;
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

function NotificationCenterDropdown({ 
  notifications, 
  isOpen, 
  onClose,
  onMarkAllRead 
}: NotificationCenterProps) {
  if (!isOpen) return null;
  
  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-50">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Notificações</h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">
              {notifications.unreadCount} não lidas
            </span>
            <button 
              onClick={onMarkAllRead}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Marcar todas como lidas
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(notifications.categories).map(([category, items]) => (
          items.length > 0 && (
            <div key={category} className="p-4 border-b border-gray-700/50">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                {category}
              </div>
              {items.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-start space-x-3 py-2 ${!item.read ? 'bg-white/5' : ''} rounded px-2`}
                >
                  <div className={`
                    w-2 h-2 rounded-full mt-2 flex-shrink-0
                    ${item.type === 'error' ? 'bg-red-400' : 
                      item.type === 'warning' ? 'bg-yellow-400' :
                      item.type === 'success' ? 'bg-green-400' : 'bg-blue-400'}
                  `} />
                  <div className="flex-1">
                    <div className="text-sm text-white font-medium">{item.title}</div>
                    <div className="text-xs text-gray-400">{item.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{item.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
      
      <div className="p-3 border-t border-gray-700">
        <button className="w-full text-sm text-blue-400 hover:text-blue-300">
          Ver todas as notificações
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL - OS ADVANCED TASKBAR
// ============================================================================

export function OSAdvancedTaskbar() {
  const { windows, focusWindow, minimizeWindow, restoreWindow, closeWindow } = useWindowManager();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startTime] = useState(Date.now());
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalWindows: 0,
    activeModule: 'Dashboard',
    memoryUsage: { used: 0, total: 8192, percentage: 0 },
    cpuUsage: 0,
    networkStatus: 'online',
    uptime: '0m'
  });
  const [notifications, setNotifications] = useState<NotificationCenter>({
    unreadCount: 3,
    categories: {
      system: [
        { 
          id: '1', 
          title: 'Atualização do Sistema', 
          description: 'Nova versão disponível',
          timestamp: 'Há 5 min', 
          type: 'info', 
          read: false 
        }
      ],
      modules: [
        { 
          id: '2', 
          title: 'Backup Concluído', 
          description: 'Módulo Vendas - backup automático',
          timestamp: 'Há 15 min', 
          type: 'success', 
          read: false 
        }
      ],
      updates: [],
      errors: []
    },
    priority: 'normal'
  });
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  
  // Atualizar relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Atualizar estatísticas do sistema
  useEffect(() => {
    const updateSystemStats = () => {
      // Simular uso de memória baseado em janelas abertas
      const memoryPerWindow = 50; // MB
      const baseMemory = 1240; // MB
      const used = baseMemory + (windows.length * memoryPerWindow);
      
      setSystemStats({
        totalWindows: windows.length,
        activeModule: getCurrentModule(location.pathname)?.name || 'Dashboard',
        memoryUsage: {
          used,
          total: 8192,
          percentage: Math.round((used / 8192) * 100)
        },
        cpuUsage: Math.min(5 + windows.length * 2 + Math.random() * 10, 100),
        networkStatus: 'online',
        uptime: formatUptime(startTime)
      });
    };

    const interval = setInterval(updateSystemStats, 2000);
    updateSystemStats();
    return () => clearInterval(interval);
  }, [windows, location, startTime]);
  
  // Converter windows para OSWindowState
  const osWindows: OSWindowState[] = useMemo(() => {
    return windows.map(w => ({
      id: w.id,
      title: w.title,
      moduleId: w.moduleId || 'sistema',
      isMinimized: w.isMinimized,
      isMaximized: w.isMaximized,
      isFocused: w.isFocused,
      hasUnsavedChanges: Math.random() > 0.7,
      processingStatus: Math.random() > 0.8 ? 'loading' : 'idle',
      memoryUsage: Math.round(20 + Math.random() * 80),
      networkActivity: Math.random() > 0.8
    }));
  }, [windows]);
  
  const currentModule = getCurrentModule(location.pathname);
  
  const handleWindowClick = (windowId: string) => {
    const window = windows.find(w => w.id === windowId);
    if (window?.isMinimized) {
      restoreWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  };
  
  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => ({
      ...prev,
      unreadCount: 0,
      categories: {
        system: prev.categories.system.map(n => ({ ...n, read: true })),
        modules: prev.categories.modules.map(n => ({ ...n, read: true })),
        updates: prev.categories.updates.map(n => ({ ...n, read: true })),
        errors: prev.categories.errors.map(n => ({ ...n, read: true }))
      }
    }));
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900/98 backdrop-blur-xl border-t border-gray-700/60 z-30">
      <div className="flex items-center h-full">
        {/* Logo/Home Button */}
        <div
          onClick={() => navigate("/platform")}
          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/30 rounded-lg px-3 py-2 m-2 transition-colors"
          title="Dashboard Principal"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fafa66ef253664b4ebcf8a4c1c9861fb0%2F351333bfea9e404ea148cbaecbabe593?format=webp&width=800"
            alt="Plataforma.app"
            className="w-10 h-10 object-contain drop-shadow-lg"
          />
          <span className="text-sm font-semibold text-gray-200 hover:text-white transition-colors">
            PLATAFORMA.APP
          </span>
        </div>

        {/* Windows Indicators */}
        <div className="flex items-center space-x-1 ml-4 flex-1 overflow-x-auto">
          {osWindows.map((window) => {
            const activeWindowId = windows.find(w => w.isFocused)?.id;
            return (
              <WindowIndicator
                key={window.id}
                window={window}
                isActive={window.id === activeWindowId}
                onClick={() => handleWindowClick(window.id)}
                onClose={() => closeWindow(window.id)}
              />
            );
          })}
        </div>

        {/* Module Navigator */}
        <div className="flex items-center px-4">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10">
            <Home 
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors"
              onClick={() => navigate('/platform')}
            />
            
            {currentModule && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-500" />
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentModule.color }}
                  />
                  <span className="text-sm text-white font-medium">
                    {currentModule.name}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Quick Module Switcher */}
          <div className="ml-3 flex items-center space-x-1">
            {AVAILABLE_MODULES.slice(0, 5).map((module) => (
              <button
                key={module.id}
                onClick={() => navigate(`/${module.id}`)}
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  transition-all duration-200
                  ${currentModule?.name === module.name 
                    ? 'bg-white/20 border-2' 
                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }
                `}
                style={{
                  borderColor: currentModule?.name === module.name ? module.color : undefined
                }}
                title={`Ir para ${module.name}`}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: module.color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* System Tray */}
        <div className="flex items-center space-x-3 mr-4">
          {/* Performance Indicators */}
          <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            {/* CPU Usage */}
            <div className="flex items-center space-x-1" title={`CPU: ${systemStats.cpuUsage.toFixed(1)}%`}>
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-300 min-w-[28px]">
                {systemStats.cpuUsage.toFixed(0)}%
              </span>
            </div>
            
            {/* Memory Usage */}
            <div className="w-px h-4 bg-gray-600" />
            <div className="flex items-center space-x-1" title={`Memória: ${systemStats.memoryUsage.used}MB / ${systemStats.memoryUsage.total}MB`}>
              <HardDrive className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-300 min-w-[28px]">
                {systemStats.memoryUsage.percentage}%
              </span>
            </div>
            
            {/* Network Status */}
            <div className="w-px h-4 bg-gray-600" />
            <div className="flex items-center" title="Status da Rede">
              {systemStats.networkStatus === 'online' && (
                <Wifi className="w-4 h-4 text-green-400" />
              )}
              {systemStats.networkStatus === 'syncing' && (
                <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
              )}
              {systemStats.networkStatus === 'offline' && (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>

          {/* Notification Center */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationCenterOpen(!isNotificationCenterOpen)}
              className="relative p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
              title="Centro de Notificações"
            >
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              
              {/* Smart Badge */}
              {notifications.unreadCount > 0 && (
                <div className={`
                  absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full
                  flex items-center justify-center text-xs font-bold text-white
                  animate-pulse
                  ${notifications.priority === 'critical' ? 'bg-red-500' :
                    notifications.priority === 'high' ? 'bg-orange-500' :
                    notifications.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-500'
                  }
                `}>
                  {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                </div>
              )}
            </button>
            
            <NotificationCenterDropdown
              notifications={notifications}
              isOpen={isNotificationCenterOpen}
              onClose={() => setIsNotificationCenterOpen(false)}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-600/50" />

          {/* Enhanced Clock */}
          <div className="text-right select-none px-2">
            <div className="text-xs font-bold text-gray-100 tabular-nums leading-tight">
              {currentTime.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="text-xs text-gray-400 leading-tight">
              {currentTime.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}
            </div>
            {/* System Uptime */}
            <div className="text-xs text-gray-500 leading-tight">
              ↑ {systemStats.uptime}
            </div>
          </div>

          {/* User Avatar with Status */}
          <div className="relative pl-1">
            <CurrentUserAvatar size="sm" showDropdown={true} />
            {/* Online Status */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default OSAdvancedTaskbar;