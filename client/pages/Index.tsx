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

  // Retorna null enquanto redireciona (sem loader visual)
  return null;
}
