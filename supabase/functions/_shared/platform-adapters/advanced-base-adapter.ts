import { RateLimiter } from '../rate-limiter.ts';

export interface MonitoringConfig {
  rateLimitPerMinute?: number;
  [key: string]: any;
}

export interface ConversationData {
  id: string;
  content: string;
  title?: string;
  author: string;
  authorUrl?: string;
  platform: string;
  platformSpecific?: Record<string, any>;
  url: string;
  publishedAt: Date;
  engagement: {
    reach: number;
    likes: number;
    shares: number;
    comments: number;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  metadata: Record<string, any>;
}

export abstract class BasePlatformAdapter {
  protected rateLimiter: RateLimiter;
  protected config: MonitoringConfig;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.rateLimiter = new RateLimiter(config.rateLimitPerMinute || 60);
  }

  /**
   * Monitor keywords and return conversation data
   */
  abstract monitor(keywords: string[]): Promise<ConversationData[]>;

  /**
   * Get the platform name
   */
  abstract getPlatformName(): string;

  /**
   * Handle common errors across platforms
   */
  protected handleError(error: any, context: string): Error {
    console.error(`${this.getPlatformName()} adapter error in ${context}:`, error);
    
    if (error.status === 429) {
      return new Error(`Rate limit exceeded for ${this.getPlatformName()}`);
    }
    
    if (error.status === 401 || error.status === 403) {
      return new Error(`Authentication failed for ${this.getPlatformName()}`);
    }
    
    if (error.status >= 500) {
      return new Error(`${this.getPlatformName()} service unavailable`);
    }
    
    return new Error(`${this.getPlatformName()} error: ${error.message || 'Unknown error'}`);
  }

  /**
   * Sanitize and validate search keywords
   */
  protected sanitizeKeyword(keyword: string): string {
    return keyword
      .trim()
      .replace(/[^\w\s\-_]/g, '') // Remove special characters except hyphens and underscores
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 100); // Limit length
  }

  /**
   * Format date for API requests
   */
  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get rate limit information
   */
  getRateLimit(): { requestsPerMinute: number } {
    return {
      requestsPerMinute: this.config.rateLimitPerMinute || 60
    };
  }
}