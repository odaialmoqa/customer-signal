import { getCacheManager, CacheKeys } from './cache-manager';
import { logger } from './logger';
import crypto from 'crypto';

interface QueryCacheOptions {
  ttl?: number;
  useLocalCache?: boolean;
  skipCache?: boolean;
}

interface CachedQuery<T> {
  execute: () => Promise<T>;
  key: string;
  options: QueryCacheOptions;
}

export class QueryCache {
  private cacheManager = getCacheManager();

  async executeWithCache<T>(
    query: CachedQuery<T>
  ): Promise<T> {
    const { execute, key, options } = query;
    const { ttl = 300, useLocalCache = true, skipCache = false } = options;

    if (skipCache) {
      return await execute();
    }

    try {
      // Try to get from cache first
      const cached = await this.cacheManager.get<T>(key, useLocalCache);
      if (cached !== null) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      // Execute query and cache result
      logger.debug(`Cache miss for key: ${key}, executing query`);
      const result = await execute();
      
      // Only cache non-null results
      if (result !== null && result !== undefined) {
        await this.cacheManager.set(key, result, ttl, useLocalCache);
      }

      return result;
    } catch (error) {
      logger.error(`Query cache error for key ${key}:`, error);
      // Fallback to direct execution
      return await execute();
    }
  }

  // Specific cache methods for common queries
  async cacheConversations(
    tenantId: string,
    page: number,
    fetcher: () => Promise<any[]>,
    ttl: number = 300
  ): Promise<any[]> {
    return this.executeWithCache({
      execute: fetcher,
      key: CacheKeys.conversationsByTenant(tenantId, page),
      options: { ttl }
    });
  }

  async cacheAnalytics(
    tenantId: string,
    type: string,
    period: string,
    fetcher: () => Promise<any>,
    ttl: number = 600 // 10 minutes for analytics
  ): Promise<any> {
    return this.executeWithCache({
      execute: fetcher,
      key: CacheKeys.analytics(tenantId, type, period),
      options: { ttl }
    });
  }

  async cacheTrendingKeywords(
    tenantId: string,
    fetcher: () => Promise<any[]>,
    ttl: number = 1800 // 30 minutes for trending data
  ): Promise<any[]> {
    return this.executeWithCache({
      execute: fetcher,
      key: CacheKeys.trendingKeywords(tenantId),
      options: { ttl }
    });
  }

  async cacheSentimentAnalysis(
    content: string,
    fetcher: () => Promise<any>,
    ttl: number = 86400 // 24 hours for sentiment analysis
  ): Promise<any> {
    const contentHash = this.generateContentHash(content);
    return this.executeWithCache({
      execute: fetcher,
      key: CacheKeys.sentimentAnalysis(contentHash),
      options: { ttl }
    });
  }

  async cacheSearchResults(
    query: string,
    filters: any,
    fetcher: () => Promise<any>,
    ttl: number = 300
  ): Promise<any> {
    const filtersString = JSON.stringify(filters);
    return this.executeWithCache({
      execute: fetcher,
      key: CacheKeys.searchResults(query, filtersString),
      options: { ttl }
    });
  }

  // Cache invalidation methods
  async invalidateConversationCache(tenantId: string): Promise<void> {
    await this.cacheManager.flushPattern(`conversations:tenant:${tenantId}:*`);
  }

  async invalidateAnalyticsCache(tenantId: string): Promise<void> {
    await this.cacheManager.flushPattern(`analytics:${tenantId}:*`);
  }

  async invalidateTrendingCache(tenantId: string): Promise<void> {
    await this.cacheManager.del(CacheKeys.trendingKeywords(tenantId));
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheManager.del(CacheKeys.userProfile(userId));
  }

  async invalidateTenantCache(tenantId: string): Promise<void> {
    await this.cacheManager.flushPattern(`*:${tenantId}:*`);
    await this.cacheManager.del(CacheKeys.tenantSettings(tenantId));
  }

  // Batch cache warming
  async warmCaches(tenantId: string): Promise<void> {
    const warmingTasks = [
      // Warm trending keywords
      this.cacheTrendingKeywords(tenantId, async () => {
        // This would be replaced with actual trending keywords query
        return [];
      }),
      
      // Warm recent conversations
      this.cacheConversations(tenantId, 1, async () => {
        // This would be replaced with actual conversations query
        return [];
      }),
      
      // Warm analytics data
      this.cacheAnalytics(tenantId, 'sentiment', 'week', async () => {
        // This would be replaced with actual analytics query
        return {};
      })
    ];

    try {
      await Promise.allSettled(warmingTasks);
      logger.info(`Cache warming completed for tenant: ${tenantId}`);
    } catch (error) {
      logger.error(`Cache warming failed for tenant ${tenantId}:`, error);
    }
  }

  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }
}

// Singleton instance
let queryCache: QueryCache | null = null;

export function getQueryCache(): QueryCache {
  if (!queryCache) {
    queryCache = new QueryCache();
  }
  return queryCache;
}

// Cache decorators for common patterns
export function withCache<T>(
  keyGenerator: (...args: any[]) => string,
  ttl: number = 300
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]): Promise<T> {
      const cache = getQueryCache();
      const key = keyGenerator(...args);

      return cache.executeWithCache({
        execute: () => method.apply(this, args),
        key,
        options: { ttl }
      });
    };

    return descriptor;
  };
}

export default QueryCache;