/**
 * Discovery API Contract
 * 
 * Defines the interface for module discovery, including
 * automatic detection, dependency resolution, and recommendations.
 */

import { ModuleManifest } from '../contracts/ModuleManifest';

/**
 * Module discovery interface
 */
export interface ModuleDiscoveryAPI {
  /** Discover available modules */
  discover(request: DiscoveryRequest): Promise<DiscoveryResult>;
  
  /** Get module recommendations */
  recommend(request: RecommendationRequest): Promise<RecommendationResult>;
  
  /** Resolve dependencies */
  resolveDependencies(request: DependencyResolutionRequest): Promise<DependencyResolutionResult>;
  
  /** Search by capabilities */
  searchByCapabilities(request: CapabilitySearchRequest): Promise<CapabilitySearchResult>;
  
  /** Get module suggestions */
  getSuggestions(request: SuggestionRequest): Promise<SuggestionResult>;
  
  /** Analyze module ecosystem */
  analyzeEcosystem(request: EcosystemAnalysisRequest): Promise<EcosystemAnalysisResult>;
}

/**
 * Discovery requests and responses
 */
export interface DiscoveryRequest {
  /** Discovery scope */
  readonly scope: DiscoveryScope;
  
  /** Filter criteria */
  readonly filters: DiscoveryFilters;
  
  /** Discovery options */
  readonly options: DiscoveryOptions;
}

export interface DiscoveryScope {
  /** Local modules */
  readonly local: boolean;
  
  /** Registry modules */
  readonly registry: boolean;
  
  /** Specific registries to search */
  readonly registries?: readonly string[];
  
  /** Include development modules */
  readonly includeDev: boolean;
  
  /** Include deprecated modules */
  readonly includeDeprecated: boolean;
}

export interface DiscoveryFilters {
  /** Category filter */
  readonly categories?: readonly string[];
  
  /** Type filter */
  readonly types?: readonly string[];
  
  /** Platform compatibility */
  readonly platformVersions?: readonly string[];
  
  /** Required capabilities */
  readonly capabilities?: readonly string[];
  
  /** Author filter */
  readonly authors?: readonly string[];
  
  /** License filter */
  readonly licenses?: readonly string[];
  
  /** Minimum rating */
  readonly minRating?: number;
  
  /** Maximum age in days */
  readonly maxAge?: number;
  
  /** Language/framework */
  readonly frameworks?: readonly string[];
  
  /** Custom filters */
  readonly custom?: Record<string, any>;
}

export interface DiscoveryOptions {
  /** Include full manifests */
  readonly includeManifests: boolean;
  
  /** Include statistics */
  readonly includeStats: boolean;
  
  /** Include dependency information */
  readonly includeDependencies: boolean;
  
  /** Sort order */
  readonly sortBy: DiscoverySortBy;
  
  /** Sort direction */
  readonly sortDirection: 'asc' | 'desc';
  
  /** Result limit */
  readonly limit?: number;
  
  /** Result offset */
  readonly offset?: number;
  
  /** Cache results */
  readonly cache: boolean;
  
  /** Cache TTL in seconds */
  readonly cacheTtl?: number;
}

export enum DiscoverySortBy {
  NAME = 'name',
  POPULARITY = 'popularity',
  RATING = 'rating',
  UPDATED = 'updated',
  CREATED = 'created',
  DOWNLOADS = 'downloads',
  RELEVANCE = 'relevance'
}

export interface DiscoveryResult {
  readonly success: boolean;
  readonly modules: readonly DiscoveredModule[];
  readonly total: number;
  readonly sources: readonly DiscoverySource[];
  readonly aggregations?: DiscoveryAggregations;
  readonly error?: DiscoveryError;
}

export interface DiscoveredModule {
  /** Module identifier */
  readonly id: string;
  
  /** Module name */
  readonly name: string;
  
  /** Module description */
  readonly description: string;
  
