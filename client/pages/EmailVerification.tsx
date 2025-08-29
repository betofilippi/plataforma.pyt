import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { WindowManagerProvider, WindowDesktop } from "@/components/windows";
import { 
  CheckCircle, 
  XCircle, 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  Clock,
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import pythonApiClient from "@/lib/python-api-client";

// Custom platform icon component (reused from Login)
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

interface VerificationState {
  status: 'loading' | 'success' | 'error' | 'expired' | 'invalid' | 'already_verified';
  message: string;
  email?: string;
  canResend?: boolean;
}

export default function EmailVerification() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [verificationState, setVerificationState] = useState<VerificationState>({
    status: 'loading',
    message: 'Verificando seu email...',
  });
  const [isResending, setIsResending] = useState(false);
  const { clearError } = useAuth();

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setVerificationState({
        status: 'invalid',
        message: 'Link de verificação inválido',
        canResend: true,
      });
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      // Since the API client doesn't have an email verification endpoint yet,
      // we'll make a direct API call
      const response = await pythonApiClient.post('/api/v1/auth/verify-email', {
        token: verificationToken,
      });

      if (response.success) {
        setVerificationState({
          status: 'success',
          message: 'Email verificado com sucesso!',
          email: response.user?.email,
        });
      } else {
        handleVerificationError(response.message || 'Falha na verificação');
      }
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      // Handle different error types
      if (error.status === 400) {
        setVerificationState({
          status: 'invalid',
          message: 'Link de verificação inválido ou malformado',
          canResend: true,
        });
      } else if (error.status === 410) {
        setVerificationState({
          status: 'expired',
          message: 'Link de verificação expirado',
          canResend: true,
        });
      } else if (error.status === 409) {
        setVerificationState({
          status: 'already_verified',
          message: 'Este email já foi verificado',
          email: email || undefined,
        });
      } else {
        setVerificationState({
          status: 'error',
          message: error.message || 'Erro interno do servidor',
          canResend: true,
        });
      }
    }
  };

  const handleVerificationError = (message: string) => {
    if (message.toLowerCase().includes('expired')) {
      setVerificationState({
        status: 'expired',
        message: 'Link de verificação expirado',
        canResend: true,
      });
    } else if (message.toLowerCase().includes('invalid')) {
      setVerificationState({
        status: 'invalid',
        message: 'Link de verificação inválido',
        canResend: true,
      });
    } else if (message.toLowerCase().includes('already')) {
      setVerificationState({
        status: 'already_verified',
        message: 'Email já foi verificado',
        email: email || undefined,
      });
    } else {
      setVerificationState({
        status: 'error',
        message: message,
        canResend: true,
      });
    }
  };

  const handleResendVerification = async () => {
    if (!email && !verificationState.email) {
      setVerificationState({
        ...verificationState,
        message: 'Email não informado para reenvio',
      });
      return;
    }

    setIsResending(true);
    
    try {
      const response = await pythonApiClient.post('/api/v1/auth/resend-verification', {
        email: email || verificationState.email,
      });

      if (response.success) {
        setVerificationState({
          status: 'loading',
          message: 'Email de verificação reenviado! Verifique sua caixa de entrada.',
        });
      } else {
        setVerificationState({
          ...verificationState,
          message: response.message || 'Falha ao reenviar email de verificação',
        });
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      setVerificationState({
        ...verificationState,
        message: error.message || 'Erro ao reenviar email de verificação',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    clearError();
    navigate('/login');
  };

  const getIcon = () => {
    switch (verificationState.status) {
      case 'loading':
        return <RefreshCw className="w-16 h-16 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'expired':
        return <Clock className="w-16 h-16 text-yellow-400" />;
      case 'already_verified':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'invalid':
      case 'error':
      default:
        return <XCircle className="w-16 h-16 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationState.status) {
      case 'success':
      case 'already_verified':
        return 'text-green-400';
      case 'expired':
        return 'text-yellow-400';
      case 'loading':
        return 'text-blue-400';
      case 'invalid':
      case 'error':
      default:
        return 'text-red-400';
    }
  };

  const getBorderColor = () => {
    switch (verificationState.status) {
      case 'success':
      case 'already_verified':
        return 'border-green-500/50';
      case 'expired':
        return 'border-yellow-500/50';
      case 'loading':
        return 'border-blue-500/50';
      case 'invalid':
      case 'error':
      default:
        return 'border-red-500/50';
    }
  };

  const getBackgroundColor = () => {
    switch (verificationState.status) {
      case 'success':
      case 'already_verified':
        return 'bg-green-500/20';
      case 'expired':
        return 'bg-yellow-500/20';
      case 'loading':
        return 'bg-blue-500/20';
      case 'invalid':
      case 'error':
      default:
        return 'bg-red-500/20';
    }
  };

  return (
    <WindowManagerProvider>
      <WindowDesktop showTaskbar={false} backgroundColor="#1f2937">
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <PlatformIcon sx={{ fontSize: 80 }} />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                PLATAFORMA.APP
              </h1>
              <p className="text-gray-300">
                Verificação de Email
              </p>
            </div>

            {/* Verification Status Card */}
            <div className={`${getBackgroundColor()} backdrop-blur-sm rounded-3xl p-8 border ${getBorderColor()} shadow-2xl`}>
              {/* Status Icon */}
              <div className="flex justify-center mb-6">
                {getIcon()}
              </div>

              {/* Status Message */}
              <div className="text-center space-y-4">
                <h2 className={`text-xl font-semibold ${getStatusColor()}`}>
                  {verificationState.status === 'loading' && 'Verificando...'}
                  {verificationState.status === 'success' && 'Verificação Concluída!'}
                  {verificationState.status === 'already_verified' && 'Email Já Verificado'}
                  {verificationState.status === 'expired' && 'Link Expirado'}
                  {verificationState.status === 'invalid' && 'Link Inválido'}
                  {verificationState.status === 'error' && 'Erro na Verificação'}
                </h2>

                <p className="text-gray-300 text-sm">
                  {verificationState.message}
                </p>

                {verificationState.email && (
                  <p className="text-gray-400 text-xs">
                    Email: <span className="text-white">{verificationState.email}</span>
                  </p>
                )}

                {email && !verificationState.email && (
                  <p className="text-gray-400 text-xs">
                    Email: <span className="text-white">{email}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                {(verificationState.status === 'success' || verificationState.status === 'already_verified') && (
                  <Button
                    onClick={handleGoToLogin}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>Ir para Login</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </Button>
                )}

                {verificationState.canResend && (
                  <Button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isResending ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Reenviando...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          <span>Reenviar Email</span>
                        </>
                      )}
                    </div>
                  </Button>
                )}

                <Button
                  onClick={handleGoToLogin}
                  className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>Voltar ao Login</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Button>
              </div>

              {/* Additional Information */}
              {verificationState.status === 'expired' && (
                <div className="mt-6 bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-yellow-300 text-sm">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Link expirado</p>
                      <p className="text-xs">Links de verificação são válidos por 24 horas. Clique em "Reenviar Email" para receber um novo link.</p>
                    </div>
                  </div>
                </div>
              )}

              {verificationState.status === 'invalid' && (
                <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">
                  <div className="flex items-start space-x-2">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Link inválido</p>
                      <p className="text-xs">O link pode estar corrompido ou já ter sido usado. Solicite um novo email de verificação.</p>
                    </div>
                  </div>
                </div>
              )}

              {verificationState.status === 'success' && (
                <div className="mt-6 bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-green-300 text-sm">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Verificação concluída!</p>
                      <p className="text-xs">Sua conta foi ativada com sucesso. Você já pode fazer login na plataforma.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-xs text-gray-500">
              PLATAFORMA.APP © 2025 - Sistema Integrado de Gestão
              <br />
              Desenvolvido por NXT Indústria e Comércio Ltda.
            </div>
          </div>
        </div>
      </WindowDesktop>
    </WindowManagerProvider>
  );
}