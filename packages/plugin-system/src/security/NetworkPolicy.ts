import { EventEmitter } from 'eventemitter3';

/**
 * Network Policy Manager
 * Controls and monitors network access for plugins
 */
export class NetworkPolicyManager extends EventEmitter {
  private policies = new Map<string, NetworkPolicy>();
  private pluginPolicies = new Map<string, PluginNetworkPolicy>();
  private requestHistory = new Map<string, NetworkRequestHistory[]>();
  private blockedRequests = new Map<string, BlockedRequest[]>();

  constructor(private readonly options: NetworkPolicyOptions = {}) {
    super();
    this.initializeDefaultPolicies();
  }

  /**
   * Set network policy for a plugin
   */
  setPluginPolicy(pluginId: string, policy: PluginNetworkPolicy): void {
    this.pluginPolicies.set(pluginId, policy);
    this.emit('policy:set', { pluginId, policy });
  }

  /**
   * Check if network request is allowed
   */
  async checkNetworkRequest(
    pluginId: string,
    request: NetworkRequest
  ): Promise<NetworkRequestResult> {
    const policy = this.pluginPolicies.get(pluginId);
    if (!policy) {
      return {
        allowed: false,
        reason: 'no_policy_set',
        details: 'No network policy configured for plugin'
      };
    }

    // Check if network access is enabled
    if (!policy.allowNetworkAccess) {
      this.recordBlockedRequest(pluginId, request, 'network_disabled');
      return {
        allowed: false,
        reason: 'network_disabled',
        details: 'Network access is disabled for this plugin'
      };
    }

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(pluginId, policy.rateLimit);
    if (!rateLimitResult.allowed) {
      this.recordBlockedRequest(pluginId, request, 'rate_limit');
      return rateLimitResult;
    }

    // Check allowed domains
    if (policy.allowedDomains && policy.allowedDomains.length > 0) {
      const domainAllowed = this.checkAllowedDomains(request.url, policy.allowedDomains);
      if (!domainAllowed.allowed) {
        this.recordBlockedRequest(pluginId, request, 'domain_not_allowed');
        return domainAllowed;
      }
    }

    // Check blocked domains
    if (policy.blockedDomains && policy.blockedDomains.length > 0) {
      const domainBlocked = this.checkBlockedDomains(request.url, policy.blockedDomains);
      if (!domainBlocked.allowed) {
        this.recordBlockedRequest(pluginId, request, 'domain_blocked');
        return domainBlocked;
      }
    }

    // Check allowed protocols
    const protocolResult = this.checkProtocol(request.url, policy.allowedProtocols || ['https']);
    if (!protocolResult.allowed) {
      this.recordBlockedRequest(pluginId, request, 'protocol_not_allowed');
      return protocolResult;
    }

    // Check allowed ports
    if (policy.allowedPorts && policy.allowedPorts.length > 0) {
      const portResult = this.checkPort(request.url, policy.allowedPorts);
      if (!portResult.allowed) {
        this.recordBlockedRequest(pluginId, request, 'port_not_allowed');
        return portResult;
      }
    }

    // Check request size limits
    if (policy.maxRequestSize && request.bodySize > policy.maxRequestSize) {
      this.recordBlockedRequest(pluginId, request, 'request_too_large');
      return {
        allowed: false,
        reason: 'request_too_large',
        details: `Request size ${request.bodySize} exceeds limit ${policy.maxRequestSize}`
      };
    }

    // Apply global policies
    for (const globalPolicy of this.policies.values()) {
      const policyResult = await globalPolicy.evaluate(pluginId, request);
      if (!policyResult.allowed) {
        this.recordBlockedRequest(pluginId, request, policyResult.reason);
        return policyResult;
      }
    }

    // Record successful request
    this.recordRequest(pluginId, request);

    return {
      allowed: true,
      reason: 'policy_approved',
      details: 'Request approved by network policy'
    };
  }

  /**
   * Add global network policy
   */
  addGlobalPolicy(policy: NetworkPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('global_policy:added', { policy });
  }

