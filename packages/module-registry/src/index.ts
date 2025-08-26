// Core exports
export * from './types';
export * from './core';

// Server exports
export { RegistryServer } from './server';
export type { RegistryServerOptions } from './server';

// Database exports
export { DatabaseConnection, DatabaseMigrator } from './database';

// Service exports
export { PackageService } from './server/services/PackageService';
export { SecurityService } from './server/services/SecurityService';
export { StorageService } from './server/services/StorageService';

// Client exports (for use in other applications)
export { RegistryClient } from './core/RegistryClient';

// Default configuration
export const defaultConfig = {
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
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/gzip,application/x-tar').split(','),
    scanUploads: process.env.SCAN_UPLOADS !== 'false',
    quarantineTime: parseInt(process.env.QUARANTINE_TIME || '3600000')
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