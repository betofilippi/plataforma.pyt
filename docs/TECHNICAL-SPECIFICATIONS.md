# ESPECIFICAÇÕES TÉCNICAS DETALHADAS - OS DISTRIBUÍDO

## 🔧 ARQUITETURAS DE COMPONENTES

### 🎯 Module Registry Architecture

#### **Registry Core Services**
```typescript
// registry-core/ModuleRegistry.ts
export class ModuleRegistry {
  private storage: RegistryStorage;
  private security: SecurityService;
  private analytics: AnalyticsService;
  private cdnManager: CDNManager;

  async publishModule(module: ModulePackage): Promise<PublishResult> {
    // 1. Security validation
    const securityScan = await this.security.scanModule(module);
    if (!securityScan.passed) {
      throw new SecurityError('Module failed security validation');
    }

    // 2. Dependency resolution
    const dependencies = await this.resolveDependencies(module.manifest.dependencies);
    
    // 3. Build and optimize
    const optimizedModule = await this.buildModule(module, dependencies);
    
    // 4. Store in registry
    const storageResult = await this.storage.store(optimizedModule);
    
    // 5. Distribute to CDN
    await this.cdnManager.distribute(optimizedModule, {
      regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      cachePolicy: 'aggressive'
    });
    
    // 6. Update search index
    await this.updateSearchIndex(module);
    
    return {
      success: true,
      moduleId: module.id,
      version: module.version,
      downloadUrl: storageResult.cdnUrl,
      publishedAt: new Date()
    };
  }
}

// Security validation service
export class SecurityService {
  async scanModule(module: ModulePackage): Promise<SecurityScanResult> {
    const scans = await Promise.all([
      this.staticAnalysis(module.code),
      this.dependencyAudit(module.manifest.dependencies),
      this.licenseCheck(module.manifest.license),
      this.malwareDetection(module.assets),
      this.performanceAnalysis(module)
    ]);

    return {
      passed: scans.every(scan => scan.passed),
      results: scans,
      riskLevel: this.calculateRiskLevel(scans),
      recommendations: this.generateRecommendations(scans)
    };
  }

  private async staticAnalysis(code: string): Promise<ScanResult> {
    // Use SonarQube API for static analysis
    const analysis = await this.sonarqube.analyze(code, {
      rules: ['security', 'reliability', 'maintainability'],
      threshold: 'A'  // Only accept high-quality code
    });

    return {
      passed: analysis.qualityGate === 'OK',
      issues: analysis.issues,
      metrics: analysis.metrics
    };
  }
}
```

#### **Module Distribution System**
```yaml
# Kubernetes deployment for registry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: module-registry
  namespace: registry
spec:
  replicas: 5
  selector:
    matchLabels:
      app: module-registry
  template:
    metadata:
      labels:
        app: module-registry
    spec:
      containers:
      - name: registry-api
        image: plataforma/registry:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: registry-db
              key: url
        - name: CDN_API_KEY
          valueFrom:
            secretKeyRef:
              name: cdn-credentials
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi" 
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# CDN distribution configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cdn-config
data:
  distribution.yaml: |
    regions:
      - name: us-east-1
        primary: true
        buckets:
          - s3://plataforma-modules-us-east
        cloudfront:
          distribution: E1234567890123
      - name: eu-west-1
        buckets:
          - s3://plataforma-modules-eu-west
        cloudfront:
          distribution: E2345678901234
      - name: ap-southeast-1
        buckets:
          - s3://plataforma-modules-ap-southeast
        cloudfront:
          distribution: E3456789012345
    
    cache-policies:
      modules:
        default-ttl: 86400      # 24 hours
        max-ttl: 31536000       # 1 year
        compress: true
        gzip: true
        brotli: true
```

### 🧩 Module SDK Framework

