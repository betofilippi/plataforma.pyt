/**
 * Commitlint configuration
 * Ensures consistent commit message format across the project
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  
  rules: {
    // Type case
    'type-case': [2, 'always', 'lower-case'],
    
    // Type empty
    'type-empty': [2, 'never'],
    
    // Type enum - allowed commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // A new feature
        'fix',      // A bug fix
        'docs',     // Documentation only changes
        'style',    // Changes that do not affect the meaning of the code
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'perf',     // A code change that improves performance
        'test',     // Adding missing tests or correcting existing tests
        'chore',    // Changes to the build process or auxiliary tools
        'ci',       // Changes to CI configuration files and scripts
        'build',    // Changes that affect the build system
        'revert',   // Reverts a previous commit
        'wip',      // Work in progress
        'hotfix',   // Critical hotfix
        'release',  // Release commit
      ],
    ],
    
    // Subject case
    'subject-case': [2, 'always', 'lower-case'],
    
    // Subject empty
    'subject-empty': [2, 'never'],
    
    // Subject full stop
    'subject-full-stop': [2, 'never', '.'],
    
    // Subject max length
    'subject-max-length': [2, 'always', 100],
    
    // Subject min length
    'subject-min-length': [2, 'always', 10],
    
    // Header max length
    'header-max-length': [2, 'always', 120],
    
    // Body leading blank line
    'body-leading-blank': [2, 'always'],
    
    // Body max line length
    'body-max-line-length': [2, 'always', 120],
    
    // Footer leading blank line
    'footer-leading-blank': [2, 'always'],
    
    // Footer max line length
    'footer-max-line-length': [2, 'always', 120],
  },
  
  // Custom rules for monorepo
  plugins: [
    {
      rules: {
        // Custom rule to check scope for monorepo packages
        'scope-enum': (parsed, when, value) => {
          const validScopes = [
            // Package scopes
            'types',
            'core-window-system',
            'design-system',
            'auth-system',
            'sdk',
            'module-registry',
            
            // Application scopes
            'client',
            'server',
            'shared',
            'api',
            'ui',
            'components',
            'hooks',
            'utils',
            'services',
            'database',
            'auth',
            'config',
            
            // Infrastructure scopes
            'ci',
            'cd',
            'docker',
            'deploy',
            'security',
            'performance',
            'monitoring',
            'testing',
            'build',
            
            // Documentation scopes
            'docs',
            'readme',
            'changelog',
            'examples',
            
            // Dependencies
            'deps',
            'deps-dev',
            
            // Release
            'release',
            'version',
          ];
          
          if (!parsed.scope) {
            // Allow commits without scope
            return [true];
          }
          
          if (validScopes.includes(parsed.scope)) {
            return [true];
          }
          
          return [
            false,
            `scope must be one of: ${validScopes.join(', ')}`,
          ];
        },
      },
    },
  ],
  
  // Custom configurations for different commit types
  extends: ['@commitlint/config-conventional'],
  
  // Prompt configuration for interactive commits
  prompt: {
    messages: {
      type: "Select the type of change that you're committing:",
      scope: 'What is the scope of this change (e.g. component or file name):',
      customScope: 'Denote the scope of this change:',
      subject: 'Write a short, imperative tense description of the change:',
      body: 'Provide a longer description of the change: (press enter to skip)',
      breaking: 'Are there any breaking changes?',
      breakingBody: 'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:',
      footer: 'List any ISSUES CLOSED by this change (optional). E.g.: #31, #34:',
      confirmCommit: 'Are you satisfied with this commit?',
    },
    
    types: [
      { value: 'feat', name: 'feat:     A new feature' },
      { value: 'fix', name: 'fix:      A bug fix' },
      { value: 'docs', name: 'docs:     Documentation only changes' },
      { value: 'style', name: 'style:    Changes that do not affect the meaning of the code' },
      { value: 'refactor', name: 'refactor: A code change that neither fixes a bug nor adds a feature' },
      { value: 'perf', name: 'perf:     A code change that improves performance' },
      { value: 'test', name: 'test:     Adding missing tests' },
      { value: 'chore', name: 'chore:    Changes to the build process or auxiliary tools' },
      { value: 'revert', name: 'revert:   Revert to a commit' },
      { value: 'wip', name: 'wip:      Work in progress' },
    ],
    
    useEmoji: false,
    emojiAlign: 'center',
    allowCustomScopes: true,
    allowEmptyScopes: true,
    customScopesAlign: 'bottom',
    customScopesAlias: 'custom',
    allowBreakingChanges: ['feat', 'fix'],
    breaklineNumber: 120,
    breaklineChar: '|',
    skipQuestions: [],
    issuePrefixes: [{ value: 'closed', name: 'closed:   ISSUES CLOSED by this change' }],
    customIssuePrefixAlign: 'top',
    emptyIssuePrefixAlias: 'skip',
    customIssuePrefixAlias: 'custom',
    allowCustomIssuePrefix: true,
    allowEmptyIssuePrefix: true,
    confirmColorize: true,
    maxHeaderLength: Infinity,
    maxSubjectLength: Infinity,
    minSubjectLength: 0,
    scopeOverrides: undefined,
    defaultBody: '',
    defaultIssues: '',
    defaultScope: '',
    defaultSubject: '',
  },
};