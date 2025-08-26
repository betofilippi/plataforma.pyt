import fs from 'fs-extra';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import FormData from 'form-data';
import { ModuleConfig } from '../types';

export interface RegistryConfig {
  url: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export interface PublishOptions {
  tag?: string;
  access?: 'public' | 'private';
  dryRun?: boolean;
}

export interface PublishResult {
  success: boolean;
  version: string;
  registry: string;
  url: string;
  downloadUrl?: string;
  message?: string;
}

export interface ModuleSearchResult {
  name: string;
  version: string;
  displayName: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
}

export interface RegistryStats {
  totalModules: number;
  totalDownloads: number;
  categories: Record<string, number>;
  recentModules: ModuleSearchResult[];
}

export class ModuleRegistryClient {
  private config: RegistryConfig;
  
  constructor(registryUrl?: string, options: Partial<RegistryConfig> = {}) {
    this.config = {
      url: registryUrl || process.env.PLATAFORMA_REGISTRY_URL || 'https://registry.plataforma.app',
      apiKey: options.apiKey || process.env.PLATAFORMA_API_KEY,
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      ...options
    };
  }

  /**
   * Publish a module to the registry
   */
  async publishModule(tarballPath: string, options: PublishOptions = {}): Promise<PublishResult> {
    const { tag = 'latest', access = 'public', dryRun = false } = options;

    if (!await fs.pathExists(tarballPath)) {
      throw new Error(`Tarball not found: ${tarballPath}`);
    }

    // Read package info from tarball
    const packageInfo = await this.extractPackageInfo(tarballPath);
    
    if (dryRun) {
      return {
        success: true,
        version: packageInfo.version,
        registry: this.config.url,
        url: `${this.config.url}/${packageInfo.name}`,
        message: 'Dry run - would publish successfully'
      };
    }

    const formData = new FormData();
    formData.append('package', fs.createReadStream(tarballPath));
    formData.append('tag', tag);
    formData.append('access', access);
    
    if (packageInfo) {
      formData.append('metadata', JSON.stringify(packageInfo));
    }

    const response = await this.request('POST', '/api/v1/packages', {
      body: formData,
      headers: formData.getHeaders()
    });

    return {
      success: true,
      version: response.version,
      registry: this.config.url,
      url: response.url,
      downloadUrl: response.downloadUrl,
      message: response.message
    };
  }

  /**
   * Search for modules in the registry
   */
  async searchModules(query: string, options: {
    category?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'downloads' | 'updated';
  } = {}): Promise<{
    results: ModuleSearchResult[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams({
      q: query,
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
      sortBy: options.sortBy || 'downloads'
    });

    if (options.category) {
      params.append('category', options.category);
    }

    const response = await this.request('GET', `/api/v1/search?${params}`);
    return response;
  }

  /**
   * Get module details
   */
  async getModule(name: string, version?: string): Promise<ModuleSearchResult & {
    versions: string[];
    dependencies: Record<string, string>;
    readme?: string;
    manifest?: any;
  }> {
    const url = version 
      ? `/api/v1/packages/${name}/${version}`
      : `/api/v1/packages/${name}`;
    
    return await this.request('GET', url);
  }

  /**
   * Get module versions
   */
  async getModuleVersions(name: string): Promise<{
    versions: Array<{
      version: string;
      publishedAt: string;
      deprecated?: boolean;
      tag?: string;
    }>;
  }> {
    return await this.request('GET', `/api/v1/packages/${name}/versions`);
  }

  /**
   * Download module
   */
  async downloadModule(name: string, version: string, outputPath: string): Promise<void> {
    const url = `/api/v1/packages/${name}/${version}/download`;
    
    return new Promise((resolve, reject) => {
      const request = this.createHttpRequest('GET', url);
      
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }

        const writeStream = fs.createWriteStream(outputPath);
        response.pipe(writeStream);

        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      request.on('error', reject);
      request.end();
    });
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<RegistryStats> {
    return await this.request('GET', '/api/v1/stats');
  }

  /**
   * Check if module exists
   */
  async moduleExists(name: string, version?: string): Promise<boolean> {
    try {
      await this.getModule(name, version);
      return true;
    } catch (error) {
      if (error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Unpublish module version
   */
  async unpublishModule(name: string, version: string): Promise<void> {
    await this.request('DELETE', `/api/v1/packages/${name}/${version}`);
  }

  /**
   * Deprecate module version
   */
  async deprecateModule(name: string, version: string, message?: string): Promise<void> {
    await this.request('POST', `/api/v1/packages/${name}/${version}/deprecate`, {
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Get user's published modules
   */
  async getUserModules(): Promise<ModuleSearchResult[]> {
    return await this.request('GET', '/api/v1/user/packages');
  }

  /**
   * Check registry health
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
  }> {
    return await this.request('GET', '/api/v1/health');
  }

  /**
   * Make HTTP request to registry
   */
  private async request(
    method: string, 
    path: string, 
    options: {
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retries!; attempt++) {
      try {
        return await this.makeRequest(method, path, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on 4xx errors
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Wait before retry
        if (attempt < this.config.retries! - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError!;
  }

  private async makeRequest(
    method: string, 
    path: string, 
    options: {
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.config.url);
      const isHttps = url.protocol === 'https:';
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'User-Agent': 'Plataforma SDK',
          'Accept': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...options.headers
        },
        timeout: this.config.timeout
      };

      const httpModule = isHttps ? https : http;
      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = res.headers['content-type']?.includes('application/json')
              ? JSON.parse(data)
              : data;
            
            if (res.statusCode! >= 200 && res.statusCode! < 300) {
              resolve(parsed);
            } else {
              const error = new Error(parsed.message || `HTTP ${res.statusCode}`);
              (error as any).statusCode = res.statusCode;
              (error as any).response = parsed;
              reject(error);
            }
          } catch (parseError) {
            reject(new Error(`Invalid JSON response: ${parseError.message}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        if (options.body.pipe) {
          // FormData or stream
          options.body.pipe(req);
        } else {
          // String or Buffer
          req.write(options.body);
          req.end();
        }
      } else {
        req.end();
      }
    });
  }

  private createHttpRequest(method: string, path: string) {
    const url = new URL(path, this.config.url);
    const isHttps = url.protocol === 'https:';
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'Plataforma SDK',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    };

    const httpModule = isHttps ? https : http;
    return httpModule.request(requestOptions);
  }

  private async extractPackageInfo(tarballPath: string): Promise<any> {
    // For now, return null - would need to actually extract package.json from tarball
    // This would require a tar extraction library like 'tar' or 'node-tar'
    return null;
  }
}