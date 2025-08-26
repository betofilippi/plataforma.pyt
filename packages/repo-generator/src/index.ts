// @plataforma/repo-generator - Repository Generator for Plataforma.app modules
// Automatically creates and configures GitHub repositories

export * from './types';
export * from './github';
export * from './config';
export * from './templates';

// CLI exports
export { createRepository } from './cli/commands/create-repo';
export { listTemplates } from './cli/commands/list-templates';
export { validateTemplate } from './cli/commands/validate-template';
export { setupGitHub } from './cli/commands/setup-github';

// Core classes
export { GitHubService, createGitHubService } from './github';
export { ConfigManager } from './config';
export { TemplateEngine } from './templates';

// Version
export const version = '1.0.0';