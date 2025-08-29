import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react"; // Switch to regular React plugin
import path from "path";
// Temporarily disabled - causing import corruption
// import { moduleFederation, createPlataformaModuleFederation } from "./packages/vite-plugin-module-federation/dist/index.mjs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  cacheDir: false, // Disable cache to prevent EBUSY errors
  clearScreen: false,
  server: {
    host: "::",
    port: 3333, // Porta padrão do projeto
    proxy: {
      // API proxy to Python FastAPI backend
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Keep the /api prefix
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        }
      },
      // WebSocket proxy for real-time features
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    },
    cors: {
      origin: ['http://localhost:3333', 'http://localhost:8001'],
      credentials: true
    }
  },
  build: {
    outDir: "dist/spa",
    // Otimizações de performance
    rollupOptions: {
      output: {
        // Code splitting inteligente para 20+ módulos
        manualChunks: (id) => {
          // Vendor chunks principais
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'form-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('monaco-editor') || id.includes('@monaco-editor')) {
              return 'editor-vendor';
            }
            if (id.includes('chart.js') || id.includes('recharts')) {
              return 'chart-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            // Outros vendors menores em um chunk separado
            return 'vendor';
          }
          
          // Module splitting por diretórios
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^\/]+)/);
            if (match) {
              return `page-${match[1].toLowerCase()}`;
            }
          }
          
          if (id.includes('/components/ui/')) {
            return 'ui-components';
          }
          
          if (id.includes('/components/windows/')) {
            return 'window-components';
          }
          
          if (id.includes('/lib/') || id.includes('/utils/')) {
            return 'shared-utils';
          }
          
          if (id.includes('/hooks/')) {
            return 'hooks';
          }
          
          if (id.includes('/services/')) {
            return 'services';
          }
        },
        // Otimização de nomes de arquivo
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Configurações avançadas de otimização
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
        // Otimizações avançadas
        passes: 2,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        dead_code: true,
        side_effects: false
      },
      mangle: {
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false
      }
    },
    // Configurações de performance para builds grandes
    sourcemap: mode === 'development' ? 'inline' : false,
    reportCompressedSize: false, // Desabilita para builds mais rápidos
    chunkSizeWarningLimit: 1000,
    // Treeshaking optimization
    treeshaking: true
  },
  plugins: [
    react({
      // Properly disable Fast Refresh and HMR in development
      fastRefresh: mode !== 'development',
      // Alternative: Use environment variable to control
      // fastRefresh: process.env.VITE_DISABLE_FAST_REFRESH !== 'true',
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
  ],
  // Otimizações de dependências com exclusões para resolver EBUSY
  optimizeDeps: {
    // Removido force: true para evitar conflito com cacheDir: false
    entries: ['./client/main.tsx'], // Entry point específico
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      '@tanstack/react-query',
      'lucide-react',
      '@supabase/supabase-js',
      '@supabase/postgrest-js',
      'lodash.debounce' // Adiciona lodash.debounce para pré-compilação
    ],
    exclude: []
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
      { find: "@/shared", replacement: path.resolve(__dirname, "./shared") },
      { find: "@", replacement: path.resolve(__dirname, "./client") }
    ],
  },
}));

