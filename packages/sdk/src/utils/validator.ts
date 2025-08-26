import fs from 'fs-extra';
import path from 'path';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate module name according to npm and plataforma.app standards
 */
export function validateModuleName(name: string): ValidationResult {
  const errors: string[] = [];

  // Basic checks
  if (!name) {
    errors.push('Module name is required');
    return { isValid: false, errors };
  }

  // Length checks
  if (name.length < 3) {
    errors.push('Module name must be at least 3 characters long');
  }

  if (name.length > 50) {
    errors.push('Module name must be less than 50 characters long');
  }

  // Character checks
  if (!/^[a-z0-9-_]+$/.test(name)) {
    errors.push('Module name can only contain lowercase letters, numbers, hyphens, and underscores');
  }

  // Cannot start with number, hyphen, or underscore
  if (/^[0-9-_]/.test(name)) {
    errors.push('Module name cannot start with a number, hyphen, or underscore');
  }

  // Cannot end with hyphen or underscore
  if (/[-_]$/.test(name)) {
    errors.push('Module name cannot end with a hyphen or underscore');
  }

  // Cannot contain consecutive hyphens or underscores
  if (/[-_]{2,}/.test(name)) {
    errors.push('Module name cannot contain consecutive hyphens or underscores');
  }

  // Reserved names
  const reservedNames = [
    'plataforma', 'sdk', 'core', 'system', 'admin', 'api', 'auth', 
    'database', 'config', 'test', 'dev', 'prod', 'staging',
    'node_modules', 'package', 'npm', 'yarn'
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    errors.push(`"${name}" is a reserved name and cannot be used`);
  }

  // Platform-specific checks
  if (!name.includes('-') && !name.includes('_') && name.length > 15) {
    errors.push('Consider using hyphens or underscores to separate words in longer names');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate module structure
 */
export async function validateModuleStructure(moduleDir: string): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check if directory exists
  if (!await fs.pathExists(moduleDir)) {
    errors.push('Module directory does not exist');
    return { isValid: false, errors };
  }

  // Required files and directories
  const requiredPaths = [
    'module.json',
    'package.json',
    'src',
    'src/index.ts',
    'src/components',
    'src/types',
    'src/utils'
  ];

  for (const requiredPath of requiredPaths) {
    const fullPath = path.join(moduleDir, requiredPath);
    if (!await fs.pathExists(fullPath)) {
      errors.push(`Required path not found: ${requiredPath}`);
    }
  }

  // Validate module.json
  try {
    const moduleJsonPath = path.join(moduleDir, 'module.json');
    if (await fs.pathExists(moduleJsonPath)) {
      const moduleJson = await fs.readJson(moduleJsonPath);
      
      // Required fields
      const requiredFields = ['name', 'version', 'displayName', 'description'];
      for (const field of requiredFields) {
        if (!moduleJson[field]) {
          errors.push(`module.json missing required field: ${field}`);
        }
      }

      // Validate name format
      if (moduleJson.name) {
        const nameValidation = validateModuleName(moduleJson.name);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors.map(err => `module.json name: ${err}`));
        }
      }

      // Validate version format (semver)
      if (moduleJson.version && !/^\d+\.\d+\.\d+/.test(moduleJson.version)) {
        errors.push('module.json version must follow semantic versioning (x.y.z)');
      }
    }
  } catch (error) {
    errors.push(`Invalid module.json: ${error.message}`);
  }

  // Validate package.json
  try {
    const packageJsonPath = path.join(moduleDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Check if name matches module.json
      const moduleJsonPath = path.join(moduleDir, 'module.json');
      if (await fs.pathExists(moduleJsonPath)) {
        const moduleJson = await fs.readJson(moduleJsonPath);
        if (packageJson.name !== moduleJson.name) {
          errors.push('package.json name must match module.json name');
        }
        if (packageJson.version !== moduleJson.version) {
          errors.push('package.json version must match module.json version');
        }
      }

      // Check for required Plataforma dependencies
      const requiredDeps = ['@plataforma/design-system', '@plataforma/core-window-system'];
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const dep of requiredDeps) {
        if (!allDeps[dep]) {
          errors.push(`package.json missing required dependency: ${dep}`);
        }
      }
    }
  } catch (error) {
    errors.push(`Invalid package.json: ${error.message}`);
  }

  // Validate TypeScript configuration
  const tsConfigPath = path.join(moduleDir, 'tsconfig.json');
  if (await fs.pathExists(tsConfigPath)) {
    try {
      const tsConfig = await fs.readJson(tsConfigPath);
      
      // Check for required compiler options
      const requiredOptions = {
        'jsx': 'react-jsx',
        'module': 'ESNext',
        'target': 'ES2020'
      };

      for (const [option, expectedValue] of Object.entries(requiredOptions)) {
        if (!tsConfig.compilerOptions?.[option]) {
          errors.push(`tsconfig.json missing required compiler option: ${option}`);
        } else if (tsConfig.compilerOptions[option] !== expectedValue) {
          errors.push(`tsconfig.json ${option} should be "${expectedValue}"`);
        }
      }

    } catch (error) {
      errors.push(`Invalid tsconfig.json: ${error.message}`);
    }
  }

  // Validate src structure
  const srcDir = path.join(moduleDir, 'src');
  if (await fs.pathExists(srcDir)) {
    // Check main entry point
    const indexPath = path.join(srcDir, 'index.ts');
    if (await fs.pathExists(indexPath)) {
      try {
        const content = await fs.readFile(indexPath, 'utf8');
        if (!content.includes('export') && !content.includes('module.exports')) {
          errors.push('src/index.ts must contain at least one export');
        }
      } catch (error) {
        errors.push(`Error reading src/index.ts: ${error.message}`);
      }
    }

    // Check component structure
    const componentsDir = path.join(srcDir, 'components');
    if (await fs.pathExists(componentsDir)) {
      const files = await fs.readdir(componentsDir);
      const hasMainComponent = files.some(file => 
        file.includes('ModuleComponent') || file.includes('MainComponent')
      );
      
      if (!hasMainComponent) {
        errors.push('src/components must contain a main component (ModuleComponent or MainComponent)');
      }
    }
  }

  // Check for common file issues
  await checkCommonIssues(moduleDir, errors);

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function checkCommonIssues(moduleDir: string, errors: string[]) {
  // Check for node_modules in the module (should be gitignored)
  const nodeModulesPath = path.join(moduleDir, 'node_modules');
  if (await fs.pathExists(nodeModulesPath)) {
    const gitignorePath = path.join(moduleDir, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignore.includes('node_modules')) {
        errors.push('node_modules directory exists but is not in .gitignore');
      }
    } else {
      errors.push('node_modules directory exists but no .gitignore found');
    }
  }

  // Check for large files
  async function checkFileSize(dir: string, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common large directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          await checkFileSize(fullPath, relativeFilePath);
        }
      } else {
        const stat = await fs.stat(fullPath);
        if (stat.size > 1024 * 1024) { // 1MB
          errors.push(`Large file detected: ${relativeFilePath} (${Math.round(stat.size / 1024)}KB)`);
        }
      }
    }
  }

  try {
    await checkFileSize(moduleDir);
  } catch (error) {
    // Ignore errors in file size check
  }
}

/**
 * Validate environment and dependencies
 */
export async function validateEnvironment(): Promise<ValidationResult> {
  const errors: string[] = [];

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  }

  // Check npm availability
  try {
    const { execSync } = require('child_process');
    execSync('npm --version', { stdio: 'ignore' });
  } catch {
    errors.push('npm is not available. Please install Node.js with npm.');
  }

  // Check git availability
  try {
    const { execSync } = require('child_process');
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    errors.push('git is not available. Please install Git.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}