import { ModuleRegistryClient } from './registry-client';
import type { ModuleSearchResult } from './registry-client';

export interface ModuleFilter {
  category?: string;
  features?: {
    database?: boolean;
    ai?: boolean;
    realtime?: boolean;
  };
  author?: string;
  tags?: string[];
  minDownloads?: number;
  updatedSince?: Date;
}

export interface ModuleRecommendation {
  module: ModuleSearchResult;
  score: number;
  reason: string;
  compatibility: 'high' | 'medium' | 'low';
}

export class ModuleDiscoveryService {
  private registryClient: ModuleRegistryClient;
  
  constructor(registryUrl?: string, apiKey?: string) {
    this.registryClient = new ModuleRegistryClient(registryUrl, { apiKey });
  }

  /**
   * Discover modules with advanced filtering
   */
  async discoverModules(
    query: string = '',
    filter: ModuleFilter = {},
    limit = 20
  ): Promise<ModuleSearchResult[]> {
    let results = await this.registryClient.searchModules(query, {
      category: filter.category,
      limit: Math.min(limit * 2, 100) // Get more results to filter locally
    });

    // Apply local filters
    let filteredResults = results.results;

    if (filter.features) {
      filteredResults = filteredResults.filter(module => 
        this.matchesFeatures(module, filter.features!)
      );
    }

    if (filter.author) {
      filteredResults = filteredResults.filter(module =>
        module.author.toLowerCase().includes(filter.author!.toLowerCase())
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      filteredResults = filteredResults.filter(module =>
        filter.tags!.some(tag => module.tags?.includes(tag))
      );
    }

    if (filter.minDownloads) {
      filteredResults = filteredResults.filter(module =>
        module.downloads >= filter.minDownloads!
      );
    }

    if (filter.updatedSince) {
      filteredResults = filteredResults.filter(module =>
        new Date(module.updatedAt) >= filter.updatedSince!
      );
    }

    return filteredResults.slice(0, limit);
  }

  /**
   * Get module recommendations based on current project
   */
  async getRecommendations(
    currentModules: string[] = [],
    projectType?: string,
    limit = 10
  ): Promise<ModuleRecommendation[]> {
    const recommendations: ModuleRecommendation[] = [];
    
    // Get popular modules
    const popular = await this.registryClient.searchModules('', {
      sortBy: 'downloads',
      limit: 50
    });

    // Get recent modules
    const recent = await this.registryClient.searchModules('', {
      sortBy: 'updated',
      limit: 30
    });

    // Combine and deduplicate
    const allModules = new Map<string, ModuleSearchResult>();
    [...popular.results, ...recent.results].forEach(module => {
      allModules.set(module.name, module);
    });

    // Score each module
    for (const [name, module] of allModules) {
      if (currentModules.includes(name)) {
        continue; // Skip already installed modules
      }

      const score = this.calculateRecommendationScore(
        module,
        currentModules,
        projectType
      );

      if (score > 0.3) { // Minimum score threshold
        recommendations.push({
          module,
          score,
          reason: this.getRecommendationReason(module, currentModules, projectType),
          compatibility: this.getCompatibilityLevel(score)
        });
      }
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Find similar modules to a given module
   */
  async findSimilarModules(
    moduleName: string,
    limit = 10
  ): Promise<ModuleSearchResult[]> {
    try {
      const targetModule = await this.registryClient.getModule(moduleName);
      
      // Search by category
      const categoryResults = await this.registryClient.searchModules('', {
        category: targetModule.category,
        limit: 30
      });

      // Search by keywords from description
      const keywords = this.extractKeywords(targetModule.description);
      const keywordResults = await Promise.all(
        keywords.slice(0, 3).map(keyword =>
          this.registryClient.searchModules(keyword, { limit: 10 })
        )
      );

      // Combine results
      const allResults = new Map<string, ModuleSearchResult>();
      [
        ...categoryResults.results,
        ...keywordResults.flatMap(r => r.results)
      ].forEach(module => {
        if (module.name !== moduleName) {
          allResults.set(module.name, module);
        }
      });

      // Sort by similarity score
      const similarityScores = Array.from(allResults.values()).map(module => ({
        module,
        score: this.calculateSimilarityScore(targetModule, module)
      }));

      return similarityScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.module);

    } catch (error) {
      console.warn(`Could not find module ${moduleName}:`, error.message);
      return [];
    }
  }

  /**
   * Get trending modules
   */
  async getTrendingModules(
    period: 'day' | 'week' | 'month' = 'week',
    limit = 20
  ): Promise<ModuleSearchResult[]> {
    // For now, use updated date as proxy for trending
    // In a real implementation, this would use download statistics
    const cutoffDate = new Date();
    switch (period) {
      case 'day':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
    }

    const results = await this.registryClient.searchModules('', {
      sortBy: 'updated',
      limit: 50
    });

    return results.results
      .filter(module => new Date(module.updatedAt) >= cutoffDate)
      .slice(0, limit);
  }

  /**
   * Get modules by category with statistics
   */
  async getCategoryModules(category: string): Promise<{
    modules: ModuleSearchResult[];
    stats: {
      total: number;
      avgDownloads: number;
      lastUpdated: string;
    };
  }> {
    const results = await this.registryClient.searchModules('', {
      category,
      limit: 100
    });

    const stats = {
      total: results.total,
      avgDownloads: results.results.reduce((sum, m) => sum + m.downloads, 0) / results.results.length,
      lastUpdated: results.results.reduce((latest, m) =>
        new Date(m.updatedAt) > new Date(latest) ? m.updatedAt : latest,
        results.results[0]?.updatedAt || new Date().toISOString()
      )
    };

    return {
      modules: results.results,
      stats
    };
  }

  private matchesFeatures(module: ModuleSearchResult, features: NonNullable<ModuleFilter['features']>): boolean {
    // This would require module metadata to include features
    // For now, use heuristics based on description and name
    const description = (module.description || '').toLowerCase();
    const name = module.name.toLowerCase();

    if (features.database !== undefined) {
      const hasDatabase = description.includes('database') || 
                         description.includes('db') || 
                         name.includes('db') ||
                         description.includes('postgresql') ||
                         description.includes('mysql');
      if (features.database !== hasDatabase) return false;
    }

    if (features.ai !== undefined) {
      const hasAI = description.includes('ai') || 
                   description.includes('artificial') ||
                   description.includes('machine learning') ||
                   description.includes('llm') ||
                   name.includes('ai');
      if (features.ai !== hasAI) return false;
    }

    if (features.realtime !== undefined) {
      const hasRealtime = description.includes('realtime') ||
                         description.includes('real-time') ||
                         description.includes('websocket') ||
                         description.includes('live');
      if (features.realtime !== hasRealtime) return false;
    }

    return true;
  }

  private calculateRecommendationScore(
    module: ModuleSearchResult,
    currentModules: string[],
    projectType?: string
  ): number {
    let score = 0;

    // Base score from downloads (normalized)
    score += Math.min(module.downloads / 10000, 0.3);

    // Recency bonus
    const daysSinceUpdate = (Date.now() - new Date(module.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0.2 - (daysSinceUpdate / 365 * 0.2), 0);

    // Category bonus
    if (projectType && module.category === projectType) {
      score += 0.3;
    }

    // Description quality
    if (module.description && module.description.length > 50) {
      score += 0.1;
    }

    // Complementary modules bonus
    const isComplementary = this.isComplementaryModule(module, currentModules);
    if (isComplementary) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private getRecommendationReason(
    module: ModuleSearchResult,
    currentModules: string[],
    projectType?: string
  ): string {
    if (module.downloads > 10000) {
      return `Popular module with ${module.downloads} downloads`;
    }
    
    if (projectType && module.category === projectType) {
      return `Matches your project type: ${projectType}`;
    }

    if (this.isComplementaryModule(module, currentModules)) {
      return 'Complements your existing modules';
    }

    const daysSinceUpdate = (Date.now() - new Date(module.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) {
      return 'Recently updated';
    }

    return 'Well-maintained module';
  }

  private getCompatibilityLevel(score: number): 'high' | 'medium' | 'low' {
    if (score > 0.7) return 'high';
    if (score > 0.5) return 'medium';
    return 'low';
  }

  private isComplementaryModule(module: ModuleSearchResult, currentModules: string[]): boolean {
    // Heuristics for complementary modules
    const hasDatabase = currentModules.some(m => m.includes('database') || m.includes('db'));
    const hasAuth = currentModules.some(m => m.includes('auth'));
    const hasAI = currentModules.some(m => m.includes('ai'));

    const moduleDesc = module.description?.toLowerCase() || '';
    const moduleName = module.name.toLowerCase();

    // If they have a database module, recommend analytics/reporting
    if (hasDatabase && (moduleDesc.includes('analytics') || moduleDesc.includes('report'))) {
      return true;
    }

    // If they have auth, recommend user management
    if (hasAuth && (moduleDesc.includes('user') || moduleDesc.includes('profile'))) {
      return true;
    }

    // If they have AI, recommend data processing
    if (hasAI && (moduleDesc.includes('data') || moduleDesc.includes('process'))) {
      return true;
    }

    return false;
  }

  private calculateSimilarityScore(module1: ModuleSearchResult, module2: ModuleSearchResult): number {
    let score = 0;

    // Category match
    if (module1.category === module2.category) {
      score += 0.4;
    }

    // Description similarity (simple keyword matching)
    const keywords1 = this.extractKeywords(module1.description || '');
    const keywords2 = this.extractKeywords(module2.description || '');
    const commonKeywords = keywords1.filter(k => keywords2.includes(k));
    score += (commonKeywords.length / Math.max(keywords1.length, keywords2.length)) * 0.3;

    // Tags similarity
    const tags1 = module1.tags || [];
    const tags2 = module2.tags || [];
    const commonTags = tags1.filter(t => tags2.includes(t));
    if (tags1.length > 0 && tags2.length > 0) {
      score += (commonTags.length / Math.max(tags1.length, tags2.length)) * 0.3;
    }

    return score;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    return [...new Set(words)]; // Remove duplicates
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
      'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
      'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
      'such', 'take', 'than', 'them', 'well', 'were', 'para', 'uma',
      'com', 'mais', 'seu', 'que', 'para', 'por', 'uma', 'como'
    ];
    
    return stopWords.includes(word);
  }
}