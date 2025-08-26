# @plataforma/repo-generator

[![npm version](https://badge.fury.io/js/%40plataforma%2Frepo-generator.svg)](https://badge.fury.io/js/%40plataforma%2Frepo-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Build Status](https://github.com/plataforma/repo-generator/workflows/CI/badge.svg)](https://github.com/plataforma/repo-generator/actions)

🏗️ **Repository Generator** - Automatically creates and configures GitHub repositories for Plataforma.app modules with complete boilerplate, CI/CD pipelines, and best practices built-in.

## ✨ Features

- 🚀 **Automated GitHub Repository Creation** - Creates repos with proper configuration
- 📦 **Multiple Module Templates** - Business, System, Plugin, and UI module types
- ⚙️ **Complete CI/CD Setup** - GitHub Actions workflows for testing, building, and deployment
- 🐳 **Docker Support** - Containerization with optimized multi-stage builds
- 🏗️ **Module Federation Ready** - Pre-configured for micro-frontend architecture
- 🎨 **Design System Integration** - Built-in Plataforma Design System support
- 🔒 **Security Best Practices** - Automated security scanning and dependency auditing
- 📚 **Comprehensive Documentation** - Auto-generated README with badges and examples
- 🧪 **Testing Framework** - Jest, React Testing Library, and coverage reporting
- 🔧 **Development Tools** - ESLint, Prettier, TypeScript, and Git hooks

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g @plataforma/repo-generator

# Or use with SDK
npm install -g @plataforma/sdk
```

### Create Your First Repository

```bash
# Using the repo generator directly
plataforma-repo create my-dashboard -t business --interactive

# Or through the main SDK CLI
plataforma create-repo my-dashboard -t business --interactive
```

### GitHub Setup

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens/new)
2. Set required permissions: `repo`, `read:org`, `admin:repo_hook`
3. Set as environment variable: `export GITHUB_TOKEN=your_token_here`

## 📋 Available Templates

### 💼 Business Modules
Business logic and data management modules with API integration, validation, and state management.

**Features:** TypeScript, React, API Integration, Data Validation, State Management, Real-time Updates

```bash
plataforma-repo create sales-dashboard -t business
```

### ⚙️ System Modules
Core system and infrastructure modules with authentication, security, and low-level integrations.

**Features:** TypeScript, Node.js, Authentication, Security, System APIs

```bash
plataforma-repo create auth-system -t system --private
```

### 🔌 Plugin Modules
Extensible plugin and integration modules with configuration and hooks system.

**Features:** TypeScript, Extensible API, Configuration, Hooks, Integration Points

```bash
plataforma-repo create payment-plugin -t plugin
```

### 🎨 UI Modules
User interface and component library modules with Storybook and design system integration.

**Features:** TypeScript, React, Storybook, Design System, Component Documentation

```bash
plataforma-repo create ui-components -t ui --with-storybook
```

## 🔧 CLI Usage

### Basic Usage

```bash
# Create repository with defaults
plataforma-repo create my-module

# Specify template type
plataforma-repo create my-module -t business

# Interactive mode with prompts
plataforma-repo create my-module --interactive

# Dry run to preview changes
plataforma-repo create my-module --dry-run
```

### Advanced Options

```bash
plataforma-repo create my-module \\
  --owner myorg \\
  --template business \\
  --description "My awesome module" \\
  --display-name "My Awesome Module" \\
  --private \\
  --license MIT \\
  --author "Your Name" \\
  --topics api,react,typescript \\
  --with-storybook \\
  --github-token ghp_xxxxx
```

### Template Management

```bash
# List available templates
plataforma-repo templates

# Validate a template
plataforma-repo validate business

# Setup GitHub integration
plataforma-repo setup-github --save
```

### Command Reference

| Command | Description | Example |
|---------|-------------|---------|
| `create <name>` | Create new repository | `plataforma-repo create my-app` |
| `templates` | List available templates | `plataforma-repo templates` |
| `validate <template>` | Validate template | `plataforma-repo validate business` |
| `setup-github` | Setup GitHub integration | `plataforma-repo setup-github` |
| `init` | Initialize configuration | `plataforma-repo init` |
| `info` | Show tool information | `plataforma-repo info` |

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes |
| `PLATAFORMA_REGISTRY_URL` | Module registry URL | No |
| `PLATAFORMA_TOKEN` | Registry authentication token | No |

### Configuration File

Create `.plataforma-repo.json` in your home directory:

```json
{
  "github": {
    "defaultOrg": "myorg",
    "token": "ghp_xxxxx"
  },
  "defaults": {
    "license": "MIT",
    "author": "Your Name",
    "features": {
      "typescript": true,
      "react": true,
      "tailwind": true,
      "docker": true,
      "cicd": true,
      "testing": true,
      "linting": true,
      "moduleFederation": true,
      "storybook": false
    }
  }
}
```

## 🏗️ Generated Repository Structure

```
my-module/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Continuous Integration
│       └── release.yml         # Automated Releases
├── src/
│   ├── components/
│   │   ├── ModuleComponent.tsx # Main component
│   │   └── ModuleProvider.tsx  # Context provider
│   ├── hooks/
│   │   └── useModule.ts        # Custom hooks
│   ├── services/
│   │   └── api.ts              # API integration
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── utils/
│   │   └── helpers.ts          # Utility functions
│   └── index.ts                # Main exports
├── tests/
│   └── __tests__/              # Test files
├── docs/
│   └── api.md                  # API documentation
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── .gitignore                  # Git ignore rules
├── Dockerfile                  # Docker configuration
├── jest.config.js              # Jest configuration
├── module.json                 # Module manifest
├── package.json                # Package configuration
├── README.md                   # Documentation
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite configuration
```

## 🎯 Module Features

### Module Federation

Generated modules are pre-configured for module federation:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    federation({
      name: 'myModule',
      filename: 'remoteEntry.js',
      exposes: {
        './Component': './src/components/ModuleComponent'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
});
```

### CI/CD Pipeline

Automated workflows include:

- **Continuous Integration**: Lint, test, build, security scan
- **Automated Releases**: Semantic versioning and changelog generation
- **Docker Publishing**: Multi-stage builds and container registry
- **Module Registry**: Publish to Plataforma module registry

### Testing Framework

Complete testing setup:

```typescript
// src/__tests__/ModuleComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { ModuleComponent } from '../components/ModuleComponent';

describe('ModuleComponent', () => {
  it('renders correctly', () => {
    render(<ModuleComponent />);
    expect(screen.getByText('Module Component')).toBeInTheDocument();
  });
});
```

## 🔌 Programmatic API

### Basic Usage

```typescript
import { createRepository, ConfigManager, TemplateEngine } from '@plataforma/repo-generator';

// Create repository programmatically
const result = await createRepository('my-module', {
  template: 'business',
  owner: 'myorg',
  description: 'My awesome module',
  features: {
    typescript: true,
    react: true,
    docker: true
  }
});

console.log(`Repository created: ${result.repositoryUrl}`);
```

### Advanced Configuration

```typescript
import { GitHubService, ConfigManager } from '@plataforma/repo-generator';

// Setup GitHub service
const github = new GitHubService('ghp_token');

// Create custom configuration
const config = {
  name: 'my-module',
  moduleType: 'business' as const,
  features: {
    typescript: true,
    react: true,
    tailwind: true,
    docker: true,
    cicd: true,
    testing: true,
    linting: true,
    moduleFederation: true
  }
};

// Generate configuration files
const configManager = new ConfigManager({ config, templatePath: './templates/business', outputPath: './my-module' });
const packageJson = await configManager.generatePackageJson();
```

## 🛠️ Custom Templates

### Creating Templates

Templates use Handlebars for variable substitution:

```handlebars
{{!-- package.json.hbs --}}
{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "author": "{{author}}",
  {{#if hasTypescript}}
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  {{/if}}
  "scripts": {
    {{#each scripts}}
    "{{@key}}": "{{this}}"{{#unless @last}},{{/unless}}
    {{/each}}
  }
}
```

### Template Structure

```
templates/custom/
├── template.json           # Template configuration
├── README.md.hbs          # Documentation template
├── package.json.hbs       # Package configuration template
├── src/
│   ├── index.ts.hbs       # Main entry point template
│   └── components/
│       └── Component.tsx.hbs
└── .github/
    └── workflows/
        └── ci.yml.hbs     # CI/CD template
```

### Template Variables

Available variables in templates:

```typescript
interface TemplateVariables {
  // Basic info
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  
  // Computed values
  pascalCaseName: string;    // MyModule
  camelCaseName: string;     // myModule
  kebabCaseName: string;     // my-module
  constantCaseName: string;  // MY_MODULE
  
  // Features
  hasTypescript: boolean;
  hasReact: boolean;
  hasTailwind: boolean;
  // ... more features
  
  // GitHub
  githubOwner: string;
  repositoryUrl: string;
  
  // Dates
  currentYear: number;
  currentDate: string;
}
```

## 🤝 Contributing

### Development Setup

```bash
# Clone repository
git clone https://github.com/plataforma/repo-generator.git
cd repo-generator

# Install dependencies
npm install

# Build package
npm run build

# Run tests
npm test

# Start development
npm run dev
```

### Adding New Templates

1. Create template directory: `templates/my-template/`
2. Add `template.json` configuration
3. Create Handlebars templates (`.hbs` files)
4. Add template validation tests
5. Update documentation

### Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test CLI commands
npm run build && node dist/cli/index.js create test-module --dry-run
```

## 📚 Examples

### Example 1: E-commerce Dashboard

```bash
plataforma-repo create ecommerce-dashboard \\
  --template business \\
  --description "E-commerce analytics and management dashboard" \\
  --display-name "E-commerce Dashboard" \\
  --topics ecommerce,analytics,dashboard,react \\
  --with-storybook
```

**Generated features:**
- React dashboard with data visualization
- API integration for e-commerce data
- Real-time updates with WebSocket
- Form handling for product management
- TypeScript types for e-commerce entities

### Example 2: Authentication System

```bash
plataforma-repo create auth-service \\
  --template system \\
  --private \\
  --description "Enterprise authentication and authorization service" \\
  --display-name "Auth Service" \\
  --topics auth,security,jwt,oauth
```

**Generated features:**
- JWT token management
- OAuth 2.0 integration
- Role-based access control
- Security middleware
- Database integration

### Example 3: UI Component Library

```bash
plataforma-repo create design-tokens \\
  --template ui \\
  --description "Design tokens and UI components library" \\
  --display-name "Design Tokens" \\
  --with-storybook \\
  --topics design-system,components,tokens
```

**Generated features:**
- Storybook documentation
- Design token definitions
- Reusable React components
- Theme provider
- Component testing

## 🔍 Troubleshooting

### Common Issues

#### GitHub Authentication Failed

```bash
Error: GitHub authentication failed: Bad credentials
```

**Solution:**
1. Check your GitHub token is valid
2. Verify token has required permissions: `repo`, `read:org`, `admin:repo_hook`
3. Set token in environment: `export GITHUB_TOKEN=your_token`

#### Repository Already Exists

```bash
Error: Repository myorg/my-module already exists
```

**Solutions:**
- Use `--force` to override existing repository
- Choose a different repository name
- Delete the existing repository first

#### Template Not Found

```bash
Error: Template 'custom' not found
```

**Solutions:**
- Check available templates: `plataforma-repo templates`
- Verify template path exists
- Use built-in templates: `business`, `system`, `plugin`, `ui`

#### Build Failures

If generated repository builds fail:

1. Check Node.js version compatibility
2. Verify all dependencies are installed: `npm install`
3. Check TypeScript configuration: `npm run typecheck`
4. Review build logs for specific errors

### Debug Mode

Enable verbose logging:

```bash
DEBUG=plataforma:* plataforma-repo create my-module
```

### Getting Help

- 📖 [Documentation](https://docs.plataforma.app/repo-generator)
- 🐛 [Report Issues](https://github.com/plataforma/repo-generator/issues)
- 💬 [Community Discussions](https://github.com/plataforma/repo-generator/discussions)
- 📧 [Email Support](mailto:support@plataforma.app)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- **Plataforma.app Team** - *Initial work* - [GitHub](https://github.com/plataforma)

## 🙏 Acknowledgments

- Built with [Octokit](https://github.com/octokit/octokit.js) for GitHub API
- Powered by [Handlebars](https://handlebarsjs.com/) for templating
- CLI built with [Commander.js](https://github.com/tj/commander.js)
- Styled with [Chalk](https://github.com/chalk/chalk) for beautiful terminal output

---

Made with ❤️ by [Plataforma.app Team](https://plataforma.app) - Accelerating module development since 2024