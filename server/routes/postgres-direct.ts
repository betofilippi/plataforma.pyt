import { Request, Response } from 'express'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const { Pool } = pg

// PostgreSQL connection pool - Connection Pooler + rate limiting
const pool = new Pool({
  connectionString: 'postgresql://postgres:Bdebola2025@@db.yhvtsbkotszxqndkhhhx.supabase.co:6543/postgres', // Porta 6543 = Connection Pooler
  ssl: {
    rejectUnauthorized: false
  },
  max: 5, // Máximo 5 conexões simultâneas
  idleTimeoutMillis: 10000, // 10 segundos idle timeout
  connectionTimeoutMillis: 5000 // 5 segundos connection timeout
})

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://yhvtsbkotszxqndkhhhx.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodnRzYmtvdHN6eHFuZGtoaGh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkyMjI4NywiZXhwIjoyMDY1NDk4Mjg3fQ.Th-2FJSbwJPZmDrF9qWYGxmigIUvymNP_TCQMIuQ_Ac'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Cache em memória para reduzir requisições
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Função para limpar todo o cache
export function clearAllCache() {
  cache.clear()
  console.log('🧹 Cache limpo completamente')
}

// Rate limiting: máximo 100 requests por minuto (mais generoso)
const rateLimiter = new Map<string, { count: number; resetTime: number }>()

// Função para verificar rate limit
function checkRateLimit(ip: string): boolean {
  // Em desenvolvimento, skip rate limiting para localhost
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment && (ip === '::1' || ip === '127.0.0.1' || ip === 'unknown' || ip?.includes('::ffff:127.0.0.1'))) {
    return true; // Sem limites para localhost em dev
  }
  
  const now = Date.now()
  const limit = rateLimiter.get(ip)
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + 60000 }) // Reset em 1 minuto
    return true
  }
  
  if (limit.count >= 100) {
    return false // Rate limit excedido (100 req/min)
  }
  
  limit.count++
  return true
}

// Função para cache
function getFromCache(key: string): any | null {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: any, ttlSeconds: number = 300): void { // 5 minutos por padrão
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000
  })
  
  // Limpar cache antigo (máximo 100 itens)
  if (cache.size > 100) {
    const oldest = Array.from(cache.keys())[0]
    cache.delete(oldest)
  }
}

/**
 * Execute PostgreSQL query directly
 * This provides the most integrated connection possible with Supabase PostgreSQL
 */
export async function executePostgresQuery(req: Request, res: Response) {
  const { query, params } = req.body
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }
  
  try {
    console.log('Executing PostgreSQL query:', query.substring(0, 100) + '...')
    if (params) {
      console.log('With params:', params.map((p: any) => typeof p === 'string' && p.length > 100 ? p.substring(0, 100) + '...' : p))
    }
    
    const result = params ? await pool.query(query, params) : await pool.query(query)
    
    // Return in format expected by frontend
    return res.json({
      rows: result.rows || [],
      rowCount: result.rowCount,
      command: result.command,
      data: result.rows || [], // For compatibility
      error: null
    })
  } catch (error: any) {
    console.error('PostgreSQL query error:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message,
      detail: error.detail || undefined
    })
  }
}

/**
 * List all schemas in the database
 */
