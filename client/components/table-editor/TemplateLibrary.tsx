import React, { useState, useMemo } from 'react';
import { Search, Star, Download, Eye, Filter, Grid, List, TrendingUp, Clock, BookOpen, Zap } from 'lucide-react';
import { WindowCard, WindowButton, WindowInput } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  DEFAULT_TEMPLATES, 
  AITemplate, 
  TEMPLATE_CATEGORIES, 
  TEMPLATE_DIFFICULTIES, 
  TEMPLATE_COSTS,
  getTemplatesByCategory,
  searchTemplates,
  getTopRatedTemplates,
  getMostUsedTemplates
} from '@/lib/table-editor/default-templates';
import { AIColumnConfig } from '@/lib/table-editor/ai-types';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: AITemplate) => void;
  onPreviewTemplate: (template: AITemplate) => void;
}

export default function TemplateLibrary({ 
  isOpen, 
  onClose, 
  onApplyTemplate, 
  onPreviewTemplate 
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCost, setSelectedCost] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'usage' | 'name' | 'created'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<AITemplate | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'popular' | 'recent'>('browse');

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let templates = DEFAULT_TEMPLATES;

    // Apply search
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Apply filters
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      templates = templates.filter(t => t.difficulty === selectedDifficulty);
    }
    if (selectedCost !== 'all') {
      templates = templates.filter(t => t.estimatedCost === selectedCost);
    }

    // Apply sorting
    switch (sortBy) {
      case 'rating':
        return templates.sort((a, b) => b.rating - a.rating);
      case 'usage':
        return templates.sort((a, b) => b.usageCount - a.usageCount);
      case 'name':
        return templates.sort((a, b) => a.name.localeCompare(b.name));
      case 'created':
        return templates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      default:
        return templates;
    }
  }, [searchQuery, selectedCategory, selectedDifficulty, selectedCost, sortBy]);

  const getCategoryIcon = (category: string) => {
    const icons = {
      content: BookOpen,
      data: Grid,
      analysis: TrendingUp,
      automation: Zap,
      validation: Eye,
      formatting: Filter,
      extraction: Download,
      transformation: Clock
    };
    return icons[category as keyof typeof icons] || BookOpen;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handlePreview = (template: AITemplate) => {
    setPreviewTemplate(template);
    onPreviewTemplate(template);
  };

  const handleApply = (template: AITemplate) => {
    onApplyTemplate(template);
    onClose();
  };

  const renderTemplateCard = (template: AITemplate) => (
    <WindowCard key={template.id} className="group hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {React.createElement(getCategoryIcon(template.category), { 
              className: "w-5 h-5 text-purple-400" 
            })}
            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
              {template.name}
            </h3>
          </div>
          <div className="flex items-center space-x-1 text-yellow-400">
            <Star className="w-4 h-4" fill="currentColor" />
            <span className="text-sm">{template.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 flex-1 line-clamp-2">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span className={`px-2 py-1 rounded border ${getDifficultyColor(template.difficulty)}`}>
            {template.difficulty}
          </span>
          <span className={`px-2 py-1 rounded border ${getCostColor(template.estimatedCost)}`}>
            {template.estimatedCost} cost
          </span>
          <span>{template.usageCount.toLocaleString()} uses</span>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <WindowButton 
            variant="secondary" 
            className="flex-1"
            onClick={() => handlePreview(template)}
            icon={<Eye />}
          >
            Preview
          </WindowButton>
          <WindowButton 
            variant="primary" 
            className="flex-1"
            onClick={() => handleApply(template)}
            icon={<Download />}
          >
            Apply
          </WindowButton>
        </div>
      </div>
    </WindowCard>
  );

  const renderTemplateRow = (template: AITemplate) => (
    <div key={template.id} className="flex items-center justify-between p-4 bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-black/20 transition-colors group">
      <div className="flex items-center space-x-4 flex-1">
        {React.createElement(getCategoryIcon(template.category), { 
          className: "w-5 h-5 text-purple-400" 
        })}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
              {template.name}
            </h3>
            <div className="flex items-center space-x-1 text-yellow-400">
              <Star className="w-3 h-3" fill="currentColor" />
              <span className="text-xs">{template.rating.toFixed(1)}</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm">{template.description}</p>
        </div>
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span className={`px-2 py-1 rounded border ${getDifficultyColor(template.difficulty)}`}>
            {template.difficulty}
          </span>
          <span className={`px-2 py-1 rounded border ${getCostColor(template.estimatedCost)}`}>
            {template.estimatedCost}
          </span>
          <span>{template.usageCount.toLocaleString()} uses</span>
        </div>
      </div>
      <div className="flex space-x-2 ml-4">
        <WindowButton 
          variant="secondary"
          onClick={() => handlePreview(template)}
          icon={<Eye />}
        >
          Preview
        </WindowButton>
        <WindowButton 
          variant="primary"
          onClick={() => handleApply(template)}
          icon={<Download />}
        >
          Apply
        </WindowButton>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] bg-gray-900 border-gray-700 text-white overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-purple-400" />
              <span>AI Template Library</span>
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Browse and apply pre-built AI templates for your table columns
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <WindowInput
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search />}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <WindowButton
                    variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('grid')}
                    icon={<Grid />}
                  />
                  <WindowButton
                    variant={viewMode === 'list' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('list')}
                    icon={<List />}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
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

                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    {TEMPLATE_DIFFICULTIES.map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCost} onValueChange={setSelectedCost}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20">
                    <SelectValue placeholder="Cost" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Costs</SelectItem>
                    {TEMPLATE_COSTS.map(cost => (
                      <SelectItem key={cost} value={cost}>
                        {cost.charAt(0).toUpperCase() + cost.slice(1)} Cost
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/20">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="usage">Most Used</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="created">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
              <TabsList className="bg-black/20">
                <TabsTrigger value="browse" className="data-[state=active]:bg-purple-600">
                  Browse All ({filteredTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="popular" className="data-[state=active]:bg-purple-600">
                  Most Popular
                </TabsTrigger>
                <TabsTrigger value="recent" className="data-[state=active]:bg-purple-600">
                  Top Rated
                </TabsTrigger>
              </TabsList>

              <TabsContent value="browse" className="space-y-4">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {filteredTemplates.map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTemplates.map(renderTemplateRow)}
                  </div>
                )}
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates found matching your criteria.</p>
                    <p className="text-sm">Try adjusting your search or filters.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-4">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {getMostUsedTemplates(12).map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getMostUsedTemplates(12).map(renderTemplateRow)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                    {getTopRatedTemplates(12).map(renderTemplateCard)}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getTopRatedTemplates(12).map(renderTemplateRow)}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {DEFAULT_TEMPLATES.length} templates available
              </div>
              <div className="flex space-x-2">
                <WindowButton variant="secondary" onClick={onClose}>
                  Close
                </WindowButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center space-x-2">
                {React.createElement(getCategoryIcon(previewTemplate.category), { 
                  className: "w-5 h-5 text-purple-400" 
                })}
                <span>{previewTemplate.name}</span>
                <div className="flex items-center space-x-1 text-yellow-400 ml-2">
                  <Star className="w-4 h-4" fill="currentColor" />
                  <span className="text-sm">{previewTemplate.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({previewTemplate.ratingCount} reviews)</span>
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {previewTemplate.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Template Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`px-3 py-2 rounded border ${getDifficultyColor(previewTemplate.difficulty)} mb-1`}>
                    {previewTemplate.difficulty}
                  </div>
                  <div className="text-xs text-gray-400">Difficulty</div>
                </div>
                <div className="text-center">
                  <div className={`px-3 py-2 rounded border ${getCostColor(previewTemplate.estimatedCost)} mb-1`}>
                    {previewTemplate.estimatedCost}
                  </div>
                  <div className="text-xs text-gray-400">Cost</div>
                </div>
                <div className="text-center">
                  <div className="px-3 py-2 bg-blue-100 text-blue-800 border border-blue-200 rounded mb-1">
                    {previewTemplate.usageCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Uses</div>
                </div>
                <div className="text-center">
                  <div className="px-3 py-2 bg-purple-100 text-purple-800 border border-purple-200 rounded mb-1">
                    {previewTemplate.category}
                  </div>
                  <div className="text-xs text-gray-400">Category</div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {previewTemplate.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Configuration Preview */}
              <div>
                <h4 className="font-medium mb-2">Configuration</h4>
                <div className="bg-black/20 rounded-lg p-4 border border-white/20">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="ml-2 text-white">{previewTemplate.config.type}</span>
                    </div>
                    {previewTemplate.config.aiConfig?.model && (
                      <div>
                        <span className="text-gray-400">Model:</span>
                        <span className="ml-2 text-white">{previewTemplate.config.aiConfig.model}</span>
                      </div>
                    )}
                    {previewTemplate.config.aiConfig?.temperature !== undefined && (
                      <div>
                        <span className="text-gray-400">Temperature:</span>
                        <span className="ml-2 text-white">{previewTemplate.config.aiConfig.temperature}</span>
                      </div>
                    )}
                    {previewTemplate.config.aiConfig?.maxTokens && (
                      <div>
                        <span className="text-gray-400">Max Tokens:</span>
                        <span className="ml-2 text-white">{previewTemplate.config.aiConfig.maxTokens}</span>
                      </div>
                    )}
                  </div>
                  {previewTemplate.config.aiConfig?.prompt && (
                    <div className="mt-4">
                      <h5 className="text-gray-400 mb-2">Prompt Template:</h5>
                      <pre className="text-xs text-gray-300 bg-black/30 p-3 rounded border border-white/10 overflow-x-auto whitespace-pre-wrap">
                        {previewTemplate.config.aiConfig.prompt}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Examples */}
              {previewTemplate.examples && previewTemplate.examples.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Examples</h4>
                  <div className="space-y-3">
                    {previewTemplate.examples.map((example, index) => (
                      <div key={index} className="bg-black/20 rounded-lg p-4 border border-white/20">
                        <p className="text-sm text-gray-400 mb-2">{example.description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <h6 className="font-medium text-gray-300 mb-1">Input:</h6>
                            <pre className="text-gray-400 bg-black/30 p-2 rounded border border-white/10 overflow-x-auto">
                              {JSON.stringify(example.input, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h6 className="font-medium text-gray-300 mb-1">Output:</h6>
                            <pre className="text-gray-400 bg-black/30 p-2 rounded border border-white/10 overflow-x-auto">
                              {typeof example.output === 'string' ? example.output : JSON.stringify(example.output, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
                <WindowButton variant="secondary" onClick={() => setPreviewTemplate(null)}>
                  Close Preview
                </WindowButton>
                <WindowButton 
                  variant="primary" 
                  onClick={() => {
                    handleApply(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  icon={<Download />}
                >
                  Apply Template
                </WindowButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}