  /** Module category */
  readonly category: string;
  
  /** Module type */
  readonly type: string;
  
  /** Module author */
  readonly author: string;
  
  /** Current version */
  readonly version: string;
  
  /** Module source */
  readonly source: DiscoverySource;
  
  /** Module location/URL */
  readonly location: string;
  
  /** Last updated */
  readonly lastUpdated: string;
  
  /** Module statistics (if requested) */
  readonly stats?: ModuleDiscoveryStats;
  
  /** Full manifest (if requested) */
  readonly manifest?: ModuleManifest;
  
  /** Dependency information (if requested) */
  readonly dependencies?: ModuleDependencyInfo;
  
  /** Discovery metadata */
  readonly discoveryMetadata: DiscoveryMetadata;
}

export interface DiscoverySource {
  readonly type: DiscoverySourceType;
  readonly name: string;
  readonly url?: string;
  readonly trusted: boolean;
  readonly lastScanned?: string;
}

export enum DiscoverySourceType {
  LOCAL = 'local',
  REGISTRY = 'registry',
  GIT = 'git',
  NPM = 'npm',
  FILESYSTEM = 'filesystem',
  URL = 'url'
}

export interface ModuleDiscoveryStats {
  readonly downloads: number;
  readonly rating: number;
  readonly ratingCount: number;
  readonly stars: number;
  readonly forks: number;
  readonly issues: number;
  readonly contributors: number;
  readonly lastCommit?: string;
}

export interface ModuleDependencyInfo {
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
  readonly peerDependencies: readonly string[];
  readonly optionalDependencies: readonly string[];
  readonly dependents: number;
  readonly dependencyScore: number;
}

export interface DiscoveryMetadata {
  readonly discoveredAt: string;
  readonly source: string;
  readonly confidence: number;
  readonly relevanceScore: number;
  readonly tags: readonly string[];
}

export interface DiscoveryAggregations {
  readonly byCategory: Record<string, number>;
  readonly byType: Record<string, number>;
  readonly byAuthor: Record<string, number>;
  readonly byLicense: Record<string, number>;
  readonly bySource: Record<string, number>;
}

export interface DiscoveryError {
  readonly code: string;
  readonly message: string;
  readonly source?: string;
  readonly details?: any;
}

/**
 * Recommendation requests and responses
 */
export interface RecommendationRequest {
  /** Context for recommendations */
  readonly context: RecommendationContext;
  
  /** Current modules */
  readonly currentModules?: readonly string[];
  
  /** Requirements */
  readonly requirements: RecommendationRequirements;
  
  /** Recommendation options */
  readonly options: RecommendationOptions;
}

export interface RecommendationContext {
  /** Project type */
  readonly projectType: 'web' | 'mobile' | 'desktop' | 'api' | 'library' | 'plugin';
  
  /** Target platform */
  readonly platform: string;
  
  /** Technology stack */
  readonly stack: readonly string[];
  
  /** Domain/industry */
  readonly domain?: string;
  
  /** Team size */
  readonly teamSize?: 'solo' | 'small' | 'medium' | 'large';
  
  /** Experience level */
  readonly experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  /** Performance requirements */
  readonly performance?: 'low' | 'medium' | 'high' | 'critical';
  
