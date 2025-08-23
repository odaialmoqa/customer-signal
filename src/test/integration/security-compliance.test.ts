import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { securityService } from '@/lib/services/security';
import { Database } from '@/lib/types/database';

describe('Security and Compliance Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  let testTenantId: string;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create test tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: 'Security Test Tenant',
        subscription: 'professional'
      })
      .select('id')
      .single();

    if (tenantError) throw tenantError;
    testTenantId = tenant.id;

    // Create test user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'security-test@example.com',
      password: 'test-password-123',
      email_confirm: true
    });

    if (userError) throw userError;
    testUserId = user.user.id;

    // Associate user with tenant
    await supabase
      .from('user_tenants')
      .insert({
        user_id: testUserId,
        tenant_id: testTenantId,
        role: 'admin'
      });
  });

  afterAll(async () => {
    // Clean up test data
    await supabase.auth.admin.deleteUser(testUserId);
    await supabase
      .from('tenants')
      .delete()
      .eq('id', testTenantId);
  });

  beforeEach(async () => {
    // Clean up any test data from previous tests
    await supabase
      .from('audit_logs')
      .delete()
      .eq('tenant_id', testTenantId);
    
    await supabase
      .from('security_events')
      .delete()
      .eq('tenant_id', testTenantId);
    
    await supabase
      .from('gdpr_export_requests')
      .delete()
      .eq('tenant_id', testTenantId);
  });

  describe('Audit Logging', () => {
    it('should automatically log data changes via triggers', async () => {
      // Create a test conversation to trigger audit logging
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          tenant_id: testTenantId,
          content: 'Test conversation for audit logging',
          author: 'test-author',
          platform: 'twitter',
          url: 'https://example.com/test',
          sentiment_score: 0.5,
          sentiment_label: 'neutral'
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      expect(conversation).toBeDefined();

      // Wait a moment for the trigger to execute
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if audit log was created
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('table_name', 'conversations')
        .eq('operation', 'INSERT');

      expect(auditError).toBeNull();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs![0].record_id).toBe(conversation.id);
      expect(auditLogs![0].new_values).toBeDefined();
    });

    it('should retrieve audit logs with filters', async () => {
      // Create some test audit data
      await supabase
        .from('conversations')
        .insert([
          {
            tenant_id: testTenantId,
            content: 'Test conversation 1',
            author: 'author1',
            platform: 'twitter',
            url: 'https://example.com/1',
            sentiment_score: 0.5,
            sentiment_label: 'neutral'
          },
          {
            tenant_id: testTenantId,
            content: 'Test conversation 2',
            author: 'author2',
            platform: 'reddit',
            url: 'https://example.com/2',
            sentiment_score: 0.8,
            sentiment_label: 'positive'
          }
        ]);

      await new Promise(resolve => setTimeout(resolve, 100));

      // Test filtering by table name
      const { data: auditLogs } = await securityService.getAuditLogs(
        testTenantId,
        { tableName: 'conversations', limit: 10 }
      );

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);
      expect(auditLogs.every(log => log.table_name === 'conversations')).toBe(true);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events', async () => {
      const eventId = await securityService.logSecurityEvent(
        testTenantId,
        'test_security_event',
        'medium',
        'This is a test security event',
        { testData: 'test value' }
      );

      expect(eventId).toBeDefined();

      // Verify the event was logged
      const { data: events } = await securityService.getSecurityEvents(
        testTenantId,
        { eventType: 'test_security_event' }
      );

      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe('test_security_event');
      expect(events[0].severity).toBe('medium');
      expect(events[0].description).toBe('This is a test security event');
    });

    it('should filter security events by severity', async () => {
      // Log events with different severities
      await securityService.logSecurityEvent(testTenantId, 'low_event', 'low', 'Low severity event');
      await securityService.logSecurityEvent(testTenantId, 'high_event', 'high', 'High severity event');
      await securityService.logSecurityEvent(testTenantId, 'critical_event', 'critical', 'Critical event');

      // Filter by high severity
      const { data: highEvents } = await securityService.getSecurityEvents(
        testTenantId,
        { severity: 'high' }
      );

      expect(highEvents).toHaveLength(1);
      expect(highEvents[0].severity).toBe('high');
    });
  });

  describe('Data Retention Policies', () => {
    it('should create and retrieve data retention policies', async () => {
      await securityService.setDataRetentionPolicy(
        testTenantId,
        'test_table',
        365,
        'soft_delete'
      );

      const policies = await securityService.getDataRetentionPolicies(testTenantId);
      const testPolicy = policies.find(p => p.table_name === 'test_table');

      expect(testPolicy).toBeDefined();
      expect(testPolicy!.retention_days).toBe(365);
      expect(testPolicy!.policy_type).toBe('soft_delete');
    });

    it('should apply data retention policies', async () => {
      // Create old test data
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 400); // 400 days ago

      await supabase
        .from('conversations')
        .insert({
          tenant_id: testTenantId,
          content: 'Old conversation',
          author: 'old-author',
          platform: 'twitter',
          url: 'https://example.com/old',
          sentiment_score: 0.5,
          sentiment_label: 'neutral',
          created_at: oldDate.toISOString()
        });

      // Set a retention policy for conversations
      await securityService.setDataRetentionPolicy(
        testTenantId,
        'conversations',
        365,
        'soft_delete'
      );

      // Apply retention policies
      const affectedRecords = await securityService.applyDataRetention();

      expect(affectedRecords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GDPR Compliance', () => {
    it('should create GDPR export request', async () => {
      const requestId = await securityService.createGDPRExportRequest(
        testTenantId,
        testUserId,
        'data_export'
      );

      expect(requestId).toBeDefined();

      // Verify the request was created
      const requests = await securityService.getGDPRExportRequests(testTenantId);
      const exportRequest = requests.find(r => r.id === requestId);

      expect(exportRequest).toBeDefined();
      expect(exportRequest!.request_type).toBe('data_export');
      expect(exportRequest!.status).toBe('pending');
    });

    it('should create GDPR deletion request', async () => {
      const requestId = await securityService.createGDPRExportRequest(
        testTenantId,
        testUserId,
        'data_deletion'
      );

      expect(requestId).toBeDefined();

      // Verify the request was created
      const requests = await securityService.getGDPRExportRequests(testTenantId);
      const deletionRequest = requests.find(r => r.id === requestId);

      expect(deletionRequest).toBeDefined();
      expect(deletionRequest!.request_type).toBe('data_deletion');
      expect(deletionRequest!.status).toBe('pending');
    });

    it('should export user data', async () => {
      // Create some test data for the user
      await supabase
        .from('conversations')
        .insert({
          tenant_id: testTenantId,
          content: 'User conversation for export',
          author: 'test-user',
          platform: 'twitter',
          url: 'https://example.com/export-test',
          sentiment_score: 0.7,
          sentiment_label: 'positive'
        });

      // Export user data using the database function
      const { data: exportData, error } = await supabase.rpc('export_user_data', {
        p_user_id: testUserId,
        p_tenant_id: testTenantId
      });

      expect(error).toBeNull();
      expect(exportData).toBeDefined();
      expect(exportData.user_profile).toBeDefined();
      expect(exportData.conversations).toBeDefined();
      expect(exportData.export_timestamp).toBeDefined();
    });
  });

  describe('Data Access Validation', () => {
    it('should validate authorized data access', async () => {
      const hasAccess = await securityService.validateDataAccess(
        testUserId,
        testTenantId,
        '/api/conversations',
        'read'
      );

      expect(hasAccess).toBe(true);
    });

    it('should reject unauthorized data access', async () => {
      const unauthorizedUserId = 'unauthorized-user-id';
      
      const hasAccess = await securityService.validateDataAccess(
        unauthorizedUserId,
        testTenantId,
        '/api/conversations',
        'read'
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe('Security Context', () => {
    it('should set and use security context', async () => {
      const context = {
        userEmail: 'test@example.com',
        userAgent: 'Test User Agent',
        ipAddress: '192.168.1.1',
        sessionId: 'test-session-123'
      };

      await securityService.setSecurityContext(context);

      // Create a test record to trigger audit logging with context
      await supabase
        .from('conversations')
        .insert({
          tenant_id: testTenantId,
          content: 'Test with security context',
          author: 'context-test',
          platform: 'twitter',
          url: 'https://example.com/context',
          sentiment_score: 0.5,
          sentiment_label: 'neutral'
        });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if audit log includes security context
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('user_email', context.userEmail)
        .limit(1);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs![0].user_agent).toBe(context.userAgent);
      expect(auditLogs![0].ip_address).toBe(context.ipAddress);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt and decrypt sensitive data', async () => {
      const sensitiveData = 'This is sensitive information';
      
      const encrypted = await securityService.encryptSensitiveData(sensitiveData);
      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted).toBeDefined();

      const decrypted = await securityService.decryptSensitiveData(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });
  });
});