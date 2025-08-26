import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadModuleConfig } from '../utils/config-loader';
import { validateModuleStructure } from '../utils/validator';
import { ModuleRegistryClient } from '../api/registry-client';
import { RegistryClient } from '@plataforma/module-registry';

export interface PublishModuleOptions {
  dryRun?: boolean;
  tag?: string;
  access?: 'public' | 'private';
  registry?: string;
  skipTests?: boolean;
  skipBuild?: boolean;
}

export async function publishModule(options: PublishModuleOptions = {}) {
  const cwd = process.cwd();
  
  // Load and validate module
  const config = await loadModuleConfig(cwd);
  if (!config) {
    throw new Error('module.json not found. Are you in a valid module directory?');
  }

  console.log(chalk.blue(`📦 Publishing module "${config.name}" v${config.version}...`));

  // Validate module structure
  const structureValidation = await validateModuleStructure(cwd);
  if (!structureValidation.isValid) {
    throw new Error(`Invalid module structure:\n${structureValidation.errors.join('\n')}`);
  }

  // Pre-publish checks
  await prePublishChecks(cwd, options);

  if (options.dryRun) {
    console.log(chalk.yellow('🧪 Dry run mode - no actual publishing'));
    return await simulatePublish(config, options);
  }

  // Confirm publication
  const shouldPublish = await confirmPublication(config, options);
  if (!shouldPublish) {
    console.log(chalk.yellow('Publication cancelled'));
    return;
  }

  try {
    // Build module if needed
    if (!options.skipBuild) {
      console.log(chalk.blue('🏗️  Building module for production...'));
      const { buildModule } = await import('./build-module');
      await buildModule({ mode: 'production', minify: true });
    }

    // Run tests if needed
    if (!options.skipTests) {
      console.log(chalk.blue('🧪 Running tests before publish...'));
      const { testModule } = await import('./test-module');
      await testModule({ bail: true });
    }

    // Create package tarball
    const tarballPath = await createPackage(cwd, config);

    // Upload to registry - use enhanced client if available
    let registryClient: ModuleRegistryClient | RegistryClient;
    
    try {
      registryClient = new RegistryClient(options.registry);
    } catch {
      // Fallback to basic client
      registryClient = new ModuleRegistryClient(options.registry);
    }

    // Read tarball as buffer for enhanced client
    let publishResult;
    if (registryClient instanceof RegistryClient) {
      const tarballBuffer = await fs.readFile(tarballPath);
      publishResult = await registryClient.publishPackage({
        tarball: tarballBuffer,
        manifest: config,
        tag: options.tag || 'latest',
        access: options.access || 'public'
      });
    } else {
      publishResult = await registryClient.publishModule(tarballPath, {
        tag: options.tag || 'latest',
        access: options.access || 'public'
      });
    }

    // Clean up tarball
    await fs.remove(tarballPath);

    console.log(chalk.green(`✅ Module "${config.name}" v${config.version} published successfully!`));
    console.log(chalk.blue(`   Registry: ${publishResult.registry}`));
    console.log(chalk.blue(`   URL: ${publishResult.url}`));
    
    if (publishResult.downloadUrl) {
      console.log(chalk.blue(`   Download: ${publishResult.downloadUrl}`));
    }

    // Update version suggestions
    console.log(chalk.yellow('\n💡 Next steps:'));
    console.log(chalk.gray('1. Tag this version: git tag v' + config.version));
    console.log(chalk.gray('2. Push tags: git push origin --tags'));
    console.log(chalk.gray('3. Update version for next release'));

    return publishResult;

  } catch (error) {
    throw new Error(`Publication failed: ${error.message}`);
  }
}

async function prePublishChecks(cwd: string, options: PublishModuleOptions) {
  const checks = [
    { name: 'Git status clean', check: checkGitStatus },
    { name: 'Package.json valid', check: checkPackageJson },
    { name: 'Build artifacts exist', check: checkBuildArtifacts },
    { name: 'Dependencies resolved', check: checkDependencies }
  ];

  if (!options.skipTests) {
    checks.push({ name: 'Tests passing', check: checkTests });
  }

  console.log(chalk.blue('🔍 Running pre-publish checks...'));

  for (const check of checks) {
    try {
      await check.check(cwd);
      console.log(chalk.green(`   ✅ ${check.name}`));
    } catch (error) {
      console.log(chalk.red(`   ❌ ${check.name}: ${error.message}`));
      throw new Error(`Pre-publish check failed: ${check.name}`);
    }
  }
}

