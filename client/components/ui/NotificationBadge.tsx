import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  Check, 
  AlertTriangle, 
  Shield, 
  User, 
  Package,
  Monitor,
  Workflow,
  Eye,
  Archive,
  Trash2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Notification } from '@/services/NotificationService';

interface NotificationBadgeProps {
  onNotificationClick?: () => void;
  maxPreviewItems?: number;
  showPreview?: boolean;
  className?: string;
}

export function NotificationBadge({ 
  onNotificationClick, 
  maxPreviewItems = 5,
  showPreview = true,
  className = ""
}: NotificationBadgeProps) {
  const {
    notifications,
    stats,
    loading,
    connected,
    markAsRead,
    archiveNotification,
    deleteNotification,
    refreshStats
  } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Notificações recentes (não lidas)
  const recentNotifications = notifications
    .filter(n => !n.read)
    .slice(0, maxPreviewItems);

  // Animação de badge quando há novas notificações
  useEffect(() => {
    if (stats?.unread > 0) {
      setHasNewNotifications(true);
      const timer = setTimeout(() => setHasNewNotifications(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [stats?.unread]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBadgeClick = () => {
    if (onNotificationClick) {
      onNotificationClick();
    } else {
      setShowDropdown(!showDropdown);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return Monitor;
      case 'module': return Package;
      case 'security': return Shield;
      case 'workflow': return Workflow;
      case 'user': return User;
      default: return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'critical': return 'text-red-500';
      default: return 'text-blue-400';
    }
  };

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '🔵';
      case 'low': return '⚪';
      default: return '⚪';
    }
  };

  const getRelativeTime = (date: Date | string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    
    return `${Math.floor(seconds / 86400)}d`;
  };

  const handleNotificationAction = async (
    e: React.MouseEvent,
    notification: Notification,
    action: 'read' | 'archive' | 'delete'
  ) => {
    e.stopPropagation();

    try {
      switch (action) {
        case 'read':
          await markAsRead(notification.id);
          break;
        case 'archive':
          await archiveNotification(notification.id);
          break;
        case 'delete':
          await deleteNotification(notification.id);
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };

  const unreadCount = stats?.unread || 0;
  const hasCritical = notifications.some(n => !n.read && n.priority === 'critical');

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleBadgeClick}
        className={`relative p-2 hover:bg-gray-700/30 rounded-lg transition-all duration-200 group ${
          hasCritical ? 'animate-pulse' : ''
        }`}
        title="Notificações"
      >
        {/* Ícone do sino */}
        {unreadCount > 0 || hasNewNotifications ? (
          <BellRing className={`w-5 h-5 transition-colors ${
            hasCritical 
              ? 'text-red-400' 
              : hasNewNotifications 
                ? 'text-yellow-400' 
                : 'text-blue-400'
          } group-hover:text-white`} />
        ) : (
          <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        )}

        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <div className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-xs font-bold text-white flex items-center justify-center transition-all duration-200 ${
            hasCritical
              ? 'bg-red-500 animate-pulse'
              : hasNewNotifications
                ? 'bg-yellow-500 scale-110'
                : 'bg-blue-500'
          }`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}

        {/* Indicador de conexão */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
          connected ? 'bg-green-400' : 'bg-red-400'
        }`} />
      </button>

      {/* Dropdown de preview */}
      {showDropdown && showPreview && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Notificações</h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">
                  {connected ? 'Online' : 'Offline'}
                </span>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
            </div>
            
            {stats && (
              <div className="mt-2 text-sm text-gray-400">
                {stats.total} total • {stats.unread} não lidas
              </div>
            )}
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Nenhuma notificação nova</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentNotifications.map((notification) => {
                  const CategoryIcon = getCategoryIcon(notification.category);
                  
                  return (
                    <div
                      key={notification.id}
                      className="group p-3 hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => {
                        markAsRead(notification.id);
                        if (onNotificationClick) {
                          setShowDropdown(false);
                          onNotificationClick();
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Ícone */}
                        <div className={`flex-shrink-0 p-1.5 rounded-lg ${
                          notification.priority === 'critical' 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-gray-700/50 text-gray-300'
                        }`}>
                          <CategoryIcon className="w-4 h-4" />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-sm font-medium text-white truncate">
                                  {notification.title}
                                </span>
                                <span className="text-xs">
                                  {getPriorityIndicator(notification.priority)}
                                </span>
                              </div>
                              
                              <p className="text-xs text-gray-400 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span>{notification.category}</span>
                                  <span>•</span>
                                  <span>{getRelativeTime(notification.created_at)}</span>
                                </div>

                                {/* Ações rápidas */}
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => handleNotificationAction(e, notification, 'read')}
                                    className="p-1 hover:bg-gray-700/50 rounded text-gray-400 hover:text-white transition-colors"
                                    title="Marcar como lida"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                  
                                  <button
                                    onClick={(e) => handleNotificationAction(e, notification, 'archive')}
                                    className="p-1 hover:bg-gray-700/50 rounded text-gray-400 hover:text-yellow-400 transition-colors"
                                    title="Arquivar"
                                  >
                                    <Archive className="w-3 h-3" />
                                  </button>
                                  
                                  <button
                                    onClick={(e) => handleNotificationAction(e, notification, 'delete')}
                                    className="p-1 hover:bg-gray-700/50 rounded text-gray-400 hover:text-red-400 transition-colors"
                                    title="Excluir"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
            <button
              onClick={() => {
                setShowDropdown(false);
                if (onNotificationClick) {
                  onNotificationClick();
                }
              }}
              className="w-full flex items-center justify-center space-x-2 p-2 hover:bg-gray-700/30 rounded-lg transition-colors text-sm text-gray-300 hover:text-white"
            >
              <span>Ver todas as notificações</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Efeitos visuais para notificações críticas */}
      {hasCritical && (
        <div className="absolute inset-0 rounded-lg bg-red-500/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}