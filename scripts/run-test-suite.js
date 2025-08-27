/**
 * Complete Test Suite Runner
 * Executes all test categories and generates comprehensive reports
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

class TestSuiteRunner {
  constructor(options = {}) {
    this.options = {
      environment: process.env.NODE_ENV || 'test',
      coverage: true,
      generateReports: true,
      validateDebugSystem: true,
      parallel: false,
      timeout: 300000, // 5 minutes per test suite
      ...options,
    };

    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: 0,
      suites: [],
      overall: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
      },
      errors: [],
      warnings: [],
    };
  }

  async run() {
    console.log('🚀 Starting comprehensive test suite execution...\n');
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Coverage: ${this.options.coverage ? 'Enabled' : 'Disabled'}`);
    console.log(`Reports: ${this.options.generateReports ? 'Enabled' : 'Disabled'}\n`);

    try {
      // Phase 1: Environment setup
      await this.setupEnvironment();

      // Phase 2: Debug system validation
      if (this.options.validateDebugSystem) {
        await this.validateDebugSystem();
      }

      // Phase 3: Execute test suites
      await this.runTestSuites();

      // Phase 4: Generate reports
      if (this.options.generateReports) {
        await this.generateReports();
      }

      // Phase 5: Final validation
      await this.finalValidation();

      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      this.printSummary();

      if (this.results.overall.failed > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error('\n❌ Test suite execution failed:', error.message);
      this.results.errors.push(error.message);
      process.exit(1);
    }
  }

  async setupEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.CI = 'true';
    process.env.JEST_TIMEOUT = '30000';

    // Create necessary directories
    await this.ensureDirectories([
      'coverage',
      'test-results',
      'playwright-report',
      'test-reports',
    ]);

    // Clean previous results
    await this.cleanPreviousResults();

    console.log('   ✅ Environment setup complete\n');
  }

  async ensureDirectories(dirs) {
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  async cleanPreviousResults() {
    const filesToClean = [
      'coverage/lcov.info',
      'test-results/junit.xml',
      'playwright-report/index.html',
    ];

    for (const file of filesToClean) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // File might not exist
      }
    }
  }

  async validateDebugSystem() {
    console.log('🔍 Validating debug system...');

    try {
      // Check if debug-system.html exists and is valid
      const debugPath = path.join('public', 'debug-system.html');
      const debugExists = await fs.access(debugPath).then(() => true).catch(() => false);

      if (!debugExists) {
        throw new Error('debug-system.html not found in public directory');
      }

      // Validate debug system content
      const debugContent = await fs.readFile(debugPath, 'utf8');
      
      const requiredElements = [
        'PerformanceDebugSystem',
        'test-grid',
        'overall-status',
        'logs-container',
      ];

      for (const element of requiredElements) {
        if (!debugContent.includes(element)) {
          throw new Error(`Debug system missing required element: ${element}`);
        }
      }

      console.log('   ✅ Debug system validation passed');

      this.results.suites.push({
        name: 'Debug System Validation',
        status: 'passed',
        duration: 0,
        tests: { total: 1, passed: 1, failed: 0, skipped: 0 },
      });

    } catch (error) {
      console.error('   ❌ Debug system validation failed:', error.message);
      this.results.errors.push(`Debug System: ${error.message}`);
      
      this.results.suites.push({
        name: 'Debug System Validation',
        status: 'failed',
        duration: 0,
        tests: { total: 1, passed: 0, failed: 1, skipped: 0 },
        error: error.message,
      });
    }

    console.log();
  }

  async runTestSuites() {
    const suites = [
      {
        name: 'Unit Tests',
        command: 'npm run test:unit',
        critical: true,
        timeout: 120000, // 2 minutes
      },
      {
        name: 'Integration Tests',
        command: 'npm run test:integration',
        critical: true,
        timeout: 180000, // 3 minutes
      },
      {
        name: 'Component Tests',
        command: 'npm run test -- --testMatch="**/*.test.tsx"',
        critical: true,
        timeout: 120000,
      },
      {
        name: 'Security Tests',
        command: 'npm run test -- --testMatch="**/security/*.test.ts"',
        critical: true,
        timeout: 90000,
      },
      {
        name: 'Performance Tests',
        command: 'npm run test -- --testMatch="**/performance/*.test.ts"',
        critical: false,
        timeout: 180000,
      },
      {
        name: 'E2E Tests (Smoke)',
        command: 'npm run test:smoke',
        critical: false,
        timeout: 240000, // 4 minutes
      },
    ];

    for (const suite of suites) {
      await this.runSuite(suite);
    }
  }

  async runSuite(suite) {
    console.log(`🧪 Running ${suite.name}...`);

    const startTime = Date.now();
    let result = {
      name: suite.name,
      status: 'pending',
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage: null,
      error: null,
    };

    try {
      // Add coverage flag if enabled
      const command = this.options.coverage && suite.name.includes('Tests') 
        ? `${suite.command} --coverage`
        : suite.command;

      const output = await this.executeCommand(command, suite.timeout);
      
      // Parse test results from output
      result.tests = this.parseTestOutput(output);
      result.status = result.tests.failed === 0 ? 'passed' : 'failed';
      
      // Extract coverage if available
      if (this.options.coverage) {
        result.coverage = this.parseCoverageOutput(output);
      }

      console.log(`   ✅ ${suite.name} completed: ${result.tests.passed}/${result.tests.total} tests passed`);
      
      if (result.coverage) {
        console.log(`   📊 Coverage: ${result.coverage.statements}% statements, ${result.coverage.branches}% branches`);
      }

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      
      console.error(`   ❌ ${suite.name} failed: ${error.message}`);
      
      if (suite.critical) {
        this.results.errors.push(`Critical suite failed: ${suite.name} - ${error.message}`);
      } else {
        this.results.warnings.push(`Non-critical suite failed: ${suite.name} - ${error.message}`);
      }
    } finally {
      result.duration = Date.now() - startTime;
      this.results.suites.push(result);
      
      // Update overall results
      this.results.overall.total += result.tests.total;
      this.results.overall.passed += result.tests.passed;
      this.results.overall.failed += result.tests.failed;
      this.results.overall.skipped += result.tests.skipped;
    }

    console.log();
  }

  async executeCommand(command, timeout = this.options.timeout) {
    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      const child = spawn('cmd', ['/c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        timeout,
      });

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput || output}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      // Handle timeout
      setTimeout(() => {
        child.kill();
        reject(new Error(`Command timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  parseTestOutput(output) {
    const tests = { total: 0, passed: 0, failed: 0, skipped: 0 };

    // Jest output patterns
    const jestSuitePattern = /Test Suites: (\d+) failed(?:, (\d+) passed)?(?:, (\d+) total)?/i;
    const jestTestPattern = /Tests:\s+(\d+) failed(?:, (\d+) passed)?(?:, (\d+) total)?/i;
    
    // Playwright output patterns
    const playwrightPattern = /(\d+) passed(?:, (\d+) failed)?(?:, (\d+) skipped)?/i;

    let match;

    // Try Jest patterns first
    if ((match = output.match(jestTestPattern))) {
      tests.failed = parseInt(match[1]) || 0;
      tests.passed = parseInt(match[2]) || 0;
      tests.total = parseInt(match[3]) || tests.passed + tests.failed;
    }
    // Try Playwright pattern
    else if ((match = output.match(playwrightPattern))) {
      tests.passed = parseInt(match[1]) || 0;
      tests.failed = parseInt(match[2]) || 0;
      tests.skipped = parseInt(match[3]) || 0;
      tests.total = tests.passed + tests.failed + tests.skipped;
    }
    // Fallback: look for generic patterns
    else {
      // Count occurrences of common test result indicators
      const passMatches = output.match(/✓|✅|PASS|passed/gi) || [];
      const failMatches = output.match(/✗|❌|FAIL|failed/gi) || [];
      const skipMatches = output.match(/⚬|⏸|SKIP|skipped/gi) || [];

      tests.passed = passMatches.length;
      tests.failed = failMatches.length;
      tests.skipped = skipMatches.length;
      tests.total = tests.passed + tests.failed + tests.skipped;
    }

    return tests;
  }

  parseCoverageOutput(output) {
    const coverage = { statements: 0, branches: 0, functions: 0, lines: 0 };

    // Look for coverage summary in output
    const coveragePattern = /All files\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)\s*\|\s*([0-9.]+)/i;
    const match = output.match(coveragePattern);

    if (match) {
      coverage.statements = parseFloat(match[1]) || 0;
      coverage.branches = parseFloat(match[2]) || 0;
      coverage.functions = parseFloat(match[3]) || 0;
      coverage.lines = parseFloat(match[4]) || 0;
    }

    return coverage;
  }

  async generateReports() {
    console.log('📄 Generating comprehensive test reports...');

    try {
      // Generate coverage report if enabled
      if (this.options.coverage) {
        await this.generateCoverageReport();
      }

      // Generate JSON summary report
      await this.generateSummaryReport();

      // Generate HTML dashboard
      await this.generateDashboard();

      console.log('   ✅ Reports generated successfully\n');

    } catch (error) {
      console.error('   ⚠️ Report generation failed:', error.message);
      this.results.warnings.push(`Report generation: ${error.message}`);
    }
  }

  async generateCoverageReport() {
    try {
      // Run the coverage report generator
      await this.executeCommand('node scripts/generate-coverage-report.js');
      console.log('   📊 Coverage report generated');
    } catch (error) {
      console.warn('   ⚠️ Coverage report generation failed:', error.message);
    }
  }

  async generateSummaryReport() {
    const reportPath = path.join('test-reports', 'test-summary.json');
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log('   📝 Summary report generated:', reportPath);
  }

  async generateDashboard() {
    const dashboard = this.createDashboardHTML();
    const dashboardPath = path.join('test-reports', 'test-dashboard.html');
    await fs.writeFile(dashboardPath, dashboard);
    console.log('   🎨 Test dashboard generated:', dashboardPath);
  }

  createDashboardHTML() {
    const passedSuites = this.results.suites.filter(s => s.status === 'passed').length;
    const totalSuites = this.results.suites.length;
    const overallPassRate = this.results.overall.total > 0 
      ? (this.results.overall.passed / this.results.overall.total * 100) 
      : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Suite Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { font-size: 3rem; margin-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .stat-card { 
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            text-align: center;
        }
        .stat-value { font-size: 2.5rem; font-weight: bold; margin-bottom: 10px; }
        .stat-label { font-size: 1rem; opacity: 0.8; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        .suites-grid { display: grid; gap: 15px; }
        .suite-card { 
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 10px;
            padding: 20px;
            border-left: 4px solid;
        }
        .suite-passed { border-left-color: #10b981; }
        .suite-failed { border-left-color: #ef4444; }
        .suite-header { display: flex; justify-content: between; align-items: center; margin-bottom: 10px; }
        .suite-title { font-size: 1.2rem; font-weight: 600; }
        .suite-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; }
        .status-passed { background: #10b981; color: white; }
        .status-failed { background: #ef4444; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Suite Results</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Duration: ${Math.round(this.results.duration / 1000)}s</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value ${overallPassRate >= 90 ? 'success' : overallPassRate >= 70 ? 'warning' : 'error'}">
                    ${overallPassRate.toFixed(1)}%
                </div>
                <div class="stat-label">Overall Pass Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value success">${this.results.overall.passed}</div>
                <div class="stat-label">Tests Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value error">${this.results.overall.failed}</div>
                <div class="stat-label">Tests Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${passedSuites}/${totalSuites}</div>
                <div class="stat-label">Suites Passed</div>
            </div>
        </div>

        <div class="suites-grid">
            ${this.results.suites.map(suite => `
                <div class="suite-card suite-${suite.status}">
                    <div class="suite-header">
                        <div class="suite-title">${suite.name}</div>
                        <div class="suite-status status-${suite.status}">${suite.status}</div>
                    </div>
                    <div>
                        ${suite.tests.passed}/${suite.tests.total} tests passed
                        (${suite.duration}ms)
                    </div>
                    ${suite.coverage ? `
                        <div style="margin-top: 10px; font-size: 0.9rem;">
                            Coverage: ${suite.coverage.statements}% statements, ${suite.coverage.branches}% branches
                        </div>
                    ` : ''}
                    ${suite.error ? `
                        <div style="margin-top: 10px; color: #ef4444; font-size: 0.9rem;">
                            Error: ${suite.error}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  async finalValidation() {
    console.log('🔍 Running final validation...');

    let validationErrors = [];

    // Check coverage thresholds
    if (this.options.coverage) {
      const coverageThresholds = { statements: 70, branches: 65, functions: 70, lines: 70 };
      
      for (const suite of this.results.suites) {
        if (suite.coverage) {
          Object.entries(coverageThresholds).forEach(([metric, threshold]) => {
            if (suite.coverage[metric] < threshold) {
              validationErrors.push(
                `${suite.name}: ${metric} coverage ${suite.coverage[metric]}% below threshold ${threshold}%`
              );
            }
          });
        }
      }
    }

    // Check critical test failures
    const criticalFailures = this.results.suites.filter(
      suite => suite.status === 'failed' && ['Unit Tests', 'Integration Tests', 'Security Tests'].includes(suite.name)
    );

    if (criticalFailures.length > 0) {
      validationErrors.push(`Critical test failures: ${criticalFailures.map(s => s.name).join(', ')}`);
    }

    // Report validation results
    if (validationErrors.length === 0) {
      console.log('   ✅ Final validation passed\n');
    } else {
      console.warn('   ⚠️ Validation warnings:');
      validationErrors.forEach(error => console.warn(`      - ${error}`));
      console.log();
      
      this.results.warnings.push(...validationErrors);
    }
  }

  printSummary() {
    console.log('═'.repeat(80));
    console.log('🎯 TEST SUITE EXECUTION SUMMARY');
    console.log('═'.repeat(80));
    console.log();

    console.log(`⏱️  Duration: ${Math.round(this.results.duration / 1000)}s`);
    console.log(`📊 Overall Results: ${this.results.overall.passed}/${this.results.overall.total} tests passed`);
    console.log(`📈 Pass Rate: ${(this.results.overall.passed / this.results.overall.total * 100).toFixed(1)}%`);
    console.log();

    // Suite breakdown
    console.log('📋 Test Suites:');
    this.results.suites.forEach(suite => {
      const status = suite.status === 'passed' ? '✅' : '❌';
      const coverage = suite.coverage 
        ? ` (${suite.coverage.statements}% coverage)`
        : '';
      
      console.log(`   ${status} ${suite.name}: ${suite.tests.passed}/${suite.tests.total}${coverage}`);
    });
    console.log();

    // Errors and warnings
    if (this.results.errors.length > 0) {
      console.log('❌ Errors:');
      this.results.errors.forEach(error => console.log(`   - ${error}`));
      console.log();
    }

    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log();
    }

    // Final status
    const overallStatus = this.results.overall.failed === 0 && this.results.errors.length === 0;
    console.log(`🏁 Final Status: ${overallStatus ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (this.options.generateReports) {
      console.log('📄 Reports: Check test-reports/ directory');
    }
    
    console.log('═'.repeat(80));
  }
}

// CLI interface - ES module check
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
  const runner = new TestSuiteRunner();
  runner.run().catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}

export default TestSuiteRunner;