  /** Security requirements */
  readonly security?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecommendationRequirements {
  /** Required capabilities */
  readonly capabilities: readonly string[];
  
  /** Optional capabilities */
  readonly optionalCapabilities?: readonly string[];
  
  /** Performance criteria */
  readonly performance?: PerformanceCriteria;
  
  /** Compatibility requirements */
  readonly compatibility?: CompatibilityRequirements;
  
  /** Licensing constraints */
  readonly licensing?: LicensingConstraints;
  
  /** Size constraints */
  readonly size?: SizeConstraints;
}

export interface PerformanceCriteria {
  readonly maxMemoryUsage?: number;
  readonly maxCpuUsage?: number;
  readonly maxLoadTime?: number;
  readonly minThroughput?: number;
}

export interface CompatibilityRequirements {
  readonly platformVersions: readonly string[];
  readonly browserSupport?: readonly string[];
  readonly nodeVersions?: readonly string[];
}

export interface LicensingConstraints {
  readonly allowedLicenses?: readonly string[];
  readonly forbiddenLicenses?: readonly string[];
  readonly commercialUse: boolean;
  readonly modifications: boolean;
  readonly distribution: boolean;
}

export interface SizeConstraints {
  readonly maxBundleSize?: number;
  readonly maxDependencies?: number;
  readonly maxDepth?: number;
}

export interface RecommendationOptions {
  /** Maximum recommendations */
  readonly maxRecommendations: number;
  
  /** Include alternatives */
  readonly includeAlternatives: boolean;
  
  /** Personalization */
  readonly personalized: boolean;
  
  /** Explanation detail level */
  readonly explanationLevel: 'none' | 'basic' | 'detailed';
  
  /** Include experimental modules */
  readonly includeExperimental: boolean;
  
