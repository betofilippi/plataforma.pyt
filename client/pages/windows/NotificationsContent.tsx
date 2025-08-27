import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  BellOff,
  Check,
  X,
  Info,
  AlertCircle,
  CheckCircle,
  Package,
  Users,
  FileText,
  Settings,
  Filter,
  Trash2,
  Eye,
  Clock,
  RefreshCw,
  Search,
  Archive,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Shield,
  User,
  Workflow,
  Monitor,
  ChevronDown,
  MoreHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification, NotificationStats } from "@/services/NotificationService";

export function NotificationsContent() {
  const {
    notifications,
    stats,
    loading,
    error,
    connected,
    fetchNotifications,
    refreshStats,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    hasMore,
    loadMore,
    setFilters,
    currentFilters
  } = useNotifications();

  // Estados locais
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('notifications-sound') !== 'false'
  );

  // Filtros derivados
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filtro de busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        n.module_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, searchQuery]);

  // Handlers de filtros
  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...currentFilters, [key]: value, offset: 0 });
  };

  const handleToggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('notifications-sound', newValue.toString());
  };

  const handleSelectNotification = (id: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkAction = async (action: 'read' | 'archive' | 'delete') => {
    const ids = Array.from(selectedNotifications);
    
    try {
      await Promise.all(
        ids.map(id => {
          switch (action) {
            case 'read':
              return markAsRead(id);
            case 'archive':
              return archiveNotification(id);
            case 'delete':
              return deleteNotification(id);
            default:
              return Promise.resolve();
          }
        })
      );
      
      setSelectedNotifications(new Set());
    } catch (err) {
      console.error('Erro na ação em lote:', err);
    }
  };

  // Ícones por categoria
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

  // Cores por tipo
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-400/20 border-green-400/30';
      case 'warning': return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30';
      case 'error': return 'text-red-400 bg-red-400/20 border-red-400/30';
      case 'critical': return 'text-red-500 bg-red-500/30 border-red-500/50 animate-pulse';
      default: return 'text-blue-400 bg-blue-400/20 border-blue-400/30';
    }
  };

  // Cores por prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-400';
      case 'normal': return 'text-blue-400';
      case 'low': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getRelativeTime = (date: Date | string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d atrás`;
    
    return new Date(date).toLocaleDateString("pt-BR");
  };

  // Efeito para limpar seleções quando filtros mudam
  useEffect(() => {
    setSelectedNotifications(new Set());
  }, [currentFilters]);

  // Listener para notificações críticas
  useEffect(() => {
    const handleCriticalNotification = (event: CustomEvent) => {
      const notification = event.detail;
      
      if (soundEnabled) {
        // Tocar som de notificação crítica
        const audio = new Audio('/notification-critical.mp3');
        audio.volume = 0.8;
        audio.play().catch(() => {
          console.log('Could not play critical notification sound');
        });
      }

      // Mostrar alert visual
      alert(`NOTIFICAÇÃO CRÍTICA: ${notification.title}\n\n${notification.message}`);
    };

    document.addEventListener('critical-notification', handleCriticalNotification as EventListener);
    
    return () => {
      document.removeEventListener('critical-notification', handleCriticalNotification as EventListener);
    };
  }, [soundEnabled]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {connected ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-400" />
              )}
              <h1 className="text-2xl font-bold text-white">
                Central de Notificações
              </h1>
            </div>
            
            {stats && (
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>{stats.total} total</span>
                {stats.unread > 0 && (
                  <span className="text-blue-400 font-medium">
                    {stats.unread} não lidas
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={handleToggleSound}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Button
              onClick={refreshStats}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold text-blue-400">{stats.unread}</div>
              <div className="text-sm text-gray-400">Não lidas</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold text-red-400">{stats.by_priority.critical || 0}</div>
              <div className="text-sm text-gray-400">Críticas</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold text-yellow-400">{stats.by_type.warning || 0}</div>
              <div className="text-sm text-gray-400">Avisos</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
              <div className="text-2xl font-bold text-green-400">{stats.by_type.success || 0}</div>
              <div className="text-sm text-gray-400">Sucessos</div>
            </div>
          </div>
        )}

        {/* Barra de ferramentas */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            
            {/* Busca */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar notificações..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showFilters
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Ações */}
            <div className="flex items-center space-x-2">
              {selectedNotifications.size > 0 && (
                <>
                  <span className="text-sm text-gray-400">
                    {selectedNotifications.size} selecionada(s)
                  </span>
                  
                  <Button
                    onClick={() => handleBulkAction('read')}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Marcar como lidas
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkAction('archive')}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Archive className="w-4 h-4 mr-1" />
                    Arquivar
                  </Button>
                  
                  <Button
                    onClick={() => handleBulkAction('delete')}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                </>
              )}
              
              {stats?.unread > 0 && (
                <Button
                  onClick={() => markAllAsRead()}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Filtro por status */}
                <select
                  value={currentFilters.read === undefined ? 'all' : currentFilters.read ? 'read' : 'unread'}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleFilterChange('read', 
                      value === 'all' ? undefined : value === 'read'
                    );
                  }}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas</option>
                  <option value="unread">Não lidas</option>
                  <option value="read">Lidas</option>
                </select>

                {/* Filtro por categoria */}
                <select
                  value={currentFilters.category || 'all'}
                  onChange={(e) => handleFilterChange('category', e.target.value === 'all' ? undefined : e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas as categorias</option>
                  <option value="system">Sistema</option>
                  <option value="module">Módulo</option>
                  <option value="security">Segurança</option>
                  <option value="workflow">Workflow</option>
                  <option value="user">Usuário</option>
                </select>

                {/* Filtro por tipo */}
                <select
                  value={currentFilters.type || 'all'}
                  onChange={(e) => handleFilterChange('type', e.target.value === 'all' ? undefined : e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="info">Informação</option>
                  <option value="success">Sucesso</option>
                  <option value="warning">Aviso</option>
                  <option value="error">Erro</option>
                  <option value="critical">Crítico</option>
                </select>

                {/* Filtro por prioridade */}
                <select
                  value={currentFilters.priority || 'all'}
                  onChange={(e) => handleFilterChange('priority', e.target.value === 'all' ? undefined : e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todas as prioridades</option>
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Lista de notificações */}
        <div className="space-y-3">
          {error && (
            <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {filteredNotifications.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
              <BellOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">Nenhuma notificação encontrada</p>
              {searchQuery && (
                <p className="text-gray-500 text-sm mt-2">
                  Tente ajustar sua busca ou filtros
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Cabeçalho da lista com seleção */}
              {filteredNotifications.length > 0 && (
                <div className="flex items-center space-x-4 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-400">
                    Selecionar todas as notificações visíveis
                  </span>
                </div>
              )}

              {filteredNotifications.map((notification) => {
                const CategoryIcon = getCategoryIcon(notification.category);
                const isSelected = selectedNotifications.has(notification.id);
                
                return (
                  <div
                    key={notification.id}
                    className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border transition-all duration-200 ${
                      notification.read
                        ? "border-white/10 opacity-70"
                        : "border-white/20 shadow-lg"
                    } ${
                      isSelected ? "ring-2 ring-purple-500 bg-purple-500/10" : "hover:bg-white/15"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectNotification(notification.id)}
                        className="mt-1 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500"
                      />

                      {/* Ícone da categoria */}
                      <div className={`p-2 rounded-lg border ${getTypeColor(notification.type)}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-white font-semibold">
                                {notification.title}
                              </h3>
                              
                              {!notification.read && (
                                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                              )}
                              
                              {/* Badge de prioridade */}
                              <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(notification.priority)} border-current/30 bg-current/10`}>
                                {notification.priority.toUpperCase()}
                              </span>
                            </div>
                            
                            <p className="text-gray-300 text-sm mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{notification.category}</span>
                              {notification.module_name && (
                                <span>{notification.module_name}</span>
                              )}
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {getRelativeTime(notification.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center space-x-1 ml-4">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                title="Marcar como lida"
                              >
                                <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => archiveNotification(notification.id)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                              title="Arquivar"
                            >
                              <Archive className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
                            </button>
                            
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Botão carregar mais */}
              {hasMore && (
                <div className="text-center py-6">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    )}
                    Carregar mais notificações
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}