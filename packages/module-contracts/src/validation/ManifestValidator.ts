/**
 * Manifest Validator
 * 
 * Validates module manifests against the contract specifications
 * and provides detailed error reporting and suggestions.
 */

import { ModuleManifest, ModuleCategory, ModuleType, isModuleManifest } from '../contracts/ModuleManifest';

/**
 * Manifest validation result
 */
export interface ManifestValidationResult {
  /** Whether the manifest is valid */
  readonly valid: boolean;
  
  /** Validation errors (must be fixed) */
  readonly errors: readonly ManifestValidationError[];
  
  /** Validation warnings (should be addressed) */
  readonly warnings: readonly ManifestValidationWarning[];
  
  /** Validation info (nice to have) */
  readonly info: readonly ManifestValidationInfo[];
  
  /** Validation score (0-100) */
  readonly score: number;
  
  /** Suggestions for improvement */
  readonly suggestions: readonly string[];
}

export interface ManifestValidationError {
  readonly code: string;
  readonly message: string;
  readonly field: string;
  readonly value?: any;
  readonly severity: 'critical' | 'major' | 'minor';
  readonly fix?: string;
}

export interface ManifestValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly field: string;
  readonly value?: any;
  readonly recommendation: string;
}

export interface ManifestValidationInfo {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly tip: string;
}

/**
 * Manifest validator configuration
 */
export interface ManifestValidatorConfig {
  /** Validation level */
  readonly level: ValidationLevel;
  
  /** Custom validation rules */
  readonly customRules: readonly CustomValidationRule[];
  
  /** Validation context */
  readonly context: ValidationContext;
  
  /** Schema validation options */
  readonly schemaValidation: SchemaValidationOptions;
}

export enum ValidationLevel {
  /** Basic validation only */
  BASIC = 'basic',
  
  /** Standard validation (default) */
  STANDARD = 'standard',
  
  /** Strict validation */
  STRICT = 'strict',
  
  /** Pedantic validation (everything) */
  PEDANTIC = 'pedantic'
}

export interface CustomValidationRule {
  readonly name: string;
  readonly description: string;
  readonly validator: (manifest: ModuleManifest) => ValidationRuleResult;
  readonly level: ValidationLevel;
}

export interface ValidationRuleResult {
  readonly passed: boolean;
  readonly errors: readonly ManifestValidationError[];
  readonly warnings: readonly ManifestValidationWarning[];
  readonly info: readonly ManifestValidationInfo[];
}

export interface ValidationContext {
  /** Platform version being validated against */
  readonly platformVersion: string;
  
  /** Target environment */
  readonly environment: 'development' | 'staging' | 'production';
  
  /** Available modules in the ecosystem */
  readonly availableModules: readonly string[];
  
  /** Organization-specific rules */
  readonly organizationRules?: OrganizationValidationRules;
  
  /** Regional compliance requirements */
  readonly compliance?: ComplianceRequirements;
}

export interface OrganizationValidationRules {
  readonly requiredFields: readonly string[];
  readonly forbiddenWords: readonly string[];
  readonly namingConventions: NamingConventions;
  readonly securityRequirements: SecurityRequirements;
}

export interface NamingConventions {
  readonly moduleIdPattern: string;
  readonly moduleNamePattern?: string;
  readonly versionPattern?: string;
}

export interface SecurityRequirements {
  readonly requireCodeSigning: boolean;
  readonly requirePermissionJustification: boolean;
  readonly allowedPermissions: readonly string[];
  readonly forbiddenPermissions: readonly string[];
}

export interface ComplianceRequirements {
  readonly standards: readonly string[];
  readonly dataRetention: boolean;
  readonly auditLogging: boolean;
  readonly privacyControls: boolean;
}

export interface SchemaValidationOptions {
  /** Enable JSON schema validation */
  readonly enabled: boolean;
  
  /** Schema version to validate against */
  readonly schemaVersion: string;
  
  /** Allow additional properties */
  readonly additionalProperties: boolean;
  
  /** Strict type checking */
  readonly strictTypes: boolean;
}

/**
 * Manifest validator class
 */
export class ManifestValidator {
  private config: ManifestValidatorConfig;
  
  constructor(config: Partial<ManifestValidatorConfig> = {}) {
    this.config = {
      level: ValidationLevel.STANDARD,
      customRules: [],
      context: {
        platformVersion: '1.0.0',
        environment: 'development',
        availableModules: []
      },
      schemaValidation: {
        enabled: true,
        schemaVersion: '1.0.0',
        additionalProperties: false,
        strictTypes: true
      },
      ...config
    };
  }
  
