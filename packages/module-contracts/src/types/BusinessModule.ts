/**
 * Business Module Type Contract
 * 
 * Defines the specific interface for business modules that provide
 * core business functionality within the platform.
 */

import { Module, ModuleContext, ModuleConfig } from '../contracts/ModuleAPI';
import { ModuleManifest, ModuleCategory } from '../contracts/ModuleManifest';

/**
 * Business module interface extending the base module
 */
export interface BusinessModule extends Module {
  /** Business module specific manifest */
  readonly manifest: BusinessModuleManifest;
  
  /** Business module configuration */
  readonly config: BusinessModuleConfig;
  
  /** Business context */
  readonly businessContext: BusinessModuleContext;
  
  /** Get business entities managed by this module */
  getBusinessEntities(): Promise<readonly BusinessEntity[]>;
  
  /** Get business processes provided by this module */
  getBusinessProcesses(): Promise<readonly BusinessProcess[]>;
  
  /** Get business reports available in this module */
  getBusinessReports(): Promise<readonly BusinessReport[]>;
  
  /** Get business dashboards */
  getDashboards(): Promise<readonly BusinessDashboard[]>;
  
  /** Handle business events */
  handleBusinessEvent(event: BusinessEvent): Promise<BusinessEventResult>;
  
  /** Execute business operation */
  executeOperation(operation: BusinessOperation): Promise<BusinessOperationResult>;
  
  /** Get module analytics */
  getAnalytics(period: AnalyticsPeriod): Promise<BusinessModuleAnalytics>;
  
  /** Validate business rules */
  validateBusinessRules(context: BusinessRuleContext): Promise<BusinessRuleValidation>;
}

/**
 * Business module manifest extension
 */
export interface BusinessModuleManifest extends ModuleManifest {
  /** Must be business category */
  readonly category: ModuleCategory.BUSINESS;
  
  /** Business domain */
  readonly domain: BusinessDomain;
  
  /** Business capabilities */
  readonly capabilities: readonly BusinessCapability[];
  
  /** Data models */
  readonly dataModels: readonly BusinessDataModel[];
  
  /** Business rules */
  readonly businessRules: readonly BusinessRule[];
  
  /** Integration points */
  readonly integrations: readonly BusinessIntegration[];
  
  /** Compliance requirements */
  readonly compliance: readonly ComplianceRequirement[];
}

/**
 * Business domains
 */
export enum BusinessDomain {
  // Core business functions
  SALES = 'sales',
  MARKETING = 'marketing',
  CUSTOMER_SERVICE = 'customer-service',
  INVENTORY = 'inventory',
  PROCUREMENT = 'procurement',
  MANUFACTURING = 'manufacturing',
  LOGISTICS = 'logistics',
  FULFILLMENT = 'fulfillment',
  
  // Financial functions
  ACCOUNTING = 'accounting',
  FINANCE = 'finance',
  BILLING = 'billing',
  TAXATION = 'taxation',
  PAYROLL = 'payroll',
  
  // Human resources
  HR = 'hr',
  RECRUITMENT = 'recruitment',
  PERFORMANCE = 'performance',
  TRAINING = 'training',
  
  // Operations
  PROJECT_MANAGEMENT = 'project-management',
  QUALITY_ASSURANCE = 'quality-assurance',
  COMPLIANCE = 'compliance',
  RISK_MANAGEMENT = 'risk-management',
  
  // Technology
  IT_MANAGEMENT = 'it-management',
  SECURITY = 'security',
  DATA_MANAGEMENT = 'data-management',
  
  // Custom domains
  CUSTOM = 'custom'
}

/**
 * Business capabilities
 */
export interface BusinessCapability {
  /** Capability identifier */
  readonly id: string;
  
  /** Capability name */
  readonly name: string;
  
  /** Capability description */
  readonly description: string;
  
  /** Capability level */
  readonly level: CapabilityLevel;
  
  /** Required permissions */
  readonly permissions: readonly string[];
  
  /** Dependencies on other capabilities */
  readonly dependencies?: readonly string[];
}

export enum CapabilityLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Business data model
 */
export interface BusinessDataModel {
  /** Model name */
  readonly name: string;
  
