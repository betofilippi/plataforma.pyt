import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { Enquirer } from 'enquirer';
import { createGitHubService } from '../../github';
import { ConfigManager } from '../../config';
import { TemplateEngine } from '../../templates';
import type { 
  RepositoryConfig, 
  CreateRepoOptions, 
  GenerationContext,
  ModuleType,
  LicenseType 
} from '../../types';
import { RepositoryConfigSchema } from '../../types';

export interface CreateRepoResult {
  repositoryUrl: string;
  localPath: string;
  config: RepositoryConfig;
}

/**
 * Create a new GitHub repository with module boilerplate
 */
export async function createRepository(
  name: string, 
  options: CreateRepoOptions & Record<string, any>
): Promise<CreateRepoResult> {
  
  // Step 1: Gather configuration
  const config = await gatherConfiguration(name, options);
  
  // Step 2: Validate configuration
  const validatedConfig = RepositoryConfigSchema.parse(config);
  
  // Step 3: Check if repository already exists (unless force)
  if (!options.force && !options.dryRun) {
    await checkRepositoryExists(validatedConfig);
  }
  
  // Step 4: Create repository on GitHub (unless dry run)
  let repository;
  if (!options.dryRun) {
    repository = await createGitHubRepository(validatedConfig);
    console.log(chalk.green(`✅ Created GitHub repository: ${repository.html_url}`));
  }
  
  // Step 5: Setup local directory and generate files
  const localPath = await setupLocalRepository(validatedConfig, options);
  
  // Step 6: Generate module files from templates
  await generateModuleFiles({
    config: validatedConfig,
    templatePath: getTemplatePath(validatedConfig.moduleType),
    outputPath: localPath,
    githubToken: options.githubToken || process.env.GITHUB_TOKEN,
    repository
  });
  
  // Step 7: Initialize git and push (unless skipped)
  if (!options.skipGitInit && !options.dryRun) {
    await initializeGitRepository(localPath, validatedConfig, repository!);
  }
  
  // Step 8: Install dependencies (unless skipped)
  if (!options.skipInstall && !options.dryRun) {
    await installDependencies(localPath);
  }
  
  // Step 9: Setup GitHub features
  if (!options.dryRun && repository) {
    await setupGitHubFeatures(validatedConfig, repository);
  }
  
  return {
    repositoryUrl: repository?.html_url || `https://github.com/${validatedConfig.owner}/${validatedConfig.name}`,
    localPath,
    config: validatedConfig
  };
}

/**
 * Gather configuration from options and prompts
 */
async function gatherConfiguration(
  name: string, 
  options: any
): Promise<RepositoryConfig> {
  
  if (options.interactive) {
    return await interactiveConfiguration(name, options);
  }
  
  // Non-interactive configuration
  const config: RepositoryConfig = {
    name,
    description: options.description || `${name} module for Plataforma.app`,
    displayName: options.displayName || name.split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    moduleType: options.template as ModuleType || 'business',
    category: options.category,
    private: options.private || false,
    license: options.license as LicenseType || 'MIT',
    owner: options.owner || await getDefaultOwner(options.githubToken),
    homepageUrl: options.homepage,
    topics: options.topics || [],
    version: '1.0.0',
    author: options.author || await getDefaultAuthor(),
    
    features: {
      typescript: options.typescript !== false,
      react: options.react !== false,
      tailwind: options.tailwind !== false,
      docker: options.docker !== false,
      cicd: options.cicd !== false,
      testing: options.testing !== false,
      linting: options.linting !== false,
      moduleFederation: options.moduleFederation !== false,
      storybook: options.withStorybook || false
    },
    
    cicd: {
      enableAutoRelease: true,
      nodeVersion: options.nodeVersion || '18',
      testCommand: options.testCommand || 'npm test',
      buildCommand: options.buildCommand || 'npm run build',
      publishRegistry: 'npm',
      deploymentTargets: []
    }
  };
  
  return config;
}

/**
 * Interactive configuration with prompts
 */
