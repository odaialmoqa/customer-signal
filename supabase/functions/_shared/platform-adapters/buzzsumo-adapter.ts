import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface BuzzSumoConfig extends MonitoringConfig {
  apiKey: string;
}

export interface BuzzSumoArticle {
  id: string;
  title: string;
  url: string;
  domain_name: string;
  published_date: string;
  author_name?: string;
  word_count: number;
  total_shares: number;
  facebook_shares: number;
  twitter_shares: number;
  linkedin_shares: number;
  pinterest_shares: number;
  reddit_shares: number;
  evergreen_score: number;
  content_type: string;
  language: string;
  country: string;
  amplifiers: Array<{
    name: string;
    type: string;
    followers: number;
    shares: number;
  }>;
  backlinks: number;
  domain_authority: number;
}

export interface BuzzSumoInfluencer {
  id: string;
  name: string;
  twitter_handle?: string;
  bio: string;
  followers: number;
  following: number;
  tweets: number;
  retweet_ratio: number;
  reply_ratio: number;
  average_retweets: number;
  page_authority: number;
  domain_authority: number;
  location: string;
  topics: string[];
}

export interface BuzzSumoTrendingContent {
  keyword: string;
  articles: BuzzSumoArticle[];
  total_results: number;
  trending_score: number;
  period: string;
}

