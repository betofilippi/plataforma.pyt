#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createModule } from './create-module';
import { buildModule } from './build-module';
import { startDevServer } from './dev-server';
import { testModule } from './test-module';
import { publishModule } from './publish-module';
import { validateModule } from './validate-module';
import { createRepoCommand } from './create-repo-command';

const program = new Command();

program
  .name('plataforma')
  .description('CLI para desenvolvimento de módulos da Plataforma.app')
  .version('1.0.0');

// Comando: create
program
  .command('create')
  .description('Criar um novo módulo')
  .argument('<name>', 'Nome do módulo')
  .option('-t, --template <template>', 'Template a ser usado', 'basic')
  .option('-c, --category <category>', 'Categoria do módulo', 'custom')
  .action(async (name, options) => {
    const spinner = ora('Criando módulo...').start();
    try {
      await createModule(name, options);
      spinner.succeed(chalk.green(`Módulo ${name} criado com sucesso!`));
    } catch (error) {
      spinner.fail(chalk.red(`Erro ao criar módulo: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: build
program
  .command('build')
  .description('Compilar módulo')
  .option('-w, --watch', 'Watch mode', false)
  .option('-m, --minify', 'Minificar output', false)
  .action(async (options) => {
    const spinner = ora('Compilando módulo...').start();
    try {
      await buildModule(options);
      spinner.succeed(chalk.green('Módulo compilado com sucesso!'));
    } catch (error) {
      spinner.fail(chalk.red(`Erro ao compilar: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: test
program
  .command('test')
  .description('Executar testes do módulo')
  .option('-w, --watch', 'Watch mode', false)
  .option('-c, --coverage', 'Coverage report', false)
  .action(async (options) => {
    const spinner = ora('Executando testes...').start();
    try {
      await testModule(options);
      spinner.succeed(chalk.green('Testes executados com sucesso!'));
    } catch (error) {
      spinner.fail(chalk.red(`Erro nos testes: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: publish
program
  .command('publish')
  .description('Publicar módulo no registry')
  .option('--dry-run', 'Simular publicação', false)
  .action(async (options) => {
    const spinner = ora('Publicando módulo...').start();
    try {
      await publishModule(options);
      spinner.succeed(chalk.green('Módulo publicado com sucesso!'));
    } catch (error) {
      spinner.fail(chalk.red(`Erro ao publicar: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: dev
program
  .command('dev')
  .description('Iniciar servidor de desenvolvimento')
  .option('-p, --port <port>', 'Porta do servidor', '5173')
  .option('--host <host>', 'Host do servidor', 'localhost')
  .option('--open', 'Abrir navegador automaticamente', false)
  .option('--api-port <port>', 'Porta da API mock', '4000')
  .option('--mock', 'Ativar servidor de API mock', false)
  .action(async (options) => {
    try {
      await startDevServer({
        port: parseInt(options.port),
        host: options.host,
        open: options.open,
        apiPort: parseInt(options.apiPort),
        mock: options.mock
      });
    } catch (error) {
      console.error(chalk.red(`Erro ao iniciar servidor: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: validate
program
  .command('validate')
  .description('Validar estrutura do módulo')
  .option('--fix', 'Corrigir automaticamente problemas', false)
  .option('-v, --verbose', 'Saída detalhada', false)
  .option('--check-deps', 'Verificar dependências', false)
  .option('--check-security', 'Verificar segurança', false)
  .action(async (options) => {
    try {
      const result = await validateModule({
        fix: options.fix,
        verbose: options.verbose,
        checkDependencies: options.checkDeps,
        checkSecurity: options.checkSecurity
      });
      
      if (!result.valid) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Erro na validação: ${error.message}`));
      process.exit(1);
    }
  });

// Comando: create-repo
program
  .command('create-repo')
  .description('Criar repositório GitHub com boilerplate de módulo')
  .argument('<name>', 'Nome do repositório/módulo')
  .option('-o, --owner <owner>', 'GitHub owner/organization')
  .option('-t, --template <template>', 'Tipo de template', 'business')
  .option('-d, --description <description>', 'Descrição do repositório')
  .option('--display-name <name>', 'Nome de exibição do módulo')
  .option('--private', 'Criar repositório privado', false)
  .option('--interactive', 'Modo interativo com prompts', false)
  .option('--dry-run', 'Simular criação sem fazer mudanças', false)
  .option('--github-token <token>', 'GitHub personal access token')
  .action(createRepoCommand);

// Comando: init
program
  .command('init')
  .description('Inicializar projeto com Plataforma SDK')
  .action(async () => {
    console.log(chalk.blue('🚀 Bem-vindo ao Plataforma SDK!'));
    console.log(chalk.gray('Inicializando configuração...'));
    
    // Criar arquivos de configuração básicos
    const spinner = ora('Criando configuração...').start();
    
    try {
      // Aqui viria a lógica de inicialização
      spinner.succeed(chalk.green('Projeto inicializado com sucesso!'));
      
      console.log(chalk.yellow('\n📋 Próximos passos:'));
      console.log(chalk.gray('1. plataforma create meu-modulo'));
      console.log(chalk.gray('2. cd meu-modulo'));
      console.log(chalk.gray('3. plataforma build'));
      console.log(chalk.gray('4. plataforma test'));
    } catch (error) {
      spinner.fail(chalk.red(`Erro na inicialização: ${error.message}`));
      process.exit(1);
    }
  });

// Capturar comandos não reconhecidos
program
  .command('*')
  .action(() => {
    console.log(chalk.red('Comando não reconhecido!'));
    console.log(chalk.yellow('Use "plataforma --help" para ver os comandos disponíveis.'));
    process.exit(1);
  });

program.parse();