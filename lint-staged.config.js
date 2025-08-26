/**
 * Lint-staged configuration
 * Runs linters on staged files before commit
 */

const path = require('path');

module.exports = {
  // TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    () => 'tsc --noEmit', // Type checking
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'markdownlint --fix',
  ],
  
  // YAML files
  '*.{yml,yaml}': [
    'prettier --write',
    'yamllint',
  ],
  
  // CSS and styling files
  '*.{css,scss,sass,less}': [
    'prettier --write',
    'stylelint --fix',
  ],
  
  // Package.json files (run package validation)
  'package.json': [
    'prettier --write',
    // Custom package.json validation
    (filenames) => {
      const commands = filenames.map(filename => {
        const dir = path.dirname(filename);
        return `cd ${dir} && npm pkg fix`;
      });
      return commands;
    },
  ],
  
  // Lockfiles (don't format, just validate)
  'package-lock.json': [
    (filenames) => {
      const commands = filenames.map(filename => {
        const dir = path.dirname(filename);
        return `cd ${dir} && npm ci --dry-run`;
      });
      return commands;
    },
  ],
  
  // Config files
  '*.config.{js,ts}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // Test files (additional test linting)
  '*.{test,spec}.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    // Run specific tests for changed test files
    (filenames) => {
      const testFiles = filenames.join(' ');
      return `npm test -- --testPathPattern="${testFiles}" --passWithNoTests`;
    },
  ],
  
  // Docker files
  'Dockerfile*': [
    'dockerfilelint',
  ],
  
  // Shell scripts
  '*.sh': [
    'shellcheck',
    'shfmt -w',
  ],
  
  // Environment files (security check)
  '.env*': [
    // Check for potential secrets in env files
    (filenames) => {
      const commands = filenames.map(filename => {
        // Use a simple grep to check for potential secrets
        return `grep -E "(password|secret|key|token)" ${filename} && echo "⚠️  Potential secrets detected in ${filename}" || true`;
      });
      return commands;
    },
  ],
  
  // SVG files (optimize)
  '*.svg': [
    'svgo --pretty',
  ],
  
  // Image files (basic checks)
  '*.{png,jpg,jpeg,gif,webp}': [
    // Check image sizes
    (filenames) => {
      const commands = filenames.map(filename => {
        return `identify ${filename} | awk '{print $1 ": " $3}' | grep -E ":[0-9]{4,}x|:x[0-9]{4,}" && echo "⚠️  Large image detected: ${filename}" || true`;
      });
      return commands;
    },
  ],
  
  // Specific file patterns for packages
  'packages/*/package.json': [
    'prettier --write',
    // Validate package structure
    (filenames) => {
      const commands = filenames.map(filename => {
        const packageDir = path.dirname(filename);
        return [
          `cd ${packageDir}`,
          '&&',
          'node -e "const pkg = require(\'./package.json\'); if (!pkg.name || !pkg.version || !pkg.main) { console.error(\'Invalid package.json\'); process.exit(1); }"',
        ].join(' ');
      });
      return commands;
    },
  ],
  
  // GitHub workflow files
  '.github/workflows/*.{yml,yaml}': [
    'prettier --write',
    // Validate GitHub Actions syntax
    (filenames) => {
      const commands = filenames.map(filename => {
        return `yamllint ${filename}`;
      });
      return commands;
    },
  ],
  
  // Security-sensitive files
  '*.{key,pem,p12,pfx}': [
    // Prevent committing of key files
    () => {
      console.error('🚨 Attempted to commit private key files!');
      process.exit(1);
    },
  ],
};