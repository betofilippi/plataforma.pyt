import { EventEmitter } from 'eventemitter3';

/**
 * Resource Limits Manager
 * Enforces CPU, memory, storage, and network limits for plugins
 */
export class ResourceLimitsManager extends EventEmitter {
  private pluginLimits = new Map<string, PluginResourceLimits>();
  private resourceUsage = new Map<string, PluginResourceUsage>();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private enforcementEnabled = true;

  constructor(private readonly options: ResourceLimitsOptions = {}) {
    super();
  }

  /**
   * Set resource limits for a plugin
   */
  setPluginLimits(pluginId: string, limits: PluginResourceLimits): void {
    this.pluginLimits.set(pluginId, { ...limits });
    this.emit('limits:set', { pluginId, limits });
  }

  /**
   * Get resource limits for a plugin
   */
  getPluginLimits(pluginId: string): PluginResourceLimits | undefined {
    return this.pluginLimits.get(pluginId);
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      this.monitorResourceUsage();
    }, this.options.monitoringInterval || 5000);

    this.emit('monitoring:started');
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.emit('monitoring:stopped');
    }
  }

  /**
   * Check if plugin can execute operation based on resource limits
   */
  canExecute(pluginId: string, operation: ResourceOperation): ResourceCheckResult {
    const limits = this.pluginLimits.get(pluginId);
    if (!limits) {
      return { allowed: true, reason: 'no_limits_set' };
    }

    const usage = this.resourceUsage.get(pluginId);
    if (!usage) {
      return { allowed: true, reason: 'no_usage_data' };
    }

    // Check CPU limit
    if (limits.cpu && usage.cpu.current > limits.cpu) {
      return {
        allowed: false,
        reason: 'cpu_limit_exceeded',
        details: `CPU usage ${usage.cpu.current}% exceeds limit ${limits.cpu}%`
      };
    }

    // Check memory limit
    if (limits.memory && usage.memory.current > limits.memory) {
      return {
        allowed: false,
        reason: 'memory_limit_exceeded',
        details: `Memory usage ${usage.memory.current} bytes exceeds limit ${limits.memory} bytes`
      };
    }

    // Check storage limit
    if (limits.storage && usage.storage.current > limits.storage) {
      return {
        allowed: false,
        reason: 'storage_limit_exceeded',
        details: `Storage usage ${usage.storage.current} bytes exceeds limit ${limits.storage} bytes`
      };
    }

    // Check network limit
    if (limits.networkRequests) {
      const networkUsagePerMinute = this.calculateNetworkUsagePerMinute(pluginId);
      if (networkUsagePerMinute > limits.networkRequests) {
        return {
          allowed: false,
          reason: 'network_limit_exceeded',
          details: `Network requests ${networkUsagePerMinute}/min exceeds limit ${limits.networkRequests}/min`
        };
      }
    }

    // Check execution time limit
    if (limits.executionTime && operation.type === 'code_execution') {
      const executionTime = usage.executionTime.current;
      if (executionTime > limits.executionTime) {
        return {
          allowed: false,
          reason: 'execution_time_exceeded',
          details: `Execution time ${executionTime}ms exceeds limit ${limits.executionTime}ms`
        };
      }
    }

    return { allowed: true, reason: 'within_limits' };
  }

  /**
   * Record resource usage for a plugin
   */
  recordUsage(pluginId: string, usage: Partial<ResourceUsageSnapshot>): void {
    if (!this.resourceUsage.has(pluginId)) {
      this.resourceUsage.set(pluginId, this.createEmptyUsage());
    }

    const current = this.resourceUsage.get(pluginId)!;
    const timestamp = new Date();

    // Update usage with provided values
    if (usage.cpu !== undefined) {
      current.cpu.current = usage.cpu;
      current.cpu.peak = Math.max(current.cpu.peak, usage.cpu);
      current.cpu.history.push({ value: usage.cpu, timestamp });
      this.trimHistory(current.cpu.history);
    }

    if (usage.memory !== undefined) {
      current.memory.current = usage.memory;
      current.memory.peak = Math.max(current.memory.peak, usage.memory);
      current.memory.history.push({ value: usage.memory, timestamp });
      this.trimHistory(current.memory.history);
    }

    if (usage.storage !== undefined) {
      current.storage.current = usage.storage;
      current.storage.peak = Math.max(current.storage.peak, usage.storage);
      current.storage.history.push({ value: usage.storage, timestamp });
      this.trimHistory(current.storage.history);
    }

    if (usage.networkRequests !== undefined) {
      current.networkRequests.current += usage.networkRequests;
      current.networkRequests.history.push({ value: usage.networkRequests, timestamp });
      this.trimHistory(current.networkRequests.history);
    }

    if (usage.executionTime !== undefined) {
      current.executionTime.current = usage.executionTime;
      current.executionTime.peak = Math.max(current.executionTime.peak, usage.executionTime);
      current.executionTime.history.push({ value: usage.executionTime, timestamp });
      this.trimHistory(current.executionTime.history);
    }

    current.lastUpdated = timestamp;

    // Check for limit violations
    this.checkLimitViolations(pluginId);
  }

  /**
   * Get current resource usage for a plugin
   */
  getUsage(pluginId: string): PluginResourceUsage | undefined {
    return this.resourceUsage.get(pluginId);
  }

  /**
   * Get resource usage statistics
   */
  getUsageStats(pluginId: string): ResourceUsageStats | null {
    const usage = this.resourceUsage.get(pluginId);
    if (!usage) return null;

    const limits = this.pluginLimits.get(pluginId);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      pluginId,
      current: {
        cpu: usage.cpu.current,
        memory: usage.memory.current,
        storage: usage.storage.current,
        networkRequests: this.calculateNetworkUsagePerMinute(pluginId),
        executionTime: usage.executionTime.current
      },
      limits: limits || null,
      utilization: limits ? {
        cpu: limits.cpu ? (usage.cpu.current / limits.cpu) * 100 : 0,
        memory: limits.memory ? (usage.memory.current / limits.memory) * 100 : 0,
        storage: limits.storage ? (usage.storage.current / limits.storage) * 100 : 0,
        networkRequests: limits.networkRequests ? 
          (this.calculateNetworkUsagePerMinute(pluginId) / limits.networkRequests) * 100 : 0
      } : null,
      trends: {
        cpu: this.calculateTrend(usage.cpu.history, oneHourAgo),
        memory: this.calculateTrend(usage.memory.history, oneHourAgo),
        storage: this.calculateTrend(usage.storage.history, oneHourAgo),
        networkRequests: this.calculateTrend(usage.networkRequests.history, oneHourAgo)
      }
    };
  }

  /**
   * Reset resource usage for a plugin
   */
  resetUsage(pluginId: string): void {
    this.resourceUsage.set(pluginId, this.createEmptyUsage());
    this.emit('usage:reset', { pluginId });
  }

  /**
   * Clean up resources for a plugin
   */
  cleanup(pluginId: string): void {
    this.pluginLimits.delete(pluginId);
    this.resourceUsage.delete(pluginId);
    this.emit('plugin:cleanup', { pluginId });
  }

  /**
   * Enable or disable limit enforcement
   */
  setEnforcement(enabled: boolean): void {
    this.enforcementEnabled = enabled;
    this.emit('enforcement:changed', { enabled });
  }

  /**
   * Get global resource statistics
   */
  getGlobalStats(): GlobalResourceStats {
    const stats: GlobalResourceStats = {
      totalPlugins: this.resourceUsage.size,
      totalLimits: this.pluginLimits.size,
      aggregate: {
        cpu: 0,
        memory: 0,
        storage: 0,
        networkRequests: 0
      },
      violations: {
        cpu: 0,
        memory: 0,
        storage: 0,
        networkRequests: 0
      }
    };

    for (const [pluginId, usage] of this.resourceUsage) {
      stats.aggregate.cpu += usage.cpu.current;
      stats.aggregate.memory += usage.memory.current;
      stats.aggregate.storage += usage.storage.current;
      stats.aggregate.networkRequests += this.calculateNetworkUsagePerMinute(pluginId);

      // Count violations
      const limits = this.pluginLimits.get(pluginId);
      if (limits) {
        if (limits.cpu && usage.cpu.current > limits.cpu) stats.violations.cpu++;
        if (limits.memory && usage.memory.current > limits.memory) stats.violations.memory++;
        if (limits.storage && usage.storage.current > limits.storage) stats.violations.storage++;
        if (limits.networkRequests && 
            this.calculateNetworkUsagePerMinute(pluginId) > limits.networkRequests) {
          stats.violations.networkRequests++;
        }
      }
    }

    return stats;
  }

  // Private Methods

  private monitorResourceUsage(): void {
    for (const [pluginId] of this.pluginLimits) {
      // In a real implementation, this would collect actual system metrics
      // For now, we just emit monitoring events
      this.emit('monitoring:tick', { pluginId, timestamp: new Date() });
    }
  }

  private checkLimitViolations(pluginId: string): void {
    if (!this.enforcementEnabled) return;

    const limits = this.pluginLimits.get(pluginId);
    const usage = this.resourceUsage.get(pluginId);
    
    if (!limits || !usage) return;

    const violations: LimitViolation[] = [];

    if (limits.cpu && usage.cpu.current > limits.cpu) {
      violations.push({
        type: 'cpu',
        current: usage.cpu.current,
        limit: limits.cpu,
        severity: this.calculateViolationSeverity(usage.cpu.current, limits.cpu)
      });
    }

    if (limits.memory && usage.memory.current > limits.memory) {
      violations.push({
        type: 'memory',
        current: usage.memory.current,
        limit: limits.memory,
        severity: this.calculateViolationSeverity(usage.memory.current, limits.memory)
      });
    }

    if (limits.storage && usage.storage.current > limits.storage) {
      violations.push({
        type: 'storage',
        current: usage.storage.current,
        limit: limits.storage,
        severity: this.calculateViolationSeverity(usage.storage.current, limits.storage)
      });
    }

    if (violations.length > 0) {
      this.emit('limits:violated', { pluginId, violations });

      // Auto-throttle or disable plugin for severe violations
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        this.emit('plugin:throttle:required', { pluginId, violations: criticalViolations });
      }
    }
  }

  private calculateNetworkUsagePerMinute(pluginId: string): number {
    const usage = this.resourceUsage.get(pluginId);
    if (!usage) return 0;

    const oneMinuteAgo = new Date(Date.now() - 60000);
    return usage.networkRequests.history
      .filter(h => h.timestamp >= oneMinuteAgo)
      .reduce((sum, h) => sum + h.value, 0);
  }

  private calculateTrend(history: ResourceHistoryEntry[], since: Date): 'up' | 'down' | 'stable' {
    const recentData = history.filter(h => h.timestamp >= since);
    if (recentData.length < 2) return 'stable';

    const first = recentData[0].value;
    const last = recentData[recentData.length - 1].value;
    const change = (last - first) / first * 100;

    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }

  private calculateViolationSeverity(current: number, limit: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = current / limit;
    
    if (ratio >= 2.0) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  private createEmptyUsage(): PluginResourceUsage {
    return {
      cpu: { current: 0, peak: 0, history: [] },
      memory: { current: 0, peak: 0, history: [] },
      storage: { current: 0, peak: 0, history: [] },
      networkRequests: { current: 0, peak: 0, history: [] },
      executionTime: { current: 0, peak: 0, history: [] },
      lastUpdated: new Date()
    };
  }

  private trimHistory(history: ResourceHistoryEntry[]): void {
    const maxEntries = this.options.maxHistoryEntries || 100;
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }
  }
}

