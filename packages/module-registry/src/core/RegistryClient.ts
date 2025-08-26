import { ModuleRegistryClient } from '../../sdk/src/api/registry-client';
import { ModuleDiscoveryService } from '../../sdk/src/api/module-discovery';
import type { 
  ModulePackage, 
  ModuleVersion, 
  SearchQuery, 
  SearchResult, 
  RegistryStats,
  PublishRequest,
  PublishResponse
} from '../types';

export class RegistryClient extends ModuleRegistryClient {
  private discoveryService: ModuleDiscoveryService;

  constructor(registryUrl?: string, apiKey?: string) {
    super(registryUrl, { apiKey });
    this.discoveryService = new ModuleDiscoveryService(registryUrl, apiKey);
  }

  /**
   * Enhanced search with advanced filtering
   */
  async searchPackages(query: SearchQuery): Promise<SearchResult<ModulePackage>> {
    const params = new URLSearchParams();
    
    if (query.q) params.append('q', query.q);
    if (query.category) params.append('category', query.category);
    if (query.subcategory) params.append('subcategory', query.subcategory);
    if (query.author) params.append('author', query.author);
    if (query.license) params.append('license', query.license);
    if (query.minRating) params.append('minRating', query.minRating.toString());
    if (query.minDownloads) params.append('minDownloads', query.minDownloads.toString());
    if (query.updatedSince) params.append('updatedSince', query.updatedSince.toISOString());
    if (query.tags) params.append('tags', query.tags.join(','));
    if (query.includePrerelease) params.append('includePrerelease', 'true');
    if (query.includeDeprecated) params.append('includeDeprecated', 'true');
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.offset) params.append('offset', query.offset.toString());

