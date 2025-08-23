# Monitoring System

This document describes the core monitoring service implementation for CustomerSignal, built using Supabase Edge Functions and a platform adapter pattern.

## Architecture Overview

The monitoring system consists of several key components:

### 1. Supabase Edge Functions
- **monitor-keywords**: Main API for starting/stopping monitoring and manual scans
- **scheduled-monitoring**: Automated background processing of monitoring jobs

### 2. Platform Adapters
- **Base Adapter**: Abstract class defining the interface for all platform adapters
- **Reddit Adapter**: Monitors Reddit posts and comments using public API
- **Twitter Adapter**: Monitors tweets using Twitter API v2
- **News Adapter**: Monitors news articles using NewsAPI
- **Forum Adapter**: Monitors various forums and discussion sites

### 3. Core Services
- **MonitoringService**: Orchestrates monitoring across platforms
- **ContentNormalizer**: Standardizes content format across platforms
- **RateLimiter**: Manages API rate limits and prevents abuse

### 4. Client-Side Service
- **MonitoringService (client)**: Interfaces with Edge Functions from the frontend

## Key Features

### Platform Monitoring
- **Multi-platform support**: Reddit, Twitter, News sites, Forums
- **Configurable frequency**: Real-time, hourly, or daily monitoring
- **Rate limiting**: Respects platform API limits with intelligent backoff
- **Content normalization**: Consistent data format across all platforms

### Data Management
- **Tenant isolation**: Secure multi-tenant data separation using RLS
- **Full-text search**: PostgreSQL-based search across all conversations
- **Automatic deduplication**: Prevents duplicate content storage
- **Metadata preservation**: Platform-specific data maintained

### Monitoring Jobs
- **Automatic scheduling**: Jobs created when keywords are activated
- **Dynamic updates**: Job configuration updates when keywords change
- **Error handling**: Robust error handling with retry mechanisms
- **Status tracking**: Real-time monitoring status for all keywords

## Database Schema

### Tables Created
- `monitoring_jobs`: Tracks scheduled monitoring tasks
- `conversations`: Stores captured mentions and conversations

### Key Features
- Row Level Security (RLS) for tenant isolation
- Full-text search indexes for content search
- Automatic triggers for job management
- Performance-optimized indexes

## Usage Examples

### Starting Monitoring
```typescript
const monitoringService = new MonitoringService()
await monitoringService.startMonitoring('keyword-id', 'tenant-id')
```

### Manual Scan
```typescript
const results = await monitoringService.scanKeyword(
  'keyword-id', 
  'tenant-id', 
  ['reddit', 'twitter']
)
```

### Getting Conversations
```typescript
const { conversations, total } = await monitoringService.getConversations(
  'tenant-id',
  {
    platform: 'reddit',
    sentiment: 'positive',
    dateFrom: '2024-01-01T00:00:00Z',
    limit: 50
  }
)
```

### Search Conversations
```typescript
const results = await monitoringService.searchConversations(
  'tenant-id',
  'search query',
  { platform: 'reddit', limit: 20 }
)
```

## Rate Limiting

The system implements intelligent rate limiting:

- **Platform-specific limits**: Each platform has its own rate limits
- **Tenant isolation**: Rate limits are tracked per tenant
- **Burst capacity**: Short-term burst allowances for urgent requests
- **Automatic backoff**: Exponential backoff when limits are reached
- **Optimal timing**: Calculates optimal delays between requests

## Content Normalization

All content is normalized to a consistent format:

```typescript
interface NormalizedContent {
  id: string              // Platform-prefixed unique ID
  content: string         // Cleaned and sanitized text
  author: string          // Normalized author name
  platform: string        // Source platform
  url: string            // Original content URL
  timestamp: string       // ISO timestamp
  engagement: {           // Standardized engagement metrics
    likes: number
    shares: number
    comments: number
  }
  metadata: Record<string, any>  // Platform-specific data
}
```

## Error Handling

The system includes comprehensive error handling:

- **API failures**: Graceful handling of platform API errors
- **Rate limiting**: Automatic retry with backoff
- **Data validation**: Input sanitization and validation
- **Monitoring**: Error logging and alerting

## Testing

The system includes comprehensive test coverage:

- **Unit tests**: Individual component testing
- **Integration tests**: End-to-end workflow testing
- **Mock adapters**: Safe testing without external API calls

### Running Tests
```bash
# Run all monitoring system tests
npm run test src/test/unit/

# Run specific test files
npm run test src/test/unit/content-normalizer.test.ts
npm run test src/test/unit/rate-limiter.test.ts
npm run test src/test/unit/monitoring-service.test.ts
```

## Configuration

### Environment Variables
- `TWITTER_BEARER_TOKEN`: Twitter API authentication
- `NEWS_API_KEY`: NewsAPI authentication
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key

### Platform Limits (Default)
- Reddit: 600 requests/hour, 60 burst
- Twitter: 300 requests/hour, 30 burst
- News: 1000 requests/hour, 100 burst
- Forums: 300 requests/hour, 30 burst

## Deployment

The Edge Functions are deployed to Supabase and can be invoked via:
- Direct HTTP requests
- Supabase client SDK
- Scheduled cron jobs (for automated monitoring)

## Future Enhancements

Potential improvements for the monitoring system:

1. **Additional Platforms**: LinkedIn, Instagram, TikTok, YouTube
2. **Advanced Analytics**: Sentiment analysis, trend detection
3. **Real-time Notifications**: WebSocket-based live updates
4. **Machine Learning**: Content classification and relevance scoring
5. **Advanced Filtering**: AI-powered content filtering
6. **Performance Optimization**: Caching layers and query optimization

## Security Considerations

- All API keys are stored as environment variables
- Row Level Security ensures tenant data isolation
- Input sanitization prevents injection attacks
- Rate limiting prevents abuse and DoS attacks
- Audit logging tracks all monitoring activities