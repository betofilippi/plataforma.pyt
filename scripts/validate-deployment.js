/**
 * Deployment Validation Script
 * Comprehensive validation suite for deployment verification
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DeploymentValidator {
  constructor(options = {}) {
    this.options = {
      environment: process.env.DEPLOY_ENVIRONMENT || 'staging',
      baseUrl: process.env.DEPLOY_URL || 'http://localhost:3030',
      apiUrl: process.env.API_URL || 'http://localhost:4000',
      timeout: 30000,
      retries: 3,
      healthCheckInterval: 5000,
      healthCheckTimeout: 300000, // 5 minutes
      ...options,
    };

    this.results = {
      timestamp: new Date().toISOString(),
      environment: this.options.environment,
      baseUrl: this.options.baseUrl,
      tests: [],
      overall: 'pending',
      duration: 0,
    };
  }

  async validate() {
    console.log('🚀 Starting deployment validation...\n');
    console.log(`Environment: ${this.options.environment}`);
    console.log(`Base URL: ${this.options.baseUrl}`);
    console.log(`API URL: ${this.options.apiUrl}\n`);

    const startTime = Date.now();

    try {
      // Phase 1: Infrastructure Validation
      await this.validateInfrastructure();

      // Phase 2: Application Health
      await this.validateApplicationHealth();

      // Phase 3: Functionality Tests
      await this.validateFunctionality();

      // Phase 4: Performance Tests
      await this.validatePerformance();

      // Phase 5: Security Checks
      await this.validateSecurity();

      // Phase 6: Monitoring & Logging
      await this.validateMonitoring();

      this.results.overall = 'success';
      console.log('\n✅ Deployment validation completed successfully!');

    } catch (error) {
      this.results.overall = 'failure';
      console.error('\n❌ Deployment validation failed:', error.message);
      
      // Continue with failure analysis
      await this.analyzeFailure(error);
      
      throw error;
    } finally {
      this.results.duration = Date.now() - startTime;
      await this.generateReport();
    }
  }

  async runTest(name, testFn, critical = true) {
    console.log(`🧪 Running test: ${name}...`);
    
    const test = {
      name,
      status: 'pending',
      critical,
      duration: 0,
      error: null,
      details: {},
    };

    const testStart = Date.now();

    try {
      const result = await testFn();
      test.status = 'success';
      test.details = result || {};
      console.log(`   ✅ ${name} - passed`);
      
    } catch (error) {
      test.status = 'failure';
      test.error = error.message;
      console.log(`   ❌ ${name} - failed: ${error.message}`);
      
      if (critical) {
        throw error;
      }
    } finally {
      test.duration = Date.now() - testStart;
      this.results.tests.push(test);
    }
  }

  async validateInfrastructure() {
    console.log('\n📡 Phase 1: Infrastructure Validation');

    await this.runTest('DNS Resolution', async () => {
      const url = new URL(this.options.baseUrl);
      const hostname = url.hostname;
      
      // Simple check - if axios can connect, DNS is working
      await axios.get(this.options.baseUrl, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status for DNS check
      });
      
      return { hostname, resolved: true };
    });

    await this.runTest('SSL Certificate', async () => {
      if (!this.options.baseUrl.startsWith('https://')) {
        return { ssl: false, reason: 'HTTP endpoint' };
      }

      const response = await axios.get(this.options.baseUrl, {
        timeout: 10000,
        validateStatus: () => true
      });

      return { 
        ssl: true, 
        protocol: response.request?.protocol || 'https:',
        status: response.status 
      };
    });

    await this.runTest('Load Balancer Health', async () => {
      const response = await axios.get(this.options.baseUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DeploymentValidator/1.0'
        }
      });

      return {
        status: response.status,
        headers: {
          server: response.headers.server,
          'x-powered-by': response.headers['x-powered-by'],
          'x-load-balancer': response.headers['x-load-balancer'],
        }
      };
    });
  }

  async validateApplicationHealth() {
    console.log('\n🏥 Phase 2: Application Health');

    await this.runTest('Application Start', async () => {
      return await this.waitForApplication();
    });

    await this.runTest('Health Endpoint', async () => {
      const healthUrl = `${this.options.apiUrl}/health`;
      const response = await axios.get(healthUrl, { timeout: 10000 });
      
      if (response.status !== 200) {
        throw new Error(`Health endpoint returned ${response.status}`);
      }

      const health = response.data;
      
      if (health.status !== 'ok' && health.status !== 'healthy') {
        throw new Error(`Application health status: ${health.status}`);
      }

      return health;
    });

    await this.runTest('Database Connectivity', async () => {
      try {
        const dbHealthUrl = `${this.options.apiUrl}/health/database`;
        const response = await axios.get(dbHealthUrl, { timeout: 15000 });
        return response.data;
      } catch (error) {
        if (error.response?.status === 404) {
          // Database health endpoint might not exist
          return { status: 'unknown', reason: 'Endpoint not implemented' };
        }
        throw error;
      }
    }, false); // Non-critical

    await this.runTest('Memory Usage', async () => {
      try {
        const memoryUrl = `${this.options.apiUrl}/health/memory`;
        const response = await axios.get(memoryUrl, { timeout: 10000 });
        
        const memory = response.data;
        const memoryUsagePercent = (memory.used / memory.total) * 100;
        
        if (memoryUsagePercent > 90) {
          throw new Error(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
        }

        return { ...memory, usagePercent: memoryUsagePercent };
      } catch (error) {
        if (error.response?.status === 404) {
          return { status: 'unknown', reason: 'Endpoint not implemented' };
        }
        throw error;
      }
    }, false); // Non-critical
  }

  async validateFunctionality() {
    console.log('\n⚙️ Phase 3: Functionality Tests');

    await this.runTest('Static Assets', async () => {
      const response = await axios.get(this.options.baseUrl, { timeout: 15000 });
      const html = response.data;
      
      // Check for CSS and JS references
      const cssMatches = html.match(/href="[^"]*\.css[^"]*"/g) || [];
      const jsMatches = html.match(/src="[^"]*\.js[^"]*"/g) || [];
      
      return {
        cssFiles: cssMatches.length,
        jsFiles: jsMatches.length,
        totalSize: html.length,
      };
    });

    await this.runTest('API Endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/version',
      ];

      const results = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.options.baseUrl}${endpoint}`, {
            timeout: 10000,
            validateStatus: (status) => status < 500
          });
          
          results[endpoint] = {
            status: response.status,
            ok: response.status < 400
          };
        } catch (error) {
          results[endpoint] = {
            status: 'error',
            error: error.message,
            ok: false
          };
        }
      }

      return results;
    }, false); // Non-critical

    await this.runTest('Authentication Flow', async () => {
      // Test login page accessibility
      const loginUrl = `${this.options.baseUrl}/login`;
      const response = await axios.get(loginUrl, { 
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status >= 400) {
        throw new Error(`Login page returned ${response.status}`);
      }

      const html = response.data;
      const hasEmailField = html.includes('type="email"') || html.includes('name="email"');
      const hasPasswordField = html.includes('type="password"') || html.includes('name="password"');
      const hasSubmitButton = html.includes('type="submit"') || html.includes('button');

      return {
        loginPageStatus: response.status,
        hasEmailField,
        hasPasswordField,
        hasSubmitButton,
        isAccessible: hasEmailField && hasPasswordField && hasSubmitButton
      };
    });
  }

  async validatePerformance() {
    console.log('\n⚡ Phase 4: Performance Tests');

    await this.runTest('Response Time', async () => {
      const measurements = [];
      
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await axios.get(this.options.baseUrl, { timeout: 30000 });
        const duration = Date.now() - start;
        measurements.push(duration);
      }

      const avgResponseTime = measurements.reduce((a, b) => a + b) / measurements.length;
      const maxResponseTime = Math.max(...measurements);
      
      if (avgResponseTime > 5000) {
        throw new Error(`Slow response time: ${avgResponseTime}ms average`);
      }

      return {
        measurements,
        average: avgResponseTime,
        max: maxResponseTime,
        acceptable: avgResponseTime <= 5000
      };
    });

    await this.runTest('Concurrent Requests', async () => {
      const concurrentRequests = 5;
      const promises = [];

      const start = Date.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          axios.get(this.options.baseUrl, { timeout: 30000 })
            .then(response => ({ success: true, status: response.status }))
            .catch(error => ({ success: false, error: error.message }))
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - start;
      const successful = results.filter(r => r.success).length;
      
      if (successful < concurrentRequests * 0.8) {
        throw new Error(`Only ${successful}/${concurrentRequests} concurrent requests succeeded`);
      }

      return {
        total: concurrentRequests,
        successful,
        failed: concurrentRequests - successful,
        duration,
        successRate: (successful / concurrentRequests) * 100
      };
    });

    await this.runTest('Memory Stability', async () => {
      // Make multiple requests and check if memory grows excessively
      const iterations = 10;
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        await axios.get(this.options.baseUrl, { timeout: 15000 });
        
        try {
          const memoryResponse = await axios.get(`${this.options.apiUrl}/health/memory`, { 
            timeout: 5000 
          });
          memoryReadings.push(memoryResponse.data.used);
        } catch (error) {
          // Memory endpoint might not be available
          break;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (memoryReadings.length === 0) {
        return { status: 'unknown', reason: 'Memory endpoint not available' };
      }

      const avgMemory = memoryReadings.reduce((a, b) => a + b) / memoryReadings.length;
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      
      return {
        iterations,
        readings: memoryReadings.length,
        averageMemory: avgMemory,
        memoryGrowth,
        stable: Math.abs(memoryGrowth) < avgMemory * 0.1 // Less than 10% growth
      };
    }, false); // Non-critical
  }

  async validateSecurity() {
    console.log('\n🔒 Phase 5: Security Checks');

    await this.runTest('Security Headers', async () => {
      const response = await axios.get(this.options.baseUrl, { timeout: 15000 });
      const headers = response.headers;
      
      const securityHeaders = {
        'x-frame-options': headers['x-frame-options'],
        'x-content-type-options': headers['x-content-type-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'strict-transport-security': headers['strict-transport-security'],
        'content-security-policy': headers['content-security-policy'],
        'referrer-policy': headers['referrer-policy'],
      };

      const presentHeaders = Object.entries(securityHeaders)
        .filter(([_, value]) => value)
        .length;

      return {
        headers: securityHeaders,
        score: presentHeaders,
        maxScore: Object.keys(securityHeaders).length
      };
    }, false); // Non-critical

    await this.runTest('HTTPS Enforcement', async () => {
      if (this.options.environment === 'production') {
        if (!this.options.baseUrl.startsWith('https://')) {
          throw new Error('Production should use HTTPS');
        }
        
        // Test HTTP to HTTPS redirect
        const httpUrl = this.options.baseUrl.replace('https://', 'http://');
        try {
          const response = await axios.get(httpUrl, { 
            timeout: 10000,
            maxRedirects: 0,
            validateStatus: (status) => status < 400
          });
          
          if (response.status < 300 || response.status >= 400) {
            throw new Error('HTTP should redirect to HTTPS');
          }
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            // HTTP port might be closed, which is also acceptable
            return { httpRedirect: 'blocked', acceptable: true };
          }
        }
      }

      return { httpsEnforced: this.options.baseUrl.startsWith('https://') };
    });

    await this.runTest('Exposed Information', async () => {
      const response = await axios.get(this.options.baseUrl, { timeout: 15000 });
      const html = response.data.toLowerCase();
      const headers = response.headers;
      
      const exposedInfo = [];
      
      // Check for common information exposure
      if (html.includes('error') && html.includes('stack')) {
        exposedInfo.push('Stack traces in HTML');
      }
      
      if (headers['x-powered-by']) {
        exposedInfo.push(`X-Powered-By: ${headers['x-powered-by']}`);
      }
      
      if (headers.server && !headers.server.includes('cloudflare')) {
        exposedInfo.push(`Server: ${headers.server}`);
      }

      return {
        exposedInfo,
        count: exposedInfo.length,
        acceptable: exposedInfo.length === 0
      };
    }, false); // Non-critical
  }

  async validateMonitoring() {
    console.log('\n📊 Phase 6: Monitoring & Logging');

    await this.runTest('Monitoring Endpoints', async () => {
      const monitoringEndpoints = [
        '/health',
        '/metrics',
        '/api/health',
      ];

      const results = {};
      
      for (const endpoint of monitoringEndpoints) {
        try {
          const response = await axios.get(`${this.options.baseUrl}${endpoint}`, {
            timeout: 10000,
            validateStatus: (status) => status < 500
          });
          
          results[endpoint] = {
            available: response.status < 400,
            status: response.status
          };
        } catch (error) {
          results[endpoint] = {
            available: false,
            error: error.message
          };
        }
      }

      const availableCount = Object.values(results).filter(r => r.available).length;
      
      return {
        endpoints: results,
        availableCount,
        totalCount: monitoringEndpoints.length
      };
    }, false); // Non-critical

    await this.runTest('Log Accessibility', async () => {
      // This would typically check if logs are being written and accessible
      // For now, we'll check if the application responds properly
      const response = await axios.get(this.options.baseUrl, { timeout: 15000 });
      
      return {
        applicationResponding: response.status === 200,
        responseTime: response.headers['response-time'] || 'unknown',
        logLevel: 'unknown' // Would be determined from actual log configuration
      };
    }, false); // Non-critical
  }

  async waitForApplication() {
    console.log('   Waiting for application to be ready...');
    
    const startTime = Date.now();
    const maxWaitTime = this.options.healthCheckTimeout;
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(this.options.baseUrl, { 
          timeout: this.options.timeout 
        });
        
        if (response.status === 200) {
          const duration = Date.now() - startTime;
          console.log(`   Application ready after ${duration}ms`);
          return { ready: true, duration };
        }
        
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, this.options.healthCheckInterval));
    }
    
    throw new Error(`Application not ready after ${maxWaitTime}ms`);
  }

  async analyzeFailure(error) {
    console.log('\n🔍 Analyzing failure...');
    
    try {
      // Try to get basic connectivity
      const response = await axios.get(this.options.baseUrl, {
        timeout: 5000,
        validateStatus: () => true // Accept any status
      });
      
      console.log(`   Application returned status: ${response.status}`);
      
      if (response.status >= 500) {
        console.log('   Server error detected - check application logs');
      } else if (response.status >= 400) {
        console.log('   Client error detected - check request configuration');
      }
      
    } catch (networkError) {
      console.log(`   Network error: ${networkError.message}`);
      console.log('   Check if application is running and accessible');
    }
    
    // Add failure info to results
    this.results.failure = {
      error: error.message,
      timestamp: new Date().toISOString(),
      analysis: 'See logs above'
    };
  }

  async generateReport() {
    console.log('\n📄 Generating validation report...');
    
    const reportDir = 'deployment-reports';
    await fs.mkdir(reportDir, { recursive: true });
    
    // JSON report
    const jsonReport = path.join(reportDir, `validation-${this.options.environment}-${Date.now()}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(this.results, null, 2));
    
    // Summary report
    const summary = this.generateSummary();
    const summaryReport = path.join(reportDir, `validation-summary-${this.options.environment}.md`);
    await fs.writeFile(summaryReport, summary);
    
    console.log(`   Reports generated:`);
    console.log(`   - JSON: ${jsonReport}`);
    console.log(`   - Summary: ${summaryReport}`);
    
    return this.results;
  }

  generateSummary() {
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.status === 'success').length;
    const failedTests = this.results.tests.filter(t => t.status === 'failure').length;
    const criticalFailures = this.results.tests.filter(t => t.status === 'failure' && t.critical).length;
    
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100) : 0;
    
    return `# Deployment Validation Report

**Environment:** ${this.options.environment}  
**Timestamp:** ${this.results.timestamp}  
**Duration:** ${this.results.duration}ms  
**Status:** ${this.results.overall}  

## Summary

- **Total Tests:** ${totalTests}
- **Passed:** ${passedTests}
- **Failed:** ${failedTests}
- **Critical Failures:** ${criticalFailures}
- **Pass Rate:** ${passRate.toFixed(1)}%

## Test Results

${this.results.tests.map(test => 
  `### ${test.status === 'success' ? '✅' : '❌'} ${test.name}
- **Status:** ${test.status}
- **Duration:** ${test.duration}ms
- **Critical:** ${test.critical ? 'Yes' : 'No'}
${test.error ? `- **Error:** ${test.error}` : ''}
${test.details && Object.keys(test.details).length > 0 ? `- **Details:** ${JSON.stringify(test.details, null, 2)}` : ''}
`).join('\n')}

## Recommendations

${this.results.overall === 'failure' ? 
  '- ❌ **Critical issues found** - deployment should be rolled back or fixed immediately\n' +
  '- Check failed tests above for specific issues\n' +
  '- Verify application logs for additional error details'
  :
  '- ✅ **All critical tests passed** - deployment appears successful\n' +
  '- Monitor application performance and error rates\n' +
  '- Address any non-critical issues in future deployments'
}

---
*Generated by Deployment Validator*`;
  }
}

// CLI interface
if (require.main === module) {
  const validator = new DeploymentValidator();
  
  validator.validate()
    .then(() => {
      console.log('\n🎉 Validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed');
      process.exit(1);
    });
}

module.exports = DeploymentValidator;