async function interactiveConfiguration(name: string, options: any): Promise<RepositoryConfig> {
  const enquirer = new Enquirer();
  
  console.log(chalk.blue('🔧 Interactive Repository Setup'));
  console.log(chalk.gray(`Creating module: ${name}`));
  console.log('');
  
  const answers = await enquirer.prompt([
    {
      type: 'input',
      name: 'description',
      message: 'Module description:',
      initial: options.description || `${name} module for Plataforma.app`
    },
    {
      type: 'input',
      name: 'displayName',
      message: 'Display name:',
      initial: options.displayName || name.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    },
    {
      type: 'select',
      name: 'moduleType',
      message: 'Module type:',
      choices: [
        { name: 'business', message: 'Business - Business logic modules' },
        { name: 'system', message: 'System - Core system modules' },
        { name: 'plugin', message: 'Plugin - Extension modules' },
        { name: 'ui', message: 'UI - User interface components' }
      ],
      initial: options.template || 'business'
    },
    {
      type: 'input',
      name: 'category',
      message: 'Category (optional):',
      initial: options.category || ''
    },
    {
      type: 'input',
      name: 'owner',
      message: 'GitHub owner/organization:',
      initial: options.owner || await getDefaultOwner(options.githubToken),
      validate: (value: string) => value.length > 0 || 'Owner is required'
    },
    {
      type: 'input',
      name: 'author',
      message: 'Author:',
      initial: options.author || await getDefaultAuthor(),
      validate: (value: string) => value.length > 0 || 'Author is required'
    },
    {
      type: 'select',
      name: 'license',
      message: 'License:',
      choices: ['MIT', 'Apache-2.0', 'GPL-3.0', 'proprietary'],
      initial: options.license || 'MIT'
    },
    {
      type: 'confirm',
      name: 'private',
      message: 'Create private repository?',
      initial: options.private || false
    },
    {
      type: 'input',
      name: 'homepageUrl',
      message: 'Homepage URL (optional):',
      initial: options.homepage || ''
    },
    {
      type: 'list',
      name: 'topics',
      message: 'Topics (comma-separated):',
      initial: options.topics?.join(', ') || ''
    }
  ]) as any;
  
  // Features configuration
  console.log('');
  console.log(chalk.blue('🔧 Features Configuration'));
  
  const features = await enquirer.prompt([
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Enable TypeScript?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'react',
      message: 'Enable React?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'tailwind',
      message: 'Enable TailwindCSS?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'docker',
      message: 'Enable Docker?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'cicd',
      message: 'Enable CI/CD?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'testing',
      message: 'Enable testing setup?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'linting',
      message: 'Enable linting/formatting?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'moduleFederation',
      message: 'Enable module federation?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'storybook',
      message: 'Enable Storybook?',
      initial: false
    }
  ]) as any;
  
  return {
    name,
    description: answers.description,
    displayName: answers.displayName,
    moduleType: answers.moduleType,
    category: answers.category || undefined,
    private: answers.private,
    license: answers.license,
    owner: answers.owner,
    homepageUrl: answers.homepageUrl || undefined,
    topics: typeof answers.topics === 'string' 
      ? answers.topics.split(',').map((t: string) => t.trim()).filter(Boolean)
      : answers.topics || [],
    version: '1.0.0',
    author: answers.author,
    features,
    cicd: {
      enableAutoRelease: true,
      nodeVersion: '18',
      testCommand: 'npm test',
      buildCommand: 'npm run build',
      publishRegistry: 'npm',
      deploymentTargets: []
    }
  };
}

/**
 * Check if repository already exists
 */
async function checkRepositoryExists(config: RepositoryConfig): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn(chalk.yellow('⚠️  No GitHub token provided, skipping repository existence check'));
    return;
  }
  
  try {
    const github = createGitHubService(githubToken);
    const exists = await github.repositoryExists(config.owner, config.name);
    
    if (exists) {
      throw new Error(`Repository ${config.owner}/${config.name} already exists. Use --force to override.`);
    }
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      throw error;
    }
    // Other errors (like auth issues) are warnings, not failures
    console.warn(chalk.yellow(`⚠️  Could not check repository existence: ${error.message}`));
  }
}

/**
 * Create GitHub repository
 */
async function createGitHubRepository(config: RepositoryConfig) {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('GitHub token is required. Set GITHUB_TOKEN environment variable.');
  }
  
  const github = createGitHubService(githubToken);
  
  // Check if owner is an organization
  try {
    const orgs = await github.getUserOrganizations();
    const isOrg = orgs.some(org => org.login === config.owner);
    
    const repository = isOrg 
      ? await github.createRepositoryInOrg(config.owner, config)
      : await github.createRepository(config);
    
    // Add topics
    if (config.topics.length > 0) {
      await github.addTopics(config.owner, config.name, config.topics);
    }
    
    return repository;
    
  } catch (error: any) {
    throw new Error(`Failed to create GitHub repository: ${error.message}`);
  }
}

