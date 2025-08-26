import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  module: string;
  timestamp: Date;
  read: boolean;
  icon?: any;
}

export function NotificationsContent() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "Backup Concluído",
      message: "Backup diário do sistema foi concluído com sucesso.",
      module: "Sistema",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      read: false,
      icon: CheckCircle,
    },
    {
      id: "2",
      type: "info",
      title: "Nova versão disponível",
      message: "Uma nova versão do módulo Planilha.app está disponível para atualização.",
      module: "Planilha.app",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
      icon: Package,
    },
    {
      id: "3",
      type: "warning",
      title: "Limite de armazenamento",
      message: "Você está usando 85% do espaço de armazenamento disponível.",
      module: "Armazenamento",
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      read: true,
      icon: AlertCircle,
    },
    {
      id: "4",
      type: "info",
      title: "Novo usuário adicionado",
      message: "João Silva foi adicionado ao sistema como Editor.",
      module: "Usuários",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: true,
      icon: Users,
    },
    {
      id: "5",
      type: "success",
      title: "Relatório gerado",
      message: "Relatório mensal de vendas foi gerado com sucesso.",
      module: "Relatórios",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
      icon: FileText,
    },
  ]);

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const getFilteredNotifications = () => {
    let filtered = [...notifications];

    // Filter by read status
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter === "read") {
      filtered = filtered.filter((n) => n.read);
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((n) => n.type === typeFilter);
    }

    return filtered;
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    if (confirm("Deseja realmente limpar todas as notificações?")) {
      setNotifications([]);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-400 bg-green-400/20";
      case "warning":
        return "text-yellow-400 bg-yellow-400/20";
      case "error":
        return "text-red-400 bg-red-400/20";
      default:
        return "text-blue-400 bg-blue-400/20";
    }
  };

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "agora";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d atrás`;
    
    return date.toLocaleDateString("pt-BR");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-end mb-8">
          {unreadCount > 0 && (
            <div className="mr-4">
              <p className="text-sm text-gray-400">
                {unreadCount} notificação(ões) não lida(s)
              </p>
            </div>
          )}
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todas como lidas
              </Button>
            )}
            <Button
              onClick={clearAll}
              variant="outline"
              className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar tudo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === "all"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter("unread")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === "unread"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Não lidas
                </button>
                <button
                  onClick={() => setFilter("read")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === "read"
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  Lidas
                </button>
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="info">Informação</option>
              <option value="success">Sucesso</option>
              <option value="warning">Aviso</option>
              <option value="error">Erro</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 border border-white/20 text-center">
              <BellOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">Nenhuma notificação encontrada</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const Icon = notification.icon || Bell;
              return (
                <div
                  key={notification.id}
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border transition-all duration-200 ${
                    notification.read
                      ? "border-white/10 opacity-70"
                      : "border-white/20 shadow-lg"
                  } hover:bg-white/15`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-2 rounded-lg ${getTypeColor(
                        notification.type
                      )}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-semibold">
                            {notification.title}
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                            )}
                          </h3>
                          <p className="text-gray-300 text-sm mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-xs text-gray-500">
                              {notification.module}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {getRelativeTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                              title="Marcar como lida"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 hover:bg-red-600/20 rounded-lg transition-colors"
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
            })
          )}
        </div>
      </div>
    </div>
  );
}