import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecurityService } from '@/lib/services/security';

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(),
          range: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        lt: vi.fn(() => ({
          select: vi.fn()
        }))
      })),
      upsert: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      in: vi.fn()
    })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      createSignedUrl: vi.fn()
    }))
  }
};

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

describe('SecurityService Unit Tests', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    securityService = new SecurityService('test-url', 'test-key');
  });

  describe('Security Context', () => {
    it('should set security context variables', async () => {
      const context = {
        userEmail: 'test@example.com',
        userAgent: 'Test Agent',
        ipAddress: '192.168.1.1',
        sessionId: 'session-123'
      };

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      await securityService.setSecurityContext(context);

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(4);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('set_config', {
        setting_name: 'app.user_email',
        new_value: context.userEmail,
        is_local: true
      });
    });

    it('should handle errors when setting security context', async () => {
      const context = { userEmail: 'test@example.com' };
      const error = new Error('Database error');

      mockSupabase.rpc.mockRejectedValue(error);

      await expect(securityService.setSecurityContext(context)).rejects.toThrow('Database error');
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events successfully', async () => {
      const eventId = 'event-123';
      mockSupabase.rpc.mockResolvedValue({ data: eventId, error: null });

      const result = await securityService.logSecurityEvent(
        'tenant-123',
        'test_event',
        'medium',
        'Test event description',
        { key: 'value' }
      );

      expect(result).toBe(eventId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_security_event', {
        p_tenant_id: 'tenant-123',
        p_event_type: 'test_event',
        p_severity: 'medium',
        p_description: 'Test event description',
        p_metadata: { key: 'value' }
      });
    });

    it('should handle errors when logging security events', async () => {
      const error = new Error('Logging failed');
      mockSupabase.rpc.mockResolvedValue({ data: null, error });

      await expect(
        securityService.logSecurityEvent('tenant-123', 'test_event', 'high', 'Test')
      ).rejects.toThrow('Logging failed');
    });
  });

  describe('Audit Log Retrieval', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          tenant_id: 'tenant-123',
          table_name: 'conversations',
          operation: 'INSERT',
          timestamp: new Date().toISOString()
        }
      ];

      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        range: vi.fn(() => Promise.resolve({ data: mockAuditLogs, error: null, count: 1 }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await securityService.getAuditLogs('tenant-123', {
        tableName: 'conversations',
        limit: 10,
        offset: 0
      });

      expect(result.data).toEqual(mockAuditLogs);
      expect(result.count).toBe(1);
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('table_name', 'conversations');
    });

    it('should handle errors when retrieving audit logs', async () => {
      const error = new Error('Query failed');
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        order: vi.fn(() => Promise.resolve({ data: null, error, count: 0 }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(
        securityService.getAuditLogs('tenant-123')
      ).rejects.toThrow('Query failed');
    });
  });

  describe('Data Retention Policies', () => {
    it('should set data retention policy', async () => {
      const mockQuery = {
        upsert: vi.fn(() => Promise.resolve({ error: null }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'event-id', error: null });

      await securityService.setDataRetentionPolicy(
        'tenant-123',
        'conversations',
        365,
        'soft_delete'
      );

      expect(mockQuery.upsert).toHaveBeenCalledWith({
        tenant_id: 'tenant-123',
        table_name: 'conversations',
        retention_days: 365,
        policy_type: 'soft_delete',
        updated_at: expect.any(String)
      });
    });

    it('should apply data retention policies', async () => {
      const affectedRecords = 5;
      mockSupabase.rpc.mockResolvedValue({ data: affectedRecords, error: null });

      const result = await securityService.applyDataRetention();

      expect(result).toBe(affectedRecords);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('apply_data_retention');
    });
  });

  describe('GDPR Compliance', () => {
    it('should create GDPR export request', async () => {
      const requestId = 'request-123';
      const mockQuery = {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: requestId }, error: null }))
          }))
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'event-id', error: null });

      const result = await securityService.createGDPRExportRequest(
        'tenant-123',
        'user-123',
        'data_export'
      );

      expect(result).toBe(requestId);
      expect(mockQuery.insert).toHaveBeenCalledWith({
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        request_type: 'data_export',
        status: 'pending',
        expires_at: expect.any(String)
      });
    });

    it('should process GDPR data export', async () => {
      const requestId = 'request-123';
      const mockRequest = {
        id: requestId,
        tenant_id: 'tenant-123',
        user_id: 'user-123',
        request_type: 'data_export'
      };

      // Mock getting the request
      const mockSelectQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRequest, error: null }))
          }))
        }))
      };

      // Mock updating the request
      const mockUpdateQuery = {
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      };

      mockSupabase.from
        .mockReturnValueOnce(mockSelectQuery) // First call for getting request
        .mockReturnValueOnce(mockUpdateQuery) // Second call for updating status
        .mockReturnValueOnce(mockUpdateQuery); // Third call for final update

      // Mock RPC calls
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { user_data: 'exported' }, error: null }) // export_user_data
        .mockResolvedValueOnce({ data: 'event-id', error: null }); // log_security_event

      // Mock storage operations
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path' }, error: null })),
        createSignedUrl: vi.fn(() => Promise.resolve({ 
          data: { signedUrl: 'https://example.com/export.json' }, 
          error: null 
        }))
      });

      const result = await securityService.processGDPRDataExport(requestId);

      expect(result).toBe('https://example.com/export.json');
    });
  });

  describe('Data Access Validation', () => {
    it('should validate authorized access', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { role: 'admin' }, 
              error: null 
            }))
          }))
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'event-id', error: null });

      const result = await securityService.validateDataAccess(
        'user-123',
        'tenant-123',
        '/api/conversations',
        'read'
      );

      expect(result).toBe(true);
    });

    it('should reject unauthorized access', async () => {
      const mockQuery = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { code: 'PGRST116' } 
            }))
          }))
        }))
      };

      mockSupabase.from.mockReturnValue(mockQuery);
      mockSupabase.rpc.mockResolvedValue({ data: 'event-id', error: null });

      const result = await securityService.validateDataAccess(
        'user-123',
        'tenant-123',
        '/api/conversations',
        'read'
      );

      expect(result).toBe(false);
    });
  });

  describe('Data Encryption', () => {
    it('should encrypt sensitive data', async () => {
      const sensitiveData = 'sensitive information';
      
      const encrypted = await securityService.encryptSensitiveData(sensitiveData);
      
      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt sensitive data', async () => {
      const originalData = 'sensitive information';
      const encrypted = Buffer.from(originalData).toString('base64');
      
      const decrypted = await securityService.decryptSensitiveData(encrypted);
      
      expect(decrypted).toBe(originalData);
    });

    it('should handle encryption errors', async () => {
      // Test with invalid data that would cause encryption to fail
      vi.spyOn(Buffer, 'from').mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        securityService.encryptSensitiveData('test')
      ).rejects.toThrow('Encryption failed');
    });
  });
});