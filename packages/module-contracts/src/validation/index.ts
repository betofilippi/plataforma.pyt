/**
 * Validation Package
 * 
 * Comprehensive validation system for module contracts,
 * manifests, and runtime compliance checking.
 */

// Core validators
export * from './ManifestValidator';

// Additional validation types and utilities
export interface ValidationResult {
  readonly valid: boolean;
  readonly score: number;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly info: readonly ValidationInfo[];
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field: string;
  readonly value?: any;
  readonly severity: 'critical' | 'major' | 'minor';
  readonly fix?: string;
}

export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly field: string;
  readonly value?: any;
  readonly recommendation: string;
}

export interface ValidationInfo {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly tip: string;
}

/**
 * Runtime validator for module compliance
 */
export interface RuntimeValidator {
  /** Validate module at runtime */
  validateRuntime(moduleId: string): Promise<RuntimeValidationResult>;
  
  /** Validate module permissions */
  validatePermissions(moduleId: string): Promise<PermissionValidationResult>;
  
  /** Validate module dependencies */
  validateDependencies(moduleId: string): Promise<DependencyValidationResult>;
  
  /** Validate module health */
  validateHealth(moduleId: string): Promise<HealthValidationResult>;
}

export interface RuntimeValidationResult extends ValidationResult {
  readonly moduleId: string;
  readonly timestamp: string;
  readonly environment: string;
  readonly performance: PerformanceValidation;
  readonly security: SecurityValidation;
  readonly compliance: ComplianceValidation;
}

export interface PerformanceValidation {
  readonly memoryUsage: MemoryValidation;
  readonly cpuUsage: CPUValidation;
  readonly responseTime: ResponseTimeValidation;
}

export interface MemoryValidation {
  readonly current: number;
  readonly limit: number;
  readonly percentage: number;
  readonly status: 'ok' | 'warning' | 'critical';
}

export interface CPUValidation {
  readonly current: number;
  readonly limit: number;
  readonly percentage: number;
  readonly status: 'ok' | 'warning' | 'critical';
}

export interface ResponseTimeValidation {
  readonly average: number;
  readonly p95: number;
  readonly p99: number;
  readonly threshold: number;
  readonly status: 'ok' | 'warning' | 'critical';
}

export interface SecurityValidation {
  readonly permissions: readonly string[];
  readonly violations: readonly SecurityViolation[];
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly lastScan: string;
}

export interface SecurityViolation {
  readonly type: string;
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly recommendation: string;
}

export interface ComplianceValidation {
  readonly standards: readonly ComplianceStandardCheck[];
  readonly overall: 'compliant' | 'non-compliant' | 'partial';
  readonly score: number;
}

export interface ComplianceStandardCheck {
  readonly standard: string;
  readonly version: string;
  readonly status: 'pass' | 'fail' | 'partial' | 'not-applicable';
  readonly details: string;
}

export interface PermissionValidationResult extends ValidationResult {
  readonly granted: readonly string[];
  readonly denied: readonly string[];
  readonly pending: readonly string[];
  readonly violations: readonly PermissionViolation[];
}

export interface PermissionViolation {
  readonly permission: string;
  readonly reason: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly action: 'revoke' | 'monitor' | 'warn';
}

export interface DependencyValidationResult extends ValidationResult {
  readonly satisfied: readonly string[];
  readonly missing: readonly string[];
  readonly conflicts: readonly DependencyConflict[];
  readonly suggestions: readonly string[];
}

export interface DependencyConflict {
  readonly modules: readonly string[];
  readonly issue: string;
  readonly resolution: string;
}

export interface HealthValidationResult extends ValidationResult {
  readonly status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  readonly checks: readonly HealthCheck[];
  readonly uptime: number;
  readonly lastCheck: string;
}

export interface HealthCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly message: string;
  readonly duration: number;
  readonly timestamp: string;
}

/**
 * Contract validator for ensuring modules conform to contracts
 */
export interface ContractValidator {
  /** Validate module against its contract */
  validateContract(moduleId: string): Promise<ContractValidationResult>;
  
  /** Validate API contract compliance */
  validateAPI(moduleId: string): Promise<APIValidationResult>;
  
  /** Validate event contract compliance */
  validateEvents(moduleId: string): Promise<EventValidationResult>;
}

export interface ContractValidationResult extends ValidationResult {
  readonly moduleId: string;
  readonly contractVersion: string;
  readonly compliance: ContractCompliance;
}

export interface ContractCompliance {
  readonly interfaces: InterfaceCompliance;
  readonly lifecycle: LifecycleCompliance;
  readonly events: EventCompliance;
  readonly permissions: PermissionCompliance;
}

export interface InterfaceCompliance {
  readonly implemented: readonly string[];
  readonly missing: readonly string[];
  readonly deprecated: readonly string[];
  readonly breaking: readonly string[];
}

export interface LifecycleCompliance {
  readonly hooks: readonly string[];
  readonly states: readonly string[];
  readonly transitions: readonly string[];
  readonly violations: readonly string[];
}

