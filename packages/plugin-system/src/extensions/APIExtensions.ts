import { EventEmitter } from 'eventemitter3';

/**
 * API Extension System
 * Manages plugin-provided API endpoints, middleware, and handlers
 */
export class APIExtensionManager extends EventEmitter {
  private endpoints = new Map<string, APIEndpointRegistry>();
  private middleware = new Map<string, MiddlewareRegistry>();
  private handlers = new Map<string, HandlerRegistry>();
  private interceptors = new Map<string, InterceptorRegistry>();

  constructor(private readonly options: APIExtensionOptions = {}) {
    super();
  }

  // API Endpoint Management

  /**
   * Register an API endpoint
   */
  registerEndpoint(
    pluginId: string,
    path: string,
    method: HTTPMethod,
    handler: APIHandler,
    options: EndpointOptions = {}
  ): void {
    const key = `${method}:${path}`;
    
    if (this.endpoints.has(key)) {
      throw new Error(`API endpoint '${key}' is already registered`);
    }

    const registration: APIEndpointRegistry = {
      pluginId,
      path,
      method,
      handler,
      options,
      registeredAt: new Date(),
      usageCount: 0,
      lastUsed: null
    };

    this.endpoints.set(key, registration);
    this.emit('endpoint:registered', { registration });
  }

  /**
   * Unregister an API endpoint
   */
  unregisterEndpoint(path: string, method: HTTPMethod): void {
    const key = `${method}:${path}`;
    const registration = this.endpoints.get(key);
    
    if (registration) {
      this.endpoints.delete(key);
      this.emit('endpoint:unregistered', { registration });
    }
  }

  /**
   * Handle API request
   */
  async handleRequest(
    path: string,
    method: HTTPMethod,
    request: APIRequest
  ): Promise<APIResponse> {
    const key = `${method}:${path}`;
    const registration = this.endpoints.get(key);
    
    if (!registration) {
      return {
        status: 404,
        data: { error: 'Endpoint not found' },
        headers: {}
      };
    }

    try {
      registration.usageCount++;
      registration.lastUsed = new Date();

      // Apply middleware
      const processedRequest = await this.applyMiddleware(request, registration);
      
      // Execute handler
      const startTime = Date.now();
      const response = await registration.handler(processedRequest);
      const endTime = Date.now();

      this.emit('endpoint:used', {
        endpoint: key,
        pluginId: registration.pluginId,
        executionTime: endTime - startTime,
        status: response.status
      });

      return response;
    } catch (error) {
      this.emit('endpoint:error', {
        endpoint: key,
        pluginId: registration.pluginId,
        error
      });

      return {
        status: 500,
        data: { error: 'Internal server error' },
        headers: {}
      };
    }
  }

  // Middleware Management

  /**
   * Register middleware
   */
  registerMiddleware(
    pluginId: string,
    name: string,
    middleware: APIMiddleware,
    options: MiddlewareOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.middleware.has(fullName)) {
      throw new Error(`Middleware '${fullName}' is already registered`);
    }

    const registration: MiddlewareRegistry = {
      pluginId,
      name,
      fullName,
      middleware,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.middleware.set(fullName, registration);
    this.emit('middleware:registered', { registration });
  }

