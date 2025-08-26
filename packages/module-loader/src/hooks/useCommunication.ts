/**
 * Module communication hook - Hook for inter-module communication
 */

import { useState, useEffect, useCallback } from 'react';
import { useModuleContext } from '../react/ModuleProvider';
import type { UseCommunicationResult, ModuleEvent } from '../types';

/**
 * Hook for inter-module communication
 */
export function useCommunication(moduleName?: string): UseCommunicationResult {
  const { communication } = useModuleContext();
  const [eventHistory, setEventHistory] = useState<ModuleEvent[]>([]);
  const [sharedState, setSharedState] = useState<Record<string, any>>({});

  // Update event history
  useEffect(() => {
    setEventHistory(communication.getEventHistory());
    
    // Listen for all events to update history
    const unsubscribe = communication.on('*', () => {
      setEventHistory(communication.getEventHistory());
    });

    return unsubscribe;
  }, [communication]);

  // Update shared state
  useEffect(() => {
    const updateSharedState = () => {
      const keys = communication.listSharedState();
      const state: Record<string, any> = {};
      
      keys.forEach(key => {
        state[key] = communication.getSharedState(key);
      });
      
      setSharedState(state);
    };

    // Initial load
    updateSharedState();

    // Listen for shared state changes
    const unsubscribe = communication.on('shared-state:change', updateSharedState);

    return unsubscribe;
  }, [communication]);

  // Emit event function
  const emit = useCallback(<T = any>(eventType: string, payload: T) => {
    const source = moduleName || 'unknown';
    communication.emit(eventType, payload, source);
  }, [communication, moduleName]);

  // Subscribe to events function
  const on = useCallback(<T = any>(
    eventType: string, 
    handler: (event: ModuleEvent<T>) => void
  ) => {
    return communication.on(eventType, handler);
  }, [communication]);

  // Get shared state function
  const getSharedState = useCallback(<T = any>(key: string): T | undefined => {
    return communication.getSharedState<T>(key);
  }, [communication]);

  // Set shared state function
  const setSharedStateValue = useCallback(<T = any>(
    key: string, 
    value: T, 
    persistent = false
  ) => {
    const owner = moduleName || 'unknown';
    communication.setSharedState(key, value, owner, persistent);
  }, [communication, moduleName]);

  return {
    emit,
    on,
    getSharedState,
    setSharedState: setSharedStateValue,
    eventHistory,
    sharedState
  };
}

/**
 * Hook for typed event communication
 */
export function useTypedCommunication<T extends Record<string, any>>(
  moduleName?: string
) {
  const { emit, on, ...rest } = useCommunication(moduleName);

  const typedEmit = useCallback(<K extends keyof T>(
    eventType: K,
    payload: T[K]
  ) => {
    emit(eventType as string, payload);
  }, [emit]);

  const typedOn = useCallback(<K extends keyof T>(
    eventType: K,
    handler: (event: ModuleEvent<T[K]>) => void
  ) => {
    return on(eventType as string, handler);
  }, [on]);

  return {
    emit: typedEmit,
    on: typedOn,
    ...rest
  };
}

/**
 * Hook for module discovery
 */
export function useModuleDiscovery() {
  const { communication } = useModuleContext();
  const [discoveries, setDiscoveries] = useState<any[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const discover = useCallback(async () => {
    setDiscovering(true);
    try {
      const modules = await communication.discoverModules();
      setDiscoveries(modules);
      return modules;
    } catch (error) {
      console.error('Module discovery failed:', error);
      throw error;
    } finally {
      setDiscovering(false);
    }
  }, [communication]);

  // Listen for discovery events
  useEffect(() => {
    const unsubscribe = communication.on('module:discovered', (event) => {
      setDiscoveries(event.payload.modules);
    });

    return unsubscribe;
  }, [communication]);

  return {
    discoveries,
    discovering,
    discover
  };
}

/**
 * Hook for persistent shared state
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  moduleName?: string
): [T, (value: T) => void] {
  const { getSharedState, setSharedState } = useCommunication(moduleName);
  
  const [value, setValue] = useState<T>(() => {
    const stored = getSharedState<T>(key);
    return stored !== undefined ? stored : defaultValue;
  });

  const setValueAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    setSharedState(key, newValue, true); // Mark as persistent
  }, [key, setSharedState]);

  // Listen for external changes to this key
  useEffect(() => {
    const { communication } = useModuleContext();
    
    const unsubscribe = communication.on('shared-state:change', (event) => {
      if (event.payload.key === key) {
        setValue(event.payload.value);
      }
    });

    return unsubscribe;
  }, [key]);

  return [value, setValueAndPersist];
}

/**
 * Hook for event replay
 */
export function useEventReplay(
  eventTypes: string[],
  handler: (event: ModuleEvent) => void
) {
  const { communication } = useModuleContext();

  useEffect(() => {
    // Get historical events for the specified types
    const history = communication.getEventHistory();
    const relevantEvents = history.filter(event => 
      eventTypes.includes(event.type)
    );

    // Replay events
    relevantEvents.forEach(handler);

    // Subscribe to new events
    const unsubscribes = eventTypes.map(eventType => 
      communication.on(eventType, handler)
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [eventTypes, handler, communication]);
}

/**
 * Hook for cross-module state synchronization
 */
export function useCrossModuleSync<T>(
  key: string,
  initialValue: T,
  moduleName?: string
): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [syncing, setSyncing] = useState(false);
  const { getSharedState, setSharedState, on } = useCommunication(moduleName);

  // Initialize from shared state
  useEffect(() => {
    const sharedValue = getSharedState<T>(key);
    if (sharedValue !== undefined) {
      setValue(sharedValue);
    }
  }, [key, getSharedState]);

  // Sync function
  const syncValue = useCallback((newValue: T) => {
    setSyncing(true);
    setValue(newValue);
    setSharedState(key, newValue, true);
    
    // Reset syncing state after a brief delay
    setTimeout(() => setSyncing(false), 100);
  }, [key, setSharedState]);

  // Listen for external changes
  useEffect(() => {
    const unsubscribe = on('shared-state:change', (event) => {
      if (event.payload.key === key && event.source !== moduleName) {
        setValue(event.payload.value);
      }
    });

    return unsubscribe;
  }, [key, moduleName, on]);

  return [value, syncValue, syncing];
}