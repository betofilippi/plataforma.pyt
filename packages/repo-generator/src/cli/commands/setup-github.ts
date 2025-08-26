import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { Enquirer } from 'enquirer';
import { createGitHubService } from '../../github';

interface SetupGitHubOptions {
  token?: string;
  org?: string;
  save?: boolean;
}

interface GitHubConfig {
  token?: string;
  defaultOrg?: string;
  user?: {
    login: string;
    name: string;
    email: string;
  };
  organizations?: Array<{
    login: string;
    name: string;
  }>;
}

/**
 * Setup GitHub integration and authentication
 */
export async function setupGitHub(options: SetupGitHubOptions = {}): Promise<void> {
  console.log(chalk.blue('🔧 GitHub Integration Setup'));
  console.log('');
  
  const config: GitHubConfig = {};
  
  // Step 1: Get GitHub token
  const token = await getGitHubToken(options.token);
  config.token = token;
  
  // Step 2: Test authentication and get user info
  console.log(chalk.gray('Testing GitHub authentication...'));
  const github = createGitHubService(token);
  
  try {
    const user = await github.getAuthenticatedUser();
    config.user = {
      login: user.login,
      name: user.name || user.login,
      email: user.email || ''
    };
    
    console.log(chalk.green(`✅ Authenticated as: ${user.name || user.login} (@${user.login})`));
    
  } catch (error: any) {
    throw new Error(`GitHub authentication failed: ${error.message}`);
  }
  
  // Step 3: Get organizations
  try {
    const orgs = await github.getUserOrganizations();
    config.organizations = orgs.map(org => ({
      login: org.login,
      name: org.name || org.login
    }));
    
    if (orgs.length > 0) {
      console.log(chalk.blue(`Found ${orgs.length} organizations:`));
      orgs.forEach(org => {
        console.log(chalk.gray(`   • ${org.name || org.login} (@${org.login})`));
      });
    }
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not fetch organizations'));
  }
  
  // Step 4: Set default organization
  const defaultOrg = await getDefaultOrganization(options.org, config);
  if (defaultOrg) {
    config.defaultOrg = defaultOrg;
    console.log(chalk.green(`✅ Default organization set to: @${defaultOrg}`));
  }
  
  // Step 5: Save configuration if requested
  if (options.save) {
    await saveConfiguration(config);
    console.log(chalk.green('✅ Configuration saved'));
  }
  
  // Step 6: Show setup summary
  displaySetupSummary(config);
}

/**
 * Get GitHub token from options, environment, or prompt
 */
async function getGitHubToken(providedToken?: string): Promise<string> {
  // Use provided token
  if (providedToken) {
    return providedToken;
  }
  
  // Check environment variable
  if (process.env.GITHUB_TOKEN) {
    console.log(chalk.gray('Using GitHub token from environment variable'));
    return process.env.GITHUB_TOKEN;
  }
  
  // Check existing config
  const existingConfig = await loadExistingConfiguration();
  if (existingConfig?.token) {
    const enquirer = new Enquirer();
    const { useExisting } = await enquirer.prompt({
      type: 'confirm',
      name: 'useExisting',
      message: 'Use existing GitHub token from configuration?',
      initial: true
    }) as any;
    
    if (useExisting) {
      return existingConfig.token;
    }
  }
  
  // Prompt for token
  console.log(chalk.yellow('GitHub Personal Access Token required'));
  console.log(chalk.gray('Create one at: https://github.com/settings/tokens/new'));
  console.log(chalk.gray('Required permissions: repo, read:org, admin:repo_hook'));
  console.log('');
  
  const enquirer = new Enquirer();
  const { token } = await enquirer.prompt({
    type: 'password',
    name: 'token',
    message: 'GitHub token:',
    validate: (value: string) => value.length > 0 || 'Token is required'
  }) as any;
  
  return token;
}

/**
 * Get default organization
 */
async function getDefaultOrganization(
  providedOrg?: string, 
  config?: GitHubConfig
): Promise<string | undefined> {
  
  if (providedOrg) {
    return providedOrg;
  }
  
  if (!config?.organizations || config.organizations.length === 0) {
    return undefined;
  }
  
  if (config.organizations.length === 1) {
    return config.organizations[0].login;
  }
  
  // Multiple organizations - let user choose
  const enquirer = new Enquirer();
  const choices = [
    { name: '', message: `Personal (${config.user?.login})` },
    ...config.organizations.map(org => ({
      name: org.login,
      message: `${org.name} (@${org.login})`
    }))
  ];
  
  const { org } = await enquirer.prompt({
    type: 'select',
    name: 'org',
    message: 'Default repository owner:',
    choices
  }) as any;
  
  return org || undefined;
}

/**
 * Load existing configuration
 */
async function loadExistingConfiguration(): Promise<GitHubConfig | null> {
  const configPath = getConfigPath();
  
  try {
    if (await fs.pathExists(configPath)) {
      return await fs.readJson(configPath);
    }
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not load existing configuration'));
  }
  
  return null;
}

/**
 * Save configuration to file
 */
async function saveConfiguration(config: GitHubConfig): Promise<void> {
  const configPath = getConfigPath();
  
  // Ensure directory exists
  await fs.ensureDir(path.dirname(configPath));
  
  // Save config (without sensitive data in plain text)
  const saveConfig = {
    defaultOrg: config.defaultOrg,
    user: config.user,
    organizations: config.organizations,
    // Note: Don't save token in plain text
    // In a real implementation, you'd use keychain/credential manager
    tokenConfigured: !!config.token
  };
  
  await fs.writeJson(configPath, saveConfig, { spaces: 2 });
  
  // Set environment variable for current session
  if (config.token) {
    process.env.GITHUB_TOKEN = config.token;
  }
}

/**
 * Get configuration file path
 */
function getConfigPath(): string {
  return path.join(os.homedir(), '.plataforma', 'repo-generator.json');
}

/**
 * Display setup summary
 */
function displaySetupSummary(config: GitHubConfig): void {
  console.log('');
  console.log(chalk.blue('📋 Setup Summary'));
  console.log(chalk.gray('─'.repeat(40)));
  
  if (config.user) {
    console.log(chalk.gray('User:'), chalk.white(`${config.user.name} (@${config.user.login})`));
  }
  
  if (config.defaultOrg) {
    console.log(chalk.gray('Default Org:'), chalk.white(`@${config.defaultOrg}`));
  }
  
  if (config.organizations && config.organizations.length > 0) {
    console.log(chalk.gray('Organizations:'), chalk.white(`${config.organizations.length} available`));
  }
  
  console.log(chalk.gray('Token:'), chalk.green('✅ Configured'));
  
  console.log('');
  console.log(chalk.yellow('📋 Next Steps:'));
  console.log(chalk.gray('   plataforma-repo create my-module'));
  console.log(chalk.gray('   plataforma-repo templates'));
  
  console.log('');
  console.log(chalk.blue('💡 Tips:'));
  console.log(chalk.gray('   • Use --interactive for guided module creation'));
  console.log(chalk.gray('   • Set GITHUB_TOKEN environment variable'));
  console.log(chalk.gray('   • Repository permissions: repo, read:org, admin:repo_hook'));
}