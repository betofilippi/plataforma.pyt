import React, { useState, useEffect } from "react";
import { useWindowManager, useCreateWindow } from "./WindowManager";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Grid3X3 as SpreadsheetIcon,
  Settings as SettingsIcon,
  Database as DatabaseIcon,
  Package as EstoqueIcon,
  Wrench as MontagemIcon,
  TrendingUp as VendasIcon,
  FileText as FaturamentoIcon,
  Truck as ExpedicaoIcon,
  Users as RHIcon,
  Briefcase as AdministrativoIcon,
  Headphones as SuporteIcon,
  MessageCircle as ComunicacaoIcon,
  Scale as JuridicoIcon,
  Building2 as FinanceiroIcon,
  Receipt as TributarioIcon,
  Megaphone as MarketingIcon,
  Package2 as ProdutosIcon,
  Store as LojasIcon,
  UserPlus as CadastrosIcon,
  Brain as IAIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getModuleColor } from "@/lib/module-colors";
import { CurrentUserAvatar } from "@/components/ui/CurrentUserAvatar";
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

    // DATABASE module
    if (path.startsWith("/database")) {
      return {
        name: "BASE DE DADOS",
        icon: DatabaseIcon,
        color: getModuleColor('database').primary,
      };
    }

    // SISTEMA module
    if (path.startsWith("/sistema")) {
      return {
        name: "SISTEMA",
        icon: SettingsIcon,
        color: getModuleColor('sistema').primary,
      };
    }

    // ESTOQUE module
    if (path.startsWith("/estoque")) {
      return {
        name: "ESTOQUE",
        icon: EstoqueIcon,
        color: getModuleColor('estoque').primary,
      };
    }

    // MONTAGEM module
    if (path.startsWith("/montagem")) {
      return {
        name: "MONTAGEM",
        icon: MontagemIcon,
        color: getModuleColor('montagem').primary,
      };
    }

    // VENDAS module
    if (path.startsWith("/vendas")) {
      return {
        name: "VENDAS",
        icon: VendasIcon,
        color: getModuleColor('vendas').primary,
      };
    }

    // FATURAMENTO module
    if (path.startsWith("/faturamento")) {
      return {
        name: "FATURAMENTO",
        icon: FaturamentoIcon,
        color: getModuleColor('faturamento').primary,
      };
    }

    // EXPEDICAO module
    if (path.startsWith("/expedicao")) {
      return {
        name: "EXPEDIÇÃO",
        icon: ExpedicaoIcon,
        color: getModuleColor('expedicao').primary,
      };
    }

    // RH module
    if (path.startsWith("/rh")) {
      return {
        name: "RECURSOS HUMANOS",
        icon: RHIcon,
        color: getModuleColor('rh').primary,
      };
    }

    // ADMINISTRATIVO module
    if (path.startsWith("/administrativo")) {
      return {
        name: "ADMINISTRATIVO",
        icon: AdministrativoIcon,
        color: getModuleColor('administrativo').primary,
      };
    }

    // SUPORTE module
    if (path.startsWith("/suporte")) {
      return {
        name: "SUPORTE",
        icon: SuporteIcon,
        color: getModuleColor('suporte').primary,
      };
    }

    // COMUNICACAO module
    if (path.startsWith("/comunicacao")) {
      return {
        name: "COMUNICAÇÃO",
        icon: ComunicacaoIcon,
        color: getModuleColor('comunicacao').primary,
      };
    }

    // JURIDICO module
    if (path.startsWith("/juridico")) {
      return {
        name: "JURÍDICO",
        icon: JuridicoIcon,
        color: getModuleColor('juridico').primary,
      };
    }

    // FINANCEIRO module
    if (path.startsWith("/financeiro")) {
      return {
        name: "FINANCEIRO",
        icon: FinanceiroIcon,
        color: getModuleColor('financeiro').primary,
      };
    }

    // TRIBUTARIO module
    if (path.startsWith("/tributario")) {
      return {
        name: "TRIBUTÁRIO",
        icon: TributarioIcon,
        color: getModuleColor('tributario').primary,
      };
    }

    // MARKETING module
    if (path.startsWith("/marketing")) {
      return {
        name: "MARKETING",
        icon: MarketingIcon,
        color: getModuleColor('marketing').primary,
      };
    }

    // PRODUTOS module
    if (path.startsWith("/produtos")) {
      return {
        name: "PRODUTOS",
        icon: ProdutosIcon,
        color: getModuleColor('produtos').primary,
      };
    }

    // LOJAS module
    if (path.startsWith("/lojas")) {
      return {
        name: "LOJAS",
        icon: LojasIcon,
        color: getModuleColor('lojas').primary,
      };
    }

    // CADASTROS module
    if (path.startsWith("/cadastros")) {
      return {
        name: "CADASTROS",
        icon: CadastrosIcon,
        color: getModuleColor('cadastros').primary,
      };
    }

    // IA module
    if (path.startsWith("/ia")) {
      return {
        name: "INTELIGÊNCIA ARTIFICIAL",
        icon: IAIcon,
        color: getModuleColor('ia').primary,
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
      case "produtos":
        return Package;
      case "vendas":
        return FileSpreadsheet;
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
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 hover:bg-gray-700/30 rounded-lg transition-all duration-200 relative group"
            title="Notificações"
          >
            <Bell className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            {/* Notification badge */}
            <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          </button>

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