async function checkGitStatus(cwd: string) {
  try {
    const status = execSync('git status --porcelain', { 
      cwd, 
      encoding: 'utf8' 
    });
    
    if (status.trim()) {
      throw new Error('Working directory not clean. Commit or stash changes first.');
    }
  } catch (error) {
    if (error.message.includes('not a git repository')) {
      console.warn(chalk.yellow('   ⚠️  Not a git repository - skipping git check'));
    } else {
      throw error;
    }
  }
}

async function checkPackageJson(cwd: string) {
  const packageJsonPath = path.join(cwd, 'package.json');
  
  if (!await fs.pathExists(packageJsonPath)) {
    throw new Error('package.json not found');
  }

  const packageJson = await fs.readJson(packageJsonPath);
  
  if (!packageJson.name) {
    throw new Error('package.json missing name field');
  }
  
  if (!packageJson.version) {
    throw new Error('package.json missing version field');
  }
  
  if (!packageJson.main && !packageJson.module) {
    throw new Error('package.json missing main or module field');
  }
}

async function checkBuildArtifacts(cwd: string) {
  const distPath = path.join(cwd, 'dist');
  
  if (!await fs.pathExists(distPath)) {
    throw new Error('Build artifacts not found. Run "plataforma build" first.');
  }

  const files = await fs.readdir(distPath);
  if (files.length === 0) {
    throw new Error('Build directory is empty');
  }
}

async function checkDependencies(cwd: string) {
  const nodeModulesPath = path.join(cwd, 'node_modules');
  
  if (!await fs.pathExists(nodeModulesPath)) {
    throw new Error('Dependencies not installed. Run "npm install" first.');
  }
}

async function checkTests(cwd: string) {
  try {
    execSync('npm test', { cwd, stdio: 'ignore' });
  } catch (error) {
    throw new Error('Tests are failing');
  }
}

async function confirmPublication(config: any, options: PublishModuleOptions) {
  if (process.env.CI) {
    return true; // Auto-confirm in CI
  }

  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Publish "${config.name}" v${config.version} to ${options.registry || 'default registry'}?`,
      default: false
    }
  ]);

  return answers.confirm;
}

async function createPackage(cwd: string, config: any): Promise<string> {
  const tarballName = `${config.name}-${config.version}.tgz`;
  const tarballPath = path.join(cwd, tarballName);

  // Create npm package
  execSync('npm pack', { cwd, stdio: 'ignore' });

  // Find the created tarball
  const files = await fs.readdir(cwd);
  const tarball = files.find(file => file.endsWith('.tgz'));
  
  if (!tarball) {
    throw new Error('Failed to create package tarball');
  }

  // Rename to expected name if different
  if (tarball !== tarballName) {
    await fs.move(path.join(cwd, tarball), tarballPath);
  }

  return tarballPath;
}

async function simulatePublish(config: any, options: PublishModuleOptions) {
  console.log(chalk.blue('\n📋 Publish simulation:'));
  console.log(chalk.gray(`   Module: ${config.name}`));
  console.log(chalk.gray(`   Version: ${config.version}`));
  console.log(chalk.gray(`   Tag: ${options.tag || 'latest'}`));
  console.log(chalk.gray(`   Access: ${options.access || 'public'}`));
  console.log(chalk.gray(`   Registry: ${options.registry || 'default'}`));

  const packageSize = await getPackageSize(process.cwd());
  console.log(chalk.gray(`   Package size: ${packageSize}`));

  console.log(chalk.green('\n✅ Simulation complete - ready for actual publish'));

  return {
    name: config.name,
    version: config.version,
    size: packageSize,
    simulated: true
  };
}

async function getPackageSize(cwd: string): Promise<string> {
  try {
    // Create temporary package to get size
    execSync('npm pack --dry-run', { cwd, stdio: 'ignore' });
    
    const output = execSync('npm pack --dry-run 2>&1', { 
      cwd, 
      encoding: 'utf8' 
    });
    
    const sizeMatch = output.match(/(\d+\.?\d*\s*[kKmMgG]?[bB])/);
    return sizeMatch ? sizeMatch[0] : 'Unknown';
    
  } catch (error) {
    return 'Unknown';
  }
}