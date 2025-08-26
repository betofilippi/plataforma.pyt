/**
 * Event Contract
 * 
 * Defines the standard structure and types for events in the
 * inter-module communication system.
 */

/**
 * Base event interface that all module events must implement
 */
export interface BaseEvent {
  /** Unique event identifier */
  readonly id: string;
  
  /** Event type/name */
  readonly type: string;
  
  /** Event version for schema evolution */
  readonly version: string;
  
  /** Source module that emitted the event */
  readonly source: string;
  
  /** Target module(s) for directed events */
  readonly target?: string | readonly string[];
  
  /** Event timestamp (ISO 8601) */
  readonly timestamp: string;
  
  /** Event correlation ID for tracing */
  readonly correlationId?: string;
  
  /** Event causation ID (parent event that caused this one) */
  readonly causationId?: string;
  
  /** Event metadata */
  readonly metadata: EventMetadata;
  
  /** Event payload */
  readonly data: any;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  /** User who triggered the event */
  readonly userId?: string;
  
  /** Session ID */
  readonly sessionId?: string;
  
  /** Request ID that triggered the event */
  readonly requestId?: string;
  
  /** Event priority */
  readonly priority: EventPriority;
  
  /** Event classification */
  readonly classification: EventClassification;
  
  /** Event tags for filtering and routing */
  readonly tags: readonly string[];
  
  /** Event schema version */
  readonly schemaVersion: string;
  
  /** Event TTL in seconds */
  readonly ttl?: number;
  
  /** Whether event should be persisted */
  readonly persistent: boolean;
  
  /** Additional custom metadata */
  readonly custom?: Record<string, any>;
}

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Event classification
 */
export enum EventClassification {
  /** System-level events */
  SYSTEM = 'system',
  
  /** Business domain events */
  DOMAIN = 'domain',
  
  /** User interface events */
  UI = 'ui',
  
  /** Integration events */
  INTEGRATION = 'integration',
  
  /** Security events */
  SECURITY = 'security',
  
  /** Performance/monitoring events */
  MONITORING = 'monitoring',
  
  /** Debugging/diagnostic events */
  DIAGNOSTIC = 'diagnostic',
  
  /** Audit events */
  AUDIT = 'audit',
  
  /** Notification events */
  NOTIFICATION = 'notification'
}

/**
 * Domain-specific event types
 */
export interface SystemEvent extends BaseEvent {
  readonly classification: EventClassification.SYSTEM;
  readonly data: SystemEventData;
}

export interface SystemEventData {
  readonly component: string;
  readonly action: SystemAction;
  readonly status: 'started' | 'completed' | 'failed' | 'cancelled';
  readonly details?: any;
  readonly error?: EventError;
}

export enum SystemAction {
  MODULE_LOADED = 'module-loaded',
  MODULE_STARTED = 'module-started',
  MODULE_STOPPED = 'module-stopped',
  MODULE_FAILED = 'module-failed',
  CONFIG_CHANGED = 'config-changed',
  PERMISSION_GRANTED = 'permission-granted',
  PERMISSION_REVOKED = 'permission-revoked',
  RESOURCE_ALLOCATED = 'resource-allocated',
  RESOURCE_RELEASED = 'resource-released',
  HEALTH_CHECK = 'health-check'
}

export interface DomainEvent extends BaseEvent {
  readonly classification: EventClassification.DOMAIN;
  readonly data: DomainEventData;
}

export interface DomainEventData {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly changes?: EventChanges;
  readonly state?: any;
  readonly business?: BusinessEventContext;
}

export interface BusinessEventContext {
  readonly organizationId: string;
  readonly tenantId?: string;
  readonly workflowId?: string;
  readonly processId?: string;
  readonly businessRules: readonly string[];
}

export interface UIEvent extends BaseEvent {
  readonly classification: EventClassification.UI;
  readonly data: UIEventData;
}

export interface UIEventData {
  readonly component: string;
  readonly element?: string;
  readonly action: UIAction;
  readonly coordinates?: EventCoordinates;
  readonly viewport?: EventViewport;
  readonly interaction?: EventInteraction;
}

