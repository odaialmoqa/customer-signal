# CustomerSignal Server Setup Guide

This guide covers the complete server setup and infrastructure requirements for CustomerSignal.

## 🏗️ Infrastructure Overview

CustomerSignal requires the following infrastructure components:

### Core Services
- **Application Server**: Next.js application
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis for session storage and caching
- **File Storage**: Supabase Storage for file uploads
- **Edge Functions**: Supabase Edge Functions for background processing

### External Services
- **Sentiment Analysis**: OpenAI, Azure, AWS, or Google Cloud
- **Social Media APIs**: Twitter, Reddit, LinkedIn, etc.
- **Email Service**: SendGrid or Resend
- **Monitoring**: Sentry, Mixpanel, PostHog

## 🚀 Recommended Server Providers

### Option 1: Vercel + Supabase (Recommended for MVP)

**Pros:**
- Seamless Next.js deployment
- Built-in CDN and edge functions
- Automatic scaling
- Easy CI/CD integration
- Cost-effective for small to medium scale

**Cons:**
- Vendor lock-in
- Limited customization
- Function execution time limits

**Setup:**
1. Deploy to Vercel (connects to GitHub automatically)
2. Use Supabase for database and backend services
3. Add Redis via Upstash
4. Configure environment variables in Vercel dashboard

**Estimated Monthly Cost:**
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- Upstash Redis: $10/month
- **Total: ~$55/month**

### Option 2: AWS (Recommended for Enterprise)

**Pros:**
- Full control and customization
- Excellent scaling capabilities
- Comprehensive service ecosystem
- Enterprise-grade security
- Cost optimization opportunities

**Cons:**
- Complex setup and management
- Requires DevOps expertise
- Higher initial costs

**Architecture:**
- **Compute**: ECS Fargate or EC2 with Auto Scaling
- **Database**: RDS PostgreSQL with Multi-AZ
- **Cache**: ElastiCache Redis
- **Storage**: S3 for file storage
- **CDN**: CloudFront
- **Load Balancer**: Application Load Balancer
- **Monitoring**: CloudWatch + X-Ray

**Estimated Monthly Cost:**
- ECS Fargate (2 vCPU, 4GB): $50/month
- RDS PostgreSQL (db.t3.medium): $60/month
- ElastiCache Redis (cache.t3.micro): $15/month
- S3 + CloudFront: $20/month
- Load Balancer: $20/month
- **Total: ~$165/month**

### Option 3: Google Cloud Platform

**Pros:**
- Excellent AI/ML services integration
- Competitive pricing
- Good Kubernetes support
- Strong data analytics tools

**Architecture:**
- **Compute**: Cloud Run or GKE
- **Database**: Cloud SQL PostgreSQL
- **Cache**: Memorystore Redis
- **Storage**: Cloud Storage
- **CDN**: Cloud CDN

**Estimated Monthly Cost:**
- Cloud Run: $30/month
- Cloud SQL: $50/month
- Memorystore Redis: $25/month
- Cloud Storage: $15/month
- **Total: ~$120/month**

### Option 4: DigitalOcean (Budget-Friendly)

**Pros:**
- Simple and affordable
- Good documentation
- Managed databases available
- Predictable pricing

**Architecture:**
- **Compute**: App Platform or Droplets
- **Database**: Managed PostgreSQL
- **Cache**: Managed Redis
- **Storage**: Spaces (S3-compatible)

**Estimated Monthly Cost:**
- App Platform: $25/month
- Managed PostgreSQL: $30/month
- Managed Redis: $20/month
- Spaces: $10/month
- **Total: ~$85/month**

## 🔧 Detailed Setup Instructions

### 1. Vercel + Supabase Setup (Recommended)

#### Step 1: Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project
supabase projects create customer-signal

# Initialize local development
supabase init

# Start local development
supabase start

# Push migrations
supabase db push
```

#### Step 2: Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all other environment variables
```