  /**
   * Remove global network policy
   */
  removeGlobalPolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      this.policies.delete(policyId);
      this.emit('global_policy:removed', { policy });
    }
  }

  /**
   * Get network statistics for a plugin
   */
  getNetworkStats(pluginId: string): NetworkStats {
    const history = this.requestHistory.get(pluginId) || [];
    const blocked = this.blockedRequests.get(pluginId) || [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentHistory = history.filter(h => h.timestamp >= oneHourAgo);
    const recentBlocked = blocked.filter(b => b.timestamp >= oneHourAgo);

    return {
      pluginId,
      totalRequests: history.length,
      blockedRequests: blocked.length,
      successRate: history.length > 0 ? 
        ((history.length - blocked.length) / history.length) * 100 : 100,
      recentActivity: {
        lastHour: {
          requests: recentHistory.length,
          blocked: recentBlocked.length
        },
        lastDay: {
          requests: history.filter(h => h.timestamp >= oneDayAgo).length,
          blocked: blocked.filter(b => b.timestamp >= oneDayAgo).length
        }
      },
      topDomains: this.getTopDomains(history),
      blockReasons: this.getBlockReasons(blocked),
      bandwidth: {
        uploaded: history.reduce((sum, h) => sum + (h.bodySize || 0), 0),
        downloaded: history.reduce((sum, h) => sum + (h.responseSize || 0), 0)
      }
    };
  }

  /**
   * Get all blocked requests for a plugin
   */
  getBlockedRequests(pluginId: string, limit = 50): BlockedRequest[] {
    const blocked = this.blockedRequests.get(pluginId) || [];
    return blocked
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear history for a plugin
   */
  clearHistory(pluginId: string): void {
    this.requestHistory.delete(pluginId);
    this.blockedRequests.delete(pluginId);
    this.emit('history:cleared', { pluginId });
  }

  /**
   * Get global network statistics
   */
  getGlobalStats(): GlobalNetworkStats {
    const stats: GlobalNetworkStats = {
      totalPlugins: this.pluginPolicies.size,
      totalRequests: 0,
      totalBlocked: 0,
      topBlockReasons: {},
      bandwidth: { uploaded: 0, downloaded: 0 }
    };

    for (const [pluginId] of this.pluginPolicies) {
      const pluginStats = this.getNetworkStats(pluginId);
      stats.totalRequests += pluginStats.totalRequests;
      stats.totalBlocked += pluginStats.blockedRequests;
      stats.bandwidth.uploaded += pluginStats.bandwidth.uploaded;
      stats.bandwidth.downloaded += pluginStats.bandwidth.downloaded;

      // Aggregate block reasons
      for (const [reason, count] of Object.entries(pluginStats.blockReasons)) {
        stats.topBlockReasons[reason] = (stats.topBlockReasons[reason] || 0) + count;
      }
    }

    return stats;
  }

  // Private Methods

  private initializeDefaultPolicies(): void {
    // Malicious Domain Policy
    this.addGlobalPolicy({
      id: 'malicious_domains',
      name: 'Malicious Domain Blocker',
      description: 'Blocks requests to known malicious domains',
      evaluate: async (pluginId, request) => {
        const maliciousDomains = [
          'example-malware.com',
          'phishing-site.net',
          'malicious-tracker.org'
          // In real implementation, this would be a comprehensive list
        ];

        try {
          const url = new URL(request.url);
          const isDangerous = maliciousDomains.some(domain => 
            url.hostname.includes(domain)
          );

          if (isDangerous) {
            return {
              allowed: false,
              reason: 'malicious_domain',
              details: `Domain ${url.hostname} is flagged as malicious`
            };
          }
        } catch (error) {
          return {
            allowed: false,
            reason: 'invalid_url',
            details: 'Invalid URL format'
          };
        }

        return { allowed: true, reason: 'safe_domain' };
      }
    });

    // Local Network Protection Policy
    this.addGlobalPolicy({
      id: 'local_network_protection',
      name: 'Local Network Protection',
      description: 'Prevents access to local network addresses',
      evaluate: async (pluginId, request) => {
        try {
          const url = new URL(request.url);
          const hostname = url.hostname;

          // Check for local addresses
          const localPatterns = [
            /^localhost$/i,
            /^127\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^169\.254\./,
            /^::1$/,
            /^fe80:/i
          ];

          const isLocalAddress = localPatterns.some(pattern => 
            pattern.test(hostname)
          );

          if (isLocalAddress) {
            return {
              allowed: false,
              reason: 'local_network_blocked',
              details: `Access to local address ${hostname} is blocked`
            };
          }
        } catch (error) {
          return {
            allowed: false,
            reason: 'invalid_url',
            details: 'Invalid URL format'
          };
        }

        return { allowed: true, reason: 'public_address' };
      }
    });

    // Data Exfiltration Prevention
    this.addGlobalPolicy({
      id: 'data_exfiltration_prevention',
      name: 'Data Exfiltration Prevention',
      description: 'Detects and blocks potential data exfiltration',
      evaluate: async (pluginId, request) => {
        // Check for suspicious patterns in URL or body
        const suspiciousPatterns = [
          /password/i,
          /token/i,
          /api[_-]?key/i,
          /secret/i,
          /private[_-]?key/i
        ];

        const requestText = request.url + (request.body || '');
        const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
          pattern.test(requestText)
        );

        if (hasSuspiciousContent) {
          return {
            allowed: false,
            reason: 'potential_data_exfiltration',
            details: 'Request contains suspicious patterns that may indicate data exfiltration'
          };
        }

        return { allowed: true, reason: 'content_safe' };
      }
    });
  }

  private checkRateLimit(pluginId: string, rateLimit?: RateLimit): NetworkRequestResult {
    if (!rateLimit) {
      return { allowed: true, reason: 'no_rate_limit' };
    }

    const history = this.requestHistory.get(pluginId) || [];
    const now = new Date();
    const windowStart = new Date(now.getTime() - rateLimit.windowMs);
    
    const recentRequests = history.filter(h => h.timestamp >= windowStart);
    
    if (recentRequests.length >= rateLimit.maxRequests) {
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        details: `Rate limit of ${rateLimit.maxRequests} requests per ${rateLimit.windowMs}ms exceeded`
      };
    }

    return { allowed: true, reason: 'within_rate_limit' };
  }

  private checkAllowedDomains(url: string, allowedDomains: string[]): NetworkRequestResult {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      const isDomainAllowed = allowedDomains.some(domain => {
        if (domain.startsWith('*.')) {
          // Wildcard domain
          const baseDomain = domain.slice(2);
          return hostname.endsWith(baseDomain);
        }
        return hostname === domain;
      });

      if (!isDomainAllowed) {
        return {
          allowed: false,
          reason: 'domain_not_whitelisted',
          details: `Domain ${hostname} is not in the allowed domains list`
        };
      }

      return { allowed: true, reason: 'domain_allowed' };
    } catch (error) {
      return {
        allowed: false,
        reason: 'invalid_url',
        details: 'Invalid URL format'
      };
    }
  }

  private checkBlockedDomains(url: string, blockedDomains: string[]): NetworkRequestResult {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      const isDomainBlocked = blockedDomains.some(domain => {
        if (domain.startsWith('*.')) {
          // Wildcard domain
          const baseDomain = domain.slice(2);
          return hostname.endsWith(baseDomain);
        }
        return hostname === domain;
      });

      if (isDomainBlocked) {
        return {
          allowed: false,
          reason: 'domain_blocked',
          details: `Domain ${hostname} is in the blocked domains list`
        };
      }

      return { allowed: true, reason: 'domain_not_blocked' };
    } catch (error) {
      return {
        allowed: false,
        reason: 'invalid_url',
        details: 'Invalid URL format'
      };
    }
  }

  private checkProtocol(url: string, allowedProtocols: string[]): NetworkRequestResult {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol.slice(0, -1); // Remove trailing ':'

      if (!allowedProtocols.includes(protocol)) {
        return {
          allowed: false,
          reason: 'protocol_not_allowed',
          details: `Protocol ${protocol} is not allowed. Allowed protocols: ${allowedProtocols.join(', ')}`
        };
      }

      return { allowed: true, reason: 'protocol_allowed' };
    } catch (error) {
      return {
        allowed: false,
        reason: 'invalid_url',
        details: 'Invalid URL format'
      };
    }
  }

  private checkPort(url: string, allowedPorts: number[]): NetworkRequestResult {
    try {
      const urlObj = new URL(url);
      const port = parseInt(urlObj.port) || this.getDefaultPort(urlObj.protocol);

      if (!allowedPorts.includes(port)) {
        return {
          allowed: false,
          reason: 'port_not_allowed',
          details: `Port ${port} is not allowed. Allowed ports: ${allowedPorts.join(', ')}`
        };
      }

      return { allowed: true, reason: 'port_allowed' };
    } catch (error) {
      return {
        allowed: false,
        reason: 'invalid_url',
        details: 'Invalid URL format'
      };
    }
  }

  private getDefaultPort(protocol: string): number {
    switch (protocol) {
      case 'http:': return 80;
      case 'https:': return 443;
      case 'ftp:': return 21;
      case 'ssh:': return 22;
      default: return 80;
    }
  }

  private recordRequest(pluginId: string, request: NetworkRequest): void {
    if (!this.requestHistory.has(pluginId)) {
      this.requestHistory.set(pluginId, []);
    }

    const history = this.requestHistory.get(pluginId)!;
    history.push({
      url: request.url,
      method: request.method,
      timestamp: new Date(),
      bodySize: request.bodySize,
      responseSize: request.responseSize
    });

    // Keep only recent history
    const maxEntries = this.options.maxHistoryEntries || 1000;
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }
  }

  private recordBlockedRequest(pluginId: string, request: NetworkRequest, reason: string): void {
    if (!this.blockedRequests.has(pluginId)) {
      this.blockedRequests.set(pluginId, []);
    }

    const blocked = this.blockedRequests.get(pluginId)!;
    blocked.push({
      url: request.url,
      method: request.method,
      reason,
      timestamp: new Date()
    });

    // Keep only recent blocked requests
    const maxEntries = this.options.maxBlockedEntries || 500;
    if (blocked.length > maxEntries) {
      blocked.splice(0, blocked.length - maxEntries);
    }

    this.emit('request:blocked', { pluginId, request, reason });
  }

  private getTopDomains(history: NetworkRequestHistory[]): Array<{ domain: string; count: number }> {
    const domainCounts: Record<string, number> = {};

    for (const request of history) {
      try {
        const url = new URL(request.url);
        const domain = url.hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      } catch {
        // Skip invalid URLs
      }
    }

    return Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getBlockReasons(blocked: BlockedRequest[]): Record<string, number> {
    const reasons: Record<string, number> = {};

    for (const request of blocked) {
      reasons[request.reason] = (reasons[request.reason] || 0) + 1;
    }

    return reasons;
  }
}

