import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SentimentAnalysisService } from '@/lib/services/sentiment';
import { LocalSentimentProvider } from '@/lib/services/sentiment/local-provider';
import { GoogleCloudProvider } from '@/lib/services/sentiment/google-provider';
import { AWSComprehendProvider } from '@/lib/services/sentiment/aws-provider';
import { AzureTextAnalyticsProvider } from '@/lib/services/sentiment/azure-provider';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  };
});

afterEach(() => {
  process.env = originalEnv;
  vi.clearAllMocks();
});

describe('SentimentAnalysisService', () => {
  let service: SentimentAnalysisService;

  beforeEach(() => {
    service = new SentimentAnalysisService({
      primaryProvider: 'local',
      fallbackProviders: ['google'],
      timeout: 5000,
    });
  });

  describe('analyzeSentiment', () => {
    it('should analyze positive sentiment correctly', async () => {
      const result = await service.analyzeSentiment('This product is amazing and I love it!');
      
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('local');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should analyze negative sentiment correctly', async () => {
      const result = await service.analyzeSentiment('This is terrible and I hate it!');
      
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('local');
    });

    it('should analyze neutral sentiment correctly', async () => {
      const result = await service.analyzeSentiment('This is a product.');
      
      expect(result.sentiment).toBe('neutral');
      expect(result.provider).toBe('local');
    });

    it('should handle empty content', async () => {
      const result = await service.analyzeSentiment('');
      
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0);
    });

    it('should fall back to secondary provider when primary fails', async () => {
      // Mock primary provider to fail
      const mockProvider = {
        name: 'failing-provider',
        analyzeSentiment: vi.fn().mockRejectedValue(new Error('Provider failed')),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      service = new SentimentAnalysisService({
        primaryProvider: 'failing-provider',
        fallbackProviders: ['local'],
      });

      // Manually set the failing provider
      (service as any).providers.set('failing-provider', mockProvider);

      const result = await service.analyzeSentiment('Test content');
      
      expect(result.provider).toBe('local');
      expect(mockProvider.analyzeSentiment).toHaveBeenCalled();
    });

    it('should return fallback result when all providers fail', async () => {
      const mockProvider = {
        name: 'failing-provider',
        analyzeSentiment: vi.fn().mockRejectedValue(new Error('Provider failed')),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      service = new SentimentAnalysisService({
        primaryProvider: 'failing-provider',
        fallbackProviders: ['failing-provider'],
      });

      (service as any).providers.set('failing-provider', mockProvider);

      const result = await service.analyzeSentiment('Test content');
      
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0);
      expect(result.provider).toBe('fallback');
    });
  });

  describe('batchAnalyze', () => {
    it('should process multiple contents correctly', async () => {
      const contents = [
        'This is amazing!',
        'This is terrible!',
        'This is okay.',
      ];

      const result = await service.batchAnalyze(contents);
      
      expect(result.results).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      
      expect(result.results[0].sentiment).toBe('positive');
      expect(result.results[1].sentiment).toBe('negative');
      expect(result.results[2].sentiment).toBe('neutral');
    });

    it('should handle empty batch', async () => {
      const result = await service.batchAnalyze([]);
      
      expect(result.results).toHaveLength(0);
      expect(result.totalProcessed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle batch with errors gracefully', async () => {
      const mockProvider = {
        name: 'error-provider',
        analyzeSentiment: vi.fn()
          .mockResolvedValueOnce({ sentiment: 'positive', confidence: 0.8, provider: 'error-provider', processingTime: 100 })
          .mockRejectedValueOnce(new Error('Analysis failed')),
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      service = new SentimentAnalysisService({
        primaryProvider: 'error-provider',
        fallbackProviders: ['local'], // Add local as fallback
      });

      (service as any).providers.set('error-provider', mockProvider);

      const result = await service.batchAnalyze(['Good content', 'Bad content']);
      
      // Should have 2 results (one from error-provider, one from local fallback)
      expect(result.results).toHaveLength(2);
      expect(result.totalProcessed).toBe(2);
      // No errors since fallback succeeded
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getProviderStatus', () => {
    it('should return status for all providers', async () => {
      const status = await service.getProviderStatus();
      
      expect(status).toHaveProperty('local');
      expect(status).toHaveProperty('google');
      expect(status).toHaveProperty('aws');
      expect(status).toHaveProperty('azure');
      
      expect(status.local).toBe(true); // Local provider is always available
    });
  });

  describe('updateConfig', () => {
    it('should update configuration correctly', () => {
      service.updateConfig({
        primaryProvider: 'google',
        batchSize: 50,
      });

      expect((service as any).config.primaryProvider).toBe('google');
      expect((service as any).config.batchSize).toBe(50);
    });
  });
});

describe('LocalSentimentProvider', () => {
  let provider: LocalSentimentProvider;

  beforeEach(() => {
    provider = new LocalSentimentProvider();
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment with positive words', async () => {
      const result = await provider.analyzeSentiment('This is amazing and wonderful!');
      
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('amazing');
      expect(result.keywords).toContain('wonderful');
    });

    it('should detect negative sentiment with negative words', async () => {
      const result = await provider.analyzeSentiment('This is terrible and awful!');
      
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords).toContain('terrible');
      expect(result.keywords).toContain('awful');
    });

    it('should handle negations correctly', async () => {
      const result = await provider.analyzeSentiment('This is not good at all');
      
      // "not good" should be interpreted as negative
      expect(result.sentiment).toBe('negative');
    });

    it('should handle intensifiers correctly', async () => {
      const positiveResult = await provider.analyzeSentiment('This is very good');
      const regularResult = await provider.analyzeSentiment('This is good');
      
      // Both should be positive, but intensified version should have higher or equal confidence
      expect(positiveResult.sentiment).toBe('positive');
      expect(regularResult.sentiment).toBe('positive');
      expect(positiveResult.confidence).toBeGreaterThanOrEqual(regularResult.confidence);
    });

    it('should return neutral for neutral content', async () => {
      const result = await provider.analyzeSentiment('This is a product description.');
      
      expect(result.sentiment).toBe('neutral');
    });

    it('should handle empty content', async () => {
      const result = await provider.analyzeSentiment('');
      
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0);
    });
  });

  describe('batchAnalyze', () => {
    it('should process batch correctly', async () => {
      const contents = [
        'This is great!',
        'This is bad!',
        'This is neutral.',
      ];

      const result = await provider.batchAnalyze(contents);
      
      expect(result.results).toHaveLength(3);
      expect(result.totalProcessed).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('isAvailable', () => {
    it('should always return true', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });
});

describe('GoogleCloudProvider', () => {
  let provider: GoogleCloudProvider;

  beforeEach(() => {
    provider = new GoogleCloudProvider();
  });

  describe('isAvailable', () => {
    it('should return false when API key is not configured', async () => {
      process.env.GOOGLE_CLOUD_API_KEY = '';
      provider = new GoogleCloudProvider();
      
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should test API availability when key is configured', async () => {
      process.env.GOOGLE_CLOUD_API_KEY = 'test-key';
      provider = new GoogleCloudProvider();

      // Mock fetch to simulate API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          documentSentiment: { score: 0.5, magnitude: 0.8 }
        }),
      });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });
  });

  describe('analyzeSentiment', () => {
    beforeEach(() => {
      process.env.GOOGLE_CLOUD_API_KEY = 'test-key';
      provider = new GoogleCloudProvider();
    });

    it('should throw error when API key is not configured', async () => {
      process.env.GOOGLE_CLOUD_API_KEY = '';
      provider = new GoogleCloudProvider();

      await expect(provider.analyzeSentiment('test')).rejects.toThrow('Google Cloud API key not configured');
    });

    it('should analyze sentiment successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          documentSentiment: { score: 0.8, magnitude: 1.2 }
        }),
      });

      const result = await provider.analyzeSentiment('This is great!');
      
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('google');
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(provider.analyzeSentiment('test')).rejects.toThrow('Google API error');
    });
  });
});