  /**
   * Validate a module manifest
   */
  async validate(manifest: any): Promise<ManifestValidationResult> {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    // Basic structure validation
    const structureResult = this.validateStructure(manifest);
    errors.push(...structureResult.errors);
    warnings.push(...structureResult.warnings);
    info.push(...structureResult.info);
    
    // If basic structure is invalid, stop here
    if (structureResult.errors.some(e => e.severity === 'critical')) {
      return {
        valid: false,
        errors,
        warnings,
        info,
        score: 0,
        suggestions: this.generateSuggestions(errors, warnings)
      };
    }
    
    const typedManifest = manifest as ModuleManifest;
    
    // Schema validation
    if (this.config.schemaValidation.enabled) {
      const schemaResult = await this.validateSchema(typedManifest);
      errors.push(...schemaResult.errors);
      warnings.push(...schemaResult.warnings);
      info.push(...schemaResult.info);
    }
    
    // Semantic validation
    const semanticResult = this.validateSemantics(typedManifest);
    errors.push(...semanticResult.errors);
    warnings.push(...semanticResult.warnings);
    info.push(...semanticResult.info);
    
    // Dependencies validation
    const dependenciesResult = await this.validateDependencies(typedManifest);
    errors.push(...dependenciesResult.errors);
    warnings.push(...dependenciesResult.warnings);
    info.push(...dependenciesResult.info);
    
    // Permissions validation
    const permissionsResult = this.validatePermissions(typedManifest);
    errors.push(...permissionsResult.errors);
    warnings.push(...permissionsResult.warnings);
    info.push(...permissionsResult.info);
    
    // Custom rules validation
    for (const rule of this.config.customRules) {
      if (this.shouldApplyRule(rule)) {
        const ruleResult = rule.validator(typedManifest);
        errors.push(...ruleResult.errors);
        warnings.push(...ruleResult.warnings);
        info.push(...ruleResult.info);
      }
    }
    
    // Calculate validation score
    const score = this.calculateScore(errors, warnings, info);
    
    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'major').length === 0,
      errors,
      warnings,
      info,
      score,
      suggestions: this.generateSuggestions(errors, warnings)
    };
  }
  
  /**
   * Validate basic manifest structure
   */
  private validateStructure(manifest: any): ValidationRuleResult {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    // Check if it's a valid object
    if (typeof manifest !== 'object' || manifest === null) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Manifest must be an object',
        field: 'root',
        value: typeof manifest,
        severity: 'critical',
        fix: 'Provide a valid JSON object for the manifest'
      });
      return { passed: false, errors, warnings, info };
    }
    
    // Check required fields
    const requiredFields = ['id', 'name', 'version', 'description', 'category', 'type', 'author', 'license'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field '${field}' is missing`,
          field,
          severity: 'critical',
          fix: `Add the required field '${field}' to your manifest`
        });
      }
    }
    
    // Check field types
    const fieldTypes: Record<string, string> = {
      id: 'string',
      name: 'string',
      version: 'string',
      description: 'string',
      license: 'string'
    };
    
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (manifest[field] && typeof manifest[field] !== expectedType) {
        errors.push({
          code: 'INVALID_FIELD_TYPE',
          message: `Field '${field}' must be of type '${expectedType}'`,
          field,
          value: typeof manifest[field],
          severity: 'major',
          fix: `Change '${field}' to be of type '${expectedType}'`
        });
      }
    }
    
    // Check enums
    if (manifest.category && !Object.values(ModuleCategory).includes(manifest.category)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `Invalid category '${manifest.category}'`,
        field: 'category',
        value: manifest.category,
        severity: 'major',
        fix: `Use one of: ${Object.values(ModuleCategory).join(', ')}`
      });
    }
    
    if (manifest.type && !Object.values(ModuleType).includes(manifest.type)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `Invalid type '${manifest.type}'`,
        field: 'type',
        value: manifest.type,
        severity: 'major',
        fix: `Use one of: ${Object.values(ModuleType).join(', ')}`
      });
    }
    
    return { passed: errors.length === 0, errors, warnings, info };
  }
  
  /**
   * Validate manifest against JSON schema
   */
  private async validateSchema(manifest: ModuleManifest): Promise<ValidationRuleResult> {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    // This would use a JSON Schema validator like AJV in a real implementation
    // For now, we'll do some basic type checking
    
    if (!isModuleManifest(manifest)) {
      errors.push({
        code: 'SCHEMA_VALIDATION_FAILED',
        message: 'Manifest does not conform to the expected schema',
        field: 'root',
        severity: 'major'
      });
    }
    
    return { passed: errors.length === 0, errors, warnings, info };
  }
  
  /**
   * Validate semantic rules
   */
  private validateSemantics(manifest: ModuleManifest): ValidationRuleResult {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    // ID format validation
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(manifest.id)) {
      errors.push({
        code: 'INVALID_ID_FORMAT',
        message: 'Module ID must be kebab-case and start/end with alphanumeric characters',
        field: 'id',
        value: manifest.id,
        severity: 'major',
        fix: 'Use kebab-case format (e.g., "my-module-name")'
      });
    }
    
    // Version format validation (semver)
    if (!/^\d+\.\d+\.\d+(-[\w\d-]+)?(\+[\w\d-]+)?$/.test(manifest.version)) {
      errors.push({
        code: 'INVALID_VERSION_FORMAT',
        message: 'Version must follow semantic versioning (semver) format',
        field: 'version',
        value: manifest.version,
        severity: 'major',
        fix: 'Use semver format (e.g., "1.0.0", "1.2.3-beta.1")'
      });
    }
    
    // Description length validation
    if (manifest.description.length < 10) {
      warnings.push({
        code: 'SHORT_DESCRIPTION',
        message: 'Description is very short',
        field: 'description',
        value: manifest.description.length,
        recommendation: 'Provide a more detailed description (at least 10 characters)'
      });
    }
    
    if (manifest.description.length > 500) {
      warnings.push({
        code: 'LONG_DESCRIPTION',
        message: 'Description is very long',
        field: 'description',
        value: manifest.description.length,
        recommendation: 'Keep description concise (under 500 characters)'
      });
    }
    
    // Keywords validation
    if (!manifest.keywords || manifest.keywords.length === 0) {
      warnings.push({
        code: 'NO_KEYWORDS',
        message: 'No keywords specified',
        field: 'keywords',
        recommendation: 'Add relevant keywords to improve discoverability'
      });
    }
    
    // Author validation
    if (typeof manifest.author === 'object') {
      if (!manifest.author.name) {
        errors.push({
          code: 'MISSING_AUTHOR_NAME',
          message: 'Author name is required',
          field: 'author.name',
          severity: 'major'
        });
      }
      
      if (manifest.author.email && !this.isValidEmail(manifest.author.email)) {
        errors.push({
          code: 'INVALID_AUTHOR_EMAIL',
          message: 'Author email format is invalid',
          field: 'author.email',
          value: manifest.author.email,
          severity: 'minor',
          fix: 'Provide a valid email address'
        });
      }
    }
    
    return { passed: errors.filter(e => e.severity === 'critical' || e.severity === 'major').length === 0, errors, warnings, info };
  }
  
  /**
   * Validate module dependencies
   */
  private async validateDependencies(manifest: ModuleManifest): Promise<ValidationRuleResult> {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    if (manifest.dependencies) {
      // Platform version compatibility
      if (manifest.dependencies.platform) {
        const platformVersion = manifest.dependencies.platform;
        if (!this.isVersionCompatible(platformVersion, this.config.context.platformVersion)) {
          errors.push({
            code: 'INCOMPATIBLE_PLATFORM_VERSION',
            message: `Module requires platform ${platformVersion} but ${this.config.context.platformVersion} is available`,
            field: 'dependencies.platform',
            value: platformVersion,
            severity: 'major',
            fix: `Update platform dependency to be compatible with ${this.config.context.platformVersion}`
          });
        }
      }
      
      // Peer dependencies validation
      for (const peer of manifest.dependencies.peers || []) {
        if (!this.config.context.availableModules.includes(peer.moduleId)) {
          warnings.push({
            code: 'MISSING_PEER_DEPENDENCY',
            message: `Peer dependency '${peer.moduleId}' is not available`,
            field: 'dependencies.peers',
            value: peer.moduleId,
            recommendation: 'Ensure peer dependency is installed or make it optional'
          });
        }
      }
      
      // Circular dependency check
      const circularDeps = this.detectCircularDependencies(manifest);
      if (circularDeps.length > 0) {
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          message: `Circular dependencies detected: ${circularDeps.join(' -> ')}`,
          field: 'dependencies',
          severity: 'major',
          fix: 'Remove circular dependencies between modules'
        });
      }
    }
    
    return { passed: errors.filter(e => e.severity === 'critical' || e.severity === 'major').length === 0, errors, warnings, info };
  }
  
  /**
   * Validate module permissions
   */
  private validatePermissions(manifest: ModuleManifest): ValidationRuleResult {
    const errors: ManifestValidationError[] = [];
    const warnings: ManifestValidationWarning[] = [];
    const info: ManifestValidationInfo[] = [];
    
    if (manifest.permissions) {
      const orgRules = this.config.context.organizationRules;
      
      if (orgRules?.securityRequirements.requirePermissionJustification) {
        // Check if dangerous permissions have justifications
        const dangerousPerms = manifest.permissions.system.filter(perm => 
          ['filesystem:write', 'database:schema', 'network:access'].includes(perm)
        );
        
        if (dangerousPerms.length > 0) {
          warnings.push({
            code: 'DANGEROUS_PERMISSIONS',
            message: `Module requests potentially dangerous permissions: ${dangerousPerms.join(', ')}`,
            field: 'permissions.system',
            recommendation: 'Provide justification for dangerous permissions in documentation'
          });
        }
      }
      
      // Check forbidden permissions
      if (orgRules?.securityRequirements.forbiddenPermissions) {
        const forbidden = manifest.permissions.system.filter(perm =>
          orgRules.securityRequirements.forbiddenPermissions.includes(perm)
        );
        
        if (forbidden.length > 0) {
          errors.push({
            code: 'FORBIDDEN_PERMISSIONS',
            message: `Module requests forbidden permissions: ${forbidden.join(', ')}`,
            field: 'permissions.system',
            severity: 'major',
            fix: 'Remove forbidden permissions or get organizational approval'
          });
        }
      }
    }
    
    return { passed: errors.filter(e => e.severity === 'critical' || e.severity === 'major').length === 0, errors, warnings, info };
  }
  
  /**
   * Check if a validation rule should be applied
   */
  private shouldApplyRule(rule: CustomValidationRule): boolean {
    const ruleLevels = {
      [ValidationLevel.BASIC]: 1,
      [ValidationLevel.STANDARD]: 2,
      [ValidationLevel.STRICT]: 3,
      [ValidationLevel.PEDANTIC]: 4
    };
    
    return ruleLevels[rule.level] <= ruleLevels[this.config.level];
  }
  
  /**
   * Calculate validation score
   */
  private calculateScore(
    errors: readonly ManifestValidationError[],
    warnings: readonly ManifestValidationWarning[],
    info: readonly ManifestValidationInfo[]
  ): number {
    let score = 100;
    
    // Deduct points for errors
    for (const error of errors) {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 5;
          break;
      }
    }
    
    // Deduct points for warnings
    score -= warnings.length * 2;
    
    // Add points for good practices (info items)
    score += Math.min(info.length, 10);
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    errors: readonly ManifestValidationError[],
    warnings: readonly ManifestValidationWarning[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggestions based on errors
    const criticalErrors = errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      suggestions.push('Fix critical errors first - they prevent the module from loading');
    }
    
    const majorErrors = errors.filter(e => e.severity === 'major');
    if (majorErrors.length > 0) {
      suggestions.push('Address major errors to ensure compatibility and best practices');
    }
    
    // Suggestions based on warnings
    if (warnings.length > 5) {
      suggestions.push('Consider addressing warnings to improve module quality');
    }
    
    const descriptionWarnings = warnings.filter(w => w.field === 'description');
    if (descriptionWarnings.length > 0) {
      suggestions.push('Improve the module description to help users understand its purpose');
    }
    
    const keywordWarnings = warnings.filter(w => w.field === 'keywords');
    if (keywordWarnings.length > 0) {
      suggestions.push('Add relevant keywords to improve module discoverability');
    }
    
    return suggestions;
  }
  
  /**
   * Utility methods
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
  
  private isVersionCompatible(_required: string, _available: string): boolean {
    // Simplified version compatibility check
    // Real implementation would use semver library
    return true;
  }
  
  private detectCircularDependencies(_manifest: ModuleManifest): string[] {
    // Simplified circular dependency detection
    // Real implementation would build dependency graph and detect cycles
    return [];
  }
}