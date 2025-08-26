import { useState, useCallback, useEffect } from 'react';
import { AITemplate, DEFAULT_TEMPLATES, searchTemplates, getTemplatesByCategory } from '@/lib/table-editor/default-templates';
import { AIColumnConfig } from '@/lib/table-editor/ai-types';

interface CustomTemplate extends AITemplate {
  isCustom: true;
  isShared: boolean;
}

interface UseTemplatesReturn {
  // Template lists
  defaultTemplates: AITemplate[];
  customTemplates: CustomTemplate[];
  allTemplates: AITemplate[];
  favoriteTemplates: AITemplate[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Search and filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredTemplates: AITemplate[];
  
  // Template operations
  saveCustomTemplate: (template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomTemplate: (template: CustomTemplate) => Promise<void>;
  deleteCustomTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (template: AITemplate) => Promise<void>;
  
  // Favorites
  toggleFavorite: (templateId: string) => void;
  isFavorite: (templateId: string) => boolean;
  
  // Usage tracking
  incrementUsage: (templateId: string) => void;
  
  // Rating
  rateTemplate: (templateId: string, rating: number) => void;
  
  // Import/Export
  exportTemplates: (templateIds?: string[]) => void;
  importTemplates: (file: File) => Promise<void>;
  
  // Template application
  applyTemplate: (template: AITemplate, columnName: string) => AIColumnConfig;
  previewTemplate: (template: AITemplate, sampleData?: Record<string, any>) => Promise<any>;
}

const STORAGE_KEY = 'custom-templates';
const FAVORITES_KEY = 'favorite-templates';

export function useTemplates(): UseTemplatesReturn {
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load custom templates from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCustomTemplates(parsed.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        })));
      }

      const favorites = localStorage.getItem(FAVORITES_KEY);
      if (favorites) {
        setFavoriteTemplateIds(JSON.parse(favorites));
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load saved templates');
    }
  }, []);

  // Save custom templates to localStorage
  const saveToStorage = useCallback((templates: CustomTemplate[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (err) {
      console.error('Failed to save templates:', err);
      setError('Failed to save templates');
    }
  }, []);

  // Save favorites to localStorage
  const saveFavoritesToStorage = useCallback((favorites: string[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  }, []);

  // All templates (default + custom)
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  // Favorite templates
  const favoriteTemplates = allTemplates.filter(t => favoriteTemplateIds.includes(t.id));

  // Filtered templates based on search
  const filteredTemplates = searchQuery.trim() 
    ? searchTemplates(searchQuery).concat(
        customTemplates.filter(t => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : allTemplates;

  // Save custom template
  const saveCustomTemplate = useCallback(async (templateData: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);

    try {
      const newTemplate: CustomTemplate = {
        ...templateData,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCustom: true,
        isShared: false
      };

      const updatedTemplates = [...customTemplates, newTemplate];
      setCustomTemplates(updatedTemplates);
      saveToStorage(updatedTemplates);
    } catch (err) {
      setError('Failed to save template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [customTemplates, saveToStorage]);

  // Update custom template
  const updateCustomTemplate = useCallback(async (template: CustomTemplate) => {
    setLoading(true);
    setError(null);

    try {
      const updatedTemplate = {
        ...template,
        updatedAt: new Date()
      };

      const updatedTemplates = customTemplates.map(t => 
        t.id === template.id ? updatedTemplate : t
      );

      setCustomTemplates(updatedTemplates);
      saveToStorage(updatedTemplates);
    } catch (err) {
      setError('Failed to update template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [customTemplates, saveToStorage]);

  // Delete custom template
  const deleteCustomTemplate = useCallback(async (templateId: string) => {
    setLoading(true);
    setError(null);

    try {
      const updatedTemplates = customTemplates.filter(t => t.id !== templateId);
      setCustomTemplates(updatedTemplates);
      saveToStorage(updatedTemplates);

      // Remove from favorites if needed
      if (favoriteTemplateIds.includes(templateId)) {
        const updatedFavorites = favoriteTemplateIds.filter(id => id !== templateId);
        setFavoriteTemplateIds(updatedFavorites);
        saveFavoritesToStorage(updatedFavorites);
      }
    } catch (err) {
      setError('Failed to delete template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [customTemplates, favoriteTemplateIds, saveToStorage, saveFavoritesToStorage]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (template: AITemplate) => {
    const duplicated: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${template.name} (Copy)`,
      description: template.description,
      category: template.category,
      tags: [...template.tags, 'duplicated'],
      difficulty: template.difficulty,
      estimatedCost: template.estimatedCost,
      usageCount: 0,
      rating: 5.0,
      ratingCount: 1,
      config: { ...template.config },
      examples: template.examples ? [...template.examples] : [],
      dependencies: template.dependencies ? [...template.dependencies] : [],
      author: 'Custom (Duplicated)',
      isCustom: true,
      isShared: false
    };

    await saveCustomTemplate(duplicated);
  }, [saveCustomTemplate]);

  // Toggle favorite
  const toggleFavorite = useCallback((templateId: string) => {
    const updatedFavorites = favoriteTemplateIds.includes(templateId)
      ? favoriteTemplateIds.filter(id => id !== templateId)
      : [...favoriteTemplateIds, templateId];

    setFavoriteTemplateIds(updatedFavorites);
    saveFavoritesToStorage(updatedFavorites);
  }, [favoriteTemplateIds, saveFavoritesToStorage]);

  // Check if template is favorite
  const isFavorite = useCallback((templateId: string) => {
    return favoriteTemplateIds.includes(templateId);
  }, [favoriteTemplateIds]);

  // Increment usage count
  const incrementUsage = useCallback((templateId: string) => {
    // For default templates, we might track this in analytics
    // For custom templates, update the usage count
    const template = customTemplates.find(t => t.id === templateId);
    if (template) {
      const updated = { ...template, usageCount: template.usageCount + 1 };
      updateCustomTemplate(updated);
    }
  }, [customTemplates, updateCustomTemplate]);

  // Rate template
  const rateTemplate = useCallback((templateId: string, rating: number) => {
    const template = customTemplates.find(t => t.id === templateId);
    if (template) {
      const newRatingCount = template.ratingCount + 1;
      const newRating = ((template.rating * template.ratingCount) + rating) / newRatingCount;
      
      const updated = { 
        ...template, 
        rating: newRating,
        ratingCount: newRatingCount
      };
      updateCustomTemplate(updated);
    }
  }, [customTemplates, updateCustomTemplate]);

  // Export templates
  const exportTemplates = useCallback((templateIds?: string[]) => {
    const templatesToExport = templateIds 
      ? customTemplates.filter(t => templateIds.includes(t.id))
      : customTemplates;

    const dataStr = JSON.stringify(templatesToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `custom-templates-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, [customTemplates]);

  // Import templates
  const importTemplates = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('Invalid template file format');
      }

      const validTemplates = imported.filter(t => 
        t.name && t.description && t.config && t.category
      );

      if (validTemplates.length === 0) {
        throw new Error('No valid templates found in file');
      }

      // Add imported templates
      for (const template of validTemplates) {
        const importedTemplate: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
          ...template,
          name: `${template.name} (Imported)`,
          usageCount: 0,
          isCustom: true,
          isShared: false
        };
        
        await saveCustomTemplate(importedTemplate);
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import templates';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [saveCustomTemplate]);

  // Apply template to create column config
  const applyTemplate = useCallback((template: AITemplate, columnName: string): AIColumnConfig => {
    // Increment usage
    incrementUsage(template.id);

    return {
      ...template.config,
      name: columnName,
      displayName: columnName.charAt(0).toUpperCase() + columnName.slice(1).replace(/[_-]/g, ' '),
      description: `Generated using ${template.name} template`
    } as AIColumnConfig;
  }, [incrementUsage]);

  // Preview template with sample data
  const previewTemplate = useCallback(async (template: AITemplate, sampleData?: Record<string, any>) => {
    // This would integrate with the AI engine to generate a preview
    // For now, return the template's first example or a mock result
    if (template.examples && template.examples.length > 0) {
      return template.examples[0].output;
    }

    return 'Preview not available - no examples provided for this template.';
  }, []);

  return {
    // Template lists
    defaultTemplates: DEFAULT_TEMPLATES,
    customTemplates,
    allTemplates,
    favoriteTemplates,
    
    // Loading states
    loading,
    error,
    
    // Search and filter
    searchQuery,
    setSearchQuery,
    filteredTemplates,
    
    // Template operations
    saveCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
    duplicateTemplate,
    
    // Favorites
    toggleFavorite,
    isFavorite,
    
    // Usage tracking
    incrementUsage,
    
    // Rating
    rateTemplate,
    
    // Import/Export
    exportTemplates,
    importTemplates,
    
    // Template application
    applyTemplate,
    previewTemplate
  };
}