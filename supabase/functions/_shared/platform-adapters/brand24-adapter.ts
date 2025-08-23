import { BasePlatformAdapter, ConversationData, MonitoringConfig } from './advanced-base-adapter.ts';

export interface Brand24Config extends MonitoringConfig {
  apiToken: string;
  projectId?: string;
}

export interface Brand24Project {
  id: number;
  name: string;
  keyword: string;
  created_at: string;
  status: 'active' | 'paused';
}

export interface Brand24Mention {
  id: number;
  url: string;
  title: string;
  snippet: string;
  date: string;
  author: string;
  source: string;
  source_type: string;
  sentiment: number; // -1 to 1
  reach: number;
  influence_score: number;
  tags: string[];
  country: string;
  language: string;
}

export class Brand24Adapter extends BasePlatformAdapter {
  private apiToken: string;
  private baseUrl = 'https://api.brand24.com/v2';

  constructor(config: Brand24Config) {
    super(config);
    this.apiToken = config.apiToken;
  }

  async searchMentions(projectId: string, options: {
    limit?: number;
    page?: number;
    dateFrom?: string;
    dateTo?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    sourceType?: string;
  } = {}): Promise<ConversationData[]> {
    try {
      await this.rateLimiter.checkLimit();

      const params = new URLSearchParams({
        access_token: this.apiToken,
        project: projectId,
        limit: (options.limit || 25).toString(),
        page: (options.page || 1).toString(),
        ...(options.dateFrom && { date_from: options.dateFrom }),
        ...(options.dateTo && { date_to: options.dateTo }),
        ...(options.sentiment && { sentiment: options.sentiment }),
        ...(options.sourceType && { source_type: options.sourceType })
      });

      const response = await fetch(`${this.baseUrl}/mentions?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Brand24 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformMentions(data.results || []);
    } catch (error) {
      console.error('Error fetching Brand24 data:', error);
      throw error;
    }
  }

  async getProjects(): Promise<Brand24Project[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Brand24 projects: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching Brand24 projects:', error);
      throw error;
    }
  }

  async createProject(config: {
    name: string;
    keyword: string;
    description?: string;
  }): Promise<Brand24Project> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: config.name,
          keyword: config.keyword,
          description: config.description || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create Brand24 project: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error creating Brand24 project:', error);
      throw error;
    }
  }

  async getSentimentAnalysis(projectId: string, period: string = '7d'): Promise<{
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/sentiment?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Brand24 sentiment: ${response.status}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error fetching Brand24 sentiment:', error);
      throw error;
    }
  }

  private transformMentions(mentions: Brand24Mention[]): ConversationData[] {
    return mentions.map(mention => ({
      id: `brand24_${mention.id}`,
      content: mention.snippet,
      title: mention.title,
      author: mention.author || 'Unknown',
      platform: 'brand24',
      platformSpecific: {
        brand24Id: mention.id,
        sourceType: mention.source_type,
        influenceScore: mention.influence_score,
        country: mention.country,
        language: mention.language,
        tags: mention.tags
      },
      url: mention.url,
      publishedAt: new Date(mention.date),
      engagement: {
        reach: mention.reach,
        likes: 0,
        shares: 0,
        comments: 0
      },
      sentiment: this.mapSentimentScore(mention.sentiment),
      metadata: {
        source: 'brand24',
        sourceType: mention.source_type,
        influenceScore: mention.influence_score,
        country: mention.country,
        language: mention.language,
        tags: mention.tags
      }
    }));
  }

  private mapSentimentScore(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  async monitor(keywords: string[]): Promise<ConversationData[]> {
    const allResults: ConversationData[] = [];
    const projects = await this.getProjects();

    for (const keyword of keywords) {
      try {
        // Find or create project for keyword
        let project = projects.find(p => p.keyword.toLowerCase().includes(keyword.toLowerCase()));
        
        if (!project) {
          project = await this.createProject({
            name: `Monitor: ${keyword}`,
            keyword: keyword
          });
        }

        const results = await this.searchMentions(project.id.toString(), {
          limit: 50,
          dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 24 hours
        });
        allResults.push(...results);
      } catch (error) {
        console.error(`Error monitoring keyword "${keyword}" on Brand24:`, error);
      }
    }

    return allResults;
  }

  getPlatformName(): string {
    return 'brand24';
  }
}