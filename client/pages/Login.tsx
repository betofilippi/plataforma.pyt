import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { WindowManagerProvider, WindowDesktop } from "@/components/windows";
import { Eye, EyeOff, Lock, User, ArrowRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Login Modal Component
function LoginModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset,
  } = useForm<LoginFormData>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Clear errors when component mounts or inputs change
  useEffect(() => {
    clearError();
  }, [clearError, watch("email"), watch("password")]);

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    
    console.log("🔐 Login attempt with:", data.email);
    
    try {
      const result = await login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      console.log("🔐 Login result:", result);

      if (result.success) {
        console.log("✅ Login successful, redirecting to /platform");
        
        // Close modal and redirect manually
        onClose();
        setTimeout(() => {
          navigate("/platform");
        }, 100);
      }
      // Error handling is done by the AuthContext
    } catch (err) {
      console.error("❌ Login error:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
      onKeyDown={handleKeyPress}
    >
      <div className="bg-black/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Fechar modal"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              Acesso ao Sistema
            </h2>
            <p className="text-gray-400 text-sm">
              Faça login para acessar a plataforma
            </p>
          </div>

          {/* Global Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                {...register("email", {
                  required: "Email é obrigatório",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Email inválido",
                  },
                })}
                className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  errors.email 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-white/20 focus:ring-purple-700"
                }`}
                placeholder="seu@email.com"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                {...register("password", {
                  required: "Senha é obrigatória",
                  minLength: {
                    value: 1,
                    message: "Senha é obrigatória",
                  },
                })}
                className={`w-full pl-10 pr-12 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                  errors.password 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-white/20 focus:ring-purple-700"
                }`}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              {...register("rememberMe")}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-purple-700 focus:ring-purple-700 border-gray-300 rounded"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-300">
              Manter-me conectado
            </label>
          </div>

          {/* Social Authentication - Temporariamente desabilitado */}
          {/* <SocialAuth 
            onSuccess={() => {
              onClose();
              const from = (location.state as any)?.from?.pathname || "/platform";
              navigate(from, { replace: true });
            }}
            onError={(error) => {
              console.error('Social auth error:', error);
            }}
          /> */}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !isValid}
            className="w-full py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Entrando...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Entrar com Email</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </Button>

          {/* Demo Notice */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-sm text-gray-300 font-medium mt-4 mb-2">
              🔐 Credenciais Demo Disponíveis:
            </p>
            <div className="space-y-1">
              <p className="text-xs text-gray-400">
                <span className="text-purple-400">Admin:</span> admin@plataforma.app / admin123
              </p>
              <p className="text-xs text-gray-400">
                <span className="text-blue-400">Usuário:</span> user@plataforma.app / user123
              </p>
              <p className="text-xs text-gray-400">
                <span className="text-green-400">Gerente:</span> manager@plataforma.app / manager123
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              💡 Ou use qualquer email/senha para criar uma conta temporária
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

// Custom platform icon component
function PlatformIcon({ sx }: { sx?: any }) {
  return (
    <img
      src="https://cdn.builder.io/api/v1/image/assets%2Fafa66ef253664b4ebcf8a4c1c9861fb0%2F351333bfea9e404ea148cbaecbabe593?format=webp&width=800"
      alt="Plataforma.app"
      style={{
        width: sx?.fontSize || "64px",
        height: sx?.fontSize || "64px",
        objectFit: "contain",
        filter: sx?.filter || "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      }}
    />
  );
}

export default function Login() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLoginClick = () => {
    setShowLoginModal(true);
  };

  return (
    <WindowManagerProvider>
      <WindowDesktop showTaskbar={false} backgroundColor="#1f2937">
        {/* Login Container */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div
            className="w-full max-w-md"
            style={{ maxWidth: "457px", marginLeft: "1px", paddingLeft: "3px" }}
          >
            {/* Header */}
            <div
              className="text-center mb-8 cursor-pointer"
              onClick={handleLoginClick}
            >
              <div className="flex justify-center mb-6 hover:scale-105 transition-transform duration-200">
                <PlatformIcon sx={{ fontSize: 100 }} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 hover:text-purple-400 transition-colors">
                PLATAFORMA.APP
              </h1>
              <p className="text-gray-300 hover:text-white transition-colors">
                Sistema Integrado de Gestão da NXT Indústria e Comércio Ltda.
              </p>
            </div>

            {/* Quick Login Button */}
            <div className="text-center mb-8">
              <Button
                onClick={handleLoginClick}
                className="px-8 py-3 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg"
              >
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Fazer Login</span>
                </div>
              </Button>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-xs text-gray-500">
              PLATAFORMA.APP © 2025 - Sistema Integrado de Gestão
              <br />
              Desenvolvido por NXT Indústria e Comércio Ltda.
            </div>

            {/* Login Modal */}
            {showLoginModal && (
              <LoginModal
                onClose={() => setShowLoginModal(false)}
              />
            )}
          </div>
        </div>
      </WindowDesktop>
    </WindowManagerProvider>
  );
}
