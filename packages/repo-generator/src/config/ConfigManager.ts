import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import Handlebars from 'handlebars';
import type { 
  RepositoryConfig, 
  TemplateConfig, 
  TemplateVariables,
  ModuleType,
  GenerationContext 
} from '../types';

/**
 * Manages configuration generation for modules
 */
export class ConfigManager {
  private templatePath: string;
  private context: GenerationContext;

  constructor(context: GenerationContext) {
    this.context = context;
    this.templatePath = context.templatePath;
  }

  /**
   * Generate package.json for the module
   */
  async generatePackageJson(): Promise<object> {
    const { config } = this.context;
    
    const basePackage = {
      name: `@${config.owner}/${config.name}`,
      version: config.version,
      description: config.description,
      author: config.author,
      license: config.license,
      type: "module",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      
      // Module federation entries
      ...(config.features.moduleFederation && {
        "module-federation": {
          name: config.name.replace(/-/g, '_'),
          filename: "remoteEntry.js",
          exposes: {
            "./Component": "./src/components/ModuleComponent"
          },
          shared: {
            react: { singleton: true },
            "react-dom": { singleton: true }
          }
        }
      }),

      files: [
        "dist",
        "README.md",
        "LICENSE"
      ],

      scripts: this.generateScripts(),
      dependencies: this.generateDependencies(),
      devDependencies: this.generateDevDependencies(),
      peerDependencies: this.generatePeerDependencies(),

      keywords: [
        "plataforma-app",
        "module-federation",
        config.moduleType,
        ...config.topics
      ],

      repository: {
        type: "git",
        url: `git+https://github.com/${config.owner}/${config.name}.git`
      },

      bugs: {
        url: `https://github.com/${config.owner}/${config.name}/issues`
      },

      homepage: config.homepageUrl || `https://github.com/${config.owner}/${config.name}#readme`,

      publishConfig: {
        access: config.private ? "restricted" : "public"
      }
    };

    return basePackage;
  }

  /**
   * Generate TypeScript configuration
   */
  async generateTSConfig(): Promise<object> {
    const { config } = this.context;
    
    const baseTSConfig = {
      extends: "@plataforma/tsconfig/base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        module: "ESNext",
        moduleResolution: "node",
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true,
        resolveJsonModule: true,
        ...(config.features.react && {
          jsx: "react-jsx"
        })
      },
      include: [
        "src/**/*"
      ],
      exclude: [
        "dist",
        "node_modules",
        "**/*.test.*",
        "**/*.spec.*"
      ]
    };

    return baseTSConfig;
  }

  /**
   * Generate Vite configuration for module federation
   */
  async generateViteConfig(): Promise<string> {
    if (!this.context.config.features.moduleFederation) {
      return '';
    }

    const { config } = this.context;
    const moduleName = config.name.replace(/-/g, '_');

    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: '${moduleName}',
      filename: 'remoteEntry.js',
      exposes: {
        './Component': './src/components/ModuleComponent'
      },
      shared: {
        react: {
          singleton: true,
        },
        'react-dom': {
          singleton: true,
        },
        '@plataforma/core': {
          singleton: true,
        },
        '@plataforma/design-system': {
          singleton: true,
        }
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false
  }
});`;
  }

  /**
   * Generate Dockerfile
   */
  async generateDockerfile(): Promise<string> {
    if (!this.context.config.features.docker) {
      return '';
    }

    const { cicd } = this.context.config;

    return `# Multi-stage build for production optimization