  /** Weight factors */
  readonly weights?: RecommendationWeights;
}

export interface RecommendationWeights {
  readonly popularity: number;
  readonly quality: number;
  readonly maintenance: number;
  readonly compatibility: number;
  readonly performance: number;
  readonly security: number;
}

export interface RecommendationResult {
  readonly success: boolean;
  readonly recommendations: readonly ModuleRecommendation[];
  readonly alternatives: readonly ModuleAlternative[];
  readonly insights: RecommendationInsights;
  readonly error?: DiscoveryError;
}

export interface ModuleRecommendation {
  readonly module: DiscoveredModule;
  readonly score: number;
  readonly confidence: number;
  readonly reasoning: RecommendationReasoning;
  readonly fit: CapabilityFit;
  readonly risks: readonly RecommendationRisk[];
  readonly benefits: readonly string[];
}

export interface RecommendationReasoning {
  readonly primary: string;
  readonly factors: readonly RecommendationFactor[];
  readonly explanation?: string;
}

export interface RecommendationFactor {
  readonly factor: string;
  readonly impact: 'positive' | 'negative' | 'neutral';
  readonly weight: number;
  readonly description: string;
}

export interface CapabilityFit {
  readonly overall: number;
  readonly required: number;
  readonly optional: number;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
}

export interface RecommendationRisk {
  readonly type: 'security' | 'performance' | 'compatibility' | 'maintenance' | 'legal';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly mitigation?: string;
}

export interface ModuleAlternative {
  readonly module: DiscoveredModule;
  readonly reason: string;
  readonly comparison: AlternativeComparison;
}

export interface AlternativeComparison {
  readonly pros: readonly string[];
  readonly cons: readonly string[];
  readonly useCase: string;
}

export interface RecommendationInsights {
  readonly trends: readonly TrendInsight[];
  readonly patterns: readonly PatternInsight[];
  readonly warnings: readonly string[];
  readonly suggestions: readonly string[];
}

export interface TrendInsight {
  readonly trend: string;
  readonly direction: 'rising' | 'falling' | 'stable';
  readonly impact: string;
}

export interface PatternInsight {
  readonly pattern: string;
  readonly frequency: number;
  readonly recommendation: string;
}

/**
 * Dependency resolution
 */
export interface DependencyResolutionRequest {
  readonly modules: readonly string[];
  readonly strategy: ResolutionStrategy;
  readonly constraints: ResolutionConstraints;
  readonly options: ResolutionOptions;
}

export enum ResolutionStrategy {
  LATEST = 'latest',
  STABLE = 'stable',
  MINIMAL = 'minimal',
  COMPATIBLE = 'compatible',
  LOCKED = 'locked'
}

export interface ResolutionConstraints {
  readonly platformVersion: string;
  readonly maxDepth?: number;
  readonly allowPrerelease: boolean;
  readonly allowDeprecated: boolean;
  readonly conflictResolution: 'strict' | 'permissive' | 'auto';
}

export interface ResolutionOptions {
  readonly includeDevDependencies: boolean;
  readonly includeOptionalDependencies: boolean;
  readonly preferLocal: boolean;
  readonly timeout: number;
}

export interface DependencyResolutionResult {
  readonly success: boolean;
  readonly resolved: readonly ResolvedDependency[];
  readonly conflicts: readonly DependencyConflict[];
  readonly warnings: readonly DependencyWarning[];
  readonly tree: DependencyTree;
  readonly error?: DiscoveryError;
}

export interface ResolvedDependency {
  readonly moduleId: string;
  readonly version: string;
  readonly source: string;
  readonly type: 'direct' | 'transitive';
  readonly depth: number;
  readonly size: number;
  readonly dependencies: readonly string[];
}

export interface DependencyConflict {
  readonly moduleId: string;
  readonly versions: readonly string[];
  readonly requestedBy: readonly string[];
  readonly resolution?: ConflictResolution;
}

export interface ConflictResolution {
  readonly strategy: 'override' | 'dedupe' | 'ignore';
  readonly chosenVersion: string;
  readonly reason: string;
}

export interface DependencyWarning {
  readonly type: 'deprecated' | 'vulnerable' | 'incompatible' | 'large' | 'unmaintained';
  readonly moduleId: string;
  readonly version: string;
  readonly message: string;
  readonly severity: 'info' | 'warning' | 'error';
}

export interface DependencyTree {
  readonly root: DependencyTreeNode;
  readonly totalSize: number;
  readonly depth: number;
  readonly uniqueModules: number;
}

export interface DependencyTreeNode {
  readonly moduleId: string;
  readonly version: string;
  readonly size: number;
  readonly children: readonly DependencyTreeNode[];
}

/**
 * Capability search
 */
export interface CapabilitySearchRequest {
  readonly capabilities: readonly CapabilityQuery[];
  readonly context?: SearchContext;
  readonly options: CapabilitySearchOptions;
}

export interface CapabilityQuery {
  readonly capability: string;
  readonly required: boolean;
  readonly weight: number;
  readonly parameters?: Record<string, any>;
}

export interface SearchContext {
  readonly platform: string;
  readonly framework?: string;
  readonly domain?: string;
  readonly constraints?: Record<string, any>;
}

export interface CapabilitySearchOptions {
  readonly exactMatch: boolean;
  readonly includePartialMatches: boolean;
  readonly scoringAlgorithm: 'simple' | 'weighted' | 'ml';
  readonly maxResults: number;
  readonly minScore: number;
}

export interface CapabilitySearchResult {
  readonly success: boolean;
  readonly matches: readonly CapabilityMatch[];
  readonly suggestions: readonly CapabilitySuggestion[];
  readonly error?: DiscoveryError;
}

export interface CapabilityMatch {
  readonly module: DiscoveredModule;
  readonly score: number;
  readonly matchedCapabilities: readonly MatchedCapability[];
  readonly missingCapabilities: readonly string[];
  readonly extraCapabilities: readonly string[];
}

export interface MatchedCapability {
  readonly capability: string;
  readonly confidence: number;
  readonly method: 'exact' | 'fuzzy' | 'inferred';
  readonly evidence: readonly string[];
}

export interface CapabilitySuggestion {
  readonly capability: string;
  readonly alternatives: readonly string[];
  readonly reason: string;
}

/**
 * Suggestions and ecosystem analysis
 */
export interface SuggestionRequest {
  readonly type: SuggestionType;
  readonly context: SuggestionContext;
  readonly preferences: SuggestionPreferences;
}

export enum SuggestionType {
  SIMILAR_MODULES = 'similar-modules',
  COMPLEMENTARY_MODULES = 'complementary-modules',
  UPGRADE_SUGGESTIONS = 'upgrade-suggestions',
  OPTIMIZATION_SUGGESTIONS = 'optimization-suggestions',
  ALTERNATIVE_MODULES = 'alternative-modules'
}

export interface SuggestionContext {
  readonly currentModules: readonly string[];
  readonly usagePatterns?: ModuleUsagePattern[];
  readonly performance?: PerformanceContext;
  readonly issues?: readonly string[];
}

export interface ModuleUsagePattern {
  readonly moduleId: string;
  readonly frequency: number;
  readonly features: readonly string[];
  readonly problems?: readonly string[];
}

export interface PerformanceContext {
  readonly metrics: Record<string, number>;
  readonly bottlenecks: readonly string[];
  readonly goals: Record<string, number>;
}

export interface SuggestionPreferences {
  readonly stability: 'bleeding-edge' | 'latest' | 'stable' | 'conservative';
  readonly maintenance: 'minimal' | 'low' | 'medium' | 'high';
  readonly riskTolerance: 'low' | 'medium' | 'high';
  readonly priorities: readonly SuggestionPriority[];
}

export enum SuggestionPriority {
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  STABILITY = 'stability',
  FEATURES = 'features',
  SIZE = 'size',
  MAINTENANCE = 'maintenance'
}

export interface SuggestionResult {
  readonly success: boolean;
  readonly suggestions: readonly ModuleSuggestion[];
  readonly insights: readonly SuggestionInsight[];
  readonly error?: DiscoveryError;
}

export interface ModuleSuggestion {
  readonly type: SuggestionType;
  readonly module: DiscoveredModule;
  readonly confidence: number;
  readonly impact: SuggestionImpact;
  readonly rationale: string;
  readonly implementation: ImplementationGuide;
}

export interface SuggestionImpact {
  readonly performance: ImpactLevel;
  readonly security: ImpactLevel;
  readonly maintenance: ImpactLevel;
  readonly features: ImpactLevel;
  readonly risk: ImpactLevel;
}

export enum ImpactLevel {
  VERY_NEGATIVE = 'very-negative',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  POSITIVE = 'positive',
  VERY_POSITIVE = 'very-positive'
}

export interface ImplementationGuide {
  readonly effort: 'low' | 'medium' | 'high' | 'very-high';
  readonly steps: readonly string[];
  readonly considerations: readonly string[];
  readonly timeline?: string;
}

export interface SuggestionInsight {
  readonly type: 'trend' | 'pattern' | 'opportunity' | 'risk';
  readonly title: string;
  readonly description: string;
  readonly actionable: boolean;
  readonly priority: 'low' | 'medium' | 'high';
}

export interface EcosystemAnalysisRequest {
  readonly scope: EcosystemScope;
  readonly analysis: readonly AnalysisType[];
  readonly depth: AnalysisDepth;
}

export interface EcosystemScope {
  readonly modules: readonly string[];
  readonly includeTransitive: boolean;
  readonly maxDepth?: number;
}

export enum AnalysisType {
  DEPENDENCY_HEALTH = 'dependency-health',
  SECURITY_ANALYSIS = 'security-analysis',
  PERFORMANCE_ANALYSIS = 'performance-analysis',
  COMPATIBILITY_ANALYSIS = 'compatibility-analysis',
  TREND_ANALYSIS = 'trend-analysis',
  RISK_ANALYSIS = 'risk-analysis'
}

export enum AnalysisDepth {
  SHALLOW = 'shallow',
  MEDIUM = 'medium',
  DEEP = 'deep',
  EXHAUSTIVE = 'exhaustive'
}

export interface EcosystemAnalysisResult {
  readonly success: boolean;
  readonly analysis: EcosystemAnalysis;
  readonly recommendations: readonly EcosystemRecommendation[];
  readonly warnings: readonly EcosystemWarning[];
  readonly error?: DiscoveryError;
}

export interface EcosystemAnalysis {
  readonly overview: EcosystemOverview;
  readonly health: EcosystemHealth;
  readonly security: EcosystemSecurity;
  readonly performance: EcosystemPerformance;
  readonly trends: EcosystemTrends;
  readonly risks: EcosystemRisks;
}

export interface EcosystemOverview {
  readonly totalModules: number;
  readonly directDependencies: number;
  readonly transitiveDependencies: number;
  readonly depth: number;
  readonly size: number;
  readonly categories: Record<string, number>;
}

export interface EcosystemHealth {
  readonly score: number;
  readonly factors: readonly HealthFactor[];
  readonly outdated: readonly OutdatedModule[];
  readonly abandoned: readonly AbandonedModule[];
}

export interface HealthFactor {
  readonly factor: string;
  readonly score: number;
  readonly weight: number;
  readonly description: string;
}

export interface OutdatedModule {
  readonly moduleId: string;
  readonly currentVersion: string;
  readonly latestVersion: string;
  readonly age: number;
  readonly severity: 'minor' | 'major' | 'critical';
}

export interface AbandonedModule {
  readonly moduleId: string;
  readonly lastUpdate: string;
  readonly indicators: readonly string[];
  readonly alternatives: readonly string[];
}

export interface EcosystemSecurity {
  readonly score: number;
  readonly vulnerabilities: readonly SecurityVulnerability[];
  readonly riskFactors: readonly SecurityRiskFactor[];
  readonly recommendations: readonly string[];
}

export interface SecurityVulnerability {
  readonly moduleId: string;
  readonly version: string;
  readonly cve?: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly fixVersion?: string;
}

export interface SecurityRiskFactor {
  readonly type: string;
  readonly modules: readonly string[];
  readonly risk: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

export interface EcosystemPerformance {
  readonly bundleSize: number;
  readonly loadTime: number;
  readonly memoryUsage: number;
  readonly bottlenecks: readonly PerformanceBottleneck[];
  readonly optimizations: readonly string[];
}

export interface PerformanceBottleneck {
  readonly module: string;
  readonly type: 'size' | 'complexity' | 'dependencies' | 'runtime';
  readonly impact: 'low' | 'medium' | 'high';
  readonly suggestion: string;
}

export interface EcosystemTrends {
  readonly growth: TrendData;
  readonly adoption: TrendData;
  readonly maintenance: TrendData;
  readonly emerging: readonly EmergingTrend[];
}

export interface TrendData {
  readonly current: number;
  readonly change: number;
  readonly direction: 'up' | 'down' | 'stable';
  readonly period: string;
}

export interface EmergingTrend {
  readonly trend: string;
  readonly relevance: number;
  readonly timeframe: string;
  readonly impact: string;
}

export interface EcosystemRisks {
  readonly overall: 'low' | 'medium' | 'high' | 'critical';
  readonly risks: readonly EcosystemRisk[];
  readonly mitigation: readonly RiskMitigation[];
}

export interface EcosystemRisk {
  readonly type: 'dependency' | 'security' | 'maintenance' | 'compatibility' | 'performance';
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly modules: readonly string[];
  readonly description: string;
  readonly probability: number;
  readonly impact: number;
}

export interface RiskMitigation {
  readonly risk: string;
  readonly strategy: string;
  readonly effort: 'low' | 'medium' | 'high';
  readonly priority: number;
}

export interface EcosystemRecommendation {
  readonly type: 'upgrade' | 'replace' | 'remove' | 'add' | 'configure';
  readonly modules: readonly string[];
  readonly rationale: string;
  readonly impact: 'low' | 'medium' | 'high';
  readonly effort: 'low' | 'medium' | 'high';
  readonly priority: number;
}

export interface EcosystemWarning {
  readonly type: 'security' | 'compatibility' | 'performance' | 'maintenance';
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly message: string;
  readonly modules: readonly string[];
  readonly action?: string;
}