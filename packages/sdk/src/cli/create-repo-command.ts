import chalk from 'chalk';
import ora from 'ora';

/**
 * Create repository command for the main SDK CLI
 * This delegates to the @plataforma/repo-generator package
 */
export async function createRepoCommand(name: string, options: any) {
  const spinner = ora('🔄 Loading repository generator...').start();
  
  try {
    // Dynamic import to avoid bundling the entire repo-generator
    const { createRepository } = await import('@plataforma/repo-generator');
    
    spinner.stop();
    console.log(chalk.blue('🏗️  Creating GitHub repository with module boilerplate'));
    console.log('');
    
    // Map CLI options to repo-generator format
    const repoOptions = {
      owner: options.owner,
      template: options.template || 'business',
      description: options.description,
      displayName: options.displayName,
      private: options.private || false,
      interactive: options.interactive || false,
      dryRun: options.dryRun || false,
      githubToken: options.githubToken,
      // Default feature flags
      typescript: true,
      react: true,
      tailwind: true,
      docker: true,
      cicd: true,
      testing: true,
      linting: true,
      moduleFederation: true,
    };
    
    const result = await createRepository(name, repoOptions);
    
    console.log('');
    console.log(chalk.green('✅ Repository created successfully!'));
    console.log('');
    console.log(chalk.blue('📍 Repository URL:'), chalk.white(result.repositoryUrl));
    console.log(chalk.blue('📂 Local directory:'), chalk.white(result.localPath));
    console.log('');
    console.log(chalk.yellow('📋 Next steps:'));
    console.log(chalk.gray(`   cd ${name}`));
    console.log(chalk.gray('   npm install'));
    console.log(chalk.gray('   npm run dev'));
    console.log('');
    console.log(chalk.blue('💡 Tip:'), chalk.gray('Use "plataforma validate" to check module compliance'));
    
  } catch (error: any) {
    spinner.fail(chalk.red(`❌ Error creating repository: ${error.message}`));
    
    // Provide helpful error messages
    if (error.message.includes('GitHub token')) {
      console.log('');
      console.log(chalk.yellow('💡 GitHub Setup:'));
      console.log(chalk.gray('   1. Create a token at: https://github.com/settings/tokens/new'));
      console.log(chalk.gray('   2. Set GITHUB_TOKEN environment variable'));
      console.log(chalk.gray('   3. Or use --github-token option'));
    }
    
    if (error.message.includes('already exists')) {
      console.log('');
      console.log(chalk.yellow('💡 Repository exists:'));
      console.log(chalk.gray('   • Use --force to override'));
      console.log(chalk.gray('   • Choose a different name'));
      console.log(chalk.gray('   • Use --dry-run to test first'));
    }
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('');
      console.log(chalk.yellow('💡 Missing dependency:'));
      console.log(chalk.gray('   npm install @plataforma/repo-generator'));
    }
    
    process.exit(1);
  }
}