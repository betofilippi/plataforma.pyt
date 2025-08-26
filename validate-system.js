#!/usr/bin/env node

/**
 * System Validation Script
 * Validates that the system is functioning correctly after migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Validating Plataforma.app System...\n');

const validations = [];

// 1. Check package structure
console.log('📦 Checking package structure...');
const packages = ['types', 'core-window-system', 'design-system', 'auth-system', 'sdk'];
packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, 'packages', pkg, 'package.json');
  if (fs.existsSync(pkgPath)) {
    validations.push({ name: `Package @plataforma/${pkg}`, status: '✅' });
  } else {
    validations.push({ name: `Package @plataforma/${pkg}`, status: '❌' });
  }
});

// 2. Check if all packages built successfully
console.log('🔨 Checking package builds...');
packages.forEach(pkg => {
  const distPath = path.join(__dirname, 'packages', pkg, 'dist');
  if (fs.existsSync(distPath)) {
    validations.push({ name: `Build ${pkg}`, status: '✅' });
  } else {
    validations.push({ name: `Build ${pkg}`, status: '⚠️' });
  }
});

// 3. Check main build
console.log('🏗️ Checking main build...');
const mainBuildPath = path.join(__dirname, 'dist', 'spa', 'index.html');
if (fs.existsSync(mainBuildPath)) {
  validations.push({ name: 'Main build', status: '✅' });
} else {
  validations.push({ name: 'Main build', status: '❌' });
}

// 4. Check TypeScript configurations
console.log('📝 Checking TypeScript configurations...');
const tsConfigs = [
  'tsconfig.json',
  'tsconfig.workspace.json',
  ...packages.map(pkg => `packages/${pkg}/tsconfig.json`)
];
tsConfigs.forEach(config => {
  const configPath = path.join(__dirname, config);
  if (fs.existsSync(configPath)) {
    validations.push({ name: `TypeScript ${config}`, status: '✅' });
  } else {
    validations.push({ name: `TypeScript ${config}`, status: '❌' });
  }
});

// 5. Check critical files
console.log('📄 Checking critical files...');
const criticalFiles = [
  'package.json',
  'vite.config.ts',
  'server/index.ts',
  'client/App.tsx'
];
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    validations.push({ name: `File ${file}`, status: '✅' });
  } else {
    validations.push({ name: `File ${file}`, status: '❌' });
  }
});

// 6. Check node_modules
console.log('📚 Checking dependencies...');
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  validations.push({ name: 'Dependencies installed', status: '✅' });
} else {
  validations.push({ name: 'Dependencies installed', status: '❌' });
}

// Display results
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION RESULTS:');
console.log('='.repeat(50) + '\n');

const passed = validations.filter(v => v.status === '✅').length;
const warnings = validations.filter(v => v.status === '⚠️').length;
const failed = validations.filter(v => v.status === '❌').length;

validations.forEach(v => {
  console.log(`${v.status} ${v.name}`);
});

console.log('\n' + '='.repeat(50));
console.log(`SUMMARY: ${passed} passed, ${warnings} warnings, ${failed} failed`);
console.log('='.repeat(50) + '\n');

// Overall status
if (failed === 0) {
  console.log('🎉 System validation PASSED! All critical components are in place.');
  if (warnings > 0) {
    console.log('⚠️  Some packages haven\'t been built yet. Run "npm run build:packages" to build them.');
  }
  process.exit(0);
} else {
  console.log('❌ System validation FAILED! Some critical components are missing.');
  console.log('Please review the failed items above.');
  process.exit(1);
}