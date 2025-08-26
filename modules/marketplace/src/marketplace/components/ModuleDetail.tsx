import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Star,
  Download,
  Shield,
  Clock,
  Users,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  Heart,
  Share2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Github,
  BookOpen,
  History,
  Tag,
  Camera
} from 'lucide-react';
import { WindowCard } from '@/components/ui/WindowCard';
import { WindowButton } from '@/components/ui/WindowButton';
import { MarketplaceModule, ModuleReview } from '../types';
import { useModuleInstaller } from '../hooks/useModuleInstaller';
import MarketplaceAPI from '../services/marketplace-api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface ModuleDetailProps {
  module: MarketplaceModule;
  onBack: () => void;
  onClose?: () => void;
}

export default function ModuleDetail({ module, onBack, onClose }: ModuleDetailProps) {
  const { user } = useAuth();
  const { 
    installModule, 
    uninstallModule, 
    isModuleInstalled, 
    isModuleInstalling,
    getInstallationStatus 
  } = useModuleInstaller();

  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'changelog' | 'permissions'>('overview');
  const [reviews, setReviews] = useState<ModuleReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [showAllPermissions, setShowAllPermissions] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Installation state
  const isInstalled = isModuleInstalled(module.id);
  const installing = isModuleInstalling(module.id);
  const installStatus = getInstallationStatus(module.id);

  // Load reviews on mount and tab change
  useEffect(() => {
    if (activeTab === 'reviews') {
      loadReviews();
    }
  }, [activeTab]);

  const loadReviews = async () => {
    if (loadingReviews) return;
    
    setLoadingReviews(true);
    try {
      const result = await MarketplaceAPI.getModuleReviews(module.id, reviewsPage);
      if (reviewsPage === 1) {
        setReviews(result.reviews);
      } else {
        setReviews(prev => [...prev, ...result.reviews]);
      }
      setHasMoreReviews(result.hasMore);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleInstall = async () => {
    try {
      await installModule(module.id, module.displayName);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleUninstall = async () => {
    try {
      await uninstallModule(module.id, module.displayName);
    } catch (error) {
      console.error('Uninstallation failed:', error);
    }
  };

  const handleFavorite = async () => {
    try {
      if (isFavorited) {
        await MarketplaceAPI.unfavoriteModule(module.id);
        setIsFavorited(false);
        toast({ title: "Removido dos favoritos" });
      } else {
        await MarketplaceAPI.favoriteModule(module.id);
        setIsFavorited(true);
        toast({ title: "Adicionado aos favoritos" });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao alterar favorito",
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: module.displayName,
        text: module.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copiado!" });
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

  // Render rating stars
  const renderRatingStars = (rating: number, size = 'sm') => {
    const stars = [];
    const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`${sizeClass} ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-500'}`}
        />
      );
    }
    return <div className="flex items-center space-x-1">{stars}</div>;
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Screenshots */}
            {module.screenshots && module.screenshots.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Screenshots
                </h3>
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-2">
                    <img
                      src={module.screenshots[selectedScreenshot]}
                      alt={`Screenshot ${selectedScreenshot + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  {module.screenshots.length > 1 && (
                    <div className="flex space-x-2 overflow-x-auto">
                      {module.screenshots.map((screenshot, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedScreenshot(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                            selectedScreenshot === index ? 'border-purple-500' : 'border-white/20'
                          }`}
                        >
                          <img
                            src={screenshot}
                            alt={`Thumb ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Descrição</h3>
              <div className="text-gray-300 leading-relaxed">
                {module.longDescription ? (
                  <div dangerouslySetInnerHTML={{ __html: module.longDescription }} />
                ) : (
                  <p>{module.description}</p>
                )}
              </div>
            </div>

            {/* Features/Tags */}
            {module.tags.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {module.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="bg-white/10 text-gray-300 px-3 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Dependencies */}
            {module.dependencies.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Dependências</h3>
                <div className="bg-white/5 rounded-xl p-4">
                  <ul className="space-y-2">
                    {module.dependencies.map((dep) => (
                      <li key={dep} className="text-gray-300 flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                        {dep}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl font-bold text-white">
                    {module.ratings.average.toFixed(1)}
                  </div>
                  <div>
                    {renderRatingStars(Math.round(module.ratings.average), 'lg')}
                    <p className="text-gray-400 mt-1">
                      {module.ratings.count} avaliações
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = module.ratings.breakdown[rating as keyof typeof module.ratings.breakdown];
                  const percentage = module.ratings.count > 0 ? (count / module.ratings.count) * 100 : 0;
                  
                  return (
                    <div key={rating} className="flex items-center space-x-3">
                      <span className="text-sm text-gray-400 w-8">{rating}★</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-400 w-12">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">Ainda não há avaliações</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                        {review.userAvatar ? (
                          <img 
                            src={review.userAvatar} 
                            alt={review.userName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {review.userName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white">{review.userName}</span>
                              {review.verified && (
                                <Shield className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                            {renderRatingStars(review.rating)}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-white mb-2">{review.title}</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{review.content}</p>
                        
                        {review.response && (
                          <div className="mt-3 bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-purple-300 font-medium mb-1">
                              Resposta do desenvolvedor
                            </div>
                            <p className="text-gray-300 text-sm">{review.response.content}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {hasMoreReviews && (
                <div className="text-center">
                  <WindowButton
                    variant="secondary"
                    onClick={() => {
                      setReviewsPage(prev => prev + 1);
                      loadReviews();
                    }}
                    disabled={loadingReviews}
                  >
                    {loadingReviews ? 'Carregando...' : 'Ver mais avaliações'}
                  </WindowButton>
                </div>
              )}
            </div>
          </div>
        );

      case 'changelog':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <History className="w-5 h-5 mr-2" />
              Histórico de versões
            </h3>
            
            {module.changelog.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">Nenhuma versão registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {module.changelog.map((version, index) => (
                  <div key={version.version} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-white">
                          v{version.version}
                        </span>
                        {index === 0 && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                            Atual
                          </span>
                        )}
                        {version.breaking && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Breaking
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(version.releaseDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 mb-4">{version.notes}</p>
                    
                    {version.features.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-semibold text-green-400 mb-2">Novos recursos</h5>
                        <ul className="space-y-1">
                          {version.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start">
                              <span className="text-green-400 mr-2">+</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {version.bugfixes.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-blue-400 mb-2">Correções</h5>
                        <ul className="space-y-1">
                          {version.bugfixes.map((fix, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              {fix}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'permissions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Permissões necessárias
              </h3>
              {module.permissions.length > 5 && (
                <WindowButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAllPermissions(!showAllPermissions)}
                  icon={showAllPermissions ? <ChevronUp /> : <ChevronDown />}
                >
                  {showAllPermissions ? 'Ver menos' : 'Ver todas'}
                </WindowButton>
              )}
            </div>

            {module.permissions.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-400 font-medium">Nenhuma permissão especial necessária</p>
                <p className="text-gray-400 text-sm mt-1">Este módulo roda em modo sandbox</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(showAllPermissions ? module.permissions : module.permissions.slice(0, 5)).map((permission) => (
                  <div key={permission.id} className="bg-white/5 rounded-xl p-4 flex items-start space-x-3">
                    <div className={`mt-1 p-1 rounded-full ${permission.required ? 'bg-red-500' : 'bg-yellow-500'}`}>
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">{permission.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          permission.required 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {permission.required ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{permission.description}</p>
                    </div>
                  </div>
                ))}

                {!showAllPermissions && module.permissions.length > 5 && (
                  <div className="text-center text-sm text-gray-400">
                    ... e mais {module.permissions.length - 5} permissões
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <WindowButton
            variant="secondary"
            icon={<ArrowLeft />}
            onClick={onBack}
          />
          
          <div className="flex items-center space-x-4">
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
            
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-white">{module.displayName}</h1>
                {module.author.verified && (
                  <Shield className="w-5 h-5 text-blue-400" title="Desenvolvedor verificado" />
                )}
              </div>
              <p className="text-gray-400">por {module.author.name}</p>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center">
                  {renderRatingStars(Math.round(module.ratings.average))}
                  <span className="ml-2">{module.ratings.average.toFixed(1)} ({module.ratings.count})</span>
                </span>
                <span className="flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  {formatDownloads(module.downloads)}
                </span>
                <span className={`${module.price.type === 'free' ? 'text-green-400' : 'text-orange-400'}`}>
                  {formatPrice()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user && (
            <>
              <WindowButton
                variant="secondary"
                icon={<Heart className={isFavorited ? 'fill-current text-red-400' : ''} />}
                onClick={handleFavorite}
                size="sm"
              />
              <WindowButton
                variant="secondary"
                icon={<Share2 />}
                onClick={handleShare}
                size="sm"
              />
            </>
          )}

          {installing ? (
            <WindowButton disabled>
              Instalando... {installStatus?.progress && `(${installStatus.progress}%)`}
            </WindowButton>
          ) : isInstalled ? (
            <div className="flex space-x-2">
              <WindowButton variant="success" disabled>
                Instalado ✓
              </WindowButton>
              <WindowButton variant="danger" onClick={handleUninstall}>
                Remover
              </WindowButton>
            </div>
          ) : (
            <WindowButton onClick={handleInstall}>
              Instalar agora
            </WindowButton>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'reviews', label: 'Avaliações' },
            { id: 'changelog', label: 'Changelog' },
            { id: 'permissions', label: 'Permissões' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {renderTabContent()}
      </div>
    </div>
  );
}