export enum UIAction {
  CLICK = 'click',
  HOVER = 'hover',
  FOCUS = 'focus',
  BLUR = 'blur',
  SCROLL = 'scroll',
  RESIZE = 'resize',
  KEYBOARD = 'keyboard',
  TOUCH = 'touch',
  DRAG = 'drag',
  DROP = 'drop',
  RENDER = 'render',
  NAVIGATE = 'navigate'
}

export interface EventCoordinates {
  readonly x: number;
  readonly y: number;
  readonly screenX?: number;
  readonly screenY?: number;
}

export interface EventViewport {
  readonly width: number;
  readonly height: number;
  readonly scrollX: number;
  readonly scrollY: number;
}

export interface EventInteraction {
  readonly type: 'mouse' | 'keyboard' | 'touch' | 'gesture';
  readonly keys?: readonly string[];
  readonly buttons?: number;
  readonly touches?: readonly EventTouch[];
}

export interface EventTouch {
  readonly identifier: number;
  readonly x: number;
  readonly y: number;
  readonly force?: number;
}

export interface IntegrationEvent extends BaseEvent {
  readonly classification: EventClassification.INTEGRATION;
  readonly data: IntegrationEventData;
}

export interface IntegrationEventData {
  readonly integration: string;
  readonly operation: string;
  readonly direction: 'inbound' | 'outbound';
  readonly protocol: string;
  readonly payload?: any;
  readonly response?: any;
  readonly error?: EventError;
}

export interface SecurityEvent extends BaseEvent {
  readonly classification: EventClassification.SECURITY;
  readonly data: SecurityEventData;
}

export interface SecurityEventData {
  readonly category: SecurityCategory;
  readonly action: string;
  readonly resource?: string;
  readonly risk: SecurityRisk;
  readonly actor?: SecurityActor;
  readonly context?: SecurityContext;
}

export enum SecurityCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ACCESS_CONTROL = 'access-control',
  DATA_PROTECTION = 'data-protection',
  THREAT_DETECTION = 'threat-detection',
  INCIDENT = 'incident',
  COMPLIANCE = 'compliance'
}

export enum SecurityRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityActor {
  readonly type: 'user' | 'service' | 'system' | 'anonymous';
  readonly id: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly location?: string;
}

export interface SecurityContext {
  readonly method: string;
  readonly endpoint: string;
  readonly permissions: readonly string[];
  readonly roles: readonly string[];
}

export interface MonitoringEvent extends BaseEvent {
  readonly classification: EventClassification.MONITORING;
  readonly data: MonitoringEventData;
}

export interface MonitoringEventData {
  readonly metric: string;
  readonly value: number;
  readonly unit: string;
  readonly threshold?: MonitoringThreshold;
  readonly status: MonitoringStatus;
  readonly dimensions: Record<string, string>;
}

export interface MonitoringThreshold {
  readonly warning: number;
  readonly critical: number;
  readonly operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
}

export enum MonitoringStatus {
  OK = 'ok',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown'
}

/**
 * Event changes tracking
 */
export interface EventChanges {
  readonly added: Record<string, any>;
  readonly modified: Record<string, EventFieldChange>;
  readonly removed: readonly string[];
}

export interface EventFieldChange {
  readonly oldValue: any;
  readonly newValue: any;
  readonly type: 'primitive' | 'object' | 'array';
}

/**
 * Event error information
 */
export interface EventError {
  readonly code: string;
  readonly message: string;
  readonly details?: any;
  readonly stack?: string;
  readonly recoverable: boolean;
}

/**
 * Event schema definition
 */
export interface EventSchema {
  /** Schema identifier */
  readonly id: string;
  
  /** Schema version */
  readonly version: string;
  
  /** Event type this schema applies to */
  readonly eventType: string;
  
  /** JSON Schema for event data validation */
  readonly schema: EventJSONSchema;
  
  /** Schema metadata */
  readonly metadata: EventSchemaMetadata;
}

export interface EventJSONSchema {
  readonly type: 'object';
  readonly properties: Record<string, EventPropertySchema>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
}

