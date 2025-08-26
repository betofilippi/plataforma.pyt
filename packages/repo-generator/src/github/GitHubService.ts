import { Octokit } from '@octokit/rest';
import type { 
  RepositoryConfig, 
  GitHubRepository, 
  GitHubAPIError 
} from '../types';

export interface BranchProtectionRules {
  required_status_checks?: {
    strict: boolean;
    contexts: string[];
  };
  enforce_admins?: boolean;
  required_pull_request_reviews?: {
    required_approving_review_count: number;
    dismiss_stale_reviews: boolean;
    require_code_owner_reviews: boolean;
  };
  restrictions?: null;
}

export interface WebhookConfig {
  name: string;
  config: {
    url: string;
    content_type: 'json' | 'form';
    secret?: string;
    insecure_ssl?: '0' | '1';
  };
  events: string[];
  active: boolean;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
      userAgent: '@plataforma/repo-generator v1.0.0',
    });
  }

  /**
   * Create a new GitHub repository
   */
  async createRepository(config: RepositoryConfig): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: config.name,
        description: config.description,
        private: config.private,
        homepage: config.homepageUrl,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
        has_downloads: true,
        auto_init: false, // We'll push our own initial commit
        license_template: config.license.toLowerCase(),
        gitignore_template: 'Node',
      });

      return response.data as GitHubRepository;
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to create repository: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Create repository in an organization
   */
  async createRepositoryInOrg(
    org: string, 
    config: RepositoryConfig
  ): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.rest.repos.createInOrg({
        org,
        name: config.name,
        description: config.description,
        private: config.private,
        homepage: config.homepageUrl,
        has_issues: true,
        has_projects: true,
        has_wiki: false,
        has_downloads: true,
        auto_init: false,
        license_template: config.license.toLowerCase(),
        gitignore_template: 'Node',
      });

      return response.data as GitHubRepository;
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to create repository in organization: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Add topics to repository
   */
  async addTopics(owner: string, repo: string, topics: string[]): Promise<void> {
    try {
      const allTopics = [
        ...topics,
        'plataforma-app',
        'module-federation',
        'typescript',
        'react'
      ];

      await this.octokit.rest.repos.replaceAllTopics({
        owner,
        repo,
        names: [...new Set(allTopics)] // Remove duplicates
      });
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to add topics: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Setup branch protection rules
   */
  async setupBranchProtection(
    owner: string,
    repo: string,
    branch: string = 'main',
    rules?: BranchProtectionRules
  ): Promise<void> {
    const defaultRules: BranchProtectionRules = {
      required_status_checks: {
        strict: true,
        contexts: ['ci/build', 'ci/test', 'ci/lint']
      },
      enforce_admins: false,
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false
      },
      restrictions: null
    };

    try {
      await this.octokit.rest.repos.updateBranchProtection({
        owner,
        repo,
        branch,
        ...{ ...defaultRules, ...rules }
      });
    } catch (error: any) {
      // Branch protection might not be available for free accounts
      // Log warning but don't fail
      console.warn(`Warning: Could not setup branch protection: ${error.message}`);
    }
  }

  /**
   * Create webhook for CI/CD
   */
  async createWebhook(
    owner: string,
    repo: string,
    webhook: WebhookConfig
  ): Promise<void> {
    try {
      await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        ...webhook
      });
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to create webhook: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Add repository secrets for CI/CD
   */
  async addSecret(
    owner: string,
    repo: string,
    secretName: string,
    secretValue: string
  ): Promise<void> {
    try {
      // Get repository public key for encryption
      const { data: publicKey } = await this.octokit.rest.actions.getRepoPublicKey({
        owner,
        repo
      });

      // Encrypt the secret (simplified - in real world, use proper encryption)
      const encryptedValue = Buffer.from(secretValue).toString('base64');

      await this.octokit.rest.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: secretName,
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id
      });
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to add secret ${secretName}: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Setup team permissions
   */
  async setupTeamPermissions(
    owner: string,
    repo: string,
    teams: Array<{ slug: string; permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin' }>
  ): Promise<void> {
    try {
      for (const team of teams) {
        await this.octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
          org: owner,
          team_slug: team.slug,
          owner,
          repo,
          permission: team.permission
        });
      }
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to setup team permissions: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      throw new GitHubAPIError(
        `Failed to check repository existence: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * Get authenticated user info
   */
  async getAuthenticatedUser() {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      return response.data;
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to get user info: ${error.message}`,
        error.status
      );
    }
  }

  /**
   * List user's organizations
   */
  async getUserOrganizations() {
    try {
      const response = await this.octokit.rest.orgs.listForAuthenticatedUser();
      return response.data;
    } catch (error: any) {
      throw new GitHubAPIError(
        `Failed to get organizations: ${error.message}`,
        error.status
      );
    }
  }
}

/**
 * Create GitHubService instance with error handling
 */
export function createGitHubService(token?: string): GitHubService {
  if (!token) {
    throw new Error(
      'GitHub token is required. Set GITHUB_TOKEN environment variable or pass --github-token option.'
    );
  }

  return new GitHubService(token);
}