FROM node:${cicd.nodeVersion}-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build application
RUN ${cicd.buildCommand}

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]`;
  }

  /**
   * Generate module manifest
   */
  async generateModuleManifest(): Promise<object> {
    const { config } = this.context;
    
    return {
      manifest: {
        name: config.name,
        displayName: config.displayName,
        version: config.version,
        description: config.description,
        author: config.author,
        license: config.license,
        type: config.moduleType,
        category: config.category || 'general',
        
        // Module federation config
        federation: config.features.moduleFederation ? {
          name: config.name.replace(/-/g, '_'),
          remoteEntry: './dist/remoteEntry.js',
          exposedModules: {
            './Component': './src/components/ModuleComponent'
          }
        } : undefined,

        // Permissions and capabilities
        permissions: {
          storage: false,
          network: true,
          filesystem: false,
          notifications: false
        },

        // Dependencies
        dependencies: {
          platform: "^2.0.0",
          ...Object.keys(this.generateDependencies()).reduce((acc, dep) => {
            if (dep.startsWith('@plataforma/')) {
              acc[dep] = "workspace:*";
            }
            return acc;
          }, {} as Record<string, string>)
        },

        // UI Configuration
        ui: {
          icon: `${config.moduleType}-module`,
          color: this.getModuleColor(config.moduleType),
          category: config.category || 'general',
          windowOptions: {
            resizable: true,
            minimizable: true,
            maximizable: true,
            closable: true,
            alwaysOnTop: false,
            defaultWidth: 1200,
            defaultHeight: 800
          }
        },

        // Development info
        development: {
          repository: `https://github.com/${config.owner}/${config.name}`,
          issues: `https://github.com/${config.owner}/${config.name}/issues`,
          documentation: config.homepageUrl || `https://github.com/${config.owner}/${config.name}#readme`,
          devPort: 5173,
          buildCommand: config.cicd.buildCommand,
          testCommand: config.cicd.testCommand
        }
      }
    };
  }

  /**
   * Generate scripts section for package.json
   */
  private generateScripts(): Record<string, string> {
    const { config } = this.context;
    const scripts: Record<string, string> = {
      "dev": "vite",
      "build": config.cicd.buildCommand,
      "preview": "vite preview",
      "clean": "rimraf dist"
    };

    if (config.features.typescript) {
      scripts["typecheck"] = "tsc --noEmit";
      scripts["build"] = "tsc && vite build";
    }

    if (config.features.testing) {
      scripts["test"] = config.cicd.testCommand;
      scripts["test:watch"] = "jest --watch";
      scripts["test:coverage"] = "jest --coverage";
    }

    if (config.features.linting) {
      scripts["lint"] = "eslint src --ext .ts,.tsx";
      scripts["lint:fix"] = "eslint src --ext .ts,.tsx --fix";
      scripts["format"] = "prettier --write src";
      scripts["format:check"] = "prettier --check src";
    }

    if (config.features.storybook) {
      scripts["storybook"] = "storybook dev -p 6006";
      scripts["build-storybook"] = "storybook build";
    }

    // Module-specific scripts
    scripts["validate"] = "plataforma validate";
    scripts["publish:module"] = "plataforma publish";

    return scripts;
  }

  /**
   * Generate dependencies
   */
  private generateDependencies(): Record<string, string> {
    const { config } = this.context;
    const deps: Record<string, string> = {
      "@plataforma/core": "workspace:*",
      "@plataforma/module-contracts": "workspace:*",
    };

    if (config.features.react) {
      deps["react"] = "^18.2.0";
      deps["react-dom"] = "^18.2.0";
    }

    if (config.features.tailwind) {
      deps["@plataforma/design-system"] = "workspace:*";
      deps["tailwindcss"] = "^3.3.0";
    }

    // Module type specific dependencies
    switch (config.moduleType) {
      case 'business':
        deps["zod"] = "^3.22.0";
        deps["@tanstack/react-query"] = "^4.35.0";
        break;
      case 'ui':
        deps["@radix-ui/react-dialog"] = "^1.0.0";
        deps["@radix-ui/react-dropdown-menu"] = "^2.0.0";
        deps["lucide-react"] = "^0.290.0";
        break;
      case 'system':
        deps["@plataforma/auth-system"] = "workspace:*";
        break;
    }

    return deps;
  }

  /**
   * Generate dev dependencies
   */
  private generateDevDependencies(): Record<string, string> {
    const { config } = this.context;
    const devDeps: Record<string, string> = {
      "vite": "^4.4.0",
    };

    if (config.features.typescript) {
      devDeps["typescript"] = "^5.0.0";
      devDeps["@types/node"] = "^20.0.0";
    }

    if (config.features.react) {
      devDeps["@vitejs/plugin-react"] = "^4.0.0";
      devDeps["@types/react"] = "^18.2.0";
      devDeps["@types/react-dom"] = "^18.2.0";
    }

    if (config.features.testing) {
      devDeps["jest"] = "^29.0.0";
      devDeps["@testing-library/react"] = "^13.0.0";
      devDeps["@testing-library/jest-dom"] = "^6.0.0";
    }

    if (config.features.linting) {
      devDeps["eslint"] = "^8.0.0";
      devDeps["@typescript-eslint/eslint-plugin"] = "^6.0.0";
      devDeps["@typescript-eslint/parser"] = "^6.0.0";
      devDeps["prettier"] = "^3.0.0";
    }

    if (config.features.moduleFederation) {
      devDeps["@originjs/vite-plugin-federation"] = "^1.3.0";
    }

    if (config.features.storybook) {
      devDeps["@storybook/react-vite"] = "^7.0.0";
      devDeps["@storybook/addon-essentials"] = "^7.0.0";
    }

    return devDeps;
  }

  /**
   * Generate peer dependencies
   */
  private generatePeerDependencies(): Record<string, string> {
    const { config } = this.context;
    const peerDeps: Record<string, string> = {};

    if (config.features.react) {
      peerDeps["react"] = ">=18.0.0";
      peerDeps["react-dom"] = ">=18.0.0";
    }

    return peerDeps;
  }

  /**
   * Get module color based on type
   */
  private getModuleColor(type: ModuleType): string {
    const colors = {
      business: '#10B981',
      system: '#6366F1',
      plugin: '#F59E0B',
      ui: '#EC4899'
    };
    return colors[type] || '#6B7280';
  }

  /**
   * Create template variables for Handlebars
   */
  createTemplateVariables(): TemplateVariables {
    const { config, repository } = this.context;
    
    return {
      // Basic info
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      version: config.version,
      author: config.author,
      license: config.license,
      
      // GitHub
      githubOwner: config.owner,
      repositoryName: config.name,
      repositoryUrl: repository?.html_url || `https://github.com/${config.owner}/${config.name}`,
      homepageUrl: config.homepageUrl,
      
      // Dates
      currentYear: new Date().getFullYear(),
      currentDate: new Date().toISOString().split('T')[0],
      
      // Features
      hasTypescript: config.features.typescript,
      hasReact: config.features.react,
      hasTailwind: config.features.tailwind,
      hasDocker: config.features.docker,
      hasCicd: config.features.cicd,
      hasTesting: config.features.testing,
      hasLinting: config.features.linting,
      hasModuleFederation: config.features.moduleFederation,
      hasStorybook: config.features.storybook,
      
      // Module specific
      moduleType: config.moduleType,
      category: config.category,
      
      // CI/CD
      nodeVersion: config.cicd.nodeVersion,
      testCommand: config.cicd.testCommand,
      buildCommand: config.cicd.buildCommand,
      publishRegistry: config.cicd.publishRegistry,
      deploymentTargets: config.cicd.deploymentTargets,
      
      // Dependencies (stringified for templates)
      dependenciesJson: JSON.stringify(this.generateDependencies(), null, 2),
      devDependenciesJson: JSON.stringify(this.generateDevDependencies(), null, 2),
      scriptsJson: JSON.stringify(this.generateScripts(), null, 2),
      
      // Computed values
      pascalCaseName: this.toPascalCase(config.name),
      camelCaseName: this.toCamelCase(config.name),
      kebabCaseName: config.name,
      constantCaseName: this.toConstantCase(config.name),
    };
  }

  private toPascalCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
              .replace(/^[a-z]/, letter => letter.toUpperCase());
  }

  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toConstantCase(str: string): string {
    return str.replace(/-/g, '_').toUpperCase();
  }
}