export async function listPostgresSchemas(req: Request, res: Response) {
  const clientIp = req.ip || 'unknown'
  
  // Verificar rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait 1 minute.',
      retryAfter: 60
    })
  }
  
  // SEMPRE buscar direto do banco para evitar schemas deletados no cache
  // Removido verificação de cache para schemas
  
  try {
    // Lista TODOS os schemas dos módulos (incluindo os novos)
    const query = `
      SELECT 
        schema_name,
        COUNT(table_name) as table_count
      FROM information_schema.schemata s
      LEFT JOIN information_schema.tables t ON t.table_schema = s.schema_name
        AND t.table_type = 'BASE TABLE'
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'auth', 'extensions', 'storage', 'vault', 'realtime', 'graphql', 'graphql_public', 'pgbouncer', 'supabase_migrations', 'cron')
        AND schema_name NOT LIKE 'pg_toast_temp%'
        AND schema_name NOT LIKE 'pg_temp%'
      GROUP BY schema_name
      ORDER BY 
        CASE
          WHEN schema_name = 'public' THEN 1
          WHEN schema_name = 'plataforma_core' THEN 2
          WHEN schema_name = 'plataforma' THEN 3
          WHEN schema_name = 'estoque' THEN 4
          WHEN schema_name = 'montagem' THEN 5
          WHEN schema_name = 'vendas' THEN 6
          WHEN schema_name = 'faturamento' THEN 7
          WHEN schema_name = 'expedicao' THEN 8
          WHEN schema_name = 'rh' THEN 9
          WHEN schema_name = 'administrativo' THEN 10
          WHEN schema_name = 'suporte' THEN 11
          WHEN schema_name = 'comunicacao' THEN 12
          WHEN schema_name = 'juridico' THEN 13
          WHEN schema_name = 'financeiro' THEN 14
          WHEN schema_name = 'tributario' THEN 15
          WHEN schema_name = 'marketing' THEN 16
          WHEN schema_name = 'produtos' THEN 17
          WHEN schema_name = 'lojas' THEN 18
          WHEN schema_name = 'cadastros' THEN 19
          WHEN schema_name = 'notificacoes' THEN 20
          WHEN schema_name = 'ia' THEN 21
          WHEN schema_name = 'database' THEN 22
          WHEN schema_name = 'sistema' THEN 23
          ELSE 5
        END,
        schema_name
    `
    
    console.log('🔍 Buscando schemas ativos no banco...')
    const result = await pool.query(query)
    
    // NÃO cachear schemas para evitar mostrar schemas deletados
    console.log(`✅ Retornando ${result.rows.length} schemas ativos`)
    
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error listing schemas:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * List all tables in the database with row counts
 */
export async function listPostgresTables(req: Request, res: Response) {
  const clientIp = req.ip || 'unknown'
  
  // Verificar rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please wait 1 minute.',
      retryAfter: 60
    })
  }
  
  try {
    // Get schemas from query parameter (comma-separated)
    const { schemas, noCache, _t } = req.query
    let schemaFilter = ''
    let params: any[] = []
    
    if (schemas && typeof schemas === 'string') {
      const schemaList = schemas.split(',').map(s => s.trim()).filter(s => s.length > 0)
      if (schemaList.length > 0) {
        const placeholders = schemaList.map((_, index) => `$${index + 1}`).join(',')
        schemaFilter = `AND t.table_schema IN (${placeholders})`
        params = schemaList
      }
    } else {
      // Default to public if no schemas specified
      schemaFilter = `AND t.table_schema = $1`
      params = ['public']
    }
    
    // Verificar cache APENAS se não for refresh (noCache ou _t indica refresh)
    const skipCache = noCache === 'true' || _t !== undefined
    if (!skipCache) {
      const cacheKey = `tables:${schemas || 'public'}`
      const cached = getFromCache(cacheKey)
      if (cached) {
        console.log('🚀 Retornando tabelas do cache')
        return res.json(cached)
      }
    } else {
      console.log('🔄 Bypass de cache - buscando direto do banco')
    }
    
    // Get tables with estimated row counts
    const query = `
      SELECT 
        t.table_name as name,
        t.table_name as id,
        t.table_schema as schema,
        COALESCE(s.n_live_tup, 0) as live_rows_estimate
      FROM information_schema.tables t
      LEFT JOIN pg_stat_user_tables s ON s.schemaname = t.table_schema 
        AND s.relname = t.table_name
      WHERE t.table_type = 'BASE TABLE'
      ${schemaFilter}
      ORDER BY t.table_schema, t.table_name
    `
    
    console.log('🔍 Buscando tabelas no banco...')
    const result = await pool.query(query, params)
    
    // Cache por 5 minutos APENAS se não for refresh
    if (!skipCache) {
      const cacheKey = `tables:${schemas || 'public'}`
      setCache(cacheKey, result.rows, 300)
      console.log('💾 Tabelas cacheadas por 5 minutos')
    } else {
      console.log('⚡ Tabelas NÃO cacheadas (refresh forçado)')
    }
    
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error listing tables:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Get table schema
 */
export async function getTableSchema(req: Request, res: Response) {
  const { tableName } = req.params
  const { schema = 'public' } = req.query
  
  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' })
  }
  
  try {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
      ORDER BY ordinal_position
    `
    
    const result = await pool.query(query, [schema, tableName])
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error getting table schema:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Get table data with enhanced pagination and performance
 */
export async function getTableData(req: Request, res: Response) {
  const { tableName } = req.params
  const { 
    limit = 100, 
    offset = 0, 
    schema = 'public',
    page = 1,  // Suporte para paginação por página
    sortBy,    // Coluna para ordenação
    sortOrder = 'ASC', // Direção da ordenação
    search,    // Busca global
    lazy = 'false' // Se true, não retorna count total (mais rápido)
  } = req.query
  
  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' })
  }
  
  try {
    // Sanitize table name and schema to prevent SQL injection
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '')
    const safeSchema = (schema as string).replace(/[^a-zA-Z0-9_]/g, '')
    
    // Calcular offset baseado na página se fornecida
    const pageNum = parseInt(page as string) || 1
    const limitNum = parseInt(limit as string) || 100
    const offsetNum = page ? (pageNum - 1) * limitNum : parseInt(offset as string) || 0
    
    // PRIMEIRO: Buscar colunas na ordem correta (ordinal_position)
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2 
      ORDER BY ordinal_position
    `
    const columnsResult = await pool.query(columnsQuery, [safeSchema, safeTableName])
    const columns = columnsResult.rows
    const columnNames = columns.map((r: any) => r.column_name)
    
    // SEGUNDO: Buscar dados com colunas explícitas e linhas ordenadas
    // Usar aspas duplas para nomes de colunas que podem ter caracteres especiais
    const columnsList = columnNames.map((c: string) => `"${c}"`).join(', ')
    
    // Construir cláusula ORDER BY
    let orderByClause = ''
    if (sortBy && columnNames.includes(sortBy as string)) {
      const safeSortOrder = (sortOrder as string).toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
      orderByClause = `ORDER BY "${sortBy}" ${safeSortOrder}`
    } else if (columnNames.includes('id')) {
      orderByClause = 'ORDER BY id ASC'
    }
    
    // Construir cláusula WHERE para busca
    let whereClause = ''
    const queryParams: any[] = [limitNum, offsetNum]
    
    if (search) {
      // Busca em todas as colunas de texto
      const textColumns = columns
        .filter((c: any) => ['text', 'varchar', 'character varying', 'char'].includes(c.data_type))
        .map((c: any) => `"${c.column_name}"::text ILIKE $${queryParams.length + 1}`)
      
      if (textColumns.length > 0) {
        queryParams.push(`%${search}%`)
        whereClause = `WHERE ${textColumns.join(' OR ')}`
      }
    }
    
    const dataQuery = `
      SELECT ${columnsList} 
      FROM "${safeSchema}"."${safeTableName}"
      ${whereClause}
      ${orderByClause}
      LIMIT $1 OFFSET $2
    `
    
    const result = await pool.query(dataQuery, queryParams)
    
    // Get total count apenas se não for lazy loading
    let totalCount = null
    if (lazy !== 'true') {
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM "${safeSchema}"."${safeTableName}"
        ${whereClause}
      `
      const countParams = search ? [`%${search}%`] : []
      const countResult = await pool.query(countQuery, countParams)
      totalCount = parseInt(countResult.rows[0].total)
    }
    
    // LOG DEBUG: Verificar valores vazios vs NULL
    if (tableName === 'test_files' && result.rows.length > 0) {
      console.log('🔍 DEBUG test_files - primeira linha do PostgreSQL:');
      const firstRow = result.rows[0];
      Object.entries(firstRow).forEach(([key, value]) => {
        console.log(`  ${key}:`, {
          value: value,
          type: typeof value,
          isNull: value === null,
          isEmpty: value === '',
          stringified: JSON.stringify(value)
        });
      });
    }
    
    return res.json({
      rows: result.rows,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      offset: offsetNum,
      columnOrder: columnNames,  // IMPORTANTE: enviar ordem das colunas
      hasMore: lazy === 'true' ? result.rows.length === limitNum : null,
      totalPages: totalCount ? Math.ceil(totalCount / limitNum) : null
    })
  } catch (error: any) {
    console.error('Error getting table data:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Get table relationships (foreign keys)
 */
export async function getTableRelationships(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        tc.table_schema AS from_schema,
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_schema AS to_schema,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_schema, tc.table_name;
    `
    
    const result = await pool.query(query)
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error getting relationships:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Get table metadata (column type hints)
 */
export async function getTableMetadata(req: Request, res: Response) {
  const { schema = 'public', table } = req.query
  
  if (!table) {
    return res.status(400).json({ error: 'Table name is required' })
  }
  
  try {
    const query = `
      SELECT * FROM plataforma_core.column_metadata 
      WHERE schema_name = $1 AND table_name = $2
      ORDER BY column_name
    `
    
    const result = await pool.query(query, [schema, table])
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error getting table metadata:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Save column metadata
 */
export async function saveColumnMetadata(req: Request, res: Response) {
  const {
    schema_name,
    table_name,
    column_name,
    type_hint,
    format_options,
    validation_rules,
    editor_type,
    confidence,
    is_auto_detected,
    updated_by
  } = req.body
  
  if (!schema_name || !table_name || !column_name || !type_hint) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  
  try {
    const query = `
      INSERT INTO plataforma_core.column_metadata (
        schema_name, table_name, column_name, type_hint,
        format_options, validation_rules, editor_type,
        confidence, is_auto_detected, updated_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (schema_name, table_name, column_name) 
      DO UPDATE SET
        type_hint = EXCLUDED.type_hint,
        format_options = EXCLUDED.format_options,
        validation_rules = EXCLUDED.validation_rules,
        editor_type = EXCLUDED.editor_type,
        confidence = EXCLUDED.confidence,
        is_auto_detected = EXCLUDED.is_auto_detected,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `
    
    const result = await pool.query(query, [
      schema_name, table_name, column_name, type_hint,
      format_options, validation_rules, editor_type,
      confidence || 1.0, is_auto_detected || false, updated_by,
      new Date().toISOString()
    ])
    
    return res.json(result.rows[0])
  } catch (error: any) {
    console.error('Error saving column metadata:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Get table structure (columns info)
 */
export async function getTableStructure(req: Request, res: Response) {
  const { schema = 'public', table } = req.query
  
  if (!table) {
    return res.status(400).json({ error: 'Table name is required' })
  }
  
  try {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = $1
      AND table_name = $2
      ORDER BY ordinal_position
    `
    
    const result = await pool.query(query, [schema, table])
    return res.json(result.rows)
  } catch (error: any) {
    console.error('Error getting table structure:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Clear all cache - for maintenance
 */
export async function clearCache(req: Request, res: Response) {
  try {
    clearAllCache()
    return res.json({
      success: true,
      message: 'Cache cleared successfully'
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

/**
 * Test database connection
 */
export async function testPostgresConnection(req: Request, res: Response) {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version')
    return res.json({
      connected: true,
      ...result.rows[0]
    })
  } catch (error: any) {
    console.error('Connection test failed:', error.message)
    return res.status(500).json({
      connected: false,
      error: error.message
    })
  }
}

/**
 * Save custom relationship metadata
 */
export async function saveRelationship(req: Request, res: Response) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMITED'
    })
  }

  try {
    const {
      fromSchema,
      fromTable,
      fromColumn,
      toSchema,
      toTable,
      toColumn,
      relationshipType = '1:N',
      color = '#8B5CF6'
    } = req.body

    if (!fromSchema || !fromTable || !fromColumn || !toSchema || !toTable || !toColumn) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fromSchema', 'fromTable', 'fromColumn', 'toSchema', 'toTable', 'toColumn']
      })
    }

    const query = `
      INSERT INTO relationship_metadata (
        from_schema, from_table, from_column,
        to_schema, to_table, to_column,
        relationship_type, color
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (from_schema, from_table, from_column, to_schema, to_table, to_column)
      DO UPDATE SET
        relationship_type = EXCLUDED.relationship_type,
        color = EXCLUDED.color,
        is_active = true,
        updated_at = now()
      RETURNING id, created_at, updated_at
    `

    const result = await pool.query(query, [
      fromSchema, fromTable, fromColumn,
      toSchema, toTable, toColumn,
      relationshipType, color
    ])

    return res.json({
      success: true,
      relationship: {
        id: result.rows[0].id,
        fromSchema,
        fromTable,
        fromColumn,
        toSchema,
        toTable,
        toColumn,
        relationshipType,
        color,
        isActive: true,
        ...result.rows[0]
      }
    })

  } catch (error: any) {
    console.error('Error saving relationship:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Load custom relationships for specific tables
 */
export async function loadRelationships(req: Request, res: Response) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMITED'
    })
  }

  try {
    const { schemas, tables } = req.query

    let query = `
      SELECT 
        id,
        from_schema,
        from_table,
        from_column,
        to_schema,
        to_table,
        to_column,
        relationship_type,
        color,
        is_active,
        created_at,
        updated_at
      FROM relationship_metadata
      WHERE is_active = true
    `

    const params: any[] = []

    // Filter by schemas if provided
    if (schemas) {
      const schemaList = Array.isArray(schemas) ? schemas : [schemas]
      query += ` AND (from_schema = ANY($${params.length + 1}) OR to_schema = ANY($${params.length + 1}))`
      params.push(schemaList)
    }

    // Filter by tables if provided
    if (tables) {
      const tableList = Array.isArray(tables) ? tables : [tables]
      query += ` AND (
        (from_schema || '.' || from_table) = ANY($${params.length + 1}) OR
        (to_schema || '.' || to_table) = ANY($${params.length + 1})
      )`
      params.push(tableList)
    }

    query += ` ORDER BY created_at DESC`

    const result = await pool.query(query, params)

    // Transform to match frontend format
    const relationships = result.rows.map(row => ({
      id: row.id,
      fromTable: `${row.from_schema}.${row.from_table}`,
      fromColumn: row.from_column,
      toTable: `${row.to_schema}.${row.to_table}`,
      toColumn: row.to_column,
      type: row.relationship_type,
      color: row.color,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return res.json({
      success: true,
      relationships
    })

  } catch (error: any) {
    // Silently return empty array if table doesn't exist
    if (error.message.includes('relationship_metadata') && error.message.includes('does not exist')) {
      return res.json({
        success: true,
        data: [],
        count: 0
      })
    }
    
    // For other errors, still log
    console.error('Error loading relationships:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

/**
 * Delete custom relationship
 */
export async function deleteRelationship(req: Request, res: Response) {
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
  
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMITED'
    })
  }

  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        error: 'Relationship ID is required'
      })
    }

    const query = `
      UPDATE relationship_metadata 
      SET is_active = false, updated_at = now()
      WHERE id = $1
      RETURNING id
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Relationship not found'
      })
    }

    return res.json({
      success: true,
      message: 'Relationship deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting relationship:', error.message)
    return res.status(500).json({
      error: 'Database error',
      message: error.message
    })
  }
}