export interface EventPropertySchema {
  readonly type: string;
  readonly description?: string;
  readonly format?: string;
  readonly enum?: readonly any[];
  readonly properties?: Record<string, EventPropertySchema>;
  readonly items?: EventPropertySchema;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
}

export interface EventSchemaMetadata {
  readonly title: string;
  readonly description: string;
  readonly examples: readonly any[];
  readonly deprecated?: boolean;
  readonly migration?: EventSchemaMigration;
}

export interface EventSchemaMigration {
  readonly from: string;
  readonly to: string;
  readonly strategy: 'auto' | 'manual' | 'breaking';
  readonly transformer?: string;
}

/**
 * Event routing and filtering
 */
export interface EventRoute {
  /** Route identifier */
  readonly id: string;
  
  /** Route name */
  readonly name: string;
  
  /** Event filter */
  readonly filter: EventFilter;
  
  /** Route targets */
  readonly targets: readonly EventTarget[];
  
  /** Route configuration */
  readonly config: EventRouteConfig;
}

export interface EventFilter {
  /** Filter type */
  readonly type: EventFilterType;
  
  /** Filter expression */
  readonly expression: string;
  
  /** Filter parameters */
  readonly parameters?: Record<string, any>;
}

export enum EventFilterType {
  /** Simple field-based filtering */
  SIMPLE = 'simple',
  
  /** JSONPath expression */
  JSONPATH = 'jsonpath',
  
  /** Custom filter function */
  CUSTOM = 'custom',
  
  /** SQL-like WHERE clause */
  SQL = 'sql',
  
  /** Regular expression */
  REGEX = 'regex'
}

export interface EventTarget {
  /** Target type */
  readonly type: EventTargetType;
  
  /** Target identifier */
  readonly id: string;
  
  /** Target configuration */
  readonly config?: EventTargetConfig;
}

export enum EventTargetType {
  MODULE = 'module',
  WEBHOOK = 'webhook',
  QUEUE = 'queue',
  DATABASE = 'database',
  STREAM = 'stream',
  EMAIL = 'email',
  SMS = 'sms',
  CUSTOM = 'custom'
}

export interface EventTargetConfig {
  /** Target-specific settings */
  readonly [key: string]: any;
  
  /** Transformation to apply before delivery */
  readonly transform?: EventTransformation;
  
  /** Retry configuration */
  readonly retry?: EventRetryConfig;
  
  /** Rate limiting */
  readonly rateLimit?: EventRateLimitConfig;
}

export interface EventTransformation {
  readonly type: 'map' | 'filter' | 'aggregate' | 'custom';
  readonly expression: string;
  readonly parameters?: Record<string, any>;
}

export interface EventRetryConfig {
  readonly maxAttempts: number;
  readonly delay: number;
  readonly backoff: 'linear' | 'exponential';
  readonly maxDelay: number;
}

export interface EventRateLimitConfig {
  readonly limit: number;
  readonly window: number;
  readonly unit: 'second' | 'minute' | 'hour' | 'day';
}

export interface EventRouteConfig {
  /** Route priority */
  readonly priority: number;
  
  /** Whether route is enabled */
  readonly enabled: boolean;
  
  /** Route description */
  readonly description?: string;
  
  /** Route tags */
  readonly tags: readonly string[];
  
  /** Route metrics */
  readonly metrics: boolean;
  
  /** Route logging */
  readonly logging: EventRouteLogging;
}

export interface EventRouteLogging {
  readonly enabled: boolean;
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly includeData: boolean;
  readonly fields?: readonly string[];
}

/**
 * Event streaming and subscriptions
 */
export interface EventStream {
  /** Stream identifier */
  readonly id: string;
  
  /** Stream name */
  readonly name: string;
  
  /** Stream configuration */
  readonly config: EventStreamConfig;
  
  /** Subscribe to events */
  subscribe(subscriber: EventSubscriber): Promise<EventSubscription>;
  
  /** Publish event to stream */
  publish(event: BaseEvent): Promise<void>;
  
