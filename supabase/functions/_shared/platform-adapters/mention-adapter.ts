import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface MentionConfig extends MonitoringConfig {
  apiToken: string;
  alertId?: string;
  languages?: string[];
  countries?: string[];
  sources?: string[];
}

export interface MentionAlert {
  id: string;
  title: string;
  query: string;
  languages: string[];
  countries: string[];
  sources: string[];
  noise_detection: boolean;
  created_at: string;
}

export interface MentionMention {
  id: string;
  title: string;
  description: string;
  url: string;
  published_at: string;
  author_name: string;
  author_url?: string;
  source_name: string;
  source_url: string;
  tone: 'positive' | 'negative' | 'neutral';
  reach: number;
  country: string;
  language: string;
  tags: string[];
}

export class MentionAdapter extends BasePlatformAdapter {
  private apiToken: string;
  private baseUrl = 'https://web.mention.com/api';

  constructor(config: MentionConfig) {
    super(config);
    this.apiToken = config.apiToken;
  }

  async searchMentions(keyword: string, options: {
    alertId?: string;
    limit?: number;
    offset?: number;
    since?: string;
    until?: string;
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        access_token: this.apiToken,
        q: keyword,
        limit: (options.limit || 20).toString(),
        offset: (options.offset || 0).toString(),
        ...(options.since && { since: options.since }),
        ...(options.until && { until: options.until }),
        ...(options.alertId && { alert_id: options.alertId })
      });

      const response = await fetch(`${this.baseUrl}/accounts/current/mentions?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Mention API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMentions(data.mentions || []);
    } catch (error) {
      console.error('Error fetching Mention.com data:', error);
      throw error;
    }
  }

  async createAlert(config: {
    title: string;
    query: string;
    languages?: string[];
    countries?: string[];
    sources?: string[];
    noiseDetection?: boolean;
  }): Promise<MentionAlert> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/current/alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alert: {
            name: config.title,
            query: config.query,
            languages: config.languages || ['en'],
            countries: config.countries || [],
            sources: config.sources || [],
            noise_detection: config.noiseDetection || true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create Mention alert: ${response.status}`);
      }

      const data = await response.json();
      return data.alert;
    } catch (error) {
      console.error('Error creating Mention alert:', error);
      throw error;
    }
  }

  async getAlerts(): Promise<MentionAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts/current/alerts`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Mention alerts: ${response.status}`);
      }

      const data = await response.json();
      return data.alerts || [];
    } catch (error) {
      console.error('Error fetching Mention alerts:', error);
      throw error;
    }
  }

  private transformMentions(mentions: MentionMention[]): ConversationData[] {
    return mentions.map(mention => ({
      id: `mention_${mention.id}`,
      content: mention.description || mention.title,
      title: mention.title,
      author: mention.author_name || 'Unknown',
      authorUrl: mention.author_url,
      platform: 'mention',
      platformSpecific: {
        mentionId: mention.id,
        sourceName: mention.source_name,
        sourceUrl: mention.source_url,
        tone: mention.tone,
        reach: mention.reach,
        country: mention.country,
        language: mention.language,
        tags: mention.tags
      },
      url: mention.url,
      publishedAt: new Date(mention.published_at),
      engagement: {
        reach: mention.reach,
        likes: 0,
        shares: 0,
        comments: 0
      },
      sentiment: this.mapToneToSentiment(mention.tone),
      metadata: {
        source: 'mention.com',
        country: mention.country,
        language: mention.language,
        tags: mention.tags
      }
    }));
  }

  private mapToneToSentiment(tone: string): 'positive' | 'negative' | 'neutral' {
    switch (tone) {
      case 'positive':
        return 'positive';
      case 'negative':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];

    for (const keyword of keywords) {
      try {
        const results = await this.searchMentions(keyword, {
          limit: 50,
          since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on Mention.com:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'mention';
  }
}