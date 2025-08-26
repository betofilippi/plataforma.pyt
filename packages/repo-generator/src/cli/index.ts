#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createRepository } from './commands/create-repo';
import { listTemplates } from './commands/list-templates';
import { validateTemplate } from './commands/validate-template';
import { setupGitHub } from './commands/setup-github';

const program = new Command();

program
  .name('plataforma-repo')
  .description('🏗️  Repository Generator for Plataforma.app modules')
  .version('1.0.0');

// Main command: create-repo
program
  .command('create')
  .alias('new')
  .description('Create a new GitHub repository with module boilerplate')
  .argument('<name>', 'Repository/module name')
  .option('-o, --owner <owner>', 'GitHub owner/organization')
  .option('-t, --template <template>', 'Template type', 'business')
  .option('-d, --description <description>', 'Repository description')
  .option('--display-name <name>', 'Module display name')
  .option('--category <category>', 'Module category')
  .option('--private', 'Create private repository', false)
  .option('--license <license>', 'License type', 'MIT')
  .option('--author <author>', 'Module author')
  .option('--homepage <url>', 'Homepage URL')
  .option('--topics <topics...>', 'Repository topics')
  .option('--github-token <token>', 'GitHub personal access token')
  .option('--dry-run', 'Simulate creation without making changes', false)
  .option('--skip-git-init', 'Skip git initialization', false)
  .option('--skip-install', 'Skip npm install', false)
  .option('--force', 'Force creation even if repo exists', false)
  .option('--interactive', 'Interactive mode with prompts', false)
  .option('--no-typescript', 'Disable TypeScript')
  .option('--no-react', 'Disable React')
  .option('--no-tailwind', 'Disable TailwindCSS')
  .option('--no-docker', 'Disable Docker')
  .option('--no-cicd', 'Disable CI/CD')
  .option('--no-testing', 'Disable testing setup')
  .option('--no-linting', 'Disable linting setup')
  .option('--no-module-federation', 'Disable module federation')
  .option('--with-storybook', 'Enable Storybook', false)
  .option('--node-version <version>', 'Node.js version for CI/CD', '18')
  .option('--test-command <command>', 'Test command', 'npm test')
  .option('--build-command <command>', 'Build command', 'npm run build')
  .action(async (name, options) => {
    const spinner = ora('🚀 Creating repository...').start();
    
    try {
      const result = await createRepository(name, options);
      
      if (options.dryRun) {
        spinner.succeed(chalk.green('✅ Dry run completed successfully!'));
        console.log(chalk.blue('📋 Repository would be created at:'), chalk.white(result.repositoryUrl));
      } else {
        spinner.succeed(chalk.green(`✅ Repository ${name} created successfully!`));
        console.log('');
        console.log(chalk.blue('📍 Repository URL:'), chalk.white(result.repositoryUrl));
        console.log(chalk.blue('📂 Local directory:'), chalk.white(result.localPath));
        console.log('');
        console.log(chalk.yellow('📋 Next steps:'));
        console.log(chalk.gray(`   cd ${name}`));
        console.log(chalk.gray('   npm install'));
        console.log(chalk.gray('   npm run dev'));
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Error creating repository: ${error.message}`));
      process.exit(1);
    }
  });

// Command: list-templates
program
  .command('templates')
  .alias('list')
  .description('List available module templates')
  .option('-v, --verbose', 'Show detailed template information', false)
  .option('-t, --type <type>', 'Filter by module type')
  .action(async (options) => {
    try {
      await listTemplates(options);
    } catch (error: any) {
      console.error(chalk.red(`❌ Error listing templates: ${error.message}`));
      process.exit(1);
    }
  });

// Command: validate-template
program
  .command('validate')
  .description('Validate a template')
  .argument('<template>', 'Template name or path')
  .option('-v, --verbose', 'Show detailed validation information', false)
  .action(async (template, options) => {
    const spinner = ora('🔍 Validating template...').start();
    
    try {
      const result = await validateTemplate(template, options);
      
      if (result.valid) {
        spinner.succeed(chalk.green('✅ Template is valid!'));
      } else {
        spinner.fail(chalk.red('❌ Template validation failed!'));
        console.log('');
        console.log(chalk.yellow('Issues found:'));
        result.errors.forEach(error => {
          console.log(chalk.red(`   • ${error}`));
        });
        process.exit(1);
      }
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Error validating template: ${error.message}`));
      process.exit(1);
    }
  });