  /** Get stream statistics */
  getStats(): Promise<EventStreamStats>;
}

export interface EventStreamConfig {
  /** Maximum events to retain */
  readonly maxEvents?: number;
  
  /** Event retention period */
  readonly retention?: number;
  
  /** Partitioning strategy */
  readonly partitioning?: EventPartitioning;
  
  /** Replication settings */
  readonly replication?: EventReplication;
  
  /** Compaction settings */
  readonly compaction?: EventCompaction;
}

export interface EventPartitioning {
  readonly strategy: 'none' | 'key' | 'hash' | 'range' | 'custom';
  readonly key?: string;
  readonly partitions: number;
}

export interface EventReplication {
  readonly factor: number;
  readonly async: boolean;
  readonly consistency: 'eventual' | 'strong';
}

export interface EventCompaction {
  readonly enabled: boolean;
  readonly strategy: 'key' | 'time' | 'size';
  readonly threshold: number;
}

export interface EventSubscriber {
  /** Subscriber identifier */
  readonly id: string;
  
  /** Event handler */
  readonly handler: EventHandler;
  
  /** Subscriber configuration */
  readonly config: EventSubscriberConfig;
}

export interface EventHandler {
  (event: BaseEvent): Promise<EventHandlerResult>;
}

export interface EventHandlerResult {
  /** Whether event was handled successfully */
  readonly success: boolean;
  
  /** Result data */
  readonly result?: any;
  
  /** Error if handling failed */
  readonly error?: EventError;
  
  /** Whether to acknowledge the event */
  readonly acknowledge: boolean;
  
  /** Whether to retry on failure */
  readonly retry: boolean;
}

export interface EventSubscriberConfig {
  /** Event filter */
  readonly filter?: EventFilter;
  
  /** Starting position */
  readonly startFrom: 'beginning' | 'latest' | 'timestamp' | 'offset';
  
  /** Specific timestamp or offset */
  readonly position?: string | number;
  
  /** Batch configuration */
  readonly batch?: EventBatchConfig;
  
  /** Error handling */
  readonly errorHandling: EventErrorHandling;
}

export interface EventBatchConfig {
  readonly enabled: boolean;
  readonly size: number;
  readonly timeout: number;
}

export interface EventErrorHandling {
  readonly strategy: 'ignore' | 'retry' | 'deadletter' | 'custom';
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly deadLetterTopic?: string;
  readonly customHandler?: string;
}

export interface EventSubscription {
  /** Subscription identifier */
  readonly id: string;
  
  /** Subscription status */
  readonly status: EventSubscriptionStatus;
  
  /** Pause subscription */
  pause(): Promise<void>;
  
  /** Resume subscription */
  resume(): Promise<void>;
  
  /** Cancel subscription */
  cancel(): Promise<void>;
  
  /** Get subscription metrics */
  getMetrics(): Promise<EventSubscriptionMetrics>;
}

export enum EventSubscriptionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

export interface EventSubscriptionMetrics {
  readonly eventsReceived: number;
  readonly eventsProcessed: number;
  readonly eventsFailed: number;
  readonly averageProcessingTime: number;
  readonly lastProcessedAt?: string;
  readonly lag: number;
}

export interface EventStreamStats {
  readonly totalEvents: number;
  readonly eventsPerSecond: number;
  readonly subscribers: number;
  readonly partitions: number;
  readonly size: number;
  readonly oldestEvent?: string;
  readonly newestEvent?: string;
}

/**
 * Event store interface
 */
export interface EventStore {
  /** Store an event */
  store(event: BaseEvent): Promise<void>;
  
  /** Retrieve events by criteria */
  query(criteria: EventQuery): Promise<readonly BaseEvent[]>;
  
  /** Get event by ID */
  getById(id: string): Promise<BaseEvent | null>;
  
  /** Get events by correlation ID */
  getByCorrelationId(correlationId: string): Promise<readonly BaseEvent[]>;
  
  /** Get event stream */
  getStream(streamId: string): Promise<readonly BaseEvent[]>;
  
  /** Create event snapshot */
  createSnapshot(streamId: string): Promise<EventSnapshot>;
  
