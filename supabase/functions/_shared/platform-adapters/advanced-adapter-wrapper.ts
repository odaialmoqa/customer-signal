import { PlatformAdapter, RawContent, SearchOptions } from './base-adapter.ts';
import { BasePlatformAdapter, ConversationData } from './advanced-base-adapter.ts';

/**
 * Wrapper class to make advanced monitoring adapters compatible with the existing PlatformAdapter interface
 */
export class AdvancedAdapterWrapper extends PlatformAdapter {
  private advancedAdapter: BasePlatformAdapter;
  
  readonly platformName: string;
  readonly rateLimitPerHour: number;
  readonly requiresAuth: boolean;

  constructor(advancedAdapter: BasePlatformAdapter, requiresAuth: boolean = true) {
    super();
    this.advancedAdapter = advancedAdapter;
    this.platformName = advancedAdapter.getPlatformName();
    this.rateLimitPerHour = advancedAdapter.getRateLimit().requestsPerMinute * 60;
    this.requiresAuth = requiresAuth;
  }

  async search(keyword: string, options?: SearchOptions): Promise<RawContent[]> {
    try {
      const conversations = await this.advancedAdapter.monitor([keyword]);
      return this.convertConversationsToRawContent(conversations);
    } catch (error) {
      throw this.handleError(error, 'search');
    }
  }

  async getContent(id: string): Promise<RawContent | null> {
    // Most advanced monitoring APIs don't support getting content by ID
    // This would need to be implemented per adapter if needed
    return null;
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      // Try to perform a simple operation to validate configuration
      await this.advancedAdapter.monitor(['test']);
      return true;
    } catch (error) {
      return false;
    }
  }

  protected buildSearchQuery(keyword: string, options?: SearchOptions): string {
    // Advanced adapters handle query building internally
    return keyword;
  }

  private convertConversationsToRawContent(conversations: ConversationData[]): RawContent[] {
    return conversations.map(conv => ({
      id: conv.id,
      content: conv.content,
      author: conv.author,
      url: conv.url,
      timestamp: conv.publishedAt.toISOString(),
      engagement: {
        likes: conv.engagement.likes,
        shares: conv.engagement.shares,
        comments: conv.engagement.comments,
        views: conv.engagement.reach
      },
      metadata: {
        ...conv.metadata,
        platform: conv.platform,
        sentiment: conv.sentiment,
        platformSpecific: conv.platformSpecific
      }
    }));
  }
}