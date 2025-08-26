import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Plus,
  BarChart3,
  DollarSign,
  Download,
  Star,
  Eye,
  Edit,
  Trash2,
  Upload,
  Settings,
  Users,
  TrendingUp,
  Calendar,
  Package,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { WindowCard } from '@/components/ui/WindowCard';
import { WindowButton } from '@/components/ui/WindowButton';
import { WindowInput } from '@/components/ui/WindowInput';
import { MarketplaceModule, DeveloperProfile, ModuleAnalytics } from '../types';
import MarketplaceAPI from '../services/marketplace-api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

interface DeveloperDashboardProps {
  onBack: () => void;
  onClose?: () => void;
}

export default function DeveloperDashboard({ onBack, onClose }: DeveloperDashboardProps) {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'analytics' | 'profile'>('overview');
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [modules, setModules] = useState<MarketplaceModule[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  // Publishing state
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profileData, modulesData, analyticsData] = await Promise.allSettled([
        MarketplaceAPI.getDeveloperProfile(),
        MarketplaceAPI.getMyModules(),
        MarketplaceAPI.getDeveloperAnalytics('month'),
      ]);

      if (profileData.status === 'fulfilled') setProfile(profileData.value);
      if (modulesData.status === 'fulfilled') setModules(modulesData.value);
      if (analyticsData.status === 'fulfilled') setAnalytics(analyticsData.value);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Format downloads
  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Render overview tab
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Bem-vindo, {profile?.name || user?.name}!
          </h2>
          <p className="text-gray-400">Gerencie seus módulos e acompanhe o desempenho</p>
        </div>
        <WindowButton
          icon={<Plus />}
          onClick={() => setShowPublishModal(true)}
        >
          Publicar módulo
        </WindowButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <WindowCard className="text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              {formatCurrency(analytics?.totalRevenue || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Receita total</p>
            <div className="flex items-center justify-center mt-2 text-green-400 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% este mês
            </div>
          </div>
        </WindowCard>

        <WindowCard className="text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              {formatDownloads(analytics?.totalDownloads || 0)}
            </h3>
            <p className="text-gray-400 text-sm">Downloads totais</p>
            <div className="flex items-center justify-center mt-2 text-blue-400 text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8% este mês
            </div>
          </div>
        </WindowCard>

        <WindowCard className="text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              {analytics?.averageRating?.toFixed(1) || '0.0'}
            </h3>
            <p className="text-gray-400 text-sm">Avaliação média</p>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= Math.round(analytics?.averageRating || 0)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </WindowCard>

        <WindowCard className="text-center">
          <div className="p-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              {analytics?.moduleCount || 0}
            </h3>
            <p className="text-gray-400 text-sm">Módulos ativos</p>
            <div className="flex items-center justify-center mt-2 text-purple-400 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {modules.filter(m => m.status === 'published').length} publicados
            </div>
          </div>
        </WindowCard>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Modules */}
        <WindowCard title="Módulos mais populares">
          <div className="space-y-4">
            {(analytics?.topModules || []).slice(0, 5).map((module: any, index: number) => (
              <div key={module.moduleId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-gray-500 w-6">
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{module.moduleName}</h4>
                    <div className="flex items-center space-x-3 text-xs text-gray-400">
                      <span className="flex items-center">
                        <Download className="w-3 h-3 mr-1" />
                        {formatDownloads(module.downloads)}
                      </span>
                      <span className="flex items-center">
                        <Star className="w-3 h-3 mr-1" />
                        {module.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                {module.revenue && (
                  <div className="text-right">
                    <div className="font-medium text-green-400">
                      {formatCurrency(module.revenue)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!analytics?.topModules?.length && (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum módulo publicado ainda</p>
              </div>
            )}
          </div>
        </WindowCard>

        {/* Recent Activity */}
        <WindowCard title="Atividade recente">
          <div className="space-y-4">
            {(analytics?.recentActivity || []).slice(0, 5).map((activity: any, index: number) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                  activity.type === 'download' ? 'bg-blue-500/20 text-blue-400' :
                  activity.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {activity.type === 'download' && <Download className="w-3 h-3" />}
                  {activity.type === 'purchase' && <DollarSign className="w-3 h-3" />}
                  {activity.type === 'review' && <Star className="w-3 h-3" />}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {activity.type === 'download' && 'Novo download'}
                    {activity.type === 'purchase' && 'Nova compra'}
                    {activity.type === 'review' && 'Nova avaliação'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {activity.moduleName} • {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {activity.value && (
                  <div className="text-sm font-medium text-green-400">
                    +{formatCurrency(activity.value)}
                  </div>
                )}
              </div>
            ))}

            {!analytics?.recentActivity?.length && (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </WindowCard>
      </div>
    </div>
  );

  // Render modules tab
  const renderModulesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Meus módulos</h2>
        <WindowButton
          icon={<Plus />}
          onClick={() => setShowPublishModal(true)}
        >
          Novo módulo
        </WindowButton>
      </div>

      {modules.length === 0 ? (
        <WindowCard>
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum módulo publicado
            </h3>
            <p className="text-gray-400 mb-6">
              Comece criando seu primeiro módulo para a marketplace
            </p>
            <WindowButton
              icon={<Plus />}
              onClick={() => setShowPublishModal(true)}
            >
              Publicar primeiro módulo
            </WindowButton>
          </div>
        </WindowCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map((module) => (
            <WindowCard key={module.id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {module.icon ? (
                        <img 
                          src={module.icon} 
                          alt={module.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {module.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{module.displayName}</h3>
                      <p className="text-xs text-gray-400">v{module.version}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg">
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    module.status === 'published' ? 'bg-green-400' :
                    module.status === 'draft' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-sm capitalize text-gray-300">
                    {module.status === 'published' ? 'Publicado' :
                     module.status === 'draft' ? 'Rascunho' :
                     'Suspenso'}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {formatDownloads(module.downloads)}
                    </div>
                    <div className="text-xs text-gray-400">Downloads</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {module.ratings.average.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Avaliação</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {module.ratings.count}
                    </div>
                    <div className="text-xs text-gray-400">Reviews</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <WindowButton size="sm" variant="secondary" fullWidth>
                    <Eye className="w-4 h-4" />
                  </WindowButton>
                  <WindowButton size="sm" variant="secondary" fullWidth>
                    <Edit className="w-4 h-4" />
                  </WindowButton>
                  <WindowButton size="sm" variant="secondary" fullWidth>
                    <BarChart3 className="w-4 h-4" />
                  </WindowButton>
                </div>
              </div>
            </WindowCard>
          ))}
        </div>
      )}
    </div>
  );

  // Render analytics tab
  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Analytics</h2>
      
      <WindowCard>
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Analytics detalhados
          </h3>
          <p className="text-gray-400">
            Funcionalidade em desenvolvimento. Em breve você poderá visualizar gráficos detalhados de downloads, receita e engajamento.
          </p>
        </div>
      </WindowCard>
    </div>
  );

  // Render profile tab
  const renderProfileTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Perfil do desenvolvedor</h2>
      
      <WindowCard>
        <div className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {(profile?.name || user?.name || '').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-white">
                  {profile?.name || user?.name}
                </h3>
                {profile?.verified && (
                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                    <Star className="w-3 h-3 mr-1" />
                    Verificado
                  </div>
                )}
              </div>
              <p className="text-gray-400">{profile?.email || user?.email}</p>
              {profile?.company && (
                <p className="text-gray-400 text-sm">
                  <Users className="w-3 h-3 inline mr-1" />
                  {profile.company}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome
              </label>
              <WindowInput
                value={profile?.name || ''}
                placeholder="Seu nome completo"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <WindowInput
                value={profile?.email || ''}
                placeholder="seu@email.com"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Empresa
              </label>
              <WindowInput
                value={profile?.company || ''}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Website
              </label>
              <WindowInput
                value={profile?.website || ''}
                placeholder="https://seusite.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={profile?.bio || ''}
                placeholder="Conte um pouco sobre você e sua experiência..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <WindowButton variant="secondary">
              Cancelar
            </WindowButton>
            <WindowButton>
              Salvar alterações
            </WindowButton>
          </div>
        </div>
      </WindowCard>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

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
          
          <div>
            <h1 className="text-2xl font-bold text-white">Painel do Desenvolvedor</h1>
            <p className="text-gray-400">Gerencie seus módulos e acompanhe o desempenho</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <WindowButton variant="secondary" icon={<ExternalLink />}>
            Ver no marketplace
          </WindowButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'modules', label: 'Meus Módulos', icon: <Package className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'profile', label: 'Perfil', icon: <Settings className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'modules' && renderModulesTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'profile' && renderProfileTab()}
      </div>

      {/* Publish Modal - Placeholder */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Publicar módulo</h3>
            <p className="text-gray-400 mb-6">
              Funcionalidade em desenvolvimento. Em breve você poderá publicar módulos diretamente pelo painel.
            </p>
            <div className="flex justify-end space-x-3">
              <WindowButton
                variant="secondary"
                onClick={() => setShowPublishModal(false)}
              >
                Fechar
              </WindowButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}