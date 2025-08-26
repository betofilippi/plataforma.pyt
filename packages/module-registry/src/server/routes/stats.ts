import express from 'express';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { RegistryStats, ApiResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';

export function createStatsRoutes(
  db: DatabaseConnection,
  logger: Logger
) {
  const router = express.Router();

  /**
   * Get registry statistics
   */
  router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
    const stats = await getRegistryStats(db);

    const response: ApiResponse<RegistryStats> = {
      success: true,
      data: stats,
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get package statistics
   */
  router.get('/packages/:name', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { name } = req.params;
    const { period = '30d' } = req.query;

    const packageStats = await getPackageStats(db, name, period as string);

    if (!packageStats) {
      throw new ApiError(404, 'PACKAGE_NOT_FOUND', `Package ${name} not found`);
    }

    const response: ApiResponse = {
      success: true,
      data: packageStats,
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get download statistics
   */
  router.get('/downloads', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { 
      period = '30d',
      groupBy = 'day',
      packages
    } = req.query;

    const downloadStats = await getDownloadStats(
      db, 
      period as string, 
      groupBy as string,
      packages ? (packages as string).split(',') : undefined
    );

    const response: ApiResponse = {
      success: true,
      data: downloadStats,
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get trending packages
   */
  router.get('/trending', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { 
      period = '7d',
      limit = 20,
      category
    } = req.query;

    const trending = await getTrendingPackages(
      db,
      period as string,
      parseInt(limit as string),
      category as string
    );

    const response: ApiResponse = {
      success: true,
      data: { packages: trending },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get category statistics
   */
  router.get('/categories', asyncHandler(async (req: express.Request, res: express.Response) => {
    const categoryStats = await db.query(`
      SELECT 
        c.name,
        c.display_name,
        c.description,
        c.icon,
        c.color,
        COALESCE(pkg_stats.package_count, 0) as package_count,
        COALESCE(pkg_stats.total_downloads, 0) as total_downloads,
        COALESCE(pkg_stats.avg_rating, 0) as average_rating
      FROM categories c
      LEFT JOIN (
        SELECT 
          category,
          COUNT(*) as package_count,
          SUM(total_downloads) as total_downloads,
          AVG(average_rating) as avg_rating
        FROM packages 
        WHERE is_public = true AND is_deprecated = false
        GROUP BY category
      ) pkg_stats ON c.name = pkg_stats.category
      WHERE c.is_active = true
      ORDER BY c.sort_order, pkg_stats.package_count DESC
    `);

    const response: ApiResponse = {
      success: true,
      data: { categories: categoryStats.rows },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  return router;
}

async function getRegistryStats(db: DatabaseConnection): Promise<RegistryStats> {
  // Try to get cached stats from materialized view
  try {
    const cachedStats = await db.query('SELECT * FROM registry_stats');
    if (cachedStats.rows.length > 0) {
      const stats = cachedStats.rows[0];
      return {
        totalPackages: stats.total_packages,
        totalVersions: stats.total_versions,
        totalDownloads: parseInt(stats.total_downloads),
        totalUsers: stats.total_users,
        packagesByCategory: stats.packages_by_category || {},
        downloadsToday: parseInt(stats.downloads_today),
        downloadsThisWeek: parseInt(stats.downloads_this_week),
        downloadsThisMonth: parseInt(stats.downloads_this_month),
        popularPackages: [],
        recentPackages: [],
        topAuthors: []
      };
    }
  } catch (error) {
    // Materialized view might not exist, fallback to real-time queries
  }

  // Fallback to real-time calculation
  const [
    packageCount,
    versionCount,
    downloadCount,
    userCount,
    packagesByCategory,
    popularPackages,
    recentPackages,
    topAuthors
  ] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM packages WHERE is_public = true'),
    db.query('SELECT COUNT(*) as count FROM package_versions pv JOIN packages p ON pv.package_id = p.id WHERE p.is_public = true'),
    db.query('SELECT COALESCE(SUM(total_downloads), 0) as total FROM packages WHERE is_public = true'),
    db.query('SELECT COUNT(*) as count FROM users WHERE is_active = true'),
    db.query(`
      SELECT category, COUNT(*) as count
      FROM packages 
      WHERE is_public = true 
      GROUP BY category
    `),
    db.query(`
      SELECT name, total_downloads as downloads
      FROM packages 
      WHERE is_public = true AND is_deprecated = false
      ORDER BY total_downloads DESC
      LIMIT 10
    `),
    db.query(`
      SELECT p.name, pv.version, pv.published_at
      FROM packages p
      JOIN package_versions pv ON p.id = pv.package_id
      WHERE p.is_public = true
      ORDER BY pv.published_at DESC
      LIMIT 10
    `),
    db.query(`
      SELECT 
        u.username,
        COUNT(p.id) as packages,
        COALESCE(SUM(p.total_downloads), 0) as downloads
      FROM users u
      JOIN packages p ON u.id = p.author_id
      WHERE p.is_public = true
      GROUP BY u.id, u.username
      ORDER BY packages DESC, downloads DESC
      LIMIT 10
    `)
  ]);

  const packagesByCategoryObj: Record<string, number> = {};
  packagesByCategory.rows.forEach(row => {
    packagesByCategoryObj[row.category] = parseInt(row.count);
  });

  return {
    totalPackages: parseInt(packageCount.rows[0]?.count || '0'),
    totalVersions: parseInt(versionCount.rows[0]?.count || '0'),
    totalDownloads: parseInt(downloadCount.rows[0]?.total || '0'),
    totalUsers: parseInt(userCount.rows[0]?.count || '0'),
    packagesByCategory: packagesByCategoryObj,
    downloadsToday: 0, // Would need download tracking
    downloadsThisWeek: 0,
    downloadsThisMonth: 0,
    popularPackages: popularPackages.rows.map(row => ({
      name: row.name,
      downloads: parseInt(row.downloads)
    })),
    recentPackages: recentPackages.rows.map(row => ({
      name: row.name,
      version: row.version,
      publishedAt: row.published_at
    })),
    topAuthors: topAuthors.rows.map(row => ({
      username: row.username,
      packages: parseInt(row.packages),
      downloads: parseInt(row.downloads)
    }))
  };
}

async function getPackageStats(db: DatabaseConnection, packageName: string, period: string) {
  // Get package info
  const packageResult = await db.query(`
    SELECT id, name, display_name, total_downloads, average_rating, created_at
    FROM packages 
    WHERE name = $1 AND is_public = true
  `, [packageName]);

  if (packageResult.rows.length === 0) {
    return null;
  }

  const pkg = packageResult.rows[0];

  // Get download history
  const downloadHistory = await db.query(`
    SELECT 
      DATE(downloaded_at) as date,
      COUNT(*) as downloads
    FROM package_downloads
    WHERE package_id = $1 
      AND downloaded_at >= NOW() - INTERVAL '${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '365 days'}'
    GROUP BY DATE(downloaded_at)
    ORDER BY date
  `, [pkg.id]);

  // Get version stats
  const versionStats = await db.query(`
    SELECT version, downloads, published_at
    FROM package_versions
    WHERE package_id = $1
    ORDER BY published_at DESC
  `, [pkg.id]);

  return {
    package: {
      id: pkg.id,
      name: pkg.name,
      displayName: pkg.display_name,
      totalDownloads: parseInt(pkg.total_downloads),
      averageRating: parseFloat(pkg.average_rating),
      createdAt: pkg.created_at
    },
    downloadHistory: downloadHistory.rows.map(row => ({
      date: row.date,
      downloads: parseInt(row.downloads)
    })),
    versions: versionStats.rows.map(row => ({
      version: row.version,
      downloads: parseInt(row.downloads),
      publishedAt: row.published_at
    }))
  };
}

async function getDownloadStats(
  db: DatabaseConnection, 
  period: string, 
  groupBy: string,
  packages?: string[]
) {
  let interval = '30 days';
  let dateFormat = 'YYYY-MM-DD';
  
  switch (period) {
    case '24h':
      interval = '24 hours';
      dateFormat = 'YYYY-MM-DD HH24:00:00';
      break;
    case '7d':
      interval = '7 days';
      break;
    case '90d':
      interval = '90 days';
      break;
    case '1y':
      interval = '365 days';
      break;
  }

  let whereClause = '';
  let params: any[] = [];
  
  if (packages && packages.length > 0) {
    whereClause = 'AND p.name = ANY($2)';
    params = [interval, packages];
  } else {
    params = [interval];
  }

  const result = await db.query(`
    SELECT 
      TO_CHAR(pd.downloaded_at, '${dateFormat}') as period,
      COUNT(*) as downloads,
      COUNT(DISTINCT pd.package_id) as unique_packages,
      COUNT(DISTINCT pd.ip) as unique_ips
    FROM package_downloads pd
    JOIN packages p ON pd.package_id = p.id
    WHERE pd.downloaded_at >= NOW() - INTERVAL $1
      ${whereClause}
    GROUP BY TO_CHAR(pd.downloaded_at, '${dateFormat}')
    ORDER BY period
  `, params);

  return {
    period,
    groupBy,
    data: result.rows.map(row => ({
      period: row.period,
      downloads: parseInt(row.downloads),
      uniquePackages: parseInt(row.unique_packages),
      uniqueUsers: parseInt(row.unique_ips)
    }))
  };
}

async function getTrendingPackages(
  db: DatabaseConnection,
  period: string,
  limit: number,
  category?: string
) {
  let interval = '7 days';
  switch (period) {
    case '24h':
      interval = '24 hours';
      break;
    case '30d':
      interval = '30 days';
      break;
  }

  let categoryFilter = '';
  let params: any[] = [interval, limit];
  
  if (category) {
    categoryFilter = 'AND p.category = $3';
    params.push(category);
  }

  const result = await db.query(`
    SELECT 
      p.id,
      p.name,
      p.display_name,
      p.description,
      p.category,
      p.total_downloads,
      p.average_rating,
      u.username as author,
      recent_downloads.count as recent_downloads,
      CASE 
        WHEN p.total_downloads > 0 THEN 
          (recent_downloads.count::float / p.total_downloads * 100)
        ELSE 0
      END as growth_rate
    FROM packages p
    JOIN users u ON p.author_id = u.id
    JOIN (
      SELECT 
        package_id,
        COUNT(*) as count
      FROM package_downloads
      WHERE downloaded_at >= NOW() - INTERVAL $1
      GROUP BY package_id
      HAVING COUNT(*) > 0
    ) recent_downloads ON p.id = recent_downloads.package_id
    WHERE p.is_public = true 
      AND p.is_deprecated = false
      ${categoryFilter}
    ORDER BY recent_downloads.count DESC, growth_rate DESC
    LIMIT $2
  `, params);

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category,
    author: row.author,
    totalDownloads: parseInt(row.total_downloads),
    recentDownloads: parseInt(row.recent_downloads),
    growthRate: parseFloat(row.growth_rate),
    averageRating: parseFloat(row.average_rating)
  }));
}