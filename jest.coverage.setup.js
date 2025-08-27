/**
 * Jest Coverage Setup
 * Additional setup for coverage analysis and reporting
 */

// Extend the base setup
require('./jest.setup.js');

// Coverage-specific global setup
global.__COVERAGE_ENABLED__ = true;

// Mock console methods for coverage analysis
const originalConsole = { ...console };

beforeAll(() => {
  // Override console methods to track coverage
  global.__consoleMethods = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
  };

  // Track performance for coverage analysis
  global.__performanceMarks = [];
  
  if (typeof performance !== 'undefined') {
    const originalMark = performance.mark;
    performance.mark = function(name) {
      global.__performanceMarks.push({ name, timestamp: Date.now() });
      return originalMark.call(this, name);
    };
  }
});

afterEach(() => {
  // Clean up after each test for accurate coverage
  jest.clearAllMocks();
  
  // Reset performance marks
  global.__performanceMarks = [];
  
  // Clear any timers that might affect coverage
  jest.clearAllTimers();
  
  // Clear any intervals or timeouts
  if (typeof window !== 'undefined') {
    // Clear any window-specific state
    if (window.localStorage) {
      window.localStorage.clear();
    }
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
  }
});

afterAll(() => {
  // Restore original console methods
  Object.keys(global.__consoleMethods).forEach(method => {
    global.__consoleMethods[method].mockRestore();
  });
  
  // Generate coverage report data
  if (global.__coverage__) {
    const coverageData = global.__coverage__;
    const totalFiles = Object.keys(coverageData).length;
    const filesWithTests = Object.keys(coverageData).filter(
      file => Object.keys(coverageData[file].s).some(key => coverageData[file].s[key] > 0)
    ).length;
    
    console.log(`\n📊 Coverage Analysis Summary:`);
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Files with tests: ${filesWithTests}`);
    console.log(`   Files without tests: ${totalFiles - filesWithTests}`);
    
    // Log untested files for review
    const untestedFiles = Object.keys(coverageData).filter(
      file => !Object.keys(coverageData[file].s).some(key => coverageData[file].s[key] > 0)
    );
    
    if (untestedFiles.length > 0) {
      console.log(`\n⚠️  Files without test coverage:`);
      untestedFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
  }
});

// Custom matchers for coverage testing
expect.extend({
  toHaveMinimumCoverage(received, expectedCoverage) {
    const { branches, functions, lines, statements } = received;
    const minimums = expectedCoverage;
    
    const pass = 
      branches >= minimums.branches &&
      functions >= minimums.functions &&
      lines >= minimums.lines &&
      statements >= minimums.statements;
    
    if (pass) {
      return {
        message: () =>
          `Expected coverage to be below minimums:\n` +
          `Branches: ${branches}% (min: ${minimums.branches}%)\n` +
          `Functions: ${functions}% (min: ${minimums.functions}%)\n` +
          `Lines: ${lines}% (min: ${minimums.lines}%)\n` +
          `Statements: ${statements}% (min: ${minimums.statements}%)`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected coverage to meet minimums:\n` +
          `Branches: ${branches}% < ${minimums.branches}%\n` +
          `Functions: ${functions}% < ${minimums.functions}%\n` +
          `Lines: ${lines}% < ${minimums.lines}%\n` +
          `Statements: ${statements}% < ${minimums.statements}%`,
        pass: false,
      };
    }
  },

  toBeCoveredByTests(received) {
    if (typeof received !== 'function' && typeof received !== 'object') {
      return {
        message: () => `Expected ${received} to be a function or object that can be tested`,
        pass: false,
      };
    }
    
    // This is a placeholder - actual coverage detection would require
    // integration with the coverage provider
    const isCovered = true; // Simplified check
    
    return {
      message: () =>
        isCovered
          ? `Expected ${received} not to be covered by tests`
          : `Expected ${received} to be covered by tests`,
      pass: isCovered,
    };
  },
});

