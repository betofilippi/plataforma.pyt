import React, { useState, useEffect } from "react";
import { useWindowManager, useCreateWindow } from "./WindowManager";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Settings as SettingsIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getModuleColor } from "@/lib/module-colors";
import { CurrentUserAvatar } from "@/components/ui/CurrentUserAvatar";
import { NotificationBadge } from "@/components/ui/NotificationBadge";
import {
  Monitor,
  FileSpreadsheet,
  BarChart3,
  Users,
  Package,
  Home,
  LogOut,
  Code,
  Ship,
  Bell,
  Database,
} from "lucide-react";

// Window components not needed in taskbar anymore

export function WindowTaskbar() {
  const { windows, focusWindow, minimizeWindow, restoreWindow } = useWindowManager();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for smoother experience

    return () => clearInterval(timer);
  }, []);

  const handleTaskbarClick = (windowId: string) => {
    const window = windows.find((w) => w.id === windowId);
    if (window?.isMinimized) {
      restoreWindow(windowId);
    } else {
      focusWindow(windowId);
    }
  };

  // Get current module based on route
  const getCurrentModule = () => {
    const path = location.pathname;

    // Don't show module on main dashboard
    if (path === "/platform") {
      return null;
    }

    // CONFIGURAÇÕES - NÃO É MÓDULO
    if (path.startsWith("/sistema")) {
      return {
        name: "CONFIGURAÇÕES",
        icon: SettingsIcon,
        color: getModuleColor('sistema').primary,
      };
    }

    return null;
  };

  const currentModule = getCurrentModule();

  const getWindowIcon = (title: string) => {
    if (!title) return Monitor;
    
    const lowerTitle = title.toLowerCase();
    switch (lowerTitle) {
      case "banco de dados":
        return FileSpreadsheet;
      case "clientes":
        return Users;
      case "relatórios":
        return BarChart3;
      default:
        return Monitor;
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-14 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/50 z-30">
      <div className="flex items-center h-full px-2">
        {/* Logo and App Name - Far Left */}
        <div
          onClick={() => navigate("/platform")}
          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/30 rounded-lg px-3 py-2 transition-colors"
          title="Voltar à Dashboard Principal"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fafa66ef253664b4ebcf8a4c1c9861fb0%2F351333bfea9e404ea148cbaecbabe593?format=webp&width=800"
            alt="Plataforma.app"
            className="w-10 h-10 object-contain drop-shadow-lg"
          />
          <span className="text-lg font-semibold text-gray-200 hover:text-white transition-colors">
            PLATAFORMA.APP
          </span>
        </div>

        {/* Empty space - no windows displayed */}
        <div className="flex-1"></div>

        {/* System Tray Area */}
        <div className="flex items-center space-x-2 mr-2">

          {/* Notifications */}
          <NotificationBadge 
            onNotificationClick={() => navigate("/notifications")}
            showPreview={true}
            maxPreviewItems={5}
          />

          {/* Separator */}
          <div className="w-px h-8 bg-gray-600/50"></div>

          {/* Clock */}
          <div className="text-right select-none px-2">
            <div className="text-xs font-semibold text-gray-100 tabular-nums leading-tight">
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
          </div>

          {/* User Avatar with Dropdown */}
          <div className="pl-1">
            <CurrentUserAvatar size="sm" showDropdown={true} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
