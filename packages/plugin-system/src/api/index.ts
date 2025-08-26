/**
 * Plugin API Layer
 * 
 * This module exports the API layer components that provide the interface
 * between plugins and the platform:
 * - PluginContext: Runtime context for plugins
 * - PluginHooks: Extension points and hooks
 * - PluginEvents: Event-based communication
 * - PluginCapabilities: Capability definitions and management
 */

export { PluginContextImpl } from './PluginContext';
export type { PluginContextOptions } from './PluginContext';

export { 
  PluginHookSystem,
  pluginHooks,
  createPluginHooks,
  registerPluginHooks
} from './PluginHooks';
export type {
  HookRegistry,
  RegisteredHookHandler,
  HookHandler,
  HookContext,
  HookOptions,
  HookResult,
  HookError,
  HookInfo,
  HookFilter,
  HookAction
} from './PluginHooks';

export {
  PluginEventSystem,
  EventStream,
  pluginEvents
} from './PluginEvents';
export type {
  PluginEventSystemOptions,
  EventSubscriptionOptions,
  EventWaitOptions,
  EventHistoryOptions,
  EventStatistics,
  EventStreamOptions,
  EventFilter,
  EventMiddleware
} from './PluginEvents';

export {
  PluginCapabilityManager,
  PluginCapabilityProxy,
  pluginCapabilities
} from './PluginCapabilities';
export type {
  CapabilityDefinition,
  CapabilityProvider,
  CapabilityContext,
  CapabilityResult,
  CapabilityValidationResult
} from './PluginCapabilities';