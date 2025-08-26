import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { Logger } from 'winston';
import { RegistryConfig } from '../../types';

export interface StorageProvider {
  store(filePath: string, key: string): Promise<string>;
  retrieve(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    fs.ensureDirSync(basePath);
  }

  async store(filePath: string, key: string): Promise<string> {
    const targetPath = path.join(this.basePath, key);
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(filePath, targetPath);
    return key;
  }

  async retrieve(key: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return filePath;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    await fs.remove(filePath);
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    return await fs.pathExists(filePath);
  }

  getUrl(key: string): string {
    return `/storage/${key}`;
  }
}

export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private accessKey: string;
  private secretKey: string;

  constructor(config: {
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
  }) {
    this.bucket = config.bucket;
    this.region = config.region;
    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
  }

  async store(filePath: string, key: string): Promise<string> {
    // TODO: Implement S3 upload
    throw new Error('S3 storage not implemented yet');
  }

  async retrieve(key: string): Promise<string> {
    // TODO: Implement S3 download
    throw new Error('S3 storage not implemented yet');
  }

  async delete(key: string): Promise<void> {
    // TODO: Implement S3 delete
    throw new Error('S3 storage not implemented yet');
  }

  async exists(key: string): Promise<boolean> {
    // TODO: Implement S3 exists check
    throw new Error('S3 storage not implemented yet');
  }

  getUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

export class StorageService {
  private provider: StorageProvider;
  private config: RegistryConfig;
  private logger: Logger;

  constructor(config: RegistryConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize storage provider based on configuration
    switch (config.storage.provider) {
      case 'local':
        this.provider = new LocalStorageProvider(
          config.storage.path || './uploads'
        );
        break;
      case 's3':
        this.provider = new S3StorageProvider({
          bucket: config.storage.bucket!,
          region: config.storage.region!,
          accessKey: config.storage.accessKey!,
          secretKey: config.storage.secretKey!
        });
        break;
      default:
        throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
    }
  }

  /**
   * Store a package file
   */
  async storePackageFile(
    localPath: string,
    packageName: string,
    version: string
  ): Promise<string> {
    // Generate storage key
    const key = this.generatePackageKey(packageName, version);
    
    this.logger.info('Storing package file', {
      packageName,
      version,
      localPath,
      key
    });

    try {
      // Verify file exists and is valid
      await this.validatePackageFile(localPath);

      // Store the file
      const storedKey = await this.provider.store(localPath, key);

      this.logger.info('Package file stored successfully', {
        packageName,
        version,
        key: storedKey
      });

      return storedKey;

    } catch (error) {
      this.logger.error('Failed to store package file', {
        packageName,
        version,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get package file path or URL
   */
  async getPackageFile(key: string): Promise<string> {
    try {
      return await this.provider.retrieve(key);
    } catch (error) {
      this.logger.error('Failed to retrieve package file', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a package file
   */
  async deletePackageFile(key: string): Promise<void> {
    this.logger.info('Deleting package file', { key });

    try {
      await this.provider.delete(key);
      this.logger.info('Package file deleted successfully', { key });
    } catch (error) {
      this.logger.error('Failed to delete package file', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if package file exists
   */
  async packageFileExists(key: string): Promise<boolean> {
    try {
      return await this.provider.exists(key);
    } catch (error) {
      this.logger.error('Failed to check package file existence', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get public URL for package file
   */
  getPackageUrl(key: string): string {
    return this.provider.getUrl(key);
  }

  /**
   * Calculate file hash
   */
  async calculateFileHash(filePath: string): Promise<{
    md5: string;
    sha1: string;
    sha256: string;
    size: number;
  }> {
    const fileBuffer = await fs.readFile(filePath);
    
    return {
      md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
      sha1: crypto.createHash('sha1').update(fileBuffer).digest('hex'),
      sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
      size: fileBuffer.length
    };
  }

  /**
   * Clean up old package versions
   */
  async cleanupOldVersions(
    packageName: string,
    keepVersions: string[]
  ): Promise<void> {
    this.logger.info('Cleaning up old package versions', {
      packageName,
      keepVersions
    });

    // This would typically query the database for all versions of the package
    // and delete files not in the keepVersions list
    // For now, this is a placeholder implementation

    try {
      // TODO: Implement cleanup logic
      this.logger.info('Package cleanup completed', { packageName });
    } catch (error) {
      this.logger.error('Package cleanup failed', {
        packageName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    provider: string;
  }> {
    // This would typically be implemented differently for each provider
    return {
      totalFiles: 0,
      totalSize: 0,
      provider: this.config.storage.provider
    };
  }

  /**
   * Backup package file
   */
  async backupPackageFile(key: string): Promise<string> {
    const backupKey = `backups/${key}`;
    
    try {
      const originalPath = await this.provider.retrieve(key);
      const backupPath = await this.provider.store(originalPath, backupKey);
      
      this.logger.info('Package file backed up', {
        original: key,
        backup: backupPath
      });
      
      return backupPath;
    } catch (error) {
      this.logger.error('Package backup failed', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  private generatePackageKey(packageName: string, version: string): string {
    // Create a safe storage key
    const safeName = packageName.replace(/[^a-zA-Z0-9\-_]/g, '-');
    const safeVersion = version.replace(/[^a-zA-Z0-9\-_.]/g, '-');
    
    // Add timestamp to avoid conflicts
    const timestamp = Date.now();
    
    return `packages/${safeName}/${safeVersion}/${timestamp}/${safeName}-${safeVersion}.tgz`;
  }

  private async validatePackageFile(filePath: string): Promise<void> {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new Error('Package file does not exist');
    }

    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Package file is empty');
    }

    if (stats.size > this.config.security.maxFileSize) {
      throw new Error(`Package file too large: ${stats.size} bytes (max: ${this.config.security.maxFileSize})`);
    }

    // Check MIME type (basic check)
    const buffer = await fs.readFile(filePath, { encoding: null });
    if (!this.isValidPackageFile(buffer)) {
      throw new Error('Invalid package file format');
    }
  }

  private isValidPackageFile(buffer: Buffer): boolean {
    // Check for gzip/tar magic numbers
    if (buffer.length < 3) return false;

    // Gzip magic number: 1f 8b
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      return true;
    }

    // Tar file (ustar format)
    if (buffer.length >= 265) {
      const ustar = buffer.subarray(257, 262).toString();
      if (ustar === 'ustar') {
        return true;
      }
    }

    return false;
  }

  /**
   * Mirror package to multiple storage providers
   */
  async mirrorPackage(key: string, targetProviders: StorageProvider[]): Promise<void> {
    this.logger.info('Mirroring package to additional providers', {
      key,
      targetCount: targetProviders.length
    });

    try {
      const filePath = await this.provider.retrieve(key);
      
      await Promise.all(
        targetProviders.map(async (provider) => {
          await provider.store(filePath, key);
        })
      );

      this.logger.info('Package mirroring completed', { key });
    } catch (error) {
      this.logger.error('Package mirroring failed', {
        key,
        error: error.message
      });
      throw error;
    }
  }
}