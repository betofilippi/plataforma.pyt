/**
 * Module communication system with event bus, shared state, and typed events
 */

import EventEmitter from 'eventemitter3';
import type {
  ModuleCommunication,
  ModuleEvent,
  SharedStateEntry,
  ModuleDiscovery,
  ModuleCommunicationConfig
} from '../types';

/**
 * Default communication configuration
 */
const DEFAULT_CONFIG: Required<ModuleCommunicationConfig> = {
  enablePersistence: true,
  maxEventHistory: 1000,
  enableEventReplay: true,
  debug: false
};

/**
 * Module communication implementation
 */
export class ModuleCommunicationImpl implements ModuleCommunication {
  private eventEmitter: EventEmitter;
  private config: Required<ModuleCommunicationConfig>;
  private eventHistory: ModuleEvent[] = [];
  private sharedState = new Map<string, SharedStateEntry>();
  private moduleRegistry = new Set<string>();
  private eventSubscriptions = new Map<string, Set<Function>>();

  constructor(config: ModuleCommunicationConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventEmitter = new EventEmitter();
    
    // Set up global error handling
    this.eventEmitter.on('error', (error) => {
      console.error('[ModuleCommunication] EventEmitter error:', error);
    });

    // Restore state from storage if enabled
    if (this.config.enablePersistence) {
      this.restoreFromStorage().catch(error => {
        console.warn('[ModuleCommunication] Failed to restore state:', error);
      });
    }

    // Set up periodic cleanup
    this.setupCleanup();
  }

