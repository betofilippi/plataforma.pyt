import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

const external = [
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.dependencies || {}),
  'react/jsx-runtime'
];

const commonPlugins = [
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false
  })
];

export default [
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: commonPlugins
  },

  // React components bundle
  {
    input: 'src/react/index.ts',
    output: [
      {
        file: 'dist/react/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/react/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: commonPlugins
  },

  // Cache bundle
  {
    input: 'src/cache/index.ts',
    output: [
      {
        file: 'dist/cache/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/cache/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: commonPlugins
  },

  // Communication bundle
  {
    input: 'src/communication/index.ts',
    output: [
      {
        file: 'dist/communication/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/communication/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    external,
    plugins: commonPlugins
  },

  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: pkg.types,
      format: 'esm'
    },
    plugins: [dts()]
  },

  // React type definitions
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Cache type definitions
  {
    input: 'src/cache/index.ts',
    output: {
      file: 'dist/cache/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  },

  // Communication type definitions
  {
    input: 'src/communication/index.ts',
    output: {
      file: 'dist/communication/index.d.ts',
      format: 'esm'
    },
    plugins: [dts()]
  }
];