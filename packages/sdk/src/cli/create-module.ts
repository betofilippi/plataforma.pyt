import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { renderTemplate } from '../utils/template-renderer';
import { validateModuleName } from '../utils/validator';
import { ModuleTemplate, ModuleConfig } from '../types';

export interface CreateModuleOptions {
  template?: string;
  category?: string;
  interactive?: boolean;
}

export async function createModule(name: string, options: CreateModuleOptions = {}) {
  // Validate module name
  const validation = validateModuleName(name);
  if (!validation.isValid) {
    throw new Error(`Invalid module name: ${validation.errors.join(', ')}`);
  }

  const moduleName = name;
  const moduleDir = path.join(process.cwd(), moduleName);

  // Check if directory already exists
  if (await fs.pathExists(moduleDir)) {
    throw new Error(`Directory ${moduleName} already exists`);
  }

  let config: ModuleConfig;

  if (options.interactive !== false) {
    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'template',
        message: 'Escolha o template do módulo:',
        choices: [
          { name: 'Básico - Módulo simples sem banco de dados', value: 'basic' },
          { name: 'Avançado - Módulo com banco de dados integrado', value: 'advanced' },
          { name: 'IA - Módulo com componentes de inteligência artificial', value: 'ai-powered' },
          { name: 'Customizado - Configuração manual', value: 'custom' }
        ],
        default: options.template || 'basic'
      },
      {
        type: 'input',
        name: 'displayName',
        message: 'Nome de exibição do módulo:',
        default: moduleName.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ')
      },
      {
        type: 'input',
        name: 'description',
        message: 'Descrição do módulo:',
        default: `Módulo ${moduleName} para plataforma.app`
      },
      {
        type: 'list',
        name: 'category',
        message: 'Categoria do módulo:',
        choices: [
          'administrativo',
          'financeiro',
          'vendas',
          'estoque',
          'rh',
          'inteligencia-artificial',
          'sistema',
          'custom'
        ],
        default: options.category || 'custom'
      },
      {
        type: 'confirm',
        name: 'hasDatabase',
        message: 'O módulo precisa de banco de dados?',
        default: false,
        when: (answers) => answers.template === 'custom'
      },
      {
        type: 'confirm',
        name: 'hasAI',
        message: 'O módulo terá componentes de IA?',
        default: false,
        when: (answers) => answers.template === 'custom'
      },
      {
        type: 'confirm',
        name: 'hasRealtime',
        message: 'O módulo precisa de funcionalidades em tempo real?',
        default: false,
        when: (answers) => answers.template === 'advanced' || answers.template === 'custom'
      }
    ]);

    config = {
      name: moduleName,
      displayName: answers.displayName,
      description: answers.description,
      category: answers.category,
      template: answers.template,
      version: '1.0.0',
      features: {
        database: answers.hasDatabase || answers.template === 'advanced',
        ai: answers.hasAI || answers.template === 'ai-powered',
        realtime: answers.hasRealtime || false,
        windowSystem: true
      }
    };
  } else {
    // Non-interactive mode
    config = {
      name: moduleName,
      displayName: moduleName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      description: `Módulo ${moduleName} para plataforma.app`,
      category: options.category || 'custom',
      template: options.template || 'basic',
      version: '1.0.0',
      features: {
        database: options.template === 'advanced',
        ai: options.template === 'ai-powered',
        realtime: false,
        windowSystem: true
      }
    };
  }

  // Create module directory
  await fs.ensureDir(moduleDir);

  // Generate files from template
  await renderTemplate(config.template, moduleDir, config);

  // Initialize git repository
  try {
    execSync('git init', { cwd: moduleDir, stdio: 'ignore' });
    execSync('git add .', { cwd: moduleDir, stdio: 'ignore' });
    execSync('git commit -m "feat: initial module structure"', { 
      cwd: moduleDir, 
      stdio: 'ignore' 
    });
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not initialize git repository'));
  }

  // Install dependencies
  console.log(chalk.blue('\n📦 Instalando dependências...'));
  try {
    execSync('npm install', { cwd: moduleDir, stdio: 'inherit' });
  } catch (error) {
    console.warn(chalk.yellow('Warning: Could not install dependencies automatically'));
    console.log(chalk.gray('Run "npm install" manually in the module directory'));
  }

  // Success message with next steps
  console.log(chalk.green(`\n✅ Módulo ${moduleName} criado com sucesso!`));
  console.log(chalk.blue('\n📋 Próximos passos:'));
  console.log(chalk.gray(`1. cd ${moduleName}`));
  console.log(chalk.gray('2. plataforma dev'));
  console.log(chalk.gray('3. plataforma build'));
  
  if (config.features.database) {
    console.log(chalk.yellow('\n💾 Banco de dados configurado!'));
    console.log(chalk.gray('- Arquivos de migração em /database'));
    console.log(chalk.gray('- Configure a conexão em .env'));
  }

  if (config.features.ai) {
    console.log(chalk.magenta('\n🤖 Componentes de IA incluídos!'));
    console.log(chalk.gray('- Templates em /src/components/ai'));
    console.log(chalk.gray('- Configure as APIs de IA em .env'));
  }

  return config;
}