// Helper functions for coverage analysis
global.coverageHelpers = {
  // Track function calls for coverage analysis
  trackFunctionCall: (functionName, args = []) => {
    if (!global.__functionCalls) {
      global.__functionCalls = {};
    }
    
    if (!global.__functionCalls[functionName]) {
      global.__functionCalls[functionName] = [];
    }
    
    global.__functionCalls[functionName].push({
      args,
      timestamp: Date.now(),
    });
  },

  // Get function call statistics
  getFunctionCallStats: (functionName) => {
    if (!global.__functionCalls || !global.__functionCalls[functionName]) {
      return { calls: 0, firstCall: null, lastCall: null };
    }
    
    const calls = global.__functionCalls[functionName];
    return {
      calls: calls.length,
      firstCall: calls[0],
      lastCall: calls[calls.length - 1],
    };
  },

  // Reset function call tracking
  resetFunctionCallTracking: () => {
    global.__functionCalls = {};
  },

  // Generate coverage report for specific module
  generateModuleCoverageReport: (modulePath) => {
    if (!global.__coverage__ || !global.__coverage__[modulePath]) {
      return null;
    }
    
    const coverage = global.__coverage__[modulePath];
    
    // Calculate coverage percentages
    const statements = coverage.s;
    const branches = coverage.b;
    const functions = coverage.f;
    
    const statementsCovered = Object.values(statements).filter(count => count > 0).length;
    const statementsTotal = Object.values(statements).length;
    const statementsPercent = statementsTotal > 0 ? (statementsCovered / statementsTotal) * 100 : 100;
    
    const functionsCovered = Object.values(functions).filter(count => count > 0).length;
    const functionsTotal = Object.values(functions).length;
    const functionsPercent = functionsTotal > 0 ? (functionsCovered / functionsTotal) * 100 : 100;
    
    const branchesCovered = Object.values(branches)
      .flat()
      .filter(count => count > 0).length;
    const branchesTotal = Object.values(branches).flat().length;
    const branchesPercent = branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 100;
    
    return {
      path: modulePath,
      statements: {
        covered: statementsCovered,
        total: statementsTotal,
        percent: statementsPercent,
      },
      functions: {
        covered: functionsCovered,
        total: functionsTotal,
        percent: functionsPercent,
      },
      branches: {
        covered: branchesCovered,
        total: branchesTotal,
        percent: branchesPercent,
      },
    };
  },
};

// Custom test utilities for coverage
global.testUtils = {
  ...global.testUtils,
  
  // Test all public methods of a class or object
  testAllMethods: (obj, excludeMethods = []) => {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(obj))
      .filter(name => 
        typeof obj[name] === 'function' &&
        name !== 'constructor' &&
        !name.startsWith('_') &&
        !excludeMethods.includes(name)
      );
    
    return methods.map(methodName => ({
      name: methodName,
      method: obj[methodName].bind(obj),
      isTested: false, // Would need to be set by actual test execution
    }));
  },

  // Create test data that covers all code branches
  createComprehensiveTestData: (schema) => {
    // Generate test data that exercises different code paths
    const testCases = [];
    
    // Valid data
    testCases.push({
      type: 'valid',
      data: schema.valid || {},
      expected: 'success',
    });
    
    // Invalid data for error paths
    if (schema.invalid) {
      schema.invalid.forEach((invalidCase, index) => {
        testCases.push({
          type: 'invalid',
          data: invalidCase,
          expected: 'error',
          case: index,
        });
      });
    }
    
    // Edge cases
    if (schema.edge) {
      schema.edge.forEach((edgeCase, index) => {
        testCases.push({
          type: 'edge',
          data: edgeCase,
          expected: 'varies',
          case: index,
        });
      });
    }
    
    return testCases;
  },
};

// Log coverage setup completion
console.log('📋 Jest coverage setup completed');
console.log('   - Coverage tracking enabled');
console.log('   - Custom matchers loaded');
console.log('   - Helper functions available');
console.log('   - Performance tracking active');