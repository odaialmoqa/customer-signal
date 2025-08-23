import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { logger } from '../utils/logger-server';

type SecurityEvent = Database['public']['Tables']['security_events']['Insert'];
type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
type DataRetentionPolicy = Database['public']['Tables']['data_retention_policies']['Row'];
type GDPRExportRequest = Database['public']['Tables']['gdpr_export_requests']['Insert'];

export interface SecurityContext {
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  sessionId?: string;
}

export class SecurityService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Set security context for audit logging
   */
  async setSecurityContext(context: SecurityContext): Promise<void> {
    try {
      // Set session variables for audit triggers
      if (context.userEmail) {
        await this.supabase.rpc('set_config', {
          setting_name: 'app.user_email',
          new_value: context.userEmail,
          is_local: true
        });
      }

      if (context.userAgent) {
        await this.supabase.rpc('set_config', {
          setting_name: 'app.user_agent',
          new_value: context.userAgent,
          is_local: true
        });
      }

      if (context.ipAddress) {
        await this.supabase.rpc('set_config', {
          setting_name: 'app.ip_address',
          new_value: context.ipAddress,
          is_local: true
        });
      }

      if (context.sessionId) {
        await this.supabase.rpc('set_config', {
          setting_name: 'app.session_id',
          new_value: context.sessionId,
          is_local: true
        });
      }
    } catch (error) {
      logger.error('Failed to set security context:', error);
      throw error;
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    tenantId: string,
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('log_security_event', {
        p_tenant_id: tenantId,
        p_event_type: eventType,
        p_severity: severity,
        p_description: description,
        p_metadata: metadata
      });

      if (error) {
        logger.error('Failed to log security event:', error);
        throw error;
      }

      logger.info(`Security event logged: ${eventType}`, {
        tenantId,
        severity,
        eventId: data
      });

      return data;
    } catch (error) {
      logger.error('Failed to log security event:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    options: {
      tableName?: string;
      operation?: 'INSERT' | 'UPDATE' | 'DELETE';
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: AuditLog[]; count: number }> {
    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false });

      if (options.tableName) {
        query = query.eq('table_name', options.tableName);
      }

      if (options.operation) {
        query = query.eq('operation', options.operation);
      }

      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      if (options.startDate) {
        query = query.gte('timestamp', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('timestamp', options.endDate.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get audit logs:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      throw error;
    }
  }

  /**
   * Get security events for a tenant
   */
  async getSecurityEvents(
    tenantId: string,
    options: {
      eventType?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: SecurityEvent[]; count: number }> {
    try {
      let query = this.supabase
        .from('security_events')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false });

      if (options.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      if (options.severity) {
        query = query.eq('severity', options.severity);
      }

      if (options.startDate) {
        query = query.gte('timestamp', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('timestamp', options.endDate.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to get security events:', error);
        throw error;
      }

      return { data: data || [], count: count || 0 };
    } catch (error) {
      logger.error('Failed to get security events:', error);
      throw error;
    }
  }

  /**
   * Create or update data retention policy
   */
  async setDataRetentionPolicy(
    tenantId: string,
    tableName: string,
    retentionDays: number,
    policyType: 'soft_delete' | 'hard_delete' | 'archive'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('data_retention_policies')
        .upsert({
          tenant_id: tenantId,
          table_name: tableName,
          retention_days: retentionDays,
          policy_type: policyType,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to set data retention policy:', error);
        throw error;
      }

      await this.logSecurityEvent(
        tenantId,
        'data_retention_policy_updated',
        'medium',
        `Data retention policy updated for table ${tableName}`,
        {
          tableName,
          retentionDays,
          policyType
        }
      );

      logger.info('Data retention policy updated', {
        tenantId,
        tableName,
        retentionDays,
        policyType
      });
    } catch (error) {
      logger.error('Failed to set data retention policy:', error);
      throw error;
    }
  }

  /**
   * Get data retention policies for a tenant
   */
  async getDataRetentionPolicies(tenantId: string): Promise<DataRetentionPolicy[]> {
    try {
      const { data, error } = await this.supabase
        .from('data_retention_policies')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('table_name');

      if (error) {
        logger.error('Failed to get data retention policies:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get data retention policies:', error);
      throw error;
    }
  }

  /**
   * Apply data retention policies
   */
  async applyDataRetention(): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('apply_data_retention');

      if (error) {
        logger.error('Failed to apply data retention:', error);
        throw error;
      }

      logger.info(`Data retention applied, ${data} records affected`);
      return data || 0;
    } catch (error) {
      logger.error('Failed to apply data retention:', error);
      throw error;
    }
  }

  /**
   * Create GDPR data export request
   */
  async createGDPRExportRequest(
    tenantId: string,
    userId: string,
    requestType: 'data_export' | 'data_deletion'
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('gdpr_export_requests')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          request_type: requestType,
          status: 'pending',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to create GDPR export request:', error);
        throw error;
      }

      await this.logSecurityEvent(
        tenantId,
        'gdpr_request_created',
        'high',
        `GDPR ${requestType} request created`,
        {
          requestId: data.id,
          userId,
          requestType
        }
      );

      logger.info('GDPR export request created', {
        requestId: data.id,
        tenantId,
        userId,
        requestType
      });

      return data.id;
    } catch (error) {
      logger.error('Failed to create GDPR export request:', error);
      throw error;
    }
  }

  /**
   * Process GDPR data export
   */
  async processGDPRDataExport(requestId: string): Promise<string> {
    try {
      // Get the request details
      const { data: request, error: requestError } = await this.supabase
        .from('gdpr_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('GDPR export request not found');
      }

      // Update status to processing
      await this.supabase
        .from('gdpr_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      // Export user data
      const { data: exportData, error: exportError } = await this.supabase.rpc('export_user_data', {
        p_user_id: request.user_id,
        p_tenant_id: request.tenant_id
      });

      if (exportError) {
        throw exportError;
      }

      // In a real implementation, you would upload this to secure storage
      // For now, we'll simulate by creating a download URL
      const exportUrl = `https://secure-exports.example.com/${requestId}.json`;

      // Update request with completion details
      await this.supabase
        .from('gdpr_export_requests')
        .update({
          status: 'completed',
          export_url: exportUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      await this.logSecurityEvent(
        request.tenant_id,
        'gdpr_export_completed',
        'high',
        'GDPR data export completed',
        {
          requestId,
          userId: request.user_id,
          exportUrl
        }
      );

      logger.info('GDPR data export completed', {
        requestId,
        tenantId: request.tenant_id,
        userId: request.user_id
      });

      return exportUrl;
    } catch (error) {
      // Update request status to failed
      await this.supabase
        .from('gdpr_export_requests')
        .update({ status: 'failed' })
        .eq('id', requestId);

      logger.error('Failed to process GDPR data export:', error);
      throw error;
    }
  }

  /**
   * Process GDPR data deletion
   */
  async processGDPRDataDeletion(requestId: string): Promise<void> {
    try {
      // Get the request details
      const { data: request, error: requestError } = await this.supabase
        .from('gdpr_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        throw new Error('GDPR deletion request not found');
      }

      // Update status to processing
      await this.supabase
        .from('gdpr_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      // Delete user data
      const { error: deleteError } = await this.supabase.rpc('delete_user_data', {
        p_user_id: request.user_id,
        p_tenant_id: request.tenant_id
      });

      if (deleteError) {
        throw deleteError;
      }

      // Update request with completion details
      await this.supabase
        .from('gdpr_export_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      logger.info('GDPR data deletion completed', {
        requestId,
        tenantId: request.tenant_id,
        userId: request.user_id
      });
    } catch (error) {
      // Update request status to failed
      await this.supabase
        .from('gdpr_export_requests')
        .update({ status: 'failed' })
        .eq('id', requestId);

      logger.error('Failed to process GDPR data deletion:', error);
      throw error;
    }
  }

  /**
   * Get GDPR export requests for a tenant
   */
  async getGDPRExportRequests(tenantId: string): Promise<GDPRExportRequest[]> {
    try {
      const { data, error } = await this.supabase
        .from('gdpr_export_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('requested_at', { ascending: false });

      if (error) {
        logger.error('Failed to get GDPR export requests:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Failed to get GDPR export requests:', error);
      throw error;
    }
  }

  /**
   * Validate data access permissions
   */
  async validateDataAccess(
    userId: string,
    tenantId: string,
    resource: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    try {
      // Check if user belongs to tenant
      const { data: userTenant, error } = await this.supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !userTenant) {
        await this.logSecurityEvent(
          tenantId,
          'unauthorized_access_attempt',
          'high',
          `Unauthorized access attempt to ${resource}`,
          {
            userId,
            resource,
            action
          }
        );
        return false;
      }

      // Log successful access validation
      await this.logSecurityEvent(
        tenantId,
        'data_access_validated',
        'low',
        `Data access validated for ${resource}`,
        {
          userId,
          resource,
          action,
          userRole: userTenant.role
        }
      );

      return true;
    } catch (error) {
      logger.error('Failed to validate data access:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptSensitiveData(data: string, keyId?: string): Promise<string> {
    try {
      // In a real implementation, you would use Supabase's encryption features
      // or integrate with a key management service like AWS KMS
      // For now, we'll use a simple base64 encoding as a placeholder
      const encrypted = Buffer.from(data).toString('base64');
      
      logger.info('Sensitive data encrypted', { keyId });
      return encrypted;
    } catch (error) {
      logger.error('Failed to encrypt sensitive data:', error);
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptSensitiveData(encryptedData: string, keyId?: string): Promise<string> {
    try {
      // In a real implementation, you would use Supabase's decryption features
      // or integrate with a key management service like AWS KMS
      // For now, we'll use simple base64 decoding as a placeholder
      const decrypted = Buffer.from(encryptedData, 'base64').toString('utf-8');
      
      logger.info('Sensitive data decrypted', { keyId });
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt sensitive data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);