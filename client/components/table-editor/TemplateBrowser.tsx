import React, { useState } from 'react';
import { BookOpen, Star, Zap, Search, Filter, Heart, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { WindowButton } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AITemplate, TEMPLATE_CATEGORIES } from '@/lib/table-editor/default-templates';
import { useTemplates } from '@/hooks/useTemplates';

interface TemplateBrowserProps {
  onSelectTemplate: (template: AITemplate) => void;
  onOpenLibrary: () => void;
  onOpenManager: () => void;
  compact?: boolean;
  showFavorites?: boolean;
}

export default function TemplateBrowser({
  onSelectTemplate,
  onOpenLibrary,
  onOpenManager,
  compact = false,
  showFavorites = true
}: TemplateBrowserProps) {
  const {
    allTemplates,
    favoriteTemplates,
    searchQuery,
    setSearchQuery,
    filteredTemplates,
    toggleFavorite,
    isFavorite,
    incrementUsage
  } = useTemplates();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'recent'>('rating');

  // Get templates to display
  const getTemplatesToShow = () => {
    let templates = showOnlyFavorites ? favoriteTemplates : filteredTemplates;

    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }

    // Sort templates
    switch (sortBy) {
      case 'rating':
        return templates.sort((a, b) => b.rating - a.rating);
      case 'usage':
        return templates.sort((a, b) => b.usageCount - a.usageCount);
      case 'recent':
        return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      default:
        return templates;
    }
  };

  const templatesToShow = getTemplatesToShow();

  const handleSelectTemplate = (template: AITemplate) => {
    incrementUsage(template.id);
    onSelectTemplate(template);
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      content: BookOpen,
      data: Filter,
      analysis: TrendingUp,
      automation: Zap,
      validation: Search,
      formatting: Sparkles,
      extraction: Filter,
      transformation: Clock
    };
    return icons[category as keyof typeof icons] || BookOpen;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'text-green-400 border-green-400';
      case 'intermediate': return 'text-yellow-400 border-yellow-400';
      case 'advanced': return 'text-red-400 border-red-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  if (compact) {
    return (
      <div className="bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Quick Templates</span>
          </h3>
          <div className="flex space-x-1">
            <WindowButton variant="secondary" onClick={onOpenLibrary} className="text-xs">
              Browse All
            </WindowButton>
            <WindowButton variant="secondary" onClick={onOpenManager} className="text-xs">
              Manage
            </WindowButton>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {templatesToShow.slice(0, 8).map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10 hover:bg-white/10 cursor-pointer transition-colors group"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-center space-x-2 flex-1">
                {React.createElement(getCategoryIcon(template.category), { 
                  className: "w-3 h-3 text-purple-400" 
                })}
                <span className="text-sm text-white group-hover:text-purple-400 transition-colors truncate">
                  {template.name}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {showFavorites && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(template.id);
                    }}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Heart
                      className={`w-3 h-3 ${isFavorite(template.id) 
                        ? 'text-red-400 fill-current' 
                        : 'text-gray-400 hover:text-red-400'}`}
                    />
                  </button>
                )}
                <div className="flex items-center space-x-1 text-yellow-400">
                  <Star className="w-3 h-3" fill="currentColor" />
                  <span className="text-xs">{template.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
          {templatesToShow.length > 8 && (
            <div className="text-center pt-2">
              <button
                onClick={onOpenLibrary}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                +{templatesToShow.length - 8} more templates
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <BookOpen className="w-6 h-6 text-purple-400" />
          <span>Template Browser</span>
        </h2>
        <div className="flex space-x-2">
          <WindowButton variant="secondary" onClick={onOpenManager}>
            Manage Templates
          </WindowButton>
          <WindowButton variant="primary" onClick={onOpenLibrary}>
            Open Full Library
          </WindowButton>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48 bg-white/10 border-white/20">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40 bg-white/10 border-white/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="usage">Most Used</SelectItem>
            <SelectItem value="recent">Recently Updated</SelectItem>
          </SelectContent>
        </Select>

        {showFavorites && (
          <WindowButton
            variant={showOnlyFavorites ? "primary" : "secondary"}
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            icon={<Heart />}
          >
            Favorites
          </WindowButton>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-purple-500/10 rounded border border-purple-500/20">
          <div className="text-2xl font-bold text-purple-400">{allTemplates.length}</div>
          <div className="text-xs text-gray-400">Total Templates</div>
        </div>
        <div className="text-center p-3 bg-blue-500/10 rounded border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{favoriteTemplates.length}</div>
          <div className="text-xs text-gray-400">Favorites</div>
        </div>
        <div className="text-center p-3 bg-green-500/10 rounded border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">
            {TEMPLATE_CATEGORIES.length}
          </div>
          <div className="text-xs text-gray-400">Categories</div>
        </div>
        <div className="text-center p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-400">
            {allTemplates.filter(t => t.rating >= 4.5).length}
          </div>
          <div className="text-xs text-gray-400">Top Rated</div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {templatesToShow.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No templates found.</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          templatesToShow.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-pointer transition-all duration-200 group hover:shadow-lg"
              onClick={() => handleSelectTemplate(template)}
            >
              <div className="flex items-center space-x-4 flex-1">
                {React.createElement(getCategoryIcon(template.category), { 
                  className: "w-5 h-5 text-purple-400" 
                })}
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-white group-hover:text-purple-400 transition-colors">
                      {template.name}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getDifficultyColor(template.difficulty)}`}
                    >
                      {template.difficulty}
                    </Badge>
                    {(template as any).isCustom && (
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-1">{template.description}</p>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                    <span>{template.category}</span>
                    <span>•</span>
                    <span>{template.usageCount.toLocaleString()} uses</span>
                    <span>•</span>
                    <span>{template.tags.slice(0, 2).join(', ')}</span>
                    {template.tags.length > 2 && <span>+{template.tags.length - 2}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {showFavorites && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(template.id);
                      }}
                      className="p-2 hover:bg-white/10 rounded transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${isFavorite(template.id) 
                          ? 'text-red-400 fill-current' 
                          : 'text-gray-400 hover:text-red-400'}`}
                      />
                    </button>
                  )}
                  
                  <div className="flex items-center space-x-1 text-yellow-400">
                    <Star className="w-4 h-4" fill="currentColor" />
                    <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
                  </div>

                  <WindowButton
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Use Template
                  </WindowButton>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Showing {templatesToShow.length} of {allTemplates.length} templates
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onOpenLibrary}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            View All Templates →
          </button>
        </div>
      </div>
    </div>
  );
}