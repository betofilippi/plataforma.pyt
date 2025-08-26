/**
 * Extension Points Layer
 * 
 * This module exports extension point managers that allow plugins
 * to extend platform functionality:
 * - UIExtensions: UI components, slots, themes, and routes
 * - DataExtensions: Data transformers, validators, processors, formatters
 * - APIExtensions: API endpoints, middleware, handlers, interceptors
 * - WorkflowExtensions: Business process hooks and automation
 */

export { UIExtensionManager } from './UIExtensions';
export type {
  UIExtensionOptions,
  ComponentRegistrationOptions,
  ComponentRegistry,
  SlotDefinition,
  SlotComponentOptions,
  SlotComponent,
  SlotRegistry,
  UITheme,
  ThemeOptions,
  ThemeRegistry,
  ThemeInfo,
  RouteOptions,
  RouteRegistry,
  RouteInfo,
  PluginUIStats,
  UIExtensionStats
} from './UIExtensions';

export { DataExtensionManager } from './DataExtensions';
export type {
  DataExtensionOptions,
  DataTransformer,
  TransformerOptions,
  DataTransformContext,
  DataTransformResult,
  DataValidator,
  ValidatorOptions,
  DataValidationContext,
  DataValidationResult,
  DataProcessor,
  ProcessorOptions,
  DataProcessingContext,
  DataProcessingResult,
  DataFormatter,
  FormatterOptions,
  DataFormatContext,
  DataFormatResult,
  DataAggregator,
  AggregatorOptions,
  DataAggregationContext,
  DataAggregationResult,
  DataExtensionInfo,
  PluginDataStats,
  DataExtensionStats
} from './DataExtensions';

export { APIExtensionManager } from './APIExtensions';
export type {
  APIExtensionOptions,
  HTTPMethod,
  APIRequest,
  APIResponse,
  APIHandler,
  APIMiddleware,
  APIInterceptor,
  EventHandler,
  EndpointOptions,
  MiddlewareOptions,
  InterceptorOptions,
  HandlerOptions,
  HandlerResult,
  RateLimit,
  ParameterDoc,
  ResponseDoc,
  EndpointDoc,
  APIDocumentation,
  PluginAPIStats,
  APIExtensionStats
} from './APIExtensions';

export { WorkflowExtensionManager } from './WorkflowExtensions';
export type {
  WorkflowExtensionOptions,
  WorkflowDefinition,
  WorkflowStepDefinition,
  WorkflowOptions,
  WorkflowContext,
  WorkflowResult,
  WorkflowStep,
  StepResult,
  StepOptions,
  WorkflowTrigger,
  TriggerOptions,
  WorkflowCondition,
  ConditionResult,
  ConditionOptions,
  WorkflowAction,
  ActionResult,
  ActionOptions,
  PluginWorkflowStats,
  WorkflowExtensionStats
} from './WorkflowExtensions';