import { createServer } from 'vite';
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import chalk from 'chalk';
import { loadModuleConfig } from '../utils/config-loader';
import { validateModuleStructure } from '../utils/validator';
import { createProxyMiddleware } from 'http-proxy-middleware';

export interface DevServerOptions {
  port?: number;
  host?: string;
  open?: boolean;
  apiPort?: number;
  hotReload?: boolean;
  mock?: boolean;
}

export async function startDevServer(options: DevServerOptions = {}) {
  const cwd = process.cwd();
  const port = options.port || 5173;
  const apiPort = options.apiPort || 4000;

  // Load and validate module
  const config = await loadModuleConfig(cwd);
  if (!config) {
    throw new Error('module.json not found. Are you in a valid module directory?');
  }

  const structureValidation = await validateModuleStructure(cwd);
  if (!structureValidation.isValid) {
    console.warn(chalk.yellow('⚠️  Module structure issues found:'));
    structureValidation.errors.forEach(error => 
      console.warn(chalk.gray(`   ${error}`))
    );
  }

  console.log(chalk.blue(`🚀 Starting development server for "${config.name}"...`));

  // Create Vite dev server
  const server = await createServer({
    root: cwd,
    mode: 'development',
    server: {
      port,
      host: options.host || 'localhost',
      open: options.open || false,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
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
    },
    define: {
      __MODULE_CONFIG__: JSON.stringify(config),
      __DEV_MODE__: true
    }
  });

  await server.listen();
  
  // Start mock API server if needed
  if (options.mock) {
    await startMockServer(apiPort, config);
  }

  // Setup WebSocket for hot reload
  if (options.hotReload !== false) {
    setupHotReload(server, cwd);
  }

  const serverUrl = `http://${options.host || 'localhost'}:${port}`;
  
  console.log(chalk.green(`✅ Development server started!`));
  console.log(chalk.blue(`   Local:   ${serverUrl}`));
  console.log(chalk.blue(`   Module:  ${config.name} v${config.version}`));
  
  if (options.mock) {
    console.log(chalk.blue(`   API:     http://localhost:${apiPort}/api`));
  }
  
  console.log(chalk.gray('\n   Press Ctrl+C to stop the server'));

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Shutting down development server...'));
    server.close();
    process.exit(0);
  });

  return server;
}

async function startMockServer(port: number, config: any) {
  const app = express();
  
  app.use(express.json());
  
  // Basic CORS
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Mock API routes based on module config
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      module: config.name,
      version: config.version,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/module/info', (req, res) => {
    res.json(config);
  });

  // Database mock routes
  if (config.features?.database) {
    app.get('/api/data', (req, res) => {
      res.json({
        data: [],
        meta: { total: 0, page: 1, limit: 10 }
      });
    });

    app.post('/api/data', (req, res) => {
      res.json({ 
        id: Date.now(), 
        ...req.body,
        created_at: new Date().toISOString()
      });
    });
  }

  // AI mock routes
  if (config.features?.ai) {
    app.post('/api/ai/chat', (req, res) => {
      res.json({
        response: `Mock AI response for: "${req.body.message}"`,
        model: 'mock-gpt',
        timestamp: new Date().toISOString()
      });
    });

    app.post('/api/ai/analyze', (req, res) => {
      res.json({
        analysis: 'Mock analysis result',
        confidence: 0.85,
        suggestions: ['Mock suggestion 1', 'Mock suggestion 2']
      });
    });
  }

  app.listen(port, () => {
    console.log(chalk.green(`📡 Mock API server started on port ${port}`));
  });
}

function setupHotReload(server: any, cwd: string) {
  const wss = new WebSocketServer({ port: 8080 });
  
  wss.on('connection', (ws) => {
    console.log(chalk.gray('📡 Hot reload client connected'));
    
    ws.on('close', () => {
      console.log(chalk.gray('📡 Hot reload client disconnected'));
    });
  });

  // Watch for file changes
  const chokidar = require('chokidar');
  const watcher = chokidar.watch(path.join(cwd, 'src'), {
    ignored: /node_modules/,
    persistent: true
  });

  watcher.on('change', (filePath: string) => {
    console.log(chalk.blue(`🔄 File changed: ${path.relative(cwd, filePath)}`));
    
    // Notify all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({
          type: 'file-changed',
          file: path.relative(cwd, filePath)
        }));
      }
    });
  });

  return wss;
}