#### Step 3: Redis Setup (Upstash)
1. Go to [Upstash Console](https://console.upstash.com/)
2. Create new Redis database
3. Copy connection URL
4. Add to Vercel environment variables

### 2. AWS Setup (Enterprise)

#### Step 1: Infrastructure as Code (Terraform)
```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "customer-signal-vpc"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "customer-signal"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier     = "customer-signal-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "customer_signal"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "customer-signal-final-snapshot"
  
  tags = {
    Name = "customer-signal-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "customer-signal-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "customer-signal-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
}
```

#### Step 2: Application Deployment
```bash
# Build and push Docker image
docker build -t customer-signal .
docker tag customer-signal:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/customer-signal:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/customer-signal:latest

# Deploy ECS service
aws ecs update-service --cluster customer-signal --service customer-signal-service --force-new-deployment
```

## 🔑 Required API Keys and Services

### Essential APIs (Required for Core Functionality)

#### 1. Supabase
- **What**: Database, authentication, real-time subscriptions
- **Cost**: $25/month (Pro plan)
- **Setup**: [supabase.com](https://supabase.com)
- **Keys Needed**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 2. Sentiment Analysis (Choose One)

**OpenAI (Recommended)**
- **What**: GPT-4 for sentiment analysis
- **Cost**: ~$0.03 per 1K tokens
- **Setup**: [platform.openai.com](https://platform.openai.com)
- **Keys**: `OPENAI_API_KEY`

**Azure Cognitive Services**
- **What**: Text Analytics API
- **Cost**: $2 per 1K transactions
- **Setup**: [azure.microsoft.com](https://azure.microsoft.com/en-us/services/cognitive-services/)
- **Keys**: `AZURE_COGNITIVE_SERVICES_KEY`, `AZURE_COGNITIVE_SERVICES_ENDPOINT`

#### 3. Social Media APIs

**Twitter/X API (Essential)**
- **What**: Tweet monitoring and analysis
- **Cost**: $100/month (Basic tier)
- **Setup**: [developer.twitter.com](https://developer.twitter.com)
- **Keys**: `TWITTER_BEARER_TOKEN`, `TWITTER_API_KEY`, `TWITTER_API_SECRET`

**Reddit API (Recommended)**
- **What**: Reddit post and comment monitoring
- **Cost**: Free (with rate limits)
- **Setup**: [reddit.com/prefs/apps](https://reddit.com/prefs/apps)
- **Keys**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`

#### 4. Email Service (Choose One)

**SendGrid (Recommended)**
- **What**: Transactional emails and notifications
- **Cost**: $15/month (Essentials plan)
- **Setup**: [sendgrid.com](https://sendgrid.com)
- **Keys**: `SENDGRID_API_KEY`

**Resend (Alternative)**
- **What**: Developer-focused email API
- **Cost**: $20/month (Pro plan)
- **Setup**: [resend.com](https://resend.com)
- **Keys**: `RESEND_API_KEY`

### Optional APIs (Enhanced Functionality)

#### Advanced Social Monitoring

**Brand24**
- **What**: Comprehensive social listening
- **Cost**: $79/month (Plus plan)
- **Keys**: `BRAND24_API_KEY`

**Mention.com**
- **What**: Social media and web monitoring
- **Cost**: $41/month (Solo plan)
- **Keys**: `MENTION_API_KEY`

#### News and Web Monitoring

**NewsAPI**
- **What**: News article monitoring
- **Cost**: $449/month (Business plan)
- **Keys**: `NEWS_API_KEY`

**Google News API**
- **What**: Google News integration
- **Cost**: Free (with limits)
- **Keys**: `GOOGLE_NEWS_API_KEY`

#### Monitoring and Analytics

**Sentry**
- **What**: Error tracking and performance monitoring
- **Cost**: $26/month (Team plan)
- **Keys**: `SENTRY_DSN`

**Mixpanel**
- **What**: Product analytics
- **Cost**: $25/month (Growth plan)
- **Keys**: `MIXPANEL_TOKEN`

## 🔒 Security Configuration

### Environment Variables Security
```bash
# Use strong, unique keys
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Set up proper CORS
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Configure rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

### Database Security
```sql
-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create security policies
CREATE POLICY "Users can only see their own data" ON conversations
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### Network Security
- Use HTTPS everywhere
- Configure proper CORS headers
- Implement rate limiting
- Use VPC for AWS deployments
- Enable database encryption at rest

## 📊 Monitoring Setup

### Application Monitoring
```javascript
// Sentry configuration
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Infrastructure Monitoring
- Set up CloudWatch alarms (AWS)
- Configure Uptime Robot for availability monitoring
- Use Grafana + Prometheus for detailed metrics

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates configured
- [ ] Domain DNS configured
- [ ] Monitoring tools set up

### Post-Deployment
- [ ] Health checks passing
- [ ] All API integrations working
- [ ] Email notifications working
- [ ] Social media monitoring active
- [ ] Performance metrics baseline established

## 💰 Cost Optimization Tips

1. **Start Small**: Begin with Vercel + Supabase for MVP
2. **Monitor Usage**: Track API usage and optimize calls
3. **Cache Aggressively**: Use Redis for frequently accessed data
4. **Optimize Images**: Use Next.js Image optimization
5. **Database Indexing**: Ensure proper database indexes
6. **CDN Usage**: Leverage CDN for static assets

## 🆘 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Check Supabase status
supabase status
```

**Redis Connection Issues**
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
```

**API Rate Limiting**
- Implement exponential backoff
- Use multiple API keys if available
- Cache responses when possible

### Support Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [CustomerSignal GitHub Issues](https://github.com/your-org/customer-signal/issues)

## 📞 Getting Help

If you need assistance with server setup:

1. Check the troubleshooting section above
2. Review the logs for specific error messages
3. Consult the documentation for each service
4. Open an issue in the GitHub repository
5. Contact the development team

Remember to never share API keys or sensitive information in public channels!