export class BuzzSumoAdapter extends BasePlatformAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.buzzsumo.com/v1';

  constructor(config: BuzzSumoConfig) {
    super(config);
    this.apiKey = config.apiKey;
  }

  async searchContent(query: string, options: {
    num_results?: number;
    begin_date?: string;
    end_date?: string;
    content_types?: string[];
    language?: string;
    country?: string;
    domain_blacklist?: string[];
    sort?: 'total_shares' | 'facebook_shares' | 'twitter_shares' | 'published_date';
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        api_key: this.apiKey,
        q: query,
        num_results: (options.num_results || 50).toString(),
        ...(options.begin_date && { begin_date: options.begin_date }),
        ...(options.end_date && { end_date: options.end_date }),
        ...(options.content_types && { content_types: options.content_types.join(',') }),
        ...(options.language && { language: options.language }),
        ...(options.country && { country: options.country }),
        ...(options.domain_blacklist && { domain_blacklist: options.domain_blacklist.join(',') }),
        sort: options.sort || 'total_shares'
      });

      const response = await fetch(`${this.baseUrl}/articles/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`BuzzSumo API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformArticles(data.results || []);
    } catch (error) {
      console.error('Error fetching BuzzSumo content:', error);
      throw error;
    }
  }

  async getTrendingContent(options: {
    content_types?: string[];
    num_results?: number;
    days?: number;
    language?: string;
    country?: string;
  } = {}): Promise<BuzzSumoTrendingContent> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        api_key: this.apiKey,
        num_results: (options.num_results || 20).toString(),
        days: (options.days || 7).toString(),
        ...(options.content_types && { content_types: options.content_types.join(',') }),
        ...(options.language && { language: options.language }),
        ...(options.country && { country: options.country })
      });

      const response = await fetch(`${this.baseUrl}/articles/trending?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BuzzSumo trending content: ${response.status}`);
      }

      const data = await response.json();
      return {
        keyword: 'trending',
        articles: data.results || [],
        total_results: data.total_results || 0,
        trending_score: data.trending_score || 0,
        period: `${options.days || 7}d`
      };
    } catch (error) {
      console.error('Error fetching BuzzSumo trending content:', error);
      throw error;
    }
  }

  async getInfluencers(topic: string, options: {
    num_results?: number;
    min_followers?: number;
    max_followers?: number;
    location?: string;
    sort?: 'followers' | 'page_authority' | 'average_retweets';
  } = {}): Promise<BuzzSumoInfluencer[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        api_key: this.apiKey,
        topic: topic,
        num_results: (options.num_results || 20).toString(),
        ...(options.min_followers && { min_followers: options.min_followers.toString() }),
        ...(options.max_followers && { max_followers: options.max_followers.toString() }),
        ...(options.location && { location: options.location }),
        sort: options.sort || 'followers'
      });

      const response = await fetch(`${this.baseUrl}/influencers/search?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BuzzSumo influencers: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching BuzzSumo influencers:', error);
      throw error;
    }
  }

  async getContentAnalytics(url: string): Promise<{
    shares: {
      total: number;
      facebook: number;
      twitter: number;
      linkedin: number;
      pinterest: number;
      reddit: number;
    };
    backlinks: number;
    domain_authority: number;
    evergreen_score: number;
    amplifiers: Array<{
      name: string;
      type: string;
      followers: number;
      shares: number;
    }>;
  }> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        api_key: this.apiKey,
        url: url
      });

      const response = await fetch(`${this.baseUrl}/articles/details?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BuzzSumo content analytics: ${response.status}`);
      }

      const data = await response.json();
      return {
        shares: {
          total: data.total_shares || 0,
          facebook: data.facebook_shares || 0,
          twitter: data.twitter_shares || 0,
          linkedin: data.linkedin_shares || 0,
          pinterest: data.pinterest_shares || 0,
          reddit: data.reddit_shares || 0
        },
        backlinks: data.backlinks || 0,
        domain_authority: data.domain_authority || 0,
        evergreen_score: data.evergreen_score || 0,
        amplifiers: data.amplifiers || []
      };
    } catch (error) {
      console.error('Error fetching BuzzSumo content analytics:', error);
      throw error;
    }
  }

  async getTopSharedContent(domain: string, options: {
    num_results?: number;
    begin_date?: string;
    end_date?: string;
    content_types?: string[];
  } = {}): Promise<BuzzSumoArticle[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        api_key: this.apiKey,
        domain: domain,
        num_results: (options.num_results || 20).toString(),
        ...(options.begin_date && { begin_date: options.begin_date }),
        ...(options.end_date && { end_date: options.end_date }),
        ...(options.content_types && { content_types: options.content_types.join(',') })
      });

      const response = await fetch(`${this.baseUrl}/articles/top-shared?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BuzzSumo top shared content: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching BuzzSumo top shared content:', error);
      throw error;
    }
  }

  private transformArticles(articles: BuzzSumoArticle[]): ConversationData[] {
    return articles.map(article => ({
      id: `buzzsumo_${article.id}`,
      content: article.title,
      title: article.title,
      author: article.author_name || 'Unknown',
      platform: 'buzzsumo',
      platformSpecific: {
        buzzsumoId: article.id,
        domainName: article.domain_name,
        wordCount: article.word_count,
        contentType: article.content_type,
        evergreenScore: article.evergreen_score,
        backlinks: article.backlinks,
        domainAuthority: article.domain_authority,
        amplifiers: article.amplifiers,
        language: article.language,
        country: article.country
      },
      url: article.url,
      publishedAt: new Date(article.published_date),
      engagement: {
        reach: article.total_shares * 10, // Estimate reach based on shares
        likes: article.facebook_shares,
        shares: article.total_shares,
        comments: 0 // Not available in BuzzSumo API
      },
      sentiment: 'neutral', // BuzzSumo doesn't provide sentiment
      metadata: {
        source: 'buzzsumo',
        domainName: article.domain_name,
        wordCount: article.word_count,
        contentType: article.content_type,
        evergreenScore: article.evergreen_score,
        backlinks: article.backlinks,
        domainAuthority: article.domain_authority,
        shareBreakdown: {
          facebook: article.facebook_shares,
          twitter: article.twitter_shares,
          linkedin: article.linkedin_shares,
          pinterest: article.pinterest_shares,
          reddit: article.reddit_shares
        },
        amplifiers: article.amplifiers,
        language: article.language,
        country: article.country
      }
    }));
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];

    for (const keyword of keywords) {
      try {
        const results = await this.searchContent(keyword, {
          num_results: 50,
          begin_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
          sort: 'total_shares'
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on BuzzSumo:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'buzzsumo';
  }
}