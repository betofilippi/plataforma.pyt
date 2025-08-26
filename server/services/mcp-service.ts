/**
 * MCP Service - Unified interface for all 52+ MCP services
 * Provides authentication, service discovery, error handling, and usage tracking
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import EventEmitter from 'events';

const execAsync = promisify(exec);

// Types
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface MCPServiceConfig {
  path: string;
  export: string;
  category: string;
  requiresAuth: boolean;
  authConfig?: {
    tokenType: 'bearer' | 'api_key' | 'oauth';
    envVariable: string;
    required: boolean;
  };
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  timeout?: number;
}

export interface MCPExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  service: string;
  tool: string;
  timestamp: Date;
  cost?: number;
  usage?: {
    tokensUsed?: number;
    requestCount: number;
  };
}

export interface MCPUsageStats {
  service: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  averageExecutionTime: number;
  lastUsed: Date;
  dailyUsage: Record<string, number>;
  monthlyUsage: Record<string, number>;
}

// Service configuration with categories and auth requirements
export const MCP_SERVICE_CONFIG: Record<string, MCPServiceConfig> = {
  // E-commerce & Pagamentos
  'asaas': {
    path: 'mcp-asaas/src/index.js',
    export: 'asaasTools',
    category: 'ecommerce',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'ASAAS_API_KEY',
      required: true
    },
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 1000 }
  },
  'bling': {
    path: 'mcp-bling-nxt/src/tools/bling.js',
    export: 'blingTools',
    category: 'ecommerce',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'BLING_API_KEY',
      required: true
    }
  },
  'bling-nihao': {
    path: 'mcp-bling-nihao/src/tools/bling.js',
    export: 'blingTools',
    category: 'ecommerce',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'BLING_NIHAO_API_KEY',
      required: true
    }
  },
  'bling-nxt': {
    path: 'mcp-bling-nxt/src/tools/bling.js',
    export: 'blingTools',
    category: 'ecommerce',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'BLING_NXT_API_KEY',
      required: true
    }
  },
  'mercadolivre': {
    path: 'mcp-mercadolivre/src/tools/mercadolivre.js',
    export: 'mercadolivreTools',
    category: 'ecommerce',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'MERCADOLIVRE_ACCESS_TOKEN',
      required: true
    }
  },
  'frenet': {
    path: 'mcp-frenet/src/tools/shipping-tools.js',
    export: 'shippingTools',
    category: 'shipping',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'FRENET_API_KEY',
      required: true
    }
  },

  // Redes Sociais
  'facebook': {
    path: 'mcp-facebook/src/tools/facebook.js',
    export: 'facebookTools',
    category: 'social',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'FACEBOOK_ACCESS_TOKEN',
      required: true
    }
  },
  'instagram': {
    path: 'mcp-instagram/src/tools/instagram.js',
    export: 'instagramTools',
    category: 'social',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'INSTAGRAM_ACCESS_TOKEN',
      required: true
    }
  },
  'linkedin': {
    path: 'mcp-linkedin/src/server.js',
    export: 'linkedinTools',
    category: 'social',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'LINKEDIN_ACCESS_TOKEN',
      required: true
    }
  },
  'twitter': {
    path: 'mcp-twitter/src/tools/twitter-tools.js',
    export: 'twitterTools',
    category: 'social',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'TWITTER_BEARER_TOKEN',
      required: true
    }
  },
  'tiktok': {
    path: 'mcp-tiktok/src/tools/tiktok-tools.js',
    export: 'tiktokTools',
    category: 'social',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'TIKTOK_API_KEY',
      required: true
    }
  },

  // Desenvolvimento
  'github': {
    path: 'mcp-github/src/tools/github.js',
    export: 'githubTools',
    category: 'development',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'GITHUB_TOKEN',
      required: true
    },
    rateLimit: { requestsPerMinute: 60, requestsPerHour: 5000 }
  },
  'git': {
    path: 'mcp-git/src/tools/git.js',
    export: 'gitTools',
    category: 'development',
    requiresAuth: false
  },
  'builder-io': {
    path: 'mcp-builder-io/src/tools/content-tools.js',
    export: 'contentTools',
    category: 'development',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'BUILDER_IO_API_KEY',
      required: true
    }
  },
  'netlify': {
    path: 'mcp-netlify/src/index.js',
    export: 'netlifyTools',
    category: 'hosting',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'NETLIFY_ACCESS_TOKEN',
      required: true
    }
  },
  'portainer': {
    path: 'mcp-portainer/src/tools/portainer.js',
    export: 'portainerTools',
    category: 'devops',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'PORTAINER_API_KEY',
      required: true
    }
  },
  'hetzner': {
    path: 'mcp-hetzner/src/tools/hetzner.js',
    export: 'hetznerTools',
    category: 'hosting',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'HETZNER_API_TOKEN',
      required: true
    }
  },

  // Bancos de Dados & Armazenamento
  'supabase': {
    path: 'mcp-supabase/src/tools/supabase.js',
    export: 'supabaseTools',
    category: 'database',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'SUPABASE_ANON_KEY',
      required: true
    }
  },
  'nocodb': {
    path: 'mcp-nocodb/src/tools/nocodb.js',
    export: 'nocodbTools',
    category: 'database',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'NOCODB_API_TOKEN',
      required: true
    }
  },
  'dropbox': {
    path: 'mcp-dropbox/src/server.js',
    export: 'TOOLS',
    category: 'storage',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'DROPBOX_ACCESS_TOKEN',
      required: true
    }
  },
  'onedrive': {
    path: 'mcp-onedrive/src/tools/onedrive-tools.js',
    export: 'onedriveTools',
    category: 'storage',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'ONEDRIVE_ACCESS_TOKEN',
      required: true
    }
  },

  // IA e Processamento
  'openai': {
    path: 'mcp-openai/src/tools/chat-completions.js',
    export: 'chatCompletionsTools',
    category: 'ai',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'OPENAI_API_KEY',
      required: true
    },
    rateLimit: { requestsPerMinute: 20, requestsPerHour: 200 }
  },
  'mistral': {
    path: 'mcp-mistral/src/index.js',
    export: 'mistralTools',
    category: 'ai',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'MISTRAL_API_KEY',
      required: true
    }
  },
  'cerebra': {
    path: 'mcp-cerebra/build/index.js',
    export: 'cerebraTools',
    category: 'ai',
    requiresAuth: false
  },
  'claude-code': {
    path: 'mcp-claude-code/src/index.js',
    export: 'claudeCodeTools',
    category: 'ai',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'ANTHROPIC_API_KEY',
      required: true
    }
  },
  'thinking': {
    path: 'mcp-thinking/src/tools/thinking.js',
    export: 'thinkingTools',
    category: 'ai',
    requiresAuth: false
  },

  // Google Services
  'google': {
    path: 'mcp-google/src/tools/search-tools.js',
    export: 'searchTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'GOOGLE_API_KEY',
      required: true
    }
  },
  'google-calendar': {
    path: 'mcp-google/src/tools/calendar-tools.js',
    export: 'calendarTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'GOOGLE_ACCESS_TOKEN',
      required: true
    }
  },
  'google-drive': {
    path: 'mcp-google/src/tools/drive-tools.js',
    export: 'driveTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'GOOGLE_ACCESS_TOKEN',
      required: true
    }
  },
  'google-gmail': {
    path: 'mcp-google/src/tools/gmail-tools.js',
    export: 'gmailTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'GOOGLE_ACCESS_TOKEN',
      required: true
    }
  },
  'google-sheets': {
    path: 'mcp-google/src/tools/sheets-tools.js',
    export: 'sheetsTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'GOOGLE_ACCESS_TOKEN',
      required: true
    }
  },
  'google-docs': {
    path: 'mcp-google/src/tools/docs-tools.js',
    export: 'docsTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'GOOGLE_ACCESS_TOKEN',
      required: true
    }
  },
  'youtube': {
    path: 'mcp-youtube/src/tools/youtube-data-tools.js',
    export: 'youtubeDataTools',
    category: 'google',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'YOUTUBE_API_KEY',
      required: true
    }
  },

  // Comunicação
  'chatwoot': {
    path: 'mcp-chatwoot/src/tools/chatwoot.js',
    export: 'chatwootTools',
    category: 'communication',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'CHATWOOT_API_KEY',
      required: true
    }
  },
  'respond-io': {
    path: 'mcp-respond-io/src/index.js',
    export: 'respondIOTools',
    category: 'communication',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'RESPOND_IO_API_KEY',
      required: true
    }
  },
  'z-api': {
    path: 'mcp-z-api-business1-47992498881/src/index.js',
    export: 'zapiTools',
    category: 'whatsapp',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'ZAPI_TOKEN',
      required: true
    }
  },
  'zoho': {
    path: 'mcp-zoho/src/tools/zoho.js',
    export: 'zohoTools',
    category: 'crm',
    requiresAuth: true,
    authConfig: {
      tokenType: 'oauth',
      envVariable: 'ZOHO_ACCESS_TOKEN',
      required: true
    }
  },

  // Domínios
  'godaddy': {
    path: 'mcp-godaddy/src/tools/godaddy.js',
    export: 'godaddyTools',
    category: 'domains',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'GODADDY_API_KEY',
      required: true
    }
  },
  'namecheap': {
    path: 'mcp-namecheap/src/server.js',
    export: 'namecheapTools',
    category: 'domains',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'NAMECHEAP_API_KEY',
      required: true
    }
  },

  // Música & Mídia
  'spotify': {
    path: 'mcp-spotify/src/tools/player-tools.js',
    export: 'playerTools',
    category: 'music',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'SPOTIFY_ACCESS_TOKEN',
      required: true
    }
  },
  'spotify-search': {
    path: 'mcp-spotify/src/tools/search-tools.js',
    export: 'searchTools',
    category: 'music',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'SPOTIFY_ACCESS_TOKEN',
      required: true
    }
  },
  'spotify-playlist': {
    path: 'mcp-spotify/src/tools/playlist-tools.js',
    export: 'playlistTools',
    category: 'music',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'SPOTIFY_ACCESS_TOKEN',
      required: true
    }
  },

  // PDF e Documentos
  'pdf4me': {
    path: 'mcp-pdf4me/src/tools/index.js',
    export: 'pdf4meTools',
    category: 'documents',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'PDF4ME_API_KEY',
      required: true
    }
  },
  'pdfco': {
    path: 'mcp-pdfco/src/tools/pdf-manipulation.js',
    export: 'pdfManipulationTools',
    category: 'documents',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'PDFCO_API_KEY',
      required: true
    }
  },

  // Imagens
  'photoroom': {
    path: 'mcp-photoroom/src/server.js',
    export: 'photoroomTools',
    category: 'images',
    requiresAuth: true,
    authConfig: {
      tokenType: 'bearer',
      envVariable: 'PHOTOROOM_API_KEY',
      required: true
    }
  },

  // Utilidades Brasil
  'hubdodesenvolvedor': {
    path: 'mcp-hubdodesenvolvedor/src/tools/cep-tools.js',
    export: 'cepTools',
    category: 'brasil',
    requiresAuth: false
  },
  'hubdodesenvolvedor-cnpj': {
    path: 'mcp-hubdodesenvolvedor/src/tools/cnpj-tools.js',
    export: 'cnpjTools',
    category: 'brasil',
    requiresAuth: false
  },
  'hubdodesenvolvedor-cpf': {
    path: 'mcp-hubdodesenvolvedor/src/tools/cpf-tools.js',
    export: 'cpfTools',
    category: 'brasil',
    requiresAuth: false
  },
  'reclame-aqui': {
    path: 'mcp-reclame-aqui/src/tools/moderation-tools.js',
    export: 'moderationTools',
    category: 'brasil',
    requiresAuth: true,
    authConfig: {
      tokenType: 'api_key',
      envVariable: 'RECLAME_AQUI_API_KEY',
      required: false
    }
  },

  // Outros
  'context7': {
    path: 'mcp-context7/src/index.js',
    export: 'contextTools',
    category: 'utilities',
    requiresAuth: false
  }
};

// Rate limiting tracking
const rateLimitTracker = new Map<string, {
  requests: number[];
  lastCleanup: Date;
}>();

// Usage statistics tracking
const usageStats = new Map<string, MCPUsageStats>();

export class MCPService extends EventEmitter {
  private mcpBasePath: string;

  constructor() {
    super();
    this.mcpBasePath = 'C:/Users/Beto/OneDrive - NXT Indústria e Comércio Ltda/dev/MCP';
  }

  /**
   * Get all available MCP services with their categories
   */
  public getServices(): Record<string, MCPServiceConfig & { available: boolean }> {
    const services: Record<string, MCPServiceConfig & { available: boolean }> = {};
    
    for (const [serviceName, config] of Object.entries(MCP_SERVICE_CONFIG)) {
      const fullPath = path.join(this.mcpBasePath, config.path);
      const available = fs.existsSync(fullPath);
      
      services[serviceName] = {
        ...config,
        available
      };
    }
    
    return services;
  }

  /**
   * Get services by category
   */
  public getServicesByCategory(category: string): string[] {
    return Object.entries(MCP_SERVICE_CONFIG)
      .filter(([, config]) => config.category === category)
      .map(([serviceName]) => serviceName);
  }

  /**
   * Get all available categories
   */
  public getCategories(): string[] {
    const categories = new Set<string>();
    Object.values(MCP_SERVICE_CONFIG).forEach(config => {
      categories.add(config.category);
    });
    return Array.from(categories).sort();
  }

  /**
   * Check authentication for a service
   */
  public checkAuthentication(serviceName: string): { 
    isAuthenticated: boolean; 
    missingCredentials?: string[];
    authType?: string;
  } {
    const config = MCP_SERVICE_CONFIG[serviceName];
    if (!config) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (!config.requiresAuth) {
      return { isAuthenticated: true };
    }

    const missingCredentials: string[] = [];
    
    if (config.authConfig) {
      const envValue = process.env[config.authConfig.envVariable];
      if (config.authConfig.required && !envValue) {
        missingCredentials.push(config.authConfig.envVariable);
      }
    }

    return {
      isAuthenticated: missingCredentials.length === 0,
      missingCredentials: missingCredentials.length > 0 ? missingCredentials : undefined,
      authType: config.authConfig?.tokenType
    };
  }

  /**
   * Check rate limits for a service
   */
  private checkRateLimit(serviceName: string): boolean {
    const config = MCP_SERVICE_CONFIG[serviceName];
    if (!config?.rateLimit) return true;

    const now = new Date();
    let tracker = rateLimitTracker.get(serviceName);
    
    if (!tracker) {
      tracker = { requests: [], lastCleanup: now };
      rateLimitTracker.set(serviceName, tracker);
    }

    // Clean old requests (older than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    if (now.getTime() - tracker.lastCleanup.getTime() > 5 * 60 * 1000) { // Clean every 5 minutes
      tracker.requests = tracker.requests.filter(timestamp => timestamp > oneHourAgo.getTime());
      tracker.lastCleanup = now;
    }

    // Check per-minute limit
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentRequests = tracker.requests.filter(timestamp => timestamp > oneMinuteAgo.getTime());
    
    if (recentRequests.length >= config.rateLimit.requestsPerMinute) {
      return false;
    }

    // Check per-hour limit
    if (tracker.requests.length >= config.rateLimit.requestsPerHour) {
      return false;
    }

    // Add current request
    tracker.requests.push(now.getTime());
    return true;
  }

  /**
   * Get tools for a specific service
   */
  public async getServiceTools(serviceName: string): Promise<MCPToolDefinition[]> {
    const config = MCP_SERVICE_CONFIG[serviceName];
    if (!config) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const fullPath = path.join(this.mcpBasePath, config.path);
    const fileUrl = `file:///${fullPath.replace(/\\/g, '/').replace(/ /g, '%20')}`;

    try {
      const module = await import(fileUrl);
      const tools = module[config.export] || module.default || module.tools;
      
      if (!tools) {
        throw new Error(`No tools found in service ${serviceName}`);
      }

      const toolsList = typeof tools === 'function' ? await tools() : tools;
      
      return toolsList.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema
      }));
    } catch (error) {
      throw new Error(`Failed to load tools for ${serviceName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a tool with retry logic and error handling
   */
  public async executeTool(
    serviceName: string, 
    toolName: string, 
    params: Record<string, any> = {},
    options: {
      timeout?: number;
      retries?: number;
      skipRateLimit?: boolean;
    } = {}
  ): Promise<MCPExecutionResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      // Validate service exists
      const config = MCP_SERVICE_CONFIG[serviceName];
      if (!config) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Check authentication
      const authCheck = this.checkAuthentication(serviceName);
      if (!authCheck.isAuthenticated) {
        throw new Error(`Authentication required for ${serviceName}. Missing: ${authCheck.missingCredentials?.join(', ')}`);
      }

      // Check rate limits
      if (!options.skipRateLimit && !this.checkRateLimit(serviceName)) {
        throw new Error(`Rate limit exceeded for ${serviceName}`);
      }

      // Execute with retries
      const maxRetries = options.retries ?? 3;
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.executeToolInternal(serviceName, toolName, params, options.timeout);
          const executionTime = Date.now() - startTime;

          // Update usage statistics
          this.updateUsageStats(serviceName, true, executionTime);

          // Emit success event
          this.emit('toolExecuted', {
            service: serviceName,
            tool: toolName,
            success: true,
            executionTime,
            timestamp
          });

          return {
            success: true,
            data: result,
            executionTime,
            service: serviceName,
            tool: toolName,
            timestamp,
            usage: {
              requestCount: 1
            }
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          // Don't retry on authentication or rate limit errors
          if (lastError.message.includes('Authentication') || lastError.message.includes('Rate limit')) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      // All retries failed
      const executionTime = Date.now() - startTime;
      this.updateUsageStats(serviceName, false, executionTime);

      // Emit error event
      this.emit('toolExecuted', {
        service: serviceName,
        tool: toolName,
        success: false,
        error: lastError?.message,
        executionTime,
        timestamp
      });

      return {
        success: false,
        error: lastError?.message || 'Execution failed after retries',
        executionTime,
        service: serviceName,
        tool: toolName,
        timestamp,
        usage: {
          requestCount: 1
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateUsageStats(serviceName, false, executionTime);

      return {
        success: false,
        error: errorMessage,
        executionTime,
        service: serviceName,
        tool: toolName,
        timestamp,
        usage: {
          requestCount: 1
        }
      };
    }
  }

  /**
   * Internal tool execution
   */
  private async executeToolInternal(
    serviceName: string, 
    toolName: string, 
    params: Record<string, any>,
    timeout?: number
  ): Promise<any> {
    const config = MCP_SERVICE_CONFIG[serviceName];
    const fullPath = path.join(this.mcpBasePath, config.path);
    const fileUrl = `file:///${fullPath.replace(/\\/g, '/').replace(/ /g, '%20')}`;

    const module = await import(fileUrl);
    const tools = module[config.export] || module.default || module.tools;
    
    if (!tools) {
      throw new Error(`No tools found in service ${serviceName}`);
    }

    const toolsList = typeof tools === 'function' ? await tools() : tools;
    const tool = toolsList.find((t: any) => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found in service ${serviceName}`);
    }

    // Execute with timeout
    const executeTimeout = timeout || config.timeout || 30000;
    
    return Promise.race([
      tool.execute(params),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tool execution timeout')), executeTimeout)
      )
    ]);
  }

  /**
   * Execute multiple tools in parallel
   */
  public async executeParallel(
    executions: Array<{
      service: string;
      tool: string;
      params?: Record<string, any>;
      timeout?: number;
    }>
  ): Promise<MCPExecutionResult[]> {
    const promises = executions.map(exec => 
      this.executeTool(exec.service, exec.tool, exec.params, { timeout: exec.timeout })
    );

    return Promise.all(promises);
  }

  /**
   * Execute tools in sequence with dependency handling
   */
  public async executeSequence(
    executions: Array<{
      service: string;
      tool: string;
      params?: Record<string, any> | ((previousResults: any[]) => Record<string, any>);
      timeout?: number;
    }>
  ): Promise<MCPExecutionResult[]> {
    const results: MCPExecutionResult[] = [];
    
    for (const exec of executions) {
      const params = typeof exec.params === 'function' 
        ? exec.params(results.map(r => r.data)) 
        : exec.params || {};
      
      const result = await this.executeTool(exec.service, exec.tool, params, { timeout: exec.timeout });
      results.push(result);
      
      // Stop on error if needed
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get usage statistics for a service
   */
  public getUsageStats(serviceName?: string): MCPUsageStats | Record<string, MCPUsageStats> {
    if (serviceName) {
      return usageStats.get(serviceName) || this.createEmptyUsageStats(serviceName);
    }
    
    const allStats: Record<string, MCPUsageStats> = {};
    for (const service of Object.keys(MCP_SERVICE_CONFIG)) {
      allStats[service] = usageStats.get(service) || this.createEmptyUsageStats(service);
    }
    
    return allStats;
  }

  /**
   * Reset usage statistics
   */
  public resetUsageStats(serviceName?: string): void {
    if (serviceName) {
      usageStats.delete(serviceName);
    } else {
      usageStats.clear();
    }
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(serviceName: string, success: boolean, executionTime: number): void {
    let stats = usageStats.get(serviceName);
    
    if (!stats) {
      stats = this.createEmptyUsageStats(serviceName);
      usageStats.set(serviceName, stats);
    }

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    
    stats.averageExecutionTime = (
      (stats.averageExecutionTime * (stats.totalRequests - 1) + executionTime) / 
      stats.totalRequests
    );
    
    stats.lastUsed = new Date();
    
    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    stats.dailyUsage[today] = (stats.dailyUsage[today] || 0) + 1;
    
    // Update monthly usage
    const thisMonth = today.substring(0, 7);
    stats.monthlyUsage[thisMonth] = (stats.monthlyUsage[thisMonth] || 0) + 1;
  }

  /**
   * Create empty usage statistics
   */
  private createEmptyUsageStats(serviceName: string): MCPUsageStats {
    return {
      service: serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalCost: 0,
      averageExecutionTime: 0,
      lastUsed: new Date(),
      dailyUsage: {},
      monthlyUsage: {}
    };
  }

  /**
   * Health check for all services
   */
  public async healthCheck(): Promise<Record<string, {
    available: boolean;
    authenticated: boolean;
    lastUsed?: Date;
    rateLimitStatus?: 'ok' | 'warning' | 'exceeded';
  }>> {
    const services = this.getServices();
    const healthStatus: Record<string, any> = {};

    for (const [serviceName, config] of Object.entries(services)) {
      const authCheck = this.checkAuthentication(serviceName);
      const rateLimitOk = this.checkRateLimit(serviceName);
      const stats = usageStats.get(serviceName);

      healthStatus[serviceName] = {
        available: config.available,
        authenticated: authCheck.isAuthenticated,
        lastUsed: stats?.lastUsed,
        rateLimitStatus: rateLimitOk ? 'ok' : 'exceeded'
      };
    }

    return healthStatus;
  }
}

// Export singleton instance
export const mcpService = new MCPService();
export default mcpService;