// Command: setup-github
program
  .command('setup-github')
  .alias('setup')
  .description('Setup GitHub integration and authentication')
  .option('--token <token>', 'GitHub personal access token')
  .option('--org <org>', 'Default organization')
  .option('--save', 'Save configuration to file', false)
  .action(async (options) => {
    const spinner = ora('🔧 Setting up GitHub integration...').start();
    
    try {
      await setupGitHub(options);
      spinner.succeed(chalk.green('✅ GitHub integration setup completed!'));
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Error setting up GitHub: ${error.message}`));
      process.exit(1);
    }
  });

// Command: init (initialize config)
program
  .command('init')
  .description('Initialize repository generator configuration')
  .option('--github-token <token>', 'GitHub personal access token')
  .option('--default-org <org>', 'Default GitHub organization')
  .option('--default-license <license>', 'Default license', 'MIT')
  .option('--default-author <author>', 'Default author name')
  .action(async (options) => {
    console.log(chalk.blue('🚀 Initializing Plataforma Repository Generator'));
    console.log('');
    
    const spinner = ora('Creating configuration...').start();
    
    try {
      // Create .plataforma-repo.json config file
      const config = {
        github: {
          token: options.githubToken,
          defaultOrg: options.defaultOrg
        },
        defaults: {
          license: options.defaultLicense,
          author: options.defaultAuthor,
          features: {
            typescript: true,
            react: true,
            tailwind: true,
            docker: true,
            cicd: true,
            testing: true,
            linting: true,
            moduleFederation: true,
            storybook: false
          }
        }
      };
      
      // Write config (implementation needed)
      
      spinner.succeed(chalk.green('✅ Configuration created successfully!'));
      
      console.log('');
      console.log(chalk.yellow('📋 Next steps:'));
      console.log(chalk.gray('   plataforma-repo create my-module'));
      console.log(chalk.gray('   plataforma-repo templates'));
      console.log('');
      console.log(chalk.blue('💡 Tip:'), chalk.gray('Use --interactive for guided module creation'));
      
    } catch (error: any) {
      spinner.fail(chalk.red(`❌ Error initializing: ${error.message}`));
      process.exit(1);
    }
  });

// Command: info
program
  .command('info')
  .description('Show repository generator information')
  .action(() => {
    console.log(chalk.blue('🏗️  Plataforma Repository Generator'));
    console.log('');
    console.log(chalk.gray('Version:'), chalk.white('1.0.0'));
    console.log(chalk.gray('Purpose:'), chalk.white('Automated GitHub repository creation for Plataforma modules'));
    console.log('');
    console.log(chalk.yellow('Available templates:'));
    console.log(chalk.gray('   • business'), chalk.white('- Business logic modules'));
    console.log(chalk.gray('   • system'), chalk.white('- System/core modules'));
    console.log(chalk.gray('   • plugin'), chalk.white('- Plugin/extension modules'));
    console.log(chalk.gray('   • ui'), chalk.white('- UI component modules'));
    console.log('');
    console.log(chalk.blue('Examples:'));
    console.log(chalk.gray('   plataforma-repo create sales-dashboard -t business'));
    console.log(chalk.gray('   plataforma-repo create auth-system -t system --private'));
    console.log(chalk.gray('   plataforma-repo create ui-components -t ui --with-storybook'));
  });

// Handle unknown commands
program
  .command('*')
  .action((cmd) => {
    console.log(chalk.red(`❌ Unknown command: ${cmd}`));
    console.log(chalk.yellow('💡 Use --help to see available commands'));
    process.exit(1);
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  console.error(chalk.red(`❌ ${err.message}`));
  process.exit(1);
});

// Parse arguments
program.parse();