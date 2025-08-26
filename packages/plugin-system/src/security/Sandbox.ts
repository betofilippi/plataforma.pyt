/**
 * Enhanced Sandbox Security Layer
 * Provides additional security controls and monitoring beyond the core PluginSandbox
 */

import { EventEmitter } from 'eventemitter3';
import type { PluginManifest, SecurityLevel } from '../types';

/**
 * Security Policy Engine
 * Evaluates and enforces security policies for plugin execution
 */
export class SecurityPolicyEngine extends EventEmitter {
  private policies = new Map<string, SecurityPolicy>();
  private violations = new Map<string, SecurityViolation[]>();
  private whitelists = new Map<string, Set<string>>();
  private blacklists = new Map<string, Set<string>>();

  constructor(private readonly options: SecurityPolicyOptions = {}) {
    super();
    this.initializeDefaultPolicies();
  }

  /**
   * Add security policy
   */
  addPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy:added', { policy });
  }

  /**
   * Remove security policy
   */
  removePolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      this.policies.delete(policyId);
      this.emit('policy:removed', { policy });
    }
  }

  /**
   * Evaluate security for plugin operation
   */
  evaluateOperation(
    pluginId: string,
    operation: SecurityOperation
  ): SecurityEvaluation {
    const evaluation: SecurityEvaluation = {
      allowed: true,
      riskLevel: 'low',
      warnings: [],
      restrictions: []
    };

    // Check each policy
    for (const policy of this.policies.values()) {
      if (!policy.applies(pluginId, operation)) {
        continue;
      }

      const policyResult = policy.evaluate(pluginId, operation);
      
      if (!policyResult.allowed) {
        evaluation.allowed = false;
        evaluation.riskLevel = this.combineRiskLevels(evaluation.riskLevel, policyResult.riskLevel);
        evaluation.warnings.push(...policyResult.warnings);
        evaluation.restrictions.push(...policyResult.restrictions);
        
        this.recordViolation(pluginId, {
          type: 'policy_violation',
          policyId: policy.id,
          operation,
          timestamp: new Date(),
          severity: policyResult.riskLevel
        });
      }
    }

    // Check whitelists and blacklists
    this.checkAccessLists(pluginId, operation, evaluation);

    return evaluation;
  }

  /**
   * Record security violation
   */
  recordViolation(pluginId: string, violation: SecurityViolation): void {
    if (!this.violations.has(pluginId)) {
      this.violations.set(pluginId, []);
    }
    
    const pluginViolations = this.violations.get(pluginId)!;
    pluginViolations.push(violation);
    
    // Keep only recent violations
    const maxViolations = this.options.maxViolationsPerPlugin || 100;
    if (pluginViolations.length > maxViolations) {
      pluginViolations.splice(0, pluginViolations.length - maxViolations);
    }
    
    this.emit('violation:recorded', { pluginId, violation });
    
    // Auto-disable plugin if too many violations
    if (this.shouldDisablePlugin(pluginId)) {
      this.emit('plugin:disable:required', { pluginId, reason: 'excessive_violations' });
    }
  }

  /**
   * Get security violations for a plugin
   */
  getViolations(pluginId: string): SecurityViolation[] {
    return this.violations.get(pluginId) || [];
  }

  /**
   * Clear violations for a plugin
   */
  clearViolations(pluginId: string): void {
    this.violations.delete(pluginId);
    this.emit('violations:cleared', { pluginId });
  }

  /**
   * Add URL to whitelist
   */
  addToWhitelist(pluginId: string, url: string): void {
    if (!this.whitelists.has(pluginId)) {
      this.whitelists.set(pluginId, new Set());
    }
    this.whitelists.get(pluginId)!.add(url);
  }

  /**
   * Add URL to blacklist
   */
  addToBlacklist(pluginId: string, url: string): void {
    if (!this.blacklists.has(pluginId)) {
      this.blacklists.set(pluginId, new Set());
    }
    this.blacklists.get(pluginId)!.add(url);
  }

  /**
   * Get security report for plugin
   */
  getSecurityReport(pluginId: string): SecurityReport {
    const violations = this.getViolations(pluginId);
    const whitelist = this.whitelists.get(pluginId) || new Set();
    const blacklist = this.blacklists.get(pluginId) || new Set();

    return {
      pluginId,
      totalViolations: violations.length,
      violationsByType: this.groupViolationsByType(violations),
      violationsBySeverity: this.groupViolationsBySeverity(violations),
      whitelistedUrls: Array.from(whitelist),
      blacklistedUrls: Array.from(blacklist),
      riskLevel: this.calculatePluginRiskLevel(pluginId),
      recommendedActions: this.getRecommendedActions(pluginId)
    };
  }

  // Private Methods

  private initializeDefaultPolicies(): void {
    // Network Access Policy
    this.addPolicy({
      id: 'network_access',
      name: 'Network Access Control',
      description: 'Controls network access for plugins',
      applies: (pluginId, operation) => operation.type === 'network_request',
      evaluate: (pluginId, operation) => {
        const url = operation.data?.url;
        if (!url) {
          return {
            allowed: false,
            riskLevel: 'high',
            warnings: ['Network request without URL'],
            restrictions: ['url_required']
          };
        }

        // Check for suspicious URLs
        if (this.isSuspiciousUrl(url)) {
          return {
            allowed: false,
            riskLevel: 'critical',
            warnings: [`Suspicious URL detected: ${url}`],
            restrictions: ['suspicious_url']
          };
        }

        return {
          allowed: true,
          riskLevel: 'low',
          warnings: [],
          restrictions: []
        };
      }
    });

    // Data Access Policy
    this.addPolicy({
      id: 'data_access',
      name: 'Database Access Control',
      description: 'Controls database access for plugins',
      applies: (pluginId, operation) => operation.type === 'database_query',
      evaluate: (pluginId, operation) => {
        const sql = operation.data?.sql;
        if (!sql) {
          return {
            allowed: false,
            riskLevel: 'high',
            warnings: ['Database query without SQL'],
            restrictions: ['sql_required']
          };
        }

        // Check for dangerous SQL patterns
        if (this.isDangerousSQL(sql)) {
          return {
            allowed: false,
            riskLevel: 'critical',
            warnings: [`Dangerous SQL detected: ${sql}`],
            restrictions: ['dangerous_sql']
          };
        }

        return {
          allowed: true,
          riskLevel: 'medium',
          warnings: [],
          restrictions: []
        };
      }
    });

    // File System Policy
    this.addPolicy({
      id: 'filesystem_access',
      name: 'File System Access Control',
      description: 'Controls file system access for plugins',
      applies: (pluginId, operation) => operation.type === 'file_operation',
      evaluate: (pluginId, operation) => {
        const path = operation.data?.path;
        if (!path) {
          return {
            allowed: false,
            riskLevel: 'high',
            warnings: ['File operation without path'],
            restrictions: ['path_required']
          };
        }

        // Check for path traversal attempts
        if (this.hasPathTraversal(path)) {
          return {
            allowed: false,
            riskLevel: 'critical',
            warnings: [`Path traversal detected: ${path}`],
            restrictions: ['path_traversal']
          };
        }

        return {
          allowed: true,
          riskLevel: 'medium',
          warnings: [],
          restrictions: []
        };
      }
    });

    // Code Execution Policy
    this.addPolicy({
      id: 'code_execution',
      name: 'Code Execution Control',
      description: 'Controls dynamic code execution',
      applies: (pluginId, operation) => operation.type === 'code_execution',
      evaluate: (pluginId, operation) => {
        const code = operation.data?.code;
        if (!code) {
          return {
            allowed: false,
            riskLevel: 'high',
            warnings: ['Code execution without code'],
            restrictions: ['code_required']
          };
        }

        // Check for dangerous patterns
        if (this.hasDangerousPatterns(code)) {
          return {
            allowed: false,
            riskLevel: 'critical',
            warnings: [`Dangerous code patterns detected`],
            restrictions: ['dangerous_patterns']
          };
        }

        return {
          allowed: true,
          riskLevel: 'high',
          warnings: ['Dynamic code execution is inherently risky'],
          restrictions: ['sandbox_required']
        };
      }
    });
  }

  private checkAccessLists(
    pluginId: string,
    operation: SecurityOperation,
    evaluation: SecurityEvaluation
  ): void {
    if (operation.type === 'network_request') {
      const url = operation.data?.url;
      if (url) {
        const whitelist = this.whitelists.get(pluginId);
        const blacklist = this.blacklists.get(pluginId);

        if (blacklist?.has(url)) {
          evaluation.allowed = false;
          evaluation.restrictions.push('blacklisted_url');
        }

        if (whitelist && whitelist.size > 0 && !whitelist.has(url)) {
          evaluation.allowed = false;
          evaluation.restrictions.push('not_whitelisted');
        }
      }
    }
  }

  private isSuspiciousUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domains
      const suspiciousDomains = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        'internal',
        'admin'
      ];
      
      if (suspiciousDomains.some(domain => urlObj.hostname.includes(domain))) {
        return true;
      }
      
      // Check for non-standard ports
      if (urlObj.port && !['80', '443', '8080', '8443'].includes(urlObj.port)) {
        return true;
      }
      
      return false;
    } catch {
      return true; // Invalid URL is suspicious
    }
  }

  private isDangerousSQL(sql: string): boolean {
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /TRUNCATE/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /EXEC/i,
      /EXECUTE/i,
      /UNION.*SELECT/i,
      /;.*--/i, // SQL injection patterns
      /\/\*.*\*\//i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(sql));
  }

  private hasPathTraversal(path: string): boolean {
    return path.includes('..') || path.includes('~') || path.startsWith('/');
  }

  private hasDangerousPatterns(code: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(\s*['"]/i,
      /setInterval\s*\(\s*['"]/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /outerHTML\s*=/i,
      /execCommand/i,
      /XMLHttpRequest/i,
      /fetch\s*\(/i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(code));
  }

  private combineRiskLevels(current: RiskLevel, new_: RiskLevel): RiskLevel {
    const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(current);
    const newIndex = levels.indexOf(new_);
    return levels[Math.max(currentIndex, newIndex)];
  }

  private shouldDisablePlugin(pluginId: string): boolean {
    const violations = this.getViolations(pluginId);
    const recentViolations = violations.filter(
      v => Date.now() - v.timestamp.getTime() < 60000 // Last minute
    );
    
    return recentViolations.length >= (this.options.maxViolationsPerMinute || 5);
  }

  private groupViolationsByType(violations: SecurityViolation[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const violation of violations) {
      groups[violation.type] = (groups[violation.type] || 0) + 1;
    }
    return groups;
  }

  private groupViolationsBySeverity(violations: SecurityViolation[]): Record<RiskLevel, number> {
    const groups: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    for (const violation of violations) {
      groups[violation.severity]++;
    }
    
    return groups;
  }

  private calculatePluginRiskLevel(pluginId: string): RiskLevel {
    const violations = this.getViolations(pluginId);
    
    if (violations.some(v => v.severity === 'critical')) {
      return 'critical';
    }
    
    const highRiskCount = violations.filter(v => v.severity === 'high').length;
    if (highRiskCount >= 3) {
      return 'high';
    }
    
    const mediumRiskCount = violations.filter(v => v.severity === 'medium').length;
    if (mediumRiskCount >= 5) {
      return 'medium';
    }
    
    return 'low';
  }

  private getRecommendedActions(pluginId: string): string[] {
    const actions: string[] = [];
    const violations = this.getViolations(pluginId);
    const riskLevel = this.calculatePluginRiskLevel(pluginId);
    
    if (riskLevel === 'critical') {
      actions.push('Disable plugin immediately');
      actions.push('Review plugin source code');
    } else if (riskLevel === 'high') {
      actions.push('Increase monitoring');
      actions.push('Restrict plugin permissions');
    } else if (riskLevel === 'medium') {
      actions.push('Monitor plugin activity');
    }
    
    if (violations.length > 10) {
      actions.push('Clear old violations');
    }
    
    return actions;
  }
}

/**
 * Resource Monitor for Security
 * Monitors resource usage and detects anomalies
 */
export class SecurityResourceMonitor extends EventEmitter {
  private resourceUsage = new Map<string, ResourceUsageHistory>();
  private thresholds: ResourceThresholds;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(options: ResourceMonitorOptions = {}) {
    super();
    this.thresholds = {
      cpu: options.cpuThreshold || 50, // 50%
      memory: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
      networkRequests: options.networkThreshold || 100, // per minute
      ...options.customThresholds
    };
  }

  start(): void {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(() => {
      this.checkResourceUsage();
    }, 5000); // Check every 5 seconds
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  recordResourceUsage(pluginId: string, usage: ResourceUsage): void {
    if (!this.resourceUsage.has(pluginId)) {
      this.resourceUsage.set(pluginId, {
        history: [],
        maxSize: 100
      });
    }

    const history = this.resourceUsage.get(pluginId)!;
    history.history.push({
      ...usage,
      timestamp: new Date()
    });

    // Keep only recent history
    if (history.history.length > history.maxSize) {
      history.history = history.history.slice(-history.maxSize);
    }

    // Check for threshold violations
    this.checkThresholds(pluginId, usage);
  }

  getResourceUsage(pluginId: string): ResourceUsageHistory | undefined {
    return this.resourceUsage.get(pluginId);
  }

  getResourceStats(pluginId: string): ResourceStats | null {
    const history = this.resourceUsage.get(pluginId);
    if (!history || history.history.length === 0) {
      return null;
    }

    const recent = history.history.slice(-10); // Last 10 samples
    
    return {
      current: recent[recent.length - 1],
      average: {
        cpu: recent.reduce((sum, r) => sum + r.cpu, 0) / recent.length,
        memory: recent.reduce((sum, r) => sum + r.memory, 0) / recent.length,
        networkRequests: recent.reduce((sum, r) => sum + r.networkRequests, 0) / recent.length
      },
      peak: {
        cpu: Math.max(...recent.map(r => r.cpu)),
        memory: Math.max(...recent.map(r => r.memory)),
        networkRequests: Math.max(...recent.map(r => r.networkRequests))
      }
    };
  }

  private checkResourceUsage(): void {
    // In a real implementation, this would collect actual system metrics
    // For now, we just emit a monitoring event
    this.emit('monitoring:tick', { timestamp: new Date() });
  }

  private checkThresholds(pluginId: string, usage: ResourceUsage): void {
    const violations: string[] = [];

    if (usage.cpu > this.thresholds.cpu) {
      violations.push(`CPU usage ${usage.cpu}% exceeds threshold ${this.thresholds.cpu}%`);
    }

    if (usage.memory > this.thresholds.memory) {
      violations.push(`Memory usage ${usage.memory} bytes exceeds threshold ${this.thresholds.memory} bytes`);
    }

    if (usage.networkRequests > this.thresholds.networkRequests) {
      violations.push(`Network requests ${usage.networkRequests} exceeds threshold ${this.thresholds.networkRequests}`);
    }

    if (violations.length > 0) {
      this.emit('threshold:violated', { pluginId, violations, usage });
    }
  }
}

// Types and Interfaces

export interface SecurityPolicyOptions {
  maxViolationsPerPlugin?: number;
  maxViolationsPerMinute?: number;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  applies(pluginId: string, operation: SecurityOperation): boolean;
  evaluate(pluginId: string, operation: SecurityOperation): SecurityEvaluation;
}

export interface SecurityOperation {
  type: 'network_request' | 'database_query' | 'file_operation' | 'code_execution' | string;
  data?: any;
  timestamp?: Date;
}

export interface SecurityEvaluation {
  allowed: boolean;
  riskLevel: RiskLevel;
  warnings: string[];
  restrictions: string[];
}

export interface SecurityViolation {
  type: string;
  policyId?: string;
  operation: SecurityOperation;
  timestamp: Date;
  severity: RiskLevel;
}

export interface SecurityReport {
  pluginId: string;
  totalViolations: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<RiskLevel, number>;
  whitelistedUrls: string[];
  blacklistedUrls: string[];
  riskLevel: RiskLevel;
  recommendedActions: string[];
}

export interface ResourceMonitorOptions {
  cpuThreshold?: number;
  memoryThreshold?: number;
  networkThreshold?: number;
  customThresholds?: Record<string, number>;
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  networkRequests: number;
  timestamp?: Date;
}

export interface ResourceUsageHistory {
  history: (ResourceUsage & { timestamp: Date })[];
  maxSize: number;
}

export interface ResourceThresholds {
  cpu: number;
  memory: number;
  networkRequests: number;
  [key: string]: number;
}

export interface ResourceStats {
  current: ResourceUsage & { timestamp: Date };
  average: ResourceUsage;
  peak: ResourceUsage;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';