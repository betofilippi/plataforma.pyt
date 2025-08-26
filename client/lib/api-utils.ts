/**
 * API Utilities - Sistema anti-rate limiting
 */

// Cache em memória do frontend
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Debounce para requisições
const debounceMap = new Map<string, NodeJS.Timeout>()

// Rate limiting interno - máximo 5 requests por segundo
const rateLimiter = new Map<string, { count: number; resetTime: number }>()

/**
 * Verifica se pode fazer requisição (rate limiting interno)
 */
function canMakeRequest(endpoint: string): boolean {
  const now = Date.now()
  const key = endpoint
  const limit = rateLimiter.get(key)
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(key, { count: 1, resetTime: now + 1000 }) // Reset em 1 segundo
    return true
  }
  
  if (limit.count >= 5) {
    console.warn(`🚫 Rate limit interno: ${endpoint}`)
    return false
  }
  
  limit.count++
  return true
}

/**
 * Buscar do cache em memória
 */
function getFromCache(key: string): any | null {
  const cached = apiCache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`🚀 Cache hit: ${key}`)
    return cached.data
  }
  apiCache.delete(key)
  return null
}

/**
 * Salvar no cache
 */
function setCache(key: string, data: any, ttlSeconds: number = 30): void {
  apiCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000
  })
  
  // Limpar cache antigo
  if (apiCache.size > 50) {
    const oldest = Array.from(apiCache.keys())[0]
    apiCache.delete(oldest)
  }
}

/**
 * Fetch com cache, debounce e rate limiting
 */
export async function smartFetch(
  url: string, 
  options: RequestInit = {},
  cacheSeconds: number = 30
): Promise<any> {
  const cacheKey = `${url}:${JSON.stringify(options)}`
  
  // 1. Verificar cache primeiro
  const cached = getFromCache(cacheKey)
  if (cached) {
    // Importar dinamicamente para evitar circular dependency
    import('./rate-limit-monitor').then(monitor => {
      monitor.trackRequest(url, true, false)
    })
    return cached
  }
  
  // 2. Verificar rate limiting interno
  if (!canMakeRequest(url)) {
    // Retornar do cache mesmo que expirado se tiver
    const expired = apiCache.get(cacheKey)
    if (expired) {
      console.warn(`⚠️ Retornando cache expirado por rate limiting: ${url}`)
      return expired.data
    }
    throw new Error('Rate limit exceeded')
  }
  
  // 3. Fazer requisição
  try {
    console.log(`🔍 Fazendo requisição: ${url}`)
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    })
    
    if (!response.ok) {
      if (response.status === 429) {
        console.error('🚫 Rate limited pelo servidor:', url)
        // Aumentar TTL do cache para evitar mais requests
        const expired = apiCache.get(cacheKey)
        if (expired) {
          setCache(cacheKey, expired.data, 120) // Cache por 2 minutos
          return expired.data
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // 4. Cachear resultado
    setCache(cacheKey, data, cacheSeconds)
    
    // Track successful request
    import('./rate-limit-monitor').then(monitor => {
      monitor.trackRequest(url, false, false)
    })
    
    return data
  } catch (error) {
    console.error(`❌ Erro em smartFetch: ${url}`, error)
    
    // Track error
    import('./rate-limit-monitor').then(monitor => {
      monitor.trackRequest(url, false, true)
    })
    
    throw error
  }
}

/**
 * Fetch com debounce - evita múltiplas chamadas rápidas
 */
export function debouncedFetch(
  url: string,
  options: RequestInit = {},
  delay: number = 300,
  cacheSeconds: number = 30
): Promise<any> {
  const key = `${url}:${JSON.stringify(options)}`
  
  return new Promise((resolve, reject) => {
    // Cancelar chamada anterior se existir
    const existingTimeout = debounceMap.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Agendar nova chamada
    const timeout = setTimeout(async () => {
      try {
        const result = await smartFetch(url, options, cacheSeconds)
        resolve(result)
      } catch (error) {
        reject(error)
      }
      debounceMap.delete(key)
    }, delay)
    
    debounceMap.set(key, timeout)
  })
}

/**
 * Limpar cache manualmente
 */
export function clearApiCache(pattern?: string): void {
  if (pattern) {
    for (const key of apiCache.keys()) {
      if (key.includes(pattern)) {
        apiCache.delete(key)
      }
    }
  } else {
    apiCache.clear()
  }
  console.log(`🧹 Cache limpo${pattern ? ` (padrão: ${pattern})` : ''}`)
}

/**
 * Status do cache
 */
export function getCacheStatus(): any {
  const entries = Array.from(apiCache.entries()).map(([key, value]) => ({
    key,
    size: JSON.stringify(value.data).length,
    age: Math.round((Date.now() - value.timestamp) / 1000),
    ttl: Math.round(value.ttl / 1000)
  }))
  
  return {
    totalEntries: apiCache.size,
    totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
    entries
  }
}