import { EventEmitter } from 'eventemitter3';
import type { PluginEvent } from '../types';

/**
 * Plugin Event System
 * Manages event-based communication between plugins and the platform
 */
export class PluginEventSystem extends EventEmitter {
  private eventHistory: PluginEvent[] = [];
  private maxHistorySize: number;
  private eventFilters = new Map<string, EventFilter>();
  private eventMiddleware: EventMiddleware[] = [];

  constructor(options: PluginEventSystemOptions = {}) {
    super();
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.setupBuiltInEvents();
  }

  /**
   * Emit a plugin event
   */
  emitPluginEvent(type: string, pluginId: string, data?: any): void {
    const event: PluginEvent = {
      type,
      pluginId,
      timestamp: new Date(),
      data
    };

    // Apply middleware
    let processedEvent = event;
    for (const middleware of this.eventMiddleware) {
      processedEvent = middleware(processedEvent);
      if (!processedEvent) {
        return; // Event was filtered out
      }
    }

    // Apply filters
    const filter = this.eventFilters.get(type);
    if (filter && !filter(processedEvent)) {
      return; // Event was filtered out
    }

    // Add to history
    this.addToHistory(processedEvent);

    // Emit the event
    this.emit(type, processedEvent);
    this.emit('event', processedEvent);
  }

  /**
   * Subscribe to plugin events
   */
  onPluginEvent(
    type: string | string[], 
    listener: (event: PluginEvent) => void,
    options: EventSubscriptionOptions = {}
  ): () => void {
    const types = Array.isArray(type) ? type : [type];
    const unsubscribeFunctions: (() => void)[] = [];

    for (const eventType of types) {
      const wrappedListener = (event: PluginEvent) => {
        // Apply plugin filter
        if (options.pluginId && event.pluginId !== options.pluginId) {
          return;
        }

        // Apply data filter
        if (options.dataFilter && !options.dataFilter(event.data)) {
          return;
        }

        // Apply throttling
        if (options.throttle) {
          this.throttleEvent(eventType, listener, event, options.throttle);
        } else {
          listener(event);
        }
      };

      this.on(eventType, wrappedListener);
      
      unsubscribeFunctions.push(() => {
        this.off(eventType, wrappedListener);
      });
    }

    // Return unsubscribe function
    return () => {
      unsubscribeFunctions.forEach(fn => fn());
    };
  }

  /**
   * Subscribe to events once
   */
  oncePluginEvent(
    type: string,
    listener: (event: PluginEvent) => void,
    options: EventSubscriptionOptions = {}
  ): void {
    const wrappedListener = (event: PluginEvent) => {
      // Apply filters
      if (options.pluginId && event.pluginId !== options.pluginId) {
        return;
      }

      if (options.dataFilter && !options.dataFilter(event.data)) {
        return;
      }

      listener(event);
    };

    this.once(type, wrappedListener);
  }

  /**
   * Wait for an event
   */
  waitForEvent(
    type: string,
    options: EventWaitOptions = {}
  ): Promise<PluginEvent> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 10000; // 10 second default
      let timeoutId: NodeJS.Timeout;

      const listener = (event: PluginEvent) => {
        // Apply filters
        if (options.pluginId && event.pluginId !== options.pluginId) {
          return;
        }

        if (options.condition && !options.condition(event)) {
          return;
        }

        clearTimeout(timeoutId);
        resolve(event);
      };

      this.once(type, listener);

