import express from 'express';
import { Logger } from 'winston';
import { DatabaseConnection } from '../../database';
import { SearchQuery, SearchResult, ModulePackage, ApiResponse } from '../../types';
import { ApiError, asyncHandler } from '../middleware/error';

export function createSearchRoutes(
  db: DatabaseConnection,
  logger: Logger
) {
  const router = express.Router();

  /**
   * Search packages
   */
  router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
    const {
      q = '',
      category,
      subcategory,
      tags,
      author,
      license,
      minRating,
      minDownloads,
      updatedSince,
      includePrerelease = 'false',
      includeDeprecated = 'false',
      sortBy = 'relevance',
      sortOrder = 'desc',
      limit = 20,
      offset = 0
    } = req.query;

    const searchQuery: SearchQuery = {
      q: q as string,
      category: category as string,
      subcategory: subcategory as string,
      tags: tags ? (tags as string).split(',') : undefined,
      author: author as string,
      license: license as string,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      minDownloads: minDownloads ? parseInt(minDownloads as string) : undefined,
      updatedSince: updatedSince ? new Date(updatedSince as string) : undefined,
      includePrerelease: includePrerelease === 'true',
      includeDeprecated: includeDeprecated === 'true',
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc',
      limit: Math.min(parseInt(limit as string), 100),
      offset: parseInt(offset as string)
    };

    const start = Date.now();
    const result = await performSearch(db, searchQuery);
    const took = Date.now() - start;

    const response: ApiResponse<SearchResult<ModulePackage>> = {
      success: true,
      data: {
        ...result,
        took,
        query: searchQuery
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
   * Search suggestions/autocomplete
   */
  router.get('/suggestions', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { q = '' } = req.query;
    
    if (!q || (q as string).length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    const query = (q as string).toLowerCase().trim();

    // Get package name suggestions
    const packageSuggestions = await db.query(`
      SELECT name, display_name, total_downloads
      FROM packages 
      WHERE is_public = true 
        AND is_deprecated = false
        AND (
          name ILIKE $1 
          OR display_name ILIKE $1
          OR $2 % ANY(keywords::text[])
        )
      ORDER BY total_downloads DESC
      LIMIT 10
    `, [`%${query}%`, query]);

    // Get category suggestions
    const categorySuggestions = await db.query(`
      SELECT name, display_name
      FROM categories 
      WHERE is_active = true 
        AND (name ILIKE $1 OR display_name ILIKE $1)
      ORDER BY sort_order
      LIMIT 5
    `, [`%${query}%`]);

    // Get tag suggestions
    const tagSuggestions = await db.query(`
      SELECT name, display_name, usage_count
      FROM tags 
      WHERE name ILIKE $1 OR display_name ILIKE $1
      ORDER BY usage_count DESC
      LIMIT 5
    `, [`%${query}%`]);

    const response: ApiResponse = {
      success: true,
      data: {
        suggestions: {
          packages: packageSuggestions.rows.map(row => ({
            type: 'package',
            name: row.name,
            displayName: row.display_name,
            downloads: row.total_downloads
          })),
          categories: categorySuggestions.rows.map(row => ({
            type: 'category',
            name: row.name,
            displayName: row.display_name
          })),
          tags: tagSuggestions.rows.map(row => ({
            type: 'tag',
            name: row.name,
            displayName: row.display_name,
            usage: row.usage_count
          }))
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
   * Popular searches
   */
  router.get('/popular', asyncHandler(async (req: express.Request, res: express.Response) => {
    // This would typically come from analytics/search logs
    // For now, return most downloaded packages by category
    const popularByCategory = await db.query(`
      SELECT 
        category,
        json_agg(
          json_build_object(
            'name', name,
            'displayName', display_name,
            'downloads', total_downloads
          ) ORDER BY total_downloads DESC
        ) FILTER (WHERE row_number <= 5) as packages
      FROM (
        SELECT 
          category, name, display_name, total_downloads,
          row_number() OVER (PARTITION BY category ORDER BY total_downloads DESC)
        FROM packages 
        WHERE is_public = true AND is_deprecated = false
      ) ranked
      WHERE row_number <= 5
      GROUP BY category
      ORDER BY category
    `);

    const response: ApiResponse = {
      success: true,
      data: {
        popularByCategory: popularByCategory.rows
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
   * Search filters/facets
   */
  router.get('/filters', asyncHandler(async (req: express.Request, res: express.Response) => {
    const { q = '' } = req.query;
    
    // Get available filters based on search results
    let whereClause = 'WHERE is_public = true';
    let params: any[] = [];
    
    if (q) {
      whereClause += ' AND search_vector @@ plainto_tsquery($1)';
      params.push(q);
    }

    const filters = await db.query(`
      SELECT 
        json_build_object(
          'categories', (
            SELECT json_object_agg(category, count)
            FROM (
              SELECT category, COUNT(*) as count
              FROM packages ${whereClause}
              GROUP BY category
              ORDER BY count DESC
            ) cat_counts
          ),
          'licenses', (
            SELECT json_object_agg(license, count)
            FROM (
              SELECT license, COUNT(*) as count
              FROM packages ${whereClause}
              GROUP BY license
              ORDER BY count DESC
              LIMIT 20
            ) lic_counts
          ),
          'authors', (
            SELECT json_object_agg(u.username, count)
            FROM (
              SELECT author_id, COUNT(*) as count
              FROM packages ${whereClause}
              GROUP BY author_id
              ORDER BY count DESC
              LIMIT 20
            ) auth_counts
            JOIN users u ON u.id = auth_counts.author_id
          ),
          'tags', (
            SELECT json_object_agg(t.name, t.usage_count)
            FROM tags t
            WHERE t.usage_count > 0
            ORDER BY t.usage_count DESC
            LIMIT 30
          )
        ) as filters
    `, params);

    const response: ApiResponse = {
      success: true,
      data: filters.rows[0]?.filters || {},
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

async function performSearch(
  db: DatabaseConnection,
  query: SearchQuery
): Promise<SearchResult<ModulePackage>> {
  let sql = `
    SELECT 
      p.*,
      u.username as author_username,
      u.display_name as author_display_name,
      COALESCE(v.latest_version, '') as latest_version,
      COALESCE(v.published_at, p.created_at) as last_published,
      CASE 
        WHEN $1 != '' THEN ts_rank_cd(p.search_vector, plainto_tsquery($1))
        ELSE 0
      END as relevance_score
    FROM packages p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN (
      SELECT 
        package_id,
        version as latest_version,
        published_at,
        row_number() OVER (PARTITION BY package_id ORDER BY published_at DESC) as rn
      FROM package_versions
    ) v ON p.id = v.package_id AND v.rn = 1
    WHERE p.is_public = true
  `;

  const params: any[] = [query.q || ''];
  let paramCount = 1;

  // Build WHERE conditions
  const conditions: string[] = [];

  if (!query.includeDeprecated) {
    conditions.push('p.is_deprecated = false');
  }

  if (query.q && query.q.trim()) {
    conditions.push('p.search_vector @@ plainto_tsquery($1)');
  }

  if (query.category) {
    conditions.push(`p.category = $${++paramCount}`);
    params.push(query.category);
  }

  if (query.subcategory) {
    conditions.push(`p.subcategory = $${++paramCount}`);
    params.push(query.subcategory);
  }

  if (query.author) {
    conditions.push(`u.username ILIKE $${++paramCount}`);
    params.push(`%${query.author}%`);
  }

  if (query.license) {
    conditions.push(`p.license = $${++paramCount}`);
    params.push(query.license);
  }

  if (query.minRating) {
    conditions.push(`p.average_rating >= $${++paramCount}`);
    params.push(query.minRating);
  }

  if (query.minDownloads) {
    conditions.push(`p.total_downloads >= $${++paramCount}`);
    params.push(query.minDownloads);
  }

  if (query.updatedSince) {
    conditions.push(`p.updated_at >= $${++paramCount}`);
    params.push(query.updatedSince);
  }

  if (query.tags && query.tags.length > 0) {
    conditions.push(`p.tags @> $${++paramCount}`);
    params.push(JSON.stringify(query.tags));
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  // Build ORDER BY
  let orderBy = '';
  switch (query.sortBy) {
    case 'relevance':
      orderBy = query.q ? 'relevance_score DESC, p.total_downloads DESC' : 'p.total_downloads DESC';
      break;
    case 'downloads':
      orderBy = `p.total_downloads ${query.sortOrder?.toUpperCase() || 'DESC'}`;
      break;
    case 'rating':
      orderBy = `p.average_rating ${query.sortOrder?.toUpperCase() || 'DESC'}, p.total_downloads DESC`;
      break;
    case 'updated':
      orderBy = `p.updated_at ${query.sortOrder?.toUpperCase() || 'DESC'}`;
      break;
    case 'created':
      orderBy = `p.created_at ${query.sortOrder?.toUpperCase() || 'DESC'}`;
      break;
    case 'name':
      orderBy = `p.name ${query.sortOrder?.toUpperCase() || 'ASC'}`;
      break;
    default:
      orderBy = 'p.total_downloads DESC';
  }

  sql += ` ORDER BY ${orderBy}`;

  // Add pagination
  sql += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
  params.push(query.limit || 20, query.offset || 0);

  // Execute search query
  const searchResult = await db.query(sql, params);

  // Get total count (for pagination)
  let countSql = `
    SELECT COUNT(*) as total
    FROM packages p
    JOIN users u ON p.author_id = u.id
    WHERE p.is_public = true
  `;

  if (conditions.length > 0) {
    countSql += ' AND ' + conditions.join(' AND ');
  }

  const countResult = await db.query(countSql, params.slice(0, -2)); // Remove limit and offset

  // Get aggregations
  const aggregationsResult = await db.query(`
    SELECT 
      json_build_object(
        'categories', (
          SELECT json_object_agg(category, count)
          FROM (
            SELECT category, COUNT(*) as count
            FROM packages p
            JOIN users u ON p.author_id = u.id
            WHERE p.is_public = true ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
            GROUP BY category
          ) cat_agg
        ),
        'authors', (
          SELECT json_object_agg(u.username, count)
          FROM (
            SELECT p.author_id, COUNT(*) as count
            FROM packages p
            JOIN users u ON p.author_id = u.id
            WHERE p.is_public = true ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
            GROUP BY p.author_id
            ORDER BY count DESC
            LIMIT 20
          ) auth_agg
          JOIN users u ON u.id = auth_agg.author_id
        ),
        'licenses', (
          SELECT json_object_agg(license, count)
          FROM (
            SELECT license, COUNT(*) as count
            FROM packages p
            JOIN users u ON p.author_id = u.id
            WHERE p.is_public = true ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
            GROUP BY license
          ) lic_agg
        )
      ) as aggregations
  `, params.slice(0, -2));

  return {
    results: searchResult.rows,
    total: parseInt(countResult.rows[0]?.total || '0'),
    limit: query.limit || 20,
    offset: query.offset || 0,
    query,
    took: 0, // Will be set by caller
    aggregations: aggregationsResult.rows[0]?.aggregations || {}
  };
}