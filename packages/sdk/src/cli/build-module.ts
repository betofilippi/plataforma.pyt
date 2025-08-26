import { build } from 'vite';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadModuleConfig } from '../utils/config-loader';
import { validateModuleStructure } from '../utils/validator';
import { generateManifest } from '../utils/manifest-generator';

export interface BuildModuleOptions {
  watch?: boolean;
  minify?: boolean;
  mode?: 'development' | 'production';
  outDir?: string;
  sourcemap?: boolean;
}

export async function buildModule(options: BuildModuleOptions = {}) {
  const cwd = process.cwd();
  
  // Load module configuration
  const config = await loadModuleConfig(cwd);
  if (!config) {
    throw new Error('module.json not found. Are you in a valid module directory?');
  }

  // Validate module structure
  const structureValidation = await validateModuleStructure(cwd);
  if (!structureValidation.isValid) {
    throw new Error(`Invalid module structure:\n${structureValidation.errors.join('\n')}`);
  }

  const outDir = options.outDir || 'dist';
  const mode = options.mode || 'production';

  console.log(chalk.blue(`🏗️  Building module "${config.name}" in ${mode} mode...`));

  // Clean output directory
  await fs.remove(path.join(cwd, outDir));

  // Generate module manifest
  await generateManifest(config, path.join(cwd, outDir));

  // Vite configuration
  const viteConfig = {
    root: cwd,
    mode,
    build: {
      outDir,
      minify: options.minify !== false ? 'esbuild' : false,
      sourcemap: options.sourcemap !== false,
      lib: {
        entry: path.join(cwd, 'src/index.ts'),
        name: config.name,
        fileName: (format: string) => `${config.name}.${format}.js`,
        formats: ['es', 'cjs']
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          '@plataforma/core-window-system',
          '@plataforma/design-system',
          '@plataforma/auth-system'
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@plataforma/core-window-system': 'PlataformaWindowSystem',
            '@plataforma/design-system': 'PlataformaDesignSystem',
            '@plataforma/auth-system': 'PlataformaAuthSystem'
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.join(cwd, 'src'),
        '@/components': path.join(cwd, 'src/components'),
        '@/utils': path.join(cwd, 'src/utils'),
        '@/types': path.join(cwd, 'src/types'),
        '@/services': path.join(cwd, 'src/services')
      }
    }
  };

  try {
    if (options.watch) {
      console.log(chalk.blue('👀 Watching for changes...'));
      const { createServer } = await import('vite');
      const server = await createServer({
        ...viteConfig,
        server: { port: 5173 }
      });
      await server.listen();
      console.log(chalk.green('Development server started at http://localhost:5173'));
    } else {
      await build(viteConfig);
      
      // Copy additional assets
      await copyAssets(cwd, path.join(cwd, outDir));
      
      // Generate types
      await generateTypes(cwd, outDir);
      
      console.log(chalk.green(`✅ Build completed! Output in /${outDir}`));
      
      // Display build info
      const stats = await getBuildStats(path.join(cwd, outDir));
      console.log(chalk.blue('\n📊 Build Statistics:'));
      console.log(chalk.gray(`   Size: ${stats.size}`));
      console.log(chalk.gray(`   Files: ${stats.fileCount}`));
      console.log(chalk.gray(`   Module: ${config.name} v${config.version}`));
    }
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

async function copyAssets(srcDir: string, outDir: string) {
  const assetsDir = path.join(srcDir, 'assets');
  if (await fs.pathExists(assetsDir)) {
    await fs.copy(assetsDir, path.join(outDir, 'assets'));
  }

  const publicDir = path.join(srcDir, 'public');
  if (await fs.pathExists(publicDir)) {
    await fs.copy(publicDir, path.join(outDir, 'public'));
  }
}

async function generateTypes(srcDir: string, outDir: string) {
  // Generate TypeScript declaration files
  const typesFile = path.join(outDir, 'index.d.ts');
  
  const typesContent = `// Auto-generated type definitions
export * from './types';
export { default } from './index';
`;

  await fs.writeFile(typesFile, typesContent);
}

async function getBuildStats(outDir: string) {
  const files = await fs.readdir(outDir);
  let totalSize = 0;
  let fileCount = 0;

  for (const file of files) {
    const filePath = path.join(outDir, file);
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      totalSize += stat.size;
      fileCount++;
    }
  }

  return {
    size: formatBytes(totalSize),
    fileCount
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}