export interface EventCompliance {
  readonly emitted: readonly string[];
  readonly handled: readonly string[];
  readonly schema: readonly EventSchemaCompliance[];
}

export interface EventSchemaCompliance {
  readonly eventType: string;
  readonly valid: boolean;
  readonly issues: readonly string[];
}

export interface PermissionCompliance {
  readonly declared: readonly string[];
  readonly used: readonly string[];
  readonly unused: readonly string[];
  readonly undeclared: readonly string[];
}

export interface APIValidationResult extends ValidationResult {
  readonly endpoints: readonly APIEndpointValidation[];
  readonly schemas: readonly APISchemaValidation[];
  readonly responses: readonly APIResponseValidation[];
}

export interface APIEndpointValidation {
  readonly path: string;
  readonly method: string;
  readonly status: 'valid' | 'invalid' | 'deprecated';
  readonly issues: readonly string[];
}

export interface APISchemaValidation {
  readonly schema: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface APIResponseValidation {
  readonly endpoint: string;
  readonly statusCode: number;
  readonly valid: boolean;
  readonly schema: string;
  readonly issues: readonly string[];
}

export interface EventValidationResult extends ValidationResult {
  readonly events: readonly EventTypeValidation[];
  readonly schemas: readonly EventSchemaValidation[];
  readonly handlers: readonly EventHandlerValidation[];
}

export interface EventTypeValidation {
  readonly type: string;
  readonly valid: boolean;
  readonly schema: string;
  readonly issues: readonly string[];
}

export interface EventSchemaValidation {
  readonly eventType: string;
  readonly schemaVersion: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface EventHandlerValidation {
  readonly eventType: string;
  readonly handler: string;
  readonly registered: boolean;
  readonly issues: readonly string[];
}

/**
 * Validation utilities and helpers
 */
export class ValidationUtils {
  /**
   * Merge multiple validation results
   */
  static mergeResults(results: readonly ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const allInfo = results.flatMap(r => r.info);
    
    return {
      valid: results.every(r => r.valid),
      score: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      errors: allErrors,
      warnings: allWarnings,
      info: allInfo
    };
  }
  
  /**
   * Filter results by severity
   */
  static filterBySeverity(
    result: ValidationResult,
    minSeverity: 'critical' | 'major' | 'minor' = 'minor'
  ): ValidationResult {
    const severityOrder = { critical: 3, major: 2, minor: 1 };
    const threshold = severityOrder[minSeverity];
    
    const filteredErrors = result.errors.filter(e => 
      severityOrder[e.severity] >= threshold
    );
    
    return {
      ...result,
      errors: filteredErrors,
      valid: filteredErrors.length === 0
    };
  }
  
  /**
   * Generate validation report
   */
  static generateReport(result: ValidationResult): ValidationReport {
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    const majorErrors = result.errors.filter(e => e.severity === 'major');
    const minorErrors = result.errors.filter(e => e.severity === 'minor');
    
    return {
      summary: {
        valid: result.valid,
        score: result.score,
        totalIssues: result.errors.length + result.warnings.length,
        criticalIssues: criticalErrors.length,
        majorIssues: majorErrors.length,
        minorIssues: minorErrors.length,
        warnings: result.warnings.length
      },
      details: {
        errors: result.errors,
        warnings: result.warnings,
        info: result.info
      },
      recommendations: ValidationUtils.generateRecommendations(result)
    };
  }
  
  /**
   * Generate recommendations based on validation result
   */
  static generateRecommendations(result: ValidationResult): readonly string[] {
    const recommendations: string[] = [];
    
    // Critical errors
    const criticalErrors = result.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push(
        `Fix ${criticalErrors.length} critical error(s) immediately - these prevent the module from functioning`
      );
    }
    
    // Major errors
    const majorErrors = result.errors.filter(e => e.severity === 'major');
    if (majorErrors.length > 0) {
      recommendations.push(
        `Address ${majorErrors.length} major error(s) to ensure compatibility and best practices`
      );
    }
    
    // Many warnings
    if (result.warnings.length > 5) {
      recommendations.push(
        `Consider addressing ${result.warnings.length} warnings to improve module quality`
      );
    }
    
    // Low score
    if (result.score < 70) {
      recommendations.push(
        'Overall validation score is low - review and address the issues identified'
      );
    }
    
    return recommendations;
  }
}

export interface ValidationReport {
  readonly summary: ValidationSummary;
  readonly details: ValidationDetails;
  readonly recommendations: readonly string[];
}

export interface ValidationSummary {
  readonly valid: boolean;
  readonly score: number;
  readonly totalIssues: number;
  readonly criticalIssues: number;
  readonly majorIssues: number;
  readonly minorIssues: number;
  readonly warnings: number;
}

export interface ValidationDetails {
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
  readonly info: readonly ValidationInfo[];
}

// Export validation constants
export const VALIDATION_CONSTANTS = {
  MIN_SCORE: 70,
  MAX_WARNINGS: 5,
  CRITICAL_ERROR_THRESHOLD: 0,
  MAJOR_ERROR_THRESHOLD: 2
} as const;