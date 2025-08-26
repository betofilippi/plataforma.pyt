export interface ModulePackage {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  author: string;
  authorEmail: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  isDeprecated: boolean;
  deprecationMessage?: string;
  totalDownloads: number;
  weeklyDownloads: number;
  monthlyDownloads: number;
  averageRating: number;
  ratingsCount: number;
  securityScore: number;
  securityIssues: SecurityIssue[];
  compatibility: CompatibilityInfo;
}

export interface ModuleVersion {
  id: string;
  packageId: string;
  version: string;
  tag: string;
  description?: string;
  changelog?: string;
  tarballUrl: string;
  tarballSize: number;
  tarballSha256: string;
  manifest: ModuleManifest;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  isPrerelease: boolean;
  isDeprecated: boolean;
  securityScore: number;
  publishedAt: Date;
  downloads: number;
  publishedBy: string;
  buildInfo?: BuildInfo;
}

export interface ModuleManifest {
  name: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  author: string;
  license: string;
  keywords: string[];
  tags: string[];
  main: string;
  types?: string;
  exports?: Record<string, any>;
  engines?: {
    node?: string;
    npm?: string;
  };
  os?: string[];
  cpu?: string[];
  plataforma?: {
    minVersion: string;
    maxVersion?: string;
    permissions?: string[];
    features?: string[];
    hooks?: ModuleHook[];
    components?: ComponentInfo[];
    routes?: RouteInfo[];
    database?: DatabaseInfo;
    assets?: AssetInfo[];
  };
  scripts?: Record<string, string>;
  config?: any;
}

export interface SecurityIssue {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  type: 'vulnerability' | 'malware' | 'typosquatting' | 'deprecation';
  title: string;
  description: string;
  affectedVersions: string[];
  patchedVersions?: string[];
  cwe?: string;
  cvss?: number;
  references: string[];
  detectedAt: Date;
  fixedAt?: Date;
}

export interface CompatibilityInfo {
  platformaVersions: string[];
  nodeVersions: string[];
  osSupport: {
    windows: boolean;
    macos: boolean;
    linux: boolean;
  };
  browserSupport?: {
    chrome: string;
    firefox: string;
    safari: string;
    edge: string;
  };
}

export interface ModuleHook {
  name: string;
  type: 'lifecycle' | 'event' | 'filter';
  description: string;
  parameters?: Record<string, any>;
}

export interface ComponentInfo {
  name: string;
  path: string;
  type: 'page' | 'widget' | 'modal' | 'sidebar';
  description: string;
  props?: Record<string, any>;
}

export interface RouteInfo {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  component?: string;
  middleware?: string[];
  description: string;
}

export interface DatabaseInfo {
  migrations?: string[];
  schemas?: string[];
  seeds?: string[];
  models?: string[];
}

export interface AssetInfo {
  path: string;
  type: 'image' | 'font' | 'style' | 'script' | 'data';
  public: boolean;
  size?: number;
}

export interface BuildInfo {
  platform: string;
  nodeVersion: string;
  buildTime: Date;
  commitHash?: string;
  branch?: string;
  buildNumber?: string;
}

export interface ModuleRating {
  id: string;
  packageId: string;
  userId: string;
  version?: string;
  rating: number; // 1-5
  review?: string;
  helpful: number;
  reported: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleDownload {
  id: string;
  packageId: string;
  version: string;
  userId?: string;
  ip: string;
  userAgent: string;
  referrer?: string;
  country?: string;
  downloadedAt: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  github?: string;
  twitter?: string;
  isVerified: boolean;
  isActive: boolean;
  role: 'user' | 'publisher' | 'moderator' | 'admin';
  permissions: string[];
  packagesPublished: number;
  totalDownloads: number;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface RegistryConfig {
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  storage: {
    provider: 'local' | 's3' | 'gcs';
    bucket?: string;
    path?: string;
    accessKey?: string;
    secretKey?: string;
    region?: string;
  };
  security: {
    jwtSecret: string;
    bcryptRounds: number;
    maxFileSize: number;
    allowedMimeTypes: string[];
    scanUploads: boolean;
    quarantineTime: number;
  };
  search: {
    provider: 'postgres' | 'elasticsearch' | 'algolia';
    apiKey?: string;
    indexName?: string;
  };
  notifications: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    webhook?: string;
  };
}

export interface SearchQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  author?: string;
  license?: string;
  minRating?: number;
  minDownloads?: number;
  updatedSince?: Date;
  includePrerelease?: boolean;
  includeDeprecated?: boolean;
  sortBy?: 'relevance' | 'downloads' | 'rating' | 'updated' | 'created' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T = any> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
  query: SearchQuery;
  took: number; // milliseconds
  aggregations?: {
    categories: Record<string, number>;
    authors: Record<string, number>;
    licenses: Record<string, number>;
    tags: Record<string, number>;
  };
}

export interface RegistryStats {
  totalPackages: number;
  totalVersions: number;
  totalDownloads: number;
  totalUsers: number;
  packagesByCategory: Record<string, number>;
  downloadsToday: number;
  downloadsThisWeek: number;
  downloadsThisMonth: number;
  popularPackages: Array<{
    name: string;
    downloads: number;
  }>;
  recentPackages: Array<{
    name: string;
    version: string;
    publishedAt: Date;
  }>;
  topAuthors: Array<{
    username: string;
    packages: number;
    downloads: number;
  }>;
}

export interface PublishRequest {
  tarball: Buffer;
  manifest: ModuleManifest;
  tag: string;
  access: 'public' | 'private';
  dryRun?: boolean;
}

export interface PublishResponse {
  success: boolean;
  package: ModulePackage;
  version: ModuleVersion;
  url: string;
  downloadUrl: string;
  warnings?: string[];
  errors?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

// Webhook types
export interface WebhookPayload {
  event: 'package.published' | 'package.deprecated' | 'package.unpublished' | 'user.registered';
  timestamp: Date;
  data: any;
  signature: string;
}