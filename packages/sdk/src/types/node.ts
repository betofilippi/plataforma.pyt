// Node.js-specific types for Plataforma SDK

import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

/**
 * File system types
 */
export interface FileInfo {
  path: string;
  name: string;
  ext: string;
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
  isFile: boolean;
}

export interface DirectoryInfo extends FileInfo {
  children: FileInfo[];
  totalSize: number;
  fileCount: number;
  directoryCount: number;
}

/**
 * Build system types
 */
export interface BuildConfig {
  entry: string;
  output: {
    path: string;
    filename: string;
    format: 'esm' | 'cjs' | 'umd';
  };
  target: string;
  minify: boolean;
  sourcemap: boolean;
  watch: boolean;
  external: string[];
  plugins: BuildPlugin[];
}

export interface BuildPlugin {
  name: string;
  setup: (build: BuildContext) => void | Promise<void>;
}

export interface BuildContext {
  config: BuildConfig;
  resolve: (id: string) => string | Promise<string>;
  load: (id: string) => string | Promise<string>;
  transform: (code: string, id: string) => string | Promise<string>;
  emit: (filename: string, content: string) => void;
  addWatchFile: (file: string) => void;
}

export interface BuildResult {
  success: boolean;
  duration: number;
  errors: BuildError[];
  warnings: BuildWarning[];
  assets: BuildAsset[];
  stats: BuildStats;
}

export interface BuildError {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface BuildWarning extends BuildError {
  severity: 'warning';
}

export interface BuildAsset {
  name: string;
  path: string;
  size: number;
  type: 'js' | 'css' | 'html' | 'asset';
}

export interface BuildStats {
  totalSize: number;
  gzippedSize: number;
  moduleCount: number;
  chunkCount: number;
}

/**
 * Development server types
 */
export interface DevServerConfig {
  port: number;
  host: string;
  https?: boolean;
  open?: boolean;
  cors?: boolean;
  proxy?: Record<string, string | ProxyConfig>;
  middleware?: DevMiddleware[];
  hmr?: boolean;
  watch?: string[];
}

export interface ProxyConfig {
  target: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface DevMiddleware {
  path: string;
  handler: (req: any, res: any, next: any) => void;
}

export interface DevServer extends EventEmitter {
  config: DevServerConfig;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  addMiddleware: (middleware: DevMiddleware) => void;
  removeMiddleware: (path: string) => void;
}

/**
 * Testing types
 */
export interface TestConfig {
  testMatch: string[];
  testIgnore: string[];
  setupFiles: string[];
  coverage: boolean;
  coverageThreshold: CoverageThreshold;
  timeout: number;
  retries: number;
  parallel: boolean;
  watch: boolean;
  verbose: boolean;
}

export interface CoverageThreshold {
  global: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
}

export interface TestResult {
  success: boolean;
  duration: number;
  tests: TestCaseResult[];
  coverage?: CoverageResult;
  stats: TestStats;
}

export interface TestCaseResult {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: TestError;
}

export interface TestError {
  message: string;
  stack: string;
  expected?: any;
  actual?: any;
}

export interface CoverageResult {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
  files: CoverageFileResult[];
}

export interface CoverageFileResult {
  path: string;
  branches: number;
  functions: number;
  lines: number;
  statements: number;
}

export interface TestStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalFiles: number;
}

/**
 * CLI types
 */
export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options: CLIOption[];
  examples: CLIExample[];
  handler: (args: string[], options: Record<string, any>) => Promise<void>;
}

export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  default?: any;
  required?: boolean;
  choices?: string[];
}

export interface CLIExample {
  command: string;
  description: string;
}

export interface CLIContext {
  cwd: string;
  args: string[];
  options: Record<string, any>;
  stdout: Writable;
  stderr: Writable;
  stdin: Readable;
  env: Record<string, string>;
}

/**
 * Logger types
 */
export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  success: (message: string, ...args: any[]) => void;
  setLevel: (level: LogLevel) => void;
  child: (namespace: string) => Logger;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  namespace?: string;
  args: any[];
}

/**
 * Process types
 */
export interface ProcessManager {
  spawn: (command: string, args: string[], options?: SpawnOptions) => ChildProcess;
  exec: (command: string, options?: ExecOptions) => Promise<ExecResult>;
  kill: (pid: number, signal?: string) => Promise<void>;
  list: () => ProcessInfo[];
}

export interface SpawnOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: 'pipe' | 'inherit' | 'ignore';
  detached?: boolean;
}

export interface ExecOptions extends SpawnOptions {
  timeout?: number;
  maxBuffer?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
  signal?: string;
}

export interface ChildProcess extends EventEmitter {
  pid: number;
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;
  kill: (signal?: string) => void;
  wait: () => Promise<number>;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  args: string[];
  cwd: string;
  cpu: number;
  memory: number;
  uptime: number;
}

/**
 * Configuration types
 */
export interface ConfigManager {
  get: <T = any>(key: string, defaultValue?: T) => T;
  set: (key: string, value: any) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  load: (path?: string) => Promise<void>;
  save: (path?: string) => Promise<void>;
}

export interface ConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    required?: boolean;
    validate?: (value: any) => boolean | string;
  };
}

/**
 * Cache types
 */
export interface CacheManager {
  get: <T = any>(key: string) => Promise<T | null>;
  set: (key: string, value: any, ttl?: number) => Promise<void>;
  has: (key: string) => Promise<boolean>;
  delete: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  keys: () => Promise<string[]>;
  size: () => Promise<number>;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number;
  created: Date;
  accessed: Date;
}

/**
 * Plugin system types
 */
export interface PluginManager {
  register: (plugin: Plugin) => Promise<void>;
  unregister: (name: string) => Promise<void>;
  get: (name: string) => Plugin | null;
  list: () => Plugin[];
  load: (path: string) => Promise<Plugin>;
  reload: (name: string) => Promise<void>;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  init?: (context: PluginContext) => Promise<void>;
  destroy?: () => Promise<void>;
  commands?: CLICommand[];
  hooks?: Record<string, Function>;
}

export interface PluginContext {
  sdk: any;
  config: ConfigManager;
  logger: Logger;
  cache: CacheManager;
  process: ProcessManager;
}