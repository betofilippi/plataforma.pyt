import semver from 'semver';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { 
  ModulePackage, 
  ModuleVersion, 
  ModuleManifest, 
  SearchQuery, 
  SearchResult 
} from '../../types';

export interface CreatePackageData {
  name: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  authorId: string;
  homepage?: string;
  repository?: string;
  license: string;
  keywords: string[];
  tags?: string[];
  isPublic: boolean;
}

export interface UpdatePackageData {
  displayName?: string;
  description?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  tags?: string[];
}

export interface CreateVersionData {
  packageId: string;
  version: string;
  tag: string;
  description?: string;
  changelog?: string;
  tarballUrl: string;
  tarballSize: number;
  tarballSha256: string;
  manifest: ModuleManifest;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  isPrerelease: boolean;
  securityScore: number;
  publishedBy: string;
  buildInfo?: any;
}

export class PackageService {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  /**
   * Create a new package
   */
  async createPackage(data: CreatePackageData): Promise<ModulePackage> {
    this.logger.info('Creating new package', { name: data.name });

    const result = await this.db.query(`
      INSERT INTO packages (
        name, display_name, description, category, subcategory,
        author_id, homepage, repository, license, keywords, tags, is_public
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      data.name,
      data.displayName,
      data.description,
      data.category,
      data.subcategory,
      data.authorId,
      data.homepage,
      data.repository,
      data.license,
      JSON.stringify(data.keywords),
      JSON.stringify(data.tags || []),
      data.isPublic
    ]);

    return this.mapPackageRow(result.rows[0]);
  }

  /**
   * Update an existing package
   */
  async updatePackage(packageId: string, data: UpdatePackageData): Promise<ModulePackage> {
    this.logger.info('Updating package', { packageId });

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (data.displayName !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      updateValues.push(data.displayName);
    }

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(data.description);
    }

    if (data.homepage !== undefined) {
      updateFields.push(`homepage = $${paramCount++}`);
      updateValues.push(data.homepage);
    }

    if (data.repository !== undefined) {
      updateFields.push(`repository = $${paramCount++}`);
      updateValues.push(data.repository);
    }

    if (data.license !== undefined) {
      updateFields.push(`license = $${paramCount++}`);
      updateValues.push(data.license);
    }

    if (data.keywords !== undefined) {
      updateFields.push(`keywords = $${paramCount++}`);
      updateValues.push(JSON.stringify(data.keywords));
    }

    if (data.tags !== undefined) {
      updateFields.push(`tags = $${paramCount++}`);
      updateValues.push(JSON.stringify(data.tags));
    }

    updateFields.push(`updated_at = NOW()`);

    const result = await this.db.query(`
      UPDATE packages 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, [...updateValues, packageId]);

    if (result.rows.length === 0) {
      throw new Error('Package not found');
    }

    return this.mapPackageRow(result.rows[0]);
  }

