import React, { useState } from 'react';
import { WindowButton, WindowCard } from '@/components/ui';
import { Github, Mail, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SocialAuthProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface Provider {
  id: 'google' | 'github' | 'discord';
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const providers: Provider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: <Mail className="w-5 h-5" />,
    color: 'from-red-500 to-red-600',
    description: 'Continue com sua conta Google'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: <Github className="w-5 h-5" />,
    color: 'from-gray-700 to-gray-800',
    description: 'Continue com sua conta GitHub'
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: <MessageCircle className="w-5 h-5" />,
    color: 'from-indigo-500 to-indigo-600',
    description: 'Continue com sua conta Discord'
  }
];

export function SocialAuth({ onSuccess, onError }: SocialAuthProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const { socialLogin } = useAuth();

  const handleSocialLogin = async (providerId: Provider['id']) => {
    setLoadingProvider(providerId);
    
    try {
      await socialLogin(providerId);
      
      // OAuth redirect will happen automatically
      toast.success(`Redirecionando para ${providers.find(p => p.id === providerId)?.name}...`);
      
    } catch (error: any) {
      console.error('Social login error:', error);
      const errorMessage = error.message || `Erro ao fazer login com ${providerId}`;
      
      toast.error(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Social Login Options */}
      <div className="space-y-3">
        {providers.map((provider) => (
          <WindowButton
            key={provider.id}
            variant="secondary"
            className={`w-full justify-start space-x-3 py-3 px-4 bg-gradient-to-r ${provider.color} hover:opacity-90 text-white border-none`}
            onClick={() => handleSocialLogin(provider.id)}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === provider.id ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              provider.icon
            )}
            <div className="flex-1 text-left">
              <div className="font-medium">{provider.name}</div>
              <div className="text-sm opacity-90">{provider.description}</div>
            </div>
          </WindowButton>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-900 px-2 text-gray-400">ou</span>
        </div>
      </div>
    </div>
  );
}

export default SocialAuth;