import { SentimentProvider, SentimentResult, BatchSentimentResult } from '../sentiment';

// Simple rule-based sentiment analysis for local processing
export class LocalSentimentProvider implements SentimentProvider {
  name = 'local';

  private positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'perfect',
    'outstanding', 'brilliant', 'superb', 'magnificent', 'incredible',
    'best', 'better', 'improved', 'upgrade', 'recommend', 'impressed'
  ];

  private negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate', 'dislike',
    'angry', 'frustrated', 'disappointed', 'upset', 'annoyed', 'furious',
    'worst', 'worse', 'broken', 'failed', 'problem', 'issue', 'bug',
    'slow', 'expensive', 'overpriced', 'useless', 'worthless', 'garbage'
  ];

  private intensifiers = [
    'very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally',
    'really', 'quite', 'rather', 'pretty', 'fairly', 'somewhat'
  ];

  private negations = [
    'not', 'no', 'never', 'nothing', 'nobody', 'nowhere', 'neither',
    'nor', 'none', 'hardly', 'scarcely', 'barely'
  ];

  async analyzeSentiment(content: string): Promise<SentimentResult> {
    const startTime = Date.now();
    
    if (!content || content.trim().length === 0) {
      return {
        sentiment: 'neutral',
        confidence: 0,
        provider: this.name,
        processingTime: Date.now() - startTime,
      };
    }

    const words = this.tokenize(content.toLowerCase());
    const analysis = this.analyzeWords(words);
    
    return {
      sentiment: analysis.sentiment,
      confidence: analysis.confidence,
      keywords: analysis.keywords,
      provider: this.name,
      processingTime: Date.now() - startTime,
    };
  }

  async batchAnalyze(contents: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();
    const results: SentimentResult[] = [];
    const errors: string[] = [];

    for (const content of contents) {
      try {
        const result = await this.analyzeSentiment(content);
        results.push(result);
      } catch (error) {
        errors.push(`Failed to analyze content: ${(error as Error).message}`);
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
    return true; // Local provider is always available
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private analyzeWords(words: string[]): {
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
    keywords: string[];
  } {
    let positiveScore = 0;
    let negativeScore = 0;
    const keywords: string[] = [];
    let isNegated = false;
    let intensifierMultiplier = 1;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check for negations
      if (this.negations.includes(word)) {
        isNegated = true;
        continue;
      }

      // Check for intensifiers
      if (this.intensifiers.includes(word)) {
        intensifierMultiplier = 1.5;
        continue;
      }

      // Check for sentiment words
      if (this.positiveWords.includes(word)) {
        const score = intensifierMultiplier * (isNegated ? -1 : 1);
        if (isNegated) {
          negativeScore += Math.abs(score);
        } else {
          positiveScore += score;
        }
        keywords.push(word);
      } else if (this.negativeWords.includes(word)) {
        const score = intensifierMultiplier * (isNegated ? -1 : 1);
        if (isNegated) {
          positiveScore += Math.abs(score);
        } else {
          negativeScore += Math.abs(score);
        }
        keywords.push(word);
      }

      // Reset modifiers after processing a sentiment word
      if (this.positiveWords.includes(word) || this.negativeWords.includes(word)) {
        isNegated = false;
        intensifierMultiplier = 1;
      }
    }

    // Calculate final sentiment
    const totalScore = positiveScore - negativeScore;
    const totalWords = positiveScore + negativeScore;
    const confidence = totalWords > 0 ? Math.min(Math.abs(totalScore) / Math.max(totalWords, 1), 1) : 0;

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (totalScore > 0.5) {
      sentiment = 'positive';
    } else if (totalScore < -0.5) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    return {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      keywords: [...new Set(keywords)], // Remove duplicates
    };
  }
}