/**
 * Setup local repository directory
 */
async function setupLocalRepository(
  config: RepositoryConfig, 
  options: CreateRepoOptions
): Promise<string> {
  const localPath = path.resolve(process.cwd(), config.name);
  
  // Check if directory already exists
  if (await fs.pathExists(localPath)) {
    if (!options.force) {
      throw new Error(`Directory ${config.name} already exists. Use --force to override.`);
    }
    await fs.remove(localPath);
  }
  
  // Create directory
  await fs.ensureDir(localPath);
  
  return localPath;
}

/**
 * Generate module files from templates
 */
async function generateModuleFiles(context: GenerationContext): Promise<void> {
  const templateEngine = new TemplateEngine(context);
  await templateEngine.generateFromTemplate();
}

/**
 * Initialize git repository and push
 */
async function initializeGitRepository(
  localPath: string, 
  config: RepositoryConfig,
  repository: any
): Promise<void> {
  const spinner = ora('🔄 Initializing git repository...').start();
  
  try {
    // Initialize git
    execSync('git init', { cwd: localPath, stdio: 'pipe' });
    execSync('git add .', { cwd: localPath, stdio: 'pipe' });
    execSync('git commit -m "feat: initial commit - module boilerplate\\n\\n🤖 Generated with @plataforma/repo-generator"', { 
      cwd: localPath, stdio: 'pipe' 
    });
    
    // Add remote and push
    execSync(`git remote add origin ${repository.clone_url}`, { cwd: localPath, stdio: 'pipe' });
    execSync('git branch -M main', { cwd: localPath, stdio: 'pipe' });
    execSync('git push -u origin main', { cwd: localPath, stdio: 'pipe' });
    
    spinner.succeed(chalk.green('✅ Git repository initialized and pushed'));
    
  } catch (error: any) {
    spinner.fail(chalk.red('❌ Failed to initialize git repository'));
    throw new Error(`Git initialization failed: ${error.message}`);
  }
}

/**
 * Install dependencies
 */
async function installDependencies(localPath: string): Promise<void> {
  const spinner = ora('📦 Installing dependencies...').start();
  
  try {
    execSync('npm install', { cwd: localPath, stdio: 'pipe' });
    spinner.succeed(chalk.green('✅ Dependencies installed'));
  } catch (error: any) {
    spinner.fail(chalk.red('❌ Failed to install dependencies'));
    console.warn(chalk.yellow('⚠️  You may need to run npm install manually'));
  }
}

/**
 * Setup additional GitHub features
 */
async function setupGitHubFeatures(
  config: RepositoryConfig, 
  repository: any
): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) return;
  
  const github = createGitHubService(githubToken);
  
  try {
    // Setup branch protection (if enabled)
    if (config.cicd.enableAutoRelease) {
      await github.setupBranchProtection(config.owner, config.name);
    }
    
    // Setup CI/CD secrets (basic ones)
    await github.addSecret(config.owner, config.name, 'NPM_TOKEN', 'placeholder');
    
    console.log(chalk.green('✅ GitHub features configured'));
    
  } catch (error: any) {
    console.warn(chalk.yellow(`⚠️  Could not setup all GitHub features: ${error.message}`));
  }
}

/**
 * Get template path based on module type
 */
function getTemplatePath(moduleType: ModuleType): string {
  return path.join(__dirname, '../../templates', moduleType);
}

/**
 * Get default GitHub owner
 */
async function getDefaultOwner(githubToken?: string): Promise<string> {
  if (!githubToken && !process.env.GITHUB_TOKEN) {
    return '';
  }
  
  try {
    const github = createGitHubService(githubToken || process.env.GITHUB_TOKEN!);
    const user = await github.getAuthenticatedUser();
    return user.login;
  } catch {
    return '';
  }
}

/**
 * Get default author from git config or GitHub
 */
async function getDefaultAuthor(): Promise<string> {
  try {
    const name = execSync('git config --global user.name', { stdio: 'pipe' })
      .toString().trim();
    return name;
  } catch {
    return '';
  }
}