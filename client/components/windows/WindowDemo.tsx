import React from "react";
import { WindowManagerProvider, WindowDesktop, useCreateWindow } from "./index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileSpreadsheet,
  Users,
  Package,
  BarChart3,
  Plus,
  Layout,
  Sparkles,
  Database,
  Calculator,
  Settings,
} from "lucide-react";

// Sample window contents
function SpreadsheetWindow() {
  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold flex items-center">
              <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
              Planilha Principal
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-6 gap-1 text-xs">
              {/* Headers */}
              <div className="font-medium bg-gray-100 p-2 border">A</div>
              <div className="font-medium bg-gray-100 p-2 border">B</div>
              <div className="font-medium bg-gray-100 p-2 border">C</div>
              <div className="font-medium bg-gray-100 p-2 border">D</div>
              <div className="font-medium bg-gray-100 p-2 border">E</div>
              <div className="font-medium bg-gray-100 p-2 border">F</div>

              {/* Data rows */}
              {Array.from({ length: 8 }, (_, i) =>
                Array.from({ length: 6 }, (_, j) => (
                  <div key={`${i}-${j}`} className="p-2 border bg-white">
                    {j === 0
                      ? `Item ${i + 1}`
                      : j === 1
                        ? `R$ ${(Math.random() * 1000).toFixed(2)}`
                        : j === 2
                          ? `${Math.floor(Math.random() * 100)}%`
                          : `Valor ${i + 1}.${j + 1}`}
                  </div>
                )),
              ).flat()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientesWindow() {
  const clients = [
    {
      id: 1,
      name: "João Silva",
      email: "joao@email.com",
      phone: "(11) 99999-9999",
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria@email.com",
      phone: "(11) 88888-8888",
    },
    {
      id: 3,
      name: "Pedro Costa",
      email: "pedro@email.com",
      phone: "(11) 77777-7777",
    },
  ];

  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Gestão de Clientes
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {clients.map((client) => (
            <Card key={client.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{client.name}</h3>
                    <p className="text-sm text-gray-600">{client.email}</p>
                    <p className="text-xs text-gray-500">{client.phone}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardWindow() {
  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Total Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-green-600">+12% este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">567</div>
            <p className="text-xs text-blue-600">+5% este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 45.2K</div>
            <p className="text-xs text-green-600">+18% este mês</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Desktop Launcher
function WindowLauncher() {
  const createWindow = useCreateWindow();

  const openWindow = (type: string) => {
    const configs = {
      spreadsheet: {
        title: "Planilha Principal",
        component: <SpreadsheetWindow />,
        size: { width: 1000, height: 600 },
      },
      clients: {
        title: "Clientes",
        component: <ClientesWindow />,
        size: { width: 600, height: 500 },
      },
      dashboard: {
        title: "Dashboard",
        component: <DashboardWindow />,
        size: { width: 800, height: 600 },
      },
    };

    const config = configs[type as keyof typeof configs];
    if (config) {
      createWindow(config.title, config.component, {
        size: config.size,
        position: {
          x: 50 + Math.random() * 300,
          y: 50 + Math.random() * 200,
        },
      });
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center max-w-2xl">
        {/* Header */}
        <div className="mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl">
            <Layout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Sistema de Janelas
          </h1>
          <p className="text-lg text-gray-300 mb-2">
            Interface Multi-Window para PLANILHA.APP
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span>Arraste • Redimensione • Organize</span>
          </div>
        </div>

        {/* Quick Launch Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => openWindow("spreadsheet")}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <FileSpreadsheet className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium block">Planilha</span>
            <span className="text-gray-300 text-xs">Editor principal</span>
          </button>

          <button
            onClick={() => openWindow("clients")}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <Users className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium block">Clientes</span>
            <span className="text-gray-300 text-xs">Gestão de pessoas</span>
          </button>

          <button
            onClick={() => openWindow("dashboard")}
            className="group bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <BarChart3 className="w-8 h-8 text-white mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <span className="text-white font-medium block">Dashboard</span>
            <span className="text-gray-300 text-xs">Visão geral</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => {
              ["spreadsheet", "clients", "dashboard"].forEach((type, index) => {
                setTimeout(() => openWindow(type), index * 300);
              });
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Abrir Tudo</span>
          </button>

          <div className="text-sm text-gray-400">
            ou clique individualmente nos módulos acima
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
            <Database className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-white font-medium mb-1">Drag & Drop</div>
            <div className="text-gray-400 text-xs">Mova janelas livremente</div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
            <Calculator className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-white font-medium mb-1">Redimensionável</div>
            <div className="text-gray-400 text-xs">
              Ajuste conforme necessário
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-4">
            <Settings className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-white font-medium mb-1">Persistente</div>
            <div className="text-gray-400 text-xs">
              Salva posições automaticamente
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Demo Component
export function WindowDemo() {
  return (
    <WindowManagerProvider>
      <WindowDesktop backgroundColor="#0f0f23" showTaskbar={true}>
        <WindowLauncher />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}
