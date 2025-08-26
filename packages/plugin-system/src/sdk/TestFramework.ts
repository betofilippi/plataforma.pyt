import { EventEmitter } from 'eventemitter3';
import type {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginTestEnvironment
} from '../types';
import { PluginContextImpl } from '../api/PluginContext';

/**
 * Plugin Test Framework
 * Provides testing utilities and mock environments for plugin development
 */
export class PluginTestFramework {
  private testEnvironments = new Map<string, TestEnvironment>();

  /**
   * Create a test environment for a plugin
   */
  createTestEnvironment(pluginId?: string): PluginTestEnvironment {
    const environment = new TestEnvironment(pluginId);
    if (pluginId) {
      this.testEnvironments.set(pluginId, environment);
    }
    return environment;
  }

  /**
   * Get test environment for a plugin
   */
  getTestEnvironment(pluginId: string): PluginTestEnvironment | undefined {
    return this.testEnvironments.get(pluginId);
  }

  /**
   * Create a test suite
   */
  createTestSuite(name: string): TestSuite {
    return new TestSuite(name, this);
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestResults> {
    // Implementation would run all registered test suites
    return {
      totalTests: 0,
      passed: 0,
      failed: 0,
      suites: []
    };
  }
}

/**
 * Test Environment Implementation
 */
class TestEnvironment implements PluginTestEnvironment {
  private plugin?: Plugin;
  private mockContext: MockPluginContext;
  private events: EventEmitter;

  constructor(private readonly pluginId?: string) {
    this.events = new EventEmitter();
    this.mockContext = new MockPluginContext(pluginId || 'test-plugin');
  }

  /**
   * Load a plugin into the test environment
   */
  async loadPlugin(plugin: Plugin): Promise<void> {
    this.plugin = plugin;
    
    // Initialize plugin with mock context
    await plugin.initialize(this.mockContext as any);
  }

  /**
   * Create a mock plugin context
   */
  createMockContext(): PluginContext {
    return this.mockContext as any;
  }

  /**
   * Simulate an event
   */
  async simulateEvent(event: any): Promise<void> {
    this.events.emit(event.type, event);
    
    // If plugin is loaded, trigger its event handlers
    if (this.plugin && this.plugin.hooks?.onUIEvent) {
      await this.plugin.hooks.onUIEvent(event);
    }
  }

  /**
   * Get plugin state
   */
  getPluginState(): any {
    return {
      plugin: this.plugin,
      context: this.mockContext,
      isLoaded: !!this.plugin,
      isActive: this.plugin?.isActive?.() || false
    };
  }

  /**
   * Mock HTTP responses
   */
  mockHttpResponse(url: string, response: MockHttpResponse): void {
    this.mockContext.mockHttpResponse(url, response);
  }

  /**
   * Mock storage data
   */
  mockStorageData(data: Record<string, any>): void {
    this.mockContext.mockStorageData(data);
  }

  /**
   * Mock permissions
   */
  mockPermissions(permissions: string[]): void {
    this.mockContext.mockPermissions(permissions);
  }

  /**
   * Get all mock calls
   */
  getMockCalls(): MockCall[] {
    return this.mockContext.getMockCalls();
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.mockContext.clearMocks();
  }
}

/**
 * Mock Plugin Context
 */
class MockPluginContext {
  public readonly pluginId: string;
  public readonly manifest: PluginManifest;
  public readonly config: Record<string, any>;
  public readonly logger: MockLogger;
  public readonly events: EventEmitter;
  public readonly api: MockPluginAPI;
  public readonly ui: MockUIContext;
  public readonly storage: MockStorage;
  public readonly hooks: any;
  public readonly extensions: MockExtensions;
  public readonly permissions: MockPermissions;
  public readonly sandbox: any;

  private mockCalls: MockCall[] = [];
  private httpMocks = new Map<string, MockHttpResponse>();
  private storageData = new Map<string, any>();
  private permissionSet = new Set<string>();

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.manifest = {
      id: pluginId,
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'Test plugin for unit testing',
      author: { name: 'Test' },
      category: 'utility' as any,
      securityLevel: 'sandboxed' as any
    };
    this.config = {};
    
    this.logger = new MockLogger(this);
    this.events = new EventEmitter();
    this.api = new MockPluginAPI(this);
    this.ui = new MockUIContext(this);
    this.storage = new MockStorage(this);
    this.hooks = {};
    this.extensions = new MockExtensions(this);
    this.permissions = new MockPermissions(this);
    this.sandbox = {};
  }

  mockHttpResponse(url: string, response: MockHttpResponse): void {
    this.httpMocks.set(url, response);
  }

  mockStorageData(data: Record<string, any>): void {
    this.storageData.clear();
    for (const [key, value] of Object.entries(data)) {
      this.storageData.set(key, value);
    }
  }

