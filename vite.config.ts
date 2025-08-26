import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
// Temporarily disabled - causing import corruption
// import { moduleFederation, createPlataformaModuleFederation } from "./packages/vite-plugin-module-federation/dist/index.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: false, // Disable cache to prevent EBUSY errors
  server: {
    host: "::",
    port: 3030, // Porta diferente para evitar conflitos
    proxy: {
      // API proxy to our Express server (handled by expressPlugin but keeping for reference)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    },
  },
  build: {
    outDir: "dist/spa",
    // Otimizações de performance
    rollupOptions: {
      output: {
        // Code splitting por chunks
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'query-vendor': ['@tanstack/react-query'],
          
        },
        // Otimização de nomes de arquivo
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Configurações de otimização
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    // Análise de bundle
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500
  },
  plugins: [
    react({
      // Configurações do React Plugin para otimização
      include: "**/*.{jsx,tsx}",
      // Fast Refresh configuration
      fastRefresh: true,
    }),
    // Module Federation Plugin temporarily disabled - was corrupting imports
    // moduleFederation(
    //   createPlataformaModuleFederation({
    //     name: 'plataforma-host',
    //     // Host application - can load remote modules dynamically
    //     remotes: {
    //       // Example remote modules (can be registered at runtime)
    //       // 'auth-module': 'http://localhost:3001/remote-entry.js',
    //       // 'dashboard-module': 'http://localhost:3002/remote-entry.js'
    //     },
    //     shared: {
    //       // Additional shared dependencies specific to plataforma
    //       '@mui/material': {
    //         singleton: true,
    //         requiredVersion: '^7.0.0'
    //       },
    //       '@mui/icons-material': {
    //         singleton: false, // Allow multiple versions due to size
    //         requiredVersion: '^5.0.0'
    //       }
    //     }
    //   })
    // ),
    expressPlugin()
  ],
  // Otimizações de dependências com exclusões para resolver EBUSY
  optimizeDeps: {
    force: false,
    include: [
      'react',
      'react-dom', 
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      '@supabase/supabase-js',
      '@supabase/postgrest-js'
    ],
    exclude: [
      // Dependências que causam EBUSY
      '@radix-ui/react-slot',
      'clsx',
      'tailwind-merge',
      '@radix-ui/react-toast',
      'class-variance-authority',
      'react-hook-form',
      'zod',
      // Dependências pesadas
      '@mui/icons-material',
    ]
  },
  // Configurações de performance
  esbuild: {
    // JSX runtime automático para evitar erros
    jsx: 'automatic',
    jsxDev: true,
    // Configurações do esbuild para otimização
    target: 'esnext',
    format: 'esm',
    treeShaking: true,
    // Remove comentários em produção
    legalComments: mode === 'production' ? 'none' : 'eof'
  },
  resolve: {
    alias: [
      { find: "@/modulos", replacement: path.resolve(__dirname, "./modulos") },
      { find: "@/shared", replacement: path.resolve(__dirname, "./shared") },
      { find: "@", replacement: path.resolve(__dirname, "./client") },
      { find: "@plataforma/vite-plugin-module-federation", replacement: path.resolve(__dirname, "./packages/vite-plugin-module-federation/src") }
    ],
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // IMPORTANTE: Usar o Express APENAS para rotas /api
      // Isso evita que o Express intercepte a rota principal "/"
      server.middlewares.use((req, res, next) => {
        // Apenas processar rotas que começam com /api
        if (req.url?.startsWith('/api')) {
          app.app(req, res, next);
        } else {
          // Deixar o Vite lidar com todas as outras rotas
          next();
        }
      });
    },
  };
}
