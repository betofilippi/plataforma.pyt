import React from 'react';
import { 
  Star, 
  Download, 
  Shield, 
  Clock, 
  TrendingUp, 
  Sparkles,
  Crown,
  DollarSign,
  Users
} from 'lucide-react';
import { MarketplaceModule } from '../types';
import { useModuleInstaller } from '../hooks/useModuleInstaller';
import { WindowButton } from '@/components/ui/WindowButton';

interface ModuleCardProps {
  module: MarketplaceModule;
  viewMode: 'grid' | 'list';
  isInstalled: boolean;
  onClick: () => void;
  featured?: boolean;
  trending?: boolean;
  newRelease?: boolean;
}

export default function ModuleCard({ 
  module, 
  viewMode, 
  isInstalled, 
  onClick,
  featured = false,
  trending = false,
  newRelease = false 
}: ModuleCardProps) {
  const { installModule, isModuleInstalling } = useModuleInstaller();
  const installing = isModuleInstalling(module.id);

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!installing && !isInstalled) {
      try {
        await installModule(module.id, module.displayName);
      } catch (error) {
        console.error('Installation failed:', error);
      }
    }
  };

  // Format price
  const formatPrice = () => {
    if (module.price.type === 'free') return 'Gratuito';
    if (module.price.type === 'freemium') return 'Freemium';
    if (module.price.amount) {
      return `${module.price.currency} ${module.price.amount.toFixed(2)}`;
    }
    return 'Pago';
  };

  // Format downloads count
  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get badge based on type
  const getBadge = () => {
    if (featured) return { icon: <Sparkles className="w-3 h-3" />, text: 'Destaque', color: 'bg-yellow-500' };
    if (trending) return { icon: <TrendingUp className="w-3 h-3" />, text: 'Trending', color: 'bg-green-500' };
    if (newRelease) return { icon: <Clock className="w-3 h-3" />, text: 'Novo', color: 'bg-blue-500' };
    return null;
  };

  const badge = getBadge();

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 cursor-pointer transition-all duration-200"
      >
        <div className="flex items-center space-x-4">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center overflow-hidden">
              {module.icon ? (
                <img 
                  src={module.icon} 
                  alt={module.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-white">
                  {module.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {badge && (
              <div className={`absolute -top-1 -right-1 ${badge.color} text-white text-xs px-1.5 py-0.5 rounded-full flex items-center space-x-1`}>
                {badge.icon}
                <span>{badge.text}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {module.displayName}
                </h3>
                <p className="text-sm text-gray-400 mb-2 line-clamp-1">
                  {module.description}
                </p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {module.author.name}
                  </span>
                  
                  <span className="flex items-center">
                    <Star className="w-3 h-3 mr-1 text-yellow-400" />
                    {module.ratings.average.toFixed(1)} ({module.ratings.count})
                  </span>
                  
                  <span className="flex items-center">
                    <Download className="w-3 h-3 mr-1" />
                    {formatDownloads(module.downloads)}
                  </span>

                  <span className={`flex items-center ${module.price.type === 'free' ? 'text-green-400' : 'text-orange-400'}`}>
                    {module.price.type !== 'free' && <DollarSign className="w-3 h-3 mr-1" />}
                    {formatPrice()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                {module.author.verified && (
                  <div className="flex items-center text-blue-400" title="Desenvolvedor verificado">
                    <Shield className="w-4 h-4" />
                  </div>
                )}

                <WindowButton
                  size="sm"
                  variant={isInstalled ? 'success' : 'primary'}
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {installing ? 'Instalando...' : isInstalled ? 'Instalado' : 'Instalar'}
                </WindowButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={onClick}
      className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-105"
    >
      {/* Header with icon and badge */}
      <div className="relative mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center overflow-hidden mb-4">
          {module.icon ? (
            <img 
              src={module.icon} 
              alt={module.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-white">
              {module.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        {badge && (
          <div className={`absolute top-0 right-0 ${badge.color} text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1`}>
            {badge.icon}
            <span>{badge.text}</span>
          </div>
        )}
      </div>

      {/* Title and description */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
            {module.displayName}
          </h3>
          
          {module.author.verified && (
            <div className="flex items-center text-blue-400 ml-2" title="Desenvolvedor verificado">
              <Shield className="w-4 h-4" />
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {module.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            <Users className="w-3 h-3 mr-1" />
            {module.author.name}
          </span>
          <span className={`flex items-center ${module.price.type === 'free' ? 'text-green-400' : 'text-orange-400'}`}>
            {module.price.type !== 'free' && <DollarSign className="w-3 h-3 mr-1" />}
            {formatPrice()}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center">
            <Star className="w-3 h-3 mr-1 text-yellow-400" />
            {module.ratings.average.toFixed(1)} ({module.ratings.count})
          </span>
          <span className="flex items-center">
            <Download className="w-3 h-3 mr-1" />
            {formatDownloads(module.downloads)}
          </span>
        </div>
      </div>

      {/* Tags */}
      {module.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {module.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
          {module.tags.length > 3 && (
            <span className="text-xs text-gray-400">
              +{module.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action button */}
      <WindowButton
        fullWidth
        variant={isInstalled ? 'success' : 'primary'}
        onClick={handleInstall}
        disabled={installing}
        size="sm"
      >
        {installing ? 'Instalando...' : isInstalled ? 'Instalado ✓' : 'Instalar'}
      </WindowButton>
    </div>
  );
}