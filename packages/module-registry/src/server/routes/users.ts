import express from 'express';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { ApiResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';
import { AuthenticatedRequest } from '../middleware/auth';

export function createUserRoutes(
  db: DatabaseConnection,
  logger: Logger
) {
  const router = express.Router();

  /**
   * Get current user profile
   */
  router.get('/me', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;

    const result = await db.query(`
      SELECT 
        u.id, u.username, u.email, u.display_name, u.avatar, u.bio,
        u.website, u.github, u.twitter, u.is_verified, u.role,
        u.packages_published, u.total_downloads, u.created_at, u.last_login_at,
        COUNT(p.id) as actual_packages_published,
        COALESCE(SUM(p.total_downloads), 0) as actual_total_downloads
      FROM users u
      LEFT JOIN packages p ON u.id = p.author_id AND p.is_public = true
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const user = result.rows[0];

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatar: user.avatar,
          bio: user.bio,
          website: user.website,
          github: user.github,
          twitter: user.twitter,
          isVerified: user.is_verified,
          role: user.role,
          packagesPublished: parseInt(user.actual_packages_published),
          totalDownloads: parseInt(user.actual_total_downloads),
          createdAt: user.created_at,
          lastLoginAt: user.last_login_at
        }
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Update user profile
   */
  router.put('/me', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const { displayName, bio, website, github, twitter } = req.body;

    // Validate inputs
    const updates: any = {};
    
    if (displayName !== undefined) {
      if (!displayName || displayName.length < 2 || displayName.length > 100) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Display name must be 2-100 characters');
      }
      updates.display_name = displayName;
    }

    if (bio !== undefined) {
      if (bio && bio.length > 500) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Bio must be less than 500 characters');
      }
      updates.bio = bio;
    }

    if (website !== undefined) {
      if (website && !isValidUrl(website)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid website URL');
      }
      updates.website = website;
    }

    if (github !== undefined) {
      if (github && !isValidGithubUsername(github)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid GitHub username');
      }
      updates.github = github;
    }

    if (twitter !== undefined) {
      if (twitter && !isValidTwitterUsername(twitter)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Twitter username');
      }
      updates.twitter = twitter;
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(400, 'NO_UPDATES', 'No valid updates provided');
    }

    updates.updated_at = new Date();

    const updateFields = Object.keys(updates).map((field, index) => `${field} = $${index + 2}`).join(', ');
    const updateValues = Object.values(updates);

    const result = await db.query(`
      UPDATE users 
      SET ${updateFields}
      WHERE id = $1
      RETURNING id, username, email, display_name, avatar, bio, website, github, twitter, is_verified, role, updated_at
    `, [userId, ...updateValues]);

    logger.info('User profile updated', {
      userId,
      username: req.user!.username,
      updatedFields: Object.keys(updates)
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.rows[0]
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get user's packages
   */
  router.get('/me/packages', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(`
      SELECT 
        p.*,
        (
          SELECT json_agg(
            json_build_object(
              'version', version,
              'tag', tag,
              'downloads', downloads,
              'published_at', published_at
            ) ORDER BY published_at DESC
          )
          FROM package_versions pv 
          WHERE pv.package_id = p.id
        ) as versions
      FROM packages p
      WHERE p.author_id = $1
      ORDER BY p.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM packages WHERE author_id = $1',
      [userId]
    );

    const response: ApiResponse = {
      success: true,
      data: {
        packages: result.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get user's download statistics
   */
  router.get('/me/stats', asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const { period = '30d' } = req.query;

    let interval = '30 days';
    switch (period) {
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

    const [overallStats, downloadHistory, topPackages] = await Promise.all([
      // Overall statistics
      db.query(`
        SELECT 
          COUNT(p.id) as total_packages,
          COALESCE(SUM(p.total_downloads), 0) as total_downloads,
          COALESCE(AVG(p.average_rating), 0) as average_rating,
          COUNT(pr.id) as total_ratings
        FROM packages p
        LEFT JOIN package_ratings pr ON p.id = pr.package_id
        WHERE p.author_id = $1 AND p.is_public = true
      `, [userId]),

      // Download history
      db.query(`
        SELECT 
          DATE(pd.downloaded_at) as date,
          COUNT(*) as downloads
        FROM package_downloads pd
        JOIN packages p ON pd.package_id = p.id
        WHERE p.author_id = $1 
          AND pd.downloaded_at >= NOW() - INTERVAL $2
        GROUP BY DATE(pd.downloaded_at)
        ORDER BY date
      `, [userId, interval]),

      // Top packages
      db.query(`
        SELECT 
          name, display_name, total_downloads, average_rating
        FROM packages
        WHERE author_id = $1 AND is_public = true
        ORDER BY total_downloads DESC
        LIMIT 10
      `, [userId])
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        overall: {
          totalPackages: parseInt(overallStats.rows[0]?.total_packages || '0'),
          totalDownloads: parseInt(overallStats.rows[0]?.total_downloads || '0'),
          averageRating: parseFloat(overallStats.rows[0]?.average_rating || '0'),
          totalRatings: parseInt(overallStats.rows[0]?.total_ratings || '0')
        },
        downloadHistory: downloadHistory.rows.map(row => ({
          date: row.date,
          downloads: parseInt(row.downloads)
        })),
        topPackages: topPackages.rows.map(row => ({
          name: row.name,
          displayName: row.display_name,
          totalDownloads: parseInt(row.total_downloads),
          averageRating: parseFloat(row.average_rating)
        }))
      },
      meta: {
        timestamp: new Date(),
        requestId: req.id,
        version: '1.0.0'
      }
    };

    res.json(response);
  }));

  /**
   * Get public user profile
   */
  router.get('/:username', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { username } = req.params;

    const result = await db.query(`
      SELECT 
        u.id, u.username, u.display_name, u.avatar, u.bio,
        u.website, u.github, u.twitter, u.is_verified, u.created_at,
        COUNT(p.id) as packages_published,
        COALESCE(SUM(p.total_downloads), 0) as total_downloads
      FROM users u
      LEFT JOIN packages p ON u.id = p.author_id AND p.is_public = true
      WHERE u.username = $1 AND u.is_active = true
      GROUP BY u.id
    `, [username]);

    if (result.rows.length === 0) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const user = result.rows[0];

    // Get user's public packages
    const packagesResult = await db.query(`
      SELECT 
        p.name, p.display_name, p.description, p.category,
        p.total_downloads, p.average_rating, p.updated_at
      FROM packages p
      WHERE p.author_id = $1 AND p.is_public = true AND p.is_deprecated = false
      ORDER BY p.total_downloads DESC
      LIMIT 10
    `, [user.id]);

    const response: ApiResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatar: user.avatar,
          bio: user.bio,
          website: user.website,
          github: user.github,
          twitter: user.twitter,
          isVerified: user.is_verified,
          packagesPublished: parseInt(user.packages_published),
          totalDownloads: parseInt(user.total_downloads),
          createdAt: user.created_at
        },
        packages: packagesResult.rows.map(row => ({
          name: row.name,
          displayName: row.display_name,
          description: row.description,
          category: row.category,
          totalDownloads: parseInt(row.total_downloads),
          averageRating: parseFloat(row.average_rating),
          updatedAt: row.updated_at
        }))
      },
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

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidGithubUsername(username: string): boolean {
  const githubUsernameRegex = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;
  return githubUsernameRegex.test(username);
}

function isValidTwitterUsername(username: string): boolean {
  const twitterUsernameRegex = /^[A-Za-z0-9_]{1,15}$/;
  return twitterUsernameRegex.test(username.replace('@', ''));
}