  /** Model schema */
  readonly schema: BusinessDataSchema;
  
  /** Model relationships */
  readonly relationships: readonly BusinessDataRelationship[];
  
  /** Model validation rules */
  readonly validationRules: readonly BusinessDataValidation[];
  
  /** Model permissions */
  readonly permissions: BusinessDataPermissions;
}

export interface BusinessDataSchema {
  readonly fields: Record<string, BusinessDataField>;
  readonly indexes: readonly BusinessDataIndex[];
  readonly constraints: readonly BusinessDataConstraint[];
}

export interface BusinessDataField {
  readonly type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'reference';
  readonly required: boolean;
  readonly unique?: boolean;
  readonly defaultValue?: any;
  readonly validation?: BusinessFieldValidation;
  readonly displayName?: string;
  readonly description?: string;
}

export interface BusinessFieldValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly pattern?: string;
  readonly enum?: readonly any[];
  readonly customValidator?: string;
}

export interface BusinessDataIndex {
  readonly name: string;
  readonly fields: readonly string[];
  readonly unique: boolean;
  readonly type?: 'btree' | 'hash' | 'gist' | 'gin';
}

export interface BusinessDataConstraint {
  readonly name: string;
  readonly type: 'check' | 'foreign_key' | 'unique' | 'not_null';
  readonly definition: string;
}

export interface BusinessDataRelationship {
  readonly name: string;
  readonly type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  readonly targetModel: string;
  readonly foreignKey: string;
  readonly cascade?: boolean;
}

export interface BusinessDataPermissions {
  readonly create: readonly string[];
  readonly read: readonly string[];
  readonly update: readonly string[];
  readonly delete: readonly string[];
}

export interface BusinessDataValidation {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Business rule
 */
export interface BusinessRule {
  /** Rule identifier */
  readonly id: string;
  
  /** Rule name */
  readonly name: string;
  
  /** Rule description */
  readonly description: string;
  
  /** Rule type */
  readonly type: BusinessRuleType;
  
  /** Rule conditions */
  readonly conditions: readonly BusinessRuleCondition[];
  
  /** Rule actions */
  readonly actions: readonly BusinessRuleAction[];
  
  /** Rule priority */
  readonly priority: number;
  
  /** Whether rule is enabled */
  readonly enabled: boolean;
}

export enum BusinessRuleType {
  VALIDATION = 'validation',
  CALCULATION = 'calculation',
  WORKFLOW = 'workflow',
  NOTIFICATION = 'notification',
  INTEGRATION = 'integration',
  SECURITY = 'security',
  COMPLIANCE = 'compliance'
}

export interface BusinessRuleCondition {
  readonly field: string;
  readonly operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between' | 'exists' | 'custom';
  readonly value: any;
  readonly logicalOperator?: 'and' | 'or';
}

export interface BusinessRuleAction {
  readonly type: 'set_field' | 'calculate' | 'validate' | 'notify' | 'trigger_workflow' | 'log' | 'custom';
  readonly parameters: Record<string, any>;
}

/**
 * Business integration
 */
export interface BusinessIntegration {
  /** Integration identifier */
  readonly id: string;
  
  /** Integration name */
  readonly name: string;
  
  /** Integration type */
  readonly type: BusinessIntegrationType;
  
  /** Target system */
  readonly target: string;
  
  /** Integration configuration */
  readonly config: BusinessIntegrationConfig;
  
  /** Data mappings */
  readonly mappings: readonly BusinessDataMapping[];
}

export enum BusinessIntegrationType {
  API = 'api',
  DATABASE = 'database',
  FILE = 'file',
  WEBHOOK = 'webhook',
  EVENT = 'event',
  QUEUE = 'queue',
  EMAIL = 'email',
  SMS = 'sms'
}

export interface BusinessIntegrationConfig {
  readonly endpoint?: string;
  readonly authentication?: BusinessIntegrationAuth;
  readonly timeout?: number;
  readonly retries?: number;
  readonly batchSize?: number;
  readonly schedule?: string;
}

export interface BusinessIntegrationAuth {
  readonly type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  readonly credentials?: Record<string, string>;
}

export interface BusinessDataMapping {
  readonly sourceField: string;
  readonly targetField: string;
  readonly transformation?: BusinessDataTransformation;
}

export interface BusinessDataTransformation {
  readonly type: 'format' | 'calculate' | 'lookup' | 'constant' | 'conditional' | 'custom';
  readonly parameters: Record<string, any>;
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  /** Requirement identifier */
  readonly id: string;
  
