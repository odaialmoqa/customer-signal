# CustomerSignal Operations Manual

This manual provides operational procedures for maintaining and monitoring the CustomerSignal production environment.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring Procedures](#monitoring-procedures)
3. [Incident Response](#incident-response)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Backup and Recovery](#backup-and-recovery)
6. [Performance Optimization](#performance-optimization)
7. [Security Operations](#security-operations)
8. [Scaling Procedures](#scaling-procedures)

## Daily Operations

### Morning Health Check

Run the automated health check to ensure all systems are operational:

```bash
./scripts/production-health-check.sh
```

**Expected Results:**
- All components showing ✅ HEALTHY status
- Database response time < 100ms
- Edge Functions responding normally
- No critical alerts in the past 24 hours

### Daily Metrics Review

1. **Database Performance**
   - Connection count: Should be < 80% of limit
   - Query performance: Average < 50ms
   - Error rate: < 0.1%

2. **Edge Functions**
   - Execution count: Monitor for unusual spikes
   - Error rate: < 1%
   - Average duration: < 2 seconds

3. **API Usage**
   - Request volume: Track daily patterns
   - Response times: 95th percentile < 500ms
   - Error rates: < 0.5%

4. **Storage Usage**
   - Database size: Monitor growth rate
   - File storage: Check quota usage
   - Backup status: Verify daily backups completed

### Daily Tasks Checklist

- [ ] Run health check script
- [ ] Review overnight alerts and logs
- [ ] Check database performance metrics
- [ ] Verify backup completion
- [ ] Monitor resource usage trends
- [ ] Review security logs for anomalies
- [ ] Update operational dashboard

## Monitoring Procedures

### Supabase Built-in Monitoring

Access monitoring through the Supabase dashboard:

1. **Database Monitoring**
   - Go to Project → Database → Logs
   - Monitor connection counts and query performance
   - Set up alerts for connection pool exhaustion

2. **Edge Functions Monitoring**
   - Go to Project → Edge Functions → Logs
   - Monitor execution counts and error rates
   - Review function performance metrics

3. **API Monitoring**
   - Go to Project → API → Logs
   - Monitor request volumes and response times
   - Track authentication success rates

### Custom Monitoring Setup

#### Log Analysis

```bash
# Search for errors in the last hour
supabase logs --type=function --filter="level=error" --since="1h"

# Monitor specific function
supabase logs --type=function --filter="function_name=monitor-keywords" --since="24h"
```

#### Performance Monitoring

```bash
# Check database performance
supabase db stats --project-ref your-project-id

# Monitor API response times
curl -w "@curl-format.txt" -s -o /dev/null https://your-project.supabase.co/rest/v1/health
```

### Alert Configuration

Set up alerts for:

- **Critical**: Database down, authentication failures
- **Warning**: High response times, elevated error rates
- **Info**: Unusual traffic patterns, resource usage trends

## Incident Response

### Incident Classification

**P0 - Critical (Response: Immediate)**
- Complete service outage
- Data loss or corruption
- Security breach

**P1 - High (Response: < 1 hour)**
- Partial service outage
- Performance degradation affecting users
- Authentication issues

**P2 - Medium (Response: < 4 hours)**
- Non-critical feature failures
- Minor performance issues
- Configuration problems

**P3 - Low (Response: < 24 hours)**
- Cosmetic issues
- Enhancement requests
- Documentation updates

### Incident Response Procedures

#### Immediate Response (0-15 minutes)

1. **Assess the situation**
   ```bash
   ./scripts/production-health-check.sh
   ```

2. **Check Supabase status**
   - Visit [Supabase Status Page](https://status.supabase.com)
   - Check for ongoing incidents

3. **Initial communication**
   - Notify stakeholders of the incident
   - Create incident channel/ticket
   - Begin incident log

#### Investigation (15-60 minutes)

1. **Gather information**
   ```bash
   # Check recent logs
   supabase logs --type=all --since="1h"
   
   # Review recent deployments
   git log --oneline --since="24 hours ago"
   ```

2. **Identify root cause**
   - Review error patterns
   - Check resource utilization
   - Analyze recent changes

3. **Implement temporary fixes**
   - Scale resources if needed
   - Disable problematic features
   - Apply hotfixes

#### Resolution and Recovery

1. **Implement permanent fix**
   - Deploy code fixes
   - Update configurations
   - Apply database changes

2. **Verify resolution**
   ```bash
   ./scripts/production-health-check.sh
   ```

3. **Post-incident activities**
   - Update stakeholders
   - Document lessons learned
   - Schedule post-mortem review

### Common Incident Scenarios

#### Database Connection Issues

**Symptoms**: Connection timeouts, pool exhaustion
**Immediate Actions**:
```bash
# Check connection count
supabase db stats --project-ref your-project-id

# Scale up if needed (via dashboard)
# Review and optimize slow queries
```

#### Edge Function Failures

**Symptoms**: Function timeouts, high error rates
**Immediate Actions**:
```bash
# Check function logs
supabase logs --type=function --filter="level=error" --since="1h"

# Restart functions if needed
supabase functions deploy function-name --project-ref your-project-id
```

#### High Traffic Spikes

**Symptoms**: Slow response times, resource exhaustion
**Immediate Actions**:
- Enable rate limiting
- Scale database resources
- Activate CDN caching
- Monitor resource usage

## Maintenance Procedures

### Scheduled Maintenance Windows

**Weekly Maintenance**: Sundays 2:00-4:00 AM UTC
- Database optimization
- Index maintenance
- Log cleanup

**Monthly Maintenance**: First Sunday 1:00-5:00 AM UTC
- Security updates
- Performance optimization
- Backup verification

### Pre-Maintenance Checklist

- [ ] Notify users of maintenance window
- [ ] Create database backup
- [ ] Prepare rollback procedures
- [ ] Test changes in staging environment
- [ ] Coordinate with team members

### Database Maintenance

```bash
# Analyze database performance
supabase db analyze --project-ref your-project-id

# Optimize queries and indexes
# (This would typically be done via SQL scripts)

# Clean up old data (if applicable)
# Run data retention policies
```

### Edge Functions Maintenance

```bash
# Update function dependencies
cd supabase/functions/function-name
npm update

# Redeploy functions
./scripts/deploy-edge-functions.sh

# Verify deployment
./scripts/production-health-check.sh
```

## Backup and Recovery

### Automated Backups

Supabase provides automatic backups:
- **Daily backups**: Retained for 7 days
- **Point-in-time recovery**: Available for 7 days
- **Cross-region replication**: Enabled for disaster recovery

### Manual Backup Procedures

```bash
# Create manual backup
supabase db dump --project-ref your-project-id --file backup-$(date +%Y%m%d).sql

# Backup specific tables
supabase db dump --project-ref your-project-id --table conversations --file conversations-backup.sql
```

### Recovery Procedures

#### Point-in-Time Recovery

1. **Access Supabase Dashboard**
2. **Go to Database → Backups**
3. **Select restore point**
4. **Confirm recovery operation**

#### Manual Recovery

```bash
# Restore from backup file
supabase db reset --project-ref your-project-id
supabase db push --project-ref your-project-id --file backup.sql
```

### Disaster Recovery Plan

1. **Assessment** (0-30 minutes)
   - Determine scope of disaster
   - Activate disaster recovery team
   - Communicate with stakeholders

2. **Recovery** (30 minutes - 4 hours)
   - Restore from backups
   - Verify data integrity
   - Test critical functionality

3. **Validation** (4-8 hours)
   - Full system testing
   - User acceptance testing
   - Performance validation

## Performance Optimization

### Database Optimization

```bash
# Analyze slow queries
supabase db analyze --project-ref your-project-id --slow-queries

# Review index usage
# (Via SQL queries in dashboard)

# Optimize table statistics
# (Automatic in Supabase)
```

### Edge Function Optimization

- Monitor function execution times
- Optimize code for performance
- Use appropriate memory limits
- Implement caching where possible

### API Performance

- Monitor response times
- Implement request caching
- Optimize database queries
- Use connection pooling

## Security Operations

### Daily Security Checks

```bash
# Review authentication logs
supabase logs --type=auth --filter="level=error" --since="24h"

# Check for suspicious activity
# (Review access patterns in dashboard)

# Verify SSL certificates
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Security Incident Response

1. **Immediate containment**
   - Disable compromised accounts
   - Block suspicious IP addresses
   - Rotate API keys if needed

2. **Investigation**
   - Analyze access logs
   - Identify attack vectors
   - Assess data exposure

3. **Recovery**
   - Apply security patches
   - Update access controls
   - Notify affected users

### Regular Security Tasks

- **Weekly**: Review access logs and user activity
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Security audit and penetration testing

## Scaling Procedures

### Horizontal Scaling

Supabase automatically handles most scaling needs, but monitor:

- Database connection limits
- Edge Function concurrency
- Storage capacity
- Bandwidth usage

### Vertical Scaling

When to scale up:
- CPU usage consistently > 80%
- Memory usage > 85%
- Database connections > 80% of limit
- Response times degrading

### Scaling Actions

1. **Database Scaling**
   - Upgrade compute tier via dashboard
   - Add read replicas for analytics
   - Implement connection pooling

2. **Edge Function Scaling**
   - Optimize function code
   - Increase memory limits
   - Implement caching

3. **Storage Scaling**
   - Monitor storage usage
   - Implement data archiving
   - Optimize file storage

---

## Emergency Contacts

- **On-call Engineer**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **Security Team**: [Contact Information]
- **Supabase Support**: support@supabase.com

## Useful Commands Reference

```bash
# Health check
./scripts/production-health-check.sh

# Deploy functions
./scripts/deploy-edge-functions.sh

# Database migration
./scripts/deploy-migrations.sh

# View logs
supabase logs --type=all --since="1h"

# Database stats
supabase db stats --project-ref your-project-id

# Function deployment
supabase functions deploy function-name --project-ref your-project-id
```

**Last Updated**: $(date)
**Version**: 1.0.0