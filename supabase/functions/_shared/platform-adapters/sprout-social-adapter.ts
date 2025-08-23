import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface SproutSocialConfig extends MonitoringConfig {
  accessToken: string;
  customerId: string;
}

export interface SproutSocialQuery {
  id: string;
  name: string;
  query: string;
  networks: string[];
  created_date: string;
  status: 'active' | 'paused';
}

export interface SproutSocialMessage {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
    follower_count?: number;
    verified?: boolean;
  };
  network: string;
  network_id: string;
  url: string;
  created_time: string;
  sentiment: {
    score: number; // 0-100
    polarity: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    replies: number;
  };
  reach: number;
  impressions: number;
  location?: {
    name: string;
    country_code: string;
  };
  language: string;
  tags: string[];
  categories: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface SproutSocialAnalytics {
  query_id: string;
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    total_messages: number;
    total_reach: number;
    total_impressions: number;
    engagement_rate: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  networks: Array<{
    name: string;
    message_count: number;
    reach: number;
    engagement_rate: number;
  }>;
  top_authors: Array<{
    name: string;
    username: string;
    message_count: number;
    reach: number;
    engagement: number;
  }>;
}

export class SproutSocialAdapter extends BasePlatformAdapter {
  private accessToken: string;
  private customerId: string;
  private baseUrl = 'https://api.sproutsocial.com/v1';

  constructor(config: SproutSocialConfig) {
    super(config);
    this.accessToken = config.accessToken;
    this.customerId = config.customerId;
  }

  async getQueries(): Promise<SproutSocialQuery[]> {
    try {
      const response = await fetch(`${this.baseUrl}/listening/queries`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Sprout Social queries: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Sprout Social queries:', error);
      throw error;
    }
  }

  async createQuery(config: {
    name: string;
    query: string;
    networks: string[];
    description?: string;
  }): Promise<SproutSocialQuery> {
    try {
      const response = await fetch(`${this.baseUrl}/listening/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.name,
          query: config.query,
          networks: config.networks,
          description: config.description || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create Sprout Social query: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating Sprout Social query:', error);
      throw error;
    }
  }

  async getMessages(queryId: string, options: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    network?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
        ...(options.start_date && { start_date: options.start_date }),
        ...(options.end_date && { end_date: options.end_date }),
        ...(options.sentiment && { sentiment: options.sentiment }),
        ...(options.network && { network: options.network }),
        ...(options.priority && { priority: options.priority })
      });

      const response = await fetch(`${this.baseUrl}/listening/queries/${queryId}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Sprout Social API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMessages(data.data || []);
    } catch (error) {
      console.error('Error fetching Sprout Social messages:', error);
      throw error;
    }
  }

  async getAnalytics(queryId: string, options: {
    start_date?: string;
    end_date?: string;
    metrics?: string[];
  } = {}): Promise<SproutSocialAnalytics> {
    try {
      const params = new URLSearchParams({
        ...(options.start_date && { start_date: options.start_date }),
        ...(options.end_date && { end_date: options.end_date }),
        ...(options.metrics && { metrics: options.metrics.join(',') })
      });

      const response = await fetch(`${this.baseUrl}/listening/queries/${queryId}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Sprout Social analytics: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Sprout Social analytics:', error);
      throw error;
    }
  }

  async getSentimentTrends(queryId: string, options: {
    start_date?: string;
    end_date?: string;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  } = {}): Promise<Array<{
    date: string;
    positive: number;
    negative: number;
    neutral: number;
  }>> {
    try {
      const params = new URLSearchParams({
        ...(options.start_date && { start_date: options.start_date }),
        ...(options.end_date && { end_date: options.end_date }),
        granularity: options.granularity || 'day'
      });

      const response = await fetch(`${this.baseUrl}/listening/queries/${queryId}/sentiment-trends?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Sprout Social sentiment trends: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Sprout Social sentiment trends:', error);
      throw error;
    }
  }

  async getTopics(queryId: string, options: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  } = {}): Promise<Array<{
    topic: string;
    message_count: number;
    sentiment_score: number;
    reach: number;
  }>> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 20).toString(),
        ...(options.start_date && { start_date: options.start_date }),
        ...(options.end_date && { end_date: options.end_date })
      });

      const response = await fetch(`${this.baseUrl}/listening/queries/${queryId}/topics?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Sprout Social topics: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Sprout Social topics:', error);
      throw error;
    }
  }

  private transformMessages(messages: SproutSocialMessage[]): ConversationData[] {
    return messages.map(message => ({
      id: `sprout_${message.id}`,
      content: message.text,
      title: message.text.substring(0, 100) + (message.text.length > 100 ? '...' : ''),
      author: message.author.name || message.author.username || 'Unknown',
      authorUrl: this.getAuthorUrl(message.network, message.author.username),
      platform: 'sprout-social',
      platformSpecific: {
        sproutId: message.id,
        network: message.network,
        networkId: message.network_id,
        authorId: message.author.id,
        authorUsername: message.author.username,
        authorFollowers: message.author.follower_count,
        authorVerified: message.author.verified,
        profileImageUrl: message.author.profile_image_url,
        impressions: message.impressions,
        location: message.location,
        language: message.language,
        tags: message.tags,
        categories: message.categories,
        priority: message.priority
      },
      url: message.url,
      publishedAt: new Date(message.created_time),
      engagement: {
        reach: message.reach,
        likes: message.engagement.likes,
        shares: message.engagement.shares,
        comments: message.engagement.comments
      },
      sentiment: message.sentiment.polarity,
      metadata: {
        source: 'sprout-social',
        network: message.network,
        sentimentScore: message.sentiment.score,
        sentimentConfidence: message.sentiment.confidence,
        impressions: message.impressions,
        location: message.location,
        language: message.language,
        tags: message.tags,
        categories: message.categories,
        priority: message.priority
      }
    }));
  }

  private getAuthorUrl(network: string, username: string): string {
    const networkUrls: { [key: string]: string } = {
      'twitter': `https://twitter.com/${username}`,
      'facebook': `https://facebook.com/${username}`,
      'instagram': `https://instagram.com/${username}`,
      'linkedin': `https://linkedin.com/in/${username}`,
      'youtube': `https://youtube.com/@${username}`
    };

    return networkUrls[network.toLowerCase()] || '';
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];
    const queries = await this.getQueries();

    for (const keyword of keywords) {
      try {
        // Find existing query or create new one
        let query = queries.find(q => q.query.toLowerCase().includes(keyword.toLowerCase()));
        
        if (!query) {
          query = await this.createQuery({
            name: `Monitor: ${keyword}`,
            query: keyword,
            networks: ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube']
          });
        }

        const results = await this.getMessages(query.id, {
          limit: 50,
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 24 hours
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on Sprout Social:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'sprout-social';
  }
}