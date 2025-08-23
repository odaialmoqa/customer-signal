import { SentimentProvider, SentimentResult, BatchSentimentResult } from '../sentiment';

interface GoogleSentimentResponse {
  documentSentiment: {
    magnitude: number;
    score: number;
  };
  language: string;
  sentences?: Array<{
    text: {
      content: string;
      beginOffset: number;
    };
    sentiment: {
      magnitude: number;
      score: number;
    };
  }>;
}

export class GoogleCloudProvider implements SentimentProvider {
  name = 'google';
  private apiKey: string;
  private endpoint = 'https://language.googleapis.com/v1/documents:analyzeSentiment';

  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_API_KEY || '';
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error('Google Cloud API key not configured');
    }

    if (!content || content.trim().length === 0) {
      return {
        sentiment: 'neutral',
        confidence: 0,
        provider: this.name,
        processingTime: Date.now() - startTime,
      };
    }

    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            type: 'PLAIN_TEXT',
            content: content.substring(0, 1000), // Google has content limits
          },
          encodingType: 'UTF8',
        }),
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const data: GoogleSentimentResponse = await response.json();
      
      return this.parseGoogleResponse(data, Date.now() - startTime);
    } catch (error) {
      throw new Error(`Google sentiment analysis failed: ${(error as Error).message}`);
    }
  }

  async batchAnalyze(contents: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();
    const results: SentimentResult[] = [];
    const errors: string[] = [];

    // Google doesn't have a native batch API, so we process individually
    // but with rate limiting
    const batchSize = 10; // Process 10 at a time to respect rate limits
    
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchPromises = batch.map(async (content, index) => {
        try {
          // Add small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, index * 100));
          return await this.analyzeSentiment(content);
        } catch (error) {
          errors.push(`Failed to analyze content at index ${i + index}: ${(error as Error).message}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as SentimentResult[]);
    }

    return {
      results,
      totalProcessed: results.length,
      errors,
      processingTime: Date.now() - startTime,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a simple request
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            type: 'PLAIN_TEXT',
            content: 'test',
          },
          encodingType: 'UTF8',
        }),
      });

      return response.ok || response.status === 400; // 400 might be quota exceeded but service is available
    } catch {
      return false;
    }
  }

  private parseGoogleResponse(data: GoogleSentimentResponse, processingTime: number): SentimentResult {
    const score = data.documentSentiment.score;
    const magnitude = data.documentSentiment.magnitude;
    
    // Google's score ranges from -1 (negative) to 1 (positive)
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (score > 0.1) {
      sentiment = 'positive';
    } else if (score < -0.1) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // Confidence is based on magnitude (0 to infinity, but typically 0-4)
    // We normalize it to 0-1 scale
    const confidence = Math.min(magnitude / 2, 1);

    return {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      provider: this.name,
      processingTime,
    };
  }
}