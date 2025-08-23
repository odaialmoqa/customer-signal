import Redis from 'ioredis';
import { logger } from './logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private redis: Redis;
  private localCache: Map<string, CacheItem<any>>;
  private readonly maxLocalCacheSize = 1000;
  private readonly defaultTTL = 300; // 5 minutes

  constructor(config: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || 'cs:',
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: true,
    });

    this.localCache = new Map();

    this.redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    // Clean up local cache periodically
    setInterval(() => this.cleanupLocalCache(), 60000); // Every minute
  }

  async get<T>(key: string, useLocalCache = true): Promise<T | null> {
    try {
      // Check local cache first
      if (useLocalCache) {
        const localItem = this.localCache.get(key);
        if (localItem && this.isValidCacheItem(localItem)) {
          return localItem.data;
        }
      }

      // Check Redis cache
      const cached = await this.redis.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        
        // Update local cache
        if (useLocalCache) {
          this.setLocalCache(key, data, this.defaultTTL);
        }
        
        return data;
      }

      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.defaultTTL,
    useLocalCache = true
  ): Promise<void> {
    try {
      // Set in Redis
      await this.redis.setex(key, ttl, JSON.stringify(value));

      // Set in local cache
      if (useLocalCache) {
        this.setLocalCache(key, value, ttl);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.localCache.delete(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await this.redis.mget(...keys);
      return results.map(result => result ? JSON.parse(result) : null);
    } catch (error) {
      logger.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Array<[string, any, number?]>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(([key, value, ttl = this.defaultTTL]) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();
    } catch (error) {
      logger.error('Cache mset error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, by: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, by);
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  }

  async flushPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache flush pattern error for pattern ${pattern}:`, error);
    }
  }

  // Cache warming methods
  async warmCache(
    key: string, 
    dataFetcher: () => Promise<any>, 
    ttl: number = this.defaultTTL
  ): Promise<void> {
    try {
      const exists = await this.exists(key);
      if (!exists) {
        const data = await dataFetcher();
        await this.set(key, data, ttl);
      }
    } catch (error) {
      logger.error(`Cache warm error for key ${key}:`, error);
    }
  }

  // Local cache management
  private setLocalCache<T>(key: string, value: T, ttl: number): void {
    // Remove oldest items if cache is full
    if (this.localCache.size >= this.maxLocalCacheSize) {
      const oldestKey = this.localCache.keys().next().value;
      this.localCache.delete(oldestKey);
    }

    this.localCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
    });
  }

  private isValidCacheItem(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  private cleanupLocalCache(): void {
    const now = Date.now();
    for (const [key, item] of this.localCache.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.localCache.delete(key);
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }
}

// Cache key generators
export const CacheKeys = {
  conversation: (id: string) => `conversation:${id}`,
  conversationsByTenant: (tenantId: string, page: number) => 
    `conversations:tenant:${tenantId}:page:${page}`,
  analytics: (tenantId: string, type: string, period: string) => 
    `analytics:${tenantId}:${type}:${period}`,
  trendingKeywords: (tenantId: string) => `trending:keywords:${tenantId}`,
  sentimentAnalysis: (contentHash: string) => `sentiment:${contentHash}`,
  userProfile: (userId: string) => `user:${userId}`,
  tenantSettings: (tenantId: string) => `tenant:settings:${tenantId}`,
  searchResults: (query: string, filters: string) => 
    `search:${Buffer.from(query + filters).toString('base64')}`,
};

// Singleton instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    const config: CacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'cs:',
    };
    
    cacheManager = new CacheManager(config);
  }
  
  return cacheManager;
}

export default CacheManager;