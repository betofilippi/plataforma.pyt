import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'api/index': 'src/api/index.ts',
    'security/index': 'src/security/index.ts',
    'extensions/index': 'src/extensions/index.ts',
    'sdk/index': 'src/sdk/index.ts',
    'types/index': 'src/types/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  target: 'es2020',
  external: [
    'react',
    'react-dom',
    'eventemitter3',
    'zod',
    'uuid',
    'lodash-es',
    'semver',
    'vm2'
  ],
  esbuildOptions(options) {
    options.banner = {
      js: '// @plataforma/plugin-system - Comprehensive Plugin Architecture System'
    };
  }
});