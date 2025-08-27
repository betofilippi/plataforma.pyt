/**
 * Jest Coverage Configuration
 * Enhanced configuration for comprehensive code coverage reporting
 */

const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  
  // Override for coverage-specific settings
  displayName: 'Coverage Analysis',
  
  // Collect coverage from all relevant files
  collectCoverage: true,
  collectCoverageFrom: [
    // Client-side code
    'client/**/*.{ts,tsx,js,jsx}',
    
    // Server-side code
    'server/**/*.{ts,js}',
    
    // Shared utilities
    'shared/**/*.{ts,js}',
    
    // Package modules
    'packages/*/src/**/*.{ts,tsx}',
    
    // Exclude patterns
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/.next/**',
    '!**/public/**',
    '!**/static/**',
    
    // Exclude configuration files
    '!**/*.config.{js,ts}',
    '!**/vite.config.{js,ts}',
    '!**/webpack.config.{js,ts}',
    '!**/rollup.config.{js,ts}',
    '!**/tailwind.config.{js,ts}',
    '!**/postcss.config.{js,ts}',
    
    // Exclude test files
    '!**/*.test.{ts,tsx,js,jsx}',
    '!**/*.spec.{ts,tsx,js,jsx}',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    
    // Exclude entry points and build artifacts
    '!client/main.tsx',
    '!server/index.ts',
    '!**/main.{ts,tsx,js,jsx}',
    '!**/index.html',
    
    // Exclude development utilities
    '!**/dev-tools/**',
    '!**/stories/**',
    '!**/*.stories.{ts,tsx,js,jsx}',
    
    // Exclude generated files
    '!**/generated/**',
    '!**/*.generated.{ts,tsx,js,jsx}',
    '!**/graphql-types.ts',
    '!**/api-types.ts',
  ],

  // Coverage directory and output formats
  coverageDirectory: 'coverage',
  
  // Multiple reporters for different use cases
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'html',          // HTML report for local viewing
    'lcov',          // For external services (Codecov, SonarQube)
    'json',          // Machine-readable format
    'json-summary',  // Summary in JSON format
    'cobertura',     // For Azure DevOps, GitLab CI
    'clover',        // For Jenkins, Bamboo
  ],

  // Coverage thresholds - fail if not met
  coverageThreshold: {
    // Global thresholds
    global: {
      branches: 75,      // Branch coverage
      functions: 80,     // Function coverage
      lines: 80,         // Line coverage
      statements: 80,    // Statement coverage
    },
    
    // Component-specific thresholds
    './client/components/': {
      branches: 70,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    
    // Core functionality should have higher coverage
    './client/lib/': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    
    // Context and hooks
    './client/contexts/': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    
    './client/hooks/': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    
    // Server-side thresholds
    './server/': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    
    // Critical server modules
    './server/auth/': {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    
    './server/rbac/': {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    
    // Package modules should have high coverage
    './packages/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    
    // Shared utilities
    './shared/': {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Additional coverage configuration
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '\\.d\\.ts$',
    
    // Ignore mock files and test utilities
    '/__mocks__/',
    '/test-utils/',
    '/test-helpers/',
    
    // Ignore development and build files
    '/dev-tools/',
    '/scripts/',
    '/tools/',
    
    // Ignore documentation
    '/docs/',
    'README.md',
    
    // Ignore configuration
    '\\.config\\.(js|ts)$',
    'babel\\.config\\.(js|ts)$',
    'jest\\.config\\.(js|ts)$',
  ],

  // Custom coverage provider (v8 is faster and more accurate)
  coverageProvider: 'v8',

  // Report unused coverage
  reportUnusedCoverageFiles: true,

  // Fail tests if coverage is below threshold
  failOnCoverageThreshold: true,

  // Custom reporters for enhanced coverage analysis
  reporters: [
    ...baseConfig.reporters,
    
    // Coverage-specific reporters
    ['jest-coverage-badges', {
      outputDir: './coverage',
      coverageThresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    }],
    
    // HTML coverage report with custom template
    ['jest-html-reporters', {
      publicPath: 'coverage',
      filename: 'coverage-report.html',
      includeFailureMsg: true,
      includeSuiteFailure: true,
      includeConsoleLog: true,
      customInfos: [
        {
          title: 'Coverage Analysis',
          content: 'Comprehensive test coverage report for Plataforma.dev'
        },
        {
          title: 'Thresholds',
          content: 'Lines: 80%, Functions: 80%, Branches: 75%, Statements: 80%'
        }
      ],
    }],
  ],

  // Enhanced test result processing
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Additional setup for coverage analysis
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/jest.coverage.setup.js'
  ],

  // Cache configuration for coverage
  cacheDirectory: '<rootDir>/.jest-coverage-cache',
  
  // Verbose output for coverage analysis
  verbose: true,
  
  // Custom test environment for coverage
  testEnvironmentOptions: {
    ...baseConfig.testEnvironmentOptions,
    coverage: true,
  },
  
  // Transform configuration for coverage
  transform: {
    ...baseConfig.transform,
    // Ensure TypeScript files are transformed for coverage
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        // Enable source maps for better coverage
        sourceMap: true,
        inlineSourceMap: false,
      },
      // Generate source maps for coverage
      sourceMap: true,
    }],
  },
};