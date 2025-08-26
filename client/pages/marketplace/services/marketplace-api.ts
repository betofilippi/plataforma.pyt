import axios from 'axios';
import { API_URLS } from '@/lib/api-config';
import { 
  MarketplaceModule, 
  ModuleCategory, 
  ModuleReview, 
  SearchFilters, 
  SearchResult, 
  InstallationStatus,
  DeveloperProfile,
  ModuleAnalytics,
  PublishModuleData 
} from '../types';

const marketplaceApi = axios.create({
  baseURL: `${API_URLS.base}/marketplace`,
  timeout: 30000,
});

// Intercept requests to add auth token
marketplaceApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('plataforma_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class MarketplaceAPI {
  // ===============================
  // MODULE BROWSING & SEARCH
  // ===============================
  
  static async searchModules(filters: SearchFilters = {}): Promise<SearchResult> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockModules, mockCategories, searchModules } = await import('./mock-data');
      
      let filteredModules = mockModules;
      
      // Apply search query filter
      if (filters.query) {
        filteredModules = searchModules(filters.query);
      }
      
      // Apply category filter
      if (filters.category) {
        filteredModules = filteredModules.filter(m => m.category.id === filters.category);
      }
      
      // Apply price type filter
      if (filters.priceType && filters.priceType !== 'all') {
        filteredModules = filteredModules.filter(m => m.price.type === filters.priceType);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        filteredModules.sort((a, b) => {
          switch (filters.sortBy) {
            case 'downloads':
              return b.downloads - a.downloads;
            case 'rating':
              return b.ratings.average - a.ratings.average;
            case 'newest':
              return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
            case 'name':
              return a.displayName.localeCompare(b.displayName);
            default:
              return 0;
          }
        });
      }
      
      return {
        modules: filteredModules,
        total: filteredModules.length,
        page: 1,
        limit: 50,
        hasMore: false,
        filters,
        aggregations: {
          categories: mockCategories.map(cat => ({
            id: cat.id,
            name: cat.displayName,
            count: mockModules.filter(m => m.category.id === cat.id).length
          })),
          tags: [],
          priceTypes: [
            { type: 'free', count: mockModules.filter(m => m.price.type === 'free').length },
            { type: 'paid', count: mockModules.filter(m => m.price.type === 'paid').length },
            { type: 'freemium', count: mockModules.filter(m => m.price.type === 'freemium').length }
          ]
        }
      };
    }
    
    const response = await marketplaceApi.get('/modules/search', { params: filters });
    return response.data;
  }

  static async getModule(id: string): Promise<MarketplaceModule> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockModules } = await import('./mock-data');
      const module = mockModules.find(m => m.id === id);
      if (!module) {
        throw new Error('Módulo não encontrado');
      }
      return module;
    }
    
    const response = await marketplaceApi.get(`/modules/${id}`);
    return response.data;
  }

  static async getFeaturedModules(): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { getFeaturedModules } = await import('./mock-data');
      return getFeaturedModules();
    }
    
    const response = await marketplaceApi.get('/modules/featured');
    return response.data;
  }

  static async getTrendingModules(): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { getTrendingModules } = await import('./mock-data');
      return getTrendingModules();
    }
    
    const response = await marketplaceApi.get('/modules/trending');
    return response.data;
  }

  static async getNewReleases(): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { getNewReleases } = await import('./mock-data');
      return getNewReleases();
    }
    
    const response = await marketplaceApi.get('/modules/new-releases');
    return response.data;
  }

  static async getPopularModules(): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockModules } = await import('./mock-data');
      return [...mockModules].sort((a, b) => b.downloads - a.downloads).slice(0, 10);
    }
    
    const response = await marketplaceApi.get('/modules/popular');
    return response.data;
  }

  static async getModulesByCategory(categoryId: string): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockModules } = await import('./mock-data');
      return mockModules.filter(m => m.category.id === categoryId);
    }
    
    const response = await marketplaceApi.get(`/modules/category/${categoryId}`);
    return response.data;
  }

  static async getModulesByAuthor(authorId: string): Promise<MarketplaceModule[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockModules } = await import('./mock-data');
      return mockModules.filter(m => m.author.id === authorId);
    }
    
    const response = await marketplaceApi.get(`/modules/author/${authorId}`);
    return response.data;
  }

  // ===============================
  // CATEGORIES
  // ===============================
  
  static async getCategories(): Promise<ModuleCategory[]> {
    // Use mock data in development
    if (process.env.NODE_ENV === 'development') {
      const { mockCategories } = await import('./mock-data');
      return mockCategories;
    }
    
    const response = await marketplaceApi.get('/categories');
    return response.data;
  }

  static async getCategory(id: string): Promise<ModuleCategory> {
    const response = await marketplaceApi.get(`/categories/${id}`);
    return response.data;
  }

  // ===============================
  // REVIEWS & RATINGS
  // ===============================
  
  static async getModuleReviews(moduleId: string, page = 1, limit = 10): Promise<{
    reviews: ModuleReview[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await marketplaceApi.get(`/modules/${moduleId}/reviews`, {
      params: { page, limit }
    });
    return response.data;
  }

  static async submitReview(moduleId: string, review: {
    rating: number;
    title: string;
    content: string;
  }): Promise<ModuleReview> {
    const response = await marketplaceApi.post(`/modules/${moduleId}/reviews`, review);
    return response.data;
  }

  static async updateReview(moduleId: string, reviewId: string, review: {
    rating: number;
    title: string;
    content: string;
  }): Promise<ModuleReview> {
    const response = await marketplaceApi.put(`/modules/${moduleId}/reviews/${reviewId}`, review);
    return response.data;
  }

  static async deleteReview(moduleId: string, reviewId: string): Promise<void> {
    await marketplaceApi.delete(`/modules/${moduleId}/reviews/${reviewId}`);
  }

  static async markReviewHelpful(moduleId: string, reviewId: string): Promise<void> {
    await marketplaceApi.post(`/modules/${moduleId}/reviews/${reviewId}/helpful`);
  }

  // ===============================
  // INSTALLATION & MANAGEMENT
  // ===============================
  
  static async installModule(moduleId: string): Promise<InstallationStatus> {
    const response = await marketplaceApi.post(`/modules/${moduleId}/install`);
    return response.data;
  }

  static async uninstallModule(moduleId: string): Promise<void> {
    await marketplaceApi.delete(`/modules/${moduleId}/install`);
  }

  static async updateModule(moduleId: string): Promise<InstallationStatus> {
    const response = await marketplaceApi.patch(`/modules/${moduleId}/install`);
    return response.data;
  }

  static async getInstallationStatus(moduleId: string): Promise<InstallationStatus> {
    const response = await marketplaceApi.get(`/modules/${moduleId}/install/status`);
    return response.data;
  }

  static async getInstalledModules(): Promise<InstallationStatus[]> {
    const response = await marketplaceApi.get('/modules/installed');
    return response.data;
  }

  static async checkForUpdates(): Promise<{
    moduleId: string;
    currentVersion: string;
    availableVersion: string;
  }[]> {
    const response = await marketplaceApi.get('/modules/updates');
    return response.data;
  }

  // ===============================
  // DEVELOPER FEATURES
  // ===============================
  
  static async getDeveloperProfile(developerId?: string): Promise<DeveloperProfile> {
    const endpoint = developerId ? `/developers/${developerId}` : '/developers/profile';
    const response = await marketplaceApi.get(endpoint);
    return response.data;
  }

  static async updateDeveloperProfile(profile: Partial<DeveloperProfile>): Promise<DeveloperProfile> {
    const response = await marketplaceApi.patch('/developers/profile', profile);
    return response.data;
  }

  static async getMyModules(): Promise<MarketplaceModule[]> {
    const response = await marketplaceApi.get('/developers/modules');
    return response.data;
  }

  static async publishModule(moduleData: PublishModuleData): Promise<MarketplaceModule> {
    const formData = new FormData();
    
    // Add basic fields
    formData.append('name', moduleData.name);
    formData.append('displayName', moduleData.displayName);
    formData.append('description', moduleData.description);
    if (moduleData.longDescription) formData.append('longDescription', moduleData.longDescription);
    formData.append('category', moduleData.category);
    formData.append('tags', JSON.stringify(moduleData.tags));
    formData.append('price', JSON.stringify(moduleData.price));
    formData.append('permissions', JSON.stringify(moduleData.permissions));
    formData.append('dependencies', JSON.stringify(moduleData.dependencies));
    if (moduleData.documentation) formData.append('documentation', moduleData.documentation);
    if (moduleData.repository) formData.append('repository', JSON.stringify(moduleData.repository));
    
    // Add files
    formData.append('icon', moduleData.icon);
    formData.append('package', moduleData.packageFile);
    moduleData.screenshots.forEach((file, index) => {
      formData.append(`screenshots[${index}]`, file);
    });

    const response = await marketplaceApi.post('/developers/modules', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  static async updateModule(moduleId: string, moduleData: Partial<PublishModuleData>): Promise<MarketplaceModule> {
    const formData = new FormData();
    
    Object.entries(moduleData).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (Array.isArray(value) && value[0] instanceof File) {
          value.forEach((file, index) => {
            formData.append(`${key}[${index}]`, file);
          });
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      }
    });

    const response = await marketplaceApi.patch(`/developers/modules/${moduleId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  static async deleteModule(moduleId: string): Promise<void> {
    await marketplaceApi.delete(`/developers/modules/${moduleId}`);
  }

  static async getModuleAnalytics(
    moduleId: string, 
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<ModuleAnalytics> {
    const response = await marketplaceApi.get(`/developers/modules/${moduleId}/analytics`, {
      params: { period }
    });
    return response.data;
  }

  static async getDeveloperAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalRevenue: number;
    totalDownloads: number;
    averageRating: number;
    moduleCount: number;
    recentActivity: Array<{
      type: 'download' | 'purchase' | 'review';
      moduleId: string;
      moduleName: string;
      timestamp: string;
      value?: number;
    }>;
    topModules: Array<{
      moduleId: string;
      moduleName: string;
      downloads: number;
      revenue?: number;
      rating: number;
    }>;
  }> {
    const response = await marketplaceApi.get('/developers/analytics', {
      params: { period }
    });
    return response.data;
  }

  // ===============================
  // UTILITY FUNCTIONS
  // ===============================
  
  static async getPopularTags(limit = 20): Promise<Array<{ name: string; count: number }>> {
    const response = await marketplaceApi.get('/tags/popular', { params: { limit } });
    return response.data;
  }

  static async reportModule(moduleId: string, reason: string, details?: string): Promise<void> {
    await marketplaceApi.post(`/modules/${moduleId}/report`, { reason, details });
  }

  static async favoriteModule(moduleId: string): Promise<void> {
    await marketplaceApi.post(`/modules/${moduleId}/favorite`);
  }

  static async unfavoriteModule(moduleId: string): Promise<void> {
    await marketplaceApi.delete(`/modules/${moduleId}/favorite`);
  }

  static async getFavorites(): Promise<MarketplaceModule[]> {
    const response = await marketplaceApi.get('/modules/favorites');
    return response.data;
  }

  static async getDownloadHistory(): Promise<Array<{
    moduleId: string;
    moduleName: string;
    version: string;
    downloadDate: string;
    status: 'installed' | 'uninstalled' | 'failed';
  }>> {
    const response = await marketplaceApi.get('/modules/download-history');
    return response.data;
  }
}

export default MarketplaceAPI;