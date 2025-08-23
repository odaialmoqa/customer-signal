import { createClient } from '@supabase/supabase-js';

// Types for sentiment analysis
export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions?: EmotionScore[];
  keywords?: string[];
  provider: string;
  processingTime: number;
}

export interface EmotionScore {
  emotion: string;
  score: number;
}

export interface BatchSentimentResult {
  results: SentimentResult[];
  totalProcessed: number;
  errors: string[];
  processingTime: number;
}

export interface SentimentProvider {
  name: string;
  analyzeSentiment(content: string): Promise<SentimentResult>;
  batchAnalyze?(contents: string[]): Promise<BatchSentimentResult>;
  isAvailable(): Promise<boolean>;
}

// Configuration for sentiment analysis
export interface SentimentConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  batchSize: number;
  timeout: number;
  enableEmotionAnalysis: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SentimentConfig = {
  primaryProvider: 'local',
  fallbackProviders: ['google', 'aws', 'azure'],
  batchSize: 100,
  timeout: 30000,
  enableEmotionAnalysis: true,
};

export class SentimentAnalysisService {
  private providers: Map<string, SentimentProvider> = new Map();
  private config: SentimentConfig;
  private supabase;
  private initialized = false;

  constructor(config: Partial<SentimentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  private async initializeProviders() {
    if (this.initialized) return;
    
    // Initialize all available providers
    const { LocalSentimentProvider } = await import('./sentiment/local-provider');
    const { GoogleCloudProvider } = await import('./sentiment/google-provider');
    const { AWSComprehendProvider } = await import('./sentiment/aws-provider');
    const { AzureTextAnalyticsProvider } = await import('./sentiment/azure-provider');

    this.providers.set('local', new LocalSentimentProvider());
    this.providers.set('google', new GoogleCloudProvider());
    this.providers.set('aws', new AWSComprehendProvider());
    this.providers.set('azure', new AzureTextAnalyticsProvider());
    
    this.initialized = true;
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const startTime = Date.now();
    
    // Ensure providers are initialized
    await this.initializeProviders();
    
    // Try primary provider first
    try {
      const primaryProvider = this.providers.get(this.config.primaryProvider);
      if (primaryProvider && await primaryProvider.isAvailable()) {
        const result = await this.executeWithTimeout(
          primaryProvider.analyzeSentiment(content),
          this.config.timeout
        );
        await this.logAnalysis(content, result, 'success');
        return result;
      }
    } catch (error) {
      console.warn(`Primary provider ${this.config.primaryProvider} failed:`, error);
      await this.logAnalysis(content, null, 'primary_failed', error as Error);
    }

    // Try fallback providers
    for (const providerName of this.config.fallbackProviders) {
      try {
        const provider = this.providers.get(providerName);
        if (provider && await provider.isAvailable()) {
          const result = await this.executeWithTimeout(
            provider.analyzeSentiment(content),
            this.config.timeout
          );
          await this.logAnalysis(content, result, 'fallback_success');
          return result;
        }
      } catch (error) {
        console.warn(`Fallback provider ${providerName} failed:`, error);
        await this.logAnalysis(content, null, 'fallback_failed', error as Error);
      }
    }

    // If all providers fail, return neutral sentiment
    const fallbackResult: SentimentResult = {
      sentiment: 'neutral',
      confidence: 0,
      provider: 'fallback',
      processingTime: Date.now() - startTime,
    };
    
    await this.logAnalysis(content, fallbackResult, 'all_failed');
    return fallbackResult;
  }

  async batchAnalyze(contents: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();
    const results: SentimentResult[] = [];
    const errors: string[] = [];

    // Ensure providers are initialized
    await this.initializeProviders();

    // Process in batches
    const batches = this.chunkArray(contents, this.config.batchSize);
    
    for (const batch of batches) {
      try {
        // Try to use batch processing if available
        const primaryProvider = this.providers.get(this.config.primaryProvider);
        if (primaryProvider?.batchAnalyze && await primaryProvider.isAvailable()) {
          const batchResult = await primaryProvider.batchAnalyze(batch);
          results.push(...batchResult.results);
          errors.push(...batchResult.errors);
        } else {
          // Fall back to individual processing
          const batchPromises = batch.map(content => 
            this.analyzeSentiment(content).catch(error => {
              errors.push(`Failed to analyze content: ${error.message}`);
              return null;
            })
          );
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(result => result !== null) as SentimentResult[]);
        }
      } catch (error) {
        errors.push(`Batch processing failed: ${(error as Error).message}`);
      }
    }

    const result: BatchSentimentResult = {
      results,
      totalProcessed: results.length,
      errors,
      processingTime: Date.now() - startTime,
    };

    await this.logBatchAnalysis(contents.length, result);
    return result;
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async logAnalysis(
    content: string,
    result: SentimentResult | null,
    status: string,
    error?: Error
  ) {
    try {
      await this.supabase.from('sentiment_analysis_logs').insert({
        content_preview: content.substring(0, 100),
        result: result,
        status,
        error_message: error?.message,
        provider: result?.provider || 'unknown',
        processing_time: result?.processingTime || 0,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log sentiment analysis:', logError);
    }
  }

  private async logBatchAnalysis(inputCount: number, result: BatchSentimentResult) {
    try {
      await this.supabase.from('sentiment_batch_logs').insert({
        input_count: inputCount,
        processed_count: result.totalProcessed,
        error_count: result.errors.length,
        processing_time: result.processingTime,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log batch sentiment analysis:', logError);
    }
  }

  async getProviderStatus(): Promise<Record<string, boolean>> {
    // Ensure providers are initialized
    await this.initializeProviders();
    
    const status: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      try {
        status[name] = await provider.isAvailable();
      } catch {
        status[name] = false;
      }
    }
    
    return status;
  }

  updateConfig(newConfig: Partial<SentimentConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Singleton instance
let sentimentService: SentimentAnalysisService | null = null;

export function getSentimentService(config?: Partial<SentimentConfig>): SentimentAnalysisService {
  if (!sentimentService) {
    sentimentService = new SentimentAnalysisService(config);
  }
  return sentimentService;
}