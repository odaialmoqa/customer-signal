# Web Scraping and API Integration System

This document describes the comprehensive web scraping and API integration system implemented for CustomerSignal.

## Overview

The system provides ethical web scraping capabilities and API integrations for monitoring online conversations across multiple platforms:

- **News Sources**: NewsAPI, Bing News API
- **RSS Feeds**: Blog monitoring, news feeds
- **Review Platforms**: Trustpilot, G2, Capterra
- **Forums**: Stack Overflow, Quora, Hacker News, Discourse
- **Google Alerts**: Simulated Google Alerts functionality
- **Web Scraping**: Ethical scraping with robots.txt compliance

## Architecture

### Core Components

1. **WebScraper**: Ethical web scraping engine with robots.txt compliance
2. **Platform Adapters**: Specialized adapters for different platforms
3. **MonitoringService**: Orchestrates monitoring across all platforms
4. **ContentNormalizer**: Standardizes content format across platforms
5. **RateLimiter**: Manages API rate limits and scraping delays

### Platform Adapters

#### NewsAdapter
- Integrates with NewsAPI for comprehensive news coverage
- Supports filtering by date, relevance, and language
- Handles API rate limits and errors gracefully

```typescript
const newsAdapter = new NewsAdapter()
const results = await newsAdapter.search('customer feedback', {
  limit: 20,
  sortBy: 'date',
  since: '2024-01-01T00:00:00Z'
})
```

#### BingNewsAdapter
- Integrates with Bing News API for additional news coverage
- Supports trending topics and category-based searches
- Provides rich metadata including provider information

```typescript
const bingAdapter = new BingNewsAdapter()
const results = await bingAdapter.search('product reviews')
const trending = await bingAdapter.getTrendingTopics()
```

#### RSSAdapter
- Monitors RSS feeds from blogs and news sites
- Discovers RSS feeds from websites automatically
- Supports custom feed addition

```typescript
const rssAdapter = new RSSAdapter()
const results = await rssAdapter.search('brand mentions')
const feeds = await rssAdapter.discoverRSSFeeds('https://example.com')
```

#### ReviewAdapter
- Scrapes major review platforms (Trustpilot, G2, Capterra)
- Extracts ratings, reviews, and author information
- Respects robots.txt and implements delays

```typescript
const reviewAdapter = new ReviewAdapter()
const results = await reviewAdapter.search('product name')
const platforms = reviewAdapter.getAvailablePlatforms()
```

#### ForumAdapter
- Monitors forums like Stack Overflow, Quora, Hacker News
- Uses both direct API access (where available) and web scraping
- Searches generic forums using search engines

```typescript
const forumAdapter = new ForumAdapter()
const results = await forumAdapter.search('technical issue')
```

#### GoogleAlertsAdapter
- Simulates Google Alerts functionality
- Searches Google News and web results
- Provides RSS feed URLs for monitoring

```typescript
const googleAdapter = new GoogleAlertsAdapter()
const results = await googleAdapter.search('company name')
const alertId = await googleAdapter.simulateCreateAlert({
  query: 'brand mentions',
  frequency: 'daily'
})
```

## Usage

### Basic Monitoring

```typescript
import { MonitoringService } from './monitoring-service'

const monitoringService = new MonitoringService(supabaseClient)

// Start monitoring a keyword across all platforms
await monitoringService.startMonitoring('keyword-id', 'tenant-id')

// Scan specific platforms
const results = await monitoringService.scanKeyword(
  'keyword-id',
  'tenant-id',
  ['news', 'rss', 'reviews', 'forums']
)

// Get monitoring status
const status = await monitoringService.getMonitoringStatus('tenant-id')
```

### Web Scraping

