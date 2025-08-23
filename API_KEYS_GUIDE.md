# CustomerSignal API Keys Setup Guide

This guide provides detailed instructions for obtaining and configuring all the API keys needed for CustomerSignal.

## 🔑 Essential API Keys (Required)

### 1. Supabase (Database & Backend)

**What it's for**: Database, authentication, real-time features, file storage

**Cost**: Free tier available, Pro starts at $25/month

**Setup Steps**:
1. Go to [supabase.com](https://supabase.com)
2. Create account and new project
3. Go to Settings → API
4. Copy the keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Sentiment Analysis Provider (Choose One)

#### Option A: OpenAI (Recommended)

**What it's for**: GPT-4 powered sentiment analysis with high accuracy

**Cost**: ~$0.03 per 1K tokens (very cost-effective)

**Setup Steps**:
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account and add billing method
3. Go to API Keys section
4. Create new secret key

```env
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

#### Option B: Azure Cognitive Services

**What it's for**: Enterprise-grade sentiment analysis

**Cost**: $2 per 1K transactions

**Setup Steps**:
1. Go to [Azure Portal](https://portal.azure.com)
2. Create "Cognitive Services" resource
3. Choose "Text Analytics" service
4. Get keys from resource overview

```env
AZURE_COGNITIVE_SERVICES_KEY=your-32-character-key
AZURE_COGNITIVE_SERVICES_ENDPOINT=https://your-region.cognitiveservices.azure.com/
```

#### Option C: AWS Comprehend

**What it's for**: AWS ecosystem integration

**Cost**: $0.0001 per unit (100 characters)

**Setup Steps**:
1. Go to [AWS Console](https://console.aws.amazon.com)
2. Create IAM user with Comprehend permissions
3. Generate access keys

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

### 3. Social Media APIs

#### Twitter/X API (Essential)

**What it's for**: Monitoring tweets, replies, mentions

**Cost**: $100/month for Basic tier (required for v2 API)

**Setup Steps**:
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Apply for developer account (approval required)
3. Create new app
4. Generate Bearer Token and API keys

```env
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAMLheAAAAAAA...
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
```

**Important**: Twitter's free tier is very limited. The Basic tier ($100/month) is recommended for production use.

#### Reddit API (Recommended)

**What it's for**: Monitoring Reddit posts and comments

**Cost**: Free (with rate limits)

**Setup Steps**:
1. Go to [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
2. Create new app (choose "script" type)
3. Note the client ID and secret

```env
REDDIT_CLIENT_ID=your-14-character-client-id
REDDIT_CLIENT_SECRET=your-27-character-secret
REDDIT_USER_AGENT=CustomerSignal/1.0 by YourUsername
```

### 4. Email Service (Choose One)

#### Option A: SendGrid (Recommended)

**What it's for**: Sending notification emails, reports

**Cost**: Free tier (100 emails/day), Essentials $15/month

**Setup Steps**:
1. Go to [sendgrid.com](https://sendgrid.com)
2. Create account
3. Go to Settings → API Keys
4. Create new API key with full access

```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=CustomerSignal
```

#### Option B: Resend

**What it's for**: Developer-friendly email API

**Cost**: Free tier (3K emails/month), Pro $20/month

**Setup Steps**:
1. Go to [resend.com](https://resend.com)
2. Create account
3. Go to API Keys
4. Create new API key

```env
RESEND_API_KEY=re_your-resend-api-key-here
```

## 🚀 Optional API Keys (Enhanced Features)

### Advanced Social Media Monitoring

#### LinkedIn API

**What it's for**: Professional content monitoring

**Cost**: Free for basic access

**Setup Steps**:
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com)
2. Create new app
3. Request access to relevant APIs

```env
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

#### YouTube API

**What it's for**: Video content and comment monitoring

**Cost**: Free (with quotas)

**Setup Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable YouTube Data API v3
3. Create credentials

```env
YOUTUBE_API_KEY=AIza...your-youtube-api-key
```

### Premium Social Listening Services

#### Brand24

**What it's for**: Comprehensive social media monitoring

**Cost**: $79/month (Plus plan)

**Setup Steps**:
1. Sign up at [brand24.com](https://brand24.com)
2. Go to Settings → API
3. Generate API key

```env
BRAND24_API_KEY=your-brand24-api-key
```

#### Mention.com

**What it's for**: Web and social media monitoring

**Cost**: $41/month (Solo plan)

**Setup Steps**:
1. Sign up at [mention.com](https://mention.com)
2. Go to Account → API
3. Generate API key

```env
MENTION_API_KEY=your-mention-api-key
```

### News and Web Monitoring

#### NewsAPI

**What it's for**: News article monitoring

**Cost**: Free tier (1K requests/day), Business $449/month

**Setup Steps**:
1. Go to [newsapi.org](https://newsapi.org)
2. Register for free account
3. Get API key from dashboard

```env
NEWS_API_KEY=your-news-api-key
```

#### Google News API

**What it's for**: Google News integration

**Cost**: Free (with limits)

**Setup Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Custom Search API
3. Create search engine for news

```env
GOOGLE_NEWS_API_KEY=AIza...your-google-news-key
GOOGLE_SEARCH_ENGINE_ID=your-search-engine-id
```

### Monitoring and Analytics

#### Sentry (Error Tracking)

**What it's for**: Error monitoring and performance tracking

**Cost**: Free tier available, Team $26/month

**Setup Steps**:
1. Go to [sentry.io](https://sentry.io)
2. Create new project
3. Copy DSN from project settings

```env
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=customer-signal
```

#### Mixpanel (Product Analytics)

**What it's for**: User behavior analytics

**Cost**: Free tier available, Growth $25/month

**Setup Steps**:
1. Go to [mixpanel.com](https://mixpanel.com)
2. Create new project
3. Get project token from settings

```env
MIXPANEL_TOKEN=your-mixpanel-token
```

## 🔒 Security Best Practices

### Environment Variable Security

1. **Never commit API keys to version control**
2. **Use different keys for development/production**
3. **Rotate keys regularly**
4. **Use least-privilege access**

### Key Management

```bash
# Generate secure random keys
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Set restrictive permissions on env files
chmod 600 .env.local .env.production
```

### Production Deployment

For production, use secure environment variable management:

- **Vercel**: Environment Variables in dashboard
- **AWS**: Systems Manager Parameter Store or Secrets Manager
- **Google Cloud**: Secret Manager
- **Azure**: Key Vault

## 💰 Cost Estimation

### Minimal Setup (MVP)
- Supabase: $25/month
- OpenAI: ~$10/month (estimated usage)
- SendGrid: $15/month
- **Total: ~$50/month**

### Standard Setup
- Supabase: $25/month
- OpenAI: ~$20/month
- Twitter API: $100/month
- SendGrid: $15/month
- Sentry: $26/month
- **Total: ~$186/month**

### Enterprise Setup
- Supabase: $100/month (Team plan)
- OpenAI: ~$50/month
- Twitter API: $100/month
- Brand24: $79/month
- SendGrid: $90/month (Pro plan)
- Sentry: $80/month (Business plan)
- **Total: ~$499/month**

## 🚀 Quick Start Checklist

### Phase 1: Core Functionality
- [ ] Supabase account and keys
- [ ] OpenAI API key
- [ ] SendGrid API key
- [ ] Basic environment setup

### Phase 2: Social Monitoring
- [ ] Twitter API access (apply early - approval takes time)
- [ ] Reddit API keys
- [ ] LinkedIn API access

### Phase 3: Enhanced Features
- [ ] Additional sentiment analysis providers
- [ ] Premium social listening services
- [ ] News monitoring APIs
- [ ] Analytics and monitoring tools

## 🆘 Troubleshooting

### Common Issues

**Twitter API Access Denied**
- Ensure you have Basic tier subscription ($100/month)
- Check your app permissions
- Verify your developer account is approved

**OpenAI Rate Limits**
- Start with lower usage limits
- Implement exponential backoff
- Consider upgrading to higher tier

**Supabase Connection Issues**
- Check your project URL and keys
- Ensure your project is not paused
- Verify your database is accessible

**Email Delivery Issues**
- Verify your domain with SendGrid
- Check spam folders
- Ensure proper SPF/DKIM records

### Getting Help

1. Check the API provider's documentation
2. Look for status pages (e.g., status.openai.com)
3. Check rate limits and quotas
4. Review error logs in your monitoring tools
5. Contact support for the specific service

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Reddit API Documentation](https://www.reddit.com/dev/api)

Remember: Start with the essential APIs and add more as your needs grow. You can always upgrade and add additional services later!