import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MentionAdapter } from '../../../supabase/functions/_shared/platform-adapters/mention-adapter';
import { Brand24Adapter } from '../../../supabase/functions/_shared/platform-adapters/brand24-adapter';
import { GoogleTrendsAdapter } from '../../../supabase/functions/_shared/platform-adapters/google-trends-adapter';
import { BrandwatchAdapter } from '../../../supabase/functions/_shared/platform-adapters/brandwatch-adapter';
import { HootsuiteAdapter } from '../../../supabase/functions/_shared/platform-adapters/hootsuite-adapter';
import { SproutSocialAdapter } from '../../../supabase/functions/_shared/platform-adapters/sprout-social-adapter';
import { BuzzSumoAdapter } from '../../../supabase/functions/_shared/platform-adapters/buzzsumo-adapter';

// Mock fetch globally
global.fetch = vi.fn();

describe('Advanced Monitoring Adapters Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MentionAdapter Unit Tests', () => {
    let adapter: MentionAdapter;

    beforeEach(() => {
      adapter = new MentionAdapter({
        apiToken: 'test-token',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('mention');
    });

    it('should transform mentions correctly', async () => {
      const mockMention = {
        id: '123',
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        published_at: '2024-01-01T00:00:00Z',
        author_name: 'Test Author',
        author_url: 'https://example.com/author',
        source_name: 'Test Source',
        source_url: 'https://example.com/source',
        tone: 'positive',
        reach: 1000,
        country: 'US',
        language: 'en',
        tags: ['test']
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mentions: [mockMention] })
      });

      const results = await adapter.searchMentions('test');
      const transformed = results[0];

      expect(transformed.id).toBe('mention_123');
      expect(transformed.content).toBe('Test Description');
      expect(transformed.title).toBe('Test Title');
      expect(transformed.author).toBe('Test Author');
      expect(transformed.platform).toBe('mention');
      expect(transformed.sentiment).toBe('positive');
      expect(transformed.engagement.reach).toBe(1000);
      expect(transformed.metadata.source).toBe('mention.com');
    });

    it('should map tone to sentiment correctly', async () => {
      const testCases = [
        { tone: 'positive', expected: 'positive' },
        { tone: 'negative', expected: 'negative' },
        { tone: 'neutral', expected: 'neutral' },
        { tone: 'unknown', expected: 'neutral' }
      ];

      for (const testCase of testCases) {
        const mockMention = {
          id: '123',
          title: 'Test',
          description: 'Test',
          url: 'https://example.com',
          published_at: '2024-01-01T00:00:00Z',
          author_name: 'Test',
          source_name: 'Test',
          source_url: 'https://example.com',
          tone: testCase.tone,
          reach: 100,
          country: 'US',
          language: 'en',
          tags: []
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ mentions: [mockMention] })
        });

        const results = await adapter.searchMentions('test');
        expect(results[0].sentiment).toBe(testCase.expected);
      }
    });

    it('should handle missing optional fields', async () => {
      const mockMention = {
        id: '123',
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        published_at: '2024-01-01T00:00:00Z',
        source_name: 'Test Source',
        source_url: 'https://example.com/source',
        tone: 'neutral',
        reach: 500,
        country: 'US',
        language: 'en',
        tags: []
        // Missing author_name, author_url
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mentions: [mockMention] })
      });

      const results = await adapter.searchMentions('test');
      const transformed = results[0];

      expect(transformed.author).toBe('Unknown');
      expect(transformed.authorUrl).toBeUndefined();
    });
  });

  describe('Brand24Adapter Unit Tests', () => {
    let adapter: Brand24Adapter;

    beforeEach(() => {
      adapter = new Brand24Adapter({
        apiToken: 'test-token',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('brand24');
    });

    it('should map sentiment scores correctly', async () => {
      const testCases = [
        { score: 0.5, expected: 'positive' },
        { score: -0.5, expected: 'negative' },
        { score: 0.05, expected: 'neutral' },
        { score: -0.05, expected: 'neutral' }
      ];

      for (const testCase of testCases) {
        const mockMention = {
          id: 123,
          url: 'https://example.com',
          title: 'Test',
          snippet: 'Test snippet',
          date: '2024-01-01T00:00:00Z',
          author: 'Test Author',
          source: 'Test Source',
          source_type: 'blog',
          sentiment: testCase.score,
          reach: 100,
          influence_score: 50,
          tags: [],
          country: 'US',
          language: 'en'
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [mockMention] })
        });

        const results = await adapter.searchMentions('project-123');
        expect(results[0].sentiment).toBe(testCase.expected);
      }
    });

    it('should transform mentions with all fields', async () => {
      const mockMention = {
        id: 456,
        url: 'https://example.com/post',
        title: 'Brand24 Test',
        snippet: 'This is a test snippet',
        date: '2024-01-01T00:00:00Z',
        author: 'Brand24 Author',
        source: 'Brand24 Source',
        source_type: 'social',
        sentiment: 0.3,
        reach: 2000,
        influence_score: 75,
        tags: ['brand24', 'test'],
        country: 'UK',
        language: 'en'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [mockMention] })
      });

      const results = await adapter.searchMentions('project-123');
      const transformed = results[0];

      expect(transformed.id).toBe('brand24_456');
      expect(transformed.content).toBe('This is a test snippet');
      expect(transformed.title).toBe('Brand24 Test');
      expect(transformed.platform).toBe('brand24');
      expect(transformed.platformSpecific.sourceType).toBe('social');
      expect(transformed.platformSpecific.influenceScore).toBe(75);
      expect(transformed.metadata.tags).toEqual(['brand24', 'test']);
    });
  });

  describe('GoogleTrendsAdapter Unit Tests', () => {
    let adapter: GoogleTrendsAdapter;

    beforeEach(() => {
      adapter = new GoogleTrendsAdapter({
        region: 'US',
        language: 'en',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('google-trends');
    });

    it('should generate mock trend data with correct structure', async () => {
      const results = await adapter.getTrendData(['test keyword']);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        keyword: 'test keyword',
        region: 'US',
        date: expect.any(String),
        interest: expect.any(Number),
        relatedQueries: expect.any(Array),
        risingQueries: expect.any(Array)
      });
      expect(results[0].interest).toBeGreaterThanOrEqual(0);
      expect(results[0].interest).toBeLessThanOrEqual(100);
    });

    it('should calculate timeframe days correctly', async () => {
      const testCases = [
        { timeframe: 'now 1-d', expectedDays: 1 },
        { timeframe: 'now 7-d', expectedDays: 7 },
        { timeframe: 'today 1-m', expectedDays: 30 },
        { timeframe: 'today 12-m', expectedDays: 365 }
      ];

      for (const testCase of testCases) {
        const results = await adapter.getInterestOverTime(['test'], {
          timeframe: testCase.timeframe
        });

        // Should have approximately the right number of data points
        expect(results.length).toBeGreaterThanOrEqual(testCase.expectedDays);
      }
    });

    it('should transform trend data to conversation format', async () => {
      const results = await adapter.monitor(['test keyword']);

      expect(results).toHaveLength(1);
      const conversation = results[0];

      expect(conversation.platform).toBe('google-trends');
      expect(conversation.sentiment).toBe('neutral');
      expect(conversation.author).toBe('Google Trends');
      expect(conversation.url).toContain('trends.google.com');
      expect(conversation.metadata.source).toBe('google-trends');
      expect(conversation.platformSpecific.interestScore).toBeGreaterThanOrEqual(0);
      expect(conversation.platformSpecific.interestScore).toBeLessThanOrEqual(100);
    });
  });

  describe('BrandwatchAdapter Unit Tests', () => {
    let adapter: BrandwatchAdapter;

    beforeEach(() => {
      adapter = new BrandwatchAdapter({
        username: 'test-user',
        password: 'test-pass',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('brandwatch');
    });

    it('should map sentiment scores correctly', async () => {
      const testCases = [
        { score: 3, expected: 'positive' },
        { score: -3, expected: 'negative' },
        { score: 0.5, expected: 'neutral' },
        { score: -0.5, expected: 'neutral' }
      ];

      // Mock authentication
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-token',
          expires_in: 3600
        })
      });

      for (const testCase of testCases) {
        const mockMention = {
          id: 'bw-123',
          title: 'Test',
          content: 'Test content',
          url: 'https://example.com',
          date: '2024-01-01T00:00:00Z',
          author: { name: 'Test Author' },
          source: { name: 'Test Source', type: 'twitter', url: 'https://twitter.com' },
          sentiment: testCase.score,
          reach: 100,
          engagement: { likes: 1, shares: 1, comments: 1 },
          location: { country: 'US', region: 'CA' },
          language: 'en',
          tags: [],
          categories: []
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [mockMention] })
        });

        const results = await adapter.searchMentions('project-123');
        expect(results[0].sentiment).toBe(testCase.expected);
      }
    });
  });

  describe('HootsuiteAdapter Unit Tests', () => {
    let adapter: HootsuiteAdapter;

    beforeEach(() => {
      adapter = new HootsuiteAdapter({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('hootsuite');
    });

    it('should transform messages correctly', async () => {
      const mockMessage = {
        id: 'hs-123',
        text: 'Hootsuite test message',
        author: {
          id: 'author-123',
          name: 'Test Author',
          screen_name: 'testauthor',
          profile_image_url: 'https://example.com/avatar.jpg',
          followers_count: 1000
        },
        network: 'twitter',
        url: 'https://twitter.com/status/123',
        created_time: '2024-01-01T00:00:00Z',
        sentiment: {
          score: 0.8,
          label: 'positive'
        },
        engagement: {
          likes: 20,
          shares: 5,
          comments: 2
        },
        reach: 2000,
        location: { country: 'US', region: 'CA' },
        language: 'en',
        tags: ['hootsuite']
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockMessage] })
      });

      const results = await adapter.getStreamMessages('stream-123');
      const transformed = results[0];

      expect(transformed.id).toBe('hootsuite_hs-123');
      expect(transformed.content).toBe('Hootsuite test message');
      expect(transformed.platform).toBe('hootsuite');
      expect(transformed.sentiment).toBe('positive');
      expect(transformed.platformSpecific.network).toBe('twitter');
      expect(transformed.platformSpecific.authorFollowers).toBe(1000);
      expect(transformed.authorUrl).toBe('https://twitter.com/testauthor');
    });

    it('should handle token refresh logic', async () => {
      // Mock initial 401 response
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      // Mock successful token refresh
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-token',
          refresh_token: 'new-refresh-token'
        })
      });

      // Mock successful retry
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      const results = await adapter.getStreams();
      expect(results).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(3); // Initial call, refresh, retry
    });
  });

  describe('SproutSocialAdapter Unit Tests', () => {
    let adapter: SproutSocialAdapter;

    beforeEach(() => {
      adapter = new SproutSocialAdapter({
        accessToken: 'test-access-token',
        customerId: 'customer-123',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('sprout-social');
    });

    it('should generate correct author URLs for different networks', async () => {
      const networks = [
        { network: 'twitter', username: 'testuser', expected: 'https://twitter.com/testuser' },
        { network: 'facebook', username: 'testuser', expected: 'https://facebook.com/testuser' },
        { network: 'instagram', username: 'testuser', expected: 'https://instagram.com/testuser' },
        { network: 'linkedin', username: 'testuser', expected: 'https://linkedin.com/in/testuser' },
        { network: 'youtube', username: 'testuser', expected: 'https://youtube.com/@testuser' },
        { network: 'unknown', username: 'testuser', expected: '' }
      ];

      for (const networkTest of networks) {
        const mockMessage = {
          id: 'sprout-123',
          text: 'Test message',
          author: {
            id: 'author-123',
            name: 'Test Author',
            username: networkTest.username,
            follower_count: 500
          },
          network: networkTest.network,
          network_id: 'net-123',
          url: 'https://example.com/post',
          created_time: '2024-01-01T00:00:00Z',
          sentiment: {
            score: 75,
            polarity: 'positive',
            confidence: 0.8
          },
          engagement: {
            likes: 10,
            shares: 3,
            comments: 1,
            replies: 0
          },
          reach: 1000,
          impressions: 2000,
          language: 'en',
          tags: [],
          categories: [],
          priority: 'medium'
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [mockMessage] })
        });

        const results = await adapter.getMessages('query-123');
        expect(results[0].authorUrl).toBe(networkTest.expected);
      }
    });

    it('should transform messages with all fields correctly', async () => {
      const mockMessage = {
        id: 'sprout-456',
        text: 'Complete Sprout Social message',
        author: {
          id: 'author-456',
          name: 'Complete Author',
          username: 'completeauthor',
          profile_image_url: 'https://example.com/profile.jpg',
          follower_count: 5000,
          verified: true
        },
        network: 'twitter',
        network_id: 'twitter-456',
        url: 'https://twitter.com/status/456',
        created_time: '2024-01-01T00:00:00Z',
        sentiment: {
          score: 90,
          polarity: 'positive',
          confidence: 0.95
        },
        engagement: {
          likes: 50,
          shares: 15,
          comments: 8,
          replies: 3
        },
        reach: 10000,
        impressions: 25000,
        location: {
          name: 'San Francisco',
          country_code: 'US'
        },
        language: 'en',
        tags: ['sprout', 'social'],
        categories: ['marketing'],
        priority: 'high'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockMessage] })
      });

      const results = await adapter.getMessages('query-123');
      const transformed = results[0];

      expect(transformed.id).toBe('sprout_sprout-456');
      expect(transformed.platform).toBe('sprout-social');
      expect(transformed.platformSpecific.authorVerified).toBe(true);
      expect(transformed.platformSpecific.impressions).toBe(25000);
      expect(transformed.platformSpecific.priority).toBe('high');
      expect(transformed.metadata.sentimentScore).toBe(90);
      expect(transformed.metadata.sentimentConfidence).toBe(0.95);
    });
  });

  describe('BuzzSumoAdapter Unit Tests', () => {
    let adapter: BuzzSumoAdapter;

    beforeEach(() => {
      adapter = new BuzzSumoAdapter({
        apiKey: 'test-api-key',
        rateLimitPerMinute: 60
      });
    });

    it('should initialize with correct configuration', () => {
      expect(adapter.getPlatformName()).toBe('buzzsumo');
    });

    it('should transform articles correctly', async () => {
      const mockArticle = {
        id: 'buzz-789',
        title: 'BuzzSumo Test Article',
        url: 'https://example.com/article',
        domain_name: 'example.com',
        published_date: '2024-01-01T00:00:00Z',
        author_name: 'BuzzSumo Author',
        word_count: 2000,
        total_shares: 500,
        facebook_shares: 200,
        twitter_shares: 150,
        linkedin_shares: 100,
        pinterest_shares: 30,
        reddit_shares: 20,
        evergreen_score: 85,
        content_type: 'article',
        language: 'en',
        country: 'US',
        amplifiers: [
          {
            name: 'Top Influencer',
            type: 'twitter',
            followers: 100000,
            shares: 10
          }
        ],
        backlinks: 50,
        domain_authority: 75
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [mockArticle] })
      });

      const results = await adapter.searchContent('test query');
      const transformed = results[0];

      expect(transformed.id).toBe('buzzsumo_buzz-789');
      expect(transformed.content).toBe('BuzzSumo Test Article');
      expect(transformed.platform).toBe('buzzsumo');
      expect(transformed.sentiment).toBe('neutral');
      expect(transformed.engagement.shares).toBe(500);
      expect(transformed.engagement.reach).toBe(5000); // shares * 10
      expect(transformed.platformSpecific.evergreenScore).toBe(85);
      expect(transformed.platformSpecific.domainAuthority).toBe(75);
      expect(transformed.metadata.shareBreakdown.facebook).toBe(200);
      expect(transformed.metadata.amplifiers).toHaveLength(1);
    });

    it('should handle missing author name', async () => {
      const mockArticle = {
        id: 'buzz-no-author',
        title: 'Article Without Author',
        url: 'https://example.com/no-author',
        domain_name: 'example.com',
        published_date: '2024-01-01T00:00:00Z',
        // author_name is missing
        word_count: 1000,
        total_shares: 100,
        facebook_shares: 40,
        twitter_shares: 30,
        linkedin_shares: 20,
        pinterest_shares: 8,
        reddit_shares: 2,
        evergreen_score: 60,
        content_type: 'blog',
        language: 'en',
        country: 'US',
        amplifiers: [],
        backlinks: 10,
        domain_authority: 50
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [mockArticle] })
      });

      const results = await adapter.searchContent('test query');
      expect(results[0].author).toBe('Unknown');
    });

    it('should calculate reach correctly based on shares', async () => {
      const testCases = [
        { shares: 100, expectedReach: 1000 },
        { shares: 0, expectedReach: 0 },
        { shares: 1000, expectedReach: 10000 }
      ];

      for (const testCase of testCases) {
        const mockArticle = {
          id: 'buzz-reach-test',
          title: 'Reach Test Article',
          url: 'https://example.com/reach-test',
          domain_name: 'example.com',
          published_date: '2024-01-01T00:00:00Z',
          author_name: 'Test Author',
          word_count: 1500,
          total_shares: testCase.shares,
          facebook_shares: Math.floor(testCase.shares * 0.4),
          twitter_shares: Math.floor(testCase.shares * 0.3),
          linkedin_shares: Math.floor(testCase.shares * 0.2),
          pinterest_shares: Math.floor(testCase.shares * 0.08),
          reddit_shares: Math.floor(testCase.shares * 0.02),
          evergreen_score: 70,
          content_type: 'article',
          language: 'en',
          country: 'US',
          amplifiers: [],
          backlinks: 25,
          domain_authority: 60
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ results: [mockArticle] })
        });

        const results = await adapter.searchContent('test query');
        expect(results[0].engagement.reach).toBe(testCase.expectedReach);
      }
    });
  });

  describe('Common Adapter Functionality', () => {
    it('should all extend BasePlatformAdapter correctly', () => {
      const adapters = [
        new MentionAdapter({ apiToken: 'test', rateLimitPerMinute: 60 }),
        new Brand24Adapter({ apiToken: 'test', rateLimitPerMinute: 60 }),
        new GoogleTrendsAdapter({ rateLimitPerMinute: 60 }),
        new BrandwatchAdapter({ 
          username: 'test', 
          password: 'test', 
          clientId: 'test', 
          clientSecret: 'test',
          rateLimitPerMinute: 60 
        }),
        new HootsuiteAdapter({ accessToken: 'test', rateLimitPerMinute: 60 }),
        new SproutSocialAdapter({ 
          accessToken: 'test', 
          customerId: 'test',
          rateLimitPerMinute: 60 
        }),
        new BuzzSumoAdapter({ apiKey: 'test', rateLimitPerMinute: 60 })
      ];

      for (const adapter of adapters) {
        expect(typeof adapter.getPlatformName).toBe('function');
        expect(typeof adapter.monitor).toBe('function');
        expect(adapter.getPlatformName()).toBeTruthy();
      }
    });

    it('should all have unique platform names', () => {
      const adapters = [
        new MentionAdapter({ apiToken: 'test', rateLimitPerMinute: 60 }),
        new Brand24Adapter({ apiToken: 'test', rateLimitPerMinute: 60 }),
        new GoogleTrendsAdapter({ rateLimitPerMinute: 60 }),
        new BrandwatchAdapter({ 
          username: 'test', 
          password: 'test', 
          clientId: 'test', 
          clientSecret: 'test',
          rateLimitPerMinute: 60 
        }),
        new HootsuiteAdapter({ accessToken: 'test', rateLimitPerMinute: 60 }),
        new SproutSocialAdapter({ 
          accessToken: 'test', 
          customerId: 'test',
          rateLimitPerMinute: 60 
        }),
        new BuzzSumoAdapter({ apiKey: 'test', rateLimitPerMinute: 60 })
      ];

      const platformNames = adapters.map(adapter => adapter.getPlatformName());
      const uniqueNames = new Set(platformNames);

      expect(uniqueNames.size).toBe(platformNames.length);
    });
  });
});