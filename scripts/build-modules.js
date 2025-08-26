#!/usr/bin/env node

/**
 * Build script for all platform modules
 * Builds each module independently for module federation
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const modulesDir = path.join(rootDir, 'modules');

// Available modules
const modules = ['database', 'sistema', 'marketplace', 'vendas'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function buildModule(moduleName) {
  const modulePath = path.join(modulesDir, moduleName);
  
  if (!existsSync(modulePath)) {
    log(`❌ Module '${moduleName}' not found at ${modulePath}`, 'red');
    return false;
  }
  
  log(`🔨 Building module: ${moduleName}`, 'blue');
  
  try {
    // Change to module directory and run build
    process.chdir(modulePath);
    execSync('npm run build', { stdio: 'inherit' });
    
    log(`✅ Successfully built module: ${moduleName}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed to build module '${moduleName}': ${error.message}`, 'red');
    return false;
  } finally {
    // Return to root directory
    process.chdir(rootDir);
  }
}

function buildAllModules() {
  log('🚀 Starting module federation build process...', 'cyan');
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const module of modules) {
    log(`\n${'='.repeat(50)}`, 'yellow');
    const success = buildModule(module);
    
    if (success) {
      results.success.push(module);
    } else {
      results.failed.push(module);
    }
  }
  
  // Summary
  log(`\n${'='.repeat(50)}`, 'yellow');
  log('📊 Build Summary:', 'cyan');
  log(`✅ Successful: ${results.success.length} modules`, 'green');
  log(`❌ Failed: ${results.failed.length} modules`, 'red');
  
  if (results.success.length > 0) {
    log('\nSuccessful builds:', 'green');
    results.success.forEach(module => log(`  - ${module}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log('\nFailed builds:', 'red');
    results.failed.forEach(module => log(`  - ${module}`, 'red'));
  }
  
  if (results.failed.length === 0) {
    log('\n🎉 All modules built successfully!', 'green');
    process.exit(0);
  } else {
    log('\n💥 Some modules failed to build. Check errors above.', 'red');
    process.exit(1);
  }
}

// Main execution
if (process.argv.length > 2) {
  // Build specific module
  const moduleName = process.argv[2];
  if (modules.includes(moduleName)) {
    buildModule(moduleName);
  } else {
    log(`❌ Unknown module: ${moduleName}`, 'red');
    log(`Available modules: ${modules.join(', ')}`, 'yellow');
    process.exit(1);
  }
} else {
  // Build all modules
  buildAllModules();
}