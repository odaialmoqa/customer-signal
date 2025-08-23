/**
 * Example usage of the Sentiment Analysis Service
 * This file demonstrates how to use the sentiment analysis functionality
 */

import { getSentimentService } from './sentiment';

export async function demonstrateSentimentAnalysis() {
  console.log('🎯 Sentiment Analysis Service Demo\n');

  // Initialize the service
  const sentimentService = getSentimentService({
    primaryProvider: 'local',
    fallbackProviders: ['google', 'aws', 'azure'],
  });

  // Example 1: Single sentiment analysis
  console.log('📝 Single Analysis Examples:');
  
  const examples = [
    'This product is absolutely amazing and I love it!',
    'This service is terrible and I hate it completely.',
    'This is a neutral product description with technical specifications.',
    'I am not happy with this purchase at all.',
    'The customer service was very helpful and responsive.',
  ];

  for (const text of examples) {
    try {
      const result = await sentimentService.analyzeSentiment(text);
      console.log(`\nText: "${text}"`);
      console.log(`Sentiment: ${result.sentiment} (${(result.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`Provider: ${result.provider}`);
      console.log(`Processing time: ${result.processingTime}ms`);
      if (result.keywords && result.keywords.length > 0) {
        console.log(`Keywords: ${result.keywords.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error analyzing: "${text}"`, error);
    }
  }

  // Example 2: Batch analysis
  console.log('\n\n📦 Batch Analysis Example:');
  
  const batchTexts = [
    'Great product, highly recommend!',
    'Poor quality, waste of money.',
    'Average product, nothing special.',
    'Excellent customer service experience.',
    'Disappointed with the delivery time.',
  ];

  try {
    const batchResult = await sentimentService.batchAnalyze(batchTexts);
    
    console.log(`\nProcessed ${batchResult.totalProcessed} items in ${batchResult.processingTime}ms`);
    console.log(`Errors: ${batchResult.errors.length}`);
    
    batchResult.results.forEach((result, index) => {
      console.log(`\n${index + 1}. "${batchTexts[index]}"`);
      console.log(`   → ${result.sentiment} (${(result.confidence * 100).toFixed(1)}%)`);
    });
    
    if (batchResult.errors.length > 0) {
      console.log('\nErrors:');
      batchResult.errors.forEach(error => console.log(`  - ${error}`));
    }
  } catch (error) {
    console.error('Batch analysis error:', error);
  }

  // Example 3: Provider status
  console.log('\n\n🔧 Provider Status:');
  
  try {
    const providerStatus = await sentimentService.getProviderStatus();
    
    Object.entries(providerStatus).forEach(([provider, available]) => {
      const status = available ? '✅ Available' : '❌ Unavailable';
      console.log(`${provider}: ${status}`);
    });
  } catch (error) {
    console.error('Error getting provider status:', error);
  }

  console.log('\n✨ Demo completed!');
}

// Example of how to integrate with the monitoring system
export async function analyzeFeedbackSentiment(feedbackTexts: string[]) {
  const sentimentService = getSentimentService();
  
  try {
    const results = await sentimentService.batchAnalyze(feedbackTexts);
    
    // Categorize results
    const positive = results.results.filter(r => r.sentiment === 'positive');
    const negative = results.results.filter(r => r.sentiment === 'negative');
    const neutral = results.results.filter(r => r.sentiment === 'neutral');
    
    return {
      summary: {
        total: results.totalProcessed,
        positive: positive.length,
        negative: negative.length,
        neutral: neutral.length,
        averageConfidence: results.results.reduce((sum, r) => sum + r.confidence, 0) / results.results.length,
      },
      details: results.results,
      processingTime: results.processingTime,
      errors: results.errors,
    };
  } catch (error) {
    console.error('Error analyzing feedback sentiment:', error);
    throw error;
  }
}

// Example of real-time sentiment monitoring
export async function monitorSentimentTrends(conversations: Array<{ content: string; timestamp: Date; platform: string }>) {
  const sentimentService = getSentimentService();
  
  const contents = conversations.map(c => c.content);
  const results = await sentimentService.batchAnalyze(contents);
  
  // Combine results with metadata
  const enrichedResults = results.results.map((result, index) => ({
    ...result,
    content: conversations[index].content,
    timestamp: conversations[index].timestamp,
    platform: conversations[index].platform,
  }));
  
  // Group by time periods (e.g., hourly)
  const hourlyTrends = enrichedResults.reduce((acc, item) => {
    const hour = new Date(item.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    if (!acc[hour]) {
      acc[hour] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    }
    
    acc[hour][item.sentiment]++;
    acc[hour].total++;
    
    return acc;
  }, {} as Record<string, { positive: number; negative: number; neutral: number; total: number }>);
  
  return {
    trends: hourlyTrends,
    overall: {
      positive: enrichedResults.filter(r => r.sentiment === 'positive').length,
      negative: enrichedResults.filter(r => r.sentiment === 'negative').length,
      neutral: enrichedResults.filter(r => r.sentiment === 'neutral').length,
    },
    alerts: enrichedResults.filter(r => r.sentiment === 'negative' && r.confidence > 0.7),
  };
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateSentimentAnalysis().catch(console.error);
}