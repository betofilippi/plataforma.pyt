import { 
  SandboxConfig, 
  ModuleSandboxContext, 
  ResourceLimits, 
  NetworkPolicy, 
  SandboxViolationError,
  SecurityError 
} from '../types/index.js';

export class ModuleSandbox {
  private config: SandboxConfig;
  private moduleContexts: Map<string, ModuleSandboxContext> = new Map();
  private resourceUsage: Map<string, ResourceUsage> = new Map();
  
  constructor(config: SandboxConfig) {
    this.config = config;
    this.startResourceMonitoring();
  }

  /**
   * Create sandbox context for a module
   */
  public createModuleContext(
    moduleId: string,
    moduleName: string,
    moduleVersion: string,
    config: Partial<ModuleSandboxContext> = {}
  ): ModuleSandboxContext {
    const context: ModuleSandboxContext = {
      moduleId,
      moduleName,
      moduleVersion,
      allowedResources: config.allowedResources || [],
      resourceLimits: { ...this.config.resourceLimits, ...config.resourceLimits },
      networkPolicy: { ...this.config.networkPolicy, ...config.networkPolicy },
      permissions: config.permissions || []
    };

    this.moduleContexts.set(moduleId, context);
    this.initializeResourceTracking(moduleId);

    return context;
  }

  /**
   * Initialize resource tracking for a module
   */
  private initializeResourceTracking(moduleId: string): void {
    this.resourceUsage.set(moduleId, {
      memoryUsage: 0,
      cpuTime: 0,
      networkRequests: 0,
      lastReset: Date.now()
    });
  }

