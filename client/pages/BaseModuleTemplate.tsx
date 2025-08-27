import React from "react";
import { useNavigate } from "react-router-dom";
import { useCreateWindow } from "@/components/windows";

// Lucide React Icons - Adicione os ícones que precisar
import {
  Grid3X3 as DefaultIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  Folder as FolderIcon,
  FileText as DocsIcon,
  HelpCircle as HelpIcon,
} from "lucide-react";

// Types para o sistema de ícones
interface AppItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  component: React.ReactNode;
  size: { width: number; height: number };
  type: "app" | "folder";
  position?: { x: number; y: number };
  children?: AppItem[];
  isInstalled?: boolean;
  category?: string;
  isActive?: boolean;
}

interface DesktopState {
  apps: AppItem[];
  folders: AppItem[];
  selectedItems: string[];
  contextMenu: { x: number; y: number; targetId: string } | null;
  isDragging: boolean;
  dragTarget: string | null;
}

// Componente de ícone customizado - substitua pela logo do seu módulo
function ModuleIcon({ sx }: { sx?: any }) {
  return (
    <DefaultIcon
      size={parseInt(sx?.fontSize) || 64}
      color={sx?.color || "white"}
      style={{
        filter: sx?.filter || "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      }}
    />
  );
}

// Exemplo de componente de janela
function ExampleWindow() {
  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center">
            <DefaultIcon className="w-5 h-5 mr-2 text-purple-600" />
            Exemplo de Janela
          </h2>
        </div>
        <div className="p-6">
          <div className="text-center py-20">
            <h3 className="text-xl font-medium text-gray-900 mb-4">
              Bem-vindo ao seu novo módulo!
            </h3>
            <p className="text-gray-600 mb-6">
              Este é um template base para criar novos módulos com todas as
              funcionalidades implementadas.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <h4 className="font-medium text-blue-900 mb-2">
                Funcionalidades incluídas:
              </h4>
              <ul className="text-blue-700 text-sm space-y-1 text-left">
                <li>• Ícones com drag & drop</li>
                <li>• Persistência de posições</li>
                <li>• Context menu completo</li>
                <li>• Sistema de janelas</li>
                <li>• Navegação sem reload</li>
                <li>• Background padronizado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsWindow() {
  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2 text-gray-600" />
            Configurações do Módulo
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">
                Template Base v1.0
              </h3>
              <p className="text-purple-700 text-sm">
                Módulo base com todas as funcionalidades implementadas
              </p>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border flex items-center">
                <div className="w-5 h-5 mr-3">🎨</div>
                <div>
                  <div className="font-medium">Personalizar Interface</div>
                  <div className="text-sm text-gray-600">
                    Cores, ícones e layout do módulo
                  </div>
                </div>
              </button>
              <button className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border flex items-center">
                <div className="w-5 h-5 mr-3">🔧</div>
                <div>
                  <div className="font-medium">Configurações Avançadas</div>
                  <div className="text-sm text-gray-600">
                    Parâmetros e integrações
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpWindow() {
  return (
    <div className="h-full p-6 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border h-full">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold flex items-center">
            <HelpIcon className="w-5 h-5 mr-2 text-blue-600" />
            Ajuda e Documentação
          </h2>
        </div>
        <div className="p-6">
          <div className="prose max-w-none">
            <h3>Como usar este template:</h3>
            <ol>
              <li>Substitua os ícones pelos ícones do seu módulo</li>
              <li>Adicione suas funcionalidades nas janelas</li>
              <li>Configure as posições iniciais dos ícones</li>
              <li>Personalize as cores e textos</li>
              <li>Adicione suas rotas no App.tsx</li>
            </ol>

            <h3>Funcionalidades disponíveis:</h3>
            <ul>
              <li>Drag & drop de ícones</li>
              <li>Context menu com opções</li>
              <li>Auto-organização em grade</li>
              <li>Persistência de posições</li>
              <li>Sistema de janelas</li>
              <li>Taskbar persistente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Context Menu Component
function ContextMenu({
  x,
  y,
  targetId,
  onClose,
  onAction,
}: {
  x: number;
  y: number;
  targetId: string;
  onClose: () => void;
  onAction: (action: string, targetId: string) => void;
}) {
  return (
    <div
      className="fixed bg-gray-900 border border-gray-500 rounded-xl shadow-2xl py-3 z-[9999] min-w-[240px]"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      <div className="px-4 py-2 text-xs font-semibold text-purple-400 border-b border-gray-700">
        📱 AÇÕES DO ÍCONE
      </div>
      <button
        onClick={() => onAction("open", targetId)}
        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
      >
        <span>📂</span>
        <span>Abrir</span>
      </button>
      <button
        onClick={() => onAction("properties", targetId)}
        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors text-sm flex items-center space-x-2"
      >
        <span>ℹ️</span>
        <span>Propriedades</span>
      </button>

      <div className="border-t border-gray-700 my-1"></div>
      <div className="px-4 py-1 text-xs font-semibold text-green-400">
        🪟 DESKTOP
      </div>

      <button
        onClick={() => onAction("newWindow", targetId)}
        className="w-full px-4 py-2 text-left text-white hover:bg-green-600/20 transition-colors text-sm flex items-center space-x-2"
      >
        <span>🪟</span>
        <span>Nova Janela</span>
      </button>

      <button
        onClick={() => onAction("desktopSettings", targetId)}
        className="w-full px-4 py-2 text-left text-white hover:bg-green-600/20 transition-colors text-sm flex items-center space-x-2"
      >
        <span>⚙️</span>
        <span>Configurações</span>
      </button>

      <div className="border-t border-gray-700 my-1"></div>
      <div className="px-4 py-1 text-xs font-semibold text-blue-400">
        📐 ORGANIZAÇÃO
      </div>

      <button
        onClick={() => onAction("autoOrganize", targetId)}
        className="w-full px-4 py-3 text-left text-white hover:bg-blue-600/20 transition-colors text-sm flex items-center gap-3"
      >
        <span className="text-lg">🔄</span>
        <div>
          <div className="font-medium">Organizar Auto</div>
          <div className="text-xs text-gray-400">Grade ordenada</div>
        </div>
      </button>

      <button
        onClick={() => onAction("resetPositions", targetId)}
        className="w-full px-4 py-3 text-left text-white hover:bg-blue-600/20 transition-colors text-sm flex items-center gap-3"
      >
        <span className="text-lg">↩️</span>
        <div>
          <div className="font-medium">Resetar Posições</div>
          <div className="text-xs text-gray-400">Posições originais</div>
        </div>
      </button>

      <div className="border-t border-gray-700 my-1"></div>
      <div className="px-4 py-2 text-xs text-gray-500">
        💡 <strong>Dica:</strong> Arraste os ícones ou use duplo-clique
      </div>
    </div>
  );
}

// Desktop Icon Component
function DesktopIcon({
  app,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onDragEnd,
}: {
  app: AppItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDoubleClick: (app: AppItem) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const IconComponent = app.icon;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(app.id)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(app.id)}
      onDoubleClick={() => onDoubleClick(app)}
      onContextMenu={(e) => onContextMenu(e, app.id)}
      className={`group relative transition-all duration-300 cursor-pointer ${
        isSelected
          ? "bg-white/20 ring-2 ring-white/60 backdrop-blur-sm rounded-3xl p-2"
          : ""
      } ${!app.isActive ? "opacity-40" : ""}`}
      style={{
        position: "absolute",
        left: app.position?.x || 0,
        top: app.position?.y || 0,
      }}
    >
      <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
        <IconComponent
          size={64}
          color={app.isActive ? "white" : "#9ca3af"}
          style={{
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
          }}
        />
      </div>
      <div className="w-44 text-center mx-auto">
        <span
          className={`font-semibold text-xs leading-tight drop-shadow-lg block ${
            app.isActive ? "text-white" : "text-gray-400"
          }`}
        >
          {app.name}
        </span>
        {app.isActive ? (
          <span className="text-green-400 text-xs font-medium mt-1 block">
            ● ATIVO
          </span>
        ) : (
          <span className="text-orange-400 text-xs font-medium mt-1 block">
            ● EXEMPLO
          </span>
        )}
      </div>
    </div>
  );
}

// Main Desktop Interface
function DesktopInterface() {
  const createWindow = useCreateWindow();
  const navigate = useNavigate();
  const [desktopState, setDesktopState] = React.useState<DesktopState>({
    apps: [],
    folders: [],
    selectedItems: [],
    contextMenu: null,
    isDragging: false,
    dragTarget: null,
  });

  // Initialize desktop with example apps
  React.useEffect(() => {
    const exampleApps: AppItem[] = [
      {
        id: "platform-home",
        name: "VOLTAR PLATAFORMA",
        icon: HomeIcon,
        color: "from-blue-500 to-blue-600",
        component: null, // Will handle click differently
        size: { width: 0, height: 0 },
        type: "app",
        position: { x: 70, y: 200 },
        isInstalled: true,
        category: "navigation",
        isActive: true,
      },
      {
        id: "main-app",
        name: "Aplicação Principal",
        icon: DefaultIcon,
        color: "from-purple-700 to-purple-800",
        component: <ExampleWindow />,
        size: { width: 1200, height: 800 },
        type: "app",
        position: { x: 270, y: 200 },
        isInstalled: true,
        isActive: true,
      },
      {
        id: "settings-app",
        name: "Configurações",
        icon: SettingsIcon,
        color: "from-gray-500 to-gray-600",
        component: <SettingsWindow />,
        size: { width: 800, height: 600 },
        type: "app",
        position: { x: 470, y: 200 },
        isInstalled: true,
        category: "system",
        isActive: true,
      },
      {
        id: "help-app",
        name: "Ajuda",
        icon: HelpIcon,
        color: "from-blue-500 to-blue-600",
        component: <HelpWindow />,
        size: { width: 900, height: 700 },
        type: "app",
        position: { x: 670, y: 200 },
        isInstalled: true,
        category: "help",
        isActive: true,
      },
    ];

    setDesktopState((prev) => ({
      ...prev,
      apps: exampleApps,
    }));
  }, []);

  // Load saved positions from localStorage
  const [positionsLoaded, setPositionsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (desktopState.apps.length > 0 && !positionsLoaded) {
      const savedPositions = localStorage.getItem("baseModulePositions");
      if (savedPositions) {
        try {
          const positions = JSON.parse(savedPositions);
          setDesktopState((prev) => ({
            ...prev,
            apps: prev.apps.map((app) => ({
              ...app,
              position: positions[app.id] || app.position,
            })),
          }));
        } catch (error) {
          console.error("Error loading saved positions:", error);
        }
      }
      setPositionsLoaded(true);
    }
  }, [desktopState.apps.length, positionsLoaded]);

  // Save positions to localStorage
  React.useEffect(() => {
    if (positionsLoaded && desktopState.apps.length > 0) {
      const positions: { [key: string]: { x: number; y: number } } = {};
      desktopState.apps.forEach((app) => {
        if (app.position) {
          positions[app.id] = app.position;
        }
      });
      localStorage.setItem("baseModulePositions", JSON.stringify(positions));
    }
  }, [desktopState.apps, positionsLoaded]);

  const handleIconSelect = (id: string) => {
    setDesktopState((prev) => ({
      ...prev,
      selectedItems: prev.selectedItems.includes(id)
        ? prev.selectedItems.filter((i) => i !== id)
        : [id],
    }));
  };

  const handleIconDoubleClick = (app: AppItem) => {
    // Special handling for platform navigation
    if (app.id === "platform-home") {
      navigate("/platform");
      return;
    }

    createWindow(app.name, app.component, {
      size: app.size,
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 100,
      },
    });
  };

  const handleContextMenu = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    setDesktopState((prev) => ({
      ...prev,
      contextMenu: { x: e.clientX, y: e.clientY, targetId },
    }));
  };

  const handleContextAction = (action: string, targetId: string) => {
    const item = desktopState.apps.find((i) => i.id === targetId);

    switch (action) {
      case "open":
        if (item) handleIconDoubleClick(item);
        break;
      case "properties":
        if (item) {
          const info = [
            `Nome: ${item.name}`,
            `Categoria: ${item.category}`,
            `Status: ${item.isActive ? "Ativo" : "Inativo"}`,
            `Posição: X:${item.position?.x}, Y:${item.position?.y}`,
            `ID: ${item.id}`,
          ];
          alert(`Propriedades do Item:\n\n${info.join("\n")}`);
        }
        break;
      case "autoOrganize":
        handleAutoOrganize();
        break;
      case "resetPositions":
        handleResetPositions();
        break;
      case "newWindow":
        alert("Nova Janela: Funcionalidade em desenvolvimento");
        break;
      case "desktopSettings":
        alert("Configurações do Desktop:\n\nPersonalize seu módulo aqui!");
        break;
    }

    setDesktopState((prev) => ({ ...prev, contextMenu: null }));
  };

  const handleDragStart = (id: string) => {
    setDesktopState((prev) => ({
      ...prev,
      isDragging: true,
      dragTarget: id,
    }));
  };

  const handleDragEnd = () => {
    setDesktopState((prev) => ({
      ...prev,
      isDragging: false,
      dragTarget: null,
    }));
  };

  const handleAutoOrganize = () => {
    let x = 70;
    let y = 200;
    const itemsPerRow = 5;
    let itemCount = 0;

    const newApps = desktopState.apps.map((app) => {
      const newApp = {
        ...app,
        position: { x, y },
      };

      itemCount++;
      if (itemCount % itemsPerRow === 0) {
        x = 70;
        y += 150;
      } else {
        x += 200;
      }

      return newApp;
    });

    setDesktopState((prev) => ({
      ...prev,
      apps: newApps,
    }));
  };

  const handleResetPositions = () => {
    const originalPositions = [
      { id: "platform-home", x: 70, y: 200 },
      { id: "main-app", x: 270, y: 200 },
      { id: "settings-app", x: 470, y: 200 },
      { id: "help-app", x: 670, y: 200 },
    ];

    setDesktopState((prev) => ({
      ...prev,
      apps: prev.apps.map((app) => {
        const originalPos = originalPositions.find((pos) => pos.id === app.id);
        return originalPos
          ? { ...app, position: { x: originalPos.x, y: originalPos.y } }
          : app;
      }),
    }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!desktopState.dragTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 40;

    setDesktopState((prev) => ({
      ...prev,
      apps: prev.apps.map((app) =>
        app.id === prev.dragTarget
          ? { ...app, position: { x: Math.max(0, x), y: Math.max(0, y) } }
          : app,
      ),
      isDragging: false,
      dragTarget: null,
    }));
  };

  return (
    <div
      className="absolute inset-0"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() =>
        setDesktopState((prev) => ({
          ...prev,
          contextMenu: null,
          selectedItems: [],
        }))
      }
    >
      {/* Desktop Icons */}
      {desktopState.apps.map((app) => (
        <DesktopIcon
          key={app.id}
          app={app}
          isSelected={desktopState.selectedItems.includes(app.id)}
          onSelect={handleIconSelect}
          onDoubleClick={handleIconDoubleClick}
          onContextMenu={handleContextMenu}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Context Menu */}
      {desktopState.contextMenu && (
        <ContextMenu
          x={desktopState.contextMenu.x}
          y={desktopState.contextMenu.y}
          targetId={desktopState.contextMenu.targetId}
          onClose={() =>
            setDesktopState((prev) => ({ ...prev, contextMenu: null }))
          }
          onAction={handleContextAction}
        />
      )}

      {/* Module Info Panel */}
      <div className="absolute bottom-20 left-6 bg-black/50 backdrop-blur-xl rounded-2xl p-4 border border-white/30 max-w-sm shadow-2xl">
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center space-x-2">
            <span>📱</span>
            <span>Template Base v1.0</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>🔧</span>
            <span>Apps: {desktopState.apps.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>✅</span>
            <span>Status: Pronto para customização</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>💡</span>
            <span>Duplo-clique para abrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Module Component
export default function BaseModuleTemplate() {
  return (
    <div className="absolute inset-0 bg-gray-800">
      <DesktopInterface />
    </div>
  );
}