// Types and Interfaces

export interface ResourceLimitsOptions {
  monitoringInterval?: number;
  maxHistoryEntries?: number;
  autoThrottleEnabled?: boolean;
}

export interface PluginResourceLimits {
  cpu?: number; // CPU percentage (0-100)
  memory?: number; // Memory in bytes
  storage?: number; // Storage in bytes
  networkRequests?: number; // Requests per minute
  executionTime?: number; // Max execution time in ms
}

export interface PluginResourceUsage {
  cpu: ResourceMetric;
  memory: ResourceMetric;
  storage: ResourceMetric;
  networkRequests: ResourceMetric;
  executionTime: ResourceMetric;
  lastUpdated: Date;
}

export interface ResourceMetric {
  current: number;
  peak: number;
  history: ResourceHistoryEntry[];
}

export interface ResourceHistoryEntry {
  value: number;
  timestamp: Date;
}

export interface ResourceOperation {
  type: 'network_request' | 'database_query' | 'code_execution' | 'file_operation';
  estimatedCost?: {
    cpu?: number;
    memory?: number;
    storage?: number;
  };
}

export interface ResourceCheckResult {
  allowed: boolean;
  reason: string;
  details?: string;
}

export interface ResourceUsageSnapshot {
  cpu: number;
  memory: number;
  storage: number;
  networkRequests: number;
  executionTime: number;
}

export interface ResourceUsageStats {
  pluginId: string;
  current: ResourceUsageSnapshot;
  limits: PluginResourceLimits | null;
  utilization: {
    cpu: number;
    memory: number;
    storage: number;
    networkRequests: number;
  } | null;
  trends: {
    cpu: 'up' | 'down' | 'stable';
    memory: 'up' | 'down' | 'stable';
    storage: 'up' | 'down' | 'stable';
    networkRequests: 'up' | 'down' | 'stable';
  };
}

export interface GlobalResourceStats {
  totalPlugins: number;
  totalLimits: number;
  aggregate: ResourceUsageSnapshot;
  violations: {
    cpu: number;
    memory: number;
    storage: number;
    networkRequests: number;
  };
}

export interface LimitViolation {
  type: keyof PluginResourceLimits;
  current: number;
  limit: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}