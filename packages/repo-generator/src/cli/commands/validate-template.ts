import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { z } from 'zod';
import type { TemplateConfig } from '../../types';

interface ValidateTemplateOptions {
  verbose?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a template
 */
export async function validateTemplate(
  templatePath: string, 
  options: ValidateTemplateOptions = {}
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  console.log(chalk.blue(`🔍 Validating template: ${templatePath}`));
  console.log('');
  
  // Resolve template path
  const resolvedPath = path.isAbsolute(templatePath) 
    ? templatePath 
    : path.resolve(process.cwd(), templatePath);
  
  // Check if template exists
  if (!await fs.pathExists(resolvedPath)) {
    result.errors.push(`Template path does not exist: ${resolvedPath}`);
    result.valid = false;
    return result;
  }
  
  const stat = await fs.stat(resolvedPath);
  if (!stat.isDirectory()) {
    result.errors.push('Template path must be a directory');
    result.valid = false;
    return result;
  }
  
  // Validate template structure
  await validateTemplateStructure(resolvedPath, result);
  
  // Validate template configuration
  await validateTemplateConfig(resolvedPath, result);
  
  // Validate template files
  await validateTemplateFiles(resolvedPath, result);
  
  // Display results
  displayValidationResult(result, options.verbose || false);
  
  return result;
}

/**
 * Validate template directory structure
 */
async function validateTemplateStructure(
  templatePath: string, 
  result: ValidationResult
): Promise<void> {
  const requiredFiles = [
    'template.json',
    'README.md.hbs',
    'package.json.hbs',
    'src'
  ];
  
  const recommendedFiles = [
    'tsconfig.json.hbs',
    'vite.config.ts.hbs',
    '.gitignore.hbs',
    'src/index.ts.hbs',
    'src/components',
    'LICENSE.hbs'
  ];
  
  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(templatePath, file);
    if (!await fs.pathExists(filePath)) {
      result.errors.push(`Missing required file/directory: ${file}`);
      result.valid = false;
    }
  }
  
  // Check recommended files
  for (const file of recommendedFiles) {
    const filePath = path.join(templatePath, file);
    if (!await fs.pathExists(filePath)) {
      result.warnings.push(`Missing recommended file/directory: ${file}`);
    }
  }
  
  // Check src directory structure
  const srcPath = path.join(templatePath, 'src');
  if (await fs.pathExists(srcPath)) {
    const recommendedSrcFiles = [
      'components/index.ts.hbs',
      'types/index.ts.hbs',
      'utils/index.ts.hbs'
    ];
    
    for (const file of recommendedSrcFiles) {
      const filePath = path.join(templatePath, 'src', file.replace('src/', ''));
      if (!await fs.pathExists(filePath)) {
        result.warnings.push(`Missing recommended src file: ${file}`);
      }
    }
  }
}

/**
 * Validate template.json configuration
 */
async function validateTemplateConfig(
  templatePath: string, 
  result: ValidationResult
): Promise<void> {
  const configPath = path.join(templatePath, 'template.json');
  
  if (!await fs.pathExists(configPath)) {
    return; // Already reported as error in structure validation
  }
  
  try {
    const configContent = await fs.readJson(configPath);
    
    // Define template config schema
    const TemplateConfigSchema = z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      moduleType: z.enum(['business', 'system', 'plugin', 'ui']),
      features: z.array(z.string()),
      dependencies: z.record(z.string()).optional(),
      devDependencies: z.record(z.string()).optional(),
      scripts: z.record(z.string()).optional(),
      files: z.array(z.string()).optional()
    });
    
    // Validate schema
    const validation = TemplateConfigSchema.safeParse(configContent);
    if (!validation.success) {
      result.errors.push('Invalid template.json schema:');
      validation.error.issues.forEach(issue => {
        result.errors.push(`  • ${issue.path.join('.')}: ${issue.message}`);
      });
      result.valid = false;
    } else {
      const config = validation.data;
      
      // Additional validations
      if (config.features.length === 0) {
        result.warnings.push('No features specified in template.json');
      }
      
      // Check for common required features
      const commonFeatures = ['TypeScript', 'React'];
      const missingFeatures = commonFeatures.filter(f => !config.features.includes(f));
      if (missingFeatures.length > 0) {
        result.warnings.push(`Consider adding common features: ${missingFeatures.join(', ')}`);
      }
    }
    
  } catch (error) {
    result.errors.push(`Invalid JSON in template.json: ${error}`);
    result.valid = false;
  }
}

/**
 * Validate template files (Handlebars syntax)
 */
async function validateTemplateFiles(
  templatePath: string, 
  result: ValidationResult
): Promise<void> {
  const templateFiles = await findTemplateFiles(templatePath);
  
  for (const file of templateFiles) {
    await validateHandlebarsFile(file, result);
  }
}

/**
 * Find all .hbs template files
 */
async function findTemplateFiles(templatePath: string): Promise<string[]> {
  const files: string[] = [];
  
  async function scan(dir: string): Promise<void> {
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry !== 'node_modules' && !entry.startsWith('.')) {
          await scan(fullPath);
        }
      } else if (entry.endsWith('.hbs')) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(templatePath);
  return files;
}

/**
 * Validate Handlebars file syntax
 */
async function validateHandlebarsFile(
  filePath: string, 
  result: ValidationResult
): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Basic Handlebars syntax validation
    const handlebarsPattern = /\{\{[^}]+\}\}/g;
    const matches = content.match(handlebarsPattern) || [];
    
    for (const match of matches) {
      // Check for unclosed handlebars
      if (match.includes('{{') && !match.includes('}}')) {
        result.errors.push(`Unclosed Handlebars expression in ${path.basename(filePath)}: ${match}`);
        result.valid = false;
      }
      
      // Check for invalid variable names
      const variable = match.replace(/[{}]/g, '').trim();
      if (variable.includes(' ') && !variable.includes('#') && !variable.includes('/')) {
        result.warnings.push(`Suspicious Handlebars variable in ${path.basename(filePath)}: ${match}`);
      }
    }
    
    // Check for common required variables
    const commonVariables = [
      'name', 'description', 'author', 'version'
    ];
    
    for (const variable of commonVariables) {
      if (!content.includes(`{{${variable}}}`)) {
        if (path.basename(filePath) === 'package.json.hbs') {
          result.warnings.push(`Missing common variable {{${variable}}} in ${path.basename(filePath)}`);
        }
      }
    }
    
  } catch (error) {
    result.errors.push(`Failed to read template file ${path.basename(filePath)}: ${error}`);
    result.valid = false;
  }
}

/**
 * Display validation result
 */
function displayValidationResult(
  result: ValidationResult, 
  verbose: boolean
): void {
  if (result.valid) {
    console.log(chalk.green('✅ Template is valid!'));
  } else {
    console.log(chalk.red('❌ Template validation failed!'));
  }
  
  console.log('');
  
  if (result.errors.length > 0) {
    console.log(chalk.red('🔥 Errors:'));
    result.errors.forEach(error => {
      console.log(chalk.red(`   • ${error}`));
    });
    console.log('');
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('⚠️  Warnings:'));
    result.warnings.forEach(warning => {
      console.log(chalk.yellow(`   • ${warning}`));
    });
    console.log('');
  }
  
  if (verbose) {
    console.log(chalk.blue('📊 Summary:'));
    console.log(chalk.gray(`   Errors: ${result.errors.length}`));
    console.log(chalk.gray(`   Warnings: ${result.warnings.length}`));
    console.log(chalk.gray(`   Status: ${result.valid ? 'Valid' : 'Invalid'}`));
  }
}