/**
 * React components exports for dynamic module loading
 */

export { ModuleProvider, useModuleContext, useModuleRegistry, useModuleCache, useModuleCommunication } from './ModuleProvider';
export { DynamicModuleLoader, ModulePreloader, ModuleRegistryStatus } from './DynamicModuleLoader';
export { ModuleErrorBoundary, AsyncErrorBoundary, RecoverableErrorBoundary, useErrorBoundary } from './ModuleErrorBoundary';
export { 
  LoadingFallback, 
  ModuleSkeleton, 
  ProgressRing, 
  DotsLoader, 
  ShimmerLoader 
} from './LoadingFallback';

export type {
  ModuleProviderProps,
  DynamicModuleLoaderProps,
  ModuleErrorBoundaryProps,
  LoadingFallbackProps
} from '../types';