// Types and Interfaces

export interface NetworkPolicyOptions {
  maxHistoryEntries?: number;
  maxBlockedEntries?: number;
}

export interface PluginNetworkPolicy {
  allowNetworkAccess: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  allowedProtocols?: string[];
  allowedPorts?: number[];
  rateLimit?: RateLimit;
  maxRequestSize?: number;
  requiresHttps?: boolean;
}

export interface RateLimit {
  maxRequests: number;
  windowMs: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  bodySize: number;
  responseSize?: number;
}

export interface NetworkRequestResult {
  allowed: boolean;
  reason: string;
  details?: string;
}

export interface NetworkPolicy {
  id: string;
  name: string;
  description: string;
  evaluate(pluginId: string, request: NetworkRequest): Promise<NetworkRequestResult>;
}

export interface NetworkRequestHistory {
  url: string;
  method: string;
  timestamp: Date;
  bodySize?: number;
  responseSize?: number;
}

export interface BlockedRequest {
  url: string;
  method: string;
  reason: string;
  timestamp: Date;
}

export interface NetworkStats {
  pluginId: string;
  totalRequests: number;
  blockedRequests: number;
  successRate: number;
  recentActivity: {
    lastHour: {
      requests: number;
      blocked: number;
    };
    lastDay: {
      requests: number;
      blocked: number;
    };
  };
  topDomains: Array<{ domain: string; count: number }>;
  blockReasons: Record<string, number>;
  bandwidth: {
    uploaded: number;
    downloaded: number;
  };
}

export interface GlobalNetworkStats {
  totalPlugins: number;
  totalRequests: number;
  totalBlocked: number;
  topBlockReasons: Record<string, number>;
  bandwidth: {
    uploaded: number;
    downloaded: number;
  };
}