  /**
   * Register request interceptor
   */
  registerInterceptor(
    pluginId: string,
    name: string,
    interceptor: APIInterceptor,
    options: InterceptorOptions = {}
  ): void {
    const fullName = `${pluginId}.${name}`;
    
    if (this.interceptors.has(fullName)) {
      throw new Error(`Interceptor '${fullName}' is already registered`);
    }

    const registration: InterceptorRegistry = {
      pluginId,
      name,
      fullName,
      interceptor,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.interceptors.set(fullName, registration);
    this.emit('interceptor:registered', { registration });
  }

  // Event Handler Management

  /**
   * Register event handler
   */
  registerHandler(
    pluginId: string,
    eventType: string,
    handler: EventHandler,
    options: HandlerOptions = {}
  ): void {
    const key = `${pluginId}.${eventType}`;
    
    if (this.handlers.has(key)) {
      throw new Error(`Handler '${key}' is already registered`);
    }

    const registration: HandlerRegistry = {
      pluginId,
      eventType,
      handler,
      options,
      registeredAt: new Date(),
      usageCount: 0
    };

    this.handlers.set(key, registration);
    this.emit('handler:registered', { registration });
  }

  /**
   * Trigger event handlers
   */
  async triggerHandlers(eventType: string, data: any): Promise<HandlerResult[]> {
    const results: HandlerResult[] = [];
    const matchingHandlers = Array.from(this.handlers.values())
      .filter(h => h.eventType === eventType);

    for (const registration of matchingHandlers) {
      try {
        registration.usageCount++;
        
        const startTime = Date.now();
        const result = await registration.handler(data);
        const endTime = Date.now();

        results.push({
          success: true,
          result,
          pluginId: registration.pluginId,
          executionTime: endTime - startTime
        });

        this.emit('handler:used', {
          eventType,
          pluginId: registration.pluginId,
          executionTime: endTime - startTime
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          pluginId: registration.pluginId
        });

        this.emit('handler:error', {
          eventType,
          pluginId: registration.pluginId,
          error
        });
      }
    }

    return results;
  }

  // Utility Methods

  /**
   * Get API documentation
   */
  getAPIDocumentation(): APIDocumentation {
    const endpoints: EndpointDoc[] = Array.from(this.endpoints.values()).map(reg => ({
      path: reg.path,
      method: reg.method,
      pluginId: reg.pluginId,
      description: reg.options.description,
      parameters: reg.options.parameters || [],
      responses: reg.options.responses || {},
      authentication: reg.options.requiresAuth || false,
      deprecated: reg.options.deprecated || false
    }));

    return {
      version: '1.0.0',
      endpoints,
      totalEndpoints: endpoints.length,
      pluginEndpoints: this.groupEndpointsByPlugin()
    };
  }

  /**
   * Get extension statistics
   */
  getExtensionStats(): APIExtensionStats {
    const pluginStats: Record<string, PluginAPIStats> = {};

    // Count by plugin
    for (const endpoint of this.endpoints.values()) {
      if (!pluginStats[endpoint.pluginId]) {
        pluginStats[endpoint.pluginId] = {
          endpoints: 0,
          middleware: 0,
          handlers: 0,
          interceptors: 0,
          totalUsage: 0
        };
      }
      pluginStats[endpoint.pluginId].endpoints++;
      pluginStats[endpoint.pluginId].totalUsage += endpoint.usageCount;
    }

    for (const middleware of this.middleware.values()) {
      if (!pluginStats[middleware.pluginId]) {
        pluginStats[middleware.pluginId] = {
          endpoints: 0,
          middleware: 0,
          handlers: 0,
          interceptors: 0,
          totalUsage: 0
        };
      }
      pluginStats[middleware.pluginId].middleware++;
      pluginStats[middleware.pluginId].totalUsage += middleware.usageCount;
    }

    for (const handler of this.handlers.values()) {
      if (!pluginStats[handler.pluginId]) {
        pluginStats[handler.pluginId] = {
          endpoints: 0,
          middleware: 0,
          handlers: 0,
          interceptors: 0,
          totalUsage: 0
        };
      }
      pluginStats[handler.pluginId].handlers++;
      pluginStats[handler.pluginId].totalUsage += handler.usageCount;
    }

    for (const interceptor of this.interceptors.values()) {
      if (!pluginStats[interceptor.pluginId]) {
        pluginStats[interceptor.pluginId] = {
          endpoints: 0,
          middleware: 0,
          handlers: 0,
          interceptors: 0,
          totalUsage: 0
        };
      }
      pluginStats[interceptor.pluginId].interceptors++;
      pluginStats[interceptor.pluginId].totalUsage += interceptor.usageCount;
    }

    return {
      totalEndpoints: this.endpoints.size,
      totalMiddleware: this.middleware.size,
      totalHandlers: this.handlers.size,
      totalInterceptors: this.interceptors.size,
      pluginStats
    };
  }

  /**
   * Clean up extensions for a plugin
   */
  cleanupPlugin(pluginId: string): void {
    // Remove endpoints
    const endpointsToRemove = Array.from(this.endpoints.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([key]) => key);
    
    endpointsToRemove.forEach(key => this.endpoints.delete(key));

    // Remove middleware
    const middlewareToRemove = Array.from(this.middleware.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    middlewareToRemove.forEach(name => this.middleware.delete(name));

    // Remove handlers
    const handlersToRemove = Array.from(this.handlers.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([key]) => key);
    
    handlersToRemove.forEach(key => this.handlers.delete(key));

    // Remove interceptors
    const interceptorsToRemove = Array.from(this.interceptors.entries())
      .filter(([, reg]) => reg.pluginId === pluginId)
      .map(([name]) => name);
    
    interceptorsToRemove.forEach(name => this.interceptors.delete(name));

    this.emit('plugin:cleanup', { pluginId });
  }

  // Private Methods

  private async applyMiddleware(request: APIRequest, endpoint: APIEndpointRegistry): Promise<APIRequest> {
    let processedRequest = { ...request };

    // Apply global middleware first
    const globalMiddleware = Array.from(this.middleware.values())
      .filter(m => m.options.global)
      .sort((a, b) => (a.options.priority || 0) - (b.options.priority || 0));

    for (const middleware of globalMiddleware) {
      try {
        middleware.usageCount++;
        processedRequest = await middleware.middleware(processedRequest);
      } catch (error) {
        this.emit('middleware:error', {
          middleware: middleware.fullName,
          pluginId: middleware.pluginId,
          error
        });
      }
    }

    // Apply endpoint-specific middleware
    if (endpoint.options.middleware) {
      for (const middlewareName of endpoint.options.middleware) {
        const middleware = this.middleware.get(middlewareName);
        if (middleware) {
          try {
            middleware.usageCount++;
            processedRequest = await middleware.middleware(processedRequest);
          } catch (error) {
            this.emit('middleware:error', {
              middleware: middlewareName,
              pluginId: middleware.pluginId,
              error
            });
          }
        }
      }
    }

    return processedRequest;
  }

  private groupEndpointsByPlugin(): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const endpoint of this.endpoints.values()) {
      groups[endpoint.pluginId] = (groups[endpoint.pluginId] || 0) + 1;
    }
    
    return groups;
  }
}

