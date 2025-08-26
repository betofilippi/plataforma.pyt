import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { ConfigManager } from '../config';
import type { GenerationContext, TemplateVariables } from '../types';

/**
 * Template engine for generating module files
 */
export class TemplateEngine {
  private context: GenerationContext;
  private configManager: ConfigManager;
  private handlebars: typeof Handlebars;

  constructor(context: GenerationContext) {
    this.context = context;
    this.configManager = new ConfigManager(context);
    this.handlebars = Handlebars.create();
    this.registerHelpers();
  }

  /**
   * Generate module files from template
   */
  async generateFromTemplate(): Promise<void> {
    const variables = this.configManager.createTemplateVariables();
    
    // Generate from template directory
    await this.processTemplateDirectory(
      this.context.templatePath,
      this.context.outputPath,
      variables
    );
    
    // Generate additional configuration files
    await this.generateConfigFiles(variables);
  }

  /**
   * Process template directory recursively
   */
  private async processTemplateDirectory(
    templateDir: string,
    outputDir: string,
    variables: TemplateVariables
  ): Promise<void> {
    
    // Ensure output directory exists
    await fs.ensureDir(outputDir);
    
    const entries = await fs.readdir(templateDir);
    
    for (const entry of entries) {
      const templatePath = path.join(templateDir, entry);
      const stat = await fs.stat(templatePath);
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (entry === 'node_modules' || entry.startsWith('.')) {
          continue;
        }
        
        const outputSubdir = path.join(outputDir, entry);
        await this.processTemplateDirectory(templatePath, outputSubdir, variables);
        
      } else if (entry.endsWith('.hbs')) {
        // Process Handlebars template
        const outputFile = path.join(outputDir, entry.replace('.hbs', ''));
        await this.processTemplateFile(templatePath, outputFile, variables);
        
      } else {
        // Copy non-template files directly
        const outputFile = path.join(outputDir, entry);
        await fs.copy(templatePath, outputFile);
      }
    }
  }

  /**
   * Process a single template file
   */
  private async processTemplateFile(
    templatePath: string,
    outputPath: string,
    variables: TemplateVariables
  ): Promise<void> {
    
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    try {
      const template = this.handlebars.compile(templateContent);
      const output = template(variables);
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      await fs.writeFile(outputPath, output, 'utf-8');
      
    } catch (error) {
      throw new Error(`Failed to process template ${path.basename(templatePath)}: ${error}`);
    }
  }

  /**
   * Generate additional configuration files
   */
  private async generateConfigFiles(variables: TemplateVariables): Promise<void> {
    const outputPath = this.context.outputPath;
    
    // Generate package.json
    const packageJson = await this.configManager.generatePackageJson();
    await fs.writeFile(
      path.join(outputPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );
    
    // Generate tsconfig.json if TypeScript is enabled
    if (variables.hasTypescript) {
      const tsConfig = await this.configManager.generateTSConfig();
      await fs.writeFile(
        path.join(outputPath, 'tsconfig.json'),
        JSON.stringify(tsConfig, null, 2),
        'utf-8'
      );
    }
    
    // Generate vite.config.ts if module federation is enabled
    if (variables.hasModuleFederation) {
      const viteConfig = await this.configManager.generateViteConfig();
      await fs.writeFile(
        path.join(outputPath, 'vite.config.ts'),
        viteConfig,
        'utf-8'
      );
    }
    
    // Generate Dockerfile if Docker is enabled
    if (variables.hasDocker) {
      const dockerfile = await this.configManager.generateDockerfile();
      await fs.writeFile(
        path.join(outputPath, 'Dockerfile'),
        dockerfile,
        'utf-8'
      );
    }
    
    // Generate module manifest
    const manifest = await this.configManager.generateModuleManifest();
    await fs.writeFile(
      path.join(outputPath, 'module.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    
    // String manipulation helpers
    this.handlebars.registerHelper('upperCase', (str: string) => str.toUpperCase());
    this.handlebars.registerHelper('lowerCase', (str: string) => str.toLowerCase());
    this.handlebars.registerHelper('capitalize', (str: string) => 
      str.charAt(0).toUpperCase() + str.slice(1));
    
    this.handlebars.registerHelper('pascalCase', (str: string) => 
      str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
         .replace(/^[a-z]/, letter => letter.toUpperCase()));
    
    this.handlebars.registerHelper('camelCase', (str: string) => 
      str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()));
    
    this.handlebars.registerHelper('kebabCase', (str: string) => str);
    
    this.handlebars.registerHelper('constantCase', (str: string) => 
      str.replace(/-/g, '_').toUpperCase());
    
    // Date helpers
    this.handlebars.registerHelper('currentYear', () => new Date().getFullYear());
    this.handlebars.registerHelper('currentDate', () => new Date().toISOString().split('T')[0]);
    this.handlebars.registerHelper('currentDateTime', () => new Date().toISOString());
    
    // Conditional helpers
    this.handlebars.registerHelper('if_eq', function(a: any, b: any, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    });
    
    this.handlebars.registerHelper('if_ne', function(a: any, b: any, options: any) {
      return a !== b ? options.fn(this) : options.inverse(this);
    });
    
    this.handlebars.registerHelper('if_contains', function(array: any[], item: any, options: any) {
      return array.includes(item) ? options.fn(this) : options.inverse(this);
    });
    
    // JSON helpers
    this.handlebars.registerHelper('json', (obj: any) => JSON.stringify(obj, null, 2));
    this.handlebars.registerHelper('jsonInline', (obj: any) => JSON.stringify(obj));
    
    // Array helpers
    this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') => 
      Array.isArray(array) ? array.join(separator) : '');
    
    this.handlebars.registerHelper('length', (array: any[]) => 
      Array.isArray(array) ? array.length : 0);
    
    // Module type helpers
    this.handlebars.registerHelper('moduleIcon', (type: string) => {
      const icons = {
        business: '💼',
        system: '⚙️',
        plugin: '🔌',
        ui: '🎨'
      };
      return icons[type as keyof typeof icons] || '📦';
    });
    
    this.handlebars.registerHelper('moduleColor', (type: string) => {
      const colors = {
        business: '#10B981',
        system: '#6366F1',
        plugin: '#F59E0B',
        ui: '#EC4899'
      };
      return colors[type as keyof typeof colors] || '#6B7280';
    });
    
    // GitHub helpers
    this.handlebars.registerHelper('githubUrl', (owner: string, repo: string) => 
      `https://github.com/${owner}/${repo}`);
    
    this.handlebars.registerHelper('npmUrl', (packageName: string) => 
      `https://www.npmjs.com/package/${packageName}`);
    
    // License helpers
    this.handlebars.registerHelper('licenseUrl', (license: string) => {
      const urls = {
        'MIT': 'https://opensource.org/licenses/MIT',
        'Apache-2.0': 'https://opensource.org/licenses/Apache-2.0',
        'GPL-3.0': 'https://opensource.org/licenses/GPL-3.0',
        'proprietary': '#'
      };
      return urls[license as keyof typeof urls] || '#';
    });
    
    // Dependency helpers
    this.handlebars.registerHelper('dependencyList', (deps: Record<string, string>) => 
      Object.entries(deps).map(([name, version]) => `${name}@${version}`).join(' '));
    
    // Badge helpers
    this.handlebars.registerHelper('npmBadge', (packageName: string) => 
      `[![npm version](https://badge.fury.io/js/${encodeURIComponent(packageName)}.svg)](https://badge.fury.io/js/${encodeURIComponent(packageName)})`);
    
    this.handlebars.registerHelper('licenseBadge', (license: string) => 
      `[![License](https://img.shields.io/badge/License-${encodeURIComponent(license)}-blue.svg)](LICENSE)`);
    
    this.handlebars.registerHelper('buildBadge', (owner: string, repo: string) => 
      `[![Build Status](https://github.com/${owner}/${repo}/workflows/CI/badge.svg)](https://github.com/${owner}/${repo}/actions)`);
  }
}

/**
 * Helper function to get default template path
 */
export function getDefaultTemplatePath(moduleType: string): string {
  return path.join(__dirname, '../../templates', moduleType);
}