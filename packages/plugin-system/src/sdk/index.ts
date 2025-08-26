/**
 * Plugin Development Kit (SDK)
 * 
 * This module exports the tools and utilities for plugin development:
 * - BasePlugin: Foundation class for plugin development
 * - TestFramework: Testing utilities and mock environments
 * - DebugTools: Debugging, profiling, and development helpers
 * - Utilities: Helper functions and development tools
 */

export {
  BasePlugin,
  SimplePlugin,
  PluginBuilder,
  createPlugin
} from './BasePlugin';

export {
  PluginTestFramework,
  TestSuite,
  testFramework,
  createTestEnvironment,
  createTestSuite
} from './TestFramework';
export type {
  MockHttpResponse,
  MockCall,
  TestCase,
  TestResult,
  TestSuiteResult,
  TestResults
} from './TestFramework';

export {
  PluginDebugTools,
  DebugSession,
  ProfileSession,
  DebugLogger,
  PerformanceMonitor,
  debugTools
} from './DebugTools';
export type {
  DebugOptions,
  ProfileOptions,
  LoggerOptions,
  CallStackFrame,
  DebugReport,
  PerformanceMeasurement,
  ProfileStatistics,
  ProfileReport,
  LogEntry,
  LogFilter,
  PluginInspection,
  ValidationResult,
  PerformanceMetric,
  MetricStatistics
} from './DebugTools';