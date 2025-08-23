import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface BrandwatchConfig extends MonitoringConfig {
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  projectId?: string;
}

export interface BrandwatchProject {
  id: number;
  name: string;
  description: string;
  created_at: string;
  status: 'active' | 'paused';
}

export interface BrandwatchMention {
  id: string;
  title: string;
  content: string;
  url: string;
  date: string;
  author: {
    name: string;
    url?: string;
    followers?: number;
  };
  source: {
    name: string;
    type: string;
    url: string;
  };
  sentiment: number; // -5 to 5
  reach: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  location: {
    country: string;
    region: string;
  };
  language: string;
  tags: string[];
  categories: string[];
}

export interface BrandwatchQuery {
  id: number;
  name: string;
  query: string;
  project_id: number;
  created_at: string;
}

export class BrandwatchAdapter extends BasePlatformAdapter {
  private username: string;
  private password: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl = 'https://api.brandwatch.com/projects';
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(config: BrandwatchConfig) {
    super(config);
    this.username = config.username;
    this.password = config.password;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://api.brandwatch.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.username,
          password: this.password,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`Brandwatch authentication failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('Error authenticating with Brandwatch:', error);
      throw error;
    }
  }

  async searchMentions(projectId: string, options: {
    queryId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
    orderBy?: 'date' | 'reach' | 'engagement';
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();
      const token = await this.authenticate();

      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
        ...(options.startDate && { startDate: options.startDate }),
        ...(options.endDate && { endDate: options.endDate }),
        ...(options.queryId && { queryId: options.queryId }),
        ...(options.sentiment && { sentiment: options.sentiment }),
        ...(options.orderBy && { orderBy: options.orderBy })
      });

      const response = await fetch(`${this.baseUrl}/${projectId}/data/mentions?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Brandwatch API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMentions(data.results || []);
    } catch (error) {
      console.error('Error fetching Brandwatch data:', error);
      throw error;
    }
  }

  async getProjects(): Promise<BrandwatchProject[]> {
    try {
      const token = await this.authenticate();

      const response = await fetch(`${this.baseUrl}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Brandwatch projects: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Brandwatch projects:', error);
      throw error;
    }
  }

  async createQuery(projectId: string, config: {
    name: string;
    query: string;
    description?: string;
  }): Promise<BrandwatchQuery> {
    try {
      const token = await this.authenticate();

      const response = await fetch(`${this.baseUrl}/${projectId}/queries`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.name,
          query: config.query,
          description: config.description || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create Brandwatch query: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error creating Brandwatch query:', error);
      throw error;
    }
  }

  async getSentimentAnalysis(projectId: string, options: {
    queryId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    averageSentiment: number;
  }> {
    try {
      const token = await this.authenticate();

      const params = new URLSearchParams({
        ...(options.startDate && { startDate: options.startDate }),
        ...(options.endDate && { endDate: options.endDate }),
        ...(options.queryId && { queryId: options.queryId })
      });

      const response = await fetch(`${this.baseUrl}/${projectId}/data/volume/sentiment?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Brandwatch sentiment: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error fetching Brandwatch sentiment:', error);
      throw error;
    }
  }

  async getTopAuthors(projectId: string, options: {
    queryId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<Array<{
    name: string;
    mentions: number;
    reach: number;
    engagement: number;
  }>> {
    try {
      const token = await this.authenticate();

      const params = new URLSearchParams({
        limit: (options.limit || 10).toString(),
        ...(options.startDate && { startDate: options.startDate }),
        ...(options.endDate && { endDate: options.endDate }),
        ...(options.queryId && { queryId: options.queryId })
      });

      const response = await fetch(`${this.baseUrl}/${projectId}/data/authors?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Brandwatch authors: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Brandwatch authors:', error);
      throw error;
    }
  }

  private transformMentions(mentions: BrandwatchMention[]): ConversationData[] {
    return mentions.map(mention => ({
      id: `brandwatch_${mention.id}`,
      content: mention.content,
      title: mention.title,
      author: mention.author.name || 'Unknown',
      authorUrl: mention.author.url,
      platform: 'brandwatch',
      platformSpecific: {
        brandwatchId: mention.id,
        sourceType: mention.source.type,
        sourceName: mention.source.name,
        sourceUrl: mention.source.url,
        authorFollowers: mention.author.followers,
        location: mention.location,
        language: mention.language,
        tags: mention.tags,
        categories: mention.categories
      },
      url: mention.url,
      publishedAt: new Date(mention.date),
      engagement: {
        reach: mention.reach,
        likes: mention.engagement.likes,
        shares: mention.engagement.shares,
        comments: mention.engagement.comments
      },
      sentiment: this.mapSentimentScore(mention.sentiment),
      metadata: {
        source: 'brandwatch',
        sourceType: mention.source.type,
        location: mention.location,
        language: mention.language,
        tags: mention.tags,
        categories: mention.categories
      }
    }));
  }

  private mapSentimentScore(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
    return 'neutral';
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];
    const projects = await this.getProjects();

    for (const keyword of keywords) {
      try {
        // Use the first available project or create a new one
        const project = projects[0];
        if (!project) {
          console.warn('No Brandwatch projects available');
          continue;
        }

        const results = await this.searchMentions(project.id.toString(), {
          limit: 50,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          orderBy: 'date'
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on Brandwatch:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'brandwatch';
  }
}