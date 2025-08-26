import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { RegistryConfig } from '../types';
import { DatabaseConnection } from '../database';
import { createAuthRoutes } from './routes/auth';
import { createPackageRoutes } from './routes/packages';
import { createSearchRoutes } from './routes/search';
import { createStatsRoutes } from './routes/stats';
import { createUserRoutes } from './routes/users';
import { createWebhookRoutes } from './routes/webhooks';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { requestLogger } from './middleware/logger';

export interface RegistryServerOptions {
  config: RegistryConfig;
  port?: number;
  host?: string;
}

export class RegistryServer {
  private app: express.Application;
  private config: RegistryConfig;
  private db: DatabaseConnection;
  private logger: winston.Logger;
  private server?: any;

  constructor(options: RegistryServerOptions) {
    this.config = options.config;
    this.app = express();
    this.db = new DatabaseConnection(this.config.database);
    
    // Setup logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      }
    }));

    // CORS
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://plataforma.app', 'https://*.plataforma.app']
        : true,
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Stricter rate limiting for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5, // 5 login attempts per 15 minutes
      skipSuccessfulRequests: true
    });
    this.app.use('/api/v1/auth/login', authLimiter);

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger(this.logger));

    // Request ID
    this.app.use((req, res, next) => {
      req.id = uuidv4();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // Database availability
    this.app.use(async (req, res, next) => {
      try {
        const isHealthy = await this.db.healthCheck();
        if (!isHealthy) {
          return res.status(503).json({
            success: false,
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'Database is not available'
            }
          });
        }
        next();
      } catch (error) {
        next(error);
      }
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await this.db.healthCheck();
        const stats = this.db.getStats();

        res.json({
          status: dbHealth ? 'healthy' : 'unhealthy',
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
          database: {
            connected: dbHealth,
            connections: stats
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error.message
        });
      }
    });

    // API routes
    const apiRouter = express.Router();
    
    // Public routes (no auth required)
    apiRouter.use('/v1/auth', createAuthRoutes(this.db, this.config, this.logger));
    apiRouter.use('/v1/search', createSearchRoutes(this.db, this.logger));
    apiRouter.use('/v1/stats', createStatsRoutes(this.db, this.logger));
    
    // Package routes (some public, some require auth)
    apiRouter.use('/v1/packages', createPackageRoutes(this.db, this.config, this.logger));
    
    // Protected routes
    apiRouter.use('/v1/users', authMiddleware(this.config), createUserRoutes(this.db, this.logger));
    apiRouter.use('/v1/webhooks', authMiddleware(this.config), createWebhookRoutes(this.db, this.logger));

    this.app.use('/api', apiRouter);

    // API documentation
    this.app.get('/api/v1/openapi.json', (req, res) => {
      res.json(this.generateOpenAPISpec());
    });

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Plataforma Module Registry',
        version: process.env.npm_package_version || '1.0.0',
        documentation: '/api/v1/openapi.json',
        health: '/health'
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler(this.logger));
  }

  private generateOpenAPISpec(): any {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Plataforma Module Registry API',
        version: '1.0.0',
        description: 'API for managing, discovering and distributing modules in the plataforma.app ecosystem',
        contact: {
          name: 'Plataforma.app Team',
          url: 'https://plataforma.app',
          email: 'support@plataforma.app'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: process.env.REGISTRY_BASE_URL || 'http://localhost:3001',
          description: 'Module Registry API'
        }
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: {
              '200': {
                description: 'Service is healthy'
              }
            }
          }
        },
        '/api/v1/auth/login': {
          post: {
            summary: 'User login',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string', minLength: 8 }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/v1/packages': {
          get: {
            summary: 'List packages',
            parameters: [
              {
                name: 'q',
                in: 'query',
                description: 'Search query',
                schema: { type: 'string' }
              },
              {
                name: 'category',
                in: 'query',
                description: 'Package category',
                schema: { type: 'string' }
              },
              {
                name: 'limit',
                in: 'query',
                description: 'Number of results',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
              },
              {
                name: 'offset',
                in: 'query',
                description: 'Result offset',
                schema: { type: 'integer', minimum: 0, default: 0 }
              }
            ]
          },
          post: {
            summary: 'Publish package',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      package: {
                        type: 'string',
                        format: 'binary'
                      },
                      tag: {
                        type: 'string',
                        default: 'latest'
                      },
                      access: {
                        type: 'string',
                        enum: ['public', 'private'],
                        default: 'public'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    };
  }

  async start(port = 3001, host = '0.0.0.0'): Promise<void> {
    try {
      // Test database connection
      const dbHealth = await this.db.healthCheck();
      if (!dbHealth) {
        throw new Error('Database connection failed');
      }

      this.server = this.app.listen(port, host, () => {
        this.logger.info(`Registry server started on ${host}:${port}`);
        this.logger.info(`Health check: http://${host}:${port}/health`);
        this.logger.info(`API docs: http://${host}:${port}/api/v1/openapi.json`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.stop());
      process.on('SIGINT', () => this.stop());

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Shutting down registry server...');
    
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(async () => {
          await this.db.close();
          this.logger.info('Registry server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI interface
if (require.main === module) {
  const config: RegistryConfig = {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'module_registry',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    storage: {
      provider: (process.env.STORAGE_PROVIDER as any) || 'local',
      path: process.env.STORAGE_PATH || './uploads',
      bucket: process.env.STORAGE_BUCKET,
      accessKey: process.env.STORAGE_ACCESS_KEY,
      secretKey: process.env.STORAGE_SECRET_KEY,
      region: process.env.STORAGE_REGION
    },
    security: {
      jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB
      allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/gzip,application/x-tar').split(','),
      scanUploads: process.env.SCAN_UPLOADS !== 'false',
      quarantineTime: parseInt(process.env.QUARANTINE_TIME || '3600000') // 1 hour
    },
    search: {
      provider: (process.env.SEARCH_PROVIDER as any) || 'postgres',
      apiKey: process.env.SEARCH_API_KEY,
      indexName: process.env.SEARCH_INDEX
    },
    notifications: {
      smtp: {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      },
      webhook: process.env.NOTIFICATION_WEBHOOK
    }
  };

  const server = new RegistryServer({ config });
  const port = parseInt(process.env.PORT || '3001');
  const host = process.env.HOST || '0.0.0.0';

  server.start(port, host).catch(error => {
    console.error('Failed to start registry server:', error);
    process.exit(1);
  });
}