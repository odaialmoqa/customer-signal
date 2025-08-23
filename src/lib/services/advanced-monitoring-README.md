# Advanced Monitoring and Analytics APIs Integration

This document describes the integration of advanced monitoring and analytics APIs into the CustomerSignal platform. These APIs provide comprehensive brand monitoring, social media listening, and content performance tracking capabilities.

## Integrated APIs

### 1. Mention.com API
**Purpose**: Comprehensive brand monitoring across the web
**Features**:
- Real-time mention tracking
- Sentiment analysis (positive/negative/neutral)
- Multi-language support
- Source filtering and categorization
- Alert management

**Configuration**:
```typescript
const mentionAdapter = new MentionAdapter({
  apiToken: 'your-mention-api-token',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `MENTION_API_TOKEN`: Your Mention.com API token

### 2. Brand24 API
**Purpose**: Social media listening and brand monitoring
**Features**:
- Project-based monitoring
- Sentiment scoring (-1 to 1)
- Influence score tracking
- Multi-platform coverage
- Real-time alerts

**Configuration**:
```typescript
const brand24Adapter = new Brand24Adapter({
  apiToken: 'your-brand24-api-token',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `BRAND24_API_TOKEN`: Your Brand24 API token

### 3. Google Trends API
**Purpose**: Keyword popularity and trend tracking
**Features**:
- Interest over time data
- Related queries discovery
- Regional trend analysis
- Trending content identification
- Historical trend data

**Configuration**:
```typescript
const googleTrendsAdapter = new GoogleTrendsAdapter({
  region: 'US',
  language: 'en',
  rateLimitPerMinute: 60
});
```

**Note**: Google Trends doesn't require an API key for basic usage, but the implementation uses mock data for demonstration purposes.

### 4. Brandwatch API
**Purpose**: Enterprise-level social listening
**Features**:
- Advanced query building
- Comprehensive sentiment analysis
- Author influence tracking
- Cross-platform conversation linking
- Advanced analytics and reporting

**Configuration**:
```typescript
const brandwatchAdapter = new BrandwatchAdapter({
  username: 'your-brandwatch-username',
  password: 'your-brandwatch-password',
  clientId: 'your-brandwatch-client-id',
  clientSecret: 'your-brandwatch-client-secret',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `BRANDWATCH_USERNAME`: Your Brandwatch username
- `BRANDWATCH_PASSWORD`: Your Brandwatch password
- `BRANDWATCH_CLIENT_ID`: Your Brandwatch client ID
- `BRANDWATCH_CLIENT_SECRET`: Your Brandwatch client secret

### 5. Hootsuite Insights API
**Purpose**: Social media analytics and monitoring
**Features**:
- Stream-based monitoring
- Multi-network support (Twitter, Facebook, Instagram, LinkedIn)
- Real-time message tracking
- Engagement analytics
- Token refresh handling

**Configuration**:
```typescript
const hootsuiteAdapter = new HootsuiteAdapter({
  accessToken: 'your-hootsuite-access-token',
  refreshToken: 'your-hootsuite-refresh-token',
  clientId: 'your-hootsuite-client-id',
  clientSecret: 'your-hootsuite-client-secret',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `HOOTSUITE_ACCESS_TOKEN`: Your Hootsuite access token
- `HOOTSUITE_REFRESH_TOKEN`: Your Hootsuite refresh token
- `HOOTSUITE_CLIENT_ID`: Your Hootsuite client ID
- `HOOTSUITE_CLIENT_SECRET`: Your Hootsuite client secret

### 6. Sprout Social API
**Purpose**: Social monitoring and analytics
**Features**:
- Query-based listening
- Advanced sentiment analysis with confidence scores
- Network-specific analytics
- Author verification tracking
- Priority-based message classification

**Configuration**:
```typescript
const sproutSocialAdapter = new SproutSocialAdapter({
  accessToken: 'your-sprout-social-access-token',
  customerId: 'your-sprout-social-customer-id',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `SPROUT_SOCIAL_ACCESS_TOKEN`: Your Sprout Social access token
- `SPROUT_SOCIAL_CUSTOMER_ID`: Your Sprout Social customer ID

### 7. BuzzSumo API
**Purpose**: Content performance tracking and analysis
**Features**:
- Content search and discovery
- Share tracking across platforms
- Influencer identification
- Trending content analysis
- Evergreen score calculation
- Backlink and domain authority tracking

**Configuration**:
```typescript
const buzzSumoAdapter = new BuzzSumoAdapter({
  apiKey: 'your-buzzsumo-api-key',
  rateLimitPerMinute: 60
});
```

**Environment Variables**:
- `BUZZSUMO_API_KEY`: Your BuzzSumo API key

## Architecture

### Base Adapter Pattern
All advanced monitoring adapters extend the `BasePlatformAdapter` class, which provides:
- Rate limiting functionality
- Error handling
- Common utility methods
- Standardized conversation data format

### Adapter Wrapper
The `AdvancedAdapterWrapper` class provides compatibility between the new advanced monitoring adapters and the existing `PlatformAdapter` interface, ensuring seamless integration with the existing monitoring service.

### Data Normalization
All adapters transform platform-specific data into a standardized `ConversationData` format:

```typescript
interface ConversationData {
  id: string;
  content: string;
  title?: string;
  author: string;
  authorUrl?: string;
  platform: string;
  platformSpecific?: Record<string, any>;
  url: string;
  publishedAt: Date;
  engagement: {
    reach: number;
    likes: number;
    shares: number;
    comments: number;
  };
  sentiment: 'positive' | 'negative' | 'neutral';
  metadata: Record<string, any>;
}
```

## Usage

### Integration with Monitoring Service
The advanced monitoring adapters are automatically integrated into the main monitoring service:

```typescript
// The monitoring service includes all advanced adapters
const monitoringService = new MonitoringService(supabase);

// Start monitoring with advanced APIs
await monitoringService.startMonitoring(keywordId, tenantId);

// Scan specific platforms including advanced APIs
const results = await monitoringService.scanKeyword(
  keywordId, 
  tenantId, 
  ['mention', 'brand24', 'google-trends', 'brandwatch', 'hootsuite', 'sprout-social', 'buzzsumo']
);
```

### Direct Adapter Usage
You can also use the adapters directly:

```typescript
const mentionAdapter = new MentionAdapter({
  apiToken: process.env.MENTION_API_TOKEN,
  rateLimitPerMinute: 60
});

const conversations = await mentionAdapter.monitor(['your brand', 'your product']);
```

## Rate Limiting

All adapters implement rate limiting to respect API limits:
- Default: 60 requests per minute
- Configurable per adapter
- Automatic backoff and retry logic
- Queue management for high-volume scenarios

## Error Handling

Comprehensive error handling includes:
- API authentication errors (401/403)
- Rate limiting errors (429)
- Service unavailability (5xx)
- Network connectivity issues
- Invalid response handling

## Testing

### Unit Tests
- Individual adapter functionality
- Data transformation accuracy
- Error handling scenarios
- Rate limiting behavior

### Integration Tests
- End-to-end API integration
- Authentication flows
- Data retrieval and processing
- Error recovery mechanisms

## Environment Setup

To use the advanced monitoring APIs, set the following environment variables in your `.env.local` file:

```bash
# Mention.com
MENTION_API_TOKEN=your_mention_api_token

# Brand24
BRAND24_API_TOKEN=your_brand24_api_token

# Brandwatch
BRANDWATCH_USERNAME=your_brandwatch_username
BRANDWATCH_PASSWORD=your_brandwatch_password
BRANDWATCH_CLIENT_ID=your_brandwatch_client_id
BRANDWATCH_CLIENT_SECRET=your_brandwatch_client_secret

# Hootsuite
HOOTSUITE_ACCESS_TOKEN=your_hootsuite_access_token
HOOTSUITE_REFRESH_TOKEN=your_hootsuite_refresh_token
HOOTSUITE_CLIENT_ID=your_hootsuite_client_id
HOOTSUITE_CLIENT_SECRET=your_hootsuite_client_secret

# Sprout Social
SPROUT_SOCIAL_ACCESS_TOKEN=your_sprout_social_access_token
SPROUT_SOCIAL_CUSTOMER_ID=your_sprout_social_customer_id

# BuzzSumo
BUZZSUMO_API_KEY=your_buzzsumo_api_key
```

## Performance Considerations

- **Caching**: Implement caching for frequently accessed data
- **Batch Processing**: Use batch operations where supported
- **Parallel Processing**: Process multiple keywords concurrently
- **Data Deduplication**: Remove duplicate mentions across platforms
- **Storage Optimization**: Store only essential data to reduce database load

## Monitoring and Alerting

- **API Health Checks**: Regular validation of API connectivity
- **Rate Limit Monitoring**: Track API usage against limits
- **Error Rate Tracking**: Monitor and alert on high error rates
- **Performance Metrics**: Track response times and throughput
- **Cost Monitoring**: Track API usage costs across providers

## Future Enhancements

1. **Additional APIs**: Integration with more monitoring and analytics platforms
2. **Machine Learning**: Advanced sentiment analysis and trend prediction
3. **Real-time Processing**: WebSocket-based real-time data streaming
4. **Advanced Filtering**: More sophisticated content filtering and categorization
5. **Custom Dashboards**: Platform-specific analytics dashboards
6. **API Aggregation**: Intelligent data aggregation across multiple sources