#### **Core SDK Implementation**
```typescript
// sdk/core/ModuleFramework.ts
export abstract class ModuleFramework {
  protected windowManager: WindowManager;
  protected apiClient: ApiClient;
  protected eventBus: EventBus;
  protected permissions: PermissionManager;

  constructor(context: ModuleContext) {
    this.windowManager = new WindowManager(context.containerId);
    this.apiClient = new ApiClient(context.apiConfig);
    this.eventBus = EventBus.getInstance();
    this.permissions = new PermissionManager(context.permissions);
  }

  // Abstract methods that modules must implement
  abstract onLoad(): Promise<void>;
  abstract onUnload(): Promise<void>;
  abstract render(): React.ReactElement;
  
  // Utility methods available to all modules
  protected createWindow(config: WindowConfig): Window {
    this.permissions.requirePermission('window.create');
    return this.windowManager.create({
      ...config,
      moduleId: this.moduleId,
      permissions: this.permissions.getGrantedPermissions()
    });
  }

  protected async apiCall<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    this.permissions.requirePermission(`api.${endpoint.split('/')[1]}`);
    return this.apiClient.request<T>(endpoint, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Module-ID': this.moduleId,
        'X-Module-Version': this.moduleVersion
      }
    });
  }

  protected emit(event: string, data?: any): void {
    this.eventBus.emit(`module.${this.moduleId}.${event}`, data);
  }

  protected subscribe(event: string, handler: EventHandler): void {
    this.permissions.requirePermission('events.subscribe');
    this.eventBus.subscribe(event, handler);
  }
}

// Example module implementation
export class VendasModule extends ModuleFramework {
  private vendasState: VendasState;

  async onLoad(): Promise<void> {
    // Initialize module state
    this.vendasState = await this.loadInitialState();
    
    // Subscribe to relevant events
    this.subscribe('user.login', this.handleUserLogin.bind(this));
    this.subscribe('data.vendas.updated', this.handleDataUpdate.bind(this));
    
    // Register module-specific API endpoints
    this.registerEndpoints();
  }

  render(): React.ReactElement {
    return (
      <VendasProvider state={this.vendasState}>
        <WindowCard title="Vendas">
          <VendasDashboard />
          <VendasTable />
          <VendasCharts />
        </WindowCard>
      </VendasProvider>
    );
  }

  private async loadInitialState(): Promise<VendasState> {
    const [clientes, produtos, vendas] = await Promise.all([
      this.apiCall<Cliente[]>('/vendas/clientes'),
      this.apiCall<Produto[]>('/vendas/produtos'),
      this.apiCall<Venda[]>('/vendas/vendas')
    ]);

    return { clientes, produtos, vendas };
  }
}
```

#### **Permission System**
```typescript
// sdk/security/PermissionManager.ts
export class PermissionManager {
  private grantedPermissions: Set<string>;
  private requestedPermissions: Map<string, PermissionRequest>;

  constructor(permissions: Permission[]) {
    this.grantedPermissions = new Set(permissions.map(p => p.name));
    this.requestedPermissions = new Map();
  }

  requirePermission(permission: string): void {
    if (!this.hasPermission(permission)) {
      throw new PermissionDeniedError(
        `Module does not have permission: ${permission}`
      );
    }
  }

  async requestPermission(permission: string, reason?: string): Promise<boolean> {
    if (this.hasPermission(permission)) {
      return true;
    }

    const request: PermissionRequest = {
      permission,
      reason,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.requestedPermissions.set(permission, request);

    // Show permission dialog to user
    const granted = await this.showPermissionDialog(request);
    
    if (granted) {
      this.grantedPermissions.add(permission);
      request.status = 'granted';
    } else {
      request.status = 'denied';
    }

    return granted;
  }

  private hasPermission(permission: string): boolean {
    // Support wildcard permissions
    for (const granted of this.grantedPermissions) {
      if (this.matchesPermission(granted, permission)) {
        return true;
      }
    }
    return false;
  }

  private matchesPermission(granted: string, required: string): boolean {
    // Exact match
    if (granted === required) return true;
    
    // Wildcard match (e.g., "api.*" matches "api.vendas.read")
    if (granted.endsWith('*')) {
      const prefix = granted.slice(0, -1);
      return required.startsWith(prefix);
    }
    
    return false;
  }
}

// Permission definitions
export const PERMISSIONS = {
  // Data access
  DATABASE_READ: 'database.read',
  DATABASE_WRITE: 'database.write',
  
  // API access  
  API_EXTERNAL: 'api.external',
  API_INTERNAL: 'api.internal',
  
  // UI capabilities
  WINDOW_CREATE: 'window.create',
  WINDOW_MODAL: 'window.modal',
  
  // System integration
  NOTIFICATIONS: 'system.notifications',
  STORAGE: 'system.storage',
  CLIPBOARD: 'system.clipboard',
  
  // Inter-module communication
  EVENTS_EMIT: 'events.emit',
  EVENTS_SUBSCRIBE: 'events.subscribe'
} as const;
```

