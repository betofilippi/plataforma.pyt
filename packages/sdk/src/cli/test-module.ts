import { execSync, spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadModuleConfig } from '../utils/config-loader';

export interface TestModuleOptions {
  watch?: boolean;
  coverage?: boolean;
  verbose?: boolean;
  testPattern?: string;
  bail?: boolean;
  updateSnapshots?: boolean;
}

export async function testModule(options: TestModuleOptions = {}) {
  const cwd = process.cwd();
  
  // Load module configuration
  const config = await loadModuleConfig(cwd);
  if (!config) {
    throw new Error('module.json not found. Are you in a valid module directory?');
  }

  console.log(chalk.blue(`🧪 Running tests for module "${config.name}"...`));

  // Check if test configuration exists
  const jestConfigPath = path.join(cwd, 'jest.config.js');
  const packageJsonPath = path.join(cwd, 'package.json');
  
  let hasJestConfig = false;
  
  if (await fs.pathExists(jestConfigPath)) {
    hasJestConfig = true;
  } else if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    hasJestConfig = !!packageJson.jest;
  }

  if (!hasJestConfig) {
    console.log(chalk.yellow('⚠️  No Jest configuration found. Creating default configuration...'));
    await createDefaultJestConfig(cwd);
  }

  // Build Jest command
  const jestArgs = ['jest'];
  
  if (options.watch) {
    jestArgs.push('--watch');
  }
  
  if (options.coverage) {
    jestArgs.push('--coverage');
  }
  
  if (options.verbose) {
    jestArgs.push('--verbose');
  }
  
  if (options.bail) {
    jestArgs.push('--bail');
  }
  
  if (options.updateSnapshots) {
    jestArgs.push('--updateSnapshot');
  }
  
  if (options.testPattern) {
    jestArgs.push('--testPathPattern', options.testPattern);
  }

  try {
    // Check if jest is installed
    try {
      execSync('npx jest --version', { cwd, stdio: 'ignore' });
    } catch {
      console.log(chalk.yellow('📦 Installing Jest and testing dependencies...'));
      await installTestDependencies(cwd);
    }

    // Run tests
    const jestProcess = spawn('npx', jestArgs, {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    return new Promise((resolve, reject) => {
      jestProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('\n✅ All tests passed!'));
          resolve(code);
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      jestProcess.on('error', (error) => {
        reject(new Error(`Failed to run tests: ${error.message}`));
      });
    });

  } catch (error) {
    throw new Error(`Test execution failed: ${error.message}`);
  }
}

async function createDefaultJestConfig(cwd: string) {
  const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],
  transform: {
    '^.+\\\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testTimeout: 10000,
  verbose: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
`;

  await fs.writeFile(path.join(cwd, 'jest.config.js'), jestConfig);

  // Create setup file
  const setupTests = `import '@testing-library/jest-dom';

// Mock window methods
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
`;

  await fs.writeFile(path.join(cwd, 'src/setupTests.ts'), setupTests);

  // Create sample test file
  const sampleTest = `import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';

// Example test - replace with your actual component tests
describe('Module Tests', () => {
  it('should run basic test', () => {
    expect(true).toBe(true);
  });

  // Add more tests here
});
`;

  await fs.ensureDir(path.join(cwd, 'src/__tests__'));
  await fs.writeFile(path.join(cwd, 'src/__tests__/index.test.ts'), sampleTest);

  console.log(chalk.green('✅ Default Jest configuration created!'));
}

async function installTestDependencies(cwd: string) {
  const testDependencies = [
    'jest',
    'ts-jest',
    '@types/jest',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    'identity-obj-proxy'
  ];

  const installCommand = `npm install --save-dev ${testDependencies.join(' ')}`;
  
  try {
    execSync(installCommand, { cwd, stdio: 'inherit' });
    console.log(chalk.green('✅ Test dependencies installed!'));
  } catch (error) {
    throw new Error(`Failed to install test dependencies: ${error.message}`);
  }
}

export async function runSingleTest(testFile: string, options: TestModuleOptions = {}) {
  const cwd = process.cwd();
  
  console.log(chalk.blue(`🧪 Running single test: ${testFile}`));
  
  const jestArgs = ['jest', testFile];
  
  if (options.verbose) {
    jestArgs.push('--verbose');
  }

  try {
    execSync(`npx ${jestArgs.join(' ')}`, { 
      cwd, 
      stdio: 'inherit' 
    });
    console.log(chalk.green(`✅ Test ${testFile} passed!`));
  } catch (error) {
    throw new Error(`Test ${testFile} failed`);
  }
}

export async function generateTestTemplate(componentName: string, cwd: string = process.cwd()) {
  const testTemplate = `import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ${componentName} from '../components/${componentName}';

describe('${componentName}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<${componentName} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    render(<${componentName} />);
    // Add interaction tests here
  });

  it('should display correct data', () => {
    const mockData = { /* mock data */ };
    render(<${componentName} data={mockData} />);
    // Add data display tests here
  });

  // Add more specific tests for your component
});
`;

  const testDir = path.join(cwd, 'src/__tests__');
  await fs.ensureDir(testDir);
  
  const testFile = path.join(testDir, `${componentName}.test.tsx`);
  await fs.writeFile(testFile, testTemplate);
  
  console.log(chalk.green(`✅ Test template created: ${testFile}`));
  return testFile;
}