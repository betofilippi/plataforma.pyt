import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadModuleConfig } from '../utils/config-loader';
import { validateModuleStructure, validateModuleName } from '../utils/validator';

export interface ValidateModuleOptions {
  fix?: boolean;
  verbose?: boolean;
  checkDependencies?: boolean;
  checkSecurity?: boolean;
}

export async function validateModule(options: ValidateModuleOptions = {}) {
  const cwd = process.cwd();
  
  console.log(chalk.blue('🔍 Validating module structure and configuration...'));
  
  let totalIssues = 0;
  let fixedIssues = 0;
  const results = {
    structure: { valid: false, issues: [] as string[] },
    config: { valid: false, issues: [] as string[] },
    dependencies: { valid: false, issues: [] as string[] },
    security: { valid: false, issues: [] as string[] },
    naming: { valid: false, issues: [] as string[] }
  };

  // 1. Validate module configuration
  console.log(chalk.gray('   Checking module configuration...'));
  try {
    const config = await loadModuleConfig(cwd);
    if (!config) {
      results.config.issues.push('module.json not found');
      totalIssues++;
    } else {
      const configValidation = validateModuleConfig(config);
      results.config.valid = configValidation.isValid;
      results.config.issues = configValidation.errors;
      totalIssues += configValidation.errors.length;

      if (options.fix && !configValidation.isValid) {
        const fixed = await fixConfigurationIssues(cwd, config, configValidation.errors);
        fixedIssues += fixed;
      }
    }
  } catch (error) {
    results.config.issues.push(`Configuration error: ${error.message}`);
    totalIssues++;
  }

  // 2. Validate module structure
  console.log(chalk.gray('   Checking file structure...'));
  try {
    const structureValidation = await validateModuleStructure(cwd);
    results.structure.valid = structureValidation.isValid;
    results.structure.issues = structureValidation.errors;
    totalIssues += structureValidation.errors.length;

    if (options.fix && !structureValidation.isValid) {
      const fixed = await fixStructureIssues(cwd, structureValidation.errors);
      fixedIssues += fixed;
    }
  } catch (error) {
    results.structure.issues.push(`Structure validation error: ${error.message}`);
    totalIssues++;
  }

  // 3. Validate naming conventions
  console.log(chalk.gray('   Checking naming conventions...'));
  try {
    const config = await loadModuleConfig(cwd);
    if (config) {
      const nameValidation = validateModuleName(config.name);
      results.naming.valid = nameValidation.isValid;
      results.naming.issues = nameValidation.errors;
      totalIssues += nameValidation.errors.length;
    }
  } catch (error) {
    results.naming.issues.push(`Naming validation error: ${error.message}`);
    totalIssues++;
  }

  // 4. Validate dependencies
  if (options.checkDependencies) {
    console.log(chalk.gray('   Checking dependencies...'));
    try {
      const depValidation = await validateDependencies(cwd);
      results.dependencies.valid = depValidation.isValid;
      results.dependencies.issues = depValidation.errors;
      totalIssues += depValidation.errors.length;
    } catch (error) {
      results.dependencies.issues.push(`Dependency validation error: ${error.message}`);
      totalIssues++;
    }
  }

  // 5. Security checks
  if (options.checkSecurity) {
    console.log(chalk.gray('   Running security checks...'));
    try {
      const secValidation = await validateSecurity(cwd);
      results.security.valid = secValidation.isValid;
      results.security.issues = secValidation.errors;
      totalIssues += secValidation.errors.length;
    } catch (error) {
      results.security.issues.push(`Security validation error: ${error.message}`);
      totalIssues++;
    }
  }

  // Display results
  displayValidationResults(results, options, totalIssues, fixedIssues);

  if (totalIssues === 0) {
    console.log(chalk.green('\n✅ Module validation passed! No issues found.'));
    return { valid: true, results };
  } else {
    const remainingIssues = totalIssues - fixedIssues;
    if (remainingIssues === 0) {
      console.log(chalk.green(`\n✅ All issues fixed! (${fixedIssues} issues resolved)`));
      return { valid: true, results, fixed: fixedIssues };
    } else {
      console.log(chalk.red(`\n❌ Validation failed: ${remainingIssues} issues found`));
      if (fixedIssues > 0) {
        console.log(chalk.yellow(`   ${fixedIssues} issues were automatically fixed`));
      }
      if (!options.fix) {
        console.log(chalk.gray('   Run with --fix to automatically fix some issues'));
      }
      return { valid: false, results, issues: remainingIssues, fixed: fixedIssues };
    }
  }
}