```typescript
import { WebScraper } from './web-scraper'

const scraper = new WebScraper()

// Scrape a single URL with robots.txt compliance
const html = await scraper.scrapeUrl('https://example.com', {
  respectRobotsTxt: true,
  delay: 2000,
  maxRetries: 3
})

// Scrape multiple URLs
const results = await scraper.scrapeMultipleUrls([
  'https://example1.com',
  'https://example2.com'
], {
  respectRobotsTxt: true,
  delay: 1000
})

// Extract content from HTML
const textContent = scraper.extractTextContent(html)
const links = scraper.extractLinks(html, 'https://example.com')
const metadata = scraper.extractMetadata(html)
```

## Configuration

### Environment Variables

```bash
# API Keys
NEWS_API_KEY=your_newsapi_key
BING_NEWS_API_KEY=your_bing_api_key

# Rate Limiting (optional)
DEFAULT_RATE_LIMIT=100
SCRAPING_DELAY=2000
```

### Platform Configuration

Each platform adapter can be configured with custom settings:

```typescript
// Add custom review platform
reviewAdapter.addCustomPlatform({
  name: 'custom-reviews',
  baseUrl: 'https://custom-review-site.com',
  searchPath: '/search?q=',
  postSelector: '.review',
  titleSelector: '.review-title',
  authorSelector: '.reviewer',
  contentSelector: '.review-content'
})

// Add custom RSS feed
await rssAdapter.addCustomFeed('https://custom-blog.com/feed.xml')
```

## Ethical Considerations

### Robots.txt Compliance
- All web scraping respects robots.txt files
- Implements crawl delays as specified
- Handles disallowed paths appropriately

### Rate Limiting
- Implements conservative rate limits for each platform
- Uses exponential backoff for retries
- Respects API rate limits and quotas

### User Agent
- Uses identifiable user agent: `CustomerSignal-Bot/1.0 (+https://customersignal.com/bot)`
- Provides contact information for website owners

### Content Usage
- Only extracts publicly available content
- Respects copyright and terms of service
- Implements content deduplication

## Error Handling

### Network Errors
- Implements retry logic with exponential backoff
- Handles timeouts and connection failures
- Provides detailed error logging

### API Errors
- Handles rate limiting with appropriate delays
- Manages authentication failures
- Provides fallback mechanisms where possible

### Content Parsing Errors
- Validates scraped content structure
- Sanitizes HTML and removes dangerous content
- Handles malformed data gracefully

## Performance Optimization

### Caching
- Caches robots.txt files for 1 hour
- Implements content deduplication
- Uses efficient data structures for large datasets

### Parallel Processing
- Processes multiple platforms simultaneously
- Implements queue-based job processing
- Uses connection pooling for database operations

### Memory Management
- Streams large responses where possible
- Implements garbage collection for long-running processes
- Monitors memory usage and implements limits

## Monitoring and Alerting

### Health Checks
- Validates adapter configurations on startup
- Monitors API connectivity and response times
- Tracks success/failure rates for each platform

### Metrics
- Tracks scraping success rates
- Monitors API usage and rate limits
- Measures content processing performance

### Logging
- Structured logging with context information
- Error tracking with stack traces
- Performance metrics and timing data

## Testing

### Unit Tests
- Mock HTTP responses for reliable testing
- Test error handling and edge cases
- Validate content parsing and normalization

### Integration Tests
- Test with real API endpoints (when possible)
- Validate end-to-end monitoring workflows
- Test rate limiting and retry mechanisms

### Performance Tests
- Load testing for high-volume scenarios
- Memory leak detection
- Concurrent request handling

## Future Enhancements

### Additional Platforms
- Social media platforms (Twitter, LinkedIn, Facebook)
- Video platforms (YouTube, TikTok)
- Messaging platforms (Discord, Slack)
- E-commerce platforms (Amazon, eBay)

### Advanced Features
- Machine learning for content relevance scoring
- Real-time streaming for high-frequency monitoring
- Advanced sentiment analysis integration
- Content summarization and key phrase extraction

### Scalability Improvements
- Distributed scraping across multiple servers
- Cloud-based processing with auto-scaling
- Advanced caching and CDN integration
- Database sharding for large datasets