import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Search, Filter, Star, Download, TrendingUp, Sparkles, Grid, List, Plus } from 'lucide-react';
import { WindowCard } from '@/components/ui/WindowCard';
import { WindowButton } from '@/components/ui/WindowButton';
import { WindowInput } from '@/components/ui/WindowInput';
import { useMarketplace } from './hooks/useMarketplace';
import { useModuleInstaller } from './hooks/useModuleInstaller';
import { useAuth } from '@/contexts/AuthContext';
import { SearchFilters, MarketplaceModule } from './types';
import { toast } from '@/components/ui/use-toast';

// Lazy load components for better performance
const ModuleCard = lazy(() => import('./components/ModuleCard'));
const ModuleDetail = lazy(() => import('./components/ModuleDetail'));
const DeveloperDashboard = lazy(() => import('./components/DeveloperDashboard'));

interface MarketplacePageProps {
  onClose?: () => void;
}

export default function MarketplacePage({ onClose }: MarketplacePageProps) {
  const { user } = useAuth();
  const { 
    modules, 
    categories, 
    loading, 
    error, 
    searchModules, 
    getFeaturedModules, 
    getTrendingModules, 
    getNewReleases 
  } = useMarketplace();
  
  const { isModuleInstalled } = useModuleInstaller();

  // State for UI
  const [activeTab, setActiveTab] = useState<'browse' | 'installed' | 'developer'>('browse');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedModule, setSelectedModule] = useState<MarketplaceModule | null>(null);
  const [showDeveloperDashboard, setShowDeveloperDashboard] = useState(false);
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'rating' | 'newest'>('relevance');
  
  // Featured content state
  const [featuredModules, setFeaturedModules] = useState<MarketplaceModule[]>([]);
  const [trendingModules, setTrendingModules] = useState<MarketplaceModule[]>([]);
  const [newReleases, setNewReleases] = useState<MarketplaceModule[]>([]);

  // Load initial content
  useEffect(() => {
    loadInitialContent();
  }, []);

  const loadInitialContent = async () => {
    try {
      // Load featured, trending, and new releases in parallel
      const [featured, trending, newMods] = await Promise.allSettled([
        getFeaturedModules(),
        getTrendingModules(),
        getNewReleases(),
      ]);

      if (featured.status === 'fulfilled') setFeaturedModules(featured.value);
      if (trending.status === 'fulfilled') setTrendingModules(trending.value);
      if (newMods.status === 'fulfilled') setNewReleases(newMods.value);
    } catch (err) {
      console.error('Failed to load initial content:', err);
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery && !selectedCategory && !filters.priceType) return;
    
    const searchFilters: SearchFilters = {
      query: searchQuery || undefined,
      category: selectedCategory || undefined,
      sortBy,
      ...filters,
    };

    try {
      await searchModules(searchFilters);
    } catch (err) {
      toast({
        title: "Erro na busca",
        description: "Falha ao buscar módulos. Tente novamente.",
        variant: 'destructive',
      });
    }
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setFilters(prev => ({ ...prev, category: categoryId }));
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="bg-white/10 border border-white/20 rounded-xl p-6 animate-pulse"
        >
          <div className="h-16 w-16 bg-white/20 rounded-lg mb-4"></div>
          <div className="h-4 bg-white/20 rounded mb-2"></div>
          <div className="h-3 bg-white/20 rounded mb-4 w-3/4"></div>
          <div className="flex items-center space-x-2">
            <div className="h-3 bg-white/20 rounded w-12"></div>
            <div className="h-3 bg-white/20 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render module grid
  const renderModuleGrid = (moduleList: MarketplaceModule[]) => {
    if (moduleList.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum módulo encontrado</h3>
          <p className="text-gray-400">Tente ajustar os filtros de busca</p>
        </div>
      );
    }

    const gridClass = viewMode === 'grid' 
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      : "space-y-4";

    return (
      <div className={gridClass}>
        {moduleList.map((module) => (
          <Suspense key={module.id} fallback={<div className="animate-pulse bg-white/10 rounded-xl h-48"></div>}>
            <ModuleCard
              module={module}
              viewMode={viewMode}
              isInstalled={isModuleInstalled(module.id)}
              onClick={() => setSelectedModule(module)}
            />
          </Suspense>
        ))}
      </div>
    );
  };

  // Render featured section
  const renderFeaturedSection = () => (
    <div className="mb-8">
      <div className="flex items-center mb-6">
        <Sparkles className="w-6 h-6 text-yellow-400 mr-2" />
        <h2 className="text-2xl font-bold text-white">Módulos em Destaque</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {featuredModules.slice(0, 4).map((module) => (
          <Suspense key={module.id} fallback={<div className="animate-pulse bg-white/10 rounded-xl h-48"></div>}>
            <ModuleCard
              module={module}
              viewMode="grid"
              isInstalled={isModuleInstalled(module.id)}
              onClick={() => setSelectedModule(module)}
              featured
            />
          </Suspense>
        ))}
      </div>
    </div>
  );

  // Render trending section
  const renderTrendingSection = () => (
    <div className="mb-8">
      <div className="flex items-center mb-6">
        <TrendingUp className="w-6 h-6 text-green-400 mr-2" />
        <h2 className="text-2xl font-bold text-white">Tendências</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trendingModules.slice(0, 4).map((module) => (
          <Suspense key={module.id} fallback={<div className="animate-pulse bg-white/10 rounded-xl h-48"></div>}>
            <ModuleCard
              module={module}
              viewMode="grid"
              isInstalled={isModuleInstalled(module.id)}
              onClick={() => setSelectedModule(module)}
              trending
            />
          </Suspense>
        ))}
      </div>
    </div>
  );

  // Render new releases section
  const renderNewReleasesSection = () => (
    <div className="mb-8">
      <div className="flex items-center mb-6">
        <Star className="w-6 h-6 text-blue-400 mr-2" />
        <h2 className="text-2xl font-bold text-white">Lançamentos</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {newReleases.slice(0, 4).map((module) => (
          <Suspense key={module.id} fallback={<div className="animate-pulse bg-white/10 rounded-xl h-48"></div>}>
            <ModuleCard
              module={module}
              viewMode="grid"
              isInstalled={isModuleInstalled(module.id)}
              onClick={() => setSelectedModule(module)}
              newRelease
            />
          </Suspense>
        ))}
      </div>
    </div>
  );

  // Show module detail if selected
  if (selectedModule) {
    return (
      <Suspense fallback={<div className="animate-pulse bg-white/10 rounded-xl h-screen"></div>}>
        <ModuleDetail
          module={selectedModule}
          onBack={() => setSelectedModule(null)}
          onClose={onClose}
        />
      </Suspense>
    );
  }

  // Show developer dashboard if requested
  if (showDeveloperDashboard) {
    return (
      <Suspense fallback={<div className="animate-pulse bg-white/10 rounded-xl h-screen"></div>}>
        <DeveloperDashboard
          onBack={() => setShowDeveloperDashboard(false)}
          onClose={onClose}
        />
      </Suspense>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-gray-400">Descubra e instale módulos para sua plataforma</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {user && (
            <WindowButton
              variant="secondary"
              icon={<Plus />}
              onClick={() => setShowDeveloperDashboard(true)}
            >
              Desenvolver
            </WindowButton>
          )}
          <WindowButton
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            icon={<Grid />}
            onClick={() => setViewMode('grid')}
            size="sm"
          />
          <WindowButton
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            icon={<List />}
            onClick={() => setViewMode('list')}
            size="sm"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <WindowInput
                placeholder="Buscar módulos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategorySelect(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id} className="bg-gray-800">
                {category.displayName}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="relevance" className="bg-gray-800">Relevância</option>
            <option value="downloads" className="bg-gray-800">Mais baixados</option>
            <option value="rating" className="bg-gray-800">Melhor avaliados</option>
            <option value="newest" className="bg-gray-800">Mais recentes</option>
          </select>

          <WindowButton onClick={handleSearch} icon={<Search />}>
            Buscar
          </WindowButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {error && (
            <WindowCard className="mb-6 border-red-500/50 bg-red-500/10">
              <div className="flex items-center">
                <div className="text-red-400 mr-3">⚠️</div>
                <div>
                  <h3 className="text-lg font-semibold text-red-300">Erro</h3>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            </WindowCard>
          )}

          {loading ? (
            renderLoadingSkeleton()
          ) : modules.length > 0 ? (
            // Show search results
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Resultados da busca ({modules.length})
                </h2>
              </div>
              {renderModuleGrid(modules)}
            </div>
          ) : (
            // Show featured content when no search
            <div>
              {renderFeaturedSection()}
              {renderTrendingSection()}
              {renderNewReleasesSection()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}