  /**
   * Validate network request against sandbox policy
   */
  public validateNetworkRequest(moduleId: string, url: string, method: string = 'GET'): {
    allowed: boolean;
    reason?: string;
  } {
    const context = this.moduleContexts.get(moduleId);
    if (!context) {
      return { allowed: false, reason: 'Module context not found' };
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const port = parseInt(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80);

      // Check if HTTPS is required
      if (context.networkPolicy.requireHttps && urlObj.protocol !== 'https:') {
        return { allowed: false, reason: 'HTTPS required for all network requests' };
      }

      // Check allowed hosts
      if (context.networkPolicy.allowedHosts.length > 0) {
        const isAllowed = context.networkPolicy.allowedHosts.some(host => {
          if (host.startsWith('*.')) {
            const domain = host.substring(2);
            return hostname.endsWith(domain);
          }
          return hostname === host;
        });

        if (!isAllowed) {
          return { allowed: false, reason: `Host ${hostname} not in allowed hosts list` };
        }
      }

      // Check blocked hosts
      if (context.networkPolicy.blockedHosts.length > 0) {
        const isBlocked = context.networkPolicy.blockedHosts.some(host => {
          if (host.startsWith('*.')) {
            const domain = host.substring(2);
            return hostname.endsWith(domain);
          }
          return hostname === host;
        });

        if (isBlocked) {
          return { allowed: false, reason: `Host ${hostname} is blocked` };
        }
      }

      // Check allowed ports
      if (context.networkPolicy.allowedPorts.length > 0) {
        if (!context.networkPolicy.allowedPorts.includes(port)) {
          return { allowed: false, reason: `Port ${port} not allowed` };
        }
      }

      // Check resource limits
      const usage = this.resourceUsage.get(moduleId);
      if (usage && usage.networkRequests >= context.resourceLimits.maxNetworkRequests) {
        return { allowed: false, reason: 'Network request limit exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      return { allowed: false, reason: 'Invalid URL format' };
    }
  }

  /**
   * Track network request for a module
   */
  public trackNetworkRequest(moduleId: string, url: string, size: number): void {
    const usage = this.resourceUsage.get(moduleId);
    if (usage) {
      usage.networkRequests++;
      // Track data usage if needed
    }
  }

  /**
   * Validate resource access
   */
  public validateResourceAccess(
    moduleId: string, 
    resourceType: string, 
    resourcePath: string
  ): { allowed: boolean; reason?: string } {
    const context = this.moduleContexts.get(moduleId);
    if (!context) {
      return { allowed: false, reason: 'Module context not found' };
    }

    // Check if resource type is allowed
    if (!context.allowedResources.includes(resourceType) && 
        !context.allowedResources.includes('*')) {
      return { 
        allowed: false, 
        reason: `Resource type '${resourceType}' not allowed for module ${moduleId}` 
      };
    }

    // Validate path patterns
    const allowedPatterns = this.getAllowedPatternsForResource(resourceType);
    if (allowedPatterns.length > 0) {
      const isPathAllowed = allowedPatterns.some(pattern => 
        this.matchesPattern(resourcePath, pattern)
      );
      
      if (!isPathAllowed) {
        return { 
          allowed: false, 
          reason: `Resource path '${resourcePath}' not allowed` 
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if module has specific permission
   */
  public hasPermission(moduleId: string, permission: string): boolean {
    const context = this.moduleContexts.get(moduleId);
    return context ? context.permissions.includes(permission) : false;
  }

  /**
   * Execute code in sandbox environment
   */
  public async executeInSandbox<T>(
    moduleId: string,
    code: () => Promise<T>,
    options: {
      timeout?: number;
      memoryLimit?: number;
    } = {}
  ): Promise<T> {
    const context = this.moduleContexts.get(moduleId);
    if (!context) {
      throw new SandboxViolationError(`Module context not found: ${moduleId}`);
    }

    const timeout = options.timeout || context.resourceLimits.maxCpuTime;
    const memoryLimit = options.memoryLimit || context.resourceLimits.maxMemory;

    // Check current resource usage
    const usage = this.resourceUsage.get(moduleId);
    if (usage) {
      if (usage.memoryUsage > memoryLimit * 1024 * 1024) {
        throw new SandboxViolationError(`Memory limit exceeded for module ${moduleId}`);
      }

      if (usage.cpuTime > context.resourceLimits.maxCpuTime) {
        throw new SandboxViolationError(`CPU time limit exceeded for module ${moduleId}`);
      }
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Execute with timeout
      const result = await Promise.race([
        code(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new SandboxViolationError(`Execution timeout for module ${moduleId}`));
          }, timeout);
        })
      ]);

      // Track resource usage
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      if (usage) {
        usage.cpuTime += endTime - startTime;
        usage.memoryUsage = Math.max(usage.memoryUsage, endMemory - startMemory);
      }

      return result;
    } catch (error) {
      // Track failed execution
      const endTime = Date.now();
      if (usage) {
        usage.cpuTime += endTime - startTime;
      }
      throw error;
    }
  }

  /**
   * Create secure execution environment
   */
  public createSecureEnvironment(moduleId: string): object {
    const context = this.moduleContexts.get(moduleId);
    if (!context) {
      throw new SandboxViolationError(`Module context not found: ${moduleId}`);
    }

    const secureEnv = {
      // Safe console
      console: {
        log: (...args: any[]) => console.log(`[${moduleId}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${moduleId}]`, ...args),
        error: (...args: any[]) => console.error(`[${moduleId}]`, ...args),
      },

      // Limited fetch
      fetch: async (url: string, options?: any) => {
        const validation = this.validateNetworkRequest(moduleId, url, options?.method);
        if (!validation.allowed) {
          throw new SandboxViolationError(validation.reason || 'Network request not allowed');
        }
        
        this.trackNetworkRequest(moduleId, url, 0);
        return fetch(url, options);
      },

      // Module info
      module: {
        id: context.moduleId,
        name: context.moduleName,
        version: context.moduleVersion
      },

      // Utility functions
      utils: {
        hasPermission: (permission: string) => this.hasPermission(moduleId, permission),
        validateResource: (type: string, path: string) => 
          this.validateResourceAccess(moduleId, type, path)
      }
    };

    return secureEnv;
  }

  /**
   * Cleanup module sandbox
   */
  public cleanupModule(moduleId: string): void {
    this.moduleContexts.delete(moduleId);
    this.resourceUsage.delete(moduleId);
  }

  /**
   * Get module resource usage statistics
   */
  public getResourceUsage(moduleId: string): ResourceUsage | null {
    return this.resourceUsage.get(moduleId) || null;
  }

  /**
   * Reset resource usage counters for a module
   */
  public resetResourceUsage(moduleId: string): void {
    const usage = this.resourceUsage.get(moduleId);
    if (usage) {
      usage.memoryUsage = 0;
      usage.cpuTime = 0;
      usage.networkRequests = 0;
      usage.lastReset = Date.now();
    }
  }

  /**
   * Get all active module contexts
   */
  public getActiveModules(): string[] {
    return Array.from(this.moduleContexts.keys());
  }

  /**
   * Update module permissions
   */
  public updateModulePermissions(moduleId: string, permissions: string[]): void {
    const context = this.moduleContexts.get(moduleId);
    if (context) {
      context.permissions = permissions;
    }
  }

  /**
   * Validate if pattern matches path
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Get allowed patterns for resource type
   */
  private getAllowedPatternsForResource(resourceType: string): string[] {
    // Define allowed patterns based on resource type
    const patterns: Record<string, string[]> = {
      'file': ['/modules/**', '/public/**'],
      'api': ['/api/**'],
      'database': ['/db/**'],
      'storage': ['/storage/**']
    };

    return patterns[resourceType] || [];
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.resourceUsage.forEach((usage, moduleId) => {
        const context = this.moduleContexts.get(moduleId);
        if (context) {
          // Check for resource limit violations
          if (usage.memoryUsage > context.resourceLimits.maxMemory * 1024 * 1024) {
            console.warn(`Module ${moduleId} exceeded memory limit`);
          }
          
          if (usage.cpuTime > context.resourceLimits.maxCpuTime) {
            console.warn(`Module ${moduleId} exceeded CPU time limit`);
          }

          if (usage.networkRequests > context.resourceLimits.maxNetworkRequests) {
            console.warn(`Module ${moduleId} exceeded network request limit`);
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }
}

interface ResourceUsage {
  memoryUsage: number;
  cpuTime: number;
  networkRequests: number;
  lastReset: number;
}