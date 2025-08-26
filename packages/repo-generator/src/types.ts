import { z } from 'zod';

// Module Types
export const ModuleTypeSchema = z.enum(['business', 'system', 'plugin', 'ui']);
export type ModuleType = z.infer<typeof ModuleTypeSchema>;

// License Types
export const LicenseTypeSchema = z.enum(['MIT', 'Apache-2.0', 'GPL-3.0', 'proprietary']);
export type LicenseType = z.infer<typeof LicenseTypeSchema>;

// Repository Configuration Schema
export const RepositoryConfigSchema = z.object({
  name: z.string().min(1, 'Repository name is required'),
  description: z.string().min(1, 'Description is required'),
  moduleType: ModuleTypeSchema,
  category: z.string().optional(),
  private: z.boolean().default(false),
  license: LicenseTypeSchema.default('MIT'),
  
  // GitHub specific
  owner: z.string().min(1, 'GitHub owner/organization is required'),
  homepageUrl: z.string().url().optional(),
  topics: z.array(z.string()).default([]),
  
  // Module specific
  displayName: z.string().min(1, 'Display name is required'),
  version: z.string().default('1.0.0'),
  author: z.string().min(1, 'Author is required'),
  
  // Features
  features: z.object({
    typescript: z.boolean().default(true),
    react: z.boolean().default(true),
    tailwind: z.boolean().default(true),
    docker: z.boolean().default(true),
    cicd: z.boolean().default(true),
    testing: z.boolean().default(true),
    linting: z.boolean().default(true),
    moduleFederation: z.boolean().default(true),
    storybook: z.boolean().default(false)
  }).default({}),
  
  // CI/CD Configuration
  cicd: z.object({
    enableAutoRelease: z.boolean().default(true),
    nodeVersion: z.string().default('18'),
    testCommand: z.string().default('npm test'),
    buildCommand: z.string().default('npm run build'),
    publishRegistry: z.string().default('npm'),
    deploymentTargets: z.array(z.string()).default([])
  }).default({})
});

export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;

// Template Configuration
export const TemplateConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  moduleType: ModuleTypeSchema,
  features: z.array(z.string()),
  dependencies: z.record(z.string()),
  devDependencies: z.record(z.string()),
  scripts: z.record(z.string()),
  files: z.array(z.string())
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

// GitHub Repository Response
export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
}

// CLI Options
export interface CreateRepoOptions {
  template?: string;
  interactive?: boolean;
  dryRun?: boolean;
  skipGitInit?: boolean;
  skipInstall?: boolean;
  force?: boolean;
}

// Generation Context
export interface GenerationContext {
  config: RepositoryConfig;
  templatePath: string;
  outputPath: string;
  githubToken?: string;
  repository?: GitHubRepository;
}

// Template Variables
export interface TemplateVariables {
  // Basic info
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  license: string;
  
  // GitHub
  githubOwner: string;
  repositoryName: string;
  repositoryUrl: string;
  homepageUrl?: string;
  
  // Dates
  currentYear: number;
  currentDate: string;
  
  // Features
  hasTypescript: boolean;
  hasReact: boolean;
  hasTailwind: boolean;
  hasDocker: boolean;
  hasCicd: boolean;
  hasTesting: boolean;
  hasLinting: boolean;
  hasModuleFederation: boolean;
  hasStorybook: boolean;
  
  // Module specific
  moduleType: ModuleType;
  category?: string;
  
  // CI/CD
  nodeVersion: string;
  testCommand: string;
  buildCommand: string;
  publishRegistry: string;
  deploymentTargets: string[];
  
  // Dependencies (stringified JSON for templates)
  dependenciesJson: string;
  devDependenciesJson: string;
  scriptsJson: string;
  
  // Computed values
  pascalCaseName: string;
  camelCaseName: string;
  kebabCaseName: string;
  constantCaseName: string;
}

// Error Types
export class RepoGeneratorError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'RepoGeneratorError';
  }
}

export class GitHubAPIError extends RepoGeneratorError {
  constructor(message: string, public status?: number) {
    super(message, 'GITHUB_API_ERROR');
    this.name = 'GitHubAPIError';
  }
}

export class TemplateError extends RepoGeneratorError {
  constructor(message: string) {
    super(message, 'TEMPLATE_ERROR');
    this.name = 'TemplateError';
  }
}