import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WindowManagerProvider } from "@/components/windows";
import { WindowTaskbar } from "@/components/windows/WindowTaskbar";

interface MainLayoutProps {
  children: React.ReactNode;
  showTaskbar?: boolean;
}

export function MainLayout({ children, showTaskbar = true }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show taskbar on login page
  const shouldShowTaskbar =
    showTaskbar && !location.pathname.startsWith("/login");

  return (
    <WindowManagerProvider>
      <div className="fixed inset-0 bg-gray-800">
        {/* Main content area */}
        <div
          className={`absolute inset-0 ${shouldShowTaskbar ? "bottom-14" : "bottom-0"}`}
        >
          {children}
        </div>

        {/* Persistent Taskbar */}
        {shouldShowTaskbar && <WindowTaskbar />}
      </div>
    </WindowManagerProvider>
  );
}