  /** Restore from snapshot */
  restoreFromSnapshot(snapshot: EventSnapshot): Promise<void>;
}

export interface EventQuery {
  readonly streamId?: string;
  readonly eventTypes?: readonly string[];
  readonly sources?: readonly string[];
  readonly startTime?: string;
  readonly endTime?: string;
  readonly correlationIds?: readonly string[];
  readonly tags?: readonly string[];
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: 'timestamp' | 'sequence';
  readonly ascending?: boolean;
}

export interface EventSnapshot {
  readonly streamId: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly state: any;
  readonly events: readonly BaseEvent[];
}

/**
 * Event utilities and helpers
 */
export class EventUtils {
  /**
   * Create a new event with generated metadata
   */
  static createEvent<T extends BaseEvent>(
    type: string,
    source: string,
    data: T['data'],
    options?: Partial<EventCreateOptions>
  ): T {
    const now = new Date().toISOString();
    const id = options?.id || EventUtils.generateEventId();
    
    return {
      id,
      type,
      version: options?.version || '1.0.0',
      source,
      target: options?.target,
      timestamp: now,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      metadata: {
        userId: options?.userId,
        sessionId: options?.sessionId,
        requestId: options?.requestId,
        priority: options?.priority || EventPriority.NORMAL,
        classification: options?.classification || EventClassification.DOMAIN,
        tags: options?.tags || [],
        schemaVersion: options?.schemaVersion || '1.0.0',
        ttl: options?.ttl,
        persistent: options?.persistent ?? true,
        custom: options?.customMetadata
      },
      data
    } as T;
  }
  
  /**
   * Generate unique event ID
   */
  static generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `evt_${timestamp}_${random}`;
  }
  
  /**
   * Validate event against schema
   */
  static validateEvent(_event: BaseEvent, _schema: EventSchema): EventValidationResult {
    // Simplified validation - real implementation would use JSON Schema validator
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }
  
  /**
   * Transform event data
   */
  static transformEvent(event: BaseEvent, _transformation: EventTransformation): BaseEvent {
    // Simplified transformation - real implementation would handle different transformation types
    return event;
  }
  
  /**
   * Check if event matches filter
   */
  static matchesFilter(event: BaseEvent, filter: EventFilter): boolean {
    switch (filter.type) {
      case EventFilterType.SIMPLE:
        return EventUtils.matchesSimpleFilter(event, filter.expression);
      case EventFilterType.JSONPATH:
        return EventUtils.matchesJsonPathFilter(event, filter.expression);
      default:
        return false;
    }
  }
  
  private static matchesSimpleFilter(event: BaseEvent, expression: string): boolean {
    // Simplified implementation
    const [field, operator, value] = expression.split(' ');
    const eventValue = EventUtils.getEventField(event, field);
    
    switch (operator) {
      case '=':
        return eventValue === value;
      case '!=':
        return eventValue !== value;
      case 'in':
        return value.split(',').includes(eventValue);
      default:
        return false;
    }
  }
  
  private static matchesJsonPathFilter(_event: BaseEvent, _expression: string): boolean {
    // Would use JSONPath library in real implementation
    return false;
  }
  
  private static getEventField(event: BaseEvent, field: string): any {
    const parts = field.split('.');
    let value: any = event;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        break;
      }
      value = value[part];
    }
    
    return value;
  }
}

export interface EventCreateOptions {
  readonly id?: string;
  readonly version?: string;
  readonly target?: string | readonly string[];
  readonly correlationId?: string;
  readonly causationId?: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly requestId?: string;
  readonly priority?: EventPriority;
  readonly classification?: EventClassification;
  readonly tags?: readonly string[];
  readonly schemaVersion?: string;
  readonly ttl?: number;
  readonly persistent?: boolean;
  readonly customMetadata?: Record<string, any>;
}

export interface EventValidationResult {
  readonly valid: boolean;
  readonly errors: readonly EventValidationError[];
  readonly warnings: readonly EventValidationWarning[];
}

export interface EventValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface EventValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly suggestion?: string;
}