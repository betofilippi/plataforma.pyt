import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { WindowCard } from '@/components/ui';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuthStatus } = useAuth();

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the auth code from URL params
      const authCode = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      if (!authCode) {
        throw new Error('Código de autorização não encontrado');
      }

      // Exchange the auth code for a session
      const { data, error: supabaseError } = await supabase.auth.exchangeCodeForSession(authCode);

      if (supabaseError) {
        throw supabaseError;
      }

      if (!data.session) {
        throw new Error('Sessão não criada');
      }

      // Sync with our auth system
      try {
        await syncWithAuthSystem(data.session, data.user);
        setSuccess(true);
        toast.success('Login realizado com sucesso!');
        
        // Update auth context
        await checkAuthStatus();
        
        // Redirect after short delay
        setTimeout(() => {
          navigate('/platform', { replace: true });
        }, 2000);
        
      } catch (syncError: any) {
        console.error('Auth sync error:', syncError);
        // Even if sync fails, we can still proceed with Supabase session
        toast.warning('Login realizado, mas houve problemas de sincronização');
        setTimeout(() => {
          navigate('/platform', { replace: true });
        }, 2000);
      }

    } catch (error: any) {
      console.error('Auth callback error:', error);
      setError(error.message || 'Erro durante autenticação');
      toast.error(error.message || 'Erro durante autenticação');
      
      // Redirect to login after error
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const syncWithAuthSystem = async (session: any, user: any) => {
    // This function should sync the Supabase session with our internal auth system
    // You might want to call your backend API to create/update user records
    
    const userData = {
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      avatarUrl: user.user_metadata?.avatar_url,
      provider: user.app_metadata?.provider,
      providerId: user.id,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    };

    // Here you would typically call your backend API
    // For now, we'll just store the session data
    console.log('User data from OAuth:', userData);
    
    return userData;
  };

  if (loading) {
    return null; // No visual loader
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <WindowCard title="Erro de Autenticação">
          <div className="flex flex-col items-center space-y-4 p-8">
            <XCircle className="w-8 h-8 text-red-500" />
            <p className="text-red-300 text-center">{error}</p>
            <p className="text-gray-400 text-sm">Redirecionando para login...</p>
          </div>
        </WindowCard>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <WindowCard title="Login Realizado!">
          <div className="flex flex-col items-center space-y-4 p-8">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <p className="text-green-300">Você foi autenticado com sucesso!</p>
            <p className="text-gray-400 text-sm">Redirecionando para a plataforma...</p>
          </div>
        </WindowCard>
      </div>
    );
  }

  return null;
}

export default AuthCallback;