  mockPermissions(permissions: string[]): void {
    this.permissionSet.clear();
    permissions.forEach(p => this.permissionSet.add(p));
  }

  addMockCall(type: string, method: string, args: any[]): void {
    this.mockCalls.push({
      type,
      method,
      args: [...args],
      timestamp: new Date()
    });
  }

  getMockCalls(): MockCall[] {
    return [...this.mockCalls];
  }

  clearMocks(): void {
    this.mockCalls.length = 0;
    this.httpMocks.clear();
    this.storageData.clear();
    this.permissionSet.clear();
  }
}

/**
 * Mock implementations of plugin context services
 */
class MockLogger {
  constructor(private context: MockPluginContext) {}

  debug(message: string, ...args: any[]): void {
    this.context.addMockCall('logger', 'debug', [message, ...args]);
  }

  info(message: string, ...args: any[]): void {
    this.context.addMockCall('logger', 'info', [message, ...args]);
  }

  warn(message: string, ...args: any[]): void {
    this.context.addMockCall('logger', 'warn', [message, ...args]);
  }

  error(message: string | Error, ...args: any[]): void {
    this.context.addMockCall('logger', 'error', [message, ...args]);
  }

  trace(message: string, ...args: any[]): void {
    this.context.addMockCall('logger', 'trace', [message, ...args]);
  }
}

class MockPluginAPI {
  constructor(private context: MockPluginContext) {}

  get http() {
    return {
      get: async (url: string, options?: RequestInit): Promise<Response> => {
        this.context.addMockCall('http', 'get', [url, options]);
        return this.createMockResponse(url);
      },
      post: async (url: string, data?: any, options?: RequestInit): Promise<Response> => {
        this.context.addMockCall('http', 'post', [url, data, options]);
        return this.createMockResponse(url);
      },
      put: async (url: string, data?: any, options?: RequestInit): Promise<Response> => {
        this.context.addMockCall('http', 'put', [url, data, options]);
        return this.createMockResponse(url);
      },
      delete: async (url: string, options?: RequestInit): Promise<Response> => {
        this.context.addMockCall('http', 'delete', [url, options]);
        return this.createMockResponse(url);
      }
    };
  }

  get platform() {
    return {
      getModules: async () => {
        this.context.addMockCall('platform', 'getModules', []);
        return [];
      },
      getModule: async (id: string) => {
        this.context.addMockCall('platform', 'getModule', [id]);
        return null;
      },
      invokeModule: async (id: string, method: string, args?: any[]) => {
        this.context.addMockCall('platform', 'invokeModule', [id, method, args]);
        return null;
      }
    };
  }

  get data() {
    return {
      query: async (sql: string, params?: any[]) => {
        this.context.addMockCall('data', 'query', [sql, params]);
        return [];
      },
      execute: async (sql: string, params?: any[]) => {
        this.context.addMockCall('data', 'execute', [sql, params]);
        return null;
      },
      transaction: async (fn: (tx: any) => Promise<void>) => {
        this.context.addMockCall('data', 'transaction', [fn]);
        return fn({});
      }
    };
  }

  private createMockResponse(url: string): Response {
    const mock = this.context['httpMocks'].get(url);
    
    return {
      ok: mock?.ok ?? true,
      status: mock?.status ?? 200,
      statusText: mock?.statusText ?? 'OK',
      headers: new Headers(mock?.headers || {}),
      json: async () => mock?.data || {},
      text: async () => JSON.stringify(mock?.data || {}),
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0)
    } as Response;
  }
}

class MockUIContext {
  constructor(private context: MockPluginContext) {}

  registerComponent(name: string, component: any): void {
    this.context.addMockCall('ui', 'registerComponent', [name, component]);
  }

  unregisterComponent(name: string): void {
    this.context.addMockCall('ui', 'unregisterComponent', [name]);
  }

  registerSlot(name: string, component: any): void {
    this.context.addMockCall('ui', 'registerSlot', [name, component]);
  }

  unregisterSlot(name: string): void {
    this.context.addMockCall('ui', 'unregisterSlot', [name]);
  }

  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void {
    this.context.addMockCall('ui', 'showNotification', [message, type]);
  }

  async showModal(component: any, props?: any): Promise<any> {
    this.context.addMockCall('ui', 'showModal', [component, props]);
    return null;
  }

  navigate(path: string): void {
    this.context.addMockCall('ui', 'navigate', [path]);
  }

  openWindow(config: any): void {
    this.context.addMockCall('ui', 'openWindow', [config]);
  }
}

class MockStorage {
  constructor(private context: MockPluginContext) {}

  async get(key: string): Promise<any> {
    this.context.addMockCall('storage', 'get', [key]);
    return this.context['storageData'].get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.context.addMockCall('storage', 'set', [key, value]);
    this.context['storageData'].set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.context.addMockCall('storage', 'delete', [key]);
    this.context['storageData'].delete(key);
  }

