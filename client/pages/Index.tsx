import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Index() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  console.log("🔍 Index - Auth State:", { user, isAuthenticated });

  useEffect(() => {
    console.log("🔄 Index useEffect - user:", user, "isAuthenticated:", isAuthenticated);
    
    // SIMPLIFIED: Direct check without loading state
    if (isAuthenticated && user) {
      console.log("✅ User authenticated, navigating to /platform");
      navigate("/platform");
    } else {
      console.log("❌ No user, navigating to /login");
      navigate("/login");
    }
  }, [user, isAuthenticated, navigate]);

  // Mostra loading enquanto verifica autenticação
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400">Verificando autenticação...</p>
      </div>
    </div>
  );
}
