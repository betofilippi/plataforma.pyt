import React from "react";
import { useNavigate } from "react-router-dom";
import {
  WindowManagerProvider,
  WindowDesktop,
  useCreateWindow,
} from "@/components/windows";
import { useAuth } from '@/contexts/AuthContext';
import DesktopIconRenderer from '@/components/DesktopIconRenderer';

// ====================================================================
// DESKTOP CONTENT - Agora ultra-simplificado usando o sistema automático
// ====================================================================

function PlatformDashboardContent() {
  const navigate = useNavigate();
  const createWindow = useCreateWindow();
  const { user } = useAuth();

  return (
    <div className="absolute inset-0" style={{ background: "#1f2937" }}>
      {/* Desktop Icons - Sistema Automático */}
      <div className="absolute top-32 left-12">
        <DesktopIconRenderer 
          user={user} 
          createWindow={createWindow}
          className="grid grid-cols-4 gap-6"
        />
      </div>
    </div>
  );
}

export default function PlatformDashboardFixed() {
  return (
    <WindowManagerProvider>
      <WindowDesktop 
        showTaskbar={true}
        backgroundColor="#1f2937"
        disableContextMenu={false}
      >
        <PlatformDashboardContent />
      </WindowDesktop>
    </WindowManagerProvider>
  );
}