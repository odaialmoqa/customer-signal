# Sentiment Analysis Service

The Sentiment Analysis Service provides comprehensive sentiment analysis capabilities with multiple provider support, fallback mechanisms, and batch processing for the CustomerSignal platform.

## Features

- **Multiple Provider Support**: Local, Google Cloud Natural Language, AWS Comprehend, and Azure Text Analytics
- **Automatic Fallback**: Seamlessly switches between providers when one fails
- **Batch Processing**: Efficiently processes large volumes of content
- **Emotion Analysis**: Advanced emotion detection (where supported by providers)
- **Multilingual Support**: Azure provider supports multiple languages
- **Performance Monitoring**: Detailed logging and performance metrics
- **Rate Limiting**: Respects API rate limits and implements backoff strategies

## Architecture

### Core Components

1. **SentimentAnalysisService**: Main orchestrator that manages providers and fallback logic
2. **Provider Implementations**: Individual adapters for each sentiment analysis service
3. **API Endpoints**: RESTful endpoints for single and batch analysis
4. **Logging System**: Comprehensive logging for monitoring and debugging

### Provider Hierarchy

1. **Local Provider** (Always available)
   - Rule-based sentiment analysis
   - No external dependencies
   - Fast processing for basic sentiment detection

2. **Google Cloud Natural Language API**
   - High accuracy sentiment analysis
   - Magnitude scoring for confidence
   - Supports multiple languages

3. **AWS Comprehend**
   - Sentiment and emotion analysis
   - Batch processing support
   - Enterprise-grade reliability

4. **Azure Text Analytics**
   - Multilingual sentiment analysis
   - Language detection capabilities
   - Confidence scoring

## Configuration

### Environment Variables

```bash
# Google Cloud
GOOGLE_CLOUD_API_KEY=your_google_api_key

# AWS Comprehend
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Azure Text Analytics
AZURE_TEXT_ANALYTICS_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_TEXT_ANALYTICS_KEY=your_azure_key

# Supabase (for logging)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Service Configuration

```typescript
const config = {
  primaryProvider: 'local',           // Primary provider to use
  fallbackProviders: ['google', 'aws', 'azure'], // Fallback order
  batchSize: 100,                     // Batch processing size
  timeout: 30000,                     // Request timeout in ms
  enableEmotionAnalysis: true,        // Enable emotion analysis where available
};
```

## Usage

### Single Analysis

```typescript
import { getSentimentService } from '@/lib/services/sentiment';

const service = getSentimentService();
const result = await service.analyzeSentiment('This product is amazing!');

console.log(result);
// {
//   sentiment: 'positive',
//   confidence: 0.85,
//   provider: 'local',
//   processingTime: 45,
//   keywords: ['amazing']
// }
```

### Batch Analysis

```typescript
const contents = [
  'This is great!',
  'This is terrible!',
  'This is okay.'
];

const result = await service.batchAnalyze(contents);

console.log(result);
// {
//   results: [...],
//   totalProcessed: 3,
//   errors: [],
//   processingTime: 150
// }
```

### API Endpoints

#### Single Analysis
```bash
POST /api/sentiment/analyze
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "This product is amazing!",
  "provider": "local" // optional
}
```

#### Batch Analysis
```bash
POST /api/sentiment/batch
Content-Type: application/json
Authorization: Bearer <token>

{
  "contents": ["Text 1", "Text 2", "Text 3"],
  "batchSize": 50 // optional
}
```

#### Provider Status
```bash
GET /api/sentiment/analyze
Authorization: Bearer <token>
```

## Provider Details

### Local Provider

**Advantages:**
- Always available
- No API costs
- Fast processing
- Privacy-friendly (no external calls)

**Limitations:**
- Basic rule-based analysis
- English only
- Limited accuracy for complex sentiment

**Implementation:**
- Uses predefined positive/negative word lists
- Handles negations and intensifiers
- Provides keyword extraction

### Google Cloud Natural Language

**Advantages:**
- High accuracy
- Magnitude scoring
- Multiple language support
- Reliable service

**Requirements:**
- Google Cloud API key
- Billing account setup

**Limitations:**
- 1000 character limit per request
- API costs apply
- Rate limiting

### AWS Comprehend

**Advantages:**
- Emotion analysis support
- Batch processing API
- Enterprise reliability
- Multiple confidence scores

**Requirements:**
- AWS credentials
- IAM permissions for Comprehend

**Limitations:**
- 5000 byte limit per document
- Regional availability
- API costs apply

### Azure Text Analytics

**Advantages:**
- Excellent multilingual support
- Language detection
- High accuracy
- Confidence scores

**Requirements:**
- Azure Cognitive Services resource
- API key and endpoint

**Limitations:**
- 5120 character limit
- API costs apply
- Rate limiting

## Error Handling

The service implements comprehensive error handling:

1. **Provider Failures**: Automatic fallback to next available provider
2. **Rate Limiting**: Exponential backoff and request queuing
3. **Timeout Handling**: Configurable timeouts with graceful degradation
4. **Input Validation**: Comprehensive validation of input data
5. **Logging**: Detailed error logging for debugging

## Performance Considerations

### Optimization Strategies

1. **Provider Selection**: Choose providers based on accuracy vs. cost requirements
2. **Batch Processing**: Use batch endpoints for processing multiple items
3. **Caching**: Consider caching results for identical content
4. **Rate Limiting**: Respect provider rate limits to avoid throttling

### Monitoring

The service provides detailed metrics:

- Processing time per request
- Provider success/failure rates
- Error categorization
- Usage statistics per user/tenant

## Testing

### Unit Tests
```bash
npm run test src/test/unit/sentiment-analysis.test.ts
```

### Integration Tests
```bash
npm run test:integration src/test/integration/sentiment-analysis-api.test.ts
```

### Test Coverage

- Provider implementations
- Fallback mechanisms
- Error handling
- API endpoints
- Batch processing
- Authentication and authorization

## Security

### Data Protection
- Content is not stored permanently
- Only processing metadata is logged
- Secure API key management
- Row-level security for user data

### Authentication
- JWT-based authentication required
- User-specific usage tracking
- Rate limiting per user

## Maintenance

### Database Cleanup
```sql
-- Run periodically to clean old logs
SELECT cleanup_old_sentiment_logs();
```

### Monitoring Queries
```sql
-- Provider success rates
SELECT 
  provider,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  AVG(processing_time) as avg_processing_time
FROM sentiment_analysis_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider;

-- User usage statistics
SELECT 
  user_id,
  COUNT(*) as requests,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN sentiment = 'positive' THEN 1 END) as positive_count,
  COUNT(CASE WHEN sentiment = 'negative' THEN 1 END) as negative_count,
  COUNT(CASE WHEN sentiment = 'neutral' THEN 1 END) as neutral_count
FROM sentiment_api_usage 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id;
```

## Future Enhancements

1. **Custom Models**: Support for fine-tuned models
2. **Real-time Streaming**: WebSocket support for real-time analysis
3. **Advanced Analytics**: Trend analysis and sentiment over time
4. **Custom Dictionaries**: User-defined sentiment keywords
5. **Multi-modal Analysis**: Support for image and video sentiment
6. **Async Processing**: Queue-based processing for large batches