describe('AWSComprehendProvider', () => {
  let provider: AWSComprehendProvider;

  beforeEach(() => {
    provider = new AWSComprehendProvider();
  });

  describe('isAvailable', () => {
    it('should return false when credentials are not configured', async () => {
      process.env.AWS_ACCESS_KEY_ID = '';
      process.env.AWS_SECRET_ACCESS_KEY = '';
      provider = new AWSComprehendProvider();
      
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('analyzeSentiment', () => {
    it('should throw error when credentials are not configured', async () => {
      process.env.AWS_ACCESS_KEY_ID = '';
      process.env.AWS_SECRET_ACCESS_KEY = '';
      provider = new AWSComprehendProvider();

      await expect(provider.analyzeSentiment('test')).rejects.toThrow('AWS credentials not configured');
    });
  });
});

describe('AzureTextAnalyticsProvider', () => {
  let provider: AzureTextAnalyticsProvider;

  beforeEach(() => {
    provider = new AzureTextAnalyticsProvider();
  });

  describe('isAvailable', () => {
    it('should return false when credentials are not configured', async () => {
      process.env.AZURE_TEXT_ANALYTICS_ENDPOINT = '';
      process.env.AZURE_TEXT_ANALYTICS_KEY = '';
      provider = new AzureTextAnalyticsProvider();
      
      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('analyzeSentiment', () => {
    it('should throw error when credentials are not configured', async () => {
      process.env.AZURE_TEXT_ANALYTICS_ENDPOINT = '';
      process.env.AZURE_TEXT_ANALYTICS_KEY = '';
      provider = new AzureTextAnalyticsProvider();

      await expect(provider.analyzeSentiment('test')).rejects.toThrow('Azure Text Analytics credentials not configured');
    });
  });
});