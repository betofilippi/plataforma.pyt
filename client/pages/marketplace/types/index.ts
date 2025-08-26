export interface MarketplaceModule {
  id: string;
  name: string;
  displayName: string;
  description: string;
  longDescription?: string;
  version: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    verified: boolean;
  };
  category: ModuleCategory;
  tags: string[];
  price: {
    type: 'free' | 'paid' | 'freemium';
    amount?: number;
    currency?: string;
    trialDays?: number;
  };
  ratings: {
    average: number;
    count: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  downloads: number;
  featured: boolean;
  trending: boolean;
  newRelease: boolean;
  screenshots: string[];
  icon: string;
  permissions: ModulePermission[];
  dependencies: string[];
  compatibility: {
    minVersion: string;
    maxVersion?: string;
  };
  repository?: {
    type: 'github' | 'gitlab' | 'bitbucket';
    url: string;
  };
  documentation?: string;
  changelog: VersionHistory[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  status: 'published' | 'draft' | 'suspended';
  metadata?: Record<string, any>;
}

export interface ModuleCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  parentId?: string;
}

export interface ModulePermission {
  id: string;
  name: string;
  description: string;
  required: boolean;
}

export interface VersionHistory {
  version: string;
  releaseDate: string;
  notes: string;
  breaking: boolean;
  features: string[];
  bugfixes: string[];
}

export interface ModuleReview {
  id: string;
  moduleId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  content: string;
  verified: boolean;
  helpful: number;
  createdAt: string;
  updatedAt?: string;
  response?: {
    content: string;
    authorName: string;
    createdAt: string;
  };
}

export interface InstallationStatus {
  moduleId: string;
  status: 'installing' | 'installed' | 'failed' | 'updating' | 'uninstalling';
  progress?: number;
  error?: string;
  installedVersion?: string;
  installDate?: string;
}

export interface DeveloperProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  website?: string;
  bio?: string;
  avatarUrl?: string;
  verified: boolean;
  modules: string[];
  totalDownloads: number;
  averageRating: number;
  revenue: {
    total: number;
    thisMonth: number;
    currency: string;
  };
  createdAt: string;
}

export interface ModuleAnalytics {
  moduleId: string;
  period: 'day' | 'week' | 'month' | 'year';
  downloads: {
    total: number;
    data: Array<{ date: string; count: number }>;
  };
  revenue?: {
    total: number;
    data: Array<{ date: string; amount: number }>;
  };
  ratings: {
    average: number;
    count: number;
    recent: ModuleReview[];
  };
  geography: Array<{
    country: string;
    downloads: number;
    revenue?: number;
  }>;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  priceType?: 'all' | 'free' | 'paid' | 'freemium';
  rating?: number;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'newest' | 'updated' | 'name';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  trending?: boolean;
  newReleases?: boolean;
  tags?: string[];
}

export interface SearchResult {
  modules: MarketplaceModule[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: SearchFilters;
  aggregations: {
    categories: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    priceTypes: Array<{ type: string; count: number }>;
  };
}

export interface PublishModuleData {
  name: string;
  displayName: string;
  description: string;
  longDescription?: string;
  category: string;
  tags: string[];
  price: MarketplaceModule['price'];
  screenshots: File[];
  icon: File;
  packageFile: File;
  permissions: string[];
  dependencies: string[];
  documentation?: string;
  repository?: MarketplaceModule['repository'];
}