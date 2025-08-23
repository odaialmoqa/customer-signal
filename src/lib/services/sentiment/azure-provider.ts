import { SentimentProvider, SentimentResult, BatchSentimentResult } from '../sentiment';

interface AzureDocument {
  id: string;
  text: string;
  language?: string;
}

interface AzureSentimentResponse {
  documents: Array<{
    id: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    confidenceScores: {
      positive: number;
      neutral: number;
      negative: number;
    };
    sentences: Array<{
      sentiment: string;
      confidenceScores: {
        positive: number;
        neutral: number;
        negative: number;
      };
      offset: number;
      length: number;
      text: string;
    }>;
  }>;
  errors: Array<{
    id: string;
    error: {
      code: string;
      message: string;
    };
  }>;
  modelVersion: string;
}

export class AzureTextAnalyticsProvider implements SentimentProvider {
  name = 'azure';
  private endpoint: string;
  private apiKey: string;
  private apiVersion = '2023-04-01';

  constructor() {
    this.endpoint = process.env.AZURE_TEXT_ANALYTICS_ENDPOINT || '';
    this.apiKey = process.env.AZURE_TEXT_ANALYTICS_KEY || '';
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const startTime = Date.now();

    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure Text Analytics credentials not configured');
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
      const documents: AzureDocument[] = [{
        id: '1',
        text: content.substring(0, 5120), // Azure has a 5120 character limit
        language: 'en',
      }];

      const response = await this.callAzureAPI('sentiment', { documents });
      
      if (response.errors && response.errors.length > 0) {
        throw new Error(`Azure API error: ${response.errors[0].error.message}`);
      }

      if (!response.documents || response.documents.length === 0) {
        throw new Error('No results returned from Azure API');
      }

      return this.parseAzureResponse(response.documents[0], Date.now() - startTime);
    } catch (error) {
      throw new Error(`Azure sentiment analysis failed: ${(error as Error).message}`);
    }
  }

  async batchAnalyze(contents: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();
    const results: SentimentResult[] = [];
    const errors: string[] = [];

    // Azure supports up to 10 documents per request
    const batchSize = 10;
    
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      
      try {
        const documents: AzureDocument[] = batch.map((content, index) => ({
          id: (i + index + 1).toString(),
          text: content.substring(0, 5120),
          language: 'en',
        }));

        const response = await this.callAzureAPI('sentiment', { documents });
        
        // Process successful results
        if (response.documents) {
          for (const doc of response.documents) {
            results.push(this.parseAzureResponse(doc, 0));
          }
        }

        // Process errors
        if (response.errors) {
          for (const error of response.errors) {
            errors.push(`Document ${error.id}: ${error.error.message}`);
          }
        }
      } catch (error) {
        errors.push(`Batch processing failed: ${(error as Error).message}`);
      }
    }

    return {
      results,
      totalProcessed: results.length,
      errors,
      processingTime: Date.now() - startTime,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.endpoint || !this.apiKey) {
      return false;
    }

    try {
      // Test with a simple request
      const documents: AzureDocument[] = [{
        id: '1',
        text: 'test',
        language: 'en',
      }];

      const response = await this.callAzureAPI('sentiment', { documents });
      return response !== null;
    } catch {
      return false;
    }
  }

  private async callAzureAPI(endpoint: string, payload: any): Promise<AzureSentimentResponse> {
    const url = `${this.endpoint}/text/analytics/v${this.apiVersion}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private parseAzureResponse(
    document: AzureSentimentResponse['documents'][0],
    processingTime: number
  ): SentimentResult {
    let sentiment: 'positive' | 'negative' | 'neutral';
    
    // Azure returns 'mixed' sentiment, but we normalize to our three categories
    switch (document.sentiment) {
      case 'positive':
        sentiment = 'positive';
        break;
      case 'negative':
        sentiment = 'negative';
        break;
      case 'mixed':
      case 'neutral':
      default:
        sentiment = 'neutral';
        break;
    }

    // Calculate confidence from the highest confidence score
    const scores = document.confidenceScores;
    const confidence = Math.max(scores.positive, scores.negative, scores.neutral);

    return {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      provider: this.name,
      processingTime,
    };
  }

  // Additional method for language detection (Azure specialty)
  async detectLanguage(content: string): Promise<string> {
    if (!this.endpoint || !this.apiKey) {
      return 'en'; // Default to English
    }

    try {
      const documents = [{
        id: '1',
        text: content.substring(0, 5120),
      }];

      const response = await this.callAzureAPI('languages', { documents });
      
      if (response.documents && response.documents.length > 0) {
        // Azure language detection returns different structure
        const doc = response.documents[0] as any;
        if (doc.detectedLanguage) {
          return doc.detectedLanguage.iso6391Name || 'en';
        }
      }
      
      return 'en';
    } catch {
      return 'en'; // Default to English on error
    }
  }
}