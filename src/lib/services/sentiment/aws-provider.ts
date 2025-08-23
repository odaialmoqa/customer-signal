import { SentimentProvider, SentimentResult, BatchSentimentResult, EmotionScore } from '../sentiment';

interface AWSComprehendResponse {
  Sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  SentimentScore: {
    Positive: number;
    Negative: number;
    Neutral: number;
    Mixed: number;
  };
}

interface AWSEmotionResponse {
  ResultList: Array<{
    Index: number;
    Emotion: Array<{
      Name: string;
      Score: number;
    }>;
  }>;
}

export class AWSComprehendProvider implements SentimentProvider {
  name = 'aws';
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;
  private endpoint: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    this.endpoint = `https://comprehend.${this.region}.amazonaws.com/`;
  }

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const startTime = Date.now();

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
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
      // Analyze sentiment
      const sentimentResult = await this.callAWSComprehend('DetectSentiment', {
        Text: content.substring(0, 5000), // AWS has a 5000 byte limit
        LanguageCode: 'en',
      });

      // Analyze emotions if available
      let emotions: EmotionScore[] = [];
      try {
        const emotionResult = await this.callAWSComprehend('BatchDetectTargetedSentiment', {
          TextList: [content.substring(0, 5000)],
          LanguageCode: 'en',
        });
        emotions = this.parseEmotions(emotionResult);
      } catch {
        // Emotion analysis is optional, continue without it
      }

      return this.parseAWSResponse(sentimentResult, emotions, Date.now() - startTime);
    } catch (error) {
      throw new Error(`AWS Comprehend analysis failed: ${(error as Error).message}`);
    }
  }

  async batchAnalyze(contents: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();
    const results: SentimentResult[] = [];
    const errors: string[] = [];

    // AWS Comprehend supports batch processing up to 25 documents
    const batchSize = 25;
    
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      
      try {
        const batchRequest = {
          TextList: batch.map(content => content.substring(0, 5000)),
          LanguageCode: 'en',
        };

        const response = await this.callAWSComprehend('BatchDetectSentiment', batchRequest);
        
        if (response.ResultList) {
          for (let j = 0; j < response.ResultList.length; j++) {
            const result = response.ResultList[j];
            if (result.Sentiment) {
              results.push(this.parseAWSResponse(result, [], 0));
            }
          }
        }

        if (response.ErrorList) {
          for (const error of response.ErrorList) {
            errors.push(`Batch item ${error.Index}: ${error.ErrorMessage}`);
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
    if (!this.accessKeyId || !this.secretAccessKey) {
      return false;
    }

    try {
      // Test with a simple request
      await this.callAWSComprehend('DetectSentiment', {
        Text: 'test',
        LanguageCode: 'en',
      });
      return true;
    } catch {
      return false;
    }
  }

  private async callAWSComprehend(action: string, payload: any): Promise<any> {
    const headers = await this.getAWSHeaders(action, JSON.stringify(payload));
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AWS API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  private async getAWSHeaders(action: string, payload: string): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);

    // This is a simplified version - in production, use AWS SDK or proper signing
    return {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `Comprehend_20171127.${action}`,
      'X-Amz-Date': amzDate,
      'Authorization': `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${dateStamp}/${this.region}/comprehend/aws4_request, SignedHeaders=content-type;host;x-amz-date;x-amz-target, Signature=placeholder`,
    };
  }

  private parseAWSResponse(
    data: AWSComprehendResponse,
    emotions: EmotionScore[],
    processingTime: number
  ): SentimentResult {
    const awsSentiment = data.Sentiment.toLowerCase();
    let sentiment: 'positive' | 'negative' | 'neutral';
    
    switch (awsSentiment) {
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

    // Calculate confidence from the highest score
    const scores = data.SentimentScore;
    const confidence = Math.max(scores.Positive, scores.Negative, scores.Neutral, scores.Mixed);

    return {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      emotions: emotions.length > 0 ? emotions : undefined,
      provider: this.name,
      processingTime,
    };
  }

  private parseEmotions(data: AWSEmotionResponse): EmotionScore[] {
    if (!data.ResultList || data.ResultList.length === 0) {
      return [];
    }

    const emotions = data.ResultList[0].Emotion || [];
    return emotions.map(emotion => ({
      emotion: emotion.Name.toLowerCase(),
      score: Math.round(emotion.Score * 100) / 100,
    }));
  }
}