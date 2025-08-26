/**
 * Jest Global Teardown
 * Runs once after all test suites complete
 */

module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...');
  
  // Cleanup test database connections
  if (process.env.DATABASE_URL && process.env.RUN_INTEGRATION_TESTS === 'true') {
    try {
      // Clean up any open database connections
      console.log('🗄️  Closing database connections...');
      
      // If using a connection pool, close it
      if (global.__db_pool__) {
        await global.__db_pool__.end();
        delete global.__db_pool__;
      }
    } catch (error) {
      console.warn('⚠️  Database cleanup warning:', error.message);
    }
  }
  
  // Cleanup test Redis connections
  if (process.env.REDIS_URL && process.env.RUN_INTEGRATION_TESTS === 'true') {
    try {
      console.log('🗃️  Closing Redis connections...');
      
      if (global.__redis_client__) {
        await global.__redis_client__.quit();
        delete global.__redis_client__;
      }
    } catch (error) {
      console.warn('⚠️  Redis cleanup warning:', error.message);
    }
  }
  
  // Cleanup any running servers
  if (global.__test_server__) {
    try {
      console.log('🛑 Shutting down test server...');
      await new Promise((resolve) => {
        global.__test_server__.close(resolve);
      });
      delete global.__test_server__;
    } catch (error) {
      console.warn('⚠️  Server cleanup warning:', error.message);
    }
  }
  
  // Clear any intervals or timeouts
  if (global.__test_timers__) {
    console.log('⏰ Clearing test timers...');
    global.__test_timers__.forEach(timer => clearTimeout(timer));
    delete global.__test_timers__;
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Global test cleanup complete');
};