// Types and Interfaces

export interface APIExtensionOptions {
  maxConcurrentRequests?: number;
  requestTimeout?: number;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface APIRequest {
  path: string;
  method: HTTPMethod;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  user?: any;
  metadata?: Record<string, any>;
}

export interface APIResponse {
  status: number;
  data?: any;
  headers: Record<string, string>;
  metadata?: Record<string, any>;
}

export type APIHandler = (request: APIRequest) => Promise<APIResponse>;
export type APIMiddleware = (request: APIRequest) => Promise<APIRequest>;
export type APIInterceptor = (request: APIRequest, response: APIResponse) => Promise<APIResponse>;
export type EventHandler = (data: any) => Promise<any>;

export interface EndpointOptions {
  description?: string;
  parameters?: ParameterDoc[];
  responses?: Record<number, ResponseDoc>;
  requiresAuth?: boolean;
  permissions?: string[];
  rateLimit?: RateLimit;
  middleware?: string[];
  deprecated?: boolean;
}

export interface MiddlewareOptions {
  priority?: number;
  global?: boolean;
  description?: string;
}

export interface InterceptorOptions {
  priority?: number;
  description?: string;
}

export interface HandlerOptions {
  priority?: number;
  async?: boolean;
  description?: string;
}

export interface APIEndpointRegistry {
  pluginId: string;
  path: string;
  method: HTTPMethod;
  handler: APIHandler;
  options: EndpointOptions;
  registeredAt: Date;
  usageCount: number;
  lastUsed: Date | null;
}

export interface MiddlewareRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  middleware: APIMiddleware;
  options: MiddlewareOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface InterceptorRegistry {
  pluginId: string;
  name: string;
  fullName: string;
  interceptor: APIInterceptor;
  options: InterceptorOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface HandlerRegistry {
  pluginId: string;
  eventType: string;
  handler: EventHandler;
  options: HandlerOptions;
  registeredAt: Date;
  usageCount: number;
}

export interface HandlerResult {
  success: boolean;
  result?: any;
  error?: string;
  pluginId: string;
  executionTime?: number;
}

export interface RateLimit {
  maxRequests: number;
  windowMs: number;
}

export interface ParameterDoc {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ResponseDoc {
  description: string;
  schema?: any;
}

export interface EndpointDoc {
  path: string;
  method: HTTPMethod;
  pluginId: string;
  description?: string;
  parameters: ParameterDoc[];
  responses: Record<number, ResponseDoc>;
  authentication: boolean;
  deprecated: boolean;
}

export interface APIDocumentation {
  version: string;
  endpoints: EndpointDoc[];
  totalEndpoints: number;
  pluginEndpoints: Record<string, number>;
}

export interface PluginAPIStats {
  endpoints: number;
  middleware: number;
  handlers: number;
  interceptors: number;
  totalUsage: number;
}

export interface APIExtensionStats {
  totalEndpoints: number;
  totalMiddleware: number;
  totalHandlers: number;
  totalInterceptors: number;
  pluginStats: Record<string, PluginAPIStats>;
}