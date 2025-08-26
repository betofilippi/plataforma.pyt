/**
 * Security Layer
 * 
 * This module exports the security components that protect the platform
 * from malicious or misbehaving plugins:
 * - PermissionManager: Permission system
 * - SecurityPolicyEngine: Policy enforcement
 * - ResourceLimitsManager: Resource monitoring and limits
 * - NetworkPolicyManager: Network access control
 */

export { PermissionManager } from './PermissionManager';
export type {
  PermissionManagerOptions,
  PermissionDefinition,
  PluginPermissionState,
  PluginPermissionSummary,
  PermissionValidationResult,
  PermissionPolicy,
  PermissionRequest,
  PermissionStatistics
} from './PermissionManager';

export {
  SecurityPolicyEngine,
  SecurityResourceMonitor
} from './Sandbox';
export type {
  SecurityPolicyOptions,
  SecurityPolicy,
  SecurityOperation,
  SecurityEvaluation,
  SecurityViolation,
  SecurityReport,
  ResourceMonitorOptions,
  ResourceUsage,
  ResourceUsageHistory,
  ResourceThresholds,
  ResourceStats,
  RiskLevel
} from './Sandbox';

export { ResourceLimitsManager } from './ResourceLimits';
export type {
  ResourceLimitsOptions,
  PluginResourceLimits,
  PluginResourceUsage,
  ResourceMetric,
  ResourceHistoryEntry,
  ResourceOperation,
  ResourceCheckResult,
  ResourceUsageSnapshot,
  ResourceUsageStats,
  GlobalResourceStats,
  LimitViolation
} from './ResourceLimits';

export { NetworkPolicyManager } from './NetworkPolicy';
export type {
  NetworkPolicyOptions,
  PluginNetworkPolicy,
  RateLimit,
  NetworkRequest,
  NetworkRequestResult,
  NetworkPolicy,
  NetworkRequestHistory,
  BlockedRequest,
  NetworkStats,
  GlobalNetworkStats
} from './NetworkPolicy';