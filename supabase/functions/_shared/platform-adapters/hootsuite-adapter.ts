import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface HootsuiteConfig extends MonitoringConfig {
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface HootsuiteStream {
  id: string;
  name: string;
  query: string;
  networks: string[];
  created_at: string;
  status: 'active' | 'paused';
}

export interface HootsuiteMessage {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    screen_name: string;
    profile_image_url?: string;
    followers_count?: number;
  };
  network: string;
  url: string;
  created_time: string;
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    clicks?: number;
  };
  reach: number;
  location?: {
    country: string;
    region: string;
  };
  language: string;
  tags: string[];
}

export interface HootsuiteAnalytics {
  stream_id: string;
  period: string;
  metrics: {
    total_messages: number;
    sentiment_breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
    top_authors: Array<{
      name: string;
      messages: number;
      reach: number;
    }>;
    engagement_summary: {
      total_likes: number;
      total_shares: number;
      total_comments: number;
      average_engagement_rate: number;
    };
  };
}

export class HootsuiteAdapter extends BasePlatformAdapter {
  private accessToken: string;
  private refreshToken?: string;
  private clientId?: string;
  private clientSecret?: string;
  private baseUrl = 'https://platform.hootsuite.com/v1';

  constructor(config: HootsuiteConfig) {
    super(config);
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken || !this.clientId || !this.clientSecret) {
      throw new Error('Refresh token and client credentials required for token refresh');
    }

    try {
      const response = await fetch('https://platform.hootsuite.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Hootsuite token:', error);
      throw error;
    }
  }

  async getStreams(): Promise<HootsuiteStream[]> {
    try {
      const response = await fetch(`${this.baseUrl}/streams`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.getStreams(); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Hootsuite streams: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Hootsuite streams:', error);
      throw error;
    }
  }

  async createStream(config: {
    name: string;
    query: string;
    networks: string[];
    description?: string;
  }): Promise<HootsuiteStream> {
    try {
      const response = await fetch(`${this.baseUrl}/streams`, {
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

      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.createStream(config); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Failed to create Hootsuite stream: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error creating Hootsuite stream:', error);
      throw error;
    }
  }

  async getStreamMessages(streamId: string, options: {
    limit?: number;
    since?: string;
    until?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        ...(options.since && { since: options.since }),
        ...(options.until && { until: options.until }),
        ...(options.sentiment && { sentiment: options.sentiment })
      });

      const response = await fetch(`${this.baseUrl}/streams/${streamId}/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.getStreamMessages(streamId, options); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Hootsuite API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMessages(data.data || []);
    } catch (error) {
      console.error('Error fetching Hootsuite messages:', error);
      throw error;
    }
  }

  async getStreamAnalytics(streamId: string, options: {
    period?: string; // '1d', '7d', '30d'
    metrics?: string[];
  } = {}): Promise<HootsuiteAnalytics> {
    try {
      const params = new URLSearchParams({
        period: options.period || '7d',
        ...(options.metrics && { metrics: options.metrics.join(',') })
      });

      const response = await fetch(`${this.baseUrl}/streams/${streamId}/analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        await this.refreshAccessToken();
        return this.getStreamAnalytics(streamId, options); // Retry with new token
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Hootsuite analytics: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching Hootsuite analytics:', error);
      throw error;
    }
  }

  private transformMessages(messages: HootsuiteMessage[]): ConversationData[] {
    return messages.map(message => ({
      id: `hootsuite_${message.id}`,
      content: message.text,
      title: message.text.substring(0, 100) + (message.text.length > 100 ? '...' : ''),
      author: message.author.name || message.author.screen_name || 'Unknown',
      authorUrl: `https://${message.network}.com/${message.author.screen_name}`,
      platform: 'hootsuite',
      platformSpecific: {
        hootsuiteId: message.id,
        network: message.network,
        authorId: message.author.id,
        authorScreenName: message.author.screen_name,
        authorFollowers: message.author.followers_count,
        profileImageUrl: message.author.profile_image_url,
        location: message.location,
        language: message.language,
        tags: message.tags
      },
      url: message.url,
      publishedAt: new Date(message.created_time),
      engagement: {
        reach: message.reach,
        likes: message.engagement.likes,
        shares: message.engagement.shares,
        comments: message.engagement.comments
      },
      sentiment: message.sentiment.label,
      metadata: {
        source: 'hootsuite',
        network: message.network,
        sentimentScore: message.sentiment.score,
        location: message.location,
        language: message.language,
        tags: message.tags
      }
    }));
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];
    const streams = await this.getStreams();

    for (const keyword of keywords) {
      try {
        // Find existing stream or create new one
        let stream = streams.find(s => s.query.toLowerCase().includes(keyword.toLowerCase()));
        
        if (!stream) {
          stream = await this.createStream({
            name: `Monitor: ${keyword}`,
            query: keyword,
            networks: ['twitter', 'facebook', 'instagram', 'linkedin']
          });
        }

        const results = await this.getStreamMessages(stream.id, {
          limit: 50,
          since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on Hootsuite:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'hootsuite';
  }
}