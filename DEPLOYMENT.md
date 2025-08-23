# CustomerSignal Production Deployment Guide

This guide covers the complete production deployment process for CustomerSignal using Supabase as the backend infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Production Configuration](#production-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Supabase CLI** (v1.0+): `npm install -g supabase`
- **Node.js** (v18+): For running deployment scripts
- **Git**: For version control and deployment tracking
- **curl**: For health checks and API testing

### Required Access

- Supabase organization admin access
- Production project access token
- Domain/DNS management access (for custom domains)
- SSL certificate management access

### Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Supabase Configuration
SUPABASE_PROJECT_ID=your-production-project-id
SUPABASE_ACCESS_TOKEN=your-access-token
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External API Keys (for Edge Functions)
OPENAI_API_KEY=your-openai-key
GOOGLE_CLOUD_API_KEY=your-google-cloud-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AZURE_API_KEY=your-azure-key

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Monitoring
SLACK_WEBHOOK_URL=your-slack-webhook-url
PAGERDUTY_API_KEY=your-pagerduty-key
```

## Pre-Deployment Checklist

### Code Preparation

- [ ] All tests passing (`npm run test:all`)
- [ ] Code reviewed and approved
- [ ] Version tagged in Git
- [ ] Dependencies updated and security-scanned
- [ ] Environment variables documented

### Database Preparation

- [ ] Migration files reviewed and tested
- [ ] Backup strategy confirmed
- [ ] RLS policies validated
- [ ] Performance indexes optimized
- [ ] Data retention policies configured

### Infrastructure Preparation

- [ ] Supabase production project created
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates installed
- [ ] CDN configured (if applicable)
- [ ] Monitoring tools set up

## Production Configuration

### Supabase Project Setup

1. **Create Production Project**
   ```bash
   # Create new project via Supabase dashboard
   # Or use CLI (if available)
   supabase projects create customer-signal-prod --org-id your-org-id
   ```

2. **Configure Project Settings**
   - Enable required extensions
   - Set up custom domain
   - Configure authentication providers
   - Set up storage buckets

3. **Security Configuration**
   - Enable RLS on all tables
   - Configure JWT settings
   - Set up API rate limiting
   - Enable audit logging

### Database Configuration

The production database is automatically configured with:

- **Connection Pooling**: Optimized for high concurrency
- **Automatic Backups**: Daily backups with 7-day retention
- **Point-in-Time Recovery**: Available for the last 7 days
- **Read Replicas**: For analytics queries (if needed)

### Edge Functions Configuration

All Edge Functions are configured with:

- **JWT Verification**: Enabled for security
- **Rate Limiting**: Configured per function
- **Error Handling**: Comprehensive error logging
- **Monitoring**: Built-in metrics and alerting

## Deployment Process

### Automated Deployment

Use the main deployment script for a complete deployment:

```bash
# Set environment variables
export SUPABASE_PROJECT_ID=your-project-id
export SUPABASE_ACCESS_TOKEN=your-access-token

# Run full deployment
./scripts/deploy-production.sh
```

### Manual Step-by-Step Deployment

#### 1. Database Migration

```bash
# Dry run first
DRY_RUN=true ./scripts/deploy-migrations.sh

# Apply migrations
./scripts/deploy-migrations.sh
```

#### 2. Edge Functions Deployment

```bash
./scripts/deploy-edge-functions.sh
```

#### 3. Frontend Deployment

```bash
# Build the application
npm run build

# Deploy to your hosting platform (Vercel, Netlify, etc.)
# Update environment variables on the hosting platform
```

#### 4. Configuration and Secrets

```bash
# Set Edge Function secrets
supabase secrets set OPENAI_API_KEY="your-key" --project-ref your-project-id
supabase secrets set GOOGLE_CLOUD_API_KEY="your-key" --project-ref your-project-id
# ... set other secrets
```

## Post-Deployment Verification

### Automated Health Check

```bash
./scripts/production-health-check.sh
```

### Manual Verification Steps

1. **Database Connectivity**
   ```bash
   supabase db ping --linked
   ```

2. **Authentication Test**
   - Test user registration
   - Test user login
   - Verify JWT token generation

3. **API Endpoints Test**
   ```bash
   curl -H "Authorization: Bearer your-token" \
        https://your-project.supabase.co/rest/v1/health
   ```

4. **Edge Functions Test**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/monitor-keywords \
        -H "Authorization: Bearer your-token" \
        -H "Content-Type: application/json" \
        -d '{"test": true}'
   ```

5. **Frontend Functionality**
   - Test user registration/login
   - Test keyword management
   - Test dashboard loading
   - Test real-time updates

## Monitoring and Maintenance

### Built-in Supabase Monitoring

Supabase provides built-in monitoring for:

- **Database Performance**: Query performance, connection counts
- **API Usage**: Request rates, error rates, response times
- **Edge Functions**: Execution counts, error rates, duration
- **Authentication**: Login attempts, success rates
- **Storage**: Usage, upload/download rates

### Custom Monitoring Setup

1. **Health Check Automation**
   ```bash
   # Set up cron job for regular health checks
   # Add to crontab:
   */5 * * * * /path/to/customer-signal/scripts/production-health-check.sh
   ```

2. **Log Aggregation**
   - Configure log forwarding to external services
   - Set up log retention policies
   - Create log-based alerts

3. **Performance Monitoring**
   - Set up APM tools (New Relic, DataDog, etc.)
   - Configure custom metrics collection
   - Set up performance alerts

### Alerting Configuration

Configure alerts for:

- Database connection failures
- High error rates (>1%)
- Slow response times (>2s)
- Edge Function failures
- Authentication issues
- Storage quota warnings

## Rollback Procedures

### Database Rollback

1. **Point-in-Time Recovery**
   ```bash
   # Use Supabase dashboard to restore to specific timestamp
   # Or use CLI (if available)
   supabase db restore --project-ref your-project-id --timestamp "2024-01-01T12:00:00Z"
   ```

2. **Migration Rollback**
   ```bash
   # Manually revert specific migrations
   supabase migration down --project-ref your-project-id
   ```

### Edge Functions Rollback

```bash
# Deploy previous version of functions
git checkout previous-tag
./scripts/deploy-edge-functions.sh
```

### Frontend Rollback

- Use your hosting platform's rollback feature
- Or deploy previous version manually

## Troubleshooting

### Common Issues

#### Database Connection Issues

**Symptoms**: Connection timeouts, pool exhaustion
**Solutions**:
- Check connection pool settings
- Verify network connectivity
- Review database logs
- Scale up database resources if needed

#### Edge Function Errors

**Symptoms**: Function timeouts, memory errors
**Solutions**:
- Check function logs in Supabase dashboard
- Verify environment variables/secrets
- Review function memory limits
- Check external API connectivity

#### Authentication Problems

**Symptoms**: Login failures, JWT errors
**Solutions**:
- Verify JWT settings
- Check authentication provider configuration
- Review RLS policies
- Validate redirect URLs

#### Performance Issues

**Symptoms**: Slow response times, timeouts
**Solutions**:
- Review database query performance
- Check Edge Function execution times
- Verify CDN configuration
- Scale resources if needed

### Getting Help

1. **Supabase Support**: Use the Supabase dashboard support chat
2. **Community**: Supabase Discord community
3. **Documentation**: [Supabase Docs](https://supabase.com/docs)
4. **Status Page**: [Supabase Status](https://status.supabase.com)

## Maintenance Schedule

### Daily
- Monitor health check results
- Review error logs
- Check performance metrics

### Weekly
- Review database performance
- Update dependencies (if needed)
- Backup verification

### Monthly
- Security updates
- Performance optimization review
- Capacity planning review

### Quarterly
- Full security audit
- Disaster recovery testing
- Architecture review

## Security Considerations

### Data Protection
- All data encrypted at rest and in transit
- Regular security updates applied
- Access logs monitored
- GDPR compliance maintained

### Access Control
- Principle of least privilege
- Regular access reviews
- Multi-factor authentication required
- API key rotation schedule

### Compliance
- SOC 2 Type II compliance
- GDPR compliance
- Regular penetration testing
- Security incident response plan

---

## Support and Contact

For deployment issues or questions:

- **Technical Issues**: Create an issue in the project repository
- **Emergency**: Use the emergency contact procedures
- **General Questions**: Contact the development team

**Last Updated**: $(date)
**Version**: 1.0.0