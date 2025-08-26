import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SistemaModule',
      fileName: (format) => `index.${format === 'es' ? 'js' : format}`
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'lucide-react'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'LucideReact'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../client'),
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});