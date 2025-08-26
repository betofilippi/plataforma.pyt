import React, { Suspense } from 'react';
import { MarketplacePage } from './marketplace';
import { useAuth } from '@/contexts/AuthContext';
import { WindowCard } from '@/components/ui/WindowCard';

// Loading component
const MarketplaceLoading = () => (
  <div className="h-full flex items-center justify-center">
    <WindowCard className="text-center p-8">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
      <h3 className="text-lg font-semibold text-white mb-2">Carregando Marketplace</h3>
      <p className="text-gray-400">Aguarde enquanto carregamos os módulos disponíveis...</p>
    </WindowCard>
  </div>
);

// Error boundary component
class MarketplaceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Marketplace Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <WindowCard className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Erro no Marketplace
            </h3>
            <p className="text-gray-400 mb-4">
              Ocorreu um erro ao carregar o marketplace. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Recarregar página
            </button>
          </WindowCard>
        </div>
      );
    }

    return this.props.children;
  }
}

interface MarketplaceModuleProps {
  onClose?: () => void;
}

export default function MarketplaceModule({ onClose }: MarketplaceModuleProps) {
  const { user, isAuthenticated } = useAuth();

  // Show login prompt for unauthenticated users
  if (!isAuthenticated || !user) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <WindowCard className="text-center max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Login necessário
          </h3>
          <p className="text-gray-400 mb-4">
            Faça login para acessar o marketplace e instalar módulos.
          </p>
        </WindowCard>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900">
      <MarketplaceErrorBoundary>
        <Suspense fallback={<MarketplaceLoading />}>
          <MarketplacePage onClose={onClose} />
        </Suspense>
      </MarketplaceErrorBoundary>
    </div>
  );
}