### 🔒 Security Architecture

#### **Module Sandboxing System**
```typescript
// security/ModuleSandbox.ts
export class ModuleSandbox {
  private worker: Worker;
  private permissions: PermissionSet;
  private resourceLimits: ResourceLimits;
  private apiProxy: ApiProxy;

  constructor(moduleCode: string, permissions: PermissionSet) {
    this.permissions = permissions;
    this.resourceLimits = this.calculateResourceLimits(permissions);
    this.apiProxy = new ApiProxy(permissions);
    
    // Create sandboxed Web Worker
    this.worker = this.createSandboxedWorker(moduleCode);
  }

  private createSandboxedWorker(code: string): Worker {
    // Wrap module code in security envelope
    const sandboxedCode = this.wrapInSandbox(code);
    
    // Create worker from blob to prevent network access
    const blob = new Blob([sandboxedCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    // Set up communication channel
    worker.onmessage = this.handleWorkerMessage.bind(this);
    worker.onerror = this.handleWorkerError.bind(this);

    // Monitor resource usage
    this.startResourceMonitoring(worker);

    return worker;
  }

  private wrapInSandbox(code: string): string {
    return `
      // Security envelope for module execution
      (function() {
        'use strict';
        
        // Disable dangerous globals
        const originalEval = eval;
        const originalFunction = Function;
        
        // Override dangerous functions
        eval = function() { 
          throw new Error('eval is not allowed in modules'); 
        };
        Function = function() { 
          throw new Error('Function constructor is not allowed'); 
        };
        
        // Provide safe API surface
        const moduleAPI = {
          // Only provide APIs that the module has permission for
          ${this.generateAPICode()}
        };
        
        // Execute module code with limited globals
        (function(api) {
          ${code}
        })(moduleAPI);
        
        // Restore original functions (not accessible to module)
        eval = originalEval;
        Function = originalFunction;
      })();
    `;
  }

  private generateAPICode(): string {
    const allowedAPIs = [];
    
    if (this.permissions.has('window.create')) {
      allowedAPIs.push('createWindow: this.createWindow.bind(this)');
    }
    
    if (this.permissions.has('database.read')) {
      allowedAPIs.push('queryDatabase: this.queryDatabase.bind(this)');
    }
    
    // Add more APIs based on permissions...
    
    return allowedAPIs.join(',\n        ');
  }

  private async handleWorkerMessage(event: MessageEvent): Promise<void> {
    const { type, id, method, args } = event.data;
    
    try {
      // Rate limiting
      await this.checkRateLimit(method);
      
      // Permission check
      this.checkPermission(method);
      
      // Resource usage check
      this.checkResourceUsage();
      
      // Execute API call through proxy
      const result = await this.apiProxy.call(method, args);
      
      // Send result back to worker
      this.worker.postMessage({
        type: 'response',
        id,
        result
      });
      
    } catch (error) {
      this.worker.postMessage({
        type: 'error',
        id,
        error: error.message
      });
    }
  }
}

// Resource monitoring
interface ResourceLimits {
  maxMemory: number;      // bytes
  maxCpuTime: number;     // milliseconds per second
  maxNetworkReqs: number; // requests per minute
  maxStorageSize: number; // bytes
}

class ResourceMonitor {
  private limits: ResourceLimits;
  private usage: ResourceUsage = {
    memory: 0,
    cpuTime: 0,
    networkReqs: 0,
    storageSize: 0
  };

  constructor(limits: ResourceLimits) {
    this.limits = limits;
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.checkMemoryUsage();
      this.checkCpuUsage();
      this.checkNetworkUsage();
      this.checkStorageUsage();
    }, 1000);
  }

  private checkMemoryUsage(): void {
    if (performance.memory) {
      this.usage.memory = performance.memory.usedJSHeapSize;
      
      if (this.usage.memory > this.limits.maxMemory) {
        throw new ResourceLimitError('Memory limit exceeded');
      }
    }
  }
}
```

