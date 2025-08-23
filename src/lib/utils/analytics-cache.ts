/**
 * Simple in-memory cache for analytics data
 * In production, this would be replaced with Redis or similar
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Generate cache key from parameters
   */
  private generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|')
    return `${prefix}:${sortedParams}`
  }

  /**
   * Get cached data if valid
   */
  get<T>(prefix: string, params: Record<string, any>): T | null {
    const key = this.generateKey(prefix, params)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set cached data
   */
  set<T>(prefix: string, params: Record<string, any>, data: T, ttl?: number): void {
    const key = this.generateKey(prefix, params)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  /**
   * Clear cache entries by prefix
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix + ':')) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCache()

// Cleanup expired entries every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    analyticsCache.cleanup()
  }, 10 * 60 * 1000)
}