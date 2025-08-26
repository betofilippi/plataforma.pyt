// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimiters } from "./config/rate-limit";
import { createClient } from 'redis';
type Redis = ReturnType<typeof createClient>;
import { handleDemo } from "./routes/demo";
import { getApiDocs, getApiStatus, getApiMetrics } from "./routes/api-docs";
import { handleMCPRequest, getMCPServices, getMCPMethods } from "./routes/mcp-proxy";
import { supabaseProxySimple } from "./routes/supabase-proxy-simple";
// Mocks removidos - usando apenas APIs reais
import { 
  executePostgresQuery, 
  listPostgresSchemas,
  listPostgresTables, 
  getTableSchema,
  getTableData as getPostgresTableData,
  testPostgresConnection,
  getTableRelationships,
  saveRelationship,
  loadRelationships,
  deleteRelationship,
  clearCache,
  getTableMetadata,
  saveColumnMetadata,
  getTableStructure
} from "./routes/postgres-direct";
import {
  receiveWebhook,
  configureWebhook,
  listWebhooks,
  toggleWebhook,
  deleteWebhook,
  testWebhook,
  getTableData,
  exportCSV,
} from "./routes/webhooks";
import thumbnailRoutes from "./routes/thumbnail-generator";
import pdfRoutes from "./routes/pdf-service";
import {
  listSpreadsheets,
  getSpreadsheet as getSpreadsheetV1,
  createSpreadsheetEndpoint,
  deleteSpreadsheet as deleteSpreadsheetV1,
  createRow,
  getRow,
  updateRow,
  deleteRow,
  getCell,
  updateCell as updateCellV1,
  getApiStatus as getApiStatusV1,
} from "./routes/rest-api";
import { createAuthRoutes, createDatabasePool } from "./routes/auth";
import { createOAuthRoutes } from "./routes/oauth";
import { requireAuth } from "./auth/middleware";
import { getJWTService } from './auth/jwt';
import { createSSORoutes } from './sso/routes';
import { getMockUsers, getMockTables, getMockFiles, getMockNotifications } from './routes/mock-data';
import { 
  uploadToStorage, 
  deleteFromStorage, 
  downloadFromStorage, 
  getSignedUrl,
  uploadMiddleware 
} from './routes/storage-upload';
import {
  listFiles as listDocumentFiles,
  uploadFile as uploadDocumentFile,
  downloadFile as downloadDocumentFile,
  deleteFile as deleteDocumentFile,
  createFolder as createDocumentFolder,
  getSignedUrl as getDocumentSignedUrl,
  moveFile as moveDocumentFile,
  uploadMiddleware as documentUploadMiddleware
} from './routes/storage-documents';
import { ssoCorsConfig } from './sso/cors-config';
import { RedisSessionStore } from './sso/redis-store';
import { LogoutSyncService } from './sso/logout-sync';
import { createPermissionRoutes, createPermissionSystem } from './permissions';
import { ModulePermissionManager, CORE_MODULE_CONFIG } from './permissions';
import dashboardRoutes from './routes/dashboard';
import createSettingsRoutes from './routes/settings';
// Removed database routes - using Supabase Platform Kit directly
import aiAssistantRoutes from './routes/ai-assistant';
import { createAIRoutes, setupAIWebSocket } from './routes/ai';
import { createProxyMiddleware } from 'http-proxy-middleware';
import mcpRoutes from './routes/mcp';
import { RealtimeServer } from './websocket/realtime-server';
import { Server as HttpServer } from 'http';
import realtimeAIRoutes from './routes/realtime-ai';
import {
  listModuleFiles,
  uploadModuleFile,
  downloadModuleFile,
  deleteModuleFile,
  createModuleFolder,
  uploadMiddleware as moduleUploadMiddleware,
  initializeAllBuckets
} from './routes/module-storage';
import importControlRoutes from './routes/import-control';

