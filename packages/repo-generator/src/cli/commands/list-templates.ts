import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { TemplateConfig, ModuleType } from '../../types';

interface ListTemplatesOptions {
  verbose?: boolean;
  type?: ModuleType;
}

interface TemplateInfo {
  name: string;
  type: ModuleType;
  description: string;
  features: string[];
  path: string;
  valid: boolean;
}

/**
 * List available module templates
 */
export async function listTemplates(options: ListTemplatesOptions = {}): Promise<void> {
  console.log(chalk.blue('📋 Available Module Templates'));
  console.log('');
  
  const templatesPath = getTemplatesPath();
  const templates = await discoverTemplates(templatesPath);
  
  // Filter by type if specified
  const filteredTemplates = options.type 
    ? templates.filter(t => t.type === options.type)
    : templates;
  
  if (filteredTemplates.length === 0) {
    console.log(chalk.yellow('No templates found matching criteria.'));
    return;
  }
  
  // Group templates by type
  const groupedTemplates = groupTemplatesByType(filteredTemplates);
  
  for (const [type, typeTemplates] of Object.entries(groupedTemplates)) {
    console.log(chalk.green(`${getTypeIcon(type as ModuleType)} ${type.toUpperCase()} MODULES`));
    console.log(chalk.gray('─'.repeat(50)));
    
    for (const template of typeTemplates) {
      displayTemplate(template, options.verbose || false);
      console.log('');
    }
  }
  
  // Show usage examples
  console.log(chalk.blue('💡 Usage Examples:'));
  console.log(chalk.gray('   plataforma-repo create my-dashboard -t business'));
  console.log(chalk.gray('   plataforma-repo create auth-system -t system --private'));
  console.log(chalk.gray('   plataforma-repo create ui-components -t ui --with-storybook'));
}

/**
 * Discover templates in the templates directory
 */
async function discoverTemplates(templatesPath: string): Promise<TemplateInfo[]> {
  const templates: TemplateInfo[] = [];
  
  try {
    const templateTypes = await fs.readdir(templatesPath);
    
    for (const typeName of templateTypes) {
      const typePath = path.join(templatesPath, typeName);
      const stat = await fs.stat(typePath);
      
      if (!stat.isDirectory()) continue;
      
      try {
        const templateInfo = await loadTemplateInfo(typePath, typeName as ModuleType);
        templates.push(templateInfo);
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Invalid template: ${typeName}`));
      }
    }
  } catch (error) {
    throw new Error(`Failed to read templates directory: ${error}`);
  }
  
  return templates;
}

/**
 * Load template information from template.json
 */
async function loadTemplateInfo(templatePath: string, type: ModuleType): Promise<TemplateInfo> {
  const configPath = path.join(templatePath, 'template.json');
  
  let config: TemplateConfig | null = null;
  let valid = true;
  
  try {
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readJson(configPath);
      config = configContent as TemplateConfig;
    }
  } catch (error) {
    valid = false;
  }
  
  // Validate template structure
  const requiredFiles = ['package.json.hbs', 'README.md.hbs', 'src'];
  for (const file of requiredFiles) {
    const filePath = path.join(templatePath, file);
    if (!await fs.pathExists(filePath)) {
      valid = false;
      break;
    }
  }
  
  return {
    name: type,
    type,
    description: config?.description || getDefaultDescription(type),
    features: config?.features || getDefaultFeatures(type),
    path: templatePath,
    valid
  };
}

/**
 * Display template information
 */
function displayTemplate(template: TemplateInfo, verbose: boolean): void {
  const statusIcon = template.valid ? '✅' : '❌';
  const nameColor = template.valid ? chalk.white : chalk.red;
  
  console.log(`${statusIcon} ${nameColor(template.name)}`);
  console.log(`   ${chalk.gray(template.description)}`);
  
  if (verbose) {
    console.log(`   ${chalk.blue('Path:')} ${chalk.gray(template.path)}`);
    console.log(`   ${chalk.blue('Features:')} ${template.features.map(f => chalk.cyan(f)).join(', ')}`);
    
    if (!template.valid) {
      console.log(`   ${chalk.red('Issues:')} Template structure is invalid`);
    }
  }
}

/**
 * Group templates by type
 */
function groupTemplatesByType(templates: TemplateInfo[]): Record<string, TemplateInfo[]> {
  return templates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<string, TemplateInfo[]>);
}

/**
 * Get icon for module type
 */
function getTypeIcon(type: ModuleType): string {
  const icons = {
    business: '💼',
    system: '⚙️',
    plugin: '🔌',
    ui: '🎨'
  };
  return icons[type] || '📦';
}

/**
 * Get default description for module type
 */
function getDefaultDescription(type: ModuleType): string {
  const descriptions = {
    business: 'Business logic and data management modules',
    system: 'Core system and infrastructure modules',
    plugin: 'Extensible plugin and integration modules',
    ui: 'User interface and component library modules'
  };
  return descriptions[type] || 'General purpose module';
}

/**
 * Get default features for module type
 */
function getDefaultFeatures(type: ModuleType): string[] {
  const features = {
    business: ['TypeScript', 'React', 'API Integration', 'Data Validation'],
    system: ['TypeScript', 'Node.js', 'Authentication', 'Security'],
    plugin: ['TypeScript', 'Extensible API', 'Configuration', 'Hooks'],
    ui: ['TypeScript', 'React', 'Storybook', 'Design System']
  };
  return features[type] || ['TypeScript', 'React'];
}

/**
 * Get templates directory path
 */
function getTemplatesPath(): string {
  // Try relative to current module
  const relativePath = path.join(__dirname, '../../templates');
  if (fs.pathExistsSync(relativePath)) {
    return relativePath;
  }
  
  // Try relative to package root
  const packagePath = path.join(__dirname, '../../../templates');
  if (fs.pathExistsSync(packagePath)) {
    return packagePath;
  }
  
  throw new Error('Templates directory not found');
}