    const response = await this.request('GET', `/api/v1/search?${params}`);
    return response;
  }

  /**
   * Get detailed package information
   */
  async getPackageDetails(name: string, version?: string): Promise<ModulePackage & {
    versions: ModuleVersion[];
    readme?: string;
    changelog?: string;
    dependencies: Record<string, string>;
    peerDependencies: Record<string, string>;
    author: {
      username: string;
      displayName: string;
      isVerified: boolean;
    };
    recentRatings: Array<{
      rating: number;
      review?: string;
      user: string;
      createdAt: Date;
    }>;
  }> {
    const url = version 
      ? `/api/v1/packages/${name}/${version}`
      : `/api/v1/packages/${name}`;
    
    return await this.request('GET', url);
  }

  /**
   * Get registry statistics
   */
  async getRegistryStats(): Promise<RegistryStats> {
    return await this.request('GET', '/api/v1/stats');
  }

  /**
   * Get trending packages
   */
  async getTrendingPackages(
    period: 'day' | 'week' | 'month' = 'week',
    category?: string,
    limit = 20
  ): Promise<{ packages: ModulePackage[] }> {
    const params = new URLSearchParams({
      period,
      limit: limit.toString()
    });

    if (category) {
      params.append('category', category);
    }

    return await this.request('GET', `/api/v1/stats/trending?${params}`);
  }

  /**
   * Get popular packages
   */
  async getPopularPackages(
    category?: string,
    limit = 20
  ): Promise<{ packages: ModulePackage[] }> {
    const params = new URLSearchParams({
      sortBy: 'downloads',
      limit: limit.toString()
    });

    if (category) {
      params.append('category', category);
    }

    const response = await this.request('GET', `/api/v1/packages?${params}`);
    return { packages: response.results };
  }

  /**
   * Get categories with statistics
   */
  async getCategories(): Promise<Array<{
    name: string;
    displayName: string;
    description: string;
    icon: string;
    color: string;
    packageCount: number;
    totalDownloads: number;
    averageRating: number;
  }>> {
    const response = await this.request('GET', '/api/v1/stats/categories');
    return response.categories;
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string): Promise<{
    packages: Array<{ name: string; displayName: string; downloads: number }>;
    categories: Array<{ name: string; displayName: string }>;
    tags: Array<{ name: string; displayName: string; usage: number }>;
  }> {
    const params = new URLSearchParams({ q: query });
    const response = await this.request('GET', `/api/v1/search/suggestions?${params}`);
    return response.suggestions;
  }

  /**
   * Get package recommendations
   */
  async getRecommendations(
    currentModules: string[] = [],
    projectType?: string,
    limit = 10
  ) {
    return await this.discoveryService.getRecommendations(currentModules, projectType, limit);
  }

  /**
   * Find similar packages
   */
  async findSimilarPackages(packageName: string, limit = 10) {
    return await this.discoveryService.findSimilarModules(packageName, limit);
  }

  /**
   * Advanced module discovery
   */
  async discoverModules(query = '', filters = {}, limit = 20) {
    return await this.discoveryService.discoverModules(query, filters, limit);
  }

  /**
   * Publish package with enhanced validation
   */
  async publishPackage(request: PublishRequest): Promise<PublishResponse> {
    const formData = new FormData();
    formData.append('package', new Blob([request.tarball], { type: 'application/gzip' }));
    formData.append('tag', request.tag);
    formData.append('access', request.access);
    
    if (request.dryRun) {
      formData.append('dryRun', 'true');
    }

    const response = await this.request('POST', '/api/v1/packages', {
      body: formData,
      headers: {} // Let browser set multipart headers
    });

    return response;
  }

  /**
   * Rate a package
   */
  async ratePackage(
    packageName: string, 
    rating: number, 
    review?: string
  ): Promise<void> {
    await this.request('POST', `/api/v1/packages/${packageName}/rate`, {
      body: JSON.stringify({ rating, review }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Report a package
   */
  async reportPackage(
    packageName: string,
    reason: string,
    details?: string
  ): Promise<void> {
    await this.request('POST', `/api/v1/packages/${packageName}/report`, {
      body: JSON.stringify({ reason, details }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get user's published packages
   */
  async getUserPackages(
    username?: string,
    limit = 20,
    offset = 0
  ): Promise<{
    packages: ModulePackage[];
    total: number;
  }> {
    const endpoint = username 
      ? `/api/v1/users/${username}/packages`
      : '/api/v1/users/me/packages';

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    return await this.request('GET', `${endpoint}?${params}`);
  }

  /**
   * Get user statistics
   */
  async getUserStats(period = '30d'): Promise<{
    overall: {
      totalPackages: number;
      totalDownloads: number;
      averageRating: number;
      totalRatings: number;
    };
    downloadHistory: Array<{
      date: string;
      downloads: number;
    }>;
    topPackages: Array<{
      name: string;
      displayName: string;
      totalDownloads: number;
      averageRating: number;
    }>;
  }> {
    const params = new URLSearchParams({ period });
    return await this.request('GET', `/api/v1/users/me/stats?${params}`);
  }

  /**
   * Subscribe to package updates
   */
  async subscribeToPackage(packageName: string): Promise<void> {
    await this.request('POST', `/api/v1/packages/${packageName}/subscribe`);
  }

  /**
   * Unsubscribe from package updates
   */
  async unsubscribeFromPackage(packageName: string): Promise<void> {
    await this.request('DELETE', `/api/v1/packages/${packageName}/subscribe`);
  }

  /**
   * Get package security report
   */
  async getSecurityReport(packageName: string, version?: string): Promise<{
    score: number;
    issues: Array<{
      severity: 'low' | 'moderate' | 'high' | 'critical';
      type: string;
      title: string;
      description: string;
      affectedVersions: string[];
      patchedVersions?: string[];
    }>;
    lastScanned: Date;
  }> {
    const url = version 
      ? `/api/v1/packages/${packageName}/${version}/security`
      : `/api/v1/packages/${packageName}/security`;
    
    return await this.request('GET', url);
  }
}