  /** Requirement name */
  readonly name: string;
  
  /** Compliance standard */
  readonly standard: ComplianceStandard;
  
  /** Requirement description */
  readonly description: string;
  
  /** Implementation status */
  readonly status: ComplianceStatus;
  
  /** Evidence required */
  readonly evidence: readonly ComplianceEvidence[];
}

export enum ComplianceStandard {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  HIPAA = 'hipaa',
  SOX = 'sox',
  PCI_DSS = 'pci-dss',
  ISO_27001 = 'iso-27001',
  SOC2 = 'soc2',
  CUSTOM = 'custom'
}

export enum ComplianceStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  IMPLEMENTED = 'implemented',
  VERIFIED = 'verified',
  NON_COMPLIANT = 'non-compliant'
}

export interface ComplianceEvidence {
  readonly type: 'document' | 'audit_log' | 'configuration' | 'test_result' | 'certificate';
  readonly description: string;
  readonly required: boolean;
  readonly location?: string;
}

/**
 * Business module configuration
 */
export interface BusinessModuleConfig extends ModuleConfig {
  /** Business configuration */
  readonly business: BusinessConfiguration;
  
  /** Workflow configuration */
  readonly workflows: WorkflowConfiguration;
  
  /** Report configuration */
  readonly reports: ReportConfiguration;
  
  /** Dashboard configuration */
  readonly dashboards: DashboardConfiguration;
}

export interface BusinessConfiguration {
  readonly currency: string;
  readonly timezone: string;
  readonly locale: string;
  readonly fiscalYear: FiscalYearConfig;
  readonly businessHours: BusinessHoursConfig;
  readonly customFields: readonly CustomFieldConfig[];
}

export interface FiscalYearConfig {
  readonly startMonth: number;
  readonly startDay: number;
}

export interface BusinessHoursConfig {
  readonly days: readonly number[];
  readonly startTime: string;
  readonly endTime: string;
  readonly timezone: string;
}

export interface CustomFieldConfig {
  readonly name: string;
  readonly type: string;
  readonly label: string;
  readonly required: boolean;
  readonly options?: readonly string[];
}

export interface WorkflowConfiguration {
  readonly enabled: boolean;
  readonly approvalLevels: number;
  readonly notifications: boolean;
  readonly escalation: EscalationConfig;
}

export interface EscalationConfig {
  readonly enabled: boolean;
  readonly timeoutMinutes: number;
  readonly levels: readonly EscalationLevel[];
}

export interface EscalationLevel {
  readonly level: number;
  readonly assignees: readonly string[];
  readonly timeoutMinutes: number;
}

export interface ReportConfiguration {
  readonly defaultFormat: 'pdf' | 'excel' | 'csv' | 'json';
  readonly scheduling: boolean;
  readonly distribution: boolean;
  readonly retention: RetentionConfig;
}

export interface RetentionConfig {
  readonly enabled: boolean;
  readonly days: number;
  readonly archiveLocation?: string;
}

export interface DashboardConfiguration {
  readonly autoRefresh: boolean;
  readonly refreshInterval: number;
  readonly widgets: readonly WidgetConfig[];
}

export interface WidgetConfig {
  readonly type: string;
  readonly title: string;
  readonly config: Record<string, any>;
  readonly position: WidgetPosition;
}

export interface WidgetPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Business module context
 */
export interface BusinessModuleContext extends ModuleContext {
  /** Business context data */
  readonly business: BusinessContextData;
  
  /** Current user business profile */
  readonly userProfile: BusinessUserProfile;
  
  /** Organization context */
  readonly organization: OrganizationContext;
  
  /** Current session business data */
  readonly session: BusinessSessionData;
}

export interface BusinessContextData {
  readonly currency: string;
  readonly timezone: string;
  readonly locale: string;
  readonly fiscalYear: FiscalYearConfig;
  readonly businessRules: readonly BusinessRule[];
}