  /**
   * Subscribe to events
   */
  on<T = any>(eventType: string, handler: (event: ModuleEvent<T>) => void): () => void {
    const wrappedHandler = (event: ModuleEvent<T>) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[ModuleCommunication] Error in event handler for "${eventType}":`, error);
      }
    };

    this.eventEmitter.on(eventType, wrappedHandler);
    
    // Track subscription for cleanup
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(wrappedHandler);

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Subscribed to event "${eventType}"`);
    }

    // Return unsubscribe function
    return () => {
      this.eventEmitter.off(eventType, wrappedHandler);
      this.eventSubscriptions.get(eventType)?.delete(wrappedHandler);
      
      if (this.config.debug) {
        console.log(`[ModuleCommunication] Unsubscribed from event "${eventType}"`);
      }
    };
  }

  /**
   * Subscribe to events from specific module
   */
  onFrom<T = any>(
    eventType: string, 
    source: string, 
    handler: (event: ModuleEvent<T>) => void
  ): () => void {
    const filteredHandler = (event: ModuleEvent<T>) => {
      if (event.source === source) {
        handler(event);
      }
    };

    return this.on(eventType, filteredHandler);
  }

  /**
   * Emit event to all modules
   */
  emit<T = any>(eventType: string, payload: T, source: string): void {
    const event: ModuleEvent<T> = {
      type: eventType,
      source,
      payload,
      timestamp: Date.now(),
      id: this.generateEventId()
    };

    // Add to history
    this.addToHistory(event);

    // Emit event
    this.eventEmitter.emit(eventType, event);

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Emitted event "${eventType}" from "${source}":`, event);
    }

    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      this.persistEventHistory().catch(error => {
        console.warn('[ModuleCommunication] Failed to persist event history:', error);
      });
    }
  }

  /**
   * Emit event to specific module
   */
  emitTo<T = any>(eventType: string, payload: T, source: string, target: string): void {
    const event: ModuleEvent<T> = {
      type: eventType,
      source,
      target,
      payload,
      timestamp: Date.now(),
      id: this.generateEventId()
    };

    // Add to history
    this.addToHistory(event);

    // Create targeted event type
    const targetedEventType = `${eventType}:${target}`;
    
    // Emit both general and targeted events
    this.eventEmitter.emit(eventType, event);
    this.eventEmitter.emit(targetedEventType, event);

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Emitted targeted event "${eventType}" from "${source}" to "${target}":`, event);
    }

    // Persist to storage if enabled
    if (this.config.enablePersistence) {
      this.persistEventHistory().catch(error => {
        console.warn('[ModuleCommunication] Failed to persist event history:', error);
      });
    }
  }

  /**
   * Get shared state
   */
  getSharedState<T = any>(key: string): T | undefined {
    const entry = this.sharedState.get(key);
    return entry?.value as T;
  }

  /**
   * Set shared state
   */
  setSharedState<T = any>(key: string, value: T, owner: string, persistent = false): void {
    const entry: SharedStateEntry<T> = {
      key,
      value,
      owner,
      timestamp: Date.now(),
      persistent,
      metadata: {}
    };

    this.sharedState.set(key, entry);

    // Emit state change event
    this.emit('shared-state:change', { key, value, owner }, 'system');

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Set shared state "${key}" by "${owner}":`, value);
    }

    // Persist if enabled and marked as persistent
    if (this.config.enablePersistence && persistent) {
      this.persistSharedState().catch(error => {
        console.warn('[ModuleCommunication] Failed to persist shared state:', error);
      });
    }
  }

  /**
   * Remove shared state
   */
  removeSharedState(key: string, owner: string): boolean {
    const entry = this.sharedState.get(key);
    
    // Only allow removal by owner or system
    if (entry && (entry.owner === owner || owner === 'system')) {
      this.sharedState.delete(key);
      
      // Emit state removal event
      this.emit('shared-state:remove', { key, owner }, 'system');

      if (this.config.debug) {
        console.log(`[ModuleCommunication] Removed shared state "${key}" by "${owner}"`);
      }

      // Persist if enabled
      if (this.config.enablePersistence) {
        this.persistSharedState().catch(error => {
          console.warn('[ModuleCommunication] Failed to persist shared state:', error);
        });
      }

      return true;
    }

    return false;
  }

  /**
   * List all shared state keys
   */
  listSharedState(): string[] {
    return Array.from(this.sharedState.keys());
  }

  /**
   * Get event history
   */
  getEventHistory(eventType?: string): ModuleEvent[] {
    if (!eventType) {
      return [...this.eventHistory];
    }

    return this.eventHistory.filter(event => event.type === eventType);
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
    
    if (this.config.enablePersistence) {
      this.persistEventHistory().catch(error => {
        console.warn('[ModuleCommunication] Failed to persist cleared event history:', error);
      });
    }
  }

  /**
   * Discover available modules
   */
  async discoverModules(): Promise<ModuleDiscovery[]> {
    const discoveries: ModuleDiscovery[] = [];

    // Emit discovery request
    this.emit('module:discovery-request', {}, 'system');

    // Wait a bit for responses
    return new Promise((resolve) => {
      const discoveries: ModuleDiscovery[] = [];
      
      const unsubscribe = this.on('module:discovery-response', (event) => {
        discoveries.push(event.payload);
      });

      // Wait for responses
      setTimeout(() => {
        unsubscribe();
        
        // Emit discovery complete event
        this.emit('module:discovered', { modules: discoveries }, 'system');
        
        resolve(discoveries);
      }, 1000);
    });
  }

  /**
   * Register module for communication
   */
  registerModule(moduleName: string): void {
    this.moduleRegistry.add(moduleName);
    
    // Replay events for new module if enabled
    if (this.config.enableEventReplay) {
      this.replayEventsForModule(moduleName);
    }

    // Emit module registration event
    this.emit('module:registered', { moduleName }, 'system');

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Registered module "${moduleName}"`);
    }
  }

  /**
   * Unregister module from communication
   */
  unregisterModule(moduleName: string): void {
    this.moduleRegistry.delete(moduleName);

    // Clean up state owned by this module
    const keysToRemove: string[] = [];
    for (const [key, entry] of this.sharedState.entries()) {
      if (entry.owner === moduleName) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.sharedState.delete(key));

    // Emit module unregistration event
    this.emit('module:unregistered', { moduleName }, 'system');

    if (this.config.debug) {
      console.log(`[ModuleCommunication] Unregistered module "${moduleName}"`);
    }
  }

  /**
   * Get communication statistics
   */
  getStats() {
    return {
      registeredModules: Array.from(this.moduleRegistry),
      eventHistory: {
        total: this.eventHistory.length,
        maxSize: this.config.maxEventHistory,
        byType: this.getEventHistoryByType()
      },
      sharedState: {
        total: this.sharedState.size,
        persistent: Array.from(this.sharedState.values()).filter(entry => entry.persistent).length,
        byOwner: this.getSharedStateByOwner()
      },
      eventSubscriptions: {
        total: Array.from(this.eventSubscriptions.values()).reduce((sum, set) => sum + set.size, 0),
        byType: Object.fromEntries(
          Array.from(this.eventSubscriptions.entries()).map(([type, set]) => [type, set.size])
        )
      }
    };
  }

  /**
   * Add event to history
   */
  private addToHistory(event: ModuleEvent): void {
    this.eventHistory.push(event);

    // Maintain history size limit
    if (this.eventHistory.length > this.config.maxEventHistory) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Replay events for a newly registered module
   */
  private replayEventsForModule(moduleName: string): void {
    // Replay recent events that might be relevant
    const recentEvents = this.eventHistory
      .filter(event => event.timestamp > Date.now() - 60000) // Last minute
      .filter(event => event.type.startsWith('shared-state:') || event.type.startsWith('module:'));

    recentEvents.forEach(event => {
      // Create a replay event
      const replayEvent: ModuleEvent = {
        ...event,
        type: `replay:${event.type}`,
        target: moduleName,
        id: this.generateEventId()
      };

      this.eventEmitter.emit(`replay:${event.type}`, replayEvent);
    });

    if (this.config.debug && recentEvents.length > 0) {
      console.log(`[ModuleCommunication] Replayed ${recentEvents.length} events for module "${moduleName}"`);
    }
  }

  /**
   * Set up periodic cleanup
   */
  private setupCleanup(): void {
    // Clean up old events every 5 minutes
    setInterval(() => {
      this.cleanupOldEvents();
    }, 5 * 60 * 1000);

    // Clean up expired shared state every hour
    setInterval(() => {
      this.cleanupExpiredSharedState();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const initialLength = this.eventHistory.length;
    
    this.eventHistory = this.eventHistory.filter(event => event.timestamp > cutoffTime);
    
    const removedCount = initialLength - this.eventHistory.length;
    if (removedCount > 0 && this.config.debug) {
      console.log(`[ModuleCommunication] Cleaned up ${removedCount} old events`);
    }
  }

  /**
   * Clean up expired shared state
   */
  private cleanupExpiredSharedState(): void {
    // This is a placeholder - in practice, you might want to implement TTL for shared state
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [key, entry] of this.sharedState.entries()) {
      if (!entry.persistent && entry.timestamp < cutoffTime) {
        this.sharedState.delete(key);
        
        if (this.config.debug) {
          console.log(`[ModuleCommunication] Cleaned up expired shared state "${key}"`);
        }
      }
    }
  }

  /**
   * Persist event history to storage
   */
  private async persistEventHistory(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Only persist the last 100 events to avoid storage bloat
      const eventsToStore = this.eventHistory.slice(-100);
      
      localStorage.setItem(
        'plataforma-module-communication-events',
        JSON.stringify(eventsToStore)
      );
    } catch (error) {
      console.warn('[ModuleCommunication] Failed to persist event history:', error);
    }
  }

  /**
   * Persist shared state to storage
   */
  private async persistSharedState(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Only persist marked as persistent
      const persistentState = Object.fromEntries(
        Array.from(this.sharedState.entries())
          .filter(([, entry]) => entry.persistent)
      );

      localStorage.setItem(
        'plataforma-module-communication-state',
        JSON.stringify(persistentState)
      );
    } catch (error) {
      console.warn('[ModuleCommunication] Failed to persist shared state:', error);
    }
  }

  /**
   * Restore state from storage
   */
  private async restoreFromStorage(): Promise<void> {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      // Restore event history
      const eventsStr = localStorage.getItem('plataforma-module-communication-events');
      if (eventsStr) {
        const events = JSON.parse(eventsStr) as ModuleEvent[];
        this.eventHistory = events;
      }

      // Restore shared state
      const stateStr = localStorage.getItem('plataforma-module-communication-state');
      if (stateStr) {
        const state = JSON.parse(stateStr) as Record<string, SharedStateEntry>;
        this.sharedState = new Map(Object.entries(state));
      }

      if (this.config.debug) {
        console.log(`[ModuleCommunication] Restored ${this.eventHistory.length} events and ${this.sharedState.size} state entries`);
      }
    } catch (error) {
      console.warn('[ModuleCommunication] Failed to restore from storage:', error);
    }
  }

  /**
   * Get event history by type
   */
  private getEventHistoryByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const event of this.eventHistory) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get shared state by owner
   */
  private getSharedStateByOwner(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const entry of this.sharedState.values()) {
      counts[entry.owner] = (counts[entry.owner] || 0) + 1;
    }

    return counts;
  }
}

/**
 * Create a module communication instance
 */
export function createModuleCommunication(config?: ModuleCommunicationConfig): ModuleCommunication {
  return new ModuleCommunicationImpl(config);
}