      timeoutId = setTimeout(() => {
        this.off(type, listener);
        reject(new Error(`Event '${type}' timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Get event history
   */
  getEventHistory(options: EventHistoryOptions = {}): PluginEvent[] {
    let history = this.eventHistory;

    // Filter by plugin
    if (options.pluginId) {
      history = history.filter(event => event.pluginId === options.pluginId);
    }

    // Filter by type
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      history = history.filter(event => types.includes(event.type));
    }

    // Filter by time range
    if (options.since) {
      history = history.filter(event => event.timestamp >= options.since!);
    }

    if (options.until) {
      history = history.filter(event => event.timestamp <= options.until!);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Add event filter
   */
  addEventFilter(type: string, filter: EventFilter): void {
    this.eventFilters.set(type, filter);
  }

  /**
   * Remove event filter
   */
  removeEventFilter(type: string): void {
    this.eventFilters.delete(type);
  }

  /**
   * Add event middleware
   */
  addMiddleware(middleware: EventMiddleware): void {
    this.eventMiddleware.push(middleware);
  }

  /**
   * Remove event middleware
   */
  removeMiddleware(middleware: EventMiddleware): void {
    const index = this.eventMiddleware.indexOf(middleware);
    if (index !== -1) {
      this.eventMiddleware.splice(index, 1);
    }
  }

  /**
   * Get event statistics
   */
  getEventStats(): EventStatistics {
    const stats: EventStatistics = {
      totalEvents: this.eventHistory.length,
      eventsByType: {},
      eventsByPlugin: {},
      recentActivity: {
        lastHour: 0,
        lastDay: 0,
        lastWeek: 0
      }
    };

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const event of this.eventHistory) {
      // Count by type
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;

      // Count by plugin
      stats.eventsByPlugin[event.pluginId] = (stats.eventsByPlugin[event.pluginId] || 0) + 1;

      // Count recent activity
      if (event.timestamp >= oneHourAgo) {
        stats.recentActivity.lastHour++;
      }
      if (event.timestamp >= oneDayAgo) {
        stats.recentActivity.lastDay++;
      }
      if (event.timestamp >= oneWeekAgo) {
        stats.recentActivity.lastWeek++;
      }
    }

    return stats;
  }

  /**
   * Create event stream for real-time monitoring
   */
  createEventStream(options: EventStreamOptions = {}): EventStream {
    const stream = new EventStream(this, options);
    return stream;
  }

  // Built-in Event Emitters

  /**
   * Plugin lifecycle events
   */
  emitPluginLoading(pluginId: string): void {
    this.emitPluginEvent('plugin:loading', pluginId);
  }

  emitPluginLoaded(pluginId: string, data?: any): void {
    this.emitPluginEvent('plugin:loaded', pluginId, data);
  }

  emitPluginActivated(pluginId: string): void {
    this.emitPluginEvent('plugin:activated', pluginId);
  }

  emitPluginDeactivated(pluginId: string): void {
    this.emitPluginEvent('plugin:deactivated', pluginId);
  }

  emitPluginUnloaded(pluginId: string): void {
    this.emitPluginEvent('plugin:unloaded', pluginId);
  }

  emitPluginError(pluginId: string, error: Error): void {
    this.emitPluginEvent('plugin:error', pluginId, { error: error.message, stack: error.stack });
  }

  /**
   * System events
   */
  emitSystemReady(): void {
    this.emitPluginEvent('system:ready', 'system');
  }

  emitSystemShutdown(): void {
    this.emitPluginEvent('system:shutdown', 'system');
  }

  /**
   * Permission events
   */
  emitPermissionRequested(pluginId: string, permission: string): void {
    this.emitPluginEvent('permission:requested', pluginId, { permission });
  }

  emitPermissionGranted(pluginId: string, permission: string): void {
    this.emitPluginEvent('permission:granted', pluginId, { permission });
  }

  emitPermissionDenied(pluginId: string, permission: string): void {
    this.emitPluginEvent('permission:denied', pluginId, { permission });
  }

  // Private Methods

  private setupBuiltInEvents(): void {
    // Set up built-in event types and their default configurations
    const builtInEvents = [
      'plugin:loading',
      'plugin:loaded',
      'plugin:activated',
      'plugin:deactivated',
      'plugin:unloaded',
      'plugin:error',
      'system:ready',
      'system:shutdown',
      'permission:requested',
      'permission:granted',
      'permission:denied'
    ];

    // Pre-register built-in events (no special setup needed with EventEmitter)
  }

  private addToHistory(event: PluginEvent): void {
    this.eventHistory.unshift(event);
    
    // Trim history to max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
    }
  }

  private throttledListeners = new Map<string, { lastCall: number; timer?: NodeJS.Timeout }>();

  private throttleEvent(
    eventType: string, 
    listener: (event: PluginEvent) => void, 
    event: PluginEvent, 
    throttleMs: number
  ): void {
    const key = `${eventType}_${listener.toString()}`;
    const throttleData = this.throttledListeners.get(key);
    const now = Date.now();

    if (!throttleData || now - throttleData.lastCall >= throttleMs) {
      // Execute immediately
      listener(event);
      this.throttledListeners.set(key, { lastCall: now });
    } else {
      // Schedule for later
      if (throttleData.timer) {
        clearTimeout(throttleData.timer);
      }

      const remainingTime = throttleMs - (now - throttleData.lastCall);
      throttleData.timer = setTimeout(() => {
        listener(event);
        this.throttledListeners.set(key, { lastCall: Date.now() });
      }, remainingTime);
    }
  }
}

/**
 * Event Stream for real-time monitoring
 */
export class EventStream {
  private listeners: ((event: PluginEvent) => void)[] = [];
  private isActive = true;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private eventSystem: PluginEventSystem,
    private options: EventStreamOptions
  ) {
    this.setupStream();
  }

  /**
   * Subscribe to the stream
   */
  subscribe(listener: (event: PluginEvent) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Close the stream
   */
  close(): void {
    this.isActive = false;
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners.length = 0;
  }

  private setupStream(): void {
    const types = this.options.types || ['*'];
    
    this.unsubscribe = this.eventSystem.onPluginEvent(
      types,
      (event) => {
        if (!this.isActive) return;
        
        // Apply stream-specific filters
        if (this.options.filter && !this.options.filter(event)) {
          return;
        }

        // Notify all listeners
        for (const listener of this.listeners) {
          try {
            listener(event);
          } catch (error) {
            console.error('Error in event stream listener:', error);
          }
        }
      },
      {
        pluginId: this.options.pluginId,
        throttle: this.options.throttle
      }
    );
  }
}

// Default instance
export const pluginEvents = new PluginEventSystem();

// Types and Interfaces

export interface PluginEventSystemOptions {
  maxHistorySize?: number;
}

export interface EventSubscriptionOptions {
  pluginId?: string;
  dataFilter?: (data: any) => boolean;
  throttle?: number;
}

export interface EventWaitOptions {
  pluginId?: string;
  condition?: (event: PluginEvent) => boolean;
  timeout?: number;
}

export interface EventHistoryOptions {
  pluginId?: string;
  type?: string | string[];
  since?: Date;
  until?: Date;
  limit?: number;
}

export interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByPlugin: Record<string, number>;
  recentActivity: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
  };
}

export interface EventStreamOptions {
  types?: string[];
  pluginId?: string;
  filter?: (event: PluginEvent) => boolean;
  throttle?: number;
}

export type EventFilter = (event: PluginEvent) => boolean;
export type EventMiddleware = (event: PluginEvent) => PluginEvent | null;