  /**
   * Create a new package version
   */
  async createPackageVersion(data: CreateVersionData): Promise<ModuleVersion> {
    this.logger.info('Creating package version', {
      packageId: data.packageId,
      version: data.version
    });

    const result = await this.db.query(`
      INSERT INTO package_versions (
        package_id, version, tag, description, changelog, tarball_url,
        tarball_size, tarball_sha256, manifest, dependencies, peer_dependencies,
        dev_dependencies, is_prerelease, security_score, published_by, build_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      data.packageId,
      data.version,
      data.tag,
      data.description,
      data.changelog,
      data.tarballUrl,
      data.tarballSize,
      data.tarballSha256,
      JSON.stringify(data.manifest),
      JSON.stringify(data.dependencies),
      JSON.stringify(data.peerDependencies),
      JSON.stringify(data.devDependencies),
      data.isPrerelease,
      data.securityScore,
      data.publishedBy,
      JSON.stringify(data.buildInfo)
    ]);

    return this.mapVersionRow(result.rows[0]);
  }

  /**
   * Get package by name
   */
  async getPackageByName(name: string): Promise<ModulePackage | null> {
    const result = await this.db.query(`
      SELECT * FROM packages WHERE name = $1
    `, [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPackageRow(result.rows[0]);
  }

  /**
   * Get package info with latest version
   */
  async getPackageInfo(name: string, version?: string): Promise<any> {
    let versionClause = '';
    let params: any[] = [name];

    if (version) {
      versionClause = 'AND pv.version = $2';
      params.push(version);
    }

    const result = await this.db.query(`
      SELECT 
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        u.is_verified as author_verified,
        pv.version as latest_version,
        pv.tag as latest_tag,
        pv.published_at as last_published,
        pv.downloads as version_downloads,
        pv.manifest,
        pv.dependencies,
        pv.peer_dependencies,
        pv.tarball_size,
        pv.security_score,
        (
          SELECT json_agg(
            json_build_object(
              'version', version,
              'tag', tag,
              'published_at', published_at,
              'is_prerelease', is_prerelease,
              'is_deprecated', is_deprecated,
              'downloads', downloads
            )
            ORDER BY published_at DESC
          )
          FROM package_versions 
          WHERE package_id = p.id
        ) as versions,
        (
          SELECT json_agg(
            json_build_object(
              'rating', rating,
              'review', review,
              'user', u2.username,
              'created_at', pr.created_at
            )
            ORDER BY pr.created_at DESC
          )
          FROM package_ratings pr
          JOIN users u2 ON pr.user_id = u2.id
          WHERE pr.package_id = p.id
          LIMIT 10
        ) as recent_ratings
      FROM packages p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN package_versions pv ON p.id = pv.package_id ${versionClause}
      WHERE p.name = $1 AND p.is_public = true
      ${version ? '' : 'AND pv.published_at = (SELECT MAX(published_at) FROM package_versions WHERE package_id = p.id)'}
      ORDER BY pv.published_at DESC
      LIMIT 1
    `, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...this.mapPackageRow(row),
      author: {
        username: row.author_username,
        displayName: row.author_display_name,
        isVerified: row.author_verified
      },
      latestVersion: row.latest_version,
      latestTag: row.latest_tag,
      lastPublished: row.last_published,
      versionDownloads: row.version_downloads,
      manifest: row.manifest,
      dependencies: row.dependencies,
      peerDependencies: row.peer_dependencies,
      tarballSize: row.tarball_size,
      securityScore: row.security_score,
      versions: row.versions || [],
      recentRatings: row.recent_ratings || []
    };
  }

  /**
   * Get package version
   */
  async getPackageVersion(name: string, version: string): Promise<ModuleVersion | null> {
    const result = await this.db.query(`
      SELECT pv.*, p.name as package_name
      FROM package_versions pv
      JOIN packages p ON pv.package_id = p.id
      WHERE p.name = $1 AND pv.version = $2
    `, [name, version]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapVersionRow(result.rows[0]);
  }

  /**
   * Get all versions of a package
   */
  async getPackageVersions(name: string): Promise<ModuleVersion[]> {
    const result = await this.db.query(`
      SELECT pv.*, p.name as package_name
      FROM package_versions pv
      JOIN packages p ON pv.package_id = p.id
      WHERE p.name = $1
      ORDER BY pv.published_at DESC
    `, [name]);

    return result.rows.map(row => this.mapVersionRow(row));
  }

  /**
   * Search packages
   */
  async searchPackages(options: {
    query?: string;
    category?: string;
    author?: string;
    license?: string;
    minRating?: number;
    minDownloads?: number;
    updatedSince?: Date;
    includePrerelease?: boolean;
    includeDeprecated?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<SearchResult<ModulePackage>> {
    let sql = `
      SELECT 
        p.*,
        u.username as author_username,
        u.display_name as author_display_name,
        pv.version as latest_version,
        pv.published_at as last_published,
        CASE 
          WHEN $1 != '' THEN ts_rank_cd(p.search_vector, plainto_tsquery($1))
          ELSE 0
        END as relevance_score
      FROM packages p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN (
        SELECT 
          package_id,
          version,
          published_at,
          row_number() OVER (PARTITION BY package_id ORDER BY published_at DESC) as rn
        FROM package_versions
      ) pv ON p.id = pv.package_id AND pv.rn = 1
      WHERE p.is_public = true
    `;

    const params: any[] = [options.query || ''];
    let paramCount = 1;

    // Build conditions
    const conditions: string[] = [];

    if (!options.includeDeprecated) {
      conditions.push('p.is_deprecated = false');
    }

    if (options.query && options.query.trim()) {
      conditions.push('p.search_vector @@ plainto_tsquery($1)');
    }

    if (options.category) {
      conditions.push(`p.category = $${++paramCount}`);
      params.push(options.category);
    }

    if (options.author) {
      conditions.push(`u.username ILIKE $${++paramCount}`);
      params.push(`%${options.author}%`);
    }

    if (options.license) {
      conditions.push(`p.license = $${++paramCount}`);
      params.push(options.license);
    }

    if (options.minRating) {
      conditions.push(`p.average_rating >= $${++paramCount}`);
      params.push(options.minRating);
    }

    if (options.minDownloads) {
      conditions.push(`p.total_downloads >= $${++paramCount}`);
      params.push(options.minDownloads);
    }

    if (options.updatedSince) {
      conditions.push(`p.updated_at >= $${++paramCount}`);
      params.push(options.updatedSince);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // Build ORDER BY
    let orderBy = '';
    switch (options.sortBy) {
      case 'relevance':
        orderBy = options.query ? 'relevance_score DESC, p.total_downloads DESC' : 'p.total_downloads DESC';
        break;
      case 'downloads':
        orderBy = `p.total_downloads ${options.sortOrder?.toUpperCase() || 'DESC'}`;
        break;
      case 'rating':
        orderBy = `p.average_rating ${options.sortOrder?.toUpperCase() || 'DESC'}, p.total_downloads DESC`;
        break;
      case 'updated':
        orderBy = `p.updated_at ${options.sortOrder?.toUpperCase() || 'DESC'}`;
        break;
      case 'created':
        orderBy = `p.created_at ${options.sortOrder?.toUpperCase() || 'DESC'}`;
        break;
      case 'name':
        orderBy = `p.name ${options.sortOrder?.toUpperCase() || 'ASC'}`;
        break;
      default:
        orderBy = 'p.total_downloads DESC';
    }

    sql += ` ORDER BY ${orderBy}`;
    sql += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(options.limit || 20, options.offset || 0);

    // Execute search
    const searchResult = await this.db.query(sql, params);

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM packages p
      JOIN users u ON p.author_id = u.id
      WHERE p.is_public = true
    `;

    if (conditions.length > 0) {
      countSql += ' AND ' + conditions.join(' AND ');
    }

    const countResult = await this.db.query(countSql, params.slice(0, -2));

    return {
      results: searchResult.rows.map(row => ({
        ...this.mapPackageRow(row),
        author: {
          username: row.author_username,
          displayName: row.author_display_name
        },
        latestVersion: row.latest_version,
        lastPublished: row.last_published
      })),
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit: options.limit || 20,
      offset: options.offset || 0,
      query: options as SearchQuery,
      took: 0
    };
  }

  /**
   * Validate package manifest
   */
  async validateManifest(manifest: ModuleManifest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.name) errors.push('Package name is required');
    if (!manifest.version) errors.push('Package version is required');
    if (!manifest.description) errors.push('Package description is required');
    if (!manifest.author) errors.push('Package author is required');
    if (!manifest.license) errors.push('Package license is required');

    // Name validation
    if (manifest.name && !/^[a-z0-9\-_]+$/.test(manifest.name)) {
      errors.push('Package name must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    // Version validation
    if (manifest.version && !semver.valid(manifest.version)) {
      errors.push('Package version must be valid semver');
    }

    // Name conflicts
    if (manifest.name) {
      const existing = await this.getPackageByName(manifest.name);
      if (existing) {
        warnings.push('Package name already exists');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Track package download
   */
  async trackDownload(
    packageId: string,
    version: string,
    userId?: string,
    ip?: string,
    userAgent?: string,
    referrer?: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO package_downloads (package_id, version, user_id, ip, user_agent, referrer)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [packageId, version, userId, ip, userAgent, referrer]);
  }

  /**
   * Track package view (for analytics)
   */
  async trackPackageView(packageId: string, userId?: string): Promise<void> {
    // This would typically be implemented with a separate views table
    // For now, just log it
    this.logger.info('Package viewed', { packageId, userId });
  }

  /**
   * Unpublish package version
   */
  async unpublishVersion(name: string, version: string): Promise<void> {
    await this.db.query(`
      DELETE FROM package_versions
      WHERE package_id = (SELECT id FROM packages WHERE name = $1) 
        AND version = $2
    `, [name, version]);
  }

  /**
   * Deprecate package version
   */
  async deprecateVersion(name: string, version: string, message?: string): Promise<void> {
    await this.db.query(`
      UPDATE package_versions
      SET is_deprecated = true
      WHERE package_id = (SELECT id FROM packages WHERE name = $1) 
        AND version = $2
    `, [name, version]);

    // Optionally update the package itself
    if (message) {
      await this.db.query(`
        UPDATE packages
        SET is_deprecated = true, deprecation_message = $2
        WHERE name = $1
      `, [name, message]);
    }
  }

  private mapPackageRow(row: any): ModulePackage {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      author: row.author_id,
      authorEmail: '', // Would need to join with users table
      homepage: row.homepage,
      repository: row.repository,
      license: row.license,
      keywords: row.keywords || [],
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isPublic: row.is_public,
      isDeprecated: row.is_deprecated,
      deprecationMessage: row.deprecation_message,
      totalDownloads: parseInt(row.total_downloads || '0'),
      weeklyDownloads: parseInt(row.weekly_downloads || '0'),
      monthlyDownloads: parseInt(row.monthly_downloads || '0'),
      averageRating: parseFloat(row.average_rating || '0'),
      ratingsCount: parseInt(row.ratings_count || '0'),
      securityScore: parseInt(row.security_score || '100'),
      securityIssues: [],
      compatibility: {
        platformaVersions: [],
        nodeVersions: [],
        osSupport: {
          windows: true,
          macos: true,
          linux: true
        }
      }
    };
  }

  private mapVersionRow(row: any): ModuleVersion {
    return {
      id: row.id,
      packageId: row.package_id,
      version: row.version,
      tag: row.tag,
      description: row.description,
      changelog: row.changelog,
      tarballUrl: row.tarball_url,
      tarballSize: parseInt(row.tarball_size),
      tarballSha256: row.tarball_sha256,
      manifest: row.manifest,
      dependencies: row.dependencies || {},
      peerDependencies: row.peer_dependencies || {},
      devDependencies: row.dev_dependencies || {},
      isPrerelease: row.is_prerelease,
      isDeprecated: row.is_deprecated,
      securityScore: parseInt(row.security_score || '100'),
      publishedAt: row.published_at,
      downloads: parseInt(row.downloads || '0'),
      publishedBy: row.published_by,
      buildInfo: row.build_info
    };
  }
}