/** @type {import('jest').Config} */
module.exports = {
  displayName: 'Plataforma App',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Roots where Jest should scan for tests and modules
  roots: ['<rootDir>/client', '<rootDir>/server', '<rootDir>/shared', '<rootDir>/packages'],
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  
  // File extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform patterns
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/client/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@packages/(.*)$': '<rootDir>/packages/$1',
    '\\.(css|less|scss|sss|styl)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': 'test-file-stub',
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'client/**/*.{ts,tsx}',
    'server/**/*.{ts,js}',
    'shared/**/*.{ts,js}',
    'packages/*/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/vite.config.{js,ts}',
    '!client/main.tsx',
    '!server/index.ts',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './packages/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test environment setup
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '/coverage/',
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@supabase|@tanstack|@radix-ui))',
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
  
  // Workspace projects for monorepo
  projects: [
    // Main application
    {
      displayName: 'main-app',
      testMatch: ['<rootDir>/client/**/*.(test|spec).(ts|tsx)', '<rootDir>/server/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'jsdom',
    },
    
    // Individual packages
    {
      displayName: 'types',
      testMatch: ['<rootDir>/packages/types/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'node',
    },
    {
      displayName: 'core-window-system',
      testMatch: ['<rootDir>/packages/core-window-system/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'design-system',
      testMatch: ['<rootDir>/packages/design-system/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'auth-system',
      testMatch: ['<rootDir>/packages/auth-system/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'jsdom',
    },
    {
      displayName: 'sdk',
      testMatch: ['<rootDir>/packages/sdk/**/*.(test|spec).(ts|tsx)'],
      testEnvironment: 'node',
    },
    
    // Integration tests
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/**/*.(integration|e2e).(test|spec).(ts|tsx|js)'],
      testEnvironment: 'node',
      testTimeout: 30000,
    },
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml',
    }],
    ['jest-html-reporters', {
      publicPath: 'coverage',
      filename: 'test-report.html',
    }],
  ],
  
  // Watch mode configuration
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Verbose output for debugging
  verbose: process.env.CI === 'true',
  
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Error handling
  errorOnDeprecated: true,
  bail: process.env.CI === 'true' ? 1 : 0,
  
  // Maximum worker processes
  maxWorkers: process.env.CI ? '100%' : '50%',
};