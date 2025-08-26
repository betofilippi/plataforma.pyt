/**
 * Jest Global Setup
 * Runs once before all test suites
 */

const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CI = process.env.CI || 'false';
  
  // Ensure test database is available (if using real DB for integration tests)
  if (process.env.RUN_INTEGRATION_TESTS === 'true') {
    try {
      console.log('📊 Setting up test database...');
      
      // Run database migrations for test environment
      if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('test')) {
        execSync('npm run db:migrate', {
          env: { ...process.env, NODE_ENV: 'test' },
          stdio: 'inherit',
        });
        console.log('✅ Test database setup complete');
      }
    } catch (error) {
      console.warn('⚠️  Test database setup failed:', error.message);
      console.warn('   Integration tests may fail if database is required');
    }
  }
  
  // Setup test Redis (if needed)
  if (process.env.REDIS_URL && process.env.RUN_INTEGRATION_TESTS === 'true') {
    try {
      console.log('🗃️  Clearing test Redis cache...');
      const redis = require('redis');
      const client = redis.createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.flushDb();
      await client.quit();
      console.log('✅ Test Redis setup complete');
    } catch (error) {
      console.warn('⚠️  Redis setup failed:', error.message);
      console.warn('   Tests using Redis may be skipped');
    }
  }
  
  // Create test directories
  const testDirs = [
    './coverage',
    './test-results',
    './.jest-cache',
  ];
  
  testDirs.forEach(dir => {
    try {
      const fs = require('fs');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.warn(`⚠️  Could not create test directory ${dir}:`, error.message);
    }
  });
  
  console.log('✅ Global test environment ready');
};