function validateModuleConfig(config: any) {
  const errors: string[] = [];

  // Required fields
  if (!config.name) errors.push('Missing required field: name');
  if (!config.version) errors.push('Missing required field: version');
  if (!config.displayName) errors.push('Missing required field: displayName');
  if (!config.description) errors.push('Missing required field: description');

  // Version format
  if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
    errors.push('Invalid version format (expected semver: x.y.z)');
  }

  // Category validation
  const validCategories = [
    'administrativo', 'financeiro', 'vendas', 'estoque', 'rh',
    'inteligencia-artificial', 'sistema', 'custom'
  ];
  if (config.category && !validCategories.includes(config.category)) {
    errors.push(`Invalid category. Valid options: ${validCategories.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function validateDependencies(cwd: string) {
  const errors: string[] = [];
  
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    errors.push('package.json not found');
    return { isValid: false, errors };
  }

  const packageJson = await fs.readJson(packageJsonPath);
  
  // Check for required Plataforma dependencies
  const requiredDeps = [
    '@plataforma/design-system',
    '@plataforma/core-window-system'
  ];

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  };

  for (const dep of requiredDeps) {
    if (!allDeps[dep]) {
      errors.push(`Missing required dependency: ${dep}`);
    }
  }

  // Check for conflicting versions
  if (allDeps.react && !allDeps.react.includes('^18')) {
    errors.push('React version should be ^18.x for compatibility');
  }

  // Check for outdated Plataforma packages
  for (const [name, version] of Object.entries(allDeps)) {
    if (name.startsWith('@plataforma/') && version === '^1.0.0') {
      // This would need to check against actual registry for latest versions
      // For now, just warn about using exact 1.0.0
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function validateSecurity(cwd: string) {
  const errors: string[] = [];
  
  // Check for common security issues
  const sensitiveFiles = ['.env', '.env.local', '.env.production'];
  
  for (const file of sensitiveFiles) {
    if (await fs.pathExists(path.join(cwd, file))) {
      const content = await fs.readFile(path.join(cwd, file), 'utf8');
      
      // Check for exposed secrets
      if (content.includes('password') || content.includes('secret') || content.includes('key')) {
        const gitignorePath = path.join(cwd, '.gitignore');
        if (!await fs.pathExists(gitignorePath)) {
          errors.push(`${file} exists but .gitignore not found - sensitive data may be exposed`);
        } else {
          const gitignore = await fs.readFile(gitignorePath, 'utf8');
          if (!gitignore.includes(file)) {
            errors.push(`${file} not in .gitignore - sensitive data may be exposed`);
          }
        }
      }
    }
  }

  // Check package.json for security issues
  const packageJsonPath = path.join(cwd, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Warn about overly permissive scripts
    if (packageJson.scripts) {
      for (const [scriptName, script] of Object.entries(packageJson.scripts)) {
        if (typeof script === 'string' && script.includes('rm -rf /')) {
          errors.push(`Dangerous script "${scriptName}" found - contains rm -rf /`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function fixConfigurationIssues(cwd: string, config: any, issues: string[]): Promise<number> {
  let fixed = 0;
  
  // Auto-fix missing fields with defaults
  let needsUpdate = false;
  
  if (issues.includes('Missing required field: displayName') && config.name) {
    config.displayName = config.name.split('-').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    needsUpdate = true;
    fixed++;
  }

  if (issues.includes('Missing required field: description') && config.name) {
    config.description = `Módulo ${config.name} para plataforma.app`;
    needsUpdate = true;
    fixed++;
  }

  if (needsUpdate) {
    await fs.writeJson(path.join(cwd, 'module.json'), config, { spaces: 2 });
  }

  return fixed;
}

async function fixStructureIssues(cwd: string, issues: string[]): Promise<number> {
  let fixed = 0;
  
  // Create missing directories
  const requiredDirs = ['src', 'src/components', 'src/types', 'src/utils'];
  
  for (const dir of requiredDirs) {
    if (issues.some(issue => issue.includes(dir))) {
      await fs.ensureDir(path.join(cwd, dir));
      fixed++;
    }
  }

  // Create missing files
  if (issues.includes('src/index.ts not found')) {
    const indexContent = `// Main module entry point
export { default } from './components/MainComponent';
export * from './types';
`;
    await fs.writeFile(path.join(cwd, 'src/index.ts'), indexContent);
    fixed++;
  }

  return fixed;
}

function displayValidationResults(results: any, options: ValidateModuleOptions, totalIssues: number, fixedIssues: number) {
  console.log(chalk.blue('\n📋 Validation Results:'));

  const sections = [
    { name: 'Configuration', key: 'config', icon: '⚙️' },
    { name: 'File Structure', key: 'structure', icon: '📁' },
    { name: 'Naming Conventions', key: 'naming', icon: '🏷️' }
  ];

  if (options.checkDependencies) {
    sections.push({ name: 'Dependencies', key: 'dependencies', icon: '📦' });
  }

  if (options.checkSecurity) {
    sections.push({ name: 'Security', key: 'security', icon: '🔒' });
  }

  for (const section of sections) {
    const result = results[section.key];
    const status = result.valid ? chalk.green('✅') : chalk.red('❌');
    console.log(`${status} ${section.icon} ${section.name}`);
    
    if (result.issues.length > 0 && options.verbose) {
      result.issues.forEach((issue: string) => {
        console.log(chalk.gray(`      ${issue}`));
      });
    }
  }

  if (totalIssues > 0) {
    console.log(chalk.yellow(`\n⚠️  Total issues found: ${totalIssues}`));
    if (fixedIssues > 0) {
      console.log(chalk.green(`✅ Issues auto-fixed: ${fixedIssues}`));
    }
  }
}