export function createServer() {
  const app = express();

  // Create database pool for authentication
  const dbPool = createDatabasePool();
  
  // Initialize Redis for SSO sessions (optional)
  let redis: any = null;
  let redisStore: any = null;
  let logoutSync: any = null;
  
  // Check if Redis should be enabled
  const enableRedis = process.env.DISABLE_REDIS !== 'true';
  
  if (enableRedis) {
    console.log('🔗 Redis enabled - initializing Redis services...');
    
    try {
      redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 2000,
          lazyConnect: true,
        }
      });

      // Set up Redis error handlers
      redis.on('error', (error: any) => {
        console.warn('⚠️ Redis connection error, disabling Redis features:', error.message);
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('disconnect', () => {
        console.log('🔌 Redis disconnected');
      });

      redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Initialize SSO services - they will handle Redis failures gracefully
      redisStore = new RedisSessionStore({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'sso:',
        defaultTTL: 86400, // 24 hours
      });
      
      logoutSync = new LogoutSyncService({
        redis,
        pool: dbPool,
        enableBroadcast: true,
        enableWebhooks: process.env.NODE_ENV === 'production',
      });
      
      console.log('🚀 Redis services initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis services, continuing without Redis:', error);
      redis = null;
      redisStore = null;
      logoutSync = null;
    }
  } else {
    console.log('🚫 Redis disabled via DISABLE_REDIS environment variable');
    console.log('ℹ️ System will run with database-only storage and memory caching');
  }
  
  const jwtService = getJWTService(dbPool);

  // Security middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Deny iframe embedding for security
    res.setHeader('X-Frame-Options', 'DENY');
    
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
  });

  // CORS configuration with SSO support
  app.use(cors(ssoCorsConfig));

  // General rate limiting using centralized configuration
  app.use(rateLimiters.general);


  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // === AUTHENTICATION ROUTES ===
  app.use("/api/auth", createAuthRoutes(dbPool));
  
  // === OAUTH ROUTES ===
  app.use("/api/oauth", createOAuthRoutes(dbPool));
  
  // === SSO ROUTES ===
  if (redis) {
    app.use("/api/sso", createSSORoutes(dbPool, redis, jwtService));
  }

  // === PERMISSION & RBAC ROUTES ===
  app.use("/api", createPermissionRoutes(dbPool, redis || null));

  // === DASHBOARD ROUTES ===
  app.use("/api/dashboard", dashboardRoutes);

  // === SETTINGS ROUTES ===
  app.use("/api/settings", createSettingsRoutes(dbPool));

  // === DATABASE ROUTES REMOVED ===  
  // Using Supabase Platform Kit directly - no custom endpoints needed

  // === AI ASSISTANT ROUTES ===
  app.use("/api/ai-assistant", aiAssistantRoutes);
  
  // === REALTIME AI ROUTES ===
  app.use("/api/realtime-ai", (req, res, next) => {
    // Attach realtime server to request for broadcasting
    (req as any).realtimeServer = server.realtimeServer;
    next();
  }, realtimeAIRoutes);
  
  // === COMPREHENSIVE AI ROUTES ===
  if (redis) {
    app.use("/api/ai", createAIRoutes(dbPool, redis));
  } else {
    // Fallback without Redis (using memory caching)
    const fallbackRedis = {
      get: async () => null,
      setEx: async () => {},
      set: async () => {},
      del: async () => {}
    };
    app.use("/api/ai", createAIRoutes(dbPool, fallbackRedis as any));
  }

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // === MOCK DATA ROUTES FOR INFINITE QUERY DEMO ===
  app.get("/api/users", getMockUsers);
  app.get("/api/database/tables", getMockTables);
  app.get("/api/notifications", getMockNotifications);
  
  // === MODULE-SPECIFIC STORAGE ROUTES ===
  // Rotas de storage específicas por módulo
  app.post("/api/storage/:moduleId/files", listModuleFiles);
  app.post("/api/storage/:moduleId/upload", moduleUploadMiddleware, uploadModuleFile);
  app.get("/api/storage/:moduleId/download/:fileName(*)", downloadModuleFile);
  app.delete("/api/storage/:moduleId/files/:fileName(*)", deleteModuleFile);
  app.post("/api/storage/:moduleId/folder", createModuleFolder);

  // === IMPORT CONTROL ROUTES ===
  app.use("/api/import", importControlRoutes);

  // === Z-API WHATSAPP ROUTES (Replacing WhatsApp Business API) ===

  // === CLAUDE SESSIONS ROUTES ===
  app.get("/sessions", (req, res) => {
    try {
      const path = require('path');
      const filePath = path.join(process.cwd(), 'claude-sessions-master.html');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Failed to serve sessions interface:', error);
      res.status(500).send('Failed to load sessions interface');
    }
  });

  app.get("/sessions-data.json", (req, res) => {
    try {
      const path = require('path');
      const filePath = path.join(process.cwd(), 'sessions-data.json');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Failed to serve sessions data:', error);
      res.status(404).json({ error: 'Sessions data not found' });
    }
  });

  app.get("/claude-sessions-automation.js", (req, res) => {
    try {
      const path = require('path');
      const filePath = path.join(process.cwd(), 'claude-sessions-automation.js');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Failed to serve automation script:', error);
      res.status(404).send('Automation script not found');
    }
  });

  app.post("/api/update-sessions", async (req, res) => {
    try {
      const { exec } = require('child_process');
      const path = require('path');
      
      const scriptPath = path.join(process.cwd(), 'claude-sessions-html-generator.ps1');
      const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
      
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error('Error updating sessions:', error);
          res.status(500).json({ success: false, error: error.message });
          return;
        }
        
        console.log('✅ Sessions updated successfully');
        res.json({ success: true, message: 'Sessions updated successfully', output: stdout });
      });
    } catch (error) {
      console.error('Failed to update sessions:', error);
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  // === MCP PROXY ROUTES (Legacy) ===
  app.post("/api/mcp", handleMCPRequest);
  app.get("/api/mcp/services", getMCPServices);
  app.get("/api/mcp/services/:service/methods", getMCPMethods);

  // === MCP SERVICE ROUTES (New Unified Interface) ===
  app.use("/api/mcp", mcpRoutes);

  // === THUMBNAIL GENERATOR ROUTES ===
  app.use("/api", thumbnailRoutes);

  // === PDF SERVICE ROUTES ===
  app.use("/api/pdf", pdfRoutes);

  // === SUPABASE PROXY ROUTES ===
  app.all("/api/supabase-proxy/*", supabaseProxySimple);
  
  // === POSTGRESQL DIRECT ROUTES ===
  app.post("/api/postgres/query", executePostgresQuery);
  app.get("/api/postgres/schemas", listPostgresSchemas);
  app.get("/api/postgres/tables", listPostgresTables);
  app.get("/api/postgres/tables/:tableName/schema", getTableSchema);
  app.get("/api/postgres/tables/:tableName/data", getPostgresTableData);
  app.get("/api/postgres/relationships", getTableRelationships);
  app.get("/api/postgres/test", testPostgresConnection);
  app.post("/api/postgres/cache/clear", clearCache);
  
  // === CUSTOM RELATIONSHIP ROUTES ===
  app.post("/api/postgres/relationships/save", saveRelationship);
  app.get("/api/postgres/relationships/load", loadRelationships);
  app.delete("/api/postgres/relationships/:id", deleteRelationship);

  // === TABLE METADATA ROUTES (TYPE HINTS) ===
  app.get("/api/postgres/table-metadata", getTableMetadata);
  app.post("/api/postgres/column-metadata", saveColumnMetadata);
  app.get("/api/postgres/table-structure", getTableStructure);
  
  // === TABLE CONSTRAINTS ROUTES ===
  const { getTableConstraints } = require("./routes/postgres-constraints");
  app.get("/api/postgres/constraints", getTableConstraints);

  // === STORAGE UPLOAD ROUTES ===
  app.post("/api/storage/buckets/:bucketId/upload", uploadMiddleware, uploadToStorage);
  app.delete("/api/storage/buckets/:bucketId/objects/:fileName", deleteFromStorage);
  app.get("/api/storage/buckets/:bucketId/objects/:fileName/download", downloadFromStorage);
  app.post("/api/storage/buckets/:bucketId/objects/:fileName/signed-url", getSignedUrl);
  
  // === DOCUMENT STORAGE ROUTES ===
  app.post("/api/documents/list", listDocumentFiles);
  app.post("/api/documents/upload", documentUploadMiddleware, uploadDocumentFile);
  app.get("/api/documents/download/:moduleId/:path(*)", downloadDocumentFile);
  app.delete("/api/documents/delete", deleteDocumentFile);
  app.post("/api/documents/folder", createDocumentFolder);
  app.post("/api/documents/signed-url", getDocumentSignedUrl);
  app.post("/api/documents/move", moveDocumentFile);

  // Spreadsheet routes removed - now in planilha.app module

  // API Documentation routes (protected)
  app.get("/api/docs", requireAuth(dbPool), getApiDocs);
  app.get("/api/status", getApiStatus); // Keep status public for health checks
  app.get("/api/metrics", requireAuth(dbPool), getApiMetrics);

  // === WEBHOOK ROUTES ===
  app.post("/api/webhook", receiveWebhook); // Endpoint genérico
  app.post("/api/webhook/:webhookId", receiveWebhook); // Endpoint específico
  app.post("/api/webhooks", configureWebhook);
  app.get("/api/webhooks", listWebhooks);
  app.put("/api/webhooks/:webhookId/toggle", toggleWebhook);
  app.delete("/api/webhooks/:webhookId", deleteWebhook);
  app.post("/api/webhooks/:webhookId/test", testWebhook);

  // === REST API v1 ROUTES ===
  app.get("/api/v1/status", getApiStatusV1);

  // Spreadsheets
  app.get("/api/v1/spreadsheets", listSpreadsheets);
  app.get("/api/v1/spreadsheets/:id", getSpreadsheetV1);
  app.post("/api/v1/spreadsheets", createSpreadsheetEndpoint);
  app.delete("/api/v1/spreadsheets/:id", deleteSpreadsheetV1);

  // Rows
  app.post("/api/v1/spreadsheets/:id/rows", createRow);
  app.get("/api/v1/spreadsheets/:id/rows/:rowId", getRow);
  app.put("/api/v1/spreadsheets/:id/rows/:rowId", updateRow);
  app.delete("/api/v1/spreadsheets/:id/rows/:rowId", deleteRow);

  // Cells
  app.get("/api/v1/spreadsheets/:id/cells/:cellId", getCell);
  app.put("/api/v1/spreadsheets/:id/cells/:cellId", updateCellV1);

  // Table Data
  app.get("/api/v1/spreadsheets/:spreadsheetId/tables/:table", getTableData);
  app.get("/api/v1/spreadsheets/:spreadsheetId/tables/:table/export.csv", exportCSV);

  // AI routes removed - now in planilha.app module

  // Database routes removed - now in planilha.app module

  // Global error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', error);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      ...(isDevelopment && { stack: error.stack }),
      code: 'INTERNAL_ERROR'
    });
  });

  // Removed test HTML - let React handle the frontend

  // 404 handler for API routes
  app.use('/api/*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`,
      code: 'ENDPOINT_NOT_FOUND'
    });
  });

  // Initialize RBAC system - DISABLED
  const initializeRBAC = async () => {
    console.log('🔒 RBAC system disabled - skipping initialization');
  };

  // Initialize SSO services
  const initializeSSO = async () => {
    if (!redis || !redisStore || !logoutSync) {
      console.log('🔐 SSO services disabled (Redis not available)');
      return;
    }
    
    try {
      console.log('🔐 Initializing SSO services...');
      
      // Test Redis connection first
      if (!redis.isOpen) {
        await redis.connect();
      }
      
      // Initialize Redis store
      await redisStore.initialize();
      
      // Initialize logout sync service
      await logoutSync.initialize();
      
      // Run initial cleanup
      await cleanupExpiredSessions();
      
      // Set up periodic cleanup (every hour)
      setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
      
      console.log('✅ SSO services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SSO services:', error);
      console.warn('⚠️ Disabling SSO features due to Redis connection issues');
      
      // Disable Redis services on failure
      redis = null;
      redisStore = null;
      logoutSync = null;
      
      // Don't throw - allow server to start without SSO if needed
    }
  };
  
  // Cleanup function for expired sessions
  const cleanupExpiredSessions = async () => {
    try {
      // Cleanup database sessions
      const result = await dbPool.query(`
        SELECT cleanup_expired_sso_sessions() as cleaned_count
      `);
      
      const cleanedCount = result.rows[0]?.cleaned_count || 0;
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired SSO sessions`);
      }
      
      // Cleanup Redis store if available
      if (redisStore && redis) {
        await redisStore.cleanup();
      }
    } catch (error) {
      console.error('Error during SSO cleanup:', error);
    }
  };
  
  // Initialize services in background
  initializeRBAC(); // Now actually disabled
  initializeSSO();
  
  // Initialize Supabase Storage buckets for all modules
  initializeAllBuckets().catch(error => {
    console.error('❌ Failed to initialize storage buckets:', error);
  });

  // Graceful shutdown
  const server = {
    app,
    realtimeServer: null as RealtimeServer | null,
    
    // Initialize WebSocket server when HTTP server is created
    initializeWebSocket: (httpServer: HttpServer) => {
      console.log('🔌 Initializing WebSocket server...');
      
      try {
        server.realtimeServer = new RealtimeServer(httpServer);
        console.log('✅ WebSocket server initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize WebSocket server:', error);
      }
    },
    
    // Get realtime server instance
    getRealtimeServer: () => server.realtimeServer,
    
    close: async () => {
      console.log('🔄 Shutting down server...');
      
      try {
        // Cleanup WebSocket connections
        if (server.realtimeServer) {
          console.log('Cleaning up WebSocket connections...');
          // WebSocket connections will be cleaned up automatically when server closes
        }
        
        // Cleanup SSO services if available
        if (logoutSync) {
          console.log('Cleaning up SSO services...');
          await logoutSync.destroy();
        }
        if (redisStore) {
          await redisStore.disconnect();
        }
        if (redis) {
          await redis.disconnect();
        }
        
        // Close database connections
        console.log('Closing database connections...');
        await dbPool.end();
        
        console.log('✅ Server shutdown complete');
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
      }
    }
  };

  return server;
}
