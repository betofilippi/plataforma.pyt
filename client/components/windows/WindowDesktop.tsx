import React from "react";
import { Window } from "./Window";
import { useWindowManager } from "./WindowManager";
// import { OSAdvancedTaskbar } from "./OSAdvancedTaskbar";
import { WindowTaskbar } from "./WindowTaskbar";

interface WindowDesktopProps {
  children?: React.ReactNode;
  showTaskbar?: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  disableContextMenu?: boolean;
}

export function WindowDesktop({
  children,
  showTaskbar = true,
  backgroundImage,
  backgroundColor = "#1a1a2e",
  disableContextMenu = false,
}: WindowDesktopProps) {
  const { windows } = useWindowManager();

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: backgroundImage
          ? `url(${backgroundImage}) center/cover`
          : "#1f2937",
      }}
    >
      {/* Desktop Background Content */}
      {children}

      {/* Windows Layer */}
      {windows.map((window) => (
        <Window key={window.id} window={window} />
      ))}

      {/* Taskbar */}
      {showTaskbar && <WindowTaskbar />}

      {/* Desktop Context Menu (Future Enhancement) */}
      {!disableContextMenu && <DesktopContextMenu />}
    </div>
  );
}

// Simple context menu component (can be expanded)
function DesktopContextMenu() {
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleClick = () => {
    setContextMenu(null);
  };

  React.useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Only show context menu if right-clicking on empty desktop space
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest(".taskbar") ||
        target.closest(".window")
      ) {
        return;
      }
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <>
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-2 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors"
            onClick={() => {
              // Future: Add new window creation
              setContextMenu(null);
            }}
          >
            Nova Janela
          </button>
        </div>
      )}
    </>
  );
}
