import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { ModuleConfig } from '../types';

// Register Handlebars helpers
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotEquals', function(arg1, arg2, options) {
  return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('capitalize', function(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

Handlebars.registerHelper('kebabCase', function(str: string) {
  return str.toLowerCase().replace(/\s+/g, '-');
});

Handlebars.registerHelper('camelCase', function(str: string) {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
});

Handlebars.registerHelper('pascalCase', function(str: string) {
  const camelCase = str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
});

export async function renderTemplate(templateName: string, outputDir: string, config: ModuleConfig) {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateDir = path.join(templatesDir, templateName);

  if (!await fs.pathExists(templateDir)) {
    throw new Error(`Template "${templateName}" not found in ${templateDir}`);
  }

  // Get all template files
  const templateFiles = await getTemplateFiles(templateDir);
  
  // Render each template file
  for (const templateFile of templateFiles) {
    await renderTemplateFile(templateFile, templateDir, outputDir, config);
  }
}

async function getTemplateFiles(templateDir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walkDir(dir: string, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath, relativeFilePath);
      } else {
        files.push(relativeFilePath);
      }
    }
  }
  
  await walkDir(templateDir);
  return files;
}

async function renderTemplateFile(
  relativeFilePath: string, 
  templateDir: string, 
  outputDir: string, 
  config: ModuleConfig
) {
  const templateFilePath = path.join(templateDir, relativeFilePath);
  const templateContent = await fs.readFile(templateFilePath, 'utf8');
  
  // Process filename template (remove .hbs extension and apply template variables)
  let outputFilePath = relativeFilePath;
  if (outputFilePath.endsWith('.hbs')) {
    outputFilePath = outputFilePath.slice(0, -4); // Remove .hbs
  }
  
  // Apply template variables to filename
  const filenameTemplate = Handlebars.compile(outputFilePath);
  outputFilePath = filenameTemplate(config);
  
  const fullOutputPath = path.join(outputDir, outputFilePath);
  
  // Ensure output directory exists
  await fs.ensureDir(path.dirname(fullOutputPath));
  
  // Render template content
  const template = Handlebars.compile(templateContent);
  const renderedContent = template(config);
  
  // Write rendered file
  await fs.writeFile(fullOutputPath, renderedContent);
}

export async function copyStaticFiles(templateName: string, outputDir: string) {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const staticDir = path.join(templatesDir, templateName, 'static');
  
  if (await fs.pathExists(staticDir)) {
    await fs.copy(staticDir, outputDir);
  }
}

export function getAvailableTemplates(): string[] {
  const templatesDir = path.join(__dirname, '..', 'templates');
  try {
    return fs.readdirSync(templatesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  } catch {
    return ['basic', 'advanced', 'ai-powered'];
  }
}

export function getTemplateInfo(templateName: string): any {
  const templatesDir = path.join(__dirname, '..', 'templates');
  const infoPath = path.join(templatesDir, templateName, 'template.json');
  
  try {
    return fs.readJsonSync(infoPath);
  } catch {
    // Return default template info
    const templateInfo: Record<string, any> = {
      'basic': {
        name: 'Basic Module',
        description: 'Módulo básico sem banco de dados ou IA',
        features: { windowSystem: true, database: false, ai: false }
      },
      'advanced': {
        name: 'Advanced Module',
        description: 'Módulo avançado com banco de dados integrado',
        features: { windowSystem: true, database: true, ai: false }
      },
      'ai-powered': {
        name: 'AI-Powered Module',
        description: 'Módulo com componentes de inteligência artificial',
        features: { windowSystem: true, database: false, ai: true }
      }
    };
    
    return templateInfo[templateName] || templateInfo['basic'];
  }
}

export async function validateTemplateStructure(templateName: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateDir = path.join(templatesDir, templateName);

  // Check if template directory exists
  if (!await fs.pathExists(templateDir)) {
    errors.push(`Template directory not found: ${templateDir}`);
    return { isValid: false, errors };
  }

  // Required files
  const requiredFiles = [
    'module.json.hbs',
    'package.json.hbs',
    'src/index.ts.hbs',
    'src/components/ModuleComponent.tsx.hbs',
    'src/types/index.ts.hbs'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(templateDir, file);
    if (!await fs.pathExists(filePath)) {
      errors.push(`Required file missing: ${file}`);
    }
  }

  // Validate template syntax
  try {
    const moduleJsonPath = path.join(templateDir, 'module.json.hbs');
    if (await fs.pathExists(moduleJsonPath)) {
      const content = await fs.readFile(moduleJsonPath, 'utf8');
      Handlebars.compile(content);
    }
  } catch (error) {
    errors.push(`Invalid Handlebars syntax in module.json.hbs: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}