export interface BusinessUserProfile {
  readonly department: string;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly preferences: BusinessUserPreferences;
}

export interface BusinessUserPreferences {
  readonly defaultCurrency: string;
  readonly dateFormat: string;
  readonly numberFormat: string;
  readonly dashboardLayout: string;
}

export interface OrganizationContext {
  readonly id: string;
  readonly name: string;
  readonly type: OrganizationType;
  readonly industry: string;
  readonly size: OrganizationSize;
  readonly locations: readonly OrganizationLocation[];
}

export enum OrganizationType {
  CORPORATION = 'corporation',
  LLC = 'llc',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETORSHIP = 'sole-proprietorship',
  NON_PROFIT = 'non-profit',
  GOVERNMENT = 'government'
}

export enum OrganizationSize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export interface OrganizationLocation {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly timezone: string;
  readonly primary: boolean;
}

export interface BusinessSessionData {
  readonly currentLocation?: string;
  readonly workingCurrency?: string;
  readonly activeWorkflows: readonly string[];
  readonly contextData: Record<string, any>;
}

/**
 * Business entities
 */
export interface BusinessEntity {
  /** Entity identifier */
  readonly id: string;
  
  /** Entity name */
  readonly name: string;
  
  /** Entity type */
  readonly type: string;
  
  /** Entity schema */
  readonly schema: BusinessDataSchema;
  
  /** Entity operations */
  readonly operations: readonly EntityOperation[];
  
  /** Entity relationships */
  readonly relationships: readonly BusinessDataRelationship[];
}

export interface EntityOperation {
  readonly name: string;
  readonly type: 'create' | 'read' | 'update' | 'delete' | 'custom';
  readonly parameters: Record<string, any>;
  readonly permissions: readonly string[];
}

/**
 * Business processes
 */
export interface BusinessProcess {
  /** Process identifier */
  readonly id: string;
  
  /** Process name */
  readonly name: string;
  
  /** Process description */
  readonly description: string;
  
  /** Process type */
  readonly type: BusinessProcessType;
  
  /** Process steps */
  readonly steps: readonly ProcessStep[];
  
  /** Process rules */
  readonly rules: readonly BusinessRule[];
  
  /** Process metrics */
  readonly metrics: readonly ProcessMetric[];
}

export enum BusinessProcessType {
  LINEAR = 'linear',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative',
  APPROVAL = 'approval',
  WORKFLOW = 'workflow'
}

export interface ProcessStep {
  readonly id: string;
  readonly name: string;
  readonly type: 'manual' | 'automated' | 'decision' | 'integration';
  readonly assignee?: string;
  readonly duration?: number;
  readonly conditions?: readonly BusinessRuleCondition[];
  readonly actions: readonly BusinessRuleAction[];
}

export interface ProcessMetric {
  readonly name: string;
  readonly type: 'time' | 'count' | 'percentage' | 'currency' | 'custom';
  readonly calculation: string;
  readonly target?: number;
}

/**
 * Business reports
 */
export interface BusinessReport {
  /** Report identifier */
  readonly id: string;
  
  /** Report name */
  readonly name: string;
  
  /** Report category */
  readonly category: ReportCategory;
  
  /** Report parameters */
  readonly parameters: readonly ReportParameter[];
  
  /** Report format options */
  readonly formats: readonly ReportFormat[];
  
  /** Report schedule options */
  readonly scheduling?: ReportScheduling;
}

export enum ReportCategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  COMPLIANCE = 'compliance',
  ANALYTICS = 'analytics',
  CUSTOM = 'custom'
}

export interface ReportParameter {
  readonly name: string;
  readonly type: 'string' | 'number' | 'date' | 'boolean' | 'list';
  readonly required: boolean;
  readonly defaultValue?: any;
  readonly options?: readonly any[];
}

export interface ReportFormat {
  readonly type: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  readonly template?: string;
  readonly options?: Record<string, any>;
}

export interface ReportScheduling {
  readonly frequencies: readonly ('once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')[];
  readonly distribution: readonly string[];
}

/**
 * Business dashboards
 */