### 🌐 CDN & Distribution System

#### **Multi-Region Distribution**
```typescript
// distribution/CDNManager.ts
export class CDNManager {
  private providers: CDNProvider[];
  private loadBalancer: LoadBalancer;
  private cacheManager: CacheManager;

  constructor(config: CDNConfig) {
    this.providers = [
      new CloudFrontProvider(config.aws),
      new CloudflareProvider(config.cloudflare),
      new KeyCDNProvider(config.keycdn) // Fallback
    ];
    
    this.loadBalancer = new LoadBalancer(this.providers);
    this.cacheManager = new CacheManager(config.cache);
  }

  async distributeModule(module: ModulePackage): Promise<DistributionResult> {
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];
    
    // Parallel distribution to all regions
    const distributions = await Promise.allSettled(
      regions.map(region => this.distributeToRegion(module, region))
    );

    // Calculate optimal cache settings
    const cachePolicy = this.calculateCachePolicy(module);
    
    // Update CDN configurations
    await this.updateCDNConfigs(module, cachePolicy);
    
    return {
      success: distributions.every(d => d.status === 'fulfilled'),
      regions: distributions.map((d, i) => ({
        region: regions[i],
        status: d.status,
        url: d.status === 'fulfilled' ? d.value.url : null
      })),
      cachePolicy
    };
  }

  private async distributeToRegion(
    module: ModulePackage, 
    region: string
  ): Promise<RegionDistribution> {
    // Choose optimal provider for region
    const provider = this.selectProviderForRegion(region);
    
    // Upload module assets
    const uploadResults = await Promise.all([
      provider.upload(`${module.id}/${module.version}/bundle.js`, module.bundle),
      provider.upload(`${module.id}/${module.version}/styles.css`, module.styles),
      provider.upload(`${module.id}/${module.version}/assets/`, module.assets),
      provider.upload(`${module.id}/${module.version}/manifest.json`, module.manifest)
    ]);

    // Set up edge functions for module loading
    await provider.deployEdgeFunction(
      `module-${module.id}`,
      this.createModuleLoader(module)
    );

    return {
      provider: provider.name,
      region,
      url: uploadResults[0].url,
      uploadTime: Date.now()
    };
  }

  private calculateCachePolicy(module: ModulePackage): CachePolicy {
    return {
      // Static assets cache for 1 year
      assets: {
        ttl: 31536000,
        vary: ['Accept-Encoding'],
        compress: true
      },
      
      // Module code cache for 1 day (for updates)
      code: {
        ttl: 86400,
        vary: ['Accept-Encoding', 'User-Agent'],
        compress: true,
        // Invalidate on version change
        tags: [`module:${module.id}:${module.version}`]
      },
      
      // Manifest cache for 1 hour (metadata changes)
      manifest: {
        ttl: 3600,
        vary: ['Accept-Language'],
        tags: [`manifest:${module.id}`]
      }
    };
  }

  // Edge function for module loading optimization
  private createModuleLoader(module: ModulePackage): string {
    return `
      addEventListener('fetch', event => {
        event.respondWith(handleRequest(event.request));
      });

      async function handleRequest(request) {
        const url = new URL(request.url);
        const userAgent = request.headers.get('User-Agent');
        
        // Device detection for optimized loading
        const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
        const supportsESModules = /Chrome\/(6[1-9]|[7-9]\d)/.test(userAgent);
        
        // Choose optimal bundle
        let bundlePath;
        if (isMobile) {
          bundlePath = '${module.id}/${module.version}/bundle.mobile.js';
        } else if (supportsESModules) {
          bundlePath = '${module.id}/${module.version}/bundle.esm.js';
        } else {
          bundlePath = '${module.id}/${module.version}/bundle.legacy.js';
        }
        
        // Fetch from origin with caching
        const response = await fetch(bundlePath, {
          cf: {
            cacheEverything: true,
            cacheTtl: 86400,
            minify: {
              javascript: true,
              css: true,
              html: true
            }
          }
        });
        
        // Add performance headers
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, max-age=86400, s-maxage=31536000');
        headers.set('Vary', 'Accept-Encoding, User-Agent');
        headers.set('X-Module-Version', '${module.version}');
        
        return new Response(response.body, {
          status: response.status,
          headers
        });
      }
    `;
  }
}
```

