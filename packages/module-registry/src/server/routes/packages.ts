import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import tar from 'tar';
import semver from 'semver';
import Joi from 'joi';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { RegistryConfig, ModulePackage, ModuleVersion, ApiResponse, PublishResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { PackageService } from '../services/PackageService';
import { SecurityService } from '../services/SecurityService';
import { StorageService } from '../services/StorageService';

const publishSchema = Joi.object({
  tag: Joi.string().default('latest'),
  access: Joi.string().valid('public', 'private').default('public')
});

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/gzip', 'application/x-gzip', 'application/x-tar'];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.tgz')) {
      cb(null, true);
    } else {
      cb(new Error('Only .tgz files are allowed'));
    }
  }
});

export function createPackageRoutes(
  db: DatabaseConnection,
  config: RegistryConfig,
  logger: Logger
) {
  const router = express.Router();
  const packageService = new PackageService(db, logger);
  const securityService = new SecurityService(config, logger);
  const storageService = new StorageService(config, logger);

  /**
   * List packages with search and filtering
   */
  router.get('/', optionalAuth(config), asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const {
      q = '',
      category,
      author,
      license,
      minRating,
      minDownloads,
      updatedSince,
      includePrerelease = 'false',
      includeDeprecated = 'false',
      sortBy = 'downloads',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    const searchOptions = {
      query: q as string,
      category: category as string,
      author: author as string,
      license: license as string,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      minDownloads: minDownloads ? parseInt(minDownloads as string) : undefined,
      updatedSince: updatedSince ? new Date(updatedSince as string) : undefined,
      includePrerelease: includePrerelease === 'true',
      includeDeprecated: includeDeprecated === 'true',
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      limit: Math.min(parseInt(limit as string), 100),
      offset: parseInt(offset as string)
    };

    const result = await packageService.searchPackages(searchOptions);

    const response: ApiResponse = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get specific package details
   */
  router.get('/:name', optionalAuth(config), asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name } = req.params;
    const { version } = req.query;

    const packageInfo = await packageService.getPackageInfo(name, version as string);
    
    if (!packageInfo) {
      throw new ApiError(404, 'PACKAGE_NOT_FOUND', `Package ${name} not found`);
    }

    // Track view if user is authenticated
    if (req.user) {
      await packageService.trackPackageView(packageInfo.id, req.user.id);
    }

    const response: ApiResponse = {
      success: true,
      data: packageInfo,
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get package versions
   */
  router.get('/:name/versions', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { name } = req.params;

    const versions = await packageService.getPackageVersions(name);

    if (!versions || versions.length === 0) {
      throw new ApiError(404, 'PACKAGE_NOT_FOUND', `Package ${name} not found`);
    }

    const response: ApiResponse = {
      success: true,
      data: { versions },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Download package
   */
  router.get('/:name/:version/download', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name, version } = req.params;

    const packageVersion = await packageService.getPackageVersion(name, version);
    
    if (!packageVersion) {
      throw new ApiError(404, 'VERSION_NOT_FOUND', `Package ${name}@${version} not found`);
    }

    // Track download
    await packageService.trackDownload(
      packageVersion.packageId,
      version,
      req.user?.id,
      req.ip,
      req.get('User-Agent') || '',
      req.get('Referer')
    );

    // Get file from storage
    const filePath = await storageService.getPackageFile(packageVersion.tarballUrl);
    
    if (!await fs.pathExists(filePath)) {
      throw new ApiError(404, 'FILE_NOT_FOUND', 'Package file not found');
    }

    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${name}-${version}.tgz"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }));

  /**
   * Publish package
   */
  router.post('/', authMiddleware(config), upload.single('package'), asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    if (!req.file) {
      throw new ApiError(400, 'MISSING_FILE', 'Package file is required');
    }

    const { error, value } = publishSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, 'VALIDATION_ERROR', error.details[0].message);
    }

    const { tag, access } = value;

    try {
      // Extract and validate package
      const manifest = await extractPackageManifest(req.file.path);
      
      if (!manifest) {
        throw new ApiError(400, 'INVALID_PACKAGE', 'Could not extract package.json');
      }

      // Validate manifest
      const validationResult = await packageService.validateManifest(manifest);
      if (!validationResult.isValid) {
        throw new ApiError(400, 'INVALID_MANIFEST', validationResult.errors[0]);
      }

      // Security scan
      const securityResult = await securityService.scanPackage(req.file.path, manifest);
      if (!securityResult.passed) {
        throw new ApiError(400, 'SECURITY_VIOLATION', `Security scan failed: ${securityResult.issues[0]?.title}`);
      }

      // Check if user has permission to publish this package
      const existingPackage = await packageService.getPackageByName(manifest.name);
      if (existingPackage && existingPackage.authorId !== req.user!.id) {
        throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to publish to this package');
      }

      // Check if version already exists
      if (existingPackage) {
        const existingVersion = await packageService.getPackageVersion(manifest.name, manifest.version);
        if (existingVersion) {
          throw new ApiError(409, 'VERSION_EXISTS', `Version ${manifest.version} already exists`);
        }
      }

      // Calculate file hash
      const fileBuffer = await fs.readFile(req.file.path);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Store package file
      const tarballUrl = await storageService.storePackageFile(
        req.file.path,
        manifest.name,
        manifest.version
      );

      // Create or update package
      let packageData: ModulePackage;
      
      if (existingPackage) {
        packageData = await packageService.updatePackage(existingPackage.id, {
          description: manifest.description,
          keywords: manifest.keywords || [],
          homepage: manifest.homepage,
          repository: manifest.repository?.url || manifest.repository,
          license: manifest.license
        });
      } else {
        packageData = await packageService.createPackage({
          name: manifest.name,
          displayName: manifest.displayName || manifest.name,
          description: manifest.description,
          category: manifest.plataforma?.category || 'utility',
          authorId: req.user!.id,
          license: manifest.license,
          keywords: manifest.keywords || [],
          homepage: manifest.homepage,
          repository: manifest.repository?.url || manifest.repository,
          isPublic: access === 'public'
        });
      }

      // Create package version
      const versionData = await packageService.createPackageVersion({
        packageId: packageData.id,
        version: manifest.version,
        tag,
        description: manifest.description,
        tarballUrl,
        tarballSize: req.file.size,
        tarballSha256: sha256,
        manifest,
        dependencies: manifest.dependencies || {},
        peerDependencies: manifest.peerDependencies || {},
        devDependencies: manifest.devDependencies || {},
        isPrerelease: semver.prerelease(manifest.version) !== null,
        securityScore: securityResult.score,
        publishedBy: req.user!.id,
        buildInfo: {
          platform: process.platform,
          nodeVersion: process.version,
          buildTime: new Date(),
          // TODO: Extract from CI environment
          commitHash: process.env.GIT_COMMIT,
          branch: process.env.GIT_BRANCH,
          buildNumber: process.env.BUILD_NUMBER
        }
      });

      logger.info('Package published', {
        packageId: packageData.id,
        versionId: versionData.id,
        name: manifest.name,
        version: manifest.version,
        userId: req.user!.id,
        username: req.user!.username
      });

      const response: ApiResponse<PublishResponse> = {
        success: true,
        data: {
          success: true,
          package: packageData,
          version: versionData,
          url: `/api/v1/packages/${manifest.name}`,
          downloadUrl: `/api/v1/packages/${manifest.name}/${manifest.version}/download`,
          warnings: securityResult.warnings
        },
        meta: {
          timestamp: new Date(),
          requestId: req.id,
          version: '1.0.0'
        }
      };

      res.status(201).json(response);

    } catch (error) {
      // Clean up uploaded file
      if (await fs.pathExists(req.file.path)) {
        await fs.unlink(req.file.path);
      }
      throw error;
    } finally {
      // Clean up uploaded file
      if (await fs.pathExists(req.file.path)) {
        await fs.unlink(req.file.path);
      }
    }
  }));

  /**
   * Unpublish package version
   */
  router.delete('/:name/:version', authMiddleware(config), asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name, version } = req.params;

    const packageInfo = await packageService.getPackageByName(name);
    if (!packageInfo) {
      throw new ApiError(404, 'PACKAGE_NOT_FOUND', `Package ${name} not found`);
    }

    // Check permissions
    if (packageInfo.authorId !== req.user!.id && req.user!.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to unpublish this package');
    }

    await packageService.unpublishVersion(name, version);

    logger.info('Package version unpublished', {
      packageId: packageInfo.id,
      name,
      version,
      userId: req.user!.id,
      username: req.user!.username
    });

    res.json({
      success: true,
      data: {
        message: `Package ${name}@${version} has been unpublished`
      }
    });
  }));

  /**
   * Deprecate package version
   */
  router.post('/:name/:version/deprecate', authMiddleware(config), asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const { name, version } = req.params;
    const { message } = req.body;

    const packageInfo = await packageService.getPackageByName(name);
    if (!packageInfo) {
      throw new ApiError(404, 'PACKAGE_NOT_FOUND', `Package ${name} not found`);
    }

    // Check permissions
    if (packageInfo.authorId !== req.user!.id && req.user!.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to deprecate this package');
    }

    await packageService.deprecateVersion(name, version, message);

    logger.info('Package version deprecated', {
      packageId: packageInfo.id,
      name,
      version,
      message,
      userId: req.user!.id,
      username: req.user!.username
    });

    res.json({
      success: true,
      data: {
        message: `Package ${name}@${version} has been deprecated`
      }
    });
  }));

  return router;
}

async function extractPackageManifest(tarballPath: string): Promise<any> {
  const tempDir = path.join(path.dirname(tarballPath), 'extract-' + Date.now());
  
  try {
    // Extract tarball
    await tar.extract({
      file: tarballPath,
      cwd: path.dirname(tempDir),
      strip: 1
    });

    // Find package.json
    const packageJsonPath = path.join(tempDir, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      return null;
    }

    const manifest = await fs.readJson(packageJsonPath);
    return manifest;

  } catch (error) {
    throw new Error(`Failed to extract package manifest: ${error.message}`);
  } finally {
    // Clean up
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  }
}