export interface BusinessDashboard {
  /** Dashboard identifier */
  readonly id: string;
  
  /** Dashboard name */
  readonly name: string;
  
  /** Dashboard widgets */
  readonly widgets: readonly DashboardWidget[];
  
  /** Dashboard layout */
  readonly layout: DashboardLayout;
  
  /** Dashboard filters */
  readonly filters: readonly DashboardFilter[];
}

export interface DashboardWidget {
  readonly id: string;
  readonly type: WidgetType;
  readonly title: string;
  readonly dataSource: string;
  readonly config: Record<string, any>;
  readonly position: WidgetPosition;
}

export enum WidgetType {
  CHART = 'chart',
  TABLE = 'table',
  METRIC = 'metric',
  LIST = 'list',
  MAP = 'map',
  GAUGE = 'gauge',
  CUSTOM = 'custom'
}

export interface DashboardLayout {
  readonly type: 'grid' | 'flex' | 'absolute';
  readonly columns: number;
  readonly rowHeight: number;
  readonly responsive: boolean;
}

export interface DashboardFilter {
  readonly name: string;
  readonly type: 'dropdown' | 'date' | 'range' | 'search';
  readonly field: string;
  readonly options?: readonly any[];
}

/**
 * Business events and operations
 */
export interface BusinessEvent {
  readonly id: string;
  readonly type: string;
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly data: any;
  readonly user: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, any>;
}

export interface BusinessEventResult {
  readonly handled: boolean;
  readonly result?: any;
  readonly error?: string;
  readonly nextActions?: readonly string[];
}

export interface BusinessOperation {
  readonly id: string;
  readonly type: string;
  readonly entity: string;
  readonly action: string;
  readonly parameters: Record<string, any>;
  readonly context: BusinessOperationContext;
}

export interface BusinessOperationContext {
  readonly user: string;
  readonly organization: string;
  readonly location?: string;
  readonly currency?: string;
  readonly timezone?: string;
}

export interface BusinessOperationResult {
  readonly success: boolean;
  readonly result?: any;
  readonly error?: string;
  readonly warnings?: readonly string[];
  readonly metadata?: Record<string, any>;
}

/**
 * Analytics and metrics
 */
export interface BusinessModuleAnalytics {
  readonly period: AnalyticsPeriod;
  readonly metrics: readonly BusinessMetric[];
  readonly trends: readonly BusinessTrend[];
  readonly insights: readonly BusinessInsight[];
  readonly kpis: readonly BusinessKPI[];
}

export interface AnalyticsPeriod {
  readonly start: string;
  readonly end: string;
  readonly granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface BusinessMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly change?: number;
  readonly changePercent?: number;
  readonly target?: number;
}

export interface BusinessTrend {
  readonly metric: string;
  readonly direction: 'up' | 'down' | 'stable';
  readonly strength: 'weak' | 'moderate' | 'strong';
  readonly confidence: number;
}

export interface BusinessInsight {
  readonly type: 'opportunity' | 'risk' | 'anomaly' | 'prediction';
  readonly title: string;
  readonly description: string;
  readonly confidence: number;
  readonly impact: 'low' | 'medium' | 'high';
  readonly actionable: boolean;
}

export interface BusinessKPI {
  readonly name: string;
  readonly current: number;
  readonly target: number;
  readonly unit: string;
  readonly status: 'on-track' | 'at-risk' | 'off-track';
  readonly trend: 'improving' | 'stable' | 'declining';
}

/**
 * Business rule validation
 */
export interface BusinessRuleContext {
  readonly entity: string;
  readonly entityId: string;
  readonly data: any;
  readonly action: string;
  readonly user: string;
  readonly metadata?: Record<string, any>;
}

export interface BusinessRuleValidation {
  readonly valid: boolean;
  readonly violations: readonly RuleViolation[];
  readonly warnings: readonly RuleWarning[];
  readonly appliedRules: readonly string[];
}

export interface RuleViolation {
  readonly ruleId: string;
  readonly message: string;
  readonly field?: string;
  readonly severity: 'error' | 'warning';
  readonly correctable: boolean;
}

export interface RuleWarning {
  readonly ruleId: string;
  readonly message: string;
  readonly recommendation?: string;
}