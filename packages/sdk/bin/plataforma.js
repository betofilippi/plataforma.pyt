#!/usr/bin/env node

/**
 * Plataforma CLI - Executable Entry Point
 */

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error(`❌ Node.js version ${nodeVersion} is not supported.`);
  console.error('   Please use Node.js 18 or higher.');
  console.error('   Visit https://nodejs.org to download the latest version.');
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Import and run CLI
try {
  require('../dist/cli/index.js');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.error('❌ Plataforma SDK is not built. Please run:');
    console.error('   npm run build');
    console.error('');
    console.error('   Or if you\'re developing the SDK:');
    console.error('   npm run dev');
    process.exit(1);
  } else {
    console.error('❌ Failed to start Plataforma CLI:', error.message);
    process.exit(1);
  }
}