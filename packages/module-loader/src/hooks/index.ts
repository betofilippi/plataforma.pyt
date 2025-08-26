/**
 * Module loader hooks exports
 */

export { useModuleLoader } from './useModuleLoader';
export { useModuleState } from './useModuleState';
export { 
  useCommunication, 
  useTypedCommunication, 
  useModuleDiscovery, 
  usePersistentState,
  useEventReplay,
  useCrossModuleSync
} from './useCommunication';
export { 
  useModuleLifecycle, 
  useGlobalModuleLifecycle, 
  useModuleLifecycleStats 
} from './useModuleLifecycle';

export type {
  UseModuleLoaderResult,
  UseModuleStateResult,
  UseCommunicationResult
} from '../types';