import NodeCache from 'node-cache'

// Create cache instance with 5-minute default TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // For better performance
})

/**
 * Get value from cache
 */
export function getCache<T>(key: string): T | undefined {
  return cache.get<T>(key)
}

/**
 * Set value in cache
 */
export function setCache<T>(key: string, value: T, ttl?: number): boolean {
  return cache.set(key, value, ttl || 300)
}

/**
 * Delete value from cache
 */
export function deleteCache(key: string): number {
  return cache.del(key)
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.flushAll()
}

/**
 * Generate cache key for merchant analytics
 */
export function getCacheKey(merchantId: string, endpoint: string, params?: Record<string, any>): string {
  const paramsStr = params ? JSON.stringify(params) : ''
  return `analytics:${merchantId}:${endpoint}:${paramsStr}`
}

/**
 * Invalidate all cache for a merchant
 */
export function invalidateMerchantCache(merchantId: string): void {
  const keys = cache.keys()
  const merchantKeys = keys.filter(key => key.startsWith(`analytics:${merchantId}:`))
  cache.del(merchantKeys)
}

/**
 * Cache statistics
 */
export function getCacheStats() {
  return cache.getStats()
}

export default cache
