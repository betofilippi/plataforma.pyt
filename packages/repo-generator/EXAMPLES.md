# Repository Generator Examples

This document provides comprehensive examples of using the Plataforma Repository Generator for different types of modules and use cases.

## 📋 Table of Contents

- [Quick Examples](#quick-examples)
- [Business Modules](#business-modules)
- [System Modules](#system-modules)
- [Plugin Modules](#plugin-modules)
- [UI Modules](#ui-modules)
- [Advanced Configuration](#advanced-configuration)
- [CI/CD Examples](#cicd-examples)
- [Custom Templates](#custom-templates)
- [Integration Examples](#integration-examples)

## 🚀 Quick Examples

### Basic Repository Creation

```bash
# Simplest usage - creates a business module with defaults
plataforma-repo create my-app

# Interactive mode - guided setup
plataforma-repo create my-app --interactive

# Preview without creating
plataforma-repo create my-app --dry-run
```

### Common Options

```bash
# Specify template type
plataforma-repo create my-dashboard -t business

# Create in organization
plataforma-repo create my-module --owner mycompany

# Private repository
plataforma-repo create internal-tool --private

# Custom description
plataforma-repo create my-app -d "My awesome application"
```

## 💼 Business Modules

Business modules handle data, APIs, business logic, and user workflows.

### E-commerce Dashboard

```bash
plataforma-repo create ecommerce-dashboard \\
  --template business \\
  --description "Analytics and management dashboard for e-commerce operations" \\
  --display-name "E-commerce Dashboard" \\
  --owner mystore \\
  --topics ecommerce,analytics,dashboard,react,typescript \\
  --author "Store Dev Team" \\
  --license MIT
```

**Generated features:**
- React components for data visualization
- API integration utilities
- Form handling with validation
- Real-time data updates
- TypeScript interfaces for e-commerce entities
- Testing setup with mock data

### CRM System

```bash
plataforma-repo create customer-management \\
  --template business \\
  --description "Customer relationship management system with contact tracking and sales pipeline" \\
  --display-name "CRM System" \\
  --private \\
  --topics crm,sales,customers,pipeline \\
  --with-storybook
```

**Use case:** Customer data management, sales tracking, contact history.

### Inventory Manager

```bash
plataforma-repo create inventory-tracker \\
  --template business \\
  --description "Real-time inventory management with stock alerts and reporting" \\
  --display-name "Inventory Tracker" \\
  --topics inventory,stock,warehouse,reporting
```

**Use case:** Stock level monitoring, automated reordering, inventory analytics.

### Financial Reporting

```bash
plataforma-repo create financial-reports \\
  --template business \\
  --description "Financial reporting and analytics with customizable dashboards" \\
  --display-name "Financial Reports" \\
  --private \\
  --topics finance,reporting,analytics,charts
```

**Use case:** P&L statements, budget tracking, financial KPIs.

## ⚙️ System Modules

System modules provide core functionality, infrastructure, and platform services.

### Authentication Service

```bash
plataforma-repo create auth-service \\
  --template system \\
  --description "Enterprise authentication and authorization service with JWT and OAuth 2.0" \\
  --display-name "Authentication Service" \\
  --owner platform-team \\
  --private \\
  --topics auth,security,jwt,oauth,rbac \\
  --license Apache-2.0
```

**Generated features:**
- JWT token management
- OAuth 2.0 integration
- Role-based access control (RBAC)
- Security middleware
- User session management
- Password policies and encryption

### Logging Service

```bash
plataforma-repo create central-logging \\
  --template system \\
  --description "Centralized logging service with structured logging and search capabilities" \\
  --display-name "Central Logging" \\
  --topics logging,monitoring,observability,elasticsearch \\
  --no-react  # Server-only module
```

**Use case:** Application logs, error tracking, performance monitoring.

### Configuration Manager

```bash
plataforma-repo create config-service \\
  --template system \\
  --description "Dynamic configuration management with environment-specific settings" \\
  --display-name "Configuration Service" \\
  --topics config,environment,settings,vault
```

**Use case:** Feature flags, environment variables, secret management.

### Message Queue

```bash
plataforma-repo create message-broker \\
  --template system \\
  --description "Message queuing system for asynchronous communication between services" \\
  --display-name "Message Broker" \\
  --topics messaging,queue,async,microservices
```

**Use case:** Event-driven architecture, job processing, service communication.

## 🔌 Plugin Modules

Plugin modules extend functionality and integrate with external services.

### Payment Gateway

```bash
plataforma-repo create payment-gateway \\
  --template plugin \\
  --description "Multi-provider payment processing plugin with support for Stripe, PayPal, and more" \\
  --display-name "Payment Gateway" \\
  --topics payments,stripe,paypal,gateway,transactions \\
  --author "Payments Team"
```

**Generated features:**
- Pluggable architecture for multiple providers
- Webhook handling
- Transaction management
- Error handling and retries
- Configuration interface

### Email Service

```bash
plataforma-repo create email-service \\
  --template plugin \\
  --description "Email service plugin with template support and delivery tracking" \\
  --display-name "Email Service" \\
  --topics email,smtp,templates,notifications,sendgrid
```

**Use case:** Transactional emails, marketing campaigns, notification delivery.

### File Storage

```bash
plataforma-repo create file-storage \\
  --template plugin \\
  --description "Multi-cloud file storage plugin supporting AWS S3, Google Cloud, and local storage" \\
  --display-name "File Storage" \\
  --topics storage,aws,gcp,s3,cloud,upload
```

**Use case:** File uploads, document storage, image processing.

### Search Integration

```bash
plataforma-repo create search-plugin \\
  --template plugin \\
  --description "Full-text search integration with Elasticsearch and Algolia support" \\
  --display-name "Search Plugin" \\
  --topics search,elasticsearch,algolia,indexing,full-text
```

**Use case:** Product search, document search, real-time suggestions.

## 🎨 UI Modules

UI modules provide reusable components, design systems, and user interfaces.

### Design System

```bash
plataforma-repo create design-system \\
  --template ui \\
  --description "Comprehensive design system with tokens, components, and guidelines" \\
  --display-name "Design System" \\
  --with-storybook \\
  --topics design-system,components,tokens,storybook,ui-kit \\
  --author "Design Team"
```

**Generated features:**
- Storybook documentation
- Design token definitions
- Reusable React components
- Theme provider
- Accessibility guidelines
- Component testing

### Chart Library

```bash
plataforma-repo create chart-components \\
  --template ui \\
  --description "Interactive chart components built with D3.js and React" \\
  --display-name "Chart Components" \\
  --with-storybook \\
  --topics charts,d3,visualization,react,components
```

**Use case:** Data visualization, dashboards, reporting interfaces.

### Form Builder

```bash
plataforma-repo create form-builder \\
  --template ui \\
  --description "Dynamic form builder with drag-and-drop interface and validation" \\
  --display-name "Form Builder" \\
  --with-storybook \\
  --topics forms,builder,validation,drag-drop,dynamic
```

**Use case:** Survey creation, application forms, data collection.

### Navigation Components

```bash
plataforma-repo create navigation-ui \\
  --template ui \\
  --description "Navigation components including sidebars, breadcrumbs, and menus" \\
  --display-name "Navigation UI" \\
  --with-storybook \\
  --topics navigation,sidebar,menu,breadcrumbs,ui
```

**Use case:** Application navigation, menu systems, breadcrumb trails.

## ⚙️ Advanced Configuration

### Custom Features Configuration

```bash
plataforma-repo create advanced-module \\
  --template business \\
  --description "Module with custom feature configuration" \\
  --display-name "Advanced Module" \\
  --no-docker \\              # Disable Docker
  --no-storybook \\           # Disable Storybook
  --node-version 20 \\        # Use Node.js 20
  --test-command "vitest" \\   # Custom test command
  --build-command "vite build --mode production"  # Custom build
```

### Multiple Topics and Metadata

```bash
plataforma-repo create social-media-app \\
  --template business \\
  --description "Social media management application with post scheduling and analytics" \\
  --display-name "Social Media Manager" \\
  --homepage "https://socialmedia.company.com" \\
  --topics social-media,scheduling,analytics,twitter,facebook,instagram,marketing \\
  --author "Marketing Tech Team <marketing-tech@company.com>" \\
  --license proprietary
```

### Organization Repository

```bash
plataforma-repo create internal-tooling \\
  --template system \\
  --owner company-org \\
  --description "Internal developer tooling and utilities" \\
  --display-name "Developer Tools" \\
  --private \\
  --license proprietary \\
  --topics internal,tools,developers,utilities
```

## 🚀 CI/CD Examples

### Production-Ready Pipeline

The generated repositories include comprehensive CI/CD pipelines. Here's what gets created:

#### Continuous Integration (`.github/workflows/ci.yml`)

- **Multi-Node Testing**: Tests across Node.js 18 and 20
- **Code Quality**: TypeScript checking, linting, testing
- **Security Scanning**: npm audit, Snyk vulnerability scanning
- **Docker Build**: Multi-stage container builds (if enabled)
- **Module Validation**: Plataforma module compliance checking

#### Automated Release (`.github/workflows/release.yml`)

- **Semantic Versioning**: Automated version bumping based on commit messages
- **Changelog Generation**: Automatic changelog from commit history
- **NPM Publishing**: Publish to npm registry
- **Docker Publishing**: Push to container registry
- **Module Registry**: Publish to Plataforma module registry
- **Deployment**: Staging and production deployment hooks

### Custom Deployment Targets

```bash
# Create module with custom deployment configuration
plataforma-repo create production-app \\
  --template business \\
  --description "Production application with custom deployment pipeline" \\
  --display-name "Production App" \\
  --topics production,deployment,k8s,aws
  
# The generated module will include:
# - Kubernetes deployment manifests
# - AWS deployment scripts
# - Environment-specific configurations
# - Health check endpoints
```

## 🛠️ Custom Templates

### Creating a Custom Template

1. **Create Template Directory Structure**

```bash
mkdir -p templates/ecommerce
cd templates/ecommerce
```

2. **Create Template Configuration**

```json
// templates/ecommerce/template.json
{
  "name": "ecommerce",
  "description": "E-commerce module with product catalog and cart functionality",
  "moduleType": "business",
  "features": [
    "TypeScript",
    "React",
    "Product Catalog",
    "Shopping Cart",
    "Payment Integration",
    "Inventory Tracking"
  ],
  "dependencies": {
    "@plataforma/core": "workspace:*",
    "@plataforma/design-system": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@stripe/stripe-js": "^2.0.0",
    "react-query": "^3.39.0"
  }
}
```

3. **Create Template Files**

```handlebars
{{!-- templates/ecommerce/src/components/ProductCatalog.tsx.hbs --}}
import React from 'react';
import { Product } from '../types';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onAddToCart
}) => {
  return (
    <div className="product-catalog">
      <h2>{{displayName}} - Product Catalog</h2>
      {products.map(product => (
        <div key={product.id} className="product-card">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <span>${product.price}</span>
          <button onClick={() => onAddToCart(product)}>
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
};
```

4. **Use Custom Template**

```bash
plataforma-repo create my-store \\
  --template ecommerce \\
  --description "Online store with product catalog" \\
  --display-name "My Store"
```

### Template Validation

```bash
# Validate your custom template
plataforma-repo validate templates/ecommerce --verbose

# Output:
# ✅ Template is valid!
# 📊 Summary:
#    Errors: 0
#    Warnings: 0
#    Status: Valid
```

## 🔗 Integration Examples

### Programmatic Usage

#### Basic Repository Creation

```typescript
import { createRepository } from '@plataforma/repo-generator';

async function createMyModule() {
  try {
    const result = await createRepository('my-analytics-dashboard', {
      template: 'business',
      owner: 'analytics-team',
      description: 'Real-time analytics dashboard with custom visualizations',
      displayName: 'Analytics Dashboard',
      private: false,
      features: {
        typescript: true,
        react: true,
        tailwind: true,
        docker: true,
        cicd: true,
        testing: true,
        storybook: true
      },
      githubToken: process.env.GITHUB_TOKEN
    });

    console.log(`✅ Repository created: ${result.repositoryUrl}`);
    console.log(`📂 Local path: ${result.localPath}`);
  } catch (error) {
    console.error('❌ Failed to create repository:', error.message);
  }
}

createMyModule();
```

#### Batch Repository Creation

```typescript
import { createRepository } from '@plataforma/repo-generator';

const modules = [
  {
    name: 'user-management',
    template: 'system',
    description: 'User management service with RBAC'
  },
  {
    name: 'payment-service',
    template: 'plugin',
    description: 'Payment processing plugin'
  },
  {
    name: 'ui-components',
    template: 'ui',
    description: 'Reusable UI components library'
  }
];

async function createModules() {
  for (const module of modules) {
    try {
      console.log(`Creating ${module.name}...`);
      const result = await createRepository(module.name, {
        template: module.template,
        description: module.description,
        owner: 'platform-team',
        githubToken: process.env.GITHUB_TOKEN
      });
      console.log(`✅ Created: ${result.repositoryUrl}`);
    } catch (error) {
      console.error(`❌ Failed to create ${module.name}:`, error.message);
    }
  }
}

createModules();
```

#### Custom Configuration Manager

```typescript
import { ConfigManager, GitHubService } from '@plataforma/repo-generator';

async function customSetup() {
  // Create GitHub service
  const github = new GitHubService(process.env.GITHUB_TOKEN!);
  
  // Create repository
  const repo = await github.createRepository({
    name: 'custom-module',
    description: 'Custom module with specific configuration',
    owner: 'my-org',
    private: false,
    // ... other config
  });

  // Setup configuration manager
  const configManager = new ConfigManager({
    config: {
      name: 'custom-module',
      description: 'Custom module',
      moduleType: 'business',
      // ... full config
    },
    templatePath: './templates/business',
    outputPath: './custom-module',
    repository: repo
  });

  // Generate custom package.json
  const packageJson = await configManager.generatePackageJson();
  
  // Generate TypeScript config
  const tsConfig = await configManager.generateTSConfig();
  
  // Generate module manifest
  const manifest = await configManager.generateModuleManifest();
  
  console.log('Configuration files generated successfully!');
}

customSetup();
```

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/create-modules.yml
name: Create Modules

on:
  workflow_dispatch:
    inputs:
      module_name:
        description: 'Module name'
        required: true
      template:
        description: 'Template type'
        required: true
        default: 'business'
        type: choice
        options:
          - business
          - system
          - plugin
          - ui

jobs:
  create-module:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install repo generator
        run: npm install -g @plataforma/repo-generator

      - name: Create repository
        run: |
          plataforma-repo create ${{ github.event.inputs.module_name }} \\
            --template ${{ github.event.inputs.template }} \\
            --owner ${{ github.repository_owner }} \\
            --description "Auto-generated ${{ github.event.inputs.template }} module" \\
            --github-token ${{ secrets.GITHUB_TOKEN }}
```

### Docker Integration

```dockerfile
# Dockerfile for development environment with repo generator
FROM node:18-alpine

# Install repo generator
RUN npm install -g @plataforma/repo-generator

# Set working directory
WORKDIR /workspace

# Copy configuration
COPY .plataforma-repo.json /root/.plataforma/repo-generator.json

# Set environment variables
ENV GITHUB_TOKEN=${GITHUB_TOKEN}

# Entry point
CMD ["sh"]
```

Use the development container:

```bash
# Build development image
docker build -t plataforma-dev .

# Run interactive development environment
docker run -it --rm \\
  -v $(pwd):/workspace \\
  -e GITHUB_TOKEN=$GITHUB_TOKEN \\
  plataforma-dev

# Inside container - create modules
plataforma-repo create my-module --template business
```

## 📚 Real-World Scenarios

### Scenario 1: Migrating Legacy Application

```bash
# Create modern replacement for legacy inventory system
plataforma-repo create inventory-v2 \\
  --template business \\
  --description "Modern inventory management system replacing legacy PHP application" \\
  --display-name "Inventory Management v2" \\
  --topics inventory,migration,modernization,react,typescript \\
  --private \\
  --owner inventory-team
```

### Scenario 2: Microservices Architecture

```bash
# Create multiple services for microservices architecture
plataforma-repo create user-service --template system --description "User management microservice"
plataforma-repo create order-service --template business --description "Order processing microservice"
plataforma-repo create notification-service --template plugin --description "Notification delivery service"
plataforma-repo create admin-ui --template ui --description "Administrative user interface"
```

### Scenario 3: Open Source Project

```bash
# Create open source component library
plataforma-repo create react-components \\
  --template ui \\
  --description "Open source React component library for data visualization" \\
  --display-name "React Data Viz Components" \\
  --with-storybook \\
  --license MIT \\
  --topics react,components,data-visualization,charts,open-source \\
  --homepage "https://components.example.com"
```

### Scenario 4: Internal Tools

```bash
# Create internal developer tools
plataforma-repo create dev-tools \\
  --template system \\
  --description "Internal developer productivity tools and utilities" \\
  --display-name "Developer Tools" \\
  --private \\
  --owner platform-engineering \\
  --topics internal,tools,productivity,cli,utilities \\
  --license proprietary
```

---

These examples demonstrate the flexibility and power of the Plataforma Repository Generator. Each generated repository comes with a complete development environment, CI/CD pipeline, and best practices built-in, allowing you to focus on building great modules rather than setting up infrastructure.

For more examples and advanced usage patterns, visit our [documentation](https://docs.plataforma.app/repo-generator) or check out the [community examples](https://github.com/plataforma/repo-generator/discussions).