  async clear(): Promise<void> {
    this.context.addMockCall('storage', 'clear', []);
    this.context['storageData'].clear();
  }

  async readFile(path: string): Promise<string | Buffer> {
    this.context.addMockCall('storage', 'readFile', [path]);
    throw new Error('File operations not supported in test environment');
  }

  async writeFile(path: string, data: string | Buffer): Promise<void> {
    this.context.addMockCall('storage', 'writeFile', [path, data]);
    throw new Error('File operations not supported in test environment');
  }

  async deleteFile(path: string): Promise<void> {
    this.context.addMockCall('storage', 'deleteFile', [path]);
    throw new Error('File operations not supported in test environment');
  }

  async listFiles(pattern?: string): Promise<string[]> {
    this.context.addMockCall('storage', 'listFiles', [pattern]);
    return [];
  }
}

class MockExtensions {
  constructor(private context: MockPluginContext) {}

  registerExtension(point: string, extension: any): void {
    this.context.addMockCall('extensions', 'registerExtension', [point, extension]);
  }

  unregisterExtension(point: string, id: string): void {
    this.context.addMockCall('extensions', 'unregisterExtension', [point, id]);
  }

  getExtensions(point: string): any[] {
    this.context.addMockCall('extensions', 'getExtensions', [point]);
    return [];
  }

  async invokeExtensions(point: string, ...args: any[]): Promise<any[]> {
    this.context.addMockCall('extensions', 'invokeExtensions', [point, ...args]);
    return [];
  }
}

class MockPermissions {
  constructor(private context: MockPluginContext) {}

  has(permission: string): boolean {
    this.context.addMockCall('permissions', 'has', [permission]);
    return this.context['permissionSet'].has(permission);
  }

  async request(permission: string): Promise<boolean> {
    this.context.addMockCall('permissions', 'request', [permission]);
    return this.context['permissionSet'].has(permission);
  }

  revoke(permission: string): void {
    this.context.addMockCall('permissions', 'revoke', [permission]);
    this.context['permissionSet'].delete(permission);
  }

  list(): string[] {
    this.context.addMockCall('permissions', 'list', []);
    return Array.from(this.context['permissionSet']);
  }
}

/**
 * Test Suite
 */
export class TestSuite {
  private tests: TestCase[] = [];
  private beforeEachCallbacks: (() => void | Promise<void>)[] = [];
  private afterEachCallbacks: (() => void | Promise<void>)[] = [];

  constructor(
    private name: string,
    private framework: PluginTestFramework
  ) {}

  /**
   * Add a test case
   */
  test(name: string, testFn: (env: PluginTestEnvironment) => void | Promise<void>): TestSuite {
    this.tests.push({
      name,
      testFn
    });
    return this;
  }

  /**
   * Add beforeEach callback
   */
  beforeEach(callback: () => void | Promise<void>): TestSuite {
    this.beforeEachCallbacks.push(callback);
    return this;
  }

  /**
   * Add afterEach callback
   */
  afterEach(callback: () => void | Promise<void>): TestSuite {
    this.afterEachCallbacks.push(callback);
    return this;
  }

  /**
   * Run all tests in this suite
   */
  async run(): Promise<TestSuiteResult> {
    const result: TestSuiteResult = {
      suiteName: this.name,
      totalTests: this.tests.length,
      passed: 0,
      failed: 0,
      testResults: []
    };

    for (const test of this.tests) {
      try {
        // Run beforeEach callbacks
        for (const callback of this.beforeEachCallbacks) {
          await callback();
        }

        // Create fresh test environment
        const env = this.framework.createTestEnvironment();

        // Run test
        const startTime = Date.now();
        await test.testFn(env);
        const endTime = Date.now();

        result.testResults.push({
          testName: test.name,
          passed: true,
          executionTime: endTime - startTime
        });
        result.passed++;

        // Run afterEach callbacks
        for (const callback of this.afterEachCallbacks) {
          await callback();
        }

      } catch (error) {
        result.testResults.push({
          testName: test.name,
          passed: false,
          error: error instanceof Error ? error.message : String(error)
        });
        result.failed++;
      }
    }

    return result;
  }
}

// Export the default test framework instance
export const testFramework = new PluginTestFramework();

// Helper functions
export function createTestEnvironment(): PluginTestEnvironment {
  return testFramework.createTestEnvironment();
}

export function createTestSuite(name: string): TestSuite {
  return testFramework.createTestSuite(name);
}

// Types and Interfaces

export interface MockHttpResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: any;
}

export interface MockCall {
  type: string;
  method: string;
  args: any[];
  timestamp: Date;
}

export interface TestCase {
  name: string;
  testFn: (env: PluginTestEnvironment) => void | Promise<void>;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  executionTime?: number;
  error?: string;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  testResults: TestResult[];
}

export interface TestResults {
  totalTests: number;
  passed: number;
  failed: number;
  suites: TestSuiteResult[];
}