### 📊 Analytics & Monitoring

#### **Real-Time Analytics System**
```typescript
// analytics/AnalyticsCollector.ts
export class AnalyticsCollector {
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor(private storage: AnalyticsStorage) {
    this.startBatchProcessor();
  }

  // Module usage tracking
  trackModuleLoad(moduleId: string, version: string, loadTime: number): void {
    this.enqueue({
      type: 'module.load',
      moduleId,
      version,
      timestamp: Date.now(),
      data: { loadTime },
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      location: this.getGeoLocation()
    });
  }

  trackModuleError(moduleId: string, error: Error): void {
    this.enqueue({
      type: 'module.error',
      moduleId,
      timestamp: Date.now(),
      data: {
        message: error.message,
        stack: error.stack,
        url: window.location.href
      },
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    });
  }

  trackAPICall(endpoint: string, duration: number, status: number): void {
    this.enqueue({
      type: 'api.call',
      timestamp: Date.now(),
      data: {
        endpoint,
        duration,
        status,
        method: 'GET' // or extracted from context
      },
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    });
  }

  // Business metrics tracking
  trackBusinessEvent(event: string, properties: Record<string, any>): void {
    this.enqueue({
      type: 'business.event',
      event,
      timestamp: Date.now(),
      data: properties,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    });
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents(true); // Synchronous flush
    });
  }

  private async flushEvents(synchronous = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.batchSize);
    
    const payload = {
      events: batch,
      batchId: this.generateBatchId(),
      timestamp: Date.now()
    };

    if (synchronous) {
      // Use sendBeacon for reliable delivery
      navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
    } else {
      try {
        await this.storage.storeBatch(payload);
      } catch (error) {
        console.error('Failed to store analytics batch:', error);
        // Re-queue events for retry
        this.eventQueue.unshift(...batch);
      }
    }
  }
}

// Real-time dashboard data
export class DashboardMetrics {
  private metricsCache = new Map<string, any>();
  private websocket: WebSocket;

  constructor(private analyticsAPI: AnalyticsAPI) {
    this.connectWebSocket();
    this.startMetricsPolling();
  }

  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const cached = this.metricsCache.get('platform');
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }

    const metrics = await this.analyticsAPI.getPlatformMetrics({
      timeRange: '24h',
      granularity: '1h'
    });

    this.metricsCache.set('platform', {
      data: metrics,
      timestamp: Date.now()
    });

    return metrics;
  }

  async getModuleMetrics(moduleId: string): Promise<ModuleMetrics> {
    return this.analyticsAPI.getModuleMetrics(moduleId, {
      timeRange: '7d',
      metrics: [
        'downloads',
        'active_users', 
        'error_rate',
        'performance'
      ]
    });
  }

  subscribeToRealTimeMetrics(callback: (metrics: any) => void): void {
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics.update') {
        callback(data.metrics);
      }
    };
  }

  private connectWebSocket(): void {
    this.websocket = new WebSocket('wss://analytics.plataforma.app/realtime');
    
    this.websocket.onopen = () => {
      console.log('📊 Analytics WebSocket connected');
      
      // Subscribe to metric streams
      this.websocket.send(JSON.stringify({
        type: 'subscribe',
        streams: [
          'platform.performance',
          'modules.usage',
          'errors.realtime'
        ]
      }));
    };

    this.websocket.onclose = () => {
      console.log('📊 Analytics WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }
}
```

## 🚀 DEPLOYMENT AUTOMATION

### 🏗️ Infrastructure as Code

#### **Complete Terraform Configuration**
```hcl
# infrastructure/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "s3" {
    bucket = "plataforma-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
    
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

# Multi-region VPC setup
module "vpc" {
  source = "./modules/vpc"
  
  for_each = var.regions
  
  region = each.key
  cidr   = each.value.cidr
  
  availability_zones = each.value.azs
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_flow_logs   = true
  
  tags = {
    Environment = "production"
    Project     = "plataforma-app"
    Region      = each.key
  }
}

# EKS clusters
module "eks" {
  source = "./modules/eks"
  
  for_each = var.regions
  
  cluster_name    = "plataforma-${each.key}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc[each.key].vpc_id
  subnet_ids = module.vpc[each.key].private_subnets
  
  node_groups = {
    main = {
      instance_types = ["m5.xlarge"]
      scaling_config = {
        desired_size = 3
        max_size     = 10
        min_size     = 3
      }
      
      disk_size = 50
      
      labels = {
        role = "main"
      }
      
      taints = []
    }
    
    modules = {
      instance_types = ["c5.large"]
      scaling_config = {
        desired_size = 2
        max_size     = 20
        min_size     = 2
      }
      
      disk_size = 30
      
      labels = {
        role = "modules"
      }
      
      taints = [{
        key    = "workload"
        value  = "modules"
        effect = "NO_SCHEDULE"
      }]
    }
  }
  
  tags = {
    Environment = "production"
    Project     = "plataforma-app"
  }
}

# RDS (CockroachDB alternative for initial deployment)
resource "aws_db_subnet_group" "main" {
  name       = "plataforma-db-subnet-group"
  subnet_ids = module.vpc["us-east-1"].database_subnets

  tags = {
    Name = "Plataforma DB subnet group"
  }
}

resource "aws_db_instance" "main" {
  identifier = "plataforma-production"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  
  db_name  = "plataforma"
  username = "plataforma_admin"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  deletion_protection = true
  skip_final_snapshot = false
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  tags = {
    Environment = "production"
    Project     = "plataforma-app"
  }
}

# Redis clusters
resource "aws_elasticache_subnet_group" "main" {
  name       = "plataforma-cache-subnet"
  subnet_ids = module.vpc["us-east-1"].private_subnets
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "plataforma-redis"
  description               = "Redis cluster for plataforma.app"
  
  node_type = "cache.r6g.large"
  port      = 6379
  
  num_cache_clusters = 3
  
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  snapshot_retention_limit = 7
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Environment = "production"
    Project     = "plataforma-app"
  }
}
```

#### **Kubernetes Application Manifests**
```yaml
# k8s/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: plataforma-production
  labels:
    name: plataforma-production
    environment: production

---
# k8s/production/core-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: plataforma-core
  namespace: plataforma-production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: plataforma-core
  template:
    metadata:
      labels:
        app: plataforma-core
        version: stable
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: frontend
        image: plataforma/frontend:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 3001
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          value: "http://backend:4000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
          
      - name: backend
        image: plataforma/backend:latest
        ports:
        - containerPort: 4000
          name: http
        - containerPort: 4001
          name: metrics
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secrets
              key: secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5

---
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: plataforma-core-hpa
  namespace: plataforma-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: plataforma-core
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 15
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
      selectPolicy: Min
```

Este documento de especificações técnicas fornece a base completa para implementação do sistema distribuído, com foco em segurança, performance e escalabilidade.

**Status**: Especificações técnicas prontas para implementação